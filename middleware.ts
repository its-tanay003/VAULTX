import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/* ─── Routes that require authentication ──────────────────────────────────── */
const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/settings"];

/* ─── Routes only for unauthenticated users ───────────────────────────────── */
const AUTH_ONLY_PATHS = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — DO NOT remove this call
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users away from protected routes
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  const isAuthOnly = AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p));
  if (isAuthOnly && user) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/dashboard";
    return NextResponse.redirect(homeUrl);
  }

  // Redirect authenticated, non-onboarded users to onboarding
  if (user && isProtected && pathname !== "/onboarding") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_onboarded, role")
      .eq("id", user.id)
      .single();

    if (profile && !profile.is_onboarded) {
      const onboardUrl = request.nextUrl.clone();
      onboardUrl.pathname = "/onboarding";
      return NextResponse.redirect(onboardUrl);
    }

    // Role-based redirect: /dashboard → correct dashboard
    if (pathname === "/dashboard" && profile) {
      const roleUrl = request.nextUrl.clone();
      roleUrl.pathname =
        profile.role === "org" || profile.role === "triager"
          ? "/dashboard/org"
          : "/dashboard/researcher";
      return NextResponse.redirect(roleUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
