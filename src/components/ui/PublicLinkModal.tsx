"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./PublicLinkModal.module.css";

interface PublicLinkModalProps {
  isOpen: boolean;
  sponsorId: string;
  sponsorName: string;
  existingToken?: string | null;
  existingExpiresAt?: Date | string | null;
  onClose: () => void;
  onTokenChange: (token: string | null, expiresAt: Date | null) => void;
}

export function PublicLinkModal({
  isOpen,
  sponsorId,
  sponsorName,
  existingToken,
  existingExpiresAt,
  onClose,
  onTokenChange,
}: PublicLinkModalProps) {
  const [mounted, setMounted] = useState(() => typeof window !== "undefined");
  const [ttl, setTtl] = useState(7);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [generatedExpiresAt, setGeneratedExpiresAt] = useState<Date | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isOpen) {
      setTtl(7);
      setCopied(false);
      setGeneratedUrl(null);
      setGeneratedExpiresAt(null);
    }
  }, [isOpen]);

  const hasLink = !!(existingToken || generatedUrl);
  const displayUrl = generatedUrl ?? (existingToken ? `${window?.location?.origin ?? ""}/public/${existingToken}` : null);
  const expiresDate = generatedExpiresAt ?? (existingExpiresAt ? new Date(existingExpiresAt) : null);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sponsors/${sponsorId}/public-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ttlDays: ttl }),
      });
      if (!res.ok) throw new Error("Failed to generate link");
      const data = await res.json() as { url: string; token: string; expiresAt: string };
      const expires = new Date(data.expiresAt);
      setGeneratedUrl(data.url);
      setGeneratedExpiresAt(expires);
      onTokenChange(data.token, expires);
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    setLoading(true);
    try {
      await fetch(`/api/sponsors/${sponsorId}/public-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revoke: true }),
      });
      setGeneratedUrl(null);
      setGeneratedExpiresAt(null);
      onTokenChange(null, null);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!displayUrl) return;
    await navigator.clipboard.writeText(displayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!mounted || !isOpen) return null;

  const modal = (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plm-title"
      >
        <div className={styles.header}>
          <h2 id="plm-title" className={styles.title}>Public edit link</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.desc}>
            <strong>{sponsorName}</strong> — share this temporary link so the sponsor can edit their profile without signing in. Regenerating replaces the previous link.
          </p>

          {hasLink && displayUrl && (
            <div className={styles.linkSection}>
              {expiresDate && (
                <p className={styles.expires}>
                  Expires: <span>{expiresDate.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
                </p>
              )}
              <input
                type="text"
                readOnly
                value={displayUrl}
                className={styles.urlInput}
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                className={styles.copyBtn}
                onClick={handleCopy}
              >
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
          )}

          <div className={styles.ttlRow}>
            <label className={styles.ttlLabel} htmlFor="ttl-input">TTL (days)</label>
            <input
              id="ttl-input"
              type="number"
              min={1}
              max={365}
              value={ttl}
              onChange={(e) => setTtl(Number(e.target.value))}
              className={styles.ttlInput}
            />
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.closeFooterBtn} onClick={onClose}>
            Close
          </button>
          <div className={styles.footerRight}>
            {hasLink && (
              <button
                type="button"
                className={styles.revokeBtn}
                onClick={handleRevoke}
                disabled={loading}
              >
                Revoke
              </button>
            )}
            <button
              type="button"
              className={styles.generateBtn}
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? "Generating…" : hasLink ? "Regenerate link" : "Generate link"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
