import { notFound } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AssetAnalysisView } from "@/components/AssetAnalysisView";
import { assetsApi } from "@/lib/api";
import { assetToConfig, ASSET_CONFIGS } from "@/types/asset";

/** Required for "output: export" (static export) — pre-defines asset paths at build time */
export async function generateStaticParams() {
  return Object.keys(ASSET_CONFIGS).map((asset) => ({ asset }));
}

/** Only pre-generated params are valid; unknown params 404 */
export const dynamicParams = false;

interface AssetPageProps {
  params: Promise<{ asset: string }>;
}

export default async function AssetPage({ params }: AssetPageProps) {
  const { asset: assetSlug } = await params;
  const normalizedSlug = assetSlug.toLowerCase().replace(/\s/g, "-");

  let asset;
  try {
    const list = await assetsApi.getAll();
    const match = list.find(
      (a) => a.name.toLowerCase().replace(/\s/g, "-") === normalizedSlug
    );
    asset = match ? assetToConfig(match) : null;
  } catch {
    asset = ASSET_CONFIGS[normalizedSlug] ?? null;
  }

  if (!asset) {
    notFound();
  }

  return (
    <DashboardLayout>
      <AssetAnalysisView asset={asset} />
    </DashboardLayout>
  );
}
