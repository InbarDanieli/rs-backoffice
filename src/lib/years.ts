import "server-only";
import { cookies } from "next/headers";
import type { Collection, WithId } from "mongodb";
import clientPromise from "./db";
import { getMemberCollection } from "./users";

export interface Year {
  id: string;
  name: string;
  isDefault: boolean;
  memberEmails: string[];
  createdAt: Date;
  updatedAt: Date;
}

async function getCollection(): Promise<Collection<Year>> {
  const client = await clientPromise;
  return client.db().collection<Year>("years");
}

function toYear(doc: WithId<Year>): Year {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, ...year } = doc;
  return year as Year;
}

export async function listYears(): Promise<Year[]> {
  const col = await getCollection();
  const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
  return docs.map(toYear);
}

export async function findYearById(id: string): Promise<Year | null> {
  const col = await getCollection();
  const doc = await col.findOne({ id });
  return doc ? toYear(doc) : null;
}

export async function findDefaultYear(): Promise<Year | null> {
  const col = await getCollection();
  const doc = await col.findOne({ isDefault: true });
  return doc ? toYear(doc) : null;
}

/** Reads the active_year_id cookie; falls back to the default year. */
export async function getActiveYear(): Promise<Year | null> {
  const cookieStore = await cookies();
  const activeYearId = cookieStore.get("active_year_id")?.value;
  if (activeYearId) {
    const year = await findYearById(activeYearId);
    if (year) return year;
  }
  return findDefaultYear();
}

export async function getYearIdByName(name: string): Promise<string | null> {
  const col = await getCollection();
  const doc = await col.findOne({ name });
  return doc ? doc.id : null;
}

export async function createYear(data: {
  name: string;
  isDefault: boolean;
  userEmail: string;
}): Promise<Year> {
  const col = await getCollection();
  const defaultEmail = "rantav@gmail.com";
  const memberEmails = [defaultEmail, data.userEmail];

  if (data.isDefault) {
    await col.updateMany({}, { $set: { isDefault: false } });
  }

  const now = new Date();
  const year: Year = {
    id: crypto.randomUUID(),
    name: data.name.trim(),
    isDefault: data.isDefault,
    memberEmails,
    createdAt: now,
    updatedAt: now,
  };

  await col.insertOne(year);
  await createYearForMembers(year.id, memberEmails);

  return year;
}

async function createYearForMembers(
  yearId: string,
  emails: string[],
): Promise<void> {
  const userCol = await getMemberCollection();

  await userCol.updateMany(
    { email: { $in: emails } },
    { $addToSet: { years: yearId } },
  );
}

export async function setDefaultYear(id: string): Promise<void> {
  const col = await getCollection();
  await col.updateMany({}, { $set: { isDefault: false } });
  await col.updateOne(
    { id },
    { $set: { isDefault: true, updatedAt: new Date() } },
  );
}

export async function addMemberToYear(
  yearId: string,
  email: string,
): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { id: yearId },
    {
      $addToSet: { memberEmails: email.toLowerCase().trim() },
      $set: { updatedAt: new Date() },
    },
  );
}

export async function deleteYear(id: string): Promise<void> {
  const col = await getCollection();
  await col.deleteOne({ id });
  await deleteYearForMembers(id);
}

export async function deleteYearForMembers(yearId: string): Promise<void> {
  const userCol = await getMemberCollection();
  await userCol.updateMany({ years: yearId }, { $pull: { years: yearId } });
}

export async function removeMemberFromYear(
  yearId: string,
  email: string,
): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { id: yearId },
    {
      $pull: { memberEmails: email.toLowerCase().trim() },
      $set: { updatedAt: new Date() },
    },
  );
}

/**
 * Replace a year's `memberEmails` array with `emails` in the given order.
 * Validates that the new list contains exactly the same set of emails (no
 * adds, removes, or duplicates) — order changes only.
 */
export async function setMemberOrder(
  yearId: string,
  emails: string[],
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const year = await findYearById(yearId);
  if (!year) return { ok: false, reason: "year not found" };

  const normalized = emails
    .map((e) => (typeof e === "string" ? e.trim().toLowerCase() : ""))
    .filter((e) => e.length > 0);

  if (new Set(normalized).size !== normalized.length) {
    return { ok: false, reason: "duplicate emails" };
  }

  const current = new Set(year.memberEmails.map((e) => e.toLowerCase()));
  const next = new Set(normalized);

  if (current.size !== next.size) {
    return { ok: false, reason: "set mismatch" };
  }
  for (const e of current) {
    if (!next.has(e)) return { ok: false, reason: "set mismatch" };
  }

  const col = await getCollection();
  await col.updateOne(
    { id: yearId },
    { $set: { memberEmails: normalized, updatedAt: new Date() } },
  );

  return { ok: true };
}
