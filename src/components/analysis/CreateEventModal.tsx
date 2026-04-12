"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, GripVertical, ImagePlus, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import type { WeeklyCalendar, AssetCalendar, CreateEventDto, Event } from "@/types/api";
import { useAssets } from "@/context/AssetsContext";
import { EventImageThumb } from "./EventImageThumb";

interface CreateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendars?: WeeklyCalendar[];
  selectedCalendarId?: string | null;
  assetCalendars?: AssetCalendar[];
  selectedAssetCalendarId?: string | null;
  defaultCurrency?: string;
  mode?: "create" | "edit";
  initialEvent?: Event;
  onSubmit: (dto: CreateEventDto) => void;
}

type ImageItem = { id: string; dataUrl: string };

function newImageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function getDaysInRange(start: string, end: string): string[] {
  const days: string[] = [];
  const d = new Date(start);
  const endD = new Date(end);
  while (d <= endD) {
    days.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function readFileAsDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === "string" ? r.result : null);
    r.onerror = () => resolve(null);
    r.readAsDataURL(file);
  });
}

async function readImagesFromClipboard(e: React.ClipboardEvent): Promise<string[]> {
  const cd = e.clipboardData;
  if (!cd) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  const pushUnique = async (f: File | null) => {
    if (!f || !f.type.startsWith("image/")) return;
    const u = await readFileAsDataUrl(f);
    if (u && !seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  };
  for (const f of Array.from(cd.files ?? [])) {
    await pushUnique(f);
  }
  const items = cd.items;
  for (let i = 0; i < (items?.length ?? 0); i++) {
    const item = items[i];
    if (item.kind === "file" && item.type.startsWith("image/")) {
      await pushUnique(item.getAsFile());
    }
  }
  return out;
}

function reorderItems(items: ImageItem[], fromId: string, toId: string): ImageItem[] {
  if (fromId === toId) return items;
  const from = items.findIndex((i) => i.id === fromId);
  const to = items.findIndex((i) => i.id === toId);
  if (from < 0 || to < 0) return items;
  const next = [...items];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}

function moveIndex(items: ImageItem[], index: number, delta: number): ImageItem[] {
  const to = index + delta;
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [removed] = next.splice(index, 1);
  next.splice(to, 0, removed);
  return next;
}

export function CreateEventModal({
  open,
  onOpenChange,
  calendars = [],
  selectedCalendarId = null,
  assetCalendars = [],
  selectedAssetCalendarId = null,
  defaultCurrency = "",
  mode = "create",
  initialEvent,
  onSubmit,
}: CreateEventModalProps) {
  const useAssetCalendarMode = assetCalendars.length > 0;
  const [assetCalendarId, setAssetCalendarId] = useState(selectedAssetCalendarId || "");
  const [calendarId, setCalendarId] = useState(selectedCalendarId || "");
  const [date, setDate] = useState("");
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { assets } = useAssets();
  const [assetId, setAssetId] = useState("");

  const activeCalendar = useAssetCalendarMode
    ? assetCalendars.find((ac) => ac.id === assetCalendarId)
    : null;
  const activeWeeklyCalendar = useAssetCalendarMode
    ? activeCalendar?.weeklyCalendar
    : calendars.find((c) => c.id === calendarId);
  const dayOptions = activeWeeklyCalendar
    ? getDaysInRange(activeWeeklyCalendar.startDate, activeWeeklyCalendar.endDate)
    : [];

  useEffect(() => {
    if (open) {
      if (useAssetCalendarMode) {
        const acId =
          initialEvent?.assetCalendar?.id ??
          selectedAssetCalendarId ??
          assetCalendars[0]?.id ??
          "";
        setAssetCalendarId(acId);
      } else {
        const calId =
          initialEvent?.assetCalendar?.weeklyCalendar?.id ??
          initialEvent?.calendar?.id ??
          selectedCalendarId ??
          calendars[0]?.id ??
          "";
        setCalendarId(calId);
      }

      if (initialEvent) {
        const cal = initialEvent.assetCalendar?.weeklyCalendar ?? initialEvent.calendar ?? null;
        const dayOpts = cal ? getDaysInRange(cal.startDate, cal.endDate) : [];
        const match = dayOpts.find(
          (d) =>
            new Date(d + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long",
            }) === initialEvent.day
        );
        setDate(match ?? "");
        setImageItems(
          (Array.isArray(initialEvent.eventsImages) ? initialEvent.eventsImages : []).map((dataUrl) => ({
            id: newImageId(),
            dataUrl,
          }))
        );
        const matchAssetId =
          assets.find((a) => a.label === initialEvent.asset.name)?.id ?? assets[0]?.id ?? "";
        setAssetId(matchAssetId);
      } else {
        setDate("");
        setImageItems([]);
        const defaultAsset =
          assets.find((a) => a.label === defaultCurrency)?.id ?? assets[0]?.id ?? "";
        setAssetId(defaultAsset);
      }
      setDraggingId(null);
    }
  }, [
    open,
    selectedCalendarId,
    selectedAssetCalendarId,
    calendars?.length,
    calendars?.[0]?.id,
    assetCalendars?.length,
    assetCalendars?.[0]?.id,
    useAssetCalendarMode,
    defaultCurrency,
    assets?.length,
    initialEvent?.id,
  ]);

  const appendDataUrls = (urls: string[]) => {
    if (!urls.length) return;
    setImageItems((prev) => [...prev, ...urls.map((dataUrl) => ({ id: newImageId(), dataUrl }))]);
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const urls = await readImagesFromClipboard(e);
    if (urls.length) {
      e.preventDefault();
      appendDataUrls(urls);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    const next: string[] = [];
    for (const f of Array.from(list)) {
      if (!f.type.startsWith("image/")) continue;
      const u = await readFileAsDataUrl(f);
      if (u) next.push(u);
    }
    appendDataUrls(next);
    e.target.value = "";
  };

  const removeImageById = (id: string) => {
    setImageItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;
    if (mode === "create" && imageItems.length === 0) return;
    const dayLabel = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long",
    });
    const eventsImages = imageItems.map((i) => i.dataUrl);
    if (useAssetCalendarMode && assetCalendarId) {
      onSubmit({
        assetCalendarId,
        day: dayLabel,
        eventsImages,
      });
    } else if (calendarId && assetId) {
      onSubmit({
        calendarId,
        day: dayLabel,
        assetId,
        eventsImages,
      });
    } else return;
    setImageItems([]);
    setDate("");
    onOpenChange(false);
  };

  const currencyLabel = useAssetCalendarMode
    ? assetCalendars.find((ac) => ac.id === assetCalendarId)?.asset?.name ?? defaultCurrency
    : assets.find((a) => (a.id ?? "") === assetId)?.label ?? defaultCurrency;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent
        showClose={true}
        containToMain={true}
        className="max-w-4xl w-full max-h-[min(88dvh,920px)] min-h-0 flex flex-col items-stretch justify-start overflow-y-auto overflow-x-hidden overscroll-y-contain bg-sidebar border border-sidebar-border rounded-xl pl-6 pr-16 pb-6 pt-12"
      >
        <h3 className="text-lg font-semibold text-dashboard-foreground mb-4 shrink-0 pr-2">
          {mode === "edit" ? "Edit Event" : "Create Event"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4 min-w-0">
          {useAssetCalendarMode ? (
            <div>
              <label
                htmlFor="event-asset-calendar"
                className="block text-sm font-medium text-dashboard-foreground/80 mb-1"
              >
                Calendar
              </label>
              <select
                id="event-asset-calendar"
                value={assetCalendarId}
                onChange={(e) => {
                  setAssetCalendarId(e.target.value);
                  setDate("");
                }}
                required
                className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select a calendar...</option>
                {assetCalendars.map((ac) => (
                  <option key={ac.id} value={ac.id}>
                    {new Date(ac.startDate).toISOString().slice(0, 10)} →{" "}
                    {new Date(ac.endDate).toISOString().slice(0, 10)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label
                htmlFor="event-calendar"
                className="block text-sm font-medium text-dashboard-foreground/80 mb-1"
              >
                Weekly calendar
              </label>
              <select
                id="event-calendar"
                value={calendarId}
                onChange={(e) => {
                  setCalendarId(e.target.value);
                  setDate("");
                }}
                required
                className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select a calendar...</option>
                {calendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {new Date(cal.startDate).toISOString().slice(0, 10)} →{" "}
                    {new Date(cal.endDate).toISOString().slice(0, 10)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label
              htmlFor="event-date"
              className="block text-sm font-medium text-dashboard-foreground/80 mb-1"
            >
              Day
            </label>
            <select
              id="event-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              disabled={
                (useAssetCalendarMode ? !assetCalendarId : !calendarId) || dayOptions.length === 0
              }
              className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            >
              <option value="">Select day...</option>
              {dayOptions.map((d) => (
                <option key={d} value={d}>
                  {new Date(d + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </option>
              ))}
            </select>
          </div>
          {!useAssetCalendarMode && (
            <div>
              <label
                htmlFor="event-asset"
                className="block text-sm font-medium text-dashboard-foreground/80 mb-1"
              >
                Asset (currency)
              </label>
              <select
                id="event-asset"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                required
                className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select asset...</option>
                {assets.map((a) => (
                  <option key={a.id ?? a.slug} value={a.id ?? ""}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {useAssetCalendarMode && currencyLabel ? (
            <p className="text-sm text-dashboard-foreground/70">
              Currency: <span className="font-medium text-dashboard-foreground">{currencyLabel}</span>
            </p>
          ) : null}
          <div>
            <span className="block text-sm font-medium text-dashboard-foreground/80 mb-1">
              Events (images)
            </span>
            <p className="text-xs text-dashboard-foreground/60 mb-2">
              Paste many images (Ctrl+V) or add files. Drag the grip or use arrows to reorder. Click an image to
              focus it. {mode === "create" ? "At least one image required." : ""}
            </p>
            <div
              role="textbox"
              tabIndex={0}
              onPaste={handlePaste}
              className="min-h-[100px] rounded-lg border border-dashed border-sidebar-border bg-header-input/50 p-3 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {imageItems.length === 0 ? (
                <p className="text-sm text-dashboard-foreground/50 py-4 text-center">
                  Click here and paste images, or use “Add files” below.
                </p>
              ) : (
                <ul className="flex flex-col gap-2 list-none p-0 m-0">
                  {imageItems.map((item, idx) => (
                    <li
                      key={item.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const fromId = e.dataTransfer.getData("text/plain");
                        if (fromId) {
                          setImageItems((prev) => reorderItems(prev, fromId, item.id));
                        }
                        setDraggingId(null);
                      }}
                      className={`flex gap-2 items-stretch rounded-md border border-sidebar-border bg-header p-2 transition-opacity ${
                        draggingId === item.id ? "opacity-50" : ""
                      }`}
                    >
                      <span
                        role="button"
                        tabIndex={-1}
                        draggable
                        onDragStart={(e) => {
                          setDraggingId(item.id);
                          e.dataTransfer.setData("text/plain", item.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => setDraggingId(null)}
                        className="shrink-0 flex items-center self-center cursor-grab touch-none rounded p-1 text-dashboard-foreground/60 hover:bg-sidebar-hover active:cursor-grabbing"
                        aria-label="Drag to reorder"
                        title="Drag to reorder"
                      >
                        <GripVertical className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1 flex justify-center">
                        <EventImageThumb
                          src={item.dataUrl}
                          alt={`Event image ${idx + 1}`}
                          imgClassName="max-h-28 w-full max-w-full rounded border border-sidebar-border object-contain bg-black/20"
                        />
                      </div>
                      <div className="shrink-0 flex flex-col gap-0.5 items-center justify-center">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => setImageItems((prev) => moveIndex(prev, idx, -1))}
                          className="rounded p-1 text-dashboard-foreground/70 hover:bg-sidebar-hover hover:text-dashboard-foreground disabled:opacity-30 disabled:pointer-events-none"
                          aria-label="Move image up"
                          title="Move up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={idx >= imageItems.length - 1}
                          onClick={() => setImageItems((prev) => moveIndex(prev, idx, 1))}
                          className="rounded p-1 text-dashboard-foreground/70 hover:bg-sidebar-hover hover:text-dashboard-foreground disabled:opacity-30 disabled:pointer-events-none"
                          aria-label="Move image down"
                          title="Move down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImageById(item.id)}
                          className="rounded p-1 text-red-400/90 hover:bg-red-500/10 mt-0.5"
                          aria-label="Remove image"
                          title="Remove"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 inline-flex items-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-sm text-dashboard-foreground hover:bg-sidebar-hover"
            >
              <ImagePlus className="h-4 w-4" />
              Add files
            </button>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-sidebar-border px-4 py-2 text-sm font-medium text-dashboard-foreground hover:bg-sidebar-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mode === "create" && imageItems.length === 0}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              {mode === "edit" ? "Save changes" : "Create event"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
