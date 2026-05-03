"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import type { AssetWithStats } from "@/types/api";

const ASSET_TYPES = [
  { value: "currency", label: "Currency" },
  { value: "commodity", label: "Commodity" },
  { value: "stocks", label: "Stocks" },
  { value: "crypto", label: "Crypto" },
];

interface EditAssetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetWithStats | null;
  onSave: (id: string, data: { name?: string; type?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function EditAssetModal({
  open,
  onOpenChange,
  asset,
  onSave,
  onDelete,
}: EditAssetModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("currency");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (asset && open) {
      setName(asset.name);
      setType(asset.type === "bond" ? "stocks" : (asset.type ?? "currency"));
      setError("");
    }
  }, [asset, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset) return;
    setError("");
    setSaving(true);
    try {
      await onSave(asset.id, { name: name.trim(), type });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const runDelete = async () => {
    if (!asset) return;
    setError("");
    setDeleting(true);
    try {
      await onDelete(asset.id);
      onOpenChange(false);
      setConfirmDeleteOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  if (!asset) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose containToMain className="!max-w-md bg-sidebar border border-sidebar-border rounded-xl p-0 overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-dashboard-foreground">Edit asset</h3>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-dashboard-foreground/80 mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g. USD"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dashboard-foreground/80 mb-1.5">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {ASSET_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={deleting}
                className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
              >
                Delete asset
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-lg border border-sidebar-border px-4 py-2 text-sm font-medium text-dashboard-foreground hover:bg-sidebar-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>

    <ConfirmDeleteDialog
      open={confirmDeleteOpen}
      onOpenChange={setConfirmDeleteOpen}
      title="Delete this asset?"
      description="All related data for this asset may be affected. This cannot be undone."
      details={
        asset
          ? [`Name: ${asset.name}`, `Type: ${asset.type ?? "—"}`, `ID: ${asset.id}`].join("\n")
          : undefined
      }
      onConfirm={runDelete}
    />
    </>
  );
}
