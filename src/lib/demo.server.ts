// Server-only demo mode: visitors without their own keys get a few free checks per day,
// powered by the owner's server-side NEBIUS_API_KEY / TAVILY_API_KEY. Keys never leave the server.
import { getCookie, setCookie, getRequestHeader } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const DEMO_CHECKS = 3;
const IP_CHECKS = 6;
const LIMITS: Record<string, number> = { search: 15, extract: 15, research: 6 };
const COOKIE = "gr_demo";
export const DEMO_LIMIT_MESSAGE =
  "You've used your 3 free checks for today. Add your own free Nebius and Tavily keys in Settings to keep going - it takes 2 minutes.";

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

/** Free checks left today for this visitor (min of cookie and IP allowance). */
export async function demoRemaining(): Promise<number> {
  const v = visitor();
  const [a, b] = await Promise.all([used(`v:${v}`, "check"), used(`ip:${ip()}`, "check")]);
  return Math.max(0, Math.min(DEMO_CHECKS - a, IP_CHECKS - b));
}

/** Use one free check (a copilot reply). Returns remaining, or throws when the limit is hit. */
export async function useDemoCheck(): Promise<number> {
  if ((await demoRemaining()) <= 0) throw new Error(DEMO_LIMIT_MESSAGE);
  const v = visitor();
  const a = await consume(`v:${v}`, "check", DEMO_CHECKS);
  const b = await consume(`ip:${ip()}`, "check", IP_CHECKS);
  if (a < 0 || b < 0) throw new Error(DEMO_LIMIT_MESSAGE);
  return Math.min(a, b);
}

/** Supporting demo calls (role search, page reads, research) are allowed only while checks remain, with their own caps. */
export async function allowDemo(kind: keyof typeof LIMITS): Promise<void> {
  if ((await demoRemaining()) <= 0) throw new Error(DEMO_LIMIT_MESSAGE);
  if ((await consume(`v:${visitor()}`, kind, LIMITS[kind]!)) < 0) throw new Error(DEMO_LIMIT_MESSAGE);
}

/** Resolve a provider key: the user's own key, or the owner's server key under demo limits. */
export async function demoKey(own: string | undefined, env: "NEBIUS_API_KEY" | "TAVILY_API_KEY", kind?: keyof typeof LIMITS) {
  if (own) return own;
  const key = process.env[env];
  if (!key) throw new Error(`Add your ${env.startsWith("N") ? "Nebius" : "Tavily"} API key in Settings first.`);
  if (kind) await allowDemo(kind);
  return key;
}
