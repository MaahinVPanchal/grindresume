import { createServerFn } from "@tanstack/react-start";

/** Free demo checks left today for this visitor; sets the visitor cookie if missing. */
export const getDemoStatus = createServerFn({ method: "POST" }).handler(async () => {
  const { demoRemaining, DEMO_CHECKS } = await import("./demo.server");
  try {
    return { remaining: await demoRemaining(), total: DEMO_CHECKS };
  } catch {
    return { remaining: 0, total: DEMO_CHECKS };
  }
});
