"use client";

import { useState, useRef, KeyboardEvent } from "react";
import styles from "./TagInput.module.css";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TagInput({ value, onChange, placeholder = "Add tag…", disabled }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addTag(raw: string) {
    const tag = raw.trim().replace(/,+$/, "").trim();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }
    setInputValue("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function handleRemove(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  return (
    <div
      className={styles.root}
      onClick={() => inputRef.current?.focus()}
      aria-label="Tag input"
    >
      {value.map((tag) => (
        <span key={tag} className={styles.tag}>
          {tag}
          {!disabled && (
            <button
              type="button"
              className={styles.removeBtn}
              onClick={(e) => { e.stopPropagation(); handleRemove(tag); }}
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (inputValue.trim()) addTag(inputValue); }}
          placeholder={value.length === 0 ? placeholder : undefined}
        />
      )}
    </div>
  );
}
