import "server-only";

/**
 * Triggers a redeploy of the public Reversim site (reversim/rs26) whenever
 * back-office content that the site renders — sponsors, team members — changes.
 *
 * The public site is a statically-built Astro app deployed to Firebase Hosting
 * by the `deploy.yaml` workflow in that repo. That workflow exposes a
 * `workflow_dispatch` trigger, so we kick it via the GitHub REST API:
 *   POST /repos/{owner}/{repo}/actions/workflows/{workflow}/dispatches
 *
 * Before dispatching, any run of that workflow still `queued` or
 * `in_progress` is cancelled first — a save always deploys the content it
 * just wrote, rather than racing an older run that started moments earlier.
 *
 * Call this from a Route Handler via `after()` (next/server) so the dispatch
 * runs after the response is sent and never blocks or fails the user's save.
 */

const API_BASE = "https://api.github.com";

// A dedicated fine-grained PAT with "Actions: read and write" scoped to the
// deploy repo. Falls back to the asset-storage token, but note that token is
// typically scoped to rs-backoffice only and will 403 on a cross-repo dispatch,
// so a dedicated DEPLOY_GITHUB_TOKEN is expected in production.
const token = process.env.DEPLOY_GITHUB_TOKEN || process.env.GITHUB_TOKEN;

const owner = process.env.DEPLOY_REPO_OWNER || "reversim";
const repo = process.env.DEPLOY_REPO_NAME || "rs26";
const workflow = process.env.DEPLOY_WORKFLOW_FILE || "deploy.yaml";
const ref = process.env.DEPLOY_REF || "main";

// Best-effort coalescing: collapse bursts of edits (e.g. saving several fields
// in quick succession) into a single dispatch. Only dedupes within one warm
// serverless instance — good enough to blunt the common case; the daily cron
// and the idempotent rebuild cover anything that slips through.
const MIN_INTERVAL_MS = Number(process.env.DEPLOY_MIN_INTERVAL_MS ?? 30_000);
let lastDispatchAt = 0;

function isEnabled(): boolean {
  return Boolean(token);
}

function githubHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "rs-backoffice",
  };
}

interface WorkflowRun {
  id: number;
  status: string;
}

/**
 * Cancel any run of the deploy workflow that hasn't finished yet, so the
 * dispatch below doesn't end up racing (and possibly losing to) a stale run.
 * Best-effort: logs and swallows failures rather than blocking the dispatch.
 */
async function cancelActiveRuns(): Promise<void> {
  const path = `/repos/${owner}/${repo}/actions/workflows/${workflow}/runs?per_page=10`;

  try {
    const res = await fetch(`${API_BASE}${path}`, { headers: githubHeaders() });
    if (!res.ok) return;

    const data = (await res.json()) as { workflow_runs?: WorkflowRun[] };
    const active = (data.workflow_runs ?? []).filter(
      (run) => run.status === "queued" || run.status === "in_progress",
    );

    await Promise.all(
      active.map(async (run) => {
        const cancelRes = await fetch(
          `${API_BASE}/repos/${owner}/${repo}/actions/runs/${run.id}/cancel`,
          { method: "POST", headers: githubHeaders() },
        );
        if (cancelRes.ok) {
          console.info(`[deploy] Cancelled stale run ${run.id} for ${owner}/${repo} ${workflow}`);
        }
      }),
    );
  } catch (err) {
    console.error(`[deploy] Error cancelling active runs:`, err);
  }
}

/**
 * Dispatch the deploy workflow. Never throws — failures are logged so a broken
 * deploy hook can't take down a content save. Returns whether a dispatch was
 * actually sent (false when disabled or throttled).
 */
export async function triggerSiteDeploy(reason: string): Promise<boolean> {
  if (!isEnabled()) {
    // No deploy token configured (e.g. local dev) — quietly skip.
    return false;
  }

  const now = Date.now();
  if (now - lastDispatchAt < MIN_INTERVAL_MS) {
    return false;
  }
  lastDispatchAt = now;

  await cancelActiveRuns();

  const path = `/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`;

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { ...githubHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ ref, inputs: {} }),
    });

    if (res.status === 204) {
      console.info(
        `[deploy] Dispatched ${owner}/${repo} ${workflow}@${ref} (reason: ${reason})`,
      );
      return true;
    }

    // Reset the throttle so a transient failure doesn't suppress the next try.
    lastDispatchAt = 0;

    let message = "";
    try {
      const body = (await res.json()) as { message?: string };
      message = body.message ?? "";
    } catch {
      // response body wasn't JSON
    }
    console.error(
      `[deploy] Failed to dispatch ${owner}/${repo} ${workflow}: ${res.status}${
        message ? ` — ${message}` : ""
      }. Ensure DEPLOY_GITHUB_TOKEN has "Actions: read and write" on ${owner}/${repo}.`,
    );
    return false;
  } catch (err) {
    lastDispatchAt = 0;
    console.error(`[deploy] Error dispatching deploy workflow:`, err);
    return false;
  }
}
