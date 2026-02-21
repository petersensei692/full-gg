import { BASE_URL, handleResponse } from "@/lib/api-client";

export interface AppSettings {
  databasePath: string;
  imagesPath: string;
}

export const settingsService = {
  async get(): Promise<AppSettings> {
    const res = await fetch(`${BASE_URL}/api/settings`, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse<AppSettings>(res, `${BASE_URL}/api/settings`);
  },

  async update(partial: Partial<AppSettings>): Promise<AppSettings> {
    const res = await fetch(`${BASE_URL}/api/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    });
    return handleResponse<AppSettings>(res, `${BASE_URL}/api/settings`);
  },

  async validateDatabase(path: string): Promise<{ valid: boolean; error?: string }> {
    const res = await fetch(`${BASE_URL}/api/settings/validate-database`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    return handleResponse<{ valid: boolean; error?: string }>(res);
  },
};
