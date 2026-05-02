import "server-only";
import type { Collection, WithId } from "mongodb";
import clientPromise from "./db";
import {
  uploadImage,
  deleteImage,
  isDataUrl,
  isOwnedRawUrl,
} from "./github/images";

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
  const existing = await findSponsorById(id);
  if (!existing) return;

  const next: Partial<UpdatableSponsorFields> = { ...fields };
  const toDelete: string[] = [];

  if (fields.logo !== undefined) {
    if (isDataUrl(fields.logo)) {
      next.logo = await uploadImage({
        entity: "sponsors",
        entityId: id,
        kind: "logo",
        dataUrl: fields.logo,
      });
      if (existing.logo && isOwnedRawUrl(existing.logo)) {
        toDelete.push(existing.logo);
      }
    } else if (
      existing.logo &&
      isOwnedRawUrl(existing.logo) &&
      existing.logo !== fields.logo
    ) {
      toDelete.push(existing.logo);
    }
  }

  if (fields.carouselImages !== undefined) {
    const newImages = await Promise.all(
      fields.carouselImages.map((value, i) =>
        isDataUrl(value)
          ? uploadImage({
              entity: "sponsors",
              entityId: id,
              kind: "carousel",
              index: i,
              dataUrl: value,
            })
          : Promise.resolve(value),
      ),
    );
    next.carouselImages = newImages;

    const newOwned = new Set(newImages.filter(isOwnedRawUrl));
    for (const old of existing.carouselImages) {
      if (isOwnedRawUrl(old) && !newOwned.has(old)) toDelete.push(old);
    }
  }

  if (fields.testimonials !== undefined) {
    const newTestimonials = await Promise.all(
      fields.testimonials.map(async (t, i) => {
        if (t.image && isDataUrl(t.image)) {
          const url = await uploadImage({
            entity: "sponsors",
            entityId: id,
            kind: "testimonial",
            index: i,
            dataUrl: t.image,
          });
          return { ...t, image: url };
        }
        return t;
      }),
    );
    next.testimonials = newTestimonials;

    const newOwned = new Set(
      newTestimonials.map((t) => t.image).filter(isOwnedRawUrl),
    );
    for (const old of existing.testimonials) {
      if (old.image && isOwnedRawUrl(old.image) && !newOwned.has(old.image)) {
        toDelete.push(old.image);
      }
    }
  }

  const col = await getCollection();
  await col.updateOne({ id }, { $set: { ...next, updatedAt: new Date() } });

  if (toDelete.length > 0) {
    const results = await Promise.allSettled(toDelete.map(deleteImage));
    for (const r of results) {
      if (r.status === "rejected") {
        console.error("Failed to delete orphaned GitHub image:", r.reason);
      }
    }
  }
}

export async function deleteSponsor(id: string): Promise<void> {
  const existing = await findSponsorById(id);
  if (!existing) return;

  const urls = [
    existing.logo,
    ...existing.carouselImages,
    ...existing.testimonials.map((t) => t.image),
  ].filter((u): u is string => !!u && isOwnedRawUrl(u));

  for (const url of urls) {
    await deleteImage(url);
  }

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
