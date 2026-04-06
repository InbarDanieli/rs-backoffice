import "server-only";
import type { Collection, WithId } from "mongodb";
import clientPromise from "./db";

export type UserRole = "team-member" | "admin" | "sponsor-manager";

export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
  company: string;
  title: string;
  bio: string;
  linkedin: string;
  x: string;
  bluesky: string;
  facebook: string;
  instagram: string;
  youtube: string;
  github: string;
  medium: string;
  website: string;
  role: UserRole;
  years: string[]; // IDs of years this user has been active in
  createdAt: Date;
  updatedAt: Date;
}

export type UpdatableUserFields = Pick<
  User,
  | "name"
  | "company"
  | "title"
  | "bio"
  | "picture"
  | "role"
  | "linkedin"
  | "x"
  | "bluesky"
  | "facebook"
  | "instagram"
  | "youtube"
  | "github"
  | "medium"
  | "website"
>;

async function getCollection(): Promise<Collection<User>> {
  const client = await clientPromise;
  return client.db().collection<User>("users");
}

function toUser(doc: WithId<User>): User {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, ...user } = doc;
  return user as User;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const col = await getCollection();
  const doc = await col.findOne({ email });
  return doc ? toUser(doc) : null;
}

export async function findUserById(id: string): Promise<User | null> {
  const col = await getCollection();
  const doc = await col.findOne({ id });
  return doc ? toUser(doc) : null;
}

export async function findUsersByYear(yearId: string): Promise<User[]> {
  const col = await getCollection();
  const docs = await col
    .find({ years: yearId })
    .project<WithId<User>>({ _id: 0 })
    .toArray();
  return docs.map(toUser);
}

export async function upsertUser(data: {
  email: string;
  name: string;
  picture: string;
  yearId?: string;
}): Promise<User> {
  const col = await getCollection();
  const existing = await col.findOne({ email: data.email });

  if (existing) {
    const hasCustomPicture = existing.picture?.startsWith("data:");
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (!hasCustomPicture) updates.picture = data.picture;

    if (data.yearId) {
      await col.updateOne(
        { email: data.email },
        { $set: updates, $addToSet: { years: data.yearId } },
      );
    } else {
      await col.updateOne({ email: data.email }, { $set: updates });
    }

    return toUser({
      ...existing,
      picture: hasCustomPicture ? existing.picture : data.picture,
    });
  }

  const now = new Date();
  const user: User = {
    id: crypto.randomUUID(),
    email: data.email,
    name: data.name,
    picture: data.picture,
    company: "",
    title: "",
    bio: "",
    linkedin: "",
    x: "",
    bluesky: "",
    facebook: "",
    instagram: "",
    youtube: "",
    github: "",
    medium: "",
    website: "",
    role: "team-member",
    years: data.yearId ? [data.yearId] : [],
    createdAt: now,
    updatedAt: now,
  };

  await col.insertOne(user);
  return user;
}

/** Add a year ID to a user's years array (when they are enrolled in a year). */
export async function addYearToUser(
  email: string,
  yearId: string,
): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { email: email.toLowerCase() },
    { $addToSet: { years: yearId }, $set: { updatedAt: new Date() } },
  );
}

/** Remove a year ID from a user's years array (when they are removed from a year). */
export async function removeYearFromUser(
  email: string,
  yearId: string,
): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { email: email.toLowerCase() },
    { $pull: { years: yearId }, $set: { updatedAt: new Date() } },
  );
}

/** Remove a year ID from ALL users when the year is deleted. Users themselves are kept. */
export async function removeYearFromAllUsers(yearId: string): Promise<void> {
  const col = await getCollection();
  await col.updateMany(
    { years: yearId },
    { $pull: { years: yearId }, $set: { updatedAt: new Date() } },
  );
}

/** Find multiple users by their email addresses (for member list enrichment). */
export async function findUsersByEmails(emails: string[]): Promise<User[]> {
  if (emails.length === 0) return [];
  const col = await getCollection();
  const docs = await col
    .find({ email: { $in: emails.map((e) => e.toLowerCase()) } })
    .toArray();
  return docs.map(toUser);
}

/**
 * Find an existing user by email or create a minimal profile for them.
 * Used when an admin wants to pre-populate a profile before the member signs in.
 */
export async function findOrCreateByEmail(email: string): Promise<User> {
  const col = await getCollection();
  const existing = await col.findOne({ email: email.toLowerCase() });
  if (existing) return toUser(existing);

  const now = new Date();
  const user: User = {
    id: crypto.randomUUID(),
    email: email.toLowerCase(),
    name: "",
    picture: "",
    company: "",
    title: "",
    bio: "",
    linkedin: "",
    x: "",
    bluesky: "",
    facebook: "",
    instagram: "",
    youtube: "",
    github: "",
    medium: "",
    website: "",
    role: "team-member",
    years: [],
    createdAt: now,
    updatedAt: now,
  };

  await col.insertOne(user);
  return user;
}

export async function updateUserById(
  id: string,
  fields: Partial<UpdatableUserFields>,
): Promise<void> {
  const col = await getCollection();
  await col.updateOne({ id }, { $set: { ...fields, updatedAt: new Date() } });
}
