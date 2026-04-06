"use client";

import { useState } from "react";
import { FormField } from "./FormField";
import { Button } from "./Button";
import {
  USER_PROFILE_SECTIONS,
  DEFAULT_REQUIRED_FIELDS,
} from "@/lib/user-profile-fields";
import { type UserRole } from "@/lib/users";
import styles from "./InfoForm.module.css";

export interface InfoFormValues {
  name: string;
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
}

interface InfoFormProps {
  userId: string;
  defaultValues: InfoFormValues;
  picture?: string;
  /** Fields to validate as non-empty. Defaults to ["name", "title", "bio"]. Pass [] to skip all. */
  requiredFields?: string[];
  /** Whether a profile image is required. Defaults to true. */
  requireImage?: boolean;
  /** Show the role selector (admin-only). Defaults to false. */
  showRoleSelector?: boolean;
  defaultRole?: UserRole;
  submitLabel?: string;
  discardLabel?: string;
}

type SaveStatus = "idle" | "saving" | "success" | "error";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "team-member", label: "Team Member" },
  { value: "admin", label: "Admin" },
  { value: "sponsor-manager", label: "Sponsor Manager" },
];

export function InfoForm({
  userId,
  defaultValues,
  picture,
  requiredFields = [...DEFAULT_REQUIRED_FIELDS],
  requireImage = true,
  showRoleSelector = false,
  defaultRole = "team-member",
  submitLabel = "Update Info",
  discardLabel = "Discard",
}: InfoFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [selectedRole, setSelectedRole] = useState<UserRole>(defaultRole);
  const [activeDefaultValues, setActiveDefaultValues] =
    useState<InfoFormValues>(defaultValues);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);

    const newErrors: Record<string, string> = {};

    for (const fieldName of requiredFields) {
      if (!data.get(fieldName)?.toString().trim()) {
        const section = USER_PROFILE_SECTIONS.flatMap((s) => s.fields).find(
          (f) => f.name === fieldName,
        );
        newErrors[fieldName] =
          `Please fill in your ${section?.label.toLowerCase() ?? fieldName}`;
      }
    }

    if (requireImage && !picture) {
      newErrors.image = "Please set your profile image";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaveStatus("saving");

    try {
      const body: Record<string, unknown> = {};
      for (const section of USER_PROFILE_SECTIONS) {
        for (const field of section.fields) {
          body[field.name] = data.get(field.name) ?? "";
        }
      }
      if (picture) body.picture = picture;
      if (showRoleSelector) body.role = selectedRole;

      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      setActiveDefaultValues({ ...defaultValues, ...body });

      setSaveStatus(res.ok ? "success" : "error");
    } catch {
      setSaveStatus("error");
    }
  }

  function handleReset() {
    setErrors({});
    setSaveStatus("idle");
    setSelectedRole(defaultRole);
  }

  const errorMessages = Object.values(errors).filter(Boolean);

  return (
    <form className={styles.form} onSubmit={handleSubmit} onReset={handleReset}>
      {/* ── Role selector (admin-only) ── */}
      {showRoleSelector && (
        <div className={styles.roleSection}>
          <span className={styles.roleLabel}>Role</span>
          <div className={styles.roleOptions}>
            {ROLE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`${styles.roleOption} ${selectedRole === opt.value ? styles.roleOptionActive : ""}`}
              >
                <input
                  type="radio"
                  name="role"
                  value={opt.value}
                  checked={selectedRole === opt.value}
                  onChange={() => setSelectedRole(opt.value)}
                  className={styles.roleRadio}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── Field sections from config ── */}
      {USER_PROFILE_SECTIONS.map((section) => (
        <div key={section.id} className={styles.sectionInner}>
          {section.label && (
            <div className={styles.sectionDivider}>
              <span className={styles.sectionLabel}>{section.label}</span>
            </div>
          )}
          {section.disclaimer && (
            <p className={styles.sectionDisclaimer}>{section.disclaimer}</p>
          )}
          <div className={styles.formGrid}>
            {section.fields.map((field) => (
              <div
                key={field.name}
                className={field.half ? undefined : styles.fieldFull}
              >
                <FormField
                  label={field.label}
                  name={field.name}
                  type={field.type}
                  placeholder={field.placeholder}
                  rows={field.rows}
                  defaultValue={
                    activeDefaultValues[field.name as keyof InfoFormValues] ??
                    ""
                  }
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* ── Validation errors ── */}
      {errorMessages.length > 0 && (
        <div className={styles.errorBox} role="alert">
          <p className={styles.errorTitle}>
            Please fix the following before saving:
          </p>
          <ul className={styles.errorList}>
            {errorMessages.map((msg) => (
              <li key={msg} className={styles.errorItem}>
                {msg}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Actions ── */}
      <div className={styles.formActions}>
        <div className={styles.statusMessage}>
          {saveStatus === "success" && (
            <span className={styles.savedSuccess}>
              Info updated successfully.
            </span>
          )}
          {saveStatus === "error" && (
            <span className={styles.savedError}>
              Failed to save. Please try again.
            </span>
          )}
        </div>
        <div className={styles.actionButtons}>
          <Button variant="ghost" type="reset">
            {discardLabel}
          </Button>
          <Button
            variant="solid"
            type="submit"
            disabled={saveStatus === "saving"}
          >
            {saveStatus === "saving" ? "Saving…" : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
