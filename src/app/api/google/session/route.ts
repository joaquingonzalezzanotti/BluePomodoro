import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getSupabaseClient(authHeader: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase env vars");
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, detectSessionInUrl: false },
    global: { headers: { Authorization: authHeader } },
  });
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const providerToken = typeof body?.providerToken === "string" ? body.providerToken : "";
  const providerRefreshToken =
    typeof body?.providerRefreshToken === "string" && body.providerRefreshToken.trim().length > 0
      ? body.providerRefreshToken
      : null;

  if (!providerToken) {
    return NextResponse.json({ error: "Missing Google provider token" }, { status: 400 });
  }

  const supabase = getSupabaseClient(authHeader);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const updatePatch: Record<string, string | null> = {
    google_access_token: providerToken,
    // Google access tokens are short lived; a conservative default keeps refresh logic active.
    google_token_expires_at: new Date(Date.now() + 50 * 60 * 1000).toISOString(),
  };
  if (providerRefreshToken) {
    updatePatch.google_refresh_token = providerRefreshToken;
  }

  const { error: updateError } = await supabase.from("profiles").update(updatePatch).eq("id", userData.user.id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

