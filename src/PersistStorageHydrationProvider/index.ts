import { createContext } from "react";

export type PersistStorageHydrationContext = Record<string, string | undefined>;

/** @internal */
export const HydrationContext = createContext<PersistStorageHydrationContext>(
  null as any
);

/**
 * Component used to hydrate the client-side state with server-side rendered data
 */
const PersistStorageHydrationProvider = HydrationContext.Provider;

export default PersistStorageHydrationProvider;
