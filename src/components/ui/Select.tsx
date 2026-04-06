"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./Select.module.css";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Fixed width for the trigger button, e.g. "10rem" or 160 (px). */
  width?: string | number;
}

interface DropdownPos {
  top: number;
  left: number;
  width: number;
}

export function Select({
  options,
  value,
  onChange,
  disabled = false,
  placeholder = "Select…",
  width,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<DropdownPos | null>(null);
  // Lazy initializer runs only on the client, avoiding SSR hydration mismatch for portals
  const [mounted] = useState(() => typeof window !== "undefined");

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggleDropdown() {
    if (disabled) return;
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setIsOpen((v) => !v);
  }

  function handleSelect(optionValue: string) {
    onChange(optionValue);
    setIsOpen(false);
  }

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder;

  const dropdown = isOpen && dropdownPos ? (
    <div
      ref={dropdownRef}
      className={styles.dropdown}
      role="listbox"
      style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="option"
          aria-selected={option.value === value}
          className={`${styles.option} ${option.value === value ? styles.optionActive : ""}`}
          onClick={() => handleSelect(option.value)}
        >
          <span className={styles.optionLabel}>{option.label}</span>
          {option.value === value && <CheckIcon />}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${disabled ? styles.triggerDisabled : ""}`}
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        style={width !== undefined ? { width: typeof width === "number" ? `${width}px` : width } : undefined}
      >
        <span className={styles.triggerLabel}>{selectedLabel}</span>
        <ChevronIcon open={isOpen} />
      </button>

      {mounted && createPortal(dropdown, document.body)}
    </>
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
        flexShrink: 0,
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
      style={{ flexShrink: 0 }}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
