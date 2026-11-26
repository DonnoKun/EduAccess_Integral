ALTER TABLE public.group_invitations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz;

DROP POLICY IF EXISTS "Students decline invitations" ON public.group_invitations;

CREATE OR REPLACE FUNCTION public.list_my_invitations()
 RETURNS TABLE(id uuid, group_id uuid, group_name text, group_level text, created_at timestamp with time zone)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.group_invitations i SET seen_at = now()
   WHERE i.student_id = auth.uid() AND i.status = 'pending' AND i.seen_at IS NULL;
  RETURN QUERY SELECT i.id, g.id, g.name, g.level, i.created_at
    FROM public.group_invitations i JOIN public.groups g ON g.id = i.group_id
    WHERE i.student_id = auth.uid() AND i.status = 'pending' ORDER BY i.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.accept_group_invitation(_invitation_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _inv public.group_invitations;
BEGIN
  SELECT * INTO _inv FROM public.group_invitations WHERE id = _invitation_id AND student_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  INSERT INTO public.group_enrollments (group_id, student_id, teacher_id)
  SELECT _inv.group_id, _inv.student_id, _inv.teacher_id
  WHERE NOT EXISTS (SELECT 1 FROM public.group_enrollments WHERE group_id = _inv.group_id AND student_id = _inv.student_id);
  UPDATE public.group_invitations SET status = 'accepted', responded_at = now(), seen_at = coalesce(seen_at, now()) WHERE id = _inv.id;
  RETURN jsonb_build_object('success', true, 'group_id', _inv.group_id);
END $$;

CREATE OR REPLACE FUNCTION public.decline_group_invitation(_invitation_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.group_invitations SET status = 'declined', responded_at = now(), seen_at = coalesce(seen_at, now())
   WHERE id = _invitation_id AND student_id = auth.uid() AND status = 'pending';
  RETURN jsonb_build_object('success', FOUND);
END $$;
REVOKE EXECUTE ON FUNCTION public.decline_group_invitation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decline_group_invitation(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_group_invitations(_group_id uuid)
 RETURNS TABLE(id uuid, student_name text, student_email text, status text, sent_at timestamptz, seen_at timestamptz, responded_at timestamptz)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT i.id, coalesce(p.user_name, ''), u.email::text, i.status, i.created_at, i.seen_at, i.responded_at
  FROM public.group_invitations i
  LEFT JOIN public.profiles p ON p.user_id = i.student_id
  LEFT JOIN auth.users u ON u.id = i.student_id
  WHERE i.group_id = _group_id AND public.is_group_owner(_group_id, auth.uid())
  ORDER BY i.created_at DESC
$$;
REVOKE EXECUTE ON FUNCTION public.get_group_invitations(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_group_invitations(uuid) TO authenticated;

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
  VALUES (_group_id, _sid, auth.uid())
  ON CONFLICT (group_id, student_id) DO UPDATE
    SET status = 'pending', seen_at = NULL, responded_at = NULL, created_at = now(), teacher_id = EXCLUDED.teacher_id;
  RETURN jsonb_build_object('success', true, 'invited', true);
END; $function$;