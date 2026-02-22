import { BASE_URL, handleResponse } from "@/lib/api-client";
import type { AssetCalendar } from "@/types/api";

export const assetCalendarService = {
  async getByAsset(assetId: string): Promise<AssetCalendar[]> {
    const url = `${BASE_URL}/weekly/asset-calendar?assetId=${encodeURIComponent(assetId)}`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(res, url);
  },

  async getByWeeklyCalendar(weeklyCalendarId: string): Promise<AssetCalendar[]> {
    const url = `${BASE_URL}/weekly/asset-calendar?weeklyCalendarId=${encodeURIComponent(weeklyCalendarId)}`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(res, url);
  },

  async getOne(id: string): Promise<AssetCalendar> {
    const url = `${BASE_URL}/weekly/asset-calendar/${id}`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(res, url);
  },
};
