CREATE OR REPLACE FUNCTION public.enroll_student_by_email(_group_id uuid, _email text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _sid uuid;
BEGIN
  IF NOT public.is_group_owner(_group_id, auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;
  SELECT id INTO _sid FROM auth.users WHERE lower(email) = lower(regexp_replace(_email, '\s', '', 'g')) LIMIT 1;
  IF _sid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'user_not_found'); END IF;
  IF _sid = auth.uid() THEN RETURN jsonb_build_object('success', false, 'error', 'self'); END IF;
  IF public.has_role(_sid, 'teacher') THEN RETURN jsonb_build_object('success', false, 'error', 'not_student'); END IF;
  IF EXISTS (SELECT 1 FROM public.group_enrollments WHERE group_id = _group_id AND student_id = _sid) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_enrolled');
  END IF;
  INSERT INTO public.group_invitations (group_id, student_id, teacher_id)
  VALUES (_group_id, _sid, auth.uid()) ON CONFLICT (group_id, student_id) DO NOTHING;
  RETURN jsonb_build_object('success', true, 'invited', true);
END; $function$;