/**
 * EduAccess - Auth Token Management Edge Function
 * Handles user registration with auto-generated tokens and token reset.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateToken(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return (array[0] % 90000000 + 10000000).toString();
}

async function sendTokenEmail(email: string, token: string, isReset: boolean): Promise<boolean> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.log("⚠️ RESEND_API_KEY not configured, skipping email send");
    return false;
  }

  const subject = isReset
    ? "Tu Nuevo Token de Acceso - EduAccess"
    : "¡Bienvenido! Tu Token de Acceso - EduAccess";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 16px;">
      <h1 style="color: #1e293b; text-align: center; font-size: 24px;">
        ${isReset ? "🔄 Nuevo Token de Acceso" : "🎓 ¡Bienvenido a EduAccess!"}
      </h1>
      <p style="color: #475569; text-align: center; font-size: 16px;">
        ${isReset ? "Se ha generado un nuevo token para tu cuenta." : "Tu cuenta ha sido creada exitosamente."}
      </p>
      <div style="background: #1e293b; color: #f1f5f9; text-align: center; padding: 24px; border-radius: 12px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; opacity: 0.8;">Tu Token de Acceso:</p>
        <p style="margin: 0; font-size: 36px; font-weight: bold; letter-spacing: 4px;">${token}</p>
      </div>
      <p style="color: #dc2626; text-align: center; font-size: 14px; font-weight: 600;">
        ⚠️ Guarda este token en un lugar seguro. Lo necesitarás cada vez que inicies sesión.
      </p>
      ${isReset ? '<p style="color: #475569; text-align: center; font-size: 13px;">Tu token anterior ya no funciona.</p>' : ""}
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "EduAccess <onboarding@resend.dev>",
        to: [email],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Email send error:", err);
      return false;
    }
    console.log("✅ Token email sent to:", email);
    return true;
  } catch (err) {
    console.error("Email send exception:", err);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, email } = await req.json();

    if (!email || !action) {
      return new Response(
        JSON.stringify({ error: "Faltan campos requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    if (action === "register") {
      const token = generateToken();

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: token,
        email_confirm: true,
      });

      if (error) {
        // Handle duplicate email
        if (error.message?.includes("already been registered") || error.message?.includes("already exists")) {
          return new Response(
            JSON.stringify({ error: "Este correo ya está registrado. Usa 'Olvidé mi token' para obtener uno nuevo." }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw error;
      }

      console.log("✅ User registered:", email);

      const emailSent = await sendTokenEmail(email, token, false);

      return new Response(
        JSON.stringify({ success: true, token, emailSent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "reset-token") {
      // Find user by listing (works for small user bases)
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (listError) throw listError;

      const user = users?.find((u: any) => u.email === email);

      if (!user) {
        return new Response(
          JSON.stringify({ error: "No se encontró una cuenta con ese correo." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const token = generateToken();

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: token,
      });

      if (updateError) throw updateError;

      console.log("✅ Token reset for:", email);

      const emailSent = await sendTokenEmail(email, token, true);

      return new Response(
        JSON.stringify({ success: true, token, emailSent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Acción no válida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Auth token error:", error);
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
