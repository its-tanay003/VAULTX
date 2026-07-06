"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface VaultContextShape {
  page?: string;
  submissionId?: string;
  programId?: string;
  researcherId?: string;
}

const VaultContextCtx = createContext<{
  context: VaultContextShape;
  setContext: (ctx: VaultContextShape) => void;
}>({ context: {}, setContext: () => {} });

export function VaultContextProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<VaultContextShape>({});
  return <VaultContextCtx.Provider value={{ context, setContext }}>{children}</VaultContextCtx.Provider>;
}

/** Used by the floating widget to read the currently-registered context. */
export function useVaultContext() {
  return useContext(VaultContextCtx).context;
}

/**
 * Used by individual pages (submission detail, program detail) to
 * register what VAULT should treat as "currently being viewed."
 * Clears itself on unmount so navigating away doesn't leave stale
 * context behind for the next page.
 */
export function useSetVaultContext(ctx: VaultContextShape) {
  const { setContext } = useContext(VaultContextCtx);
  useEffect(() => {
    setContext(ctx);
    return () => setContext({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.submissionId, ctx.programId, ctx.researcherId, ctx.page]);
}
