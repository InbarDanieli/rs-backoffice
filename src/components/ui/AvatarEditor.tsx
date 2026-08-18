"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import styles from "./AvatarEditor.module.css";

interface AvatarEditorProps {
  src: string;
  alt: string;
  onImageChange?: (dataUrl: string) => void;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Image read failed"));
    reader.readAsDataURL(file);
  });
}

export function AvatarEditor({ src, alt, onImageChange }: AvatarEditorProps) {
  const [previewSrc, setPreviewSrc] = useState(src);
  const inputRef = useRef<HTMLInputElement>(null);

  function openFilePicker() {
    inputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      setPreviewSrc(dataUrl);
      onImageChange?.(dataUrl);
    } catch {
      // Fallback: show blob preview without persisting
      setPreviewSrc(URL.createObjectURL(file));
    }
  }

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.trigger}
        onClick={openFilePicker}
        aria-label="Change profile photo"
      >
        <div className={styles.imageWrap}>
          {previewSrc ? (
            <Image
              src={previewSrc}
              alt={alt}
              width={96}
              height={96}
              className={styles.image}
              unoptimized={!previewSrc.startsWith("http")}
            />
          ) : (
            <span className={styles.letterFallback} aria-hidden="true">
              {alt.trim()[0]?.toUpperCase() ?? "?"}
            </span>
          )}
        </div>

        <span className={styles.overlay} aria-hidden="true">
          <CameraIcon />
        </span>

        <span className={styles.editBadge} aria-hidden="true">
          <PencilIcon />
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className={styles.fileInput}
        onChange={handleFileChange}
      />
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
