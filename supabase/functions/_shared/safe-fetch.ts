/** Fetch a public http(s) URL only: blocks private/loopback/link-local targets and re-checks every redirect hop. */
function isPrivateV4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => isNaN(n))) return true;
  const [a, b] = p;
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
}
function isPrivateV6(ip: string): boolean {
  const s = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (s === "::" || s === "::1") return true;
  const m = s.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/); if (m) return isPrivateV4(m[1]);
  return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(s);
}
export function isBlockedIp(ip: string): boolean { return ip.includes(":") ? isPrivateV6(ip) : isPrivateV4(ip); }

async function assertPublicHost(url: URL) {
  if (!/^https?:$/.test(url.protocol)) throw new Error("blocked");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("blocked");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (/^[\d.]+$/.test(host) || host.includes(":")) { if (isBlockedIp(host)) throw new Error("blocked"); return; }
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) throw new Error("blocked");
  const ips = [
    ...(await Deno.resolveDns(host, "A").catch(() => [] as string[])),
    ...(await Deno.resolveDns(host, "AAAA").catch(() => [] as string[])),
  ];
  if (!ips.length || ips.some(isBlockedIp)) throw new Error("blocked");
}

export async function safePublicFetch(raw: string, timeoutMs = 8000): Promise<Response> {
  let url = new URL(raw);
  for (let hop = 0; hop < 4; hop++) {
    await assertPublicHost(url);
    const r = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(timeoutMs) });
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) { url = new URL(r.headers.get("location")!, url); continue; }
    return r;
  }
  throw new Error("too many redirects");
}
