import { DollarSign, Filter } from "lucide-react";

interface AssetHeaderProps {
  title: string;
  icon?: React.ReactNode;
}

export function AssetHeader({ title, icon }: AssetHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-dashboard-foreground min-w-0">
        {icon ?? <DollarSign className="h-4 w-4 shrink-0 text-primary" />}
        <h2 className="text-lg font-semibold truncate">{title}</h2>
      </div>
      <button
        type="button"
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-sidebar-border bg-sidebar px-2.5 py-1.5 text-xs font-medium text-dashboard-foreground hover:bg-sidebar-hover transition-colors"
      >
        <Filter className="h-3.5 w-3.5" />
        Filters
      </button>
    </div>
  );
}
