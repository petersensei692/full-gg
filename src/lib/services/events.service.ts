import { BASE_URL, handleResponse } from "@/lib/api-client";
import type { Event, CreateEventDto, UpdateEventDto } from "@/types/api";

export const eventsService = {
  async getAll(): Promise<Event[]> {
    const url = `${BASE_URL}/fondamental/assets/events`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(res, url);
  },

  async getOne(id: string): Promise<Event> {
    const url = `${BASE_URL}/fondamental/assets/events/${id}`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(res, url);
  },

  async create(dto: CreateEventDto): Promise<Event> {
    const url = `${BASE_URL}/fondamental/assets/events`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    return handleResponse(res, url);
  },

  async update(id: string, dto: UpdateEventDto): Promise<Event> {
    const url = `${BASE_URL}/fondamental/assets/events/${id}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    return handleResponse(res, url);
  },

  async delete(id: string): Promise<void> {
    const url = `${BASE_URL}/fondamental/assets/events/${id}`;
    const res = await fetch(url, {
      method: "DELETE",
    });
    await handleResponse(res, url);
  },
};
