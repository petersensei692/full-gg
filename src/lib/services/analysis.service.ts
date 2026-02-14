import { BASE_URL, handleResponse } from "@/lib/api-client";
import type { Analysis, CreateAnalysisDto, UpdateAnalysisDto } from "@/types/api";

export const analysisService = {
  async getAll(): Promise<Analysis[]> {
    const url = `${BASE_URL}/fondamental/assets/analysis`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(res, url);
  },

  async getOne(id: string): Promise<Analysis> {
    const url = `${BASE_URL}/fondamental/assets/analysis/${id}`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(res, url);
  },

  async create(dto: CreateAnalysisDto): Promise<Analysis> {
    const url = `${BASE_URL}/fondamental/assets/analysis`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    return handleResponse(res, url);
  },

  async update(id: string, dto: UpdateAnalysisDto): Promise<Analysis> {
    const url = `${BASE_URL}/fondamental/assets/analysis/${id}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    return handleResponse(res, url);
  },

  async delete(id: string): Promise<void> {
    const url = `${BASE_URL}/fondamental/assets/analysis/${id}`;
    const res = await fetch(url, {
      method: "DELETE",
    });
    await handleResponse(res, url);
  },
};
