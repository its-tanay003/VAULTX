import { ImageResponse } from "next/og";

/**
 * Generates the social preview image VAULTX shows when shared on
 * Twitter/X, LinkedIn, Slack, iMessage, etc. Uses Next.js's built-in
 * og-image route convention — zero cost, zero external service,
 * rendered on-demand at build/request time and cached by the CDN.
 *
 * File location is significant: app/opengraph-image.tsx applies to
 * the root route. Next.js automatically wires this into <head> meta
 * tags — no manual <meta property="og:image"> needed in layout.tsx.
 */

export const dynamic = "force-dynamic";
export const alt = "VAULTX — AI-Powered Security Intelligence Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#09090b",
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(45,212,191,0.18), transparent)",
          position: "relative",
        }}
      >
        {/* Grid texture */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(45,212,191,0.04) 1px, transparent 1px), linear-gradient(to right, rgba(45,212,191,0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Logo mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 36,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "rgba(45,212,191,0.1)",
              border: "2px solid rgba(45,212,191,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
            }}
          >
            🛡
          </div>
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: "#fafafa",
              letterSpacing: "-0.02em",
            }}
          >
            VAULTX
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 38,
            fontWeight: 600,
            color: "#fafafa",
            textAlign: "center",
            maxWidth: 820,
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
          }}
        >
          AI-Powered Vulnerability Management
        </div>

        <div
          style={{
            fontSize: 22,
            color: "#71717a",
            marginTop: 18,
            textAlign: "center",
          }}
        >
          Bug Bounty · VDP · Code Quality · Real-Time Triage
        </div>

        {/* Bottom badge row */}
        <div style={{ display: "flex", gap: 12, marginTop: 44 }}>
          {["3-Stage AI Dedup", "Human-Approved Rewards", "Zero-Cost Stack"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                fontSize: 16,
                color: "#2dd4bf",
                background: "rgba(45,212,191,0.08)",
                border: "1px solid rgba(45,212,191,0.25)",
                borderRadius: 999,
                padding: "8px 18px",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
