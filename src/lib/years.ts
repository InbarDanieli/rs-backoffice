import "server-only";
import { cookies } from "next/headers";
import type { Collection, WithId } from "mongodb";
import clientPromise from "./db";

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
}): Promise<Year> {
  const col = await getCollection();

  if (data.isDefault) {
    await col.updateMany({}, { $set: { isDefault: false } });
  }

  const now = new Date();
  const year: Year = {
    id: crypto.randomUUID(),
    name: data.name.trim(),
    isDefault: data.isDefault,
    memberEmails: [],
    createdAt: now,
    updatedAt: now,
  };

  await col.insertOne(year);
  return year;
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
