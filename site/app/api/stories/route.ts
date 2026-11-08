import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import manifest from "@/data/stories_manifest.json";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const chunk = searchParams.get("chunk") || "1";
  const getManifest = searchParams.get("manifest");

  if (getManifest === "true") {
    return NextResponse.json(manifest, {
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  }

  const chunkIdx = parseInt(chunk, 10);
  if (isNaN(chunkIdx) || chunkIdx < 1 || chunkIdx > manifest.chunk_count) {
    return NextResponse.json({ error: "Chunk index out of bounds" }, { status: 404 });
  }

  const fileName = `stories-${chunkIdx}.json`;
  const filePath = path.join(process.cwd(), "data", fileName);

  try {
    if (fs.existsSync(filePath)) {
      const content = await fs.promises.readFile(filePath, "utf-8");
      const data = JSON.parse(content);
      return NextResponse.json(data, {
        headers: {
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
        },
      });
    }
  } catch (err) {
    console.error("[stories_api] Error reading chunk:", fileName);
  }

  return NextResponse.json({ error: "Chunk not found" }, { status: 404 });
}
