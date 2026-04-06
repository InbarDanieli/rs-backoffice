import "server-only";
import type { Collection, WithId } from "mongodb";
import clientPromise from "./db";

export interface SponsorPosition {
  name: string;
  location: string;
  link: string;
}

export interface SponsorTestimonial {
  image: string; // base64 square image
  testimonial: string;
  authorName: string;
  title: string;
}

export type SponsorTier = "game-changer" | "organizer" | "community";

export interface Sponsor {
  id: string;
  yearId: string;
  name: string; // company name
  website: string;
  description: string; // free text, up to 3 paragraphs
  logo: string; // base64 PNG with transparency
  carouselImages: string[]; // up to 8, base64 16:9
  linkedin: string;
  bluesky: string;
  facebook: string;
  twitter: string;
  meetup: string;
  instagram: string;
  youtube: string;
  github: string;
  medium: string;
  techStack: string[]; // buzzword tags
  positions: SponsorPosition[]; // 2–8 items
  testimonials: SponsorTestimonial[]; // up to 3
  publicToken?: string;
  publicTokenExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  tier: SponsorTier;
}

export type UpdatableSponsorFields = Omit<
  Sponsor,
  | "id"
  | "yearId"
  | "publicToken"
  | "publicTokenExpiresAt"
  | "createdAt"
  | "updatedAt"
>;

async function getCollection(): Promise<Collection<Sponsor>> {
  const client = await clientPromise;
  return client.db().collection<Sponsor>("sponsors");
}

function toSponsor(doc: WithId<Sponsor>): Sponsor {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, ...sponsor } = doc;
  return sponsor as Sponsor;
}

export async function listSponsorsByYear(yearId: string): Promise<Sponsor[]> {
  const col = await getCollection();
  const docs = await col.find({ yearId }).sort({ name: 1 }).toArray();
  return docs.map(toSponsor);
}

export async function findSponsorById(id: string): Promise<Sponsor | null> {
  const col = await getCollection();
  const doc = await col.findOne({ id });
  return doc ? toSponsor(doc) : null;
}

export async function findSponsorByToken(
  token: string,
): Promise<Sponsor | null> {
  const col = await getCollection();
  const doc = await col.findOne({ publicToken: token });
  return doc ? toSponsor(doc) : null;
}

export async function createSponsor(
  yearId: string,
  name: string,
): Promise<Sponsor> {
  const col = await getCollection();
  const now = new Date();
  const sponsor: Sponsor = {
    id: crypto.randomUUID(),
    yearId,
    name,
    website: "",
    description: "",
    logo: "",
    carouselImages: [],
    linkedin: "",
    bluesky: "",
    facebook: "",
    twitter: "",
    meetup: "",
    instagram: "",
    youtube: "",
    github: "",
    medium: "",
    techStack: [],
    positions: [],
    testimonials: [],
    createdAt: now,
    updatedAt: now,
    tier: "game-changer",
  };
  await col.insertOne(sponsor);
  return sponsor;
}

export async function updateSponsor(
  id: string,
  fields: Partial<UpdatableSponsorFields>,
): Promise<void> {
  const col = await getCollection();
  await col.updateOne({ id }, { $set: { ...fields, updatedAt: new Date() } });
}

export async function deleteSponsor(id: string): Promise<void> {
  const col = await getCollection();
  await col.deleteOne({ id });
}

export async function setSponsorPublicToken(
  id: string,
  token: string | null,
  expiresAt: Date | null,
): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { id },
    {
      $set: {
        publicToken: token ?? undefined,
        publicTokenExpiresAt: expiresAt ?? undefined,
        updatedAt: new Date(),
      },
    },
  );
}
