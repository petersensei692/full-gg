import { DollarSign } from "lucide-react";

interface AssetHeaderProps {
  title: string;
  icon?: React.ReactNode;
}

export function AssetHeader({ title, icon }: AssetHeaderProps) {
  return (
    <div className="flex items-center gap-2 text-dashboard-foreground min-w-0">
      {icon ?? <DollarSign className="h-4 w-4 shrink-0 text-primary" />}
      <h2 className="text-lg font-semibold truncate">{title}</h2>
    </div>
  );
}
