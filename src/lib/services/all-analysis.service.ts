import { BASE_URL, handleResponse } from "@/lib/api-client";
import type { AllAnalysisItem } from "@/types/api";

export const allAnalysisService = {
  /** When `assetId` is set, returns analyses relevant for that asset (same rules as full list but filtered). */
  async getAll(assetId?: string): Promise<AllAnalysisItem[]> {
    const q = assetId ? `?assetId=${encodeURIComponent(assetId)}` : "";
    const url = `${BASE_URL}/fondamental/all-analysis${q}`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(res, url);
  },
};

