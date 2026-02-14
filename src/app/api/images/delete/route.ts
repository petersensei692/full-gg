import { NextResponse } from "next/server";
import { deleteImageByPath } from "@/lib/image-storage";

export const runtime = "nodejs";

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const storedPath = typeof body?.path === "string" ? body.path : "";
    if (!storedPath) {
      return NextResponse.json({ message: "Image path is required" }, { status: 400 });
    }
    await deleteImageByPath(storedPath);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
