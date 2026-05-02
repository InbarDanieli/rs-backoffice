import "server-only";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is not set`);
  return value;
}

const token = requireEnv("GITHUB_TOKEN");
const owner = requireEnv("GITHUB_OWNER");
const repo = requireEnv("GITHUB_REPO");
const branch = requireEnv("GITHUB_ASSETS_BRANCH");

const API_BASE = "https://api.github.com";
const RAW_BASE = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}`;

export type EntityKind = "sponsors" | "users";
export type ImageKind = "logo" | "carousel" | "testimonial" | "avatar";

export interface UploadArgs {
  entity: EntityKind;
  entityId: string;
  kind: ImageKind;
  index?: number;
  dataUrl: string;
}

export class GitHubApiError extends Error {
  status: number;
  githubMessage?: string;
  constructor(status: number, message: string, githubMessage?: string) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
    this.githubMessage = githubMessage;
  }
}

export class GitHubAuthError extends GitHubApiError {
  constructor(githubMessage?: string) {
    super(
      401,
      [
        `GitHub API rejected the PAT (401). Check the following:`,
        `  1. GITHUB_TOKEN is set in this environment (and Vercel for prod).`,
        `  2. The token is not expired — fine-grained PATs default to 90 days.`,
        `  3. The token is a fine-grained PAT with "Contents: read and write" scoped to repo "${owner}/${repo}".`,
        `  4. The repo owner GITHUB_OWNER=${owner} matches the token's resource owner.`,
        `Re-issue at https://github.com/settings/personal-access-tokens, paste into .env (and Vercel env), then redeploy.`,
      ].join("\n"),
      githubMessage,
    );
    this.name = "GitHubAuthError";
  }
}

export class GitHubRateLimitError extends GitHubApiError {
  constructor(githubMessage?: string) {
    super(429, "GitHub API rate limit exceeded", githubMessage);
    this.name = "GitHubRateLimitError";
  }
}

interface GitHubErrorBody {
  message?: string;
}

async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "rs-backoffice",
      ...(init.headers ?? {}),
    },
  });

  if (res.ok) return res;

  let body: GitHubErrorBody | undefined;
  try {
    body = (await res.clone().json()) as GitHubErrorBody;
  } catch {
    // body wasn't JSON
  }
  const githubMessage = body?.message;

  if (res.status === 401) throw new GitHubAuthError(githubMessage);

  const remaining = res.headers.get("x-ratelimit-remaining");
  if (res.status === 429 || (res.status === 403 && remaining === "0")) {
    throw new GitHubRateLimitError(githubMessage);
  }

  throw new GitHubApiError(
    res.status,
    `GitHub API ${init.method ?? "GET"} ${path} failed: ${res.status}${githubMessage ? ` — ${githubMessage}` : ""}`,
    githubMessage,
  );
}

interface RetryOpts {
  attempts?: number;
  baseDelayMs?: number;
}

async function retryOnTransient<T>(
  fn: () => Promise<T>,
  opts: RetryOpts = {},
): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      if (err instanceof GitHubAuthError) throw err;
      if (err instanceof GitHubRateLimitError) throw err;

      const isTransient =
        (err instanceof GitHubApiError && err.status >= 500) ||
        err instanceof TypeError;

      if (!isTransient || attempt === attempts) throw err;

      const delay = baseDelayMs * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

export function isDataUrl(value: string | undefined | null): boolean {
  return typeof value === "string" && value.startsWith("data:");
}

export function isOwnedRawUrl(value: string | undefined | null): boolean {
  if (typeof value !== "string") return false;
  return value.startsWith(`${RAW_BASE}/`);
}

export function pathFromRawUrl(url: string): string | null {
  if (!isOwnedRawUrl(url)) return null;
  const rest = url.slice(RAW_BASE.length + 1);
  try {
    return rest.split("/").map(decodeURIComponent).join("/");
  } catch {
    return null;
  }
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function stripDataUrlPrefix(input: string): string {
  if (input.startsWith("data:")) {
    const comma = input.indexOf(",");
    if (comma === -1) throw new Error("Malformed data URL: missing comma");
    return input.slice(comma + 1);
  }
  return input;
}

function buildFilename(kind: ImageKind, index: number | undefined): string {
  const ts = Date.now();
  switch (kind) {
    case "logo":
      return `logo-${ts}.webp`;
    case "avatar":
      return `avatar-${ts}.webp`;
    case "carousel":
      if (index === undefined) throw new Error("carousel kind requires index");
      return `carousel-${index}-${ts}.webp`;
    case "testimonial":
      if (index === undefined) throw new Error("testimonial kind requires index");
      return `testimonial-${index}-${ts}.webp`;
  }
}

export async function uploadImage(args: UploadArgs): Promise<string> {
  const filename = buildFilename(args.kind, args.index);
  const path = `${args.entity}/${args.entityId}/${filename}`;
  const content = stripDataUrlPrefix(args.dataUrl);

  await apiFetch(`/repos/${owner}/${repo}/contents/${encodePath(path)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `chore(assets): upload ${path}`,
      content,
      branch,
    }),
  });

  return `${RAW_BASE}/${path}`;
}

export async function deleteImage(rawUrl: string): Promise<void> {
  const path = pathFromRawUrl(rawUrl);
  if (!path) return;

  await retryOnTransient(async () => {
    let sha: string;
    try {
      const res = await apiFetch(
        `/repos/${owner}/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`,
      );
      const body = (await res.json()) as { sha?: string };
      if (!body.sha) throw new GitHubApiError(500, `GET contents returned no sha for ${path}`);
      sha = body.sha;
    } catch (err) {
      if (err instanceof GitHubApiError && err.status === 404) return;
      throw err;
    }

    try {
      await apiFetch(`/repos/${owner}/${repo}/contents/${encodePath(path)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `chore(assets): delete ${path}`,
          sha,
          branch,
        }),
      });
    } catch (err) {
      if (err instanceof GitHubApiError && err.status === 404) return;
      throw err;
    }
  });
}
