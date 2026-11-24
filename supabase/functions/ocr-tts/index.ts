import { aiEndpoint, jsonRes } from "../_shared/ai-endpoint.ts";
import { Input, ocrTts } from "../_shared/microservices.ts";
Deno.serve(aiEndpoint(Input, async ({ data, cors }) => jsonRes(cors, { success: true, result: await ocrTts(data) })));
