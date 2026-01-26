import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const userPoolId = Deno.env.get("VITE_COGNITO_USER_POOL_ID") || "";
    const clientId = Deno.env.get("VITE_COGNITO_CLIENT_ID") || "";
    const region = Deno.env.get("VITE_COGNITO_REGION") || "us-east-1";

    return new Response(
      JSON.stringify({
        cognito: {
          userPoolId,
          clientId,
          region,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in public-config:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
