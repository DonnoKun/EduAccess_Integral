import { aiEndpoint, jsonRes } from "../_shared/ai-endpoint.ts";
import { Input, dataImageDescription } from "../_shared/microservices.ts";
Deno.serve(aiEndpoint(Input, async ({ data, cors }) => jsonRes(cors, { success: true, result: await dataImageDescription(data) }), { maxBytes: 12500000 }));
