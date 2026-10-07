import { NextResponse } from "next/server";
import { listSponsorsByYear } from "@/lib/sponsors";
import { downloadImage } from "@/lib/github/images";
import { createZip, type ZipEntry } from "@/lib/zip";

const FOLDER = "sponsor-logos";

function safeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|\x00-\x1f]/g, "").trim() || "sponsor";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearId = searchParams.get("yearId");
  if (!yearId) return NextResponse.json({ error: "yearId is required" }, { status: 400 });

  const sponsors = (await listSponsorsByYear(yearId)).filter((s) => s.logo);
  if (sponsors.length === 0) {
    return NextResponse.json({ error: "No sponsor logos found" }, { status: 404 });
  }

  const results = await Promise.allSettled(
    sponsors.map(async (s) => ({ name: s.name, ...(await downloadImage(s.logo)) })),
  );

  const usedNames = new Set<string>();
  const entries: ZipEntry[] = [];
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const { name, data, ext } = result.value;
    const base = safeFilename(name);
    let filename = `${base}.${ext}`;
    for (let i = 2; usedNames.has(filename.toLowerCase()); i++) {
      filename = `${base} (${i}).${ext}`;
    }
    usedNames.add(filename.toLowerCase());
    entries.push({ name: `${FOLDER}/${filename}`, data });
  }

  if (entries.length === 0) {
    return NextResponse.json({ error: "Failed to download sponsor logos" }, { status: 502 });
  }

  const zip = createZip(entries);
  return new NextResponse(zip as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${FOLDER}.zip"`,
      "Content-Length": String(zip.length),
      "X-Logos-Skipped": String(sponsors.length - entries.length),
    },
  });
}
