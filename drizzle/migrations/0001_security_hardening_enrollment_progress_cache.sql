CREATE TABLE public.account_recovery (
  user_id uuid PRIMARY KEY,
  code_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.account_recovery TO service_role;
ALTER TABLE public.account_recovery ENABLE ROW LEVEL SECURITY;

-- Enrollment only via join code RPC
DROP POLICY IF EXISTS "Students join groups" ON public.group_enrollments;

CREATE OR REPLACE FUNCTION public.join_group_by_code(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE g public.groups;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'unknown'); END IF;
  SELECT * INTO g FROM public.groups WHERE upper(join_code) = upper(trim(_code)) LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF g.owner_id = auth.uid() THEN RETURN jsonb_build_object('success', false, 'error', 'own_group'); END IF;
  IF EXISTS (SELECT 1 FROM public.group_enrollments WHERE group_id = g.id AND student_id = auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already'); END IF;
  INSERT INTO public.group_enrollments (group_id, student_id, teacher_id) VALUES (g.id, auth.uid(), g.owner_id);
  RETURN jsonb_build_object('success', true, 'id', g.id, 'name', g.name, 'description', g.description, 'level', g.level, 'owner_id', g.owner_id);
END $$;
REVOKE EXECUTE ON FUNCTION public.join_group_by_code(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.join_group_by_code(text) TO authenticated;

-- Progress only while enrolled
DROP POLICY IF EXISTS "Students manage own progress" ON public.lesson_progress;
CREATE POLICY "Enrolled students manage own progress" ON public.lesson_progress FOR ALL TO authenticated
  USING (auth.uid() = student_id AND public.is_group_member(group_id, auth.uid()))
  WITH CHECK (auth.uid() = student_id AND public.is_group_member(group_id, auth.uid()));

-- Course cache rows scoped to creator
ALTER TABLE public.course_cache ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
DROP POLICY IF EXISTS "Authenticated users can insert course cache" ON public.course_cache;
CREATE POLICY "Users insert own course cache rows" ON public.course_cache FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());