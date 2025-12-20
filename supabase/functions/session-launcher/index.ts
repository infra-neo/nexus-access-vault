import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LaunchRequest {
  resourceId: string;
  connectionType: "guacamole" | "tsplus" | "rdp" | "ssh";
}

interface LaunchResponse {
  success: boolean;
  sessionUrl?: string;
  connectionId?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: LaunchRequest = await req.json();
    const { resourceId, connectionType } = body;

    // Validate input
    if (!resourceId || typeof resourceId !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid resource ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validConnectionTypes = ["guacamole", "tsplus", "rdp", "ssh"];
    if (!connectionType || !validConnectionTypes.includes(connectionType)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid connection type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user has access to this resource
    const { data: accessData, error: accessError } = await supabase
      .from("user_resource_access")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("resource_id", resourceId)
      .eq("status", "active")
      .single();

    if (accessError || !accessData) {
      console.error("Access check error:", accessError);
      return new Response(
        JSON.stringify({ success: false, error: "Access denied to this resource" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get resource details
    const { data: resource, error: resourceError } = await supabase
      .from("resources")
      .select("*")
      .eq("id", resourceId)
      .single();

    if (resourceError || !resource) {
      console.error("Resource fetch error:", resourceError);
      return new Response(
        JSON.stringify({ success: false, error: "Resource not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate session URL based on connection type
    let sessionUrl: string;
    const connectionId = crypto.randomUUID();
    const timestamp = Date.now();
    const expiresAt = timestamp + 3600000; // 1 hour expiry
    const metadata = resource.metadata as Record<string, unknown> || {};

    switch (connectionType) {
      case "guacamole": {
        // For Pomerium-proxied Guacamole
        // The URL format depends on your Pomerium/Guacamole setup
        const pomeriumUrl = metadata.pomerium_url as string || Deno.env.get("POMERIUM_BASE_URL") || "https://access.yourcompany.com";
        const guacamoleConnectionId = metadata.guacamole_connection_id as string || resource.id;
        
        // Generate a signed token for the session
        const sessionToken = await generateSessionToken(user.id, resourceId, connectionId, expiresAt);
        
        // Construct Guacamole URL via Pomerium
        // Format: {pomerium_url}/guacamole/#/client/{encoded_connection_id}?token={session_token}
        const encodedConnectionId = btoa(`${guacamoleConnectionId}\0c\0default`).replace(/=/g, "");
        sessionUrl = `${pomeriumUrl}/guacamole/#/client/${encodedConnectionId}?token=${sessionToken}`;
        break;
      }

      case "tsplus": {
        // For TSPlus HTML5
        const tsplusUrl = metadata.tsplus_url as string || Deno.env.get("TSPLUS_BASE_URL") || "https://tsplus.yourcompany.com";
        const tsplusUser = metadata.tsplus_user as string || user.email;
        const targetHost = resource.ip_address || metadata.target_host as string;
        
        // TSPlus HTML5 URL with parameters
        // Note: Actual implementation depends on your TSPlus configuration
        const sessionToken = await generateSessionToken(user.id, resourceId, connectionId, expiresAt);
        sessionUrl = `${tsplusUrl}/html5/?user=${encodeURIComponent(tsplusUser || "")}&host=${encodeURIComponent(targetHost || "")}&token=${sessionToken}`;
        break;
      }

      case "rdp": {
        // RDP via Guacamole
        const pomeriumUrl = metadata.pomerium_url as string || Deno.env.get("POMERIUM_BASE_URL") || "https://access.yourcompany.com";
        const rdpConnectionId = metadata.rdp_connection_id as string || `rdp-${resource.id}`;
        const sessionToken = await generateSessionToken(user.id, resourceId, connectionId, expiresAt);
        const encodedConnectionId = btoa(`${rdpConnectionId}\0c\0default`).replace(/=/g, "");
        sessionUrl = `${pomeriumUrl}/guacamole/#/client/${encodedConnectionId}?token=${sessionToken}`;
        break;
      }

      case "ssh": {
        // SSH via Guacamole
        const pomeriumUrl = metadata.pomerium_url as string || Deno.env.get("POMERIUM_BASE_URL") || "https://access.yourcompany.com";
        const sshConnectionId = metadata.ssh_connection_id as string || `ssh-${resource.id}`;
        const sessionToken = await generateSessionToken(user.id, resourceId, connectionId, expiresAt);
        const encodedConnectionId = btoa(`${sshConnectionId}\0c\0default`).replace(/=/g, "");
        sessionUrl = `${pomeriumUrl}/guacamole/#/client/${encodedConnectionId}?token=${sessionToken}`;
        break;
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: "Unsupported connection type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Log session launch to audit
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      event: "session_launched",
      details: {
        resource_id: resourceId,
        resource_name: resource.name,
        connection_type: connectionType,
        connection_id: connectionId,
        ip_address: resource.ip_address,
      },
    });

    console.log(`Session launched: user=${user.id}, resource=${resourceId}, type=${connectionType}`);

    const response: LaunchResponse = {
      success: true,
      sessionUrl,
      connectionId,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Session launcher error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper function to generate a session token
// In production, this should use proper JWT signing with a secret
async function generateSessionToken(
  userId: string,
  resourceId: string,
  connectionId: string,
  expiresAt: number
): Promise<string> {
  const payload = {
    sub: userId,
    rid: resourceId,
    cid: connectionId,
    exp: expiresAt,
    iat: Date.now(),
  };

  // Encode the payload as base64
  // In production, sign this with HMAC-SHA256 using a secret key
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  
  return `${btoa(JSON.stringify(payload))}.${hashHex}`;
}
