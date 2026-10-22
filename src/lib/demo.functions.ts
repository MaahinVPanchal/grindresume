import { createServerFn } from "@tanstack/react-start";

/** Free demo checks left today for this visitor; sets the visitor cookie if missing. */
export const getDemoStatus = createServerFn({ method: "POST" }).handler(async () => {
  const { demoRemaining, demoUser, DEMO_CHECKS } = await import("./demo.server");
  try {
    if (!(await demoUser())) return { remaining: 0, total: DEMO_CHECKS, signedIn: false };
    return { remaining: await demoRemaining(), total: DEMO_CHECKS, signedIn: true };
  } catch {
    return { remaining: 0, total: DEMO_CHECKS, signedIn: true };
  }
});
