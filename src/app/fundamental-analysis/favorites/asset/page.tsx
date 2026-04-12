"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AssetAnalysisView } from "@/components/AssetAnalysisView";
import { assetsApi } from "@/lib/api";
import { assetToConfig, ASSET_CONFIGS, type AssetConfig } from "@/types/asset";

function normalizeSlug(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s/g, "-");
}

function FavoritesAssetBySlug() {
  const searchParams = useSearchParams();
  const slugParam = searchParams.get("slug") ?? "";
  const normalized = normalizeSlug(slugParam);

  const [asset, setAsset] = useState<AssetConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);

  useEffect(() => {
    if (!normalized) {
      setLoading(false);
      setNotFoundState(true);
      setAsset(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setNotFoundState(false);
    assetsApi
      .getAll()
      .then((list) => {
        if (cancelled) return;
        const match = list.find((a) => normalizeSlug(a.name) === normalized);
        if (match) {
          setAsset(assetToConfig(match));
          setNotFoundState(false);
        } else {
          const fallback = ASSET_CONFIGS[normalized];
          if (fallback) {
            setAsset(fallback);
            setNotFoundState(false);
          } else {
            setAsset(null);
            setNotFoundState(true);
          }
        }
      })
      .catch(() => {
        if (cancelled) return;
        const fallback = ASSET_CONFIGS[normalized];
        if (fallback) {
          setAsset(fallback);
          setNotFoundState(false);
        } else {
          setAsset(null);
          setNotFoundState(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [normalized]);

  useEffect(() => {
    document.title = "Favorite analyses — JOURNAL APP";
  }, []);

  if (!normalized) {
    return (
      <div className="p-6 text-sm text-dashboard-foreground/70">
        Missing <code className="text-primary">slug</code> query. Pick an asset from the sidebar.
      </div>
    );
  }

  if (loading) {
    return <div className="p-6 text-sm text-dashboard-foreground/70">Loading asset…</div>;
  }

  if (notFoundState || !asset) {
    return (
      <div className="p-6 text-sm text-dashboard-foreground/70">
        No asset found for slug <code className="text-primary">{normalized}</code>.
      </div>
    );
  }

  return <AssetAnalysisView asset={asset} favoritesWindow />;
}

export default function FavoritesAssetPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-dashboard-foreground/70">Loading…</div>}>
      <FavoritesAssetBySlug />
    </Suspense>
  );
}
