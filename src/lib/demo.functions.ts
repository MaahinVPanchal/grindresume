import { createServerFn } from "@tanstack/react-start";

/** Free demo checks left today for the signed-in user; 0 when signed out. */
export const getDemoStatus = createServerFn({ method: "POST" }).handler(async () => {
  const { demoRemaining, demoUser, DEMO_CHECKS } = await import("./demo.server");
  try {
    const user = await demoUser();
    if (!user) return { remaining: 0, total: DEMO_CHECKS, signedIn: false };
    return { remaining: await demoRemaining(user), total: DEMO_CHECKS, signedIn: true };
  } catch {
    return { remaining: 0, total: DEMO_CHECKS, signedIn: false };
  }
});
