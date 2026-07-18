"use client";

import { useState } from "react";
import type { Strategy } from "@/types/api";
import { Trash2 } from "lucide-react";
import { StrategyFocusDialog } from "./StrategyFocusDialog";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";

function formatStrategyDeleteDetails(strategy: Strategy): string {
  return [
    `Name: ${strategy.name}`,
    `Images: ${strategy.images?.length ?? 0}`,
    `Updated: ${new Date(strategy.updatedAt).toLocaleString()}`,
    `ID: ${strategy.id}`,
  ].join("\n");
}

interface StrategyCardProps {
  strategy: Strategy;
  onEdit?: (strategy: Strategy) => void;
  onDelete?: (strategy: Strategy) => void | Promise<void>;
}

export function StrategyCard({ strategy, onEdit, onDelete }: StrategyCardProps) {
  const [focusOpen, setFocusOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Strategy | null>(null);

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={() => setFocusOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setFocusOpen(true);
          }
        }}
        className="rounded-xl border-l-4 border-l-primary border border-sidebar-border bg-sidebar/50 overflow-hidden shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
      >
        <div className="px-4 py-3 flex items-center justify-between gap-2">
          <h4 className="text-base font-semibold text-dashboard-foreground truncate">
            {strategy.name}
          </h4>
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingDelete(strategy);
                }}
                className="text-dashboard-foreground/50 hover:text-red-400 transition-colors p-1"
                aria-label="Delete strategy"
                title="Delete strategy"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(strategy);
                }}
                className="text-dashboard-foreground/50 hover:text-primary transition-colors p-1"
                aria-label="Edit strategy"
                title="Edit strategy"
              >
                ✎
              </button>
            )}
          </div>
        </div>
      </article>

      <StrategyFocusDialog
        strategy={focusOpen ? strategy : null}
        open={focusOpen}
        onOpenChange={setFocusOpen}
        onEdit={(s) => {
          setFocusOpen(false);
          onEdit?.(s);
        }}
        onDelete={onDelete}
      />

      <ConfirmDeleteDialog
        open={pendingDelete != null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Delete this strategy?"
        details={pendingDelete ? formatStrategyDeleteDetails(pendingDelete) : undefined}
        onConfirm={async () => {
          const s = pendingDelete;
          if (s && onDelete) await Promise.resolve(onDelete(s));
          setPendingDelete(null);
        }}
      />
    </>
  );
}
