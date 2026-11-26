CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
    AND (auth.uid() IS NULL OR _user_id = auth.uid())
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

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
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _sid AND role = 'teacher') THEN RETURN jsonb_build_object('success', false, 'error', 'not_student'); END IF;
  IF EXISTS (SELECT 1 FROM public.group_enrollments WHERE group_id = _group_id AND student_id = _sid) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_enrolled');
  END IF;
  INSERT INTO public.group_invitations (group_id, student_id, teacher_id)
  VALUES (_group_id, _sid, auth.uid()) ON CONFLICT (group_id, student_id) DO NOTHING;
  RETURN jsonb_build_object('success', true, 'invited', true);
END; $function$;

CREATE OR REPLACE FUNCTION public.enforce_lesson_progress_scoring()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE ex jsonb; i int := 0; total int := 0; correct int := 0; blocked boolean := false; g text;
  words int; min_secs int; started timestamptz;
BEGIN
  FOR ex IN SELECT value FROM jsonb_array_elements(coalesce(NEW.lesson_snapshot->'content'->'exercises','[]'::jsonb)) LOOP
    total := total + 1;
    g := public.grade_lesson_answer(NEW.exercise_answers->>(i::text), ex->>'answer_keywords', ex->>'solution');
    IF g = 'correct' THEN correct := correct + 1; END IF;
    IF g = 'incorrect' THEN blocked := true; END IF;
    i := i + 1;
  END LOOP;
  NEW.exercises_total := total;
  NEW.exercises_completed := correct;
  IF total > 0 THEN
    NEW.completed := NEW.completed AND NOT blocked;
    NEW.progress_percentage := CASE WHEN NEW.completed THEN 100 ELSE round(correct * 100.0 / total)::int END;
  ELSE
    words := coalesce(array_length(regexp_split_to_array(btrim(coalesce(NEW.lesson_snapshot->>'content','')), '\s+'), 1), 0);
    min_secs := least(greatest((words * 60 / 200) / 4, 20), 600);
    started := CASE WHEN TG_OP = 'INSERT' THEN now() ELSE OLD.created_at END;
    IF NEW.completed AND now() - started < make_interval(secs => min_secs) THEN
      NEW.completed := CASE WHEN TG_OP = 'UPDATE' THEN OLD.completed ELSE false END;
    END IF;
    NEW.progress_percentage := CASE WHEN NEW.completed THEN 100 ELSE least(greatest(NEW.progress_percentage,0),99) END;
  END IF;
  RETURN NEW;
END $function$;