ALTER TABLE public.resilience_metrics ADD COLUMN IF NOT EXISTS benchmark_run_id uuid, ADD COLUMN IF NOT EXISTS config text, ADD COLUMN IF NOT EXISTS phase text;
CREATE INDEX IF NOT EXISTS resilience_metrics_benchmark_run_idx ON public.resilience_metrics (benchmark_run_id);
CREATE OR REPLACE FUNCTION public.get_benchmark_metrics(_run_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY m.created_at), '[]'::jsonb) FROM public.resilience_metrics m WHERE m.benchmark_run_id = _run_id
$$;
REVOKE ALL ON FUNCTION public.get_benchmark_metrics(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_benchmark_metrics(uuid) TO service_role;