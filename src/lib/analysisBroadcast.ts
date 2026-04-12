const CHANNEL_ID = "gg-journal-analysis-sync";

export type AnalysisBroadcastMessage = { type: "analysis-or-favorite-changed" };

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_ID);
  }
  return channel;
}

export function broadcastAnalysisOrFavoriteChanged(): void {
  const ch = getChannel();
  if (!ch) return;
  try {
    ch.postMessage({ type: "analysis-or-favorite-changed" } satisfies AnalysisBroadcastMessage);
  } catch {
    /* ignore */
  }
}

export function subscribeAnalysisOrFavoriteChanged(cb: () => void): () => void {
  const ch = getChannel();
  if (!ch) return () => undefined;
  const handler = (ev: MessageEvent) => {
    const data = ev.data as AnalysisBroadcastMessage | undefined;
    if (data?.type === "analysis-or-favorite-changed") cb();
  };
  ch.addEventListener("message", handler);
  return () => ch.removeEventListener("message", handler);
}
