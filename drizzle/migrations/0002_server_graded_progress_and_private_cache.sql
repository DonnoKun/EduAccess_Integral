CREATE OR REPLACE FUNCTION public.grade_lesson_answer(_answer text, _keywords text, _solution text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
DECLARE
  norm_ans text; norm_kw text; given_math text[]; ref text; toks text[]; w text;
  expected text[] := '{}'; matched int := 0; recall numeric;
  stop text[] := ARRAY['de','la','el','los','las','y','o','en','a','un','una','the','of','and','to','in'];
BEGIN
  IF _answer IS NULL OR btrim(_answer) = '' THEN RETURN 'incorrect'; END IF;
  norm_ans := translate(lower(_answer), 'áéíóúüñàèìòù', 'aeiouunaeiou');
  SELECT array_agg(m[1]) INTO given_math FROM regexp_matches(replace(regexp_replace(norm_ans, '\s*/\s*', '/', 'g'), ',', '.'), '(-?\d+(?:[./]\d+)?)', 'g') m;
  IF given_math IS NOT NULL THEN
    FOREACH ref IN ARRAY ARRAY[coalesce(_keywords,''), coalesce(_solution,'')] LOOP
      IF ref = '' THEN CONTINUE; END IF;
      SELECT array_agg(m[1]) INTO toks FROM regexp_matches(replace(regexp_replace(translate(lower(ref),'áéíóúüñàèìòù','aeiouunaeiou'), '\s*/\s*', '/', 'g'), ',', '.'), '(-?\d+(?:[./]\d+)?)', 'g') m;
      IF toks IS NULL THEN CONTINUE; END IF;
      IF toks[array_length(toks,1)] = ANY(given_math) THEN RETURN 'correct'; END IF;
      IF ref = _keywords AND given_math && toks THEN RETURN 'partial'; END IF;
    END LOOP;
  END IF;
  IF _keywords IS NULL OR btrim(_keywords) = '' THEN RETURN 'partial'; END IF;
  norm_kw := regexp_replace(translate(lower(_keywords),'áéíóúüñàèìòù','aeiouunaeiou'), '[^\w\s]', ' ', 'g');
  norm_ans := regexp_replace(norm_ans, '[^\w\s]', ' ', 'g');
  FOREACH w IN ARRAY regexp_split_to_array(btrim(norm_kw), '\s+') LOOP
    IF (length(w) > 2 OR w ~ '\d') AND NOT (w = ANY(stop)) THEN
      expected := expected || w;
      IF position(w IN norm_ans) > 0 THEN matched := matched + 1; END IF;
    END IF;
  END LOOP;
  IF coalesce(array_length(expected,1),0) = 0 THEN RETURN 'partial'; END IF;
  recall := matched::numeric / array_length(expected,1);
  IF recall >= 0.75 THEN RETURN 'correct'; ELSIF recall >= 0.35 THEN RETURN 'partial'; END IF;
  RETURN 'incorrect';
END $$;

CREATE OR REPLACE FUNCTION public.enforce_lesson_progress_scoring()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE ex jsonb; i int := 0; total int := 0; correct int := 0; blocked boolean := false; g text;
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
    NEW.progress_percentage := CASE WHEN NEW.completed THEN 100 ELSE least(greatest(NEW.progress_percentage,0),99) END;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS zz_enforce_lesson_progress_scoring ON public.lesson_progress;
CREATE TRIGGER zz_enforce_lesson_progress_scoring BEFORE INSERT OR UPDATE ON public.lesson_progress
FOR EACH ROW EXECUTE FUNCTION public.enforce_lesson_progress_scoring();

DROP POLICY IF EXISTS "Anyone can read course cache" ON public.course_cache;
CREATE POLICY "Signed-in users read course cache" ON public.course_cache FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Anyone can read cached course images" ON public.course_images;
CREATE POLICY "Signed-in users read cached course images" ON public.course_images FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
REVOKE SELECT ON public.course_cache, public.course_images FROM anon;