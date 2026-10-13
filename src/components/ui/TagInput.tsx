"use client";

import { useState, useRef, useMemo, useId, ChangeEvent, ClipboardEvent, KeyboardEvent } from "react";
import styles from "./TagInput.module.css";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Tags longer than this are highlighted as likely mistakes (e.g. a whole list entered as one tag). */
  warnLength?: number;
  /**
   * Known values offered in a dropdown while typing. Typed tags matching one
   * loosely ("nodejs", "Node JS") are saved with its spelling ("Node.js").
   * Values outside the list can still be added.
   */
  suggestions?: string[];
}

const MAX_VISIBLE_SUGGESTIONS = 8;

// Separators people use when pasting a list: commas, semicolons, new lines,
// tabs, pipes and bullets. A text input silently drops line breaks, so a list
// copied from a doc would otherwise land as a single giant tag.
const SEPARATOR_RE = /[,;\n\r\t|•·]+/;
// List markers at the start of a pasted line: "- ", "* ", "1. ", "2)".
const LIST_MARKER_RE = /^(?:[-*–—]\s+|\d+[.)]\s+)/;

function normalizeTag(raw: string): string {
  return raw.trim().replace(LIST_MARKER_RE, "").replace(/\s+/g, " ").trim();
}

/** Loose comparison key: "Node.js", "NodeJS" and "node js" all become "nodejs". */
function tagKey(tag: string): string {
  return tag.toLowerCase().replace(/[\s._-]+/g, "");
}

/**
 * Inserts the non-empty candidates that aren't already present (loosely
 * compared, see tagKey) at `index` — the end by default. Candidates found in
 * `canonical` take its spelling.
 */
function mergeTags(
  existing: string[],
  candidates: string[],
  index = existing.length,
  canonical?: Map<string, string>,
): string[] {
  const seen = new Set(existing.map(tagKey));
  const added: string[] = [];
  for (const raw of candidates) {
    const normalized = normalizeTag(raw);
    const key = tagKey(normalized);
    const tag = canonical?.get(key) ?? normalized;
    if (tag && !seen.has(key)) {
      seen.add(key);
      added.push(tag);
    }
  }
  return [...existing.slice(0, index), ...added, ...existing.slice(index)];
}

// Separators that join several items inside one tag: "AWS / Azure",
// "Java/Kotlin", "Frontend - Backend", "iOS & Android".
const INNER_SEPARATOR_RE = /\s*\/\s*|\s+[-–—&+]\s+/;
// Only offer a split when the separators are spaced ("AWS / Azure") or the tag
// is too long — compact names like "CI/CD" are usually a single item.
const SPACED_SEPARATOR_RE = /\s[/\-–—&+]\s/;

/** Returns the pieces a tag could be split into, or null when splitting doesn't apply. */
export function getSplitParts(tag: string, tooLong: boolean): string[] | null {
  if (!tooLong && !SPACED_SEPARATOR_RE.test(tag)) return null;
  let parts = tag.split(INNER_SEPARATOR_RE).map(normalizeTag).filter(Boolean);
  if (tooLong && parts.length === 1) {
    // No separators at all (e.g. a list whose line breaks were lost) — fall back to spaces.
    parts = tag.split(/\s+/).filter(Boolean);
  }
  return parts.length > 1 ? parts : null;
}

/** Two arrows pointing apart — used on Split buttons. Inherits the text color. */
export function SplitIcon() {
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
    >
      <path d="M16 3h5v5" />
      <path d="M8 3H3v5" />
      <path d="M21 3l-7 7" />
      <path d="M3 3l7 7" />
      <path d="M12 14v7" />
    </svg>
  );
}

/** Returns `tags` with `tag` replaced by `parts`, keeping its position in the list. */
export function splitTagInList(tags: string[], tag: string, parts: string[]): string[] {
  const index = tags.indexOf(tag);
  const rest = tags.filter((t) => t !== tag);
  return mergeTags(rest, parts, index);
}

