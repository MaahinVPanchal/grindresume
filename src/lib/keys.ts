import { useEffect, useState } from "react";

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

export function saveKeys(k: Partial<Keys>) {
  const next = { ...read(), ...k };
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("grinder-keys"));
}

export function useKeys(): Keys {
  const [k, setK] = useState<Keys>(empty);
  useEffect(() => {
    setK(read());
    const h = () => setK(read());
    window.addEventListener("grinder-keys", h);
    return () => window.removeEventListener("grinder-keys", h);
  }, []);
  return k;
}
