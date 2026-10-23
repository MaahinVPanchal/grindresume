import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "grinder.keys.v1";
export type Keys = { tavily: string; nebius: string; model: string };
const empty: Keys = { tavily: "", nebius: "", model: "" };
// Stored keys remember which account they belong to ("" = entered while signed out),
// so one person's keys are never shown to or uploaded for another account on the same browser.
type Stored = Keys & { owner?: string };

function readStored(): Stored {
  if (typeof window === "undefined") return empty;
  try {
    return { ...empty, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return empty;
  }
}

function read(): Keys {
  const { tavily, nebius, model } = readStored();
  return { tavily, nebius, model };
}

let currentUser: string | null = null;

function writeLocal(next: Keys, owner = currentUser ?? "") {
  localStorage.setItem(KEY, JSON.stringify({ ...next, owner }));
  window.dispatchEvent(new Event("grinder-keys"));
}

function clearLocal() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("grinder-keys"));
}

async function pushToAccount(k: Keys) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase
    .from("user_api_keys")
    .upsert({ user_id: data.user.id, ...k, updated_at: new Date().toISOString() });
}

export function saveKeys(k: Partial<Keys>) {
  const next = { ...read(), ...k };
  writeLocal(next);
  void pushToAccount(next);
}

/** Show only the signed-in account's own keys; never reuse keys left by someone else. */
async function syncFromAccount() {
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id ?? null;
  currentUser = uid;
  const local = readStored();
  if (!uid) {
    // Signed out: keep only keys typed while signed out.
    if (local.owner) clearLocal();
    return;
  }
  const { data: row } = await supabase
    .from("user_api_keys")
    .select("tavily, nebius, model")
    .eq("user_id", uid)
    .maybeSingle();
  if (row && (row.tavily || row.nebius)) {
    writeLocal({ tavily: row.tavily || "", nebius: row.nebius || "", model: row.model || "" }, uid);
  } else if (local.owner === "" && (local.tavily || local.nebius)) {
    // Keys this visitor typed before signing in become theirs.
    writeLocal(local, uid);
    await pushToAccount(local);
  } else if (local.owner !== uid) {
    clearLocal();
  }
}

let started = false;
function startSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  void syncFromAccount();
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      currentUser = null;
      clearLocal();
    }
    if (event === "SIGNED_IN") void syncFromAccount();
  });
}

export function useKeys(): Keys {
  const [k, setK] = useState<Keys>(empty);
  useEffect(() => {
    startSync();
    setK(read());
    const h = () => setK(read());
    window.addEventListener("grinder-keys", h);
    return () => window.removeEventListener("grinder-keys", h);
  }, []);
  return k;
}
