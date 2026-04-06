"use client";

import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { PublicLinkModal } from "@/components/ui/PublicLinkModal";
import { Select } from "@/components/ui/Select";
import { type Sponsor } from "@/lib/sponsors";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./sponsors.module.css";

interface SponsorsClientProps {
  yearId: string;
}

const TIER_OPTIONS = [
  { value: "game-changer", label: "Game Changer" },
  { value: "organizer", label: "Organizer" },
  { value: "community", label: "Community" },
];

function TrashIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function SponsorsClient({ yearId }: SponsorsClientProps) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publicLinkSponsor, setPublicLinkSponsor] = useState<Sponsor | null>(
    null,
  );
  const [savingRoleForId, setSavingRoleForId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/sponsors?yearId=${yearId}`)
      .then((r) => r.json())
      .then((data: Sponsor[]) => {
        setSponsors(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load sponsors.");
        setLoading(false);
      });
  }, [yearId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/sponsors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yearId, name: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to add sponsor");
      const created = (await res.json()) as Sponsor;
      setSponsors((prev) => [...prev, created]);
      setNewName("");
    } catch {
      setError("Failed to add sponsor.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/sponsors/${id}`, { method: "DELETE" });
      setSponsors((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setDeletingId(null);
      setPendingDeleteId(null);
    }
  }

  const pendingDeleteSponsor = sponsors.find((s) => s.id === pendingDeleteId);

  async function handleTierChange(sponsorId: string, newTier: Sponsor["tier"]) {
    setSavingRoleForId(sponsorId);
    try {
      const res = await fetch(`/api/sponsors/${sponsorId}`, {
        method: "PATCH",
        body: JSON.stringify({ tier: newTier }),
      });
      if (res.ok) {
        setSponsors((prev) =>
          prev.map((s) => (s.id === sponsorId ? { ...s, tier: newTier } : s)),
        );
      }
    } catch {
      setError("Failed to update sponsor tier.");
    } finally {
      setSavingRoleForId(null);
    }
  }
  return (
    <>
      <div className={styles.sponsorsCard}>
        <form className={styles.addForm} onSubmit={handleAdd}>
          <input
            type="text"
            className={styles.nameInput}
            placeholder="Company name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={adding}
          />
          <button
            type="submit"
            className={styles.addBtn}
            disabled={adding || !newName.trim()}
          >
            {adding ? "Adding…" : "Add sponsor"}
          </button>
        </form>

        {error && <p className={styles.errorMsg}>{error}</p>}

        {loading ? (
          <div className={styles.loadingState}>
            <span className={styles.spinner} aria-hidden="true" />
            Loading…
          </div>
        ) : sponsors.length === 0 ? (
          <p className={styles.emptyHint}>No sponsors yet. Add one above.</p>
        ) : (
          <ul className={styles.sponsorList}>
            {sponsors.map((sponsor) => (
              <li key={sponsor.id} className={styles.sponsorRow}>
                <div className={styles.sponsorAvatar} aria-hidden="true">
                  {sponsor.name.charAt(0)}
                </div>
                <span className={styles.sponsorName}>{sponsor.name}</span>
                <div className={styles.rowActions}>
                  <Select
                    width={150}
                    options={TIER_OPTIONS}
                    value={sponsor.tier ?? "game-changer"}
                    onChange={(newTier) =>
                      handleTierChange(sponsor.id, newTier as Sponsor["tier"])
                    }
                    disabled={savingRoleForId === sponsor.id}
                  />
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => setPublicLinkSponsor(sponsor)}
                    title="Manage public link"
                  >
                    <LinkIcon />
                    &nbsp;Public link
                  </button>
                  <Link
                    href={`/admin/sponsors/${sponsor.id}/edit`}
                    className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => setPendingDeleteId(sponsor.id)}
                    disabled={deletingId === sponsor.id}
                    aria-label={`Delete ${sponsor.name}`}
                    title="Delete sponsor"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && sponsors.length > 0 && (
          <p className={styles.hint}>
            {sponsors.length} sponsor{sponsors.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <ConfirmModal
        isOpen={!!pendingDeleteId}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (pendingDeleteId) handleDelete(pendingDeleteId);
        }}
        title="Delete sponsor?"
        description={`This will permanently delete "${pendingDeleteSponsor?.name ?? ""}". This action cannot be undone.`}
        shouldConfirm
        confirmText={pendingDeleteSponsor?.name}
        confirmLabel="Delete"
        loading={deletingId === pendingDeleteId}
        danger
      />

      {publicLinkSponsor && (
        <PublicLinkModal
          isOpen={!!publicLinkSponsor}
          sponsorId={publicLinkSponsor.id}
          sponsorName={publicLinkSponsor.name}
          existingToken={publicLinkSponsor.publicToken}
          existingExpiresAt={publicLinkSponsor.publicTokenExpiresAt}
          onClose={() => setPublicLinkSponsor(null)}
          onTokenChange={(token, expiresAt) => {
            setSponsors((prev) =>
              prev.map((s) =>
                s.id === publicLinkSponsor.id
                  ? {
                      ...s,
                      publicToken: token ?? undefined,
                      publicTokenExpiresAt: expiresAt ?? undefined,
                    }
                  : s,
              ),
            );
            setPublicLinkSponsor((prev) =>
              prev
                ? {
                    ...prev,
                    publicToken: token ?? undefined,
                    publicTokenExpiresAt: expiresAt ?? undefined,
                  }
                : null,
            );
          }}
        />
      )}
    </>
  );
}
