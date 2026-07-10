"use client";

import dynamic from "next/dynamic";

const VaultWidget = dynamic(
  () => import("@/components/vault/vault-widget").then((mod) => mod.VaultWidget),
  { ssr: false }
);

export function VaultWidgetWrapper(props: { role: "researcher" | "admin" }) {
  return <VaultWidget {...props} />;
}
