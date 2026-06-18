import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const GeistSans = localFont({
  src: "../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const GeistMono = localFont({
  src: "../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "VAULTX — Security Intelligence Platform",
    template: "%s · VAULTX",
  },
  description:
    "Unified bug bounty, VDP, and code security platform. AI-powered vulnerability validation, real-time collaboration, and enterprise-grade reward management.",
  keywords: ["bug bounty", "vulnerability disclosure", "VDP", "penetration testing", "cybersecurity", "code quality"],
  authors: [{ name: "VAULTX" }],
  creator: "VAULTX",
  openGraph: {
    type: "website", locale: "en_US", url: "https://vaultx.io",
    title: "VAULTX — Security Intelligence Platform",
    description: "AI-powered vulnerability management for modern security teams.",
    siteName: "VAULTX",
  },
  twitter: {
    card: "summary_large_image", title: "VAULTX",
    description: "AI-powered vulnerability management.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased bg-vault-bg text-vault-text min-h-screen`}
      >
        <ThemeProvider>
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: { background: "#18181b", border: "1px solid #27272a", color: "#fafafa" },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
