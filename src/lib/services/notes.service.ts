import { BASE_URL, handleResponse } from "@/lib/api-client";
import type { Note, CreateNoteDto, UpdateNoteDto } from "@/types/api";

export const notesService = {
  async getAll(): Promise<Note[]> {
    const url = `${BASE_URL}/fondamental/notes`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse<Note[]>(res, url);
  },

  async getOne(id: string): Promise<Note> {
    const url = `${BASE_URL}/fondamental/notes/${id}`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse<Note>(res, url);
  },

  async create(dto: CreateNoteDto): Promise<Note> {
    const url = `${BASE_URL}/fondamental/notes`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    return handleResponse<Note>(res, url);
  },

  async update(id: string, dto: UpdateNoteDto): Promise<Note> {
    const url = `${BASE_URL}/fondamental/notes/${id}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    return handleResponse<Note>(res, url);
  },

  async delete(id: string): Promise<void> {
    const url = `${BASE_URL}/fondamental/notes/${id}`;
    const res = await fetch(url, { method: "DELETE" });
    await handleResponse(res, url);
  },
};
