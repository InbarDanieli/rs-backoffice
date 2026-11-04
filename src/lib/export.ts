import "server-only";
import { BSON } from "mongodb";
import clientPromise from "./db";
import { createZip, type ZipEntry } from "./zip";

/** `website`: only what the public site is built from. `all`: every collection. */
export type ExportScope = "website" | "all";

const WEBSITE_COLLECTIONS = ["sponsors", "users"];

export function isExportScope(value: string): value is ExportScope {
  return value === "website" || value === "all";
}

export interface DatabaseExport {
  zip: Uint8Array;
  filename: string;
  counts: Record<string, number>;
}

/**
 * Database backup: one `<collection>.json` per collection plus a
 * `manifest.json`. For the `all` scope, collections are discovered at export
 * time, so new ones are included automatically.
 *
 * Documents are serialized as Extended JSON arrays so Dates and ObjectIds
 * survive a restore: `mongoimport --jsonArray --collection <name> <name>.json`.
 * Images live in the GitHub images repo and are exported only as URLs.
 */
export async function buildDatabaseExport(
  scope: ExportScope,
  exportedBy: string,
): Promise<DatabaseExport> {
  const client = await clientPromise;
  const db = client.db();
  const collections =
    scope === "website"
      ? WEBSITE_COLLECTIONS
      : (await db.listCollections({}, { nameOnly: true }).toArray())
          .map((c) => c.name)
          .filter((name) => !name.startsWith("system."))
          .sort();

  const encoder = new TextEncoder();
  const counts: Record<string, number> = {};
  const entries: ZipEntry[] = [];

  for (const name of collections) {
    const docs = await db.collection(name).find().toArray();
    counts[name] = docs.length;
    entries.push({ name: `${name}.json`, data: encoder.encode(BSON.EJSON.stringify(docs, undefined, 2)) });
  }

  const exportedAt = new Date();
  const manifest = {
    exportedAt: exportedAt.toISOString(),
    exportedBy,
    scope,
    database: db.databaseName,
    format: "MongoDB Extended JSON (relaxed), one array per collection",
    collections: counts,
  };
  entries.unshift({ name: "manifest.json", data: encoder.encode(JSON.stringify(manifest, null, 2)) });

  return {
    zip: createZip(entries),
    filename: `rs-backoffice-${scope}-export-${exportedAt.toISOString().slice(0, 10)}.zip`,
    counts,
  };
}
