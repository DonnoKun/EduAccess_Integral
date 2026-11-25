CREATE OR REPLACE FUNCTION public.persist_benchmark_metric(_metric jsonb) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
INSERT INTO public.resilience_metrics (function_name,provider_used,path,latency_ms,success,http_status,tokens,degraded,request_hash,benchmark_run_id,config,phase,batch_run_id,rep_index,scenario,call_index,concurrency)
SELECT function_name,provider_used,path,latency_ms,success,http_status,tokens,degraded,request_hash,benchmark_run_id,config,phase,batch_run_id,rep_index,scenario,call_index,concurrency
FROM jsonb_populate_record(NULL::public.resilience_metrics,_metric)
ON CONFLICT (batch_run_id,(COALESCE(concurrency,0)),rep_index,scenario,config,phase,call_index) WHERE batch_run_id IS NOT NULL DO NOTHING;
$$;
REVOKE ALL ON FUNCTION public.persist_benchmark_metric(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.persist_benchmark_metric(jsonb) TO service_role;