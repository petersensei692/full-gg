"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AssetAnalysisView } from "@/components/AssetAnalysisView";
import { assetsApi } from "@/lib/api";
import { assetToConfig, ASSET_CONFIGS, type AssetConfig } from "@/types/asset";

function normalizeSlug(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s/g, "-");
}

function AssetAnalysisBySlug() {
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
        const match = list.find(
          (a) => normalizeSlug(a.name) === normalized
        );
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

  if (!normalized) {
    return (
      <DashboardLayout>
        <div className="p-6 text-sm text-dashboard-foreground/70">
          Missing <code className="text-primary">slug</code> query. Open an asset from the sidebar or Assets page.
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 text-sm text-dashboard-foreground/70">Loading asset…</div>
      </DashboardLayout>
    );
  }

  if (notFoundState || !asset) {
    return (
      <DashboardLayout>
        <div className="p-6 text-sm text-dashboard-foreground/70">
          No asset found for slug <code className="text-primary">{normalized}</code>. Create it on the Assets page or check the name.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <AssetAnalysisView asset={asset} />
    </DashboardLayout>
  );
}

export default function FundamentalAnalysisAssetPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="p-6 text-sm text-dashboard-foreground/70">Loading…</div>
        </DashboardLayout>
      }
    >
      <AssetAnalysisBySlug />
    </Suspense>
  );
}
