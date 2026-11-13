DROP POLICY IF EXISTS "Signed-in users read cached course images" ON public.course_images;
REVOKE SELECT ON public.course_images FROM anon, authenticated;