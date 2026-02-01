import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbsProps {
  assetLabel: string;
  assetSlug: string;
}

export function Breadcrumbs({ assetLabel, assetSlug }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-dashboard-foreground/70">
      <Link
        href="/fundamental-analysis"
        className="hover:text-primary transition-colors"
      >
        Fundamental Analysis
      </Link>
      <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
      <span className="text-dashboard-foreground/70">Assets</span>
      <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
      <span className="text-dashboard-foreground font-medium">
        {assetLabel}
      </span>
    </nav>
  );
}
