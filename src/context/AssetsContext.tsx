"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { assetsApi } from "@/lib/api";
import { assetToConfig } from "@/types/asset";
import type { AssetConfig } from "@/types/asset";
import { ASSET_CONFIGS } from "@/types/asset";

interface AssetsContextValue {
  assets: AssetConfig[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const AssetsContext = createContext<AssetsContextValue | null>(null);

export function AssetsProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<AssetConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await assetsApi.getAll();
      setAssets(list.map(assetToConfig));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load assets";
      setError(msg);
      setAssets(Object.values(ASSET_CONFIGS));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const value = useMemo<AssetsContextValue>(
    () => ({
      assets,
      loading,
      error,
      refetch: fetchAssets,
    }),
    [assets, loading, error, fetchAssets]
  );

  return (
    <AssetsContext.Provider value={value}>{children}</AssetsContext.Provider>
  );
}

export function useAssets() {
  const ctx = useContext(AssetsContext);
  if (!ctx) {
    throw new Error("useAssets must be used within AssetsProvider");
  }
  return ctx;
}
