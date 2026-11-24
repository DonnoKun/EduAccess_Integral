/**
 * S4 orchestrator worker: consumes remediation_jobs (SKIP LOCKED queue), runs the
 * SAGA alt-text → data-image-description → ocr-tts → wcag-verify, compensating
 * completed steps when a later step fails. Called by a scheduler.
 */
import { authenticateCronRequest } from "../_shared/cron-auth.ts";
import { admin } from "../_shared/ai-gateway.ts";
import { altText, dataImageDescription, ocrTts, wcagVerify, MsInput } from "../_shared/microservices.ts";

const STEPS: { name: string; run: (i: MsInput) => unknown; compensate: (result: Record<string, unknown>) => void }[] = [
  { name: "alt-text", run: altText, compensate: (r) => { delete r["alt-text"]; } },
  { name: "data-image-description", run: dataImageDescription, compensate: (r) => { delete r["data-image-description"]; } },
  { name: "ocr-tts", run: ocrTts, compensate: (r) => { delete r["ocr-tts"]; } },
  { name: "wcag-verify", run: wcagVerify, compensate: (r) => { delete r["wcag-verify"]; } },
];
const BATCH = 3;

Deno.serve(async (req) => {
  const authFailure = authenticateCronRequest(req);
  if (authFailure) return authFailure;
  const db = admin();
  const { data: jobs, error } = await db.rpc("claim_remediation_jobs", { _limit: BATCH });
  if (error) return Response.json({ success: false, error: error.message }, { status: 500 });
  const out: { id: string; status: string }[] = [];
  for (const job of jobs ?? []) {
    const result: Record<string, unknown> = { ...(job.result ?? {}) };
    const done: string[] = [...(job.completed_steps ?? [])];
    let status = "done", errMsg: string | null = null;
    for (const step of STEPS) {
      if (done.includes(step.name)) continue; // idempotent resume
      try {
        await db.from("remediation_jobs").update({ step: step.name, updated_at: new Date().toISOString() }).eq("id", job.id);
        result[step.name] = await step.run(job.payload as MsInput);
        done.push(step.name);
        await db.from("remediation_jobs").update({ result, completed_steps: done }).eq("id", job.id);
      } catch (e) {
        errMsg = `${step.name}: ${(e as Error).message}`;
        if ((e as { status?: number }).status === 402) { status = "failed"; break; }
        for (const prev of [...STEPS].reverse()) if (done.includes(prev.name)) prev.compensate(result);
        status = done.length ? "compensated" : "failed";
        done.length = 0;
        break;
      }
    }
    await db.from("remediation_jobs").update({ status, step: status, result, completed_steps: done, error: errMsg, locked_until: null, updated_at: new Date().toISOString() }).eq("id", job.id);
    out.push({ id: job.id, status });
  }
  return Response.json({ success: true, processed: out });
});
