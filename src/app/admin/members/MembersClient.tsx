"use client";

import type { MemberEntry } from "@/app/api/years/[id]/members/route";
import { Select } from "@/components/ui/Select";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./members.module.css";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface MembersClientProps {
  yearId: string;
  currentUserId: string;
}

function sortMembers(members: MemberEntry[], currentUserId: string): MemberEntry[] {
  return [...members].sort((a, b) => {
    if (a.userId === currentUserId) return -1;
    if (b.userId === currentUserId) return 1;
    return a.email.localeCompare(b.email);
  });
}

const ROLE_OPTIONS = [
  { value: "team-member", label: "Team Member" },
  { value: "admin", label: "Admin" },
  { value: "sponsor-manager", label: "Sponsor Manager" },
];

export function MembersClient({ yearId, currentUserId }: MembersClientProps) {
  const [members, setMembers] = useState<MemberEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);
  const [pendingRemoveEmail, setPendingRemoveEmail] = useState<string | null>(null);
  const [savingRoleForId, setSavingRoleForId] = useState<string | null>(null);
  const [creatingProfileForEmail, setCreatingProfileForEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleRoleChange(userId: string, newRole: string) {
    setSavingRoleForId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) => (m.userId === userId ? { ...m, role: newRole } : m)),
        );
      }
    } finally {
      setSavingRoleForId(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMembers([]);
    setError(null);

    fetch(`/api/years/${yearId}/members`)
      .then((res) => res.json())
      .then((data: MemberEntry[]) => {
        if (!cancelled) setMembers(sortMembers(data, currentUserId));
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load members.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [yearId, currentUserId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) return;

    setAdding(true);
    setError(null);

    try {
      const res = await fetch(`/api/years/${yearId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      if (res.ok) {
        const entry = (await res.json()) as MemberEntry;
        if (!members.some((m) => m.email === trimmed)) {
          setMembers((prev) =>
            sortMembers([...prev, entry], currentUserId),
          );
        }
        setNewEmail("");
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Failed to add member.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(email: string) {
    setRemovingEmail(email);
    setError(null);

    try {
      const res = await fetch(`/api/years/${yearId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.email !== email));
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Failed to remove member.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setRemovingEmail(null);
    }
  }

  async function handleCreateAndEdit(email: string) {
    setCreatingProfileForEmail(email);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        const { userId } = (await res.json()) as { userId: string };
        setMembers((prev) =>
          prev.map((m) => (m.email === email ? { ...m, userId } : m)),
        );
        router.push(`/admin/members/${userId}/edit`);
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Failed to create profile.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCreatingProfileForEmail(null);
    }
  }

  const isDuplicate =
    !!newEmail.trim() &&
    members.some((m) => m.email === newEmail.trim().toLowerCase());

  if (loading) {
    return (
      <div className={styles.membersCard}>
        <div className={styles.loadingState}>
          <span className={styles.spinner} aria-hidden="true" />
          Loading members…
        </div>
      </div>
    );
  }

  return (
    <div className={styles.membersCard}>
      {/* Add member form */}
      <div className={styles.addFormWrap}>
        <form className={styles.addForm} onSubmit={handleAdd}>
          <input
            type="email"
            className={`${styles.emailInput} ${isDuplicate ? styles.emailInputDuplicate : ""}`}
            placeholder="member@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <button
            type="submit"
            className={styles.addBtn}
            disabled={adding || !newEmail.trim() || isDuplicate}
          >
            {adding ? "Adding…" : "Add Member"}
          </button>
        </form>
        {isDuplicate && (
          <p className={styles.duplicateMsg} role="alert">
            This email is already a member of this year.
          </p>
        )}
      </div>

      {error && (
        <p className={styles.errorMsg} role="alert">
          {error}
        </p>
      )}

      {/* Member list */}
      {members.length === 0 ? (
        <p className={styles.emptyHint}>
          No members yet. Add an email above to grant access.
        </p>
      ) : (
        <ul className={styles.memberList}>
          {members.map((member) => {
            const isSelf = member.userId === currentUserId;
            return (
              <li key={member.email} className={styles.memberRow}>
                <MemberAvatar member={member} />

                <div className={styles.memberInfo}>
                  <span className={styles.memberName}>
                    {member.name || member.email}
                    {isSelf && <span className={styles.youBadge}>You</span>}
                  </span>
                  {member.name && (
                    <span className={styles.memberEmailSub}>{member.email}</span>
                  )}
                </div>

                {member.userId && !isSelf ? (
                  <Select
                    width={150}
                    options={ROLE_OPTIONS}
                    value={member.role ?? "team-member"}
                    onChange={(newRole) =>
                      handleRoleChange(member.userId!, newRole)
                    }
                    disabled={savingRoleForId === member.userId}
                  />
                ) : (
                  <span className={styles.rolePlaceholder}>
                    {!member.userId ? "—" : ""}
                  </span>
                )}

                <div className={styles.memberActions}>
                  {isSelf ? null : member.userId ? (
                    <>
                      <Link
                        href={`/admin/members/${member.userId}/view`}
                        className={styles.actionBtn}
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/members/${member.userId}/edit`}
                        className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                      >
                        Edit
                      </Link>
                    </>
                  ) : (
                    <>
                      <span className={styles.notSignedIn}>Not signed in yet</span>
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                        onClick={() => handleCreateAndEdit(member.email)}
                        disabled={creatingProfileForEmail === member.email}
                      >
                        {creatingProfileForEmail === member.email ? "Setting up…" : "Edit"}
                      </button>
                    </>
                  )}
                  {!isSelf && (
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => setPendingRemoveEmail(member.email)}
                      disabled={removingEmail === member.email}
                      aria-label={`Remove ${member.email}`}
                    >
                      {removingEmail === member.email ? "…" : <TrashIcon />}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className={styles.hint}>
        {members.length} member{members.length !== 1 ? "s" : ""}
      </p>

      <ConfirmModal
        isOpen={!!pendingRemoveEmail}
        onClose={() => setPendingRemoveEmail(null)}
        onConfirm={() => {
          if (pendingRemoveEmail) handleRemove(pendingRemoveEmail);
          setPendingRemoveEmail(null);
        }}
        title="Remove member?"
        description={`${pendingRemoveEmail} will lose access to the backoffice for this year. Their profile data won't be deleted.`}
        confirmLabel="Remove"
        loading={removingEmail === pendingRemoveEmail}
        danger
      />
    </div>
  );
}

function MemberAvatar({ member }: { member: MemberEntry }) {
  if (member.picture && member.picture.length > 0) {
    return (
      <div className={styles.memberAvatarImg}>
        <Image
          src={member.picture}
          alt={member.name ?? member.email}
          width={32}
          height={32}
          className={styles.avatarImage}
          unoptimized={!member.picture.startsWith("http")}
        />
      </div>
    );
  }
  return (
    <span className={styles.memberAvatar} aria-hidden="true">
      {member.email[0].toUpperCase()}
    </span>
  );
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
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
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
