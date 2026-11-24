const ALLOWED = [
  /^https:\/\/edu-access-integral\.vercel\.app$/,
  /^https:\/\/learnnest-access-circles\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
  /^http:\/\/localhost(:\d+)?$/,
];
const HEADERS = "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

/** Strict CORS: echoes the origin only when it belongs to the application. */
export function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const ok = ALLOWED.some((r) => r.test(origin));
  return {
    "Access-Control-Allow-Origin": ok ? origin : "https://edu-access-integral.vercel.app",
    "Access-Control-Allow-Headers": HEADERS,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}
export const isAllowedOrigin = (req: Request) => {
  const o = req.headers.get("Origin");
  return !o || ALLOWED.some((r) => r.test(o));
};
