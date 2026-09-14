"use client";

import { useState } from "react";
import { Button } from "./Button";
import { ConfirmModal } from "./ConfirmModal";
import styles from "./DeployButton.module.css";

type DeployStatus = "idle" | "deploying" | "success" | "error";

const DeployIcon = ({ spinning }: { spinning: boolean }) => (
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
    className={spinning ? styles.spinning : undefined}
  >
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </svg>
);

const EXPLANATION =
  "Any changes made through the backoffice will be deployed automatically. Please use this deployment process only for updates that are not related to the backoffice, such as external API changes.\n\nPlease note that the website is automatically updated every day at 2:00 AM.";

export function DeployButton() {
  const [status, setStatus] = useState<DeployStatus>("idle");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);

  async function handleConfirm() {
    setStatus("deploying");
    try {
      const res = await fetch("/api/deploy", { method: "POST" });
      if (res.ok) {
        setStatus("success");
        setStartedAt(
          new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        );
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  function handleClose() {
    setIsConfirmOpen(false);
    setStatus("idle");
  }

  const isResolved = status === "success" || status === "error";

  return (
    <>
      <Button
        variant="solid"
        onClick={() => setIsConfirmOpen(true)}
        disabled={status === "deploying"}
      >
        <DeployIcon spinning={status === "deploying"} />
        {status === "deploying" ? "Deploying…" : "Run Deployment"}
      </Button>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={handleClose}
        onConfirm={isResolved ? handleClose : handleConfirm}
        title={
          status === "success"
            ? "Deployment started"
            : status === "error"
              ? "Deployment failed"
              : "Run deployment?"
        }
        description={
          status === "success"
            ? `The deployment was triggered at ${startedAt}. It may take a few minutes to go live.`
            : status === "error"
              ? "Something went wrong starting the deployment. Please try again."
              : EXPLANATION
        }
        confirmLabel={isResolved ? "Close" : "Deploy"}
        hideCancel={isResolved}
        loading={status === "deploying"}
      />
    </>
  );
}
