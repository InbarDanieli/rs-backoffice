"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Popup } from "./Popup";
import styles from "./YearSelector.module.css";

export interface YearOption {
  id: string;
  name: string;
  isDefault: boolean;
}

interface YearSelectorProps {
  years: YearOption[];
  activeYearId: string | null;
}

interface DropdownPos {
  top: number;
  left: number;
  width: number;
}

interface ContextMenuPos {
  top: number;
  right: number;
}

export function YearSelector({
  years: yearsProp,
  activeYearId,
}: YearSelectorProps) {
  console.log({ activeYearId });

  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [years, setYears] = useState(yearsProp);
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<DropdownPos | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [setAsDefault, setSetAsDefault] = useState(true);
  const [creating, setCreating] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<ContextMenuPos | null>(
    null,
  );
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<YearOption | null>(null);
  const [deleting, setDeleting] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    setYears(yearsProp);
  }, [yearsProp]);

  const activeYear =
    years.find((y) => y.id === activeYearId) ?? years[0] ?? null;

  // Close on outside click — check trigger, dropdown, and portaled context menu
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target) &&
        !contextMenuRef.current?.contains(target)
      ) {
        setIsOpen(false);
        setShowCreate(false);
        setOpenMenuId(null);
        setContextMenuPos(null);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggleDropdown() {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
    setIsOpen((v) => !v);
    setShowCreate(false);
    setOpenMenuId(null);
    setContextMenuPos(null);
  }

  function selectYear(id: string) {
    document.cookie = `active_year_id=${id}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setIsOpen(false);
    setOpenMenuId(null);
    setContextMenuPos(null);
    router.refresh();
  }

  function toggleMenu(e: React.MouseEvent<HTMLButtonElement>, id: string) {
    e.stopPropagation();
    if (openMenuId === id) {
      setOpenMenuId(null);
      setContextMenuPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenuPos({
      top: rect.bottom + 2,
      right: window.innerWidth - rect.right,
    });
    setOpenMenuId(id);
  }

  async function handleSetDefault(e: React.MouseEvent, yearId: string) {
    e.stopPropagation();
    setSettingDefaultId(yearId);
    setOpenMenuId(null);
    setContextMenuPos(null);
    try {
      await fetch(`/api/years/${yearId}`, { method: "PATCH" });
      setYears((prev) =>
        prev.map((y) => ({ ...y, isDefault: y.id === yearId })),
      );
      router.refresh();
    } finally {
      setSettingDefaultId(null);
    }
  }

  function openDeleteModal(e: React.MouseEvent, year: YearOption) {
    e.stopPropagation();
    setOpenMenuId(null);
    setContextMenuPos(null);
    setIsOpen(false);
    setDeleteTarget(year);
  }

  function closeDeleteModal() {
    setDeleteTarget(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/years/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setYears((prev) => prev.filter((y) => y.id !== deleteTarget.id));
        if (deleteTarget.id === activeYearId) {
          document.cookie = "active_year_id=; path=/; max-age=0";
        }
        closeDeleteModal();
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), isDefault: setAsDefault }),
      });
      if (res.ok) {
        const year = (await res.json()) as YearOption;
        document.cookie = `active_year_id=${year.id}; path=/; max-age=${60 * 60 * 24 * 365}`;
        setYears((prev) => [
          ...(year.isDefault
            ? prev.map((y) => ({ ...y, isDefault: false }))
            : prev),
          year,
        ]);
        setNewName("");
        setSetAsDefault(true);
        setShowCreate(false);
        setIsOpen(false);
        router.refresh();
      }
    } finally {
      setCreating(false);
    }
  }

  const dropdown =
    isOpen && dropdownPos ? (
      <div
        ref={dropdownRef}
        className={styles.dropdown}
        role="listbox"
        style={{
          top: dropdownPos.top,
          left: dropdownPos.left,
          width: dropdownPos.width,
        }}
      >
        {years.length === 0 && (
          <p className={styles.emptyHint}>No years yet. Create one below.</p>
        )}

        {years.map((year) => (
          <div key={year.id} className={styles.optionRow}>
            <button
              type="button"
              role="option"
              aria-selected={year.id === activeYear?.id}
              className={`${styles.optionBtn} ${year.id === activeYear?.id ? styles.optionActive : ""}`}
              onClick={() => selectYear(year.id)}
            >
              <span className={styles.optionName}>{year.name}</span>
              <span className={styles.optionMeta}>
                {year.isDefault && (
                  <span className={styles.defaultBadge}>default</span>
                )}
                {year.id === activeYear?.id && <CheckIcon />}
              </span>
            </button>

            <div className={styles.menuWrap}>
              <button
                type="button"
                className={`${styles.menuBtn} ${openMenuId === year.id ? styles.menuBtnOpen : ""}`}
                onClick={(e) => toggleMenu(e, year.id)}
                aria-label={`Options for ${year.name}`}
                disabled={settingDefaultId === year.id}
              >
                <DotsIcon />
              </button>
            </div>
          </div>
        ))}

        <div className={styles.divider} />

        {!showCreate ? (
          <button
            type="button"
            className={styles.createTrigger}
            onClick={() => setShowCreate(true)}
          >
            <PlusIcon />
            New year
          </button>
        ) : (
          <form className={styles.createForm} onSubmit={handleCreate}>
            <input
              type="text"
              className={styles.createInput}
              placeholder="Year name…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <label className={styles.createCheckbox}>
              <input
                type="checkbox"
                checked={setAsDefault}
                onChange={(e) => setSetAsDefault(e.target.checked)}
              />
              Set as default
            </label>
            <div className={styles.createActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => {
                  setShowCreate(false);
                  setNewName("");
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={!newName.trim() || creating}
              >
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        )}
      </div>
    ) : null;

  const contextMenu =
    openMenuId && contextMenuPos ? (
      <div
        ref={contextMenuRef}
        className={styles.contextMenu}
        style={{ top: contextMenuPos.top, right: contextMenuPos.right }}
      >
        {(() => {
          const year = years.find((y) => y.id === openMenuId);
          if (!year) return null;
          return (
            <>
              <button
                type="button"
                className={styles.contextItem}
                onClick={(e) => handleSetDefault(e, year.id)}
                disabled={year.isDefault}
              >
                <StarIcon />
                {year.isDefault ? "Already default" : "Set as default"}
              </button>
              {!year.isDefault && (
                <>
                  <div className={styles.contextDivider} />
                  <button
                    type="button"
                    className={`${styles.contextItem} ${styles.contextItemDanger}`}
                    onClick={(e) => openDeleteModal(e, year)}
                  >
                    <TrashIcon />
                    Delete
                  </button>
                </>
              )}
            </>
          );
        })()}
      </div>
    ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <CalendarIcon />
        <span className={styles.triggerLabel}>
          {activeYear ? activeYear.name : "Select year"}
        </span>
        <ChevronIcon open={isOpen} />
      </button>

      {mounted && createPortal(dropdown, document.body)}
      {mounted && createPortal(contextMenu, document.body)}

      <Popup
        key={deleteTarget?.id ?? "none"}
        isOpen={!!deleteTarget}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This will permanently delete the year and remove it from all team members' records. The members themselves won't be deleted."
        shouldConfirm
        confirmText={deleteTarget?.name}
        confirmLabel="Delete"
        loading={deleting}
        icon={<TrashIcon size={20} />}
        danger
      />
    </>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────

function CalendarIcon() {
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
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.15s",
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="13"
      height="13"
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

function DotsIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

function StarIcon() {
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
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function TrashIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
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
