import { notFound } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AssetAnalysisView } from "@/components/AssetAnalysisView";
import { assetsApi } from "@/lib/api";
import { assetToConfig, ASSET_CONFIGS } from "@/types/asset";

/** Pre-build known slugs; also fetch from API when available so exports include DB assets */
export async function generateStaticParams() {
  const fromStatic = Object.keys(ASSET_CONFIGS).map((asset) => ({ asset }));
  try {
    const list = await assetsApi.getAll();
    const fromApi = list.map((a) => ({
      asset: a.name.toLowerCase().replace(/\s/g, "-"),
    }));
    const seen = new Set(fromStatic.map((p) => p.asset));
    for (const p of fromApi) {
      if (!seen.has(p.asset)) {
        seen.add(p.asset);
        fromStatic.push(p);
      }
    }
  } catch {
    // API unavailable at build time — static configs only
  }
  return fromStatic;
}

/** With output: "export", only these paths are built; use /fundamental-analysis/asset?slug= for new DB assets. */
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
