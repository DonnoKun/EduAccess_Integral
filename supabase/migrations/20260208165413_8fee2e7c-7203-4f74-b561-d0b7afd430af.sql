
-- Cache table for generated course content
CREATE TABLE public.course_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'es',
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_course_cache_key ON public.course_cache (cache_key);

-- Enable RLS
ALTER TABLE public.course_cache ENABLE ROW LEVEL SECURITY;

-- Everyone can read cached courses (public educational content)
CREATE POLICY "Anyone can read course cache"
ON public.course_cache
FOR SELECT
USING (true);

-- Only authenticated users can insert cached courses
CREATE POLICY "Authenticated users can insert course cache"
ON public.course_cache
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Update trigger for timestamps
CREATE TRIGGER update_course_cache_updated_at
BEFORE UPDATE ON public.course_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
