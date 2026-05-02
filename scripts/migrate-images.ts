// One-time migration: upload base64 images embedded in MongoDB documents to
// GitHub on the assets branch and replace the DB values with the resulting
// raw.githubusercontent.com URLs.
//
// Run (Node 20.6+ — uses native --env-file, no dotenv dep):
//   node --env-file=.env --import tsx scripts/migrate-images.ts
//
// Required env: MONGODB_URI, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO,
// GITHUB_ASSETS_BRANCH.
//
// Idempotent: skips fields whose value is not a data URL.

import clientPromise from "../src/lib/db";
import { uploadImage, isDataUrl } from "../src/lib/github/images";
import type { Sponsor, SponsorTestimonial } from "../src/lib/sponsors";
import type { User } from "../src/lib/users";

async function migrateSponsors(): Promise<void> {
  const col = (await clientPromise).db().collection<Sponsor>("sponsors");
  const cursor = col.find({});

  for await (const doc of cursor) {
    const updates: Partial<Sponsor> = {};

    if (doc.logo && isDataUrl(doc.logo)) {
      updates.logo = await uploadImage({
        entity: "sponsors",
        entityId: doc.id,
        kind: "logo",
        dataUrl: doc.logo,
      });
    }

    if (
      Array.isArray(doc.carouselImages) &&
      doc.carouselImages.some(isDataUrl)
    ) {
      updates.carouselImages = await Promise.all(
        doc.carouselImages.map((value, i) =>
          isDataUrl(value)
            ? uploadImage({
                entity: "sponsors",
                entityId: doc.id,
                kind: "carousel",
                index: i,
                dataUrl: value,
              })
            : Promise.resolve(value),
        ),
      );
    }

    if (
      Array.isArray(doc.testimonials) &&
      doc.testimonials.some((t: SponsorTestimonial) => t.image && isDataUrl(t.image))
    ) {
      updates.testimonials = await Promise.all(
        doc.testimonials.map(async (t: SponsorTestimonial, i: number) => {
          if (t.image && isDataUrl(t.image)) {
            const url = await uploadImage({
              entity: "sponsors",
              entityId: doc.id,
              kind: "testimonial",
              index: i,
              dataUrl: t.image,
            });
            return { ...t, image: url };
          }
          return t;
        }),
      );
    }

    if (Object.keys(updates).length > 0) {
      await col.updateOne(
        { id: doc.id },
        { $set: { ...updates, updatedAt: new Date() } },
      );
      console.log(
        `Migrated sponsor ${doc.id} (${doc.name}): ${Object.keys(updates).join(", ")}`,
      );
    }
  }
}

async function migrateUsers(): Promise<void> {
  const col = (await clientPromise).db().collection<User>("users");
  const cursor = col.find({ picture: { $regex: "^data:" } });

  for await (const doc of cursor) {
    const url = await uploadImage({
      entity: "users",
      entityId: doc.id,
      kind: "avatar",
      dataUrl: doc.picture,
    });
    await col.updateOne(
      { id: doc.id },
      { $set: { picture: url, updatedAt: new Date() } },
    );
    console.log(`Migrated user ${doc.id} (${doc.email})`);
  }
}

(async () => {
  console.log("Starting image migration…");
  await migrateSponsors();
  await migrateUsers();
  console.log("Done.");
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
