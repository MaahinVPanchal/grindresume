import { createServerFn } from "@tanstack/react-start";

/** Free demo checks left today for the signed-in user (0 for signed-out visitors). */
export const getDemoStatus = createServerFn({ method: "POST" }).handler(async () => {
  const { demoRemaining, DEMO_CHECKS, getAuthUserId } = await import("./demo.server");
  try {
    const uid = await getAuthUserId();
    const remaining = uid ? await demoRemaining(uid) : 0;
    return { remaining, total: DEMO_CHECKS, signedIn: !!uid };
  } catch {
    return { remaining: 0, total: DEMO_CHECKS, signedIn: false };
  }
});
