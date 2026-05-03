"use client";

import { useEffect } from "react";

/**
 * Shows the browser's native "leave site?" dialog when the user tries to close
 * the tab, navigate away, or refresh while `active` is true.
 *
 * Use it for any state that would be lost on unload — unsaved form edits or an
 * in-flight save (e.g. an upload that hasn't finished).
 */
export function useUnsavedChangesWarning(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    function handler(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);
}
