DROP POLICY IF EXISTS "Signed-in users read course cache" ON public.course_cache;
CREATE POLICY "Users read own course cache rows" ON public.course_cache FOR SELECT TO authenticated USING (created_by = auth.uid());

CREATE OR REPLACE FUNCTION public.get_course_cache(_key text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT c.content FROM public.course_cache c
  WHERE auth.uid() IS NOT NULL AND c.cache_key = _key
  LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.get_course_cache(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_course_cache(text) TO authenticated;