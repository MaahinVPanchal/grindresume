import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SIGN_IN_REQUIRED_MESSAGE, DEMO_LIMIT_MESSAGE, demoKey } from "@/lib/demo.server";

describe("Demo & Auth quotas", () => {
  const originalTavily = process.env["TAVILY_API_KEY"];

  beforeEach(() => {
    process.env["TAVILY_API_KEY"] = "mock-server-key";
  });

  afterEach(() => {
    if (originalTavily !== undefined) {
      process.env["TAVILY_API_KEY"] = originalTavily;
    } else {
      delete process.env["TAVILY_API_KEY"];
    }
  });

  it("defines the expected sign in required message", () => {
    expect(SIGN_IN_REQUIRED_MESSAGE).toBe("Sign up free to get 3 free checks a day - no API keys needed.");
  });

  it("defines the expected demo limit exhausted message", () => {
    expect(DEMO_LIMIT_MESSAGE).toContain("You've used your 3 free checks for today");
  });

  it("allows BYOK keys directly without requiring auth or limits", async () => {
    const customKey = "custom-nebius-key-12345";
    const resolved = await demoKey(customKey, "NEBIUS_API_KEY");
    expect(resolved).toBe(customKey);
  });

  it("rejects signed-out demo calls when no key is supplied", async () => {
    await expect(demoKey(undefined, "TAVILY_API_KEY", "search")).rejects.toThrow(
      "Sign in to search roles for free, or add your own Tavily key in Settings."
    );
  });
});
