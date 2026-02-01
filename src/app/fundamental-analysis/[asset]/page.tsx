import { notFound } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AssetAnalysisView } from "@/components/AssetAnalysisView";
import { ASSET_CONFIGS } from "@/types/asset";

interface AssetPageProps {
  params: Promise<{ asset: string }>;
}

export default async function AssetPage({ params }: AssetPageProps) {
  const { asset: assetSlug } = await params;
  const normalizedSlug = assetSlug.toLowerCase().replace(/\s/g, "-");
  const asset = ASSET_CONFIGS[normalizedSlug];

  if (!asset) {
    notFound();
  }

  return (
    <DashboardLayout showHeader={false}>
      <AssetAnalysisView asset={asset} />
    </DashboardLayout>
  );
}
