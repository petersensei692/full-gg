import { BASE_URL, handleResponse } from "@/lib/api-client";
import type { Asset, CreateAssetDto, UpdateAssetDto } from "@/types/api";

export const assetsService = {
  async getAll(): Promise<Asset[]> {
    const res = await fetch(`${BASE_URL}/fondamental/assets`, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(res);
  },

  async getOne(id: string): Promise<Asset> {
    const res = await fetch(`${BASE_URL}/fondamental/assets/${id}`, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(res);
  },

  async create(dto: CreateAssetDto): Promise<Asset> {
    const res = await fetch(`${BASE_URL}/fondamental/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    return handleResponse(res);
  },

  async update(id: string, dto: UpdateAssetDto): Promise<Asset> {
    const res = await fetch(`${BASE_URL}/fondamental/assets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    return handleResponse(res);
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/fondamental/assets/${id}`, {
      method: "DELETE",
    });
    await handleResponse(res);
  },
};
