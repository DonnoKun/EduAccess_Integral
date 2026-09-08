CREATE OR REPLACE FUNCTION public.enroll_student_by_email(_group_id uuid, _email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _student uuid;
  _owner uuid;
BEGIN
  SELECT owner_id INTO _owner FROM public.groups WHERE id = _group_id;
  IF _owner IS NULL OR _owner <> auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_owner');
  END IF;

  SELECT id INTO _student FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  IF _student IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
  END IF;

  IF _student = _owner THEN
    RETURN jsonb_build_object('success', false, 'error', 'cannot_enroll_self');
  END IF;

  IF EXISTS (SELECT 1 FROM public.group_enrollments WHERE group_id = _group_id AND student_id = _student) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_enrolled');
  END IF;

  INSERT INTO public.group_enrollments (group_id, student_id, teacher_id)
  VALUES (_group_id, _student, _owner);

  RETURN jsonb_build_object('success', true, 'student_id', _student);
END;
$$;

GRANT EXECUTE ON FUNCTION public.enroll_student_by_email(uuid, text) TO authenticated;