"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./ConfirmModal.module.css";

interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  /** When true, renders a text input the user must type into before confirming. */
  shouldConfirm?: boolean;
  /** The exact string the user must type when shouldConfirm=true. */
  confirmText?: string;
  /** Confirm button label. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Cancel button label. Defaults to "Cancel". */
  cancelLabel?: string;
  loading?: boolean;
  icon?: React.ReactNode;
  /** When true, styles the confirm button in red. Defaults to false. */
  danger?: boolean;
}

export function Popup({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  shouldConfirm = false,
  confirmText,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  icon,
  danger = false,
}: PopupProps) {
  const [mounted, setMounted] = useState(() => typeof window !== "undefined");
  const [typed, setTyped] = useState("");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isOpen) setTyped("");
  }, [isOpen]);

  const canConfirm = shouldConfirm ? typed === confirmText : true;

  if (!mounted || !isOpen) return null;

  const modal = (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {icon && (
          <div className={`${styles.iconWrap} ${danger ? styles.iconWrapDanger : ""}`} aria-hidden="true">
            {icon}
          </div>
        )}

        <div className={styles.body}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.desc}>{description}</p>

          {shouldConfirm && confirmText && (
            <>
              <label className={styles.label}>
                Type <strong>{confirmText}</strong> to confirm:
              </label>
              <input
                type="text"
                className={styles.input}
                placeholder={confirmText}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoFocus
              />
            </>
          )}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`${styles.confirmBtn} ${danger ? styles.confirmBtnDanger : ""}`}
            disabled={!canConfirm || loading}
            onClick={onConfirm}
          >
            {loading ? `${confirmLabel}…` : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
