import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { encode as encodeBase64 } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthRequest {
  action: "signIn" | "signUp" | "confirmSignUp" | "refreshToken" | "signOut";
  email?: string;
  password?: string;
  code?: string;
  refreshToken?: string;
  accessToken?: string;
}

async function computeSecretHash(username: string, clientId: string, clientSecret: string): Promise<string> {
  const message = username + clientId;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(clientSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return encodeBase64(signature);
}

async function cognitoRequest(region: string, target: string, body: Record<string, unknown>) {
  const endpoint = `https://cognito-idp.${region}.amazonaws.com`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(body),
  });
  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get("VITE_COGNITO_CLIENT_ID") || "";
    const clientSecret = Deno.env.get("COGNITO_CLIENT_SECRET") || "";
    const region = Deno.env.get("VITE_COGNITO_REGION") || "us-east-1";

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Cognito credentials not configured",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const request: AuthRequest = await req.json();
    const { action, email, password, code, refreshToken, accessToken } = request;

    // Safe debug info (no secrets/passwords)
    console.log("cognito-auth", { action, region, clientId });

    let result: Record<string, unknown>;

    switch (action) {
      case "signIn": {
        if (!email || !password) {
          return new Response(
            JSON.stringify({ success: false, error: "Email and password are required" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const secretHash = await computeSecretHash(email, clientId, clientSecret);
        result = await cognitoRequest(region, "InitiateAuth", {
          AuthFlow: "USER_PASSWORD_AUTH",
          ClientId: clientId,
          AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
            SECRET_HASH: secretHash,
          },
        });
        break;
      }

      case "signUp": {
        if (!email || !password) {
          return new Response(
            JSON.stringify({ success: false, error: "Email and password are required" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const secretHash = await computeSecretHash(email, clientId, clientSecret);
        result = await cognitoRequest(region, "SignUp", {
          ClientId: clientId,
          Username: email,
          Password: password,
          SecretHash: secretHash,
          UserAttributes: [{ Name: "email", Value: email }],
        });
        break;
      }

      case "confirmSignUp": {
        if (!email || !code) {
          return new Response(
            JSON.stringify({ success: false, error: "Email and code are required" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const secretHash = await computeSecretHash(email, clientId, clientSecret);
        result = await cognitoRequest(region, "ConfirmSignUp", {
          ClientId: clientId,
          Username: email,
          ConfirmationCode: code,
          SecretHash: secretHash,
        });
        break;
      }

      case "refreshToken": {
        if (!refreshToken || !email) {
          return new Response(
            JSON.stringify({ success: false, error: "Refresh token and email are required" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const secretHash = await computeSecretHash(email, clientId, clientSecret);
        result = await cognitoRequest(region, "InitiateAuth", {
          AuthFlow: "REFRESH_TOKEN_AUTH",
          ClientId: clientId,
          AuthParameters: {
            REFRESH_TOKEN: refreshToken,
            SECRET_HASH: secretHash,
          },
        });
        break;
      }

      case "signOut": {
        if (!accessToken) {
          return new Response(
            JSON.stringify({ success: false, error: "Access token is required" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await cognitoRequest(region, "GlobalSignOut", {
          AccessToken: accessToken,
        });
        break;
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: "Invalid action" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Check for Cognito errors
    if (result.__type) {
      const errorMessage = (result.message as string) || "Authentication failed";
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          type: result.__type,
          debug: { action, region, clientId },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Cognito auth error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
