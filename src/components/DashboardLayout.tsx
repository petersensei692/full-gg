import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  searchPlaceholder?: string;
  /** When false, the top header bar is hidden (e.g. for fundamental analysis pages). Default true. */
  showHeader?: boolean;
}

export function DashboardLayout({
  children,
  title,
  searchPlaceholder,
  showHeader = true,
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-dashboard-bg text-dashboard-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        {showHeader && (
          <Header title={title} searchPlaceholder={searchPlaceholder} />
        )}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
