import type { StreamEntry as StreamEntryType } from "@/types/asset";

interface StreamEntryProps {
  entry: StreamEntryType;
  dateGroup?: string;
}

export function StreamEntry({ entry, dateGroup }: StreamEntryProps) {
  return (
    <article className="border-b border-sidebar-border pb-6 last:border-0">
      {dateGroup && (
        <p className="text-xs font-medium text-dashboard-foreground/50 uppercase tracking-wider mb-4">
          {dateGroup}
        </p>
      )}
      <div className="min-w-0">
        <div
          className="stream-entry-content text-sm text-dashboard-foreground/90 leading-relaxed mb-2 [&_img]:max-w-full [&_img]:max-h-[300px] [&_img]:rounded-lg [&_img]:my-2 [&_img]:cursor-pointer [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-medium"
          dangerouslySetInnerHTML={{ __html: entry.content }}
        />
          {entry.bullets && entry.bullets.length > 0 && (
            <ul className="list-disc list-inside text-sm text-dashboard-foreground/80 space-y-0.5 mb-3">
              {entry.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )}
          {entry.chartData && entry.chartData.length > 0 && (
            <div className="rounded-lg border border-sidebar-border bg-sidebar/50 p-3 mb-3">
              <div className="flex items-end gap-1 h-12">
                {entry.chartData.map((d, i) => (
                  <div
                    key={d.label}
                    className="flex-1 min-w-0 rounded-t bg-primary/40 transition-all hover:bg-primary/60"
                    style={{
                      height: `${20 + (d.value / 110) * 80}%`,
                      minHeight: "8px",
                    }}
                    title={`${d.label}: ${d.value}`}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-dashboard-foreground/50">
                {entry.chartData.map((d) => (
                  <span key={d.label}>{d.label}</span>
                ))}
              </div>
            </div>
          )}
          {entry.quote && (
            <blockquote className="border-l-2 border-primary/50 pl-3 py-1 my-2 bg-sidebar/50 rounded-r text-sm text-dashboard-foreground/80 italic">
              &ldquo;{entry.quote.text}&rdquo;
              <footer className="text-xs text-dashboard-foreground/50 not-italic mt-1">
                — {entry.quote.source}
              </footer>
            </blockquote>
          )}
          {entry.pairUpdates && entry.pairUpdates.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {entry.pairUpdates.map((p) => (
                <span
                  key={p.pair}
                  className={`text-xs font-medium ${
                    p.positive ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {p.positive ? "+" : ""}
                  {p.pair}: {p.value}
                </span>
              ))}
            </div>
          )}
      </div>
    </article>
  );
}
