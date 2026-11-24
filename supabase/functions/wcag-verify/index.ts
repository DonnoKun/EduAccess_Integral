import { aiEndpoint, jsonRes } from "../_shared/ai-endpoint.ts";
import { admin } from "../_shared/ai-gateway.ts";
import { Input, wcagVerify } from "../_shared/microservices.ts";
Deno.serve(aiEndpoint(Input, async ({ data, cors }) => {
  const t = Date.now();
  const result = wcagVerify(data);
  await admin().from("resilience_metrics").insert({ function_name: "wcag-verify", provider_used: "rules", path: "primary", latency_ms: Date.now() - t, success: true, http_status: 200, degraded: false });
  return jsonRes(cors, { success: true, result });
}));
