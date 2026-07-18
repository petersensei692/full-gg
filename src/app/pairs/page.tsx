"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Plus } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { pairsService } from "@/lib/services/pairs.service";
import { assetsService } from "@/lib/services/assets.service";
import type { Asset, TradingPair } from "@/types/api";

function formatPip(value: number | null): string {
  if (value == null) return "—";
  const s = String(value);
  if (/e/i.test(s)) return value.toFixed(8).replace(/\.?0+$/, "");
  return s;
}

export default function PairsPage() {
  const [rows, setRows] = useState<TradingPair[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<TradingPair | null>(null);
  const [deleteRow, setDeleteRow] = useState<TradingPair | null>(null);

  const [baseId, setBaseId] = useState("");
  const [quoteId, setQuoteId] = useState("");
  const [pipDraft, setPipDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const tradableAssets = useMemo(
    () => assets.filter((a) => a.isTradable !== false).sort((a, b) => a.name.localeCompare(b.name)),
    [assets],
  );

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pairs, assetList] = await Promise.all([
        pairsService.getAll(),
        assetsService.getAll(),
      ]);
      setRows(pairs);
      setAssets(assetList);
    } catch {
      showMessage("error", "Failed to load pairs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setBaseId(tradableAssets[0]?.id ?? "");
    setQuoteId(tradableAssets[1]?.id ?? "");
    setPipDraft("");
    setFormError("");
    setCreateOpen(true);
  };

  const openEdit = (row: TradingPair) => {
    setEditRow(row);
    setPipDraft(row.pipValue == null ? "" : formatPip(row.pipValue));
    setFormError("");
  };

  const parsePip = (): number | null | undefined => {
    const t = pipDraft.trim();
    if (t === "") return null;
    const n = Number(t);
    if (!Number.isFinite(n) || n <= 0) {
      setFormError("Enter a positive number, or leave empty.");
      return undefined;
    }
    return n;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!baseId || !quoteId) {
      setFormError("Select base and quote assets.");
      return;
    }
    if (baseId === quoteId) {
      setFormError("Base and quote must differ.");
      return;
    }
    const pip = parsePip();
    if (pip === undefined) return;
    setSaving(true);
    try {
      await pairsService.create({ baseAssetId: baseId, quoteAssetId: quoteId, pipValue: pip });
      setCreateOpen(false);
      showMessage("success", "Pair created.");
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRow) return;
    setFormError("");
    const pip = parsePip();
    if (pip === undefined) return;
    setSaving(true);
    try {
      await pairsService.update(editRow.id, { pipValue: pip });
      setEditRow(null);
      showMessage("success", "Pip value saved.");
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSwap = async () => {
    if (!editRow) return;
    setFormError("");
    setSaving(true);
    try {
      await pairsService.update(editRow.id, { swapOrientation: true });
      setEditRow(null);
      showMessage("success", "Orientation swapped.");
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to swap");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 flex-col overflow-auto">
        <div className="mx-auto w-full max-w-4xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-dashboard-foreground flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-primary" />
                Trading pairs
              </h1>
              <p className="text-sm text-dashboard-foreground/60 mt-1">
                Manage which pairs are tradeable and their pip values. Empty pip blocks new positions.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              disabled={tradableAssets.length < 2}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add pair
            </button>
          </div>

          {message && (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                message.type === "success"
                  ? "border-green-500/40 bg-green-500/10 text-green-400"
                  : "border-red-500/40 bg-red-500/10 text-red-400"
              }`}
            >
              {message.text}
            </div>
          )}

          <section className="rounded-xl border border-sidebar-border bg-sidebar overflow-hidden">
            {loading ? (
              <p className="p-4 text-sm text-dashboard-foreground/60">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="p-4 text-sm text-dashboard-foreground/60">
                No pairs yet. Seed the database or add a pair.
              </p>
            ) : (
              <div className="max-h-[min(70vh,720px)] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-sidebar border-b border-sidebar-border text-left text-xs text-dashboard-foreground/60">
                    <tr>
                      <th className="px-3 py-2 font-medium">Pair</th>
                      <th className="px-3 py-2 font-medium">Pip value</th>
                      <th className="px-3 py-2 font-medium w-[1%] whitespace-nowrap"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-sidebar-border/60 last:border-0 hover:bg-sidebar-hover/40"
                      >
                        <td className="px-3 py-2 font-medium text-dashboard-foreground">{row.pair}</td>
                        <td className="px-3 py-2 tabular-nums text-dashboard-foreground/80">
                          {formatPip(row.pipValue)}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className="rounded-lg border border-sidebar-border px-2.5 py-1 text-xs font-medium hover:bg-sidebar-hover hover:text-primary mr-1.5"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteRow(row)}
                            className="rounded-lg border border-red-500/40 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          showClose
          containToMain
          className="!max-w-md bg-sidebar border border-sidebar-border rounded-xl p-0 overflow-hidden"
        >
          <div className="p-6">
            <h3 className="text-lg font-semibold text-dashboard-foreground">Create pair</h3>
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-dashboard-foreground/80">Base</label>
                <select
                  value={baseId}
                  onChange={(e) => setBaseId(e.target.value)}
                  className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm"
                >
                  {tradableAssets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-dashboard-foreground/80">Quote</label>
                <select
                  value={quoteId}
                  onChange={(e) => setQuoteId(e.target.value)}
                  className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm"
                >
                  {tradableAssets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-dashboard-foreground/80">
                  Pip value <span className="font-normal text-dashboard-foreground/50">(optional)</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={pipDraft}
                  onChange={(e) => setPipDraft(e.target.value)}
                  placeholder="e.g. 0.0001"
                  className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm tabular-nums"
                />
              </div>
              {formError && <p className="text-sm text-red-400">{formError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-lg border border-sidebar-border px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {saving ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editRow != null} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent
          showClose
          containToMain
          className="!max-w-md bg-sidebar border border-sidebar-border rounded-xl p-0 overflow-hidden"
        >
          {editRow && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-dashboard-foreground">
                Edit — {editRow.pair}
              </h3>
              <form onSubmit={handleEditSave} className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-dashboard-foreground/80">
                    Pip value
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={pipDraft}
                    onChange={(e) => setPipDraft(e.target.value)}
                    placeholder="Leave empty to clear"
                    className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm tabular-nums"
                    autoFocus
                  />
                </div>
                {formError && <p className="text-sm text-red-400">{formError}</p>}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => void handleSwap()}
                    disabled={saving}
                    className="text-sm text-primary hover:underline disabled:opacity-50"
                  >
                    Swap base / quote
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditRow(null)}
                      className="rounded-lg border border-sidebar-border px-4 py-2 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteRow != null}
        onOpenChange={(o) => !o && setDeleteRow(null)}
        title="Delete this pair?"
        details={deleteRow ? `Pair: ${deleteRow.pair}` : undefined}
        onConfirm={async () => {
          if (!deleteRow) return;
          await pairsService.remove(deleteRow.id);
          showMessage("success", "Pair deleted.");
          await load();
        }}
      />
    </DashboardLayout>
  );
}
