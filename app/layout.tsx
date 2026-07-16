import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

/**
 * UPDATED Week 8: SEO pass.
 *  - metadataBase set (required for Next.js to resolve relative OG/twitter
 *    image URLs correctly — without this, social previews can silently
 *    fail in production)
 *  - More complete OpenGraph + Twitter metadata (images now come from
 *    app/opengraph-image.tsx / app/twitter-image.tsx automatically —
 *    Next.js wires them in, no manual <meta> tags needed)
 *  - JSON-LD structured data (SoftwareApplication schema) injected via
 *    a <script type="application/ld+json"> — this is what lets Google
 *    show rich snippets (logo, description, pricing) in search results
 *  - closeButton + duration added to Toaster per Week 7's accessibility
 *    audit action item
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vaultx.io";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "VAULTX — Security Intelligence Platform",
    template: "%s · VAULTX",
  },
  description:
    "Unified bug bounty, VDP, and code security platform. AI-powered vulnerability validation, real-time collaboration, and enterprise-grade reward management.",
  keywords: [
    "bug bounty platform", "vulnerability disclosure program", "VDP software",
    "penetration testing", "cybersecurity platform", "code quality scanner",
    "AI vulnerability triage", "security research platform",
  ],
  authors: [{ name: "VAULTX" }],
  creator: "VAULTX",
  publisher: "VAULTX",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    title: "VAULTX — Security Intelligence Platform",
    description: "AI-powered vulnerability management for modern security teams. Bug bounty, VDP, and code quality auditing in one platform.",
    siteName: "VAULTX",
  },
  twitter: {
    card: "summary_large_image",
    title: "VAULTX — Security Intelligence Platform",
    description: "AI-powered vulnerability management for modern security teams.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  colorScheme: "dark light",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "VAULTX",
  applicationCategory: "SecurityApplication",
  operatingSystem: "Web",
  description:
    "AI-powered bug bounty, vulnerability disclosure program (VDP), and code quality platform with real-time triage and human-approved reward management.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  aggregateRating: undefined, // omit until real ratings exist — never fabricate this field
};

import { createClient } from "@/lib/supabase/server";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

  let themePreference = "system";
  let language = "en";
  let reducedMotion = false;
  let highContrast = false;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("theme_preference, language, reduced_motion, high_contrast")
      .eq("id", user.id)
      .single();

    if (profile) {
      themePreference = profile.theme_preference || "system";
      language = profile.language || "en";
      reducedMotion = profile.reduced_motion || false;
      highContrast = profile.high_contrast || false;
    }
  }

  const htmlClasses = [
    themePreference === "dark" ? "dark" : themePreference === "light" ? "light" : "",
    reducedMotion ? "reduced-motion" : "",
    highContrast ? "high-contrast" : ""
  ].filter(Boolean).join(" ");

  return (
    <html
      lang={language}
      className={htmlClasses}
      data-theme={themePreference}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-high-contrast={highContrast ? "true" : "false"}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${GeistSans.variable} font-sans antialiased bg-vault-bg text-vault-text min-h-screen`}
      >
        <ThemeProvider defaultTheme={themePreference}>
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            closeButton
            duration={6000}
            toastOptions={{
              style: { background: "#18181b", border: "1px solid #27272a", color: "#fafafa" },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
