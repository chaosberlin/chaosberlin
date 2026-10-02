// GitHub OAuth (login with GitHub) + signed cookie session. No DB needed.
import { createHmac, timingSafeEqual } from "node:crypto";

export interface GhUser {
  login: string;
  id: number;
  avatar_url?: string;
  name?: string;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input as string)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function unb64url(s: string): Buffer {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

export function signSession(user: GhUser, secret: string): string {
  const payload = b64url(
    JSON.stringify({ login: user.login, id: user.id, ts: Date.now() }),
  );
  const sig = createHmac("sha256", secret)
    .update(payload)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${payload}.${sig}`;
}

export function verifySession(
  cookie: string | null,
  secret: string,
): { login: string; id: number } | null {
  if (!cookie || !secret || secret.startsWith("changeme")) return null;
  const [payload, sig] = cookie.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const data = JSON.parse(unb64url(payload).toString());
    if (!data.login) return null;
    // 30 day expiry
    if (Date.now() - (data.ts ?? 0) > 30 * 24 * 3600 * 1000) return null;
    return data;
  } catch {
    return null;
  }
}

export function loginUrl(env: Record<string, string | undefined>): string {
  const clientId = env.GITHUB_CLIENT_ID ?? "";
  const redirect = env.GITHUB_CALLBACK_URL ?? "";
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    scope: "read:user",
  });
  return `https://github.com/login/oauth/authorize?${p}`;
}

export async function exchangeCode(
  code: string,
  env: Record<string, string | undefined>,
): Promise<string> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: env.GITHUB_CALLBACK_URL,
    }),
  });
  const body = (await res.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!body.access_token)
    throw new Error(`OAuth exchange failed: ${body.error} ${body.error_description ?? ""}`);
  return body.access_token;
}

export async function fetchGhUser(token: string): Promise<GhUser> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "chaosberlin-backend",
    },
  });
  if (!res.ok) throw new Error(`GitHub /user failed: ${res.status}`);
  return (await res.json()) as GhUser;
}

export function getCookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}
