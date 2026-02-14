import { BASE_URL, handleResponse } from "@/lib/api-client";
import type {
  WeeklyCalendar,
  CreateWeeklyCalendarDto,
  UpdateWeeklyCalendarDto,
} from "@/types/api";

export const weeklyCalendarService = {
  async getAll(): Promise<WeeklyCalendar[]> {
    const url = `${BASE_URL}/weekly/calendar`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(res, url);
  },

  async getOne(id: string): Promise<WeeklyCalendar> {
    const url = `${BASE_URL}/weekly/calendar/${id}`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(res, url);
  },

  async create(dto: CreateWeeklyCalendarDto): Promise<WeeklyCalendar> {
    const url = `${BASE_URL}/weekly/calendar`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    return handleResponse(res, url);
  },

  async update(id: string, dto: UpdateWeeklyCalendarDto): Promise<WeeklyCalendar> {
    const url = `${BASE_URL}/weekly/calendar/${id}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    return handleResponse(res, url);
  },

  async delete(id: string): Promise<void> {
    const url = `${BASE_URL}/weekly/calendar/${id}`;
    const res = await fetch(url, {
      method: "DELETE",
    });
    await handleResponse(res, url);
  },
};
