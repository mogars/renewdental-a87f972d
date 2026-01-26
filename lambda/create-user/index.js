const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  try {
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing authorization header" }),
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: currentUser }, error: userError } = await adminClient.auth.getUser(token);
    
    if (userError || !currentUser) {
      console.error("Token verification failed:", userError);
      return {
        statusCode: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    const { data: adminCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminCheck) {
      return {
        statusCode: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Only admins can create users" }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const { email, password, role } = body;

    if (!email || !password) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Email and password are required" }),
      };
    }

    if (password.length < 6) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Password must be at least 6 characters" }),
      };
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      console.error("User creation failed:", createError);
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: createError.message }),
      };
    }

    if (role && newUser.user) {
      const { error: roleError } = await adminClient
        .from("user_roles")
        .insert({ user_id: newUser.user.id, role });

      if (roleError) {
        console.error("Failed to assign role:", roleError);
      }
    }

    if (newUser.user) {
      const { error: profileError } = await adminClient
        .from("profiles")
        .upsert({ 
          user_id: newUser.user.id, 
          email: newUser.user.email 
        }, { onConflict: "user_id" });

      if (profileError) {
        console.error("Failed to create profile:", profileError);
      }
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        user: {
          id: newUser.user?.id,
          email: newUser.user?.email,
        },
      }),
    };
  } catch (error) {
    console.error("Error creating user:", error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
