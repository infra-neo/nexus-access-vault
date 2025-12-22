import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  role: string;
  organization_id: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the calling user is authenticated and has admin permissions
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller's identity using their token
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerUser) {
      throw new Error("Unauthorized");
    }

    // Check if caller has admin role
    const { data: callerProfile, error: profileError } = await callerClient
      .from("profiles")
      .select("role, organization_id")
      .eq("id", callerUser.id)
      .single();

    if (profileError || !callerProfile) {
      throw new Error("Could not verify caller permissions");
    }

    const allowedRoles = ["global_admin", "org_admin", "support"];
    if (!allowedRoles.includes(callerProfile.role)) {
      throw new Error("Insufficient permissions to create users");
    }

    // Parse request body
    const { email, password, full_name, role, organization_id }: CreateUserRequest = await req.json();

    // Use admin client to create user without changing current session
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Create user using admin API
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
      },
    });

    if (createError) {
      throw createError;
    }

    if (!newUser.user) {
      throw new Error("Failed to create user");
    }

    // Update profile with organization and role
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({
        organization_id: organization_id || callerProfile.organization_id,
        role: role,
        full_name: full_name.trim(),
      })
      .eq("id", newUser.user.id);

    if (updateError) {
      console.error("Profile update error:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          full_name: full_name,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in create-user-admin:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
