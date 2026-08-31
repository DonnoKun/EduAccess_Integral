-- ROLES
CREATE TYPE public.app_role AS ENUM ('teacher', 'student');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Backfill existing users as students
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'student'::public.app_role FROM public.profiles
ON CONFLICT DO NOTHING;

-- GROUPS
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  level text NOT NULL DEFAULT '',
  join_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO authenticated;
GRANT ALL ON public.groups TO service_role;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.group_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_enrollments TO authenticated;
GRANT ALL ON public.group_enrollments TO service_role;
ALTER TABLE public.group_enrollments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.group_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_lessons TO authenticated;
GRANT ALL ON public.group_lessons TO service_role;
ALTER TABLE public.group_lessons ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.group_lessons(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  progress_percentage integer NOT NULL DEFAULT 0,
  exercises_completed integer NOT NULL DEFAULT 0,
  exercises_total integer NOT NULL DEFAULT 0,
  time_spent_seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- Helper functions (security definer, avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.is_group_owner(_group_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.groups WHERE id = _group_id AND owner_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_enrollments WHERE group_id = _group_id AND student_id = _user_id)
$$;

-- GROUPS policies
CREATE POLICY "Teachers manage own groups" ON public.groups FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id AND public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Students view enrolled groups" ON public.groups FOR SELECT TO authenticated
  USING (public.is_group_member(id, auth.uid()));

-- ENROLLMENT policies
CREATE POLICY "Students view own enrollments" ON public.group_enrollments FOR SELECT TO authenticated
  USING (auth.uid() = student_id);
CREATE POLICY "Teachers view enrollments in own groups" ON public.group_enrollments FOR SELECT TO authenticated
  USING (public.is_group_owner(group_id, auth.uid()));
CREATE POLICY "Students join groups" ON public.group_enrollments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students leave groups" ON public.group_enrollments FOR DELETE TO authenticated
  USING (auth.uid() = student_id);
CREATE POLICY "Teachers remove students" ON public.group_enrollments FOR DELETE TO authenticated
  USING (public.is_group_owner(group_id, auth.uid()));

-- LESSON policies
CREATE POLICY "Teachers manage lessons in own groups" ON public.group_lessons FOR ALL TO authenticated
  USING (public.is_group_owner(group_id, auth.uid()))
  WITH CHECK (public.is_group_owner(group_id, auth.uid()));
CREATE POLICY "Students view published lessons" ON public.group_lessons FOR SELECT TO authenticated
  USING (status = 'published' AND public.is_group_member(group_id, auth.uid()));

-- PROGRESS policies
CREATE POLICY "Students manage own progress" ON public.lesson_progress FOR ALL TO authenticated
  USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Teachers view progress in own groups" ON public.lesson_progress FOR SELECT TO authenticated
  USING (public.is_group_owner(group_id, auth.uid()));

-- updated_at triggers
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_group_lessons_updated_at BEFORE UPDATE ON public.group_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lesson_progress_updated_at BEFORE UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lookup a group by join code without exposing other groups (used before enrollment)
CREATE OR REPLACE FUNCTION public.find_group_by_code(_code text)
RETURNS TABLE (id uuid, name text, description text, level text, owner_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.id, g.name, g.description, g.level, g.owner_id
  FROM public.groups g
  WHERE upper(g.join_code) = upper(_code)
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.find_group_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_group_by_code(text) TO authenticated;

-- Roster with names for teachers, and student view of enrolled groups' teacher name
CREATE OR REPLACE FUNCTION public.get_group_roster(_group_id uuid)
RETURNS TABLE (student_id uuid, student_name text, enrolled_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.student_id, COALESCE(p.user_name, ''), e.created_at
  FROM public.group_enrollments e
  LEFT JOIN public.profiles p ON p.user_id = e.student_id
  WHERE e.group_id = _group_id AND public.is_group_owner(_group_id, auth.uid())
  ORDER BY e.created_at
$$;
REVOKE ALL ON FUNCTION public.get_group_roster(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_group_roster(uuid) TO authenticated;