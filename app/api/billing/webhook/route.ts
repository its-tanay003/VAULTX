import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client with service role to bypass RLS for processing webhooks
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret configuration" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook construction failed";
    return NextResponse.json({ error: `Signature verification failed: ${message}` }, { status: 400 });
  }

  // ─── Idempotency Check ──────────────────────────────────────────────────────
  // Log the event in billing_events. If it already exists, return 200 OK immediately.
  const { data: loggedEvent, error: logError } = await supabaseAdmin
    .from("billing_events")
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event as any,
    })
    .select("id")
    .maybeSingle();

  if (logError) {
    // Unique key violation code in Postgres
    if (logError.code === "23505") {
      return NextResponse.json({ processed: true, note: "Duplicate event skipped" }, { status: 200 });
    }
    return NextResponse.json({ error: `Failed to log event: ${logError.message}` }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.org_id;
        const stripeSubId = session.subscription as string;

        if (!orgId || !stripeSubId) {
          throw new Error("Missing organization metadata or subscription ID");
        }

        const sub = await stripe.subscriptions.retrieve(stripeSubId);
        const priceId = sub.items.data[0]?.price.id;

        // Get matching plan
        const { data: plan } = await supabaseAdmin
          .from("plans")
          .select("id, name")
          .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
          .single();

        if (!plan) {
          throw new Error(`No matching plan found for price ID: ${priceId}`);
        }

        // Upsert subscription
        await supabaseAdmin.from("subscriptions").upsert({
          org_id: orgId,
          plan_id: plan.id,
          stripe_subscription_id: stripeSubId,
          stripe_customer_id: session.customer as string,
          status: sub.status as any,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: "stripe_subscription_id" });

        // Update org tier
        await supabaseAdmin
          .from("organizations")
          .update({
            subscription_tier: plan.name.toLowerCase().replace(/\s+/g, "_"),
            stripe_customer_id: session.customer as string,
          })
          .eq("id", orgId);

        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.org_id;

        if (!orgId) {
          throw new Error("Missing organization metadata on subscription object");
        }

        const priceId = sub.items.data[0]?.price.id;

        // Get matching plan
        const { data: plan } = await supabaseAdmin
          .from("plans")
          .select("id, name")
          .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
          .single();

        if (!plan) {
          throw new Error(`No matching plan found for price ID: ${priceId}`);
        }

        // Update subscription details
        await supabaseAdmin.from("subscriptions").update({
          plan_id: plan.id,
          status: sub.status as any,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", sub.id);

        // Keep organization subscription tier name in sync
        await supabaseAdmin
          .from("organizations")
          .update({
            subscription_tier: plan.name.toLowerCase().replace(/\s+/g, "_"),
          })
          .eq("id", orgId);

        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.org_id;

        if (!orgId) {
          throw new Error("Missing organization metadata on subscription object");
        }

        // Update subscription to cancelled status
        await supabaseAdmin.from("subscriptions").update({
          status: "canceled",
          updated_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", sub.id);

        // Downgrade organization back to free tier
        await supabaseAdmin
          .from("organizations")
          .update({
            subscription_tier: "free",
          })
          .eq("id", orgId);

        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const orgId = invoice.subscription ? (await stripe.subscriptions.retrieve(invoice.subscription as string)).metadata?.org_id : null;

        if (orgId) {
          await supabaseAdmin.from("invoices").insert({
            org_id: orgId,
            stripe_invoice_id: invoice.id,
            amount_cents: invoice.amount_paid,
            status: invoice.status || "paid",
            pdf_url: invoice.invoice_pdf || null,
            period_start: new Date(invoice.period_start * 1000).toISOString(),
            period_end: new Date(invoice.period_end * 1000).toISOString(),
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await supabaseAdmin.from("subscriptions").update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          }).eq("stripe_subscription_id", invoice.subscription as string);
        }
        break;
      }
    }

    return NextResponse.json({ processed: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error processing event";
    return NextResponse.json({ error: `Event handling failed: ${message}` }, { status: 500 });
  }
}
