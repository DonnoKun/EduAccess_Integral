ALTER TABLE public.course_cache ADD COLUMN IF NOT EXISTS is_shared boolean NOT NULL DEFAULT false;
UPDATE public.course_cache SET is_shared = true WHERE cache_key LIKE '%\_\_es' OR cache_key LIKE '%\_\_en';

CREATE OR REPLACE FUNCTION public.get_course_cache(_key text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT content FROM public.course_cache
  WHERE cache_key = _key AND auth.uid() IS NOT NULL
    AND (is_shared OR created_by = auth.uid())
  LIMIT 1;
$$;

CREATE TABLE public.group_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, student_id)
);
ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, DELETE ON public.group_invitations TO authenticated;
CREATE POLICY "Students view own invitations" ON public.group_invitations FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Students decline invitations" ON public.group_invitations FOR DELETE TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Teachers view invitations of own groups" ON public.group_invitations FOR SELECT TO authenticated USING (public.is_group_owner(group_id, auth.uid()));
CREATE POLICY "Teachers cancel invitations" ON public.group_invitations FOR DELETE TO authenticated USING (public.is_group_owner(group_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.enroll_student_by_email(_group_id uuid, _email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _sid uuid;
BEGIN
  IF NOT public.is_group_owner(_group_id, auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;
  SELECT id INTO _sid FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  IF _sid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'user_not_found'); END IF;
  IF _sid = auth.uid() THEN RETURN jsonb_build_object('success', false, 'error', 'user_not_found'); END IF;
  IF EXISTS (SELECT 1 FROM public.group_enrollments WHERE group_id = _group_id AND student_id = _sid) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_enrolled');
  END IF;
  INSERT INTO public.group_invitations (group_id, student_id, teacher_id)
  VALUES (_group_id, _sid, auth.uid()) ON CONFLICT (group_id, student_id) DO NOTHING;
  RETURN jsonb_build_object('success', true, 'invited', true);
END; $$;

CREATE OR REPLACE FUNCTION public.list_my_invitations()
RETURNS TABLE(id uuid, group_id uuid, group_name text, group_level text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, g.id, g.name, g.level, i.created_at
  FROM public.group_invitations i JOIN public.groups g ON g.id = i.group_id
  WHERE i.student_id = auth.uid() ORDER BY i.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.accept_group_invitation(_invitation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _inv public.group_invitations;
BEGIN
  SELECT * INTO _inv FROM public.group_invitations WHERE id = _invitation_id AND student_id = auth.uid();
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  INSERT INTO public.group_enrollments (group_id, student_id, teacher_id)
  SELECT _inv.group_id, _inv.student_id, _inv.teacher_id
  WHERE NOT EXISTS (SELECT 1 FROM public.group_enrollments WHERE group_id = _inv.group_id AND student_id = _inv.student_id);
  DELETE FROM public.group_invitations WHERE id = _inv.id;
  RETURN jsonb_build_object('success', true, 'group_id', _inv.group_id);
END; $$;

REVOKE EXECUTE ON FUNCTION public.list_my_invitations() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.accept_group_invitation(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.list_my_invitations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_group_invitation(uuid) TO authenticated;