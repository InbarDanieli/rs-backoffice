/**
 * Shared sponsor-profile validation rules.
 *
 * This module is intentionally free of any server-only or client-only
 * dependencies so the same rules run in both places:
 *   - the SponsorEditClient form (instant, friendly feedback), and
 *   - the PATCH API routes (a backstop that rejects incomplete saves).
 *
 * Keep the field keys in sync with the `invalidFields` lookup in
 * SponsorEditClient so the form can highlight the right inputs.
 */

export interface SponsorValidationInput {
  name?: string;
  website?: string;
  description?: string;
  logo?: string;
  carouselImages?: string[];
  techStack?: string[];
  positions?: { name?: string; location?: string; link?: string }[];
  testimonials?: { authorName?: string; testimonial?: string }[];
}

export interface SponsorValidationError {
  /** Field key used to highlight the matching input in the form. */
  field: string;
  /** Friendly, non-technical message shown to the user. */
  message: string;
}

export const MAX_CAROUSEL_IMAGES = 8;
export const MIN_POSITIONS = 2;
export const MAX_POSITIONS = 8;
export const MAX_TESTIMONIALS = 3;

/**
 * Returns the list of problems with a sponsor profile. An empty array means the
 * profile is complete and ready to save.
 */
export function validateSponsorFields(
  input: SponsorValidationInput,
): SponsorValidationError[] {
  const errors: SponsorValidationError[] = [];

  const name = input.name ?? "";
  const website = input.website ?? "";
  const description = input.description ?? "";
  const logo = input.logo ?? "";
  const carouselImages = input.carouselImages ?? [];
  const techStack = input.techStack ?? [];
  const positions = input.positions ?? [];
  const testimonials = input.testimonials ?? [];

  if (!name.trim()) {
    errors.push({ field: "name", message: "Please enter the Company Name." });
  }
  if (!website.trim()) {
    errors.push({
      field: "website",
      message: "Please enter the Company Website.",
    });
  }
  if (!description.trim()) {
    errors.push({
      field: "description",
      message: "Please enter a Company Description.",
    });
  }
  if (!logo) {
    errors.push({ field: "logo", message: "Please upload a Company Logo." });
  }

  if (carouselImages.length < 1) {
    errors.push({
      field: "carousel",
      message: "Please add at least one Carousel Image.",
    });
  } else if (carouselImages.length > MAX_CAROUSEL_IMAGES) {
    errors.push({
      field: "carousel",
      message: `Please add no more than ${MAX_CAROUSEL_IMAGES} Carousel Images.`,
    });
  }

  if (techStack.length < 1) {
    errors.push({
      field: "techStack",
      message: "Please add at least one technology to the Technology Stack.",
    });
  }

  if (positions.length < MIN_POSITIONS) {
    errors.push({
      field: "positions",
      message: `Please add at least ${MIN_POSITIONS} Open Positions.`,
    });
  } else if (positions.length > MAX_POSITIONS) {
    errors.push({
      field: "positions",
      message: `Please add no more than ${MAX_POSITIONS} Open Positions.`,
    });
  }
  positions.forEach((p, i) => {
    if (!(p.name ?? "").trim() || !(p.link ?? "").trim()) {
      errors.push({
        field: `position-${i}`,
        message: `Open Position ${i + 1}: please fill in the position name and link.`,
      });
    }
  });

  // Testimonials are optional, but a half-filled one must be completed or removed.
  if (testimonials.length > MAX_TESTIMONIALS) {
    errors.push({
      field: "testimonials",
      message: `Please add no more than ${MAX_TESTIMONIALS} Testimonials.`,
    });
  }
  testimonials.forEach((t, i) => {
    if (!(t.authorName ?? "").trim() || !(t.testimonial ?? "").trim()) {
      errors.push({
        field: `testimonial-${i}`,
        message: `Testimonial ${i + 1}: please add the author name and testimonial, or remove it.`,
      });
    }
  });

  return errors;
}

/**
 * True when a PATCH body is a full sponsor-profile submission (as sent by the
 * edit form) rather than a small partial update such as a tier change. Only
 * full submissions should be validated against the required-field rules.
 */
export function isFullSponsorProfilePayload(body: unknown): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    "name" in body &&
    "positions" in body
  );
}
