import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "cancel";

  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  
  // Redirect back to the organization billing settings page with status query-param
  return NextResponse.redirect(
    `${origin}/dashboard/settings/organization?billing_status=${status}`
  );
}
