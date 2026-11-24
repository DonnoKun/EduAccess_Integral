/** S3 entry point: enqueues a remediation job on the event bus (remediation_jobs). */
import { aiEndpoint, jsonRes } from "../_shared/ai-endpoint.ts";
import { admin } from "../_shared/ai-gateway.ts";
import { Input } from "../_shared/microservices.ts";
Deno.serve(aiEndpoint(Input, async ({ data, userId, cors }) => {
  const { data: job, error } = await admin().from("remediation_jobs").insert({ user_id: userId, payload: data, status: "pending", step: "queued" }).select("id,status").single();
  if (error) throw error;
  return jsonRes(cors, { success: true, jobId: job.id, status: job.status }, 202);
}));
