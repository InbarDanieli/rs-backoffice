"use client";

import type { MemberEntry } from "@/app/api/years/[id]/members/route";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./members.module.css";

interface ReorderMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: MemberEntry[];
  currentUserId: string;
  onSave: (orderedEmails: string[]) => Promise<void>;
}

export function ReorderMembersModal({
  isOpen,
  onClose,
  members,
  currentUserId,
  onSave,
}: ReorderMembersModalProps) {
  const [mounted, setMounted] = useState(() => typeof window !== "undefined");
  const [orderedEmails, setOrderedEmails] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setOrderedEmails(members.map((m) => m.email));
    }
  }, [isOpen, members]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  if (!mounted || !isOpen) return null;

  const memberByEmail = new Map(members.map((m) => [m.email, m]));
  const initialOrder = members.map((m) => m.email);
  const isDirty =
    orderedEmails.length !== initialOrder.length ||
    orderedEmails.some((e, i) => e !== initialOrder[i]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrderedEmails((prev) => {
      const oldIndex = prev.indexOf(String(active.id));
      const newIndex = prev.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(orderedEmails);
    } finally {
      setSaving(false);
    }
  }

  const modal = (
    <div
      className={styles.reorderOverlay}
      onClick={saving ? undefined : onClose}
    >
      <div
        className={styles.reorderModal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Reorder team members"
      >
        <div className={styles.reorderHeader}>
          <h2 className={styles.reorderTitle}>Reorder team members</h2>
          <p className={styles.reorderSubtitle}>
            Drag to change the order. On touch devices, long-press a row to
            start dragging.
          </p>
        </div>

        <div className={styles.reorderListWrap}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedEmails}
              strategy={verticalListSortingStrategy}
            >
              <ul className={styles.reorderList}>
                {orderedEmails.map((email, index) => {
                  const member = memberByEmail.get(email);
                  if (!member) return null;
                  return (
                    <SortableRow
                      key={email}
                      member={member}
                      index={index}
                      isSelf={member.userId === currentUserId}
                    />
                  );
                })}
              </ul>
            </SortableContext>
          </DndContext>
        </div>

        <div className={styles.reorderActions}>
          <button
            type="button"
            className={styles.reorderCancelBtn}
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.reorderSaveBtn}
            onClick={handleSave}
            disabled={!isDirty || saving}
          >
            {saving ? "Saving…" : "Save order"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

function SortableRow({
  member,
  index,
  isSelf,
}: {
  member: MemberEntry;
  index: number;
  isSelf: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: member.email });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${styles.reorderRow} ${isDragging ? styles.reorderRowDragging : ""}`}
      {...attributes}
      {...listeners}
    >
      <span className={styles.reorderIndex} aria-hidden="true">
        {index + 1}
      </span>
      <ReorderAvatar member={member} />
      <div className={styles.reorderInfo}>
        <span className={styles.reorderName}>
          {member.name || member.email}
          {isSelf && <span className={styles.youBadge}>You</span>}
        </span>
        {member.name && (
          <span className={styles.reorderEmailSub}>{member.email}</span>
        )}
      </div>
      <span className={styles.reorderHandle} aria-hidden="true">
        <GripIcon />
      </span>
    </li>
  );
}

function ReorderAvatar({ member }: { member: MemberEntry }) {
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

function GripIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="6" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="18" r="1" />
      <circle cx="15" cy="6" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="18" r="1" />
    </svg>
  );
}
