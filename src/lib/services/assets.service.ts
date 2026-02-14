import { BASE_URL, handleResponse } from "@/lib/api-client";
import type { Asset, CreateAssetDto, UpdateAssetDto } from "@/types/api";

export const assetsService = {
  async getAll(): Promise<Asset[]> {
    const url = `${BASE_URL}/fondamental/assets`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(res, url);
  },

  async getOne(id: string): Promise<Asset> {
    const url = `${BASE_URL}/fondamental/assets/${id}`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(res, url);
  },

  async create(dto: CreateAssetDto): Promise<Asset> {
    const url = `${BASE_URL}/fondamental/assets`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    return handleResponse(res, url);
  },

  async update(id: string, dto: UpdateAssetDto): Promise<Asset> {
    const url = `${BASE_URL}/fondamental/assets/${id}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    return handleResponse(res, url);
  },

  async delete(id: string): Promise<void> {
    const url = `${BASE_URL}/fondamental/assets/${id}`;
    const res = await fetch(url, {
      method: "DELETE",
    });
    await handleResponse(res, url);
  },
};
