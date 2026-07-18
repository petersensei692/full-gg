"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import type { CreateAssetDto } from "@/types/api";
import { ScrollableSelect } from "@/components/ui/ScrollableSelect";

const ASSET_TYPES = [
  { value: "currency", label: "Currency" },
  { value: "commodity", label: "Commodity" },
  { value: "stocks", label: "Stocks" },
  { value: "crypto", label: "Crypto" },
];

interface CreateAssetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: CreateAssetDto) => Promise<void>;
}

export function CreateAssetModal({ open, onOpenChange, onCreate }: CreateAssetModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("currency");
  const [isTradable, setIsTradable] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setError("");
    setSubmitting(true);
    try {
      await onCreate({ name: trimmed, type, isTradable });
      setName("");
      setType("currency");
      setIsTradable(true);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create asset");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose containToMain className="!max-w-md bg-sidebar border border-sidebar-border rounded-xl p-0 overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-dashboard-foreground">Create asset</h3>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-dashboard-foreground/80 mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g. USD, BTC"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dashboard-foreground/80 mb-1.5">Type</label>
              <ScrollableSelect
                value={type}
                onChange={(v) => {
                  setType(v);
                  if (v === "stocks") setIsTradable(false);
                }}
                options={ASSET_TYPES}
                aria-label="Asset type"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-dashboard-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isTradable}
                onChange={(e) => setIsTradable(e.target.checked)}
                className="rounded border-sidebar-border"
              />
              Tradable (can be used in trading pairs)
            </label>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg border border-sidebar-border px-4 py-2 text-sm font-medium text-dashboard-foreground hover:bg-sidebar-hover"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !name.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
