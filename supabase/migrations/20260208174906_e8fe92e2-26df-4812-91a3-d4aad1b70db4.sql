-- Enable realtime for user_library and profiles tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_library;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;