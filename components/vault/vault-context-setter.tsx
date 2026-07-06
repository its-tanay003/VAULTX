"use client";

import { useSetVaultContext, type VaultContextShape } from "./vault-context";

/** Drop this into any server component page to make VAULT aware of what's being viewed. Renders nothing. */
export function VaultContextSetter(props: VaultContextShape) {
  useSetVaultContext(props);
  return null;
}
