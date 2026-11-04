"use client";

import { useState } from "react";
import { Button } from "./Button";
import { ConfirmModal } from "./ConfirmModal";

type ExportStatus = "idle" | "exporting" | "error";

const DownloadIcon = () => (
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
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const WARNING =
  "The file contains personal information. Store it somewhere secure and delete copies you no longer need.";

const SCOPES = {
  website: {
    label: "Export website data",
    title: "Export website data?",
    description: `Downloads all users and sponsors as a zip of JSON files.\n\n${WARNING}`,
  },
  all: {
    label: "Export all data",
    title: "Export all data?",
    description: `Downloads a full backup of the database — every collection, including years and audit logs — as a zip of JSON files.\n\n${WARNING}`,
  },
} as const;

export function ExportDataButton({ scope }: { scope: keyof typeof SCOPES }) {
  const copy = SCOPES[scope];
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  async function handleConfirm() {
    setStatus("exporting");
    try {
      const res = await fetch(`/api/export?scope=${scope}`);
      if (!res.ok) throw new Error();
      const filename =
        res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ??
        "rs-backoffice-export.zip";
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("idle");
      setIsConfirmOpen(false);
    } catch {
      setStatus("error");
    }
  }

  function handleClose() {
    setIsConfirmOpen(false);
    setStatus("idle");
  }

  return (
    <>
      <Button variant="ghost" onClick={() => setIsConfirmOpen(true)} disabled={status === "exporting"}>
        <DownloadIcon />
        {status === "exporting" ? "Exporting…" : copy.label}
      </Button>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={handleClose}
        onConfirm={status === "error" ? handleClose : handleConfirm}
        title={status === "error" ? "Export failed" : copy.title}
        description={
          status === "error"
            ? "Something went wrong creating the export. Please try again."
            : copy.description
        }
        confirmLabel={status === "error" ? "Close" : "Export"}
        hideCancel={status === "error"}
        loading={status === "exporting"}
      />
    </>
  );
}
