// Server-only demo mode: signed-in users get 3 free checks per day tied to their account,
// powered by the owner's server-side NEBIUS_API_KEY / TAVILY_API_KEY. Keys never leave the server.
// Signed-out visitors must sign up or add their own keys.
import { getRequestHeader } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const DEMO_CHECKS = 3;
const LIMITS: Record<string, number> = { search: 15, extract: 15, research: 6, ats: 3 };
export const DEMO_SIGNUP_MESSAGE = "Sign up free to get 3 free checks a day - no API keys needed.";
export const SIGN_IN_REQUIRED_MESSAGE = DEMO_SIGNUP_MESSAGE;
export const DEMO_LIMIT_MESSAGE =
  "You've used your 3 free checks for today. Add your own free Nebius and Tavily keys in Settings to keep going - it takes 2 minutes.";


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


async function used(bucket: string, kind: string) {
  const { data, error } = await supabaseAdmin.rpc("demo_used", { _bucket: bucket, _kind: kind });
  if (error) throw new Error('Your free checks could not load.');
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
  return Math.max(0, DEMO_CHECKS - await used(`v:${v}`, "check"));
}

/** Use one free check (a copilot reply). Returns remaining, or throws when not signed in or limit hit. */
export async function useDemoCheck(customAuthHeader?: string | null): Promise<number> {
  const v = await visitor(customAuthHeader);
  if ((await demoRemaining(v)) <= 0) throw new Error(DEMO_LIMIT_MESSAGE);
  const a = await consume(`v:${v}`, "check", DEMO_CHECKS);
  if (a < 0) throw new Error(DEMO_LIMIT_MESSAGE);
  return a;
}

/** Supporting demo calls (role search, page reads, research) require sign-in and are allowed only while checks remain. */
export async function allowDemo(kind: keyof typeof LIMITS, customAuthHeader?: string | null): Promise<void> {
  const v = await demoUser(customAuthHeader);
  if (!v) {
    if (kind === "search") throw new Error("Sign in to search roles for free, or add your own Tavily key in Settings.");
    if (kind === "extract") throw new Error("Sign in to read job postings for free, or add your own Tavily key in Settings.");
    throw new Error(DEMO_SIGNUP_MESSAGE);
  }
  const limit = LIMITS[kind];
  if (limit === undefined) throw new Error('Unknown free feature.');
  if ((await consume(`v:${v}`, kind, limit)) < 0) throw new Error('Your free research allowance for today is used up. Connect your own Tavily key to continue.');
}

/** Independent per-feature quota for signed-in users (e.g. ATS reviews): does not draw from the shared check pool. */
export async function useKindQuota(kind: keyof typeof LIMITS, limitMessage = DEMO_LIMIT_MESSAGE, customAuthHeader?: string | null): Promise<void> {
  const v = await demoUser(customAuthHeader);
  if (!v) throw new Error(DEMO_SIGNUP_MESSAGE);
  const limit = LIMITS[kind];
  if (limit === undefined) throw new Error('Unknown free feature.');
  if ((await consume(`v:${v}`, kind, limit)) < 0) throw new Error(limitMessage);
}

export async function useCompanyDiscovery(company: string, domain?: string) {
  const user = await visitor();
  const resource = (domain || company).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] || company.trim().toLowerCase();
  const { data, error } = await supabaseAdmin.rpc('consume_feature_allowance', { _user: user, _kind: 'company', _resource: resource });
  if (error) throw new Error('Company allowance could not be checked.');
  if (Number(data) < 0) throw new Error('You have discovered your 5 free companies. Connect your own Tavily key for unlimited company discovery.');
}

/** Resolve a provider key: the user's own key, or the owner's server key under demo limits. */
export async function demoKey(own: string | undefined, env: "NEBIUS_API_KEY" | "TAVILY_API_KEY", kind?: keyof typeof LIMITS, customAuthHeader?: string | null) {
  if (own) return own;
  const key = process.env[env];
  if (!key) throw new Error(`Add your ${env.startsWith("N") ? "Nebius" : "Tavily"} API key in Settings first.`);
  if (kind) await allowDemo(kind, customAuthHeader);
  return key;
}
