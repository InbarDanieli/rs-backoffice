"use client";

import { useState, useRef, ChangeEvent, ClipboardEvent, KeyboardEvent } from "react";
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

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (!raw.includes(",")) {
      setInputValue(raw);
      return;
    }
    const parts = raw.split(",");
    const last = parts.pop() ?? "";
    const newTags: string[] = [];
    for (const part of parts) {
      const tag = part.trim();
      if (tag && !value.includes(tag) && !newTags.includes(tag)) {
        newTags.push(tag);
      }
    }
    if (newTags.length) {
      onChange([...value, ...newTags]);
    }
    setInputValue(last);
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text");
    if (!pasted.includes(",")) return;
    e.preventDefault();

    const input = inputRef.current;
    const start = input?.selectionStart ?? inputValue.length;
    const end = input?.selectionEnd ?? inputValue.length;
    const merged = inputValue.slice(0, start) + pasted + inputValue.slice(end);

    const newTags: string[] = [];
    for (const part of merged.split(",")) {
      const tag = part.trim();
      if (tag && !value.includes(tag) && !newTags.includes(tag)) {
        newTags.push(tag);
      }
    }
    if (newTags.length) {
      onChange([...value, ...newTags]);
    }
    setInputValue("");
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
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => { if (inputValue.trim()) addTag(inputValue); }}
          placeholder={value.length === 0 ? placeholder : undefined}
        />
      )}
    </div>
  );
}
