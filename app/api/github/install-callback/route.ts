import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getInstallationMetadata } from "@/lib/github/app-auth";

/**
 * GET /api/github/install-callback
 *
 * GitHub redirects here after a user installs (or modifies) the
 * VAULTX GitHub App, with `installation_id` and `setup_action` query
 * params. This is the piece that turns "the App exists on GitHub"
 * into "VAULTX knows this org has it installed" — without this route,
 * a completed installation on GitHub's side would never be recorded.
 *
 * Only the organization's owner can complete this — matches the RLS
 * policy on github_installations (migration 016), which restricts the
 * table to `org_id in (select id from organizations where owner_id =
 * auth.uid())`.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const installationId = url.searchParams.get("installation_id");
  const setupAction     = url.searchParams.get("setup_action");

  const redirectTo = (query: string) =>
    NextResponse.redirect(new URL(`/dashboard/settings/integrations${query}`, url.origin));

  if (!installationId) {
    return redirectTo("?github=error&reason=missing_installation_id");
  }

  if (setupAction === "request") {
    // A member (not an org admin on GitHub's side) requested install —
    // GitHub is waiting on the GitHub org admin to approve it. Nothing
    // to persist yet.
    return redirectTo("?github=pending");
  }

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL("/login", url.origin));

    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!org) {
      return redirectTo("?github=error&reason=not_an_org_owner");
    }

    const meta = await getInstallationMetadata(Number(installationId));

    const { error } = await supabase
      .from("github_installations")
      .upsert(
        {
          org_id:               org.id,
          installation_id:      Number(installationId),
          account_login:        meta.accountLogin,
          account_type:         meta.accountType,
          repository_selection: meta.repositorySelection,
          connected_by:         user.id,
        },
        { onConflict: "org_id" }
      );

    if (error) {
      console.error("[GitHub Install Callback] Upsert failed:", error.message);
      return redirectTo("?github=error&reason=save_failed");
    }

    return redirectTo("?github=connected");
  } catch (err: unknown) {
    console.error("[GitHub Install Callback] Failed:", err);
    return redirectTo("?github=error&reason=unexpected");
  }
}
