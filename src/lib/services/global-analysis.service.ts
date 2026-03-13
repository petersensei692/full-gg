import { BASE_URL, handleResponse } from "@/lib/api-client";
import type {
  GlobalAnalysis,
  CreateGlobalAnalysisDto,
  UpdateGlobalAnalysisDto,
} from "@/types/api";

export const globalAnalysisService = {
  async getAll(): Promise<GlobalAnalysis[]> {
    const url = `${BASE_URL}/fondamental/global-analysis`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(res, url);
  },

  async getOne(id: string): Promise<GlobalAnalysis> {
    const url = `${BASE_URL}/fondamental/global-analysis/${id}`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(res, url);
  },

  async create(dto: CreateGlobalAnalysisDto): Promise<GlobalAnalysis> {
    const url = `${BASE_URL}/fondamental/global-analysis`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    return handleResponse(res, url);
  },

  async update(id: string, dto: UpdateGlobalAnalysisDto): Promise<GlobalAnalysis> {
    const url = `${BASE_URL}/fondamental/global-analysis/${id}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    return handleResponse(res, url);
  },

  async delete(id: string): Promise<void> {
    const url = `${BASE_URL}/fondamental/global-analysis/${id}`;
    const res = await fetch(url, { method: "DELETE" });
    await handleResponse(res, url);
  },
};
