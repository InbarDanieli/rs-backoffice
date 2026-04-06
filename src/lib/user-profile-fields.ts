export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "textarea";
  placeholder?: string;
  rows?: number;
  /**
   * When true the field occupies half the row (paired with the next field).
   * Defaults to false — full width.
   */
  half?: boolean;
}

export interface SectionDef {
  id: string;
  label?: string;
  disclaimer?: string;
  fields: FieldDef[];
}

export const USER_PROFILE_SECTIONS: SectionDef[] = [
  {
    id: "basic",
    fields: [
      { name: "name", label: "Name", half: true },
      { name: "company", label: "Company", half: true },
    ],
  },
  {
    id: "title",
    fields: [
      { name: "title", label: "Title" },
    ],
  },
  {
    id: "bio",
    fields: [
      { name: "bio", label: "Bio", type: "textarea", rows: 4 },
    ],
  },
  {
    id: "social",
    label: "Social Links",
    disclaimer: "All social links are optional.",
    fields: [
      { name: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/...", half: true },
      { name: "x", label: "X (Twitter)", placeholder: "https://x.com/...", half: true },
      { name: "bluesky", label: "Bluesky", placeholder: "https://bsky.app/profile/...", half: true },
      { name: "facebook", label: "Facebook", placeholder: "https://facebook.com/...", half: true },
      { name: "instagram", label: "Instagram", placeholder: "https://instagram.com/...", half: true },
      { name: "youtube", label: "YouTube", placeholder: "https://youtube.com/...", half: true },
      { name: "github", label: "GitHub", placeholder: "https://github.com/...", half: true },
      { name: "medium", label: "Medium", placeholder: "https://medium.com/...", half: true },
      { name: "website", label: "Website", placeholder: "https://..." },
    ],
  },
];

/** Fields from USER_PROFILE_SECTIONS that are required by default on "My Profile". */
export const DEFAULT_REQUIRED_FIELDS = ["name","title", "bio"] as const;