export function TagInput({ value, onChange, placeholder = "Add tag…", disabled, warnLength, suggestions }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [dismissed, setDismissed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const canonical = useMemo(
    () => new Map((suggestions ?? []).map((s) => [tagKey(s), s])),
    [suggestions],
  );

  // Suggestions containing what's typed, not already added — prefix matches first.
  const query = tagKey(inputValue);
  const matches = useMemo(() => {
    if (!suggestions || !query) return [];
    const present = new Set(value.map(tagKey));
    return suggestions
      .filter((s) => !present.has(tagKey(s)) && tagKey(s).includes(query))
      .sort((a, b) => {
        const aPrefix = tagKey(a).startsWith(query) ? 0 : 1;
        const bPrefix = tagKey(b).startsWith(query) ? 0 : 1;
        return aPrefix - bPrefix || a.length - b.length;
      })
      .slice(0, MAX_VISIBLE_SUGGESTIONS);
  }, [suggestions, query, value]);
  const showSuggestions = focused && !dismissed && matches.length > 0;

  function commit(candidates: string[]) {
    const merged = mergeTags(value, candidates, value.length, canonical);
    if (merged.length !== value.length) {
      onChange(merged);
    }
  }

  function addTag(raw: string) {
    commit(raw.split(SEPARATOR_RE));
    setInputValue("");
    setHighlight(-1);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (showSuggestions && e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % matches.length);
    } else if (showSuggestions && e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? matches.length - 1 : h - 1));
    } else if (showSuggestions && e.key === "Escape") {
      e.preventDefault();
      setDismissed(true);
    } else if (e.key === "Enter" && showSuggestions && highlight >= 0) {
      e.preventDefault();
      addTag(matches[highlight]);
    } else if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setHighlight(-1);
    setDismissed(false);
    if (!SEPARATOR_RE.test(raw)) {
      setInputValue(raw);
      return;
    }
    const parts = raw.split(SEPARATOR_RE);
    const last = parts.pop() ?? "";
    commit(parts);
    setInputValue(last);
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text");
    if (!SEPARATOR_RE.test(pasted)) return;
    e.preventDefault();

    const input = inputRef.current;
    const start = input?.selectionStart ?? inputValue.length;
    const end = input?.selectionEnd ?? inputValue.length;
    const merged = inputValue.slice(0, start) + pasted + inputValue.slice(end);

    commit(merged.split(SEPARATOR_RE));
    setInputValue("");
  }

  function handleRemove(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleSplit(tag: string, parts: string[]) {
    onChange(mergeTags(value.filter((t) => t !== tag), parts, value.indexOf(tag), canonical));
  }

  return (
    <div
      className={styles.root}
      onClick={() => inputRef.current?.focus()}
      aria-label="Tag input"
    >
      {value.map((tag) => {
        const tooLong = warnLength !== undefined && tag.length > warnLength;
        const splitParts = disabled ? null : getSplitParts(tag, tooLong);
        return (
          <span
            key={tag}
            className={`${styles.tag} ${tooLong ? styles.tagWarning : ""}`}
            title={tooLong ? "This looks like more than one item — remove it and add each one separately." : undefined}
          >
            {tooLong && <span aria-hidden="true">⚠</span>}
            {tag}
            {splitParts && (
              <button
                type="button"
                className={`${styles.splitBtn} ${tooLong ? styles.splitBtnWarning : ""}`}
                onClick={(e) => { e.stopPropagation(); handleSplit(tag, splitParts); }}
                title={`Split into: ${splitParts.join(", ")}`}
                aria-label={`Split ${tag} into ${splitParts.length} tags`}
              >
                <SplitIcon />
                Split
              </button>
            )}
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
        );
      })}
      {!disabled && (
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (inputValue.trim()) addTag(inputValue);
          }}
          placeholder={value.length === 0 ? placeholder : undefined}
          role={suggestions ? "combobox" : undefined}
          aria-autocomplete={suggestions ? "list" : undefined}
          aria-expanded={suggestions ? showSuggestions : undefined}
          aria-controls={suggestions ? listId : undefined}
          aria-activedescendant={showSuggestions && highlight >= 0 ? `${listId}-${highlight}` : undefined}
        />
      )}
      {showSuggestions && (
        <ul id={listId} role="listbox" className={styles.suggestions}>
          {matches.map((s, i) => (
            <li
              key={s}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === highlight}
              className={`${styles.suggestion} ${i === highlight ? styles.suggestionActive : ""}`}
              // Keep focus in the input so blur doesn't commit the half-typed text first.
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => { e.stopPropagation(); addTag(s); inputRef.current?.focus(); }}
              onMouseEnter={() => setHighlight(i)}
            >
              {s}
            </li>
          ))}
          <li className={styles.suggestionHint} aria-hidden="true">
            Not listed? Just press Enter to add it.
          </li>
        </ul>
      )}
    </div>
  );
}
