import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type OAuthResult = { data: any; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("This connection link is invalid or incomplete.");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      setEmail(sess.session.user.email ?? "");
      try {
        const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) return setError("This connection request expired or could not be loaded.");
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) { window.location.href = immediate; return; }
        setDetails(data);
      } catch {
        if (active) setError("The sign-in service is not responding. Try again.");
      }
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const { data, error } = approve
        ? await oauth().approveAuthorization(authorizationId)
        : await oauth().denyAuthorization(authorizationId);
      const target = data?.redirect_url ?? data?.redirect_to;
      if (error || !target) { setBusy(false); return setError(approve ? "Could not approve the connection." : "Could not cancel the connection."); }
      window.location.href = target;
    } catch {
      setBusy(false);
      setError("The sign-in service is not responding. Try again.");
    }
  }

  const client = details?.client?.name ?? "An assistant";
  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center bg-background p-4">
      <section className="w-full max-w-lg rounded-lg border bg-card text-card-foreground p-6 space-y-4 shadow-sm" aria-live="polite">
        {error ? (
          <>
            <h1 className="text-2xl font-semibold break-words">Connection unavailable</h1>
            <p role="alert" className="text-muted-foreground">{error}</p>
          </>
        ) : !details ? (
          <p className="flex items-center gap-2"><Loader2 className="animate-spin" aria-hidden="true" /> Loading…</p>
        ) : (
          <>
            <h1 className="text-2xl font-semibold break-words">Connect {client} to EduAccess</h1>
            {email && <p className="text-sm text-muted-foreground break-words">Signed in as {email}</p>}
            <p>{client} will be able to see your groups and their lessons, acting as you.</p>
            {details?.redirect_uri && <p className="text-sm text-muted-foreground break-all">Returns to: {details.redirect_uri}</p>}
            <p className="text-sm text-muted-foreground">This does not bypass this app's permissions.</p>
            <div className="flex flex-wrap gap-3">
              <Button disabled={busy} onClick={() => decide(true)}>Approve</Button>
              <Button variant="outline" disabled={busy} onClick={() => decide(false)}>Cancel connection</Button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
