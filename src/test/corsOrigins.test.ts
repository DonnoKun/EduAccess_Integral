import { describe, expect, it } from "vitest";
import { isAllowedOrigin } from "../../supabase/functions/_shared/cors";

const req = (origin: string) => new Request("https://x.test", { headers: { Origin: origin } });

describe("AI services accept the app's own addresses", () => {
  it("accepts the production Vercel domain eduaccessintegral.vercel.app", () => {
    expect(isAllowedOrigin(req("https://eduaccessintegral.vercel.app"))).toBe(true);
  });
  it("accepts the hyphenated Vercel domain", () => {
    expect(isAllowedOrigin(req("https://edu-access-integral.vercel.app"))).toBe(true);
  });
  it("rejects unrelated sites", () => {
    expect(isAllowedOrigin(req("https://evil.vercel.app"))).toBe(false);
  });
});
