"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import { Plus, Coins, Loader2, BarChart3, Eye } from "lucide-react";
import { assetsService } from "@/lib/services/assets.service";
import type { AssetWithStats } from "@/types/api";
import { CreateAssetModal } from "./CreateAssetModal";
import { EditAssetModal } from "./EditAssetModal";

const ASSET_TYPE_ORDER = ["currency", "commodity", "stocks", "crypto", "bond"] as const;
const ASSET_TYPE_LABELS: Record<string, string> = {
  currency: "Currencies",
  commodity: "Commodities",
  stocks: "Stocks",
  crypto: "Crypto",
  bond: "Bonds",
};

export function AssetsView() {
  const [list, setList] = useState<AssetWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetWithStats | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await assetsService.getAllWithStats();
      setList(data);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const assetsByType = useMemo(() => {
    const m: Record<string, AssetWithStats[]> = {};
    for (const t of ASSET_TYPE_ORDER) m[t] = [];
    for (const a of list) {
      const t = a.type ?? "currency";
      if (!m[t]) m[t] = [];
      m[t].push(a);
    }
    return m;
  }, [list]);

  const handleCreate = useCallback(
    async (data: { name: string; type?: string }) => {
      await assetsService.create(data);
      await fetchList();
    },
    [fetchList]
  );

  const handleSave = useCallback(
    async (id: string, data: { name?: string; type?: string }) => {
      await assetsService.update(id, data);
      setEditingAsset(null);
      await fetchList();
    },
    [fetchList]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await assetsService.delete(id);
      setEditingAsset(null);
      await fetchList();
    },
    [fetchList]
  );

  const openEdit = useCallback((asset: AssetWithStats) => {
    setEditingAsset(asset);
    setEditModalOpen(true);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto">
      <div className="p-6 pt-4 flex flex-col min-h-0 flex-1">
        <h1 className="text-xl font-semibold text-dashboard-foreground mb-2">Assets</h1>
        <p className="text-sm text-dashboard-foreground/70 mb-6">
          Manage assets by type. Click a card to edit. View analysis from the sidebar or the link on the card.
        </p>

        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create asset
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[280px] text-dashboard-foreground/60 text-sm rounded-xl border border-sidebar-border bg-sidebar/30">
            <Loader2 className="h-12 w-12 mb-3 opacity-50 animate-spin" />
            <p>Loading assets...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {ASSET_TYPE_ORDER.map((type) => {
              const typeAssets = assetsByType[type] ?? [];
              const typeLabel = ASSET_TYPE_LABELS[type] ?? type;
              return (
                <section key={type}>
                  <h2 className="text-sm font-semibold text-dashboard-foreground/80 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Coins className="h-4 w-4" />
                    {typeLabel}
                  </h2>
                  {typeAssets.length === 0 ? (
                    <div className="rounded-xl border border-sidebar-border bg-sidebar/30 border-dashed py-8 text-center text-sm text-dashboard-foreground/50">
                      No assets in this section
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {typeAssets.map((asset) => (
                        <div
                          key={asset.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => openEdit(asset)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openEdit(asset);
                            }
                          }}
                          className="rounded-xl border border-sidebar-border bg-sidebar/50 p-4 shadow-sm hover:bg-sidebar/70 transition-colors cursor-pointer text-left"
                        >
                          <div className="font-semibold text-dashboard-foreground truncate">{asset.name}</div>
                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-dashboard-foreground/70">
                            <span className="flex items-center gap-1.5">
                              <BarChart3 className="h-3.5 w-3.5" />
                              Analysis: {asset.analysisCount}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Eye className="h-3.5 w-3.5" />
                              Times watched: {asset.watchCount}
                            </span>
                          </div>
                          <Link
                            href={`/fundamental-analysis/${asset.name.toLowerCase().replace(/\s/g, "-")}`}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-3 inline-block text-xs text-primary hover:underline"
                          >
                            View analysis →
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      <CreateAssetModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
      />

      <EditAssetModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) setEditingAsset(null);
        }}
        asset={editingAsset}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
