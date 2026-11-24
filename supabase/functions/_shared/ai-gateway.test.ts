import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { breakerAfter, breakerDecision, callWithRetry, TransientError } from "./ai-gateway.ts";

Deno.test("breaker opens after 5 consecutive failures", () => {
  let row: any = null;
  for (let i = 0; i < 4; i++) row = { service: "s", ...breakerAfter(row, false, 5) };
  assertEquals(row.state, "CLOSED");
  row = { service: "s", ...breakerAfter(row, false, 5) };
  assertEquals(row.state, "OPEN");
});
Deno.test("open breaker blocks primary for 30s then allows one half-open trial", () => {
  const row: any = { service: "s", state: "OPEN", consecutive_failures: 5, opened_at: new Date(1000).toISOString() };
  assertEquals(breakerDecision(row, 1000 + 29_000, 30_000).allow, false);
  assertEquals(breakerDecision(row, 1000 + 30_000, 30_000), { allow: true, transitionTo: "HALF_OPEN" });
  assertEquals(breakerDecision({ ...row, state: "HALF_OPEN" }, 99_999_999, 30_000).allow, false);
});
Deno.test("half-open failure reopens, success closes", () => {
  const half: any = { service: "s", state: "HALF_OPEN", consecutive_failures: 5, opened_at: null };
  assertEquals(breakerAfter(half, false).state, "OPEN");
  assertEquals(breakerAfter(half, true), { state: "CLOSED", consecutive_failures: 0, opened_at: null });
});
Deno.test("retries transient errors exactly 2 times", async () => {
  let calls = 0;
  const a = { name: "x", call: async () => { calls++; throw new TransientError("boom", 503); } };
  try { await callWithRetry(a, { messages: [] }, { timeoutMs: 1000, maxRetries: 2, sleepFn: async () => {} }); } catch { /* expected */ }
  assertEquals(calls, 3);
});
Deno.test("timeout aborts and counts as failure", async () => {
  const a = { name: "x", call: (_r: unknown, signal: AbortSignal) => new Promise<never>((_, rej) => signal.addEventListener("abort", () => rej(Object.assign(new Error("a"), { name: "AbortError" })))) };
  let err: any;
  try { await callWithRetry(a, { messages: [] }, { timeoutMs: 20, maxRetries: 0, sleepFn: async () => {} }); } catch (e) { err = e; }
  assert(err instanceof TransientError); assertEquals(err.status, 504);
});
