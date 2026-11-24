CREATE TABLE public.circuit_breaker_state (
  service text PRIMARY KEY,
  state text NOT NULL DEFAULT 'CLOSED' CHECK (state IN ('CLOSED','OPEN','HALF_OPEN')),
  consecutive_failures int NOT NULL DEFAULT 0,
  opened_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.resilience_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  function_name text NOT NULL,
  provider_used text,
  path text NOT NULL CHECK (path IN ('primary','secondary','cache','failed')),
  latency_ms int NOT NULL DEFAULT 0,
  success boolean NOT NULL,
  http_status int,
  tokens int,
  degraded boolean NOT NULL DEFAULT false,
  request_hash text
);
CREATE INDEX resilience_metrics_created_idx ON public.resilience_metrics(created_at DESC);
CREATE TABLE public.ai_cache (
  request_hash text PRIMARY KEY,
  function_name text NOT NULL,
  response jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.remediation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','failed','compensated')),
  step text,
  completed_steps text[] NOT NULL DEFAULT '{}',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  error text,
  locked_until timestamptz,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX remediation_jobs_status_idx ON public.remediation_jobs(status, created_at);
CREATE TABLE public.ai_rate_limits (
  user_id uuid NOT NULL,
  window_start timestamptz NOT NULL,
  count int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, window_start)
);
GRANT ALL ON public.circuit_breaker_state, public.resilience_metrics, public.ai_cache, public.remediation_jobs, public.ai_rate_limits TO service_role;
GRANT SELECT ON public.remediation_jobs TO authenticated;
ALTER TABLE public.circuit_breaker_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resilience_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remediation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own jobs" ON public.remediation_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.consume_ai_rate_limit(_user_id uuid, _limit int)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w timestamptz := date_trunc('minute', now()); c int;
BEGIN
  INSERT INTO public.ai_rate_limits(user_id, window_start, count) VALUES (_user_id, w, 1)
  ON CONFLICT (user_id, window_start) DO UPDATE SET count = ai_rate_limits.count + 1
  RETURNING count INTO c;
  DELETE FROM public.ai_rate_limits WHERE window_start < now() - interval '1 hour';
  RETURN c <= _limit;
END $$;
REVOKE ALL ON FUNCTION public.consume_ai_rate_limit(uuid,int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_rate_limit(uuid,int) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_remediation_jobs(_limit int)
RETURNS SETOF public.remediation_jobs LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.remediation_jobs j SET status='processing', locked_until=now()+interval '2 minutes', attempts=attempts+1, updated_at=now()
  WHERE j.id IN (SELECT id FROM public.remediation_jobs
    WHERE (status='pending' OR (status='processing' AND locked_until < now())) AND attempts < 3
    ORDER BY created_at LIMIT _limit FOR UPDATE SKIP LOCKED)
  RETURNING j.*;
$$;
REVOKE ALL ON FUNCTION public.claim_remediation_jobs(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_remediation_jobs(int) TO service_role;