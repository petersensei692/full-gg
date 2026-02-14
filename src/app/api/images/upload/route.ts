import { NextResponse } from "next/server";
import { saveImageBuffer } from "@/lib/image-storage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file !== "object" || !("arrayBuffer" in file)) {
      return NextResponse.json({ message: "Missing image file" }, { status: 400 });
    }

    const fileType = "type" in file ? (file as File).type : "";
    if (fileType && !fileType.startsWith("image/")) {
      return NextResponse.json({ message: "Invalid image type" }, { status: 400 });
    }

    const arrayBuffer = await (file as Blob).arrayBuffer();
    console.log("Uploading image bytes:", arrayBuffer.byteLength);
    const storedPath = await saveImageBuffer(Buffer.from(arrayBuffer), "chart");
    return NextResponse.json({ path: storedPath });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    console.error("Image upload failed:", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
