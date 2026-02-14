import { NextResponse } from "next/server";
import { readImageByPath } from "@/lib/image-storage";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const storedPath = url.searchParams.get("path");
    if (!storedPath) {
      return NextResponse.json({ message: "Image path is required" }, { status: 400 });
    }

    const buffer = await readImageByPath(storedPath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image not found";
    return NextResponse.json({ message }, { status: 404 });
  }
}
