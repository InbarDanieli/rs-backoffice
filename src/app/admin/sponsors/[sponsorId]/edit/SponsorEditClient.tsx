"use client";

import { TagInput } from "@/components/ui/TagInput";
import {
  POSITION_FIELDS,
  SPONSOR_BASIC_FIELDS,
  SPONSOR_SOCIAL_FIELDS,
} from "@/lib/sponsor-fields";
import type {
  Sponsor,
  SponsorPosition,
  SponsorTestimonial,
} from "@/lib/sponsors";
import Image from "next/image";
import { useRef, useState } from "react";
import styles from "./edit.module.css";
import { Popup } from "@/components/ui/Popup";

interface SponsorEditClientProps {
  sponsor: Sponsor;
  isPublic?: boolean;
  saveEndpoint: string; // e.g. /api/sponsors/[id] or /api/public/[token]
}

function resizeImage(
  file: File,
  maxW: number,
  maxH: number,
  quality = 0.9,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/webp", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Load failed"));
    };
    img.src = url;
  });
}

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function newPosition(): SponsorPosition {
  return { name: "", location: "", link: "" };
}
function newTestimonial(): SponsorTestimonial {
  return { image: "", testimonial: "", authorName: "", title: "" };
}

export function SponsorEditClient({
  sponsor,
  isPublic = false,
  saveEndpoint,
}: SponsorEditClientProps) {
  // ── Form state ──────────────────────────────────────────────────────────────

  const [activeDefaultValues, setActiveDefaultValues] = useState<Sponsor>({
    ...sponsor,
  });

  const updateField = <K extends keyof Sponsor>(
    field: K,
    value: Sponsor[K],
  ) => {
    setActiveDefaultValues((prev) => ({ ...prev, [field]: value }));
  };
  const carouselImages = activeDefaultValues.carouselImages ?? [];
  const testimonials = activeDefaultValues.testimonials ?? [];
  const positions = activeDefaultValues.positions ?? [];

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const carouselInputRef = useRef<HTMLInputElement>(null);
  const testimonialInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const techStack = activeDefaultValues.techStack ?? [];

  // ── Logo ────────────────────────────────────────────────────────────────────
  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file, 512, 512, 0.9);
      updateField("logo", dataUrl);
    } catch {
      /* ignore */
    }
    e.target.value = "";
  }

  // ── Carousel ────────────────────────────────────────────────────────────────
  async function handleCarouselAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const results = await Promise.all(
      files
        .slice(0, 8 - (carouselImages.length ?? 0))
        .map((f) => resizeImage(f, 1280, 720, 0.88)),
    );
    updateField("carouselImages", [...carouselImages, ...results]);
    e.target.value = "";
  }

  function removeCarouselImage(idx: number) {
    updateField(
      "carouselImages",
      carouselImages?.filter((_, i) => i !== idx) ?? [],
    );
  }

  // ── Testimonial image ────────────────────────────────────────────────────────
  async function handleTestimonialImage(
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file, 256, 256, 0.9);
      updateField(
        "testimonials",
        testimonials.map((t, i) => (i === idx ? { ...t, image: dataUrl } : t)),
      );
    } catch {
      /* ignore */
    }
    e.target.value = "";
  }

  // ── Positions ────────────────────────────────────────────────────────────────
  function updatePosition(
    idx: number,
    field: keyof SponsorPosition,
    value: string,
  ) {
    updateField(
      "positions",
      positions.map((p, i) => (i === idx ? { ...p, [field]: value } : p)),
    );
  }

  function addPosition() {
    if (positions.length < 8)
      updateField("positions", [...positions, newPosition()]);
  }

  function removePosition(idx: number) {
    updateField(
      "positions",
      positions.filter((_, i) => i !== idx),
    );
  }

  // ── Testimonials ─────────────────────────────────────────────────────────────
  function updateTestimonial(
    idx: number,
    field: keyof SponsorTestimonial,
    value: string,
  ) {
    updateField(
      "testimonials",
      testimonials.map((t, i) => (i === idx ? { ...t, [field]: value } : t)),
    );
  }

  function addTestimonial() {
    if (testimonials.length < 3)
      updateField("testimonials", [...testimonials, newTestimonial()]);
  }

  function removeTestimonial(idx: number) {
    updateField(
      "testimonials",
      testimonials.filter((_, i) => i !== idx),
    );
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(saveEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...activeDefaultValues,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ?? `Error ${res.status}`,
        );
      }
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save changes. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    setActiveDefaultValues({ ...sponsor });
    setIsOpen(false);
  }

  return (
    <div className={styles.formCard}>
      {/* ── Top-of-form status banner ── */}
      {error && (
        <div className={styles.bannerError} role="alert">
          {error}
        </div>
      )}
      {saved && !error && (
        <div className={styles.bannerSuccess} role="status">
          Changes saved!{isPublic ? "" : " Redirecting…"}
        </div>
      )}

      {/* ── Company basics ── */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Company Info</p>
        <div className={styles.fieldGrid}>
          {SPONSOR_BASIC_FIELDS.map((f) => (
            <div
              key={f.name}
              className={`${styles.field} ${f.half ? "" : styles.fieldFull}`}
            >
              <label className={styles.label}>{f.label}</label>
              <input
                type="text"
                className={styles.input}
                placeholder={f.placeholder}
                value={
                  f.name === "name"
                    ? activeDefaultValues.name
                    : activeDefaultValues.website
                }
                onChange={(e) => {
                  if (f.name === "name") updateField("name", e.target.value);
                  else updateField("website", e.target.value);
                }}
              />
            </div>
          ))}
          <div className={`${styles.field} ${styles.fieldFull}`}>
            <label className={styles.label}>Company Description</label>
            <textarea
              className={styles.textarea}
              placeholder="Up to 3 paragraphs describing the company…"
              value={activeDefaultValues.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={5}
            />
          </div>
        </div>
      </div>

      {/* ── Logo ── */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Company Logo</p>
        <div className={styles.logoSection}>
          <button
            type="button"
            className={styles.logoPreviewWrap}
            onClick={() => logoInputRef.current?.click()}
            aria-label="Change company logo"
          >
            {activeDefaultValues.logo ? (
              <Image
                src={activeDefaultValues.logo}
                alt={`${activeDefaultValues.name} logo`}
                width={80}
                height={80}
                className={styles.logoImage}
                unoptimized
              />
            ) : (
              <span className={styles.logoPlaceholder}>
                {activeDefaultValues.name.charAt(0).toUpperCase() || "?"}
              </span>
            )}
            <span className={styles.logoOverlay} aria-hidden="true">
              <CameraIcon />
            </span>
          </button>
          <div className={styles.logoInfo}>
            <p className={styles.logoHint}>
              PNG with transparency recommended. Will be displayed against light
              and dark backgrounds.
            </p>
            <button
              type="button"
              className={styles.uploadBtn}
              onClick={() => logoInputRef.current?.click()}
            >
              Upload logo
            </button>
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/*"
            style={{ display: "none" }}
            onChange={handleLogoChange}
          />
        </div>
      </div>

      {/* ── Carousel ── */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Carousel Images</p>
        <div className={styles.carouselGrid}>
          {carouselImages.map((src, idx) => (
            <div key={idx} className={styles.carouselThumb}>
              <Image
                src={src}
                alt={`Carousel ${idx + 1}`}
                width={200}
                height={113}
                unoptimized
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <button
                type="button"
                className={styles.carouselRemoveBtn}
                onClick={() => removeCarouselImage(idx)}
                aria-label={`Remove carousel image ${idx + 1}`}
              >
                ×
              </button>
            </div>
          ))}
          {carouselImages.length < 8 && (
            <button
              type="button"
              className={styles.carouselAddSlot}
              onClick={() => carouselInputRef.current?.click()}
              aria-label="Add carousel image"
            >
              <PlusIcon />
            </button>
          )}
        </div>
        <p className={styles.carouselHint}>
          Up to 8 images, recommended 16:9 ratio.
        </p>
        <input
          ref={carouselInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={handleCarouselAdd}
        />
      </div>

      {/* ── Socials ── */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Social Links</p>
        <div className={styles.fieldGrid}>
          {SPONSOR_SOCIAL_FIELDS.map((f) => (
            <div
              key={f.name}
              className={`${styles.field} ${f.half ? "" : styles.fieldFull}`}
            >
              <label className={styles.label}>{f.label}</label>
              <input
                type="url"
                className={styles.input}
                placeholder={f.placeholder}
                value={
                  (activeDefaultValues[f.name as keyof Sponsor] as string) ?? ""
                }
                onChange={(e) =>
                  updateField(f.name as keyof Sponsor, e.target.value)
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Tech Stack ── */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Technology Stack</p>
        <TagInput
          value={techStack}
          onChange={(tags) => {
            updateField("techStack", tags);
          }}
          placeholder="Type a technology and press Enter or comma…"
        />
      </div>

      {/* ── Open Positions ── */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Open Positions (2–8)</p>
        {positions.map((pos, idx) => (
          <div key={idx} className={styles.listItem}>
            <div className={styles.listItemHeader}>
              <span className={styles.listItemNum}>Position {idx + 1}</span>
              {positions.length > 1 && (
                <button
                  type="button"
                  className={styles.removeItemBtn}
                  onClick={() => removePosition(idx)}
                >
                  Remove
                </button>
              )}
            </div>
            <div className={styles.fieldGrid}>
              {POSITION_FIELDS.map((f) => (
                <div
                  key={f.name}
                  className={`${styles.field} ${f.half ? "" : styles.fieldFull}`}
                >
                  <label className={styles.label}>{f.label}</label>
                  <input
                    type={f.name === "link" ? "url" : "text"}
                    className={styles.input}
                    placeholder={f.placeholder}
                    value={pos[f.name as keyof SponsorPosition]}
                    onChange={(e) =>
                      updatePosition(
                        idx,
                        f.name as keyof SponsorPosition,
                        e.target.value,
                      )
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
        <button
          type="button"
          className={styles.addItemBtn}
          onClick={addPosition}
          disabled={positions.length >= 8}
        >
          <PlusIcon /> Add position
        </button>
      </div>

      {/* ── Testimonials ── */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Testimonials (up to 3)</p>
        {testimonials.map((t, idx) => (
          <div key={idx} className={styles.listItem}>
            <div className={styles.listItemHeader}>
              <span className={styles.listItemNum}>Testimonial {idx + 1}</span>
              <button
                type="button"
                className={styles.removeItemBtn}
                onClick={() => removeTestimonial(idx)}
              >
                Remove
              </button>
            </div>
            <div className={styles.testimonialAvatar}>
              <button
                type="button"
                className={styles.testimonialAvatarPreview}
                onClick={() => testimonialInputRefs.current[idx]?.click()}
                aria-label="Change testimonial photo"
              >
                {t.image ? (
                  <Image
                    src={t.image}
                    alt={t.authorName || "Author"}
                    width={64}
                    height={64}
                    unoptimized
                    className={styles.testimonialAvatarImage}
                  />
                ) : (
                  <span className={styles.logoPlaceholder}>
                    {t.authorName.charAt(0).toUpperCase() || "?"}
                  </span>
                )}
                <span className={styles.logoOverlay} aria-hidden="true">
                  <CameraIcon />
                </span>
              </button>
              <div
                className={`${styles.fieldGrid} ${styles.testimonialFields}`}
              >
                <div className={styles.field}>
                  <label className={styles.label}>Author Name</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={t.authorName}
                    onChange={(e) =>
                      updateTestimonial(idx, "authorName", e.target.value)
                    }
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Title / Role</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={t.title}
                    onChange={(e) =>
                      updateTestimonial(idx, "title", e.target.value)
                    }
                  />
                </div>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label className={styles.label}>Testimonial</label>
                  <textarea
                    className={styles.textarea}
                    value={t.testimonial}
                    onChange={(e) =>
                      updateTestimonial(idx, "testimonial", e.target.value)
                    }
                    rows={3}
                  />
                </div>
              </div>
              <input
                ref={(el) => {
                  testimonialInputRefs.current[idx] = el;
                }}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handleTestimonialImage(idx, e)}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          className={styles.addItemBtn}
          onClick={addTestimonial}
          disabled={testimonials.length >= 3}
        >
          <PlusIcon /> Add testimonial
        </button>
      </div>

      {/* ── Actions ── */}
      <div className={styles.formActions}>
        <button
          type="button"
          className={styles.discardBtn}
          onClick={() => setIsOpen(true)}
          disabled={saving}
        >
          Discard
        </button>
        <button
          type="button"
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving || saved}
        >
          {saving ? "Saving…" : saved ? "Saved!" : "Save"}
        </button>
      </div>

      <Popup
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handleDiscard}
        title="Discard changes"
        description="All unsaved changes will be lost. Are you sure you want to discard your changes?"
        confirmText="Discard"
        confirmLabel="Discard"
        cancelLabel="Cancel"
      />
    </div>
  );
}
