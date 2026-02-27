import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const spotifyClientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;

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

  if (!spotifyClientId) {
    return NextResponse.json({ error: "Missing Spotify client id" }, { status: 500 });
  }

  const supabase = getSupabaseClient(authHeader);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("spotify_refresh_token")
    .eq("id", userData.user.id)
    .single();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile?.spotify_refresh_token) {
    return NextResponse.json({ error: "Missing refresh token" }, { status: 400 });
  }

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: profile.spotify_refresh_token,
    client_id: spotifyClientId,
  });
  if (spotifyClientSecret) {
    params.append("client_secret", spotifyClientSecret);
  }

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok) {
    return NextResponse.json({ error: "Spotify refresh failed", details: tokenJson }, { status: tokenRes.status });
  }

  const expiresIn = Number(tokenJson.expires_in || 0);
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      spotify_access_token: tokenJson.access_token ?? null,
      spotify_refresh_token: tokenJson.refresh_token ?? profile.spotify_refresh_token,
      spotify_token_expires_at: expiresAt,
    })
    .eq("id", userData.user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    access_token: tokenJson.access_token ?? null,
    expires_at: expiresAt,
  });
}
