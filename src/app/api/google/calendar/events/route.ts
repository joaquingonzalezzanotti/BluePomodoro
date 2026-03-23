import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const GOOGLE_OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";

type ProfileRow = {
  id: string;
  google_access_token: string | null;
  google_refresh_token: string | null;
};

type GoogleCalendarEventItem = {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  status?: string;
  htmlLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};

function getSupabaseClient(authHeader: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase env vars");
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, detectSessionInUrl: false },
    global: { headers: { Authorization: authHeader } },
  });
}

async function refreshGoogleAccessToken(refreshToken: string) {
  if (!GOOGLE_OAUTH_CLIENT_ID) {
    throw new Error("Missing GOOGLE_OAUTH_CLIENT_ID / NEXT_PUBLIC_GOOGLE_CLIENT_ID");
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  if (GOOGLE_OAUTH_CLIENT_SECRET) {
    params.append("client_secret", GOOGLE_OAUTH_CLIENT_SECRET);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const tokenJson = await tokenRes.json().catch(() => ({}));

  if (!tokenRes.ok || typeof tokenJson?.access_token !== "string") {
    throw new Error("Google token refresh failed");
  }

  const expiresIn = Number(tokenJson.expires_in || 0);
  return {
    accessToken: tokenJson.access_token as string,
    refreshToken:
      typeof tokenJson.refresh_token === "string" && tokenJson.refresh_token.length > 0
        ? tokenJson.refresh_token
        : refreshToken,
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
  };
}

function normalizeEvent(item: GoogleCalendarEventItem) {
  const start = item.start?.dateTime ?? item.start?.date ?? null;
  const end = item.end?.dateTime ?? item.end?.date ?? null;
  const allDay = Boolean(item.start?.date && !item.start?.dateTime);

  return {
    id: item.id ?? crypto.randomUUID(),
    summary: item.summary ?? "Sin titulo",
    description: item.description ?? "",
    location: item.location ?? "",
    status: item.status ?? "confirmed",
    htmlLink: item.htmlLink ?? null,
    start,
    end,
    allDay,
  };
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const start = url.searchParams.get("start") ?? new Date().toISOString();
  const end = url.searchParams.get("end") ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const maxResults = Math.min(Math.max(Number(url.searchParams.get("max") ?? "100"), 1), 250);

  const supabase = getSupabaseClient(authHeader);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, google_access_token, google_refresh_token")
    .eq("id", userData.user.id)
    .single();

  const typedProfile = (profile ?? null) as ProfileRow | null;
  if (profileError || !typedProfile) {
    return NextResponse.json({ error: profileError?.message ?? "Profile not found." }, { status: 500 });
  }

  if (!typedProfile.google_access_token) {
    return NextResponse.json(
      { error: "Google sync not connected. Connect Google Sync first.", code: "google_sync_not_connected" },
      { status: 412 }
    );
  }

  let accessToken = typedProfile.google_access_token;
  let refreshToken = typedProfile.google_refresh_token;
  let tokenWasRefreshed = false;
  let refreshedTokenExpiresAt: string | null = null;

  const executeRequest = async (token: string) => {
    const params = new URLSearchParams({
      timeMin: start,
      timeMax: end,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: String(maxResults),
    });

    return fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  };

  let response = await executeRequest(accessToken);
  if (response.status === 401 && refreshToken) {
    try {
      const refreshed = await refreshGoogleAccessToken(refreshToken);
      accessToken = refreshed.accessToken;
      refreshToken = refreshed.refreshToken;
      refreshedTokenExpiresAt = refreshed.expiresAt;
      tokenWasRefreshed = true;
      response = await executeRequest(accessToken);
    } catch {
      return NextResponse.json(
        { error: "Google authorization expired. Reconnect Google Sync.", code: "google_sync_expired" },
        { status: 412 }
      );
    }
  }

  if (response.status === 401) {
    return NextResponse.json(
      { error: "Google authorization expired. Reconnect Google Sync.", code: "google_sync_expired" },
      { status: 412 }
    );
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload?.error?.message ?? `Google Calendar request failed (${response.status})`;
    return NextResponse.json({ error: message }, { status: response.status });
  }

  const payload = await response.json().catch(() => ({}));
  const items = Array.isArray(payload?.items) ? (payload.items as GoogleCalendarEventItem[]) : [];
  const events = items.map(normalizeEvent).filter((item) => item.start && item.end);

  if (tokenWasRefreshed && accessToken) {
    await supabase
      .from("profiles")
      .update({
        google_access_token: accessToken,
        google_refresh_token: refreshToken,
        google_token_expires_at: refreshedTokenExpiresAt,
      })
      .eq("id", userData.user.id);
  }

  return NextResponse.json({
    events,
    range: { start, end },
  });
}

