// Server-only demo mode: signed-in users get 3 free checks per day tied to their account,
// powered by the owner's server-side NEBIUS_API_KEY / TAVILY_API_KEY. Keys never leave the server.
// Signed-out visitors must sign up or add their own keys.
import { getCookie, setCookie, getRequestHeader } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const DEMO_CHECKS = 3;
const IP_CHECKS = 6;
const LIMITS: Record<string, number> = { search: 15, extract: 15, research: 6 };
const COOKIE = "gr_demo";
export const DEMO_LIMIT_MESSAGE =
  "You've used your 3 free checks for today. Add your own free Nebius and Tavily keys in Settings to keep going - it takes 2 minutes.";
export const SIGN_IN_REQUIRED_MESSAGE =
  "Sign up free to get 3 free checks a day - no API keys needed.";

export async function getAuthUserId(customAuthHeader?: string | null): Promise<string | null> {
  let header = customAuthHeader;
  if (!header) {
    try {
      header = getRequestHeader("authorization") ?? null;
    } catch {
      header = null;
    }
  }
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token || token.split(".").length !== 3) return null;
  try {
    const claimsRes = await supabaseAdmin.auth.getClaims(token);
    if (claimsRes.data?.claims?.sub) return String(claimsRes.data.claims.sub);
  } catch {
    /* fallback to getUser */
  }
  try {
    const userRes = await supabaseAdmin.auth.getUser(token);
    if (userRes.data?.user?.id) return String(userRes.data.user.id);
  } catch {
    return null;
  }
  return null;
}

function visitor(): string {
  let id = getCookie(COOKIE);
  if (!id || !/^[a-f0-9-]{36}$/.test(id)) {
    id = crypto.randomUUID();
    setCookie(COOKIE, id, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  return id;
}

function ip(): string {
  return (getRequestHeader("cf-connecting-ip") || getRequestHeader("x-forwarded-for") || "unknown").split(",")[0]!.trim();
}

async function used(bucket: string, kind: string) {
  const { data } = await supabaseAdmin.rpc("demo_used", { _bucket: bucket, _kind: kind });
  return Number(data ?? 0);
}

async function consume(bucket: string, kind: string, limit: number) {
  const { data, error } = await supabaseAdmin.rpc("demo_consume", { _bucket: bucket, _kind: kind, _limit: limit });
  if (error) throw new Error("Demo mode is unavailable right now.");
  return Number(data);
}

/** Free checks left today for this user (0 for signed-out visitors). */
export async function demoRemaining(userId?: string | null): Promise<number> {
  const uid = userId !== undefined ? userId : await getAuthUserId();
  if (!uid) return 0;
  const [a, b] = await Promise.all([used(`u:${uid}`, "check"), used(`ip:${ip()}`, "check")]);
  return Math.max(0, Math.min(DEMO_CHECKS - a, IP_CHECKS - b));
}

/** Use one free check (a copilot reply). Returns remaining, or throws when not signed in or limit hit. */
export async function useDemoCheck(customAuthHeader?: string | null): Promise<number> {
  const uid = await getAuthUserId(customAuthHeader);
  if (!uid) throw new Error(SIGN_IN_REQUIRED_MESSAGE);
  if ((await demoRemaining(uid)) <= 0) throw new Error(DEMO_LIMIT_MESSAGE);
  const a = await consume(`u:${uid}`, "check", DEMO_CHECKS);
  const b = await consume(`ip:${ip()}`, "check", IP_CHECKS);
  if (a < 0 || b < 0) throw new Error(DEMO_LIMIT_MESSAGE);
  return Math.min(a, b);
}

/** Supporting demo calls (role search, page reads, research) require sign-in and are allowed only while checks remain. */
export async function allowDemo(kind: keyof typeof LIMITS, customAuthHeader?: string | null): Promise<void> {
  const uid = await getAuthUserId(customAuthHeader);
  if (!uid) {
    if (kind === "search") throw new Error("Sign in to search roles for free, or add your own Tavily key in Settings.");
    if (kind === "extract") throw new Error("Sign in to read job postings for free, or add your own Tavily key in Settings.");
    throw new Error("Sign in to use free tools, or add your own keys in Settings.");
  }
  if ((await demoRemaining(uid)) <= 0) throw new Error(DEMO_LIMIT_MESSAGE);
  if ((await consume(`u:${uid}`, kind, LIMITS[kind]!)) < 0) throw new Error(DEMO_LIMIT_MESSAGE);
}

/** Resolve a provider key: the user's own key, or the owner's server key under demo limits. */
export async function demoKey(own: string | undefined, env: "NEBIUS_API_KEY" | "TAVILY_API_KEY", kind?: keyof typeof LIMITS, customAuthHeader?: string | null) {
  if (own) return own;
  const key = process.env[env];
  if (!key) throw new Error(`Add your ${env.startsWith("N") ? "Nebius" : "Tavily"} API key in Settings first.`);
  if (kind) await allowDemo(kind, customAuthHeader);
  return key;
}
