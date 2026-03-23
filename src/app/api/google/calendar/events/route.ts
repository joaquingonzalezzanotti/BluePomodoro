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

type GoogleCalendarEventsResponse = {
  items?: GoogleCalendarEventItem[];
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

  const url = new URL(req.url);
  const start = url.searchParams.get("start") ?? new Date().toISOString();
  const end = url.searchParams.get("end") ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const maxResults = Math.min(Math.max(Number(url.searchParams.get("max") ?? "150"), 1), 400);

  const supabase = getSupabaseClient(authHeader);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let profileQuery = await supabase
    .from("profiles")
    .select(
      "id, google_calendar_sync, google_access_token, google_refresh_token, google_calendar_selection_mode, google_calendar_selected_ids"
    )
    .eq("id", userData.user.id)
    .single();

  if (profileQuery.error?.message?.includes("google_calendar_selection_mode")) {
    profileQuery = await supabase
      .from("profiles")
      .select("id, google_calendar_sync, google_access_token, google_refresh_token")
      .eq("id", userData.user.id)
      .single();
  }

  const profile = profileQuery.data as Partial<ProfileRow> | null;
  const profileError = profileQuery.error;
  const typedProfile = profile
    ? ({
        id: String(profile.id),
        google_calendar_sync: Boolean(profile.google_calendar_sync),
        google_access_token: profile.google_access_token ?? null,
        google_refresh_token: profile.google_refresh_token ?? null,
        google_calendar_selection_mode: normalizeSelectionMode(profile.google_calendar_selection_mode),
        google_calendar_selected_ids: Array.isArray(profile.google_calendar_selected_ids)
          ? profile.google_calendar_selected_ids
          : [],
      } as ProfileRow)
    : null;
  if (profileError || !typedProfile) {
    return NextResponse.json({ error: profileError?.message ?? "Profile not found." }, { status: 500 });
  }

  if (!typedProfile.google_calendar_sync) {
    return NextResponse.json(
      { error: "Google Calendar sync is disabled.", code: "google_calendar_sync_disabled" },
      { status: 412 }
    );
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

  const calendarList: CalendarOption[] = [];
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
      if (normalized) calendarList.push(normalized);
    }
    pageToken = payload.nextPageToken;
  } while (pageToken);

  const selectionMode = normalizeSelectionMode(typedProfile.google_calendar_selection_mode);
  const selectedIds = (typedProfile.google_calendar_selected_ids ?? []).filter((id): id is string => typeof id === "string" && id.length > 0);
  const selectedIdSet = new Set(selectedIds);

  const activeCalendars =
    selectionMode === "none"
      ? []
      : selectionMode === "some"
      ? calendarList.filter((calendar) => selectedIdSet.has(calendar.id))
      : calendarList;

  if (activeCalendars.length === 0) {
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
      events: [],
      range: { start, end },
      selection: {
        mode: selectionMode,
        selected_calendar_ids: selectedIds,
        active_calendar_ids: [],
      },
    });
  }

  const perCalendarMax = Math.min(100, Math.max(15, Math.ceil(maxResults / activeCalendars.length) + 10));
  const aggregatedEvents: Array<{
    id: string;
    summary: string;
    description: string;
    location: string;
    status: string;
    htmlLink: string | null;
    start: string;
    end: string;
    allDay: boolean;
    calendarId: string;
    calendarSummary: string;
    calendarPrimary: boolean;
    calendarColor: string | null;
  }> = [];

  for (const calendar of activeCalendars) {
    const params = new URLSearchParams({
      timeMin: start,
      timeMax: end,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: String(perCalendarMax),
      showDeleted: "false",
    });

    const eventsResponse = await authorizedGet(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events?${params.toString()}`
    );

    if (eventsResponse.status === 401) {
      return NextResponse.json(
        { error: "Google authorization expired. Reconnect Google Sync.", code: "google_sync_expired" },
        { status: 412 }
      );
    }

    if (!eventsResponse.ok) {
      // Skip calendars that fail individually (e.g., permissions changed) without failing whole agenda.
      continue;
    }

    const payload = (await eventsResponse.json().catch(() => ({}))) as GoogleCalendarEventsResponse;
    for (const item of payload.items ?? []) {
      const startValue = item.start?.dateTime ?? item.start?.date ?? null;
      const endValue = item.end?.dateTime ?? item.end?.date ?? null;
      if (!startValue || !endValue) continue;

      aggregatedEvents.push({
        id: `${calendar.id}:${item.id ?? crypto.randomUUID()}`,
        summary: item.summary ?? "Sin titulo",
        description: item.description ?? "",
        location: item.location ?? "",
        status: item.status ?? "confirmed",
        htmlLink: item.htmlLink ?? null,
        start: startValue,
        end: endValue,
        allDay: Boolean(item.start?.date && !item.start?.dateTime),
        calendarId: calendar.id,
        calendarSummary: calendar.summary,
        calendarPrimary: calendar.primary,
        calendarColor: calendar.backgroundColor,
      });
    }
  }

  aggregatedEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const events = aggregatedEvents.slice(0, maxResults);

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
    selection: {
      mode: selectionMode,
      selected_calendar_ids: selectedIds,
      active_calendar_ids: activeCalendars.map((calendar) => calendar.id),
    },
  });
}
