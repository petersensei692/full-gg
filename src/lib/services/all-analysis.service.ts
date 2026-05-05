import { BASE_URL, handleResponse } from "@/lib/api-client";
import type { AllAnalysisItem } from "@/types/api";

export const allAnalysisService = {
  async getAll(): Promise<AllAnalysisItem[]> {
    const url = `${BASE_URL}/fondamental/all-analysis`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(res, url);
  },
};

