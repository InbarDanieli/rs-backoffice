/**
 * Flat text/social field definitions for the sponsor form.
 * Complex fields (logo, carouselImages, techStack, positions, testimonials)
 * are handled as dedicated sections in SponsorEditClient.
 */

export interface SponsorFieldDef {
  name: string;
  label: string;
  placeholder?: string;
  half?: boolean; // two-column when true
}

export interface SponsorSectionDef {
  id: string;
  label?: string;
  disclaimer?: string;
  fields: SponsorFieldDef[];
}

export const SPONSOR_BASIC_FIELDS: SponsorFieldDef[] = [
  { name: "name", label: "Company Name" },
  { name: "website", label: "Company Website", placeholder: "https://..." },
];

export const SPONSOR_SOCIAL_FIELDS: SponsorFieldDef[] = [
  { name: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/...", half: true },
  { name: "twitter", label: "Twitter / X", placeholder: "https://x.com/...", half: true },
  { name: "bluesky", label: "Bluesky", placeholder: "https://bsky.app/profile/...", half: true },
  { name: "facebook", label: "Facebook", placeholder: "https://facebook.com/...", half: true },
  { name: "meetup", label: "Meetup", placeholder: "https://meetup.com/...", half: true },
  { name: "instagram", label: "Instagram", placeholder: "https://instagram.com/...", half: true },
  { name: "youtube", label: "YouTube", placeholder: "https://youtube.com/...", half: true },
  { name: "github", label: "GitHub", placeholder: "https://github.com/...", half: true },
  { name: "medium", label: "Medium", placeholder: "https://medium.com/...", half: true },
];

export const POSITION_FIELDS: SponsorFieldDef[] = [
  { name: "name", label: "Position Name", half: true },
  { name: "location", label: "Location", half: true },
  { name: "link", label: "Link to position", placeholder: "https://..." },
];

export const TESTIMONIAL_FIELDS: SponsorFieldDef[] = [
  { name: "authorName", label: "Author Name", half: true },
  { name: "title", label: "Title / Role", half: true },
  { name: "testimonial", label: "Testimonial" },
];
