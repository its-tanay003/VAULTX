import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";

const locales = ["en", "es"];
const defaultLocale = "en";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  // Keep URLs clean — locale is detected from Accept-Language / NEXT_LOCALE cookie
  // and used for translations, but never injected into the URL path.
  // Without this, next-intl rewrites /pricing → /es/pricing for Spanish browsers,
  // which 404s because the app has no [locale] route segment.
  localePrefix: "never",
});

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/settings"];
const AUTH_ONLY_PATHS = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Exclude static assets/internal routes from middleware
  if (
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  // 1. Run next-intl middleware to handle localization routing
  const response = intlMiddleware(request);

  // 2. Perform Supabase Session Refresh and Protected Route Check
  let supabaseResponse = response;

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No locale prefix in URLs (localePrefix: 'never'), so cleanPath === pathname
  const cleanPath = pathname;

  // Redirect unauthenticated users away from protected routes
  const isProtected = PROTECTED_PREFIXES.some((p) => cleanPath.startsWith(p));
  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", cleanPath);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  const isAuthOnly = AUTH_ONLY_PATHS.some((p) => cleanPath.startsWith(p));
  if (isAuthOnly && user) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/dashboard";
    return NextResponse.redirect(homeUrl);
  }

  // Redirect authenticated, non-onboarded users to onboarding
  if (cleanPath === "/dashboard" && user) {
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

    // Enforce MFA if organization settings require it
    const { data: membership } = await supabase
      .from("memberships")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (membership?.org_id) {
      const { data: orgSettings } = await supabase
        .from("org_settings")
        .select("require_mfa")
        .eq("org_id", membership.org_id)
        .single();

      if (orgSettings?.require_mfa) {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.currentLevel !== "aal2") {
          return NextResponse.redirect(new URL("/auth/mfa-challenge", request.url));
        }
      }
    }

    // Role-based redirect
    if (profile) {
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
