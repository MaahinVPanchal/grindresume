// Server-only demo mode: signed-in users get 3 free checks per day tied to their account,
// powered by the owner's server-side NEBIUS_API_KEY / TAVILY_API_KEY. Keys never leave the server.
// Signed-out visitors must sign up or add their own keys.
import { getCookie, setCookie, getRequestHeader } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const DEMO_CHECKS = 3;
const IP_CHECKS = 6;
const LIMITS: Record<string, number> = { search: 15, extract: 15, research: 6 };
const COOKIE = "gr_demo";
export const DEMO_SIGNUP_MESSAGE = "Sign up free to get 3 free checks a day - no API keys needed.";
export const SIGN_IN_REQUIRED_MESSAGE = DEMO_SIGNUP_MESSAGE;
export const DEMO_LIMIT_MESSAGE =
  "You've used your 3 free checks for today. Add your own free Nebius and Tavily keys in Settings to keep going - it takes 2 minutes.";

void getCookie; void setCookie; void COOKIE;

/** Demo checks belong to a signed-in account; returns the verified user id or null. */
export async function demoUser(customAuthHeader?: string | null): Promise<string | null> {
  let auth = customAuthHeader;
  if (!auth) {
    try {
      auth = getRequestHeader("authorization") || "";
    } catch {
      auth = "";
    }
  }
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  return error || !data?.user ? null : data.user.id;
}

export const getAuthUserId = demoUser;

async function visitor(customAuthHeader?: string | null): Promise<string> {
  const id = await demoUser(customAuthHeader);
  if (!id) throw new Error(DEMO_SIGNUP_MESSAGE);
  return id;
}

function ip(): string {
  try {
    return (getRequestHeader("cf-connecting-ip") || getRequestHeader("x-forwarded-for") || "unknown").split(",")[0]!.trim();
  } catch {
    return "unknown";
  }
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

/** Free checks left today for this signed-in user (0 for signed-out visitors). */
export async function demoRemaining(userId?: string | null): Promise<number> {
  const v = userId !== undefined ? userId : await demoUser();
  if (!v) return 0;
  const [a, b] = await Promise.all([used(`v:${v}`, "check"), used(`ip:${ip()}`, "check")]);
  return Math.max(0, Math.min(DEMO_CHECKS - a, IP_CHECKS - b));
}

/** Use one free check (a copilot reply). Returns remaining, or throws when not signed in or limit hit. */
export async function useDemoCheck(customAuthHeader?: string | null): Promise<number> {
  const v = await visitor(customAuthHeader);
  if ((await demoRemaining(v)) <= 0) throw new Error(DEMO_LIMIT_MESSAGE);
  const a = await consume(`v:${v}`, "check", DEMO_CHECKS);
  const b = await consume(`ip:${ip()}`, "check", IP_CHECKS);
  if (a < 0 || b < 0) throw new Error(DEMO_LIMIT_MESSAGE);
  return Math.min(a, b);
}

/** Supporting demo calls (role search, page reads, research) require sign-in and are allowed only while checks remain. */
export async function allowDemo(kind: keyof typeof LIMITS, customAuthHeader?: string | null): Promise<void> {
  const v = await demoUser(customAuthHeader);
  if (!v) {
    if (kind === "search") throw new Error("Sign in to search roles for free, or add your own Tavily key in Settings.");
    if (kind === "extract") throw new Error("Sign in to read job postings for free, or add your own Tavily key in Settings.");
    throw new Error(DEMO_SIGNUP_MESSAGE);
  }
  if ((await demoRemaining(v)) <= 0) throw new Error(DEMO_LIMIT_MESSAGE);
  if ((await consume(`v:${v}`, kind, LIMITS[kind]!)) < 0) throw new Error(DEMO_LIMIT_MESSAGE);
}

/** Resolve a provider key: the user's own key, or the owner's server key under demo limits. */
export async function demoKey(own: string | undefined, env: "NEBIUS_API_KEY" | "TAVILY_API_KEY", kind?: keyof typeof LIMITS, customAuthHeader?: string | null) {
  if (own) return own;
  const key = process.env[env];
  if (!key) throw new Error(`Add your ${env.startsWith("N") ? "Nebius" : "Tavily"} API key in Settings first.`);
  if (kind) await allowDemo(kind, customAuthHeader);
  return key;
}
