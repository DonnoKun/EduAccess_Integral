import { aiEndpoint, jsonRes } from "../_shared/ai-endpoint.ts";
import { Input, altText } from "../_shared/microservices.ts";
Deno.serve(aiEndpoint(Input, async ({ data, cors }) => jsonRes(cors, { success: true, result: await altText(data) }), { maxBytes: 12500000 }));
