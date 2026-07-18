"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Plus } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { strategiesService } from "@/lib/services/strategies.service";
import type { Strategy } from "@/types/api";
import { StrategyCard } from "@/components/strategies/StrategyCard";
import { CreateStrategyModal } from "@/components/strategies/CreateStrategyModal";

export default function AnalyticsStrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const loadStrategies = useCallback(async () => {
    setLoading(true);
    try {
      const list = await strategiesService.getAll();
      setStrategies(list);
    } catch {
      setStrategies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStrategies();
  }, [loadStrategies]);

  const handleEdit = useCallback((strategy: Strategy) => {
    setEditingStrategy(strategy);
    setEditModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (strategy: Strategy) => {
      try {
        await strategiesService.delete(strategy.id);
        loadStrategies();
      } catch {
        // ignore
      }
    },
    [loadStrategies],
  );

  const handleCreateSubmit = useCallback(
    async (payload: { name: string; description: string; images?: string[] }) => {
      await strategiesService.create(payload);
      setCreateOpen(false);
      loadStrategies();
    },
    [loadStrategies],
  );

  const handleEditSubmit = useCallback(
    async (payload: { name: string; description: string; images?: string[] }) => {
      if (!editingStrategy) return;
      await strategiesService.update(editingStrategy.id, payload);
      setEditModalOpen(false);
      setEditingStrategy(null);
      loadStrategies();
    },
    [editingStrategy, loadStrategies],
  );

  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? strategies.filter((s) => (s.name ?? "").toLowerCase().includes(q))
    : strategies;

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col overflow-auto">
        <div className="p-4 sm:p-6 sm:pt-4 flex flex-col min-h-0 flex-1">
          <h1 className="text-xl font-semibold text-dashboard-foreground mb-2">Strategies</h1>
          <p className="text-sm text-dashboard-foreground/70 mb-6">
            Your strategies appear as cards. Click a card to view the full description.
          </p>

          <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:flex-wrap sm:items-center">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search strategies by name..."
              spellCheck={false}
              className="w-full sm:w-auto rounded-lg border border-sidebar-border bg-sidebar px-3 py-2.5 sm:py-2 text-sm text-dashboard-foreground placeholder:text-dashboard-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:min-w-[200px] sm:max-w-[320px]"
              aria-label="Search strategies by name"
            />
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 sm:py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Create strategy
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[280px] text-dashboard-foreground/60 text-sm rounded-xl border border-sidebar-border bg-sidebar/30">
              <FileText className="h-12 w-12 mb-3 opacity-50 animate-pulse" />
              <p>Loading strategies...</p>
            </div>
          ) : strategies.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[280px] text-dashboard-foreground/60 text-sm rounded-xl border border-sidebar-border bg-sidebar/30">
              <FileText className="h-12 w-12 mb-3 opacity-50" />
              <p>No strategies yet.</p>
              <p className="text-xs mt-1">Create one with the button above.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[280px] text-dashboard-foreground/60 text-sm rounded-xl border border-sidebar-border bg-sidebar/30">
              <FileText className="h-12 w-12 mb-3 opacity-50" />
              <p>No strategies match your search.</p>
              <p className="text-xs mt-1">Try a different name or clear the search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((strategy) => (
                <StrategyCard
                  key={strategy.id}
                  strategy={strategy}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        <CreateStrategyModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          mode="create"
          onSubmit={handleCreateSubmit}
        />

        <CreateStrategyModal
          open={editModalOpen}
          onOpenChange={(open) => {
            if (!open) setEditingStrategy(null);
            setEditModalOpen(open);
          }}
          mode="edit"
          initialStrategy={editingStrategy}
          onSubmit={handleEditSubmit}
        />
      </div>
    </DashboardLayout>
  );
}
