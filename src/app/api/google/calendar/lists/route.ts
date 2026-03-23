import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const GOOGLE_OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";

type CalendarSelectionMode = "all" | "none" | "some";

type ProfileRow = {
  id: string;
  google_calendar_sync: boolean;
  google_access_token: string | null;
  google_refresh_token: string | null;
  google_calendar_selection_mode: CalendarSelectionMode | null;
  google_calendar_selected_ids: string[] | null;
};

type GoogleCalendarListItem = {
  id?: string;
  summary?: string;
  primary?: boolean;
  accessRole?: string;
  backgroundColor?: string;
  deleted?: boolean;
};

type GoogleCalendarListResponse = {
  items?: GoogleCalendarListItem[];
  nextPageToken?: string;
};

type CalendarOption = {
  id: string;
  summary: string;
  primary: boolean;
  accessRole: string;
  backgroundColor: string | null;
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

function normalizeSelectionMode(value: string | null | undefined): CalendarSelectionMode {
  if (value === "some" || value === "none" || value === "all") return value;
  return "all";
}

function normalizeCalendarListItem(item: GoogleCalendarListItem): CalendarOption | null {
  if (!item.id || item.deleted) return null;
  return {
    id: item.id,
    summary: item.summary ?? "Sin nombre",
    primary: Boolean(item.primary),
    accessRole: item.accessRole ?? "reader",
    backgroundColor: item.backgroundColor ?? null,
  };
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

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseClient(authHeader);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, google_calendar_sync, google_access_token, google_refresh_token, google_calendar_selection_mode, google_calendar_selected_ids"
    )
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

  const authorizedGet = async (requestUrl: string): Promise<Response> => {
    const requestWithToken = async (token: string) =>
      fetch(requestUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

    let response = await requestWithToken(accessToken as string);
    if (response.status !== 401) return response;

    if (!refreshToken) return response;

    const refreshed = await refreshGoogleAccessToken(refreshToken);
    accessToken = refreshed.accessToken;
    refreshToken = refreshed.refreshToken;
    refreshedTokenExpiresAt = refreshed.expiresAt;
    tokenWasRefreshed = true;

    response = await requestWithToken(accessToken);
    return response;
  };

  const calendars: CalendarOption[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({ minAccessRole: "reader", showDeleted: "false", showHidden: "true" });
    if (pageToken) params.set("pageToken", pageToken);

    const listResponse = await authorizedGet(`https://www.googleapis.com/calendar/v3/users/me/calendarList?${params.toString()}`);

    if (listResponse.status === 401) {
      return NextResponse.json(
        { error: "Google authorization expired. Reconnect Google Sync.", code: "google_sync_expired" },
        { status: 412 }
      );
    }
    if (!listResponse.ok) {
      const payload = await listResponse.json().catch(() => ({}));
      const message = payload?.error?.message ?? `Google Calendar list request failed (${listResponse.status})`;
      return NextResponse.json({ error: message }, { status: listResponse.status });
    }

    const payload = (await listResponse.json()) as GoogleCalendarListResponse;
    for (const item of payload.items ?? []) {
      const normalized = normalizeCalendarListItem(item);
      if (normalized) calendars.push(normalized);
    }
    pageToken = payload.nextPageToken;
  } while (pageToken);

  const selectionMode = normalizeSelectionMode(typedProfile.google_calendar_selection_mode);
  const selectedIds = (typedProfile.google_calendar_selected_ids ?? []).filter(
    (id): id is string => typeof id === "string" && id.length > 0
  );
  const selectedSet = new Set(selectedIds);
  const activeCalendars =
    selectionMode === "none"
      ? []
      : selectionMode === "some"
      ? calendars.filter((calendar) => selectedSet.has(calendar.id))
      : calendars;

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
    sync_enabled: Boolean(typedProfile.google_calendar_sync),
    calendars,
    selection: {
      mode: selectionMode,
      selected_calendar_ids: selectedIds,
      active_calendar_ids: activeCalendars.map((calendar) => calendar.id),
    },
  });
}
