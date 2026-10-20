ALTER TABLE public.group_lessons ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;
CREATE TABLE public.lesson_drafts (
 lesson_id uuid PRIMARY KEY REFERENCES public.group_lessons(id) ON DELETE CASCADE,
 payload jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_drafts TO authenticated;
GRANT ALL ON public.lesson_drafts TO service_role;
ALTER TABLE public.lesson_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group owners manage lesson drafts" ON public.lesson_drafts FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.group_lessons l WHERE l.id = lesson_id AND public.is_group_owner(l.group_id, auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM public.group_lessons l WHERE l.id = lesson_id AND public.is_group_owner(l.group_id, auth.uid())));
ALTER TABLE public.lesson_progress ADD COLUMN IF NOT EXISTS lesson_snapshot jsonb;
ALTER TABLE public.lesson_progress ADD COLUMN IF NOT EXISTS exercise_answers jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.lesson_progress ADD COLUMN IF NOT EXISTS exercise_results jsonb NOT NULL DEFAULT '{}'::jsonb;
UPDATE public.lesson_progress p SET lesson_snapshot = jsonb_build_object('id', l.id, 'group_id', l.group_id, 'created_by', l.created_by, 'title', l.title, 'description', l.description, 'content', l.content, 'status', l.status, 'published_at', l.published_at, 'created_at', l.created_at, 'updated_at', l.updated_at, 'revision', l.revision) FROM public.group_lessons l WHERE p.lesson_id = l.id AND p.lesson_snapshot IS NULL;
CREATE OR REPLACE FUNCTION public.pin_lesson_progress_snapshot() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.group_lessons;
BEGIN
 IF TG_OP = 'INSERT' THEN
  SELECT * INTO l FROM public.group_lessons WHERE id = NEW.lesson_id AND group_id = NEW.group_id AND status = 'published';
  IF NOT FOUND OR NOT public.is_group_member(NEW.group_id, NEW.student_id) THEN RAISE EXCEPTION 'Published enrolled lesson required'; END IF;
  NEW.lesson_snapshot := to_jsonb(l);
 ELSE
  NEW.lesson_snapshot := OLD.lesson_snapshot;
  NEW.lesson_id := OLD.lesson_id; NEW.group_id := OLD.group_id; NEW.student_id := OLD.student_id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER pin_lesson_progress_snapshot BEFORE INSERT OR UPDATE ON public.lesson_progress FOR EACH ROW EXECUTE FUNCTION public.pin_lesson_progress_snapshot();
CREATE OR REPLACE FUNCTION public.increment_lesson_revision() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.content IS DISTINCT FROM OLD.content OR NEW.title IS DISTINCT FROM OLD.title OR NEW.description IS DISTINCT FROM OLD.description THEN NEW.revision := OLD.revision + 1; ELSE NEW.revision := OLD.revision; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER increment_lesson_revision BEFORE UPDATE ON public.group_lessons FOR EACH ROW EXECUTE FUNCTION public.increment_lesson_revision();