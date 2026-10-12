import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "grinder.keys.v1";
export type Keys = { tavily: string; nebius: string; model: string };
const empty: Keys = { tavily: "", nebius: "", model: "" };

function read(): Keys {
  if (typeof window === "undefined") return empty;
  try {
    return { ...empty, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return empty;
  }
}

function writeLocal(next: Keys) {
  localStorage.setItem(KEY, JSON.stringify(next));
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

/** Load keys saved to the signed-in account; upload local keys if the account has none. */
async function syncFromAccount() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  const { data: row } = await supabase
    .from("user_api_keys")
    .select("tavily, nebius, model")
    .eq("user_id", data.user.id)
    .maybeSingle();
  const local = read();
  if (row && (row.tavily || row.nebius)) writeLocal({ ...local, ...row });
  else if (local.tavily || local.nebius) await pushToAccount(local);
}

let started = false;
function startSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  void syncFromAccount();
  supabase.auth.onAuthStateChange((event) => {
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
