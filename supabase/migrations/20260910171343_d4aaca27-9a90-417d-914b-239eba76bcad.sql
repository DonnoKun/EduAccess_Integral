CREATE TABLE IF NOT EXISTS public.course_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  prompt text NOT NULL,
  alt text,
  image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.course_images TO anon, authenticated;
GRANT ALL ON public.course_images TO service_role;
ALTER TABLE public.course_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read cached course images" ON public.course_images FOR SELECT USING (true);