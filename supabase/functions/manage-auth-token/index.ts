/**
 * EduAccess - Auth Token Management Edge Function
 * Handles user registration with auto-generated tokens and token reset.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

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

      return new Response(
        JSON.stringify({ success: true, token }),
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

      return new Response(
        JSON.stringify({ success: true, token }),
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
