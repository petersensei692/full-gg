import { DashboardLayout } from "@/components/DashboardLayout";
import { FavoritesWindowLifecycle } from "@/components/FavoritesWindowLifecycle";

export default function FavoritesWindowLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout favoritesNav>
      <FavoritesWindowLifecycle />
      {children}
    </DashboardLayout>
  );
}
