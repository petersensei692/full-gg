"use client";

import type { StreamEntry } from "@/types/asset";

function toDayKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function htmlNodeToStyledText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? "").replace(/\u00a0/g, " ");
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const children = Array.from(el.childNodes).map(htmlNodeToStyledText).join("");
  const c = children;
  const cTrim = c.trim();

  if (tag === "h1") return cTrim ? `# ${cTrim}\n` : "";
  if (tag === "h2") return cTrim ? `## ${cTrim}\n` : "";
  if (tag === "h3") return cTrim ? `### ${cTrim}\n` : "";
  if (tag === "strong" || tag === "b") return cTrim ? `**${c}**` : "";
  if (tag === "u") return cTrim ? `__${c}__` : "";
  if (tag === "em" || tag === "i") return cTrim ? `*${c}*` : "";
  if (tag === "br") return "\n";
  if (tag === "li") return cTrim ? `- ${cTrim}\n` : "";
  if (tag === "p" || tag === "div" || tag === "blockquote") return cTrim ? `${c}\n` : "";
  return children;
}

function htmlToStyledText(html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html || ""}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "";
  const out = Array.from(root.childNodes).map(htmlNodeToStyledText).join("");
  return out
    .replace(/\r/g, "")
    .trim();
}

export function buildAnalysisExportText(entries: StreamEntry[]): string {
  const ordered = [...entries].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  if (ordered.length === 0) return "No analysis entries match the current filters.";

  const dayKeys = new Set(ordered.map((e) => toDayKey(e.createdAt ?? 0)));
  const includeDate = dayKeys.size > 1;

  const blocks = ordered.map((entry) => {
    const ts = entry.createdAt ?? 0;
    const scope = entry.scopeLabel?.trim() || "N/A";
    const datePart = includeDate ? `${formatDate(ts)} • ` : "";
    const meta = `${datePart}${formatTime(ts)} • ${scope}`;

    const title = (entry.title ?? "").trim();
    const body = htmlToStyledText(entry.content ?? "");

    if (title) {
      return `${meta}\n# ${title}${body ? `\n${body}` : ""}`;
    }
    return `${meta}\n${body || "(No body)"}`;
  });

  // 4 blank lines between analyses
  return blocks.join("\n\n\n\n\n");
}

export function buildSectionedAnalysisExportText(
  sections: Array<{ title: string; entries: StreamEntry[] }>,
): string {
  const nonEmpty = sections.filter((s) => s.entries.length > 0);
  if (nonEmpty.length === 0) return "No analysis entries match the current filters.";
  const sectionBlocks = nonEmpty.map((s) => {
    const body = buildAnalysisExportText(s.entries);
    return `=== ${s.title} ===\n\n${body}`;
  });
  // 8 blank lines between sections
  return sectionBlocks.join("\n\n\n\n\n\n\n\n\n");
}

export function downloadAnalysisTxt(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

