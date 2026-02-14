export const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function handleResponse<T>(res: Response, requestUrl?: string): Promise<T> {
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    const message =
      typeof body === "object" && body !== null && "message" in body
        ? (Array.isArray((body as { message: unknown }).message)
            ? (body as { message: string[] }).message.join(", ")
            : (body as { message: string }).message)
        : res.statusText;
    const urlSuffix = requestUrl ? ` (${requestUrl})` : "";
    throw new ApiError(`${message}${urlSuffix}`, res.status, body);
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }
  return res.json();
}
