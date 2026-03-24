import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const GOOGLE_OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
const FOCUS_SYNC_MIN_INTERVAL_MS = 60_000;

type SyncReason = "manual" | "focus";
type CalendarSelectionMode = "all" | "none" | "some";
type SyncMode = "read_only" | "bidirectional";

type ProfileRow = {
  id: string;
  google_tasks_sync: boolean;
  google_calendar_sync: boolean;
  google_tasks_sync_mode: SyncMode | null;
  google_calendar_sync_mode: SyncMode | null;
  google_access_token: string | null;
  google_refresh_token: string | null;
  google_token_expires_at: string | null;
  google_last_synced_at: string | null;
  google_calendar_selection_mode: CalendarSelectionMode | null;
  google_calendar_selected_ids: string[] | null;
};

type GoogleTasksResponse = {
  items?: Array<{
    id?: string;
    title?: string;
    status?: "needsAction" | "completed";
    due?: string;
    updated?: string;
    notes?: string;
    deleted?: boolean;
  }>;
  nextPageToken?: string;
};

type GoogleCalendarResponse = {
  items?: Array<{ id?: string }>;
};

type GoogleCalendarListItem = {
  id?: string;
  deleted?: boolean;
};

type GoogleCalendarListResponse = {
  items?: GoogleCalendarListItem[];
  nextPageToken?: string;
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

function toDateOnly(value?: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeSelectionMode(value: string | null | undefined): CalendarSelectionMode {
  if (value === "some" || value === "none" || value === "all") return value;
  return "all";
}

function normalizeSyncMode(value: string | null | undefined): SyncMode {
  return value === "bidirectional" ? "bidirectional" : "read_only";
}

function localDueDateToGoogleDue(dueDate: string | null | undefined): string | null {
  if (!dueDate) return null;
  const parsed = new Date(`${dueDate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function localStatusToGoogleStatus(status: string): "needsAction" | "completed" {
  return status === "Completada" ? "completed" : "needsAction";
}

function googleStatusToLocalStatus(status: "needsAction" | "completed"): "Pendiente" | "Completada" {
  return status === "completed" ? "Completada" : "Pendiente";
}

function findSubjectIdByTitle(
  title: string,
  subjects: Array<{ id: string; name: string }> | null
): string | null {
  if (!subjects || subjects.length === 0) return null;

  const titleTrimmed = title.trim();
  const bracketMatch = titleTrimmed.match(/^\s*\[([^\]]+)\]/);
  const prefixMatch = titleTrimmed.match(/^\s*([^:]{2,80}):/);
  const candidates = [
    bracketMatch?.[1] ?? "",
    prefixMatch?.[1] ?? "",
  ]
    .map(normalizeText)
    .filter(Boolean);

  if (candidates.length === 0) return null;

  for (const candidate of candidates) {
    const matched = subjects.find((subject) => normalizeText(subject.name) === candidate);
    if (matched) return matched.id;
  }
  return null;
}

async function refreshGoogleAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: string | null;
}> {
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
    accessToken: tokenJson.access_token,
    refreshToken:
      typeof tokenJson.refresh_token === "string" && tokenJson.refresh_token.length > 0
        ? tokenJson.refresh_token
        : refreshToken,
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
  };
}

async function parseGoogleError(response: Response): Promise<string> {
  const json = await response.json().catch(() => ({}));
  const message = json?.error?.message;
  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }
  return `Google API error (${response.status})`;
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const reason: SyncReason = body?.reason === "manual" ? "manual" : "focus";
  const force = Boolean(body?.force);

  const supabase = getSupabaseClient(authHeader);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let profileQuery = await supabase
    .from("profiles")
    .select(
      "id, google_tasks_sync, google_calendar_sync, google_tasks_sync_mode, google_calendar_sync_mode, google_access_token, google_refresh_token, google_token_expires_at, google_last_synced_at, google_calendar_selection_mode, google_calendar_selected_ids"
    )
    .eq("id", userData.user.id)
    .single();

  if (
    profileQuery.error?.message?.includes("google_calendar_selection_mode") ||
    profileQuery.error?.message?.includes("google_tasks_sync_mode") ||
    profileQuery.error?.message?.includes("google_calendar_sync_mode")
  ) {
    profileQuery = await supabase
      .from("profiles")
      .select(
        "id, google_tasks_sync, google_calendar_sync, google_access_token, google_refresh_token, google_token_expires_at, google_last_synced_at"
      )
      .eq("id", userData.user.id)
      .single();
  }

  const profile = profileQuery.data as Partial<ProfileRow> | null;
  const profileError = profileQuery.error;
  const typedProfile = profile
    ? ({
        id: String(profile.id),
        google_tasks_sync: Boolean(profile.google_tasks_sync),
        google_calendar_sync: Boolean(profile.google_calendar_sync),
        google_tasks_sync_mode: normalizeSyncMode(profile.google_tasks_sync_mode),
        google_calendar_sync_mode: normalizeSyncMode(profile.google_calendar_sync_mode),
        google_access_token: profile.google_access_token ?? null,
        google_refresh_token: profile.google_refresh_token ?? null,
        google_token_expires_at: profile.google_token_expires_at ?? null,
        google_last_synced_at: profile.google_last_synced_at ?? null,
        google_calendar_selection_mode: normalizeSelectionMode(profile.google_calendar_selection_mode),
        google_calendar_selected_ids: Array.isArray(profile.google_calendar_selected_ids)
          ? profile.google_calendar_selected_ids
          : [],
      } as ProfileRow)
    : null;

  if (profileError || !typedProfile) {
    return NextResponse.json(
      { error: profileError?.message ?? "Profile not found. Apply latest schema.sql first." },
      { status: 500 }
    );
  }

  const result = {
    ok: true,
    throttled: false,
    synced_at: null as string | null,
    tasks: {
      enabled: Boolean(typedProfile.google_tasks_sync),
      mode: normalizeSyncMode(typedProfile.google_tasks_sync_mode),
      total_google: 0,
      upserted: 0,
      removed: 0,
      pushed_remote: 0,
      created_remote: 0,
      updated_remote: 0,
    },
    calendar: {
      enabled: Boolean(typedProfile.google_calendar_sync),
      mode: normalizeSyncMode(typedProfile.google_calendar_sync_mode),
      events_fetched: 0,
    },
    errors: {} as { auth?: string; tasks?: string; calendar?: string },
  };

  if (!typedProfile.google_tasks_sync && !typedProfile.google_calendar_sync) {
    return NextResponse.json(result);
  }

  const lastSyncedAtMs = typedProfile.google_last_synced_at ? new Date(typedProfile.google_last_synced_at).getTime() : 0;
  if (!force && reason === "focus" && lastSyncedAtMs && Date.now() - lastSyncedAtMs < FOCUS_SYNC_MIN_INTERVAL_MS) {
    result.throttled = true;
    result.synced_at = typedProfile.google_last_synced_at;
    return NextResponse.json(result);
  }

  let accessToken = typedProfile.google_access_token;
  let refreshToken = typedProfile.google_refresh_token;
  let tokenWasRefreshed = false;
  let refreshedTokenExpiresAt: string | null = null;

  if (!accessToken) {
    return NextResponse.json(
      {
        ...result,
        errors: { auth: "Google session is not connected. Sign in with Google again." },
      },
      { status: 412 }
    );
  }

  const authorizedRequest = async (url: string, init?: RequestInit): Promise<Response> => {
    const requestWithToken = async (token: string) =>
      fetch(url, {
        ...init,
        headers: {
          ...(init?.headers ?? {}),
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

  const authorizedGet = (url: string) => authorizedRequest(url, { method: "GET" });

  // Google Tasks sync.
  if (typedProfile.google_tasks_sync) {
    try {
      const tasksMode = normalizeSyncMode(typedProfile.google_tasks_sync_mode);
      const googleTasks: Array<{
        id: string;
        title: string;
        status: "needsAction" | "completed";
        due: string | undefined;
        updated: string | undefined;
      }> = [];

      let pageToken: string | undefined;
      do {
        const params = new URLSearchParams({
          showCompleted: "true",
          showHidden: "true",
          maxResults: "100",
        });
        if (pageToken) params.set("pageToken", pageToken);

        const tasksResponse = await authorizedGet(
          `https://www.googleapis.com/tasks/v1/lists/@default/tasks?${params.toString()}`
        );

        if (tasksResponse.status === 401) {
          throw new Error("Google authorization expired. Please sign in again.");
        }
        if (!tasksResponse.ok) {
          throw new Error(await parseGoogleError(tasksResponse));
        }

        const tasksPayload = (await tasksResponse.json()) as GoogleTasksResponse;
        const items = tasksPayload.items ?? [];
        for (const item of items) {
          if (!item?.id || !item?.title || item.deleted) continue;
          googleTasks.push({
            id: item.id,
            title: item.title,
            status: item.status === "completed" ? "completed" : "needsAction",
            due: item.due,
            updated: item.updated,
          });
        }
        pageToken = tasksPayload.nextPageToken;
      } while (pageToken);

      const { data: subjects } = await supabase
        .from("subjects")
        .select("id, name")
        .eq("user_id", userData.user.id);

      const googleTaskById = new Map(googleTasks.map((task) => [task.id, task]));
      const upsertGoogleTaskCache = (task: {
        id: string;
        title: string;
        status: "needsAction" | "completed";
        due: string | undefined;
        updated: string | undefined;
      }) => {
        const index = googleTasks.findIndex((row) => row.id === task.id);
        if (index >= 0) googleTasks[index] = task;
        else googleTasks.push(task);
        googleTaskById.set(task.id, task);
      };

      if (tasksMode === "bidirectional") {
        const { data: localTasks, error: localTasksError } = await supabase
          .from("tasks")
          .select("id, title, status, due_date, google_task_id")
          .eq("user_id", userData.user.id);
        if (localTasksError) {
          throw new Error(localTasksError.message);
        }

        for (const localTask of localTasks ?? []) {
          const localTitle =
            typeof localTask.title === "string" && localTask.title.trim().length > 0
              ? localTask.title.trim()
              : "Untitled task";
          const localStatus = localStatusToGoogleStatus(String(localTask.status ?? "Pendiente"));
          const localDueIso = localDueDateToGoogleDue(
            typeof localTask.due_date === "string" ? localTask.due_date : null
          );
          const localDueDateOnly = typeof localTask.due_date === "string" ? localTask.due_date : null;
          const existingGoogleTaskId =
            typeof localTask.google_task_id === "string" && localTask.google_task_id.length > 0
              ? localTask.google_task_id
              : null;

          if (!existingGoogleTaskId) {
            const createBody: Record<string, string> = { title: localTitle };
            if (localDueIso) createBody.due = localDueIso;
            if (localStatus === "completed") createBody.status = "completed";

            const createResponse = await authorizedRequest("https://www.googleapis.com/tasks/v1/lists/@default/tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(createBody),
            });

            if (createResponse.status === 401) {
              throw new Error("Google authorization expired. Please sign in again.");
            }
            if (!createResponse.ok) {
              throw new Error(await parseGoogleError(createResponse));
            }

            const created = (await createResponse.json().catch(() => ({}))) as {
              id?: string;
              title?: string;
              status?: "needsAction" | "completed";
              due?: string;
              updated?: string;
            };
            if (!created.id) continue;

            result.tasks.pushed_remote += 1;
            result.tasks.created_remote += 1;

            await supabase
              .from("tasks")
              .update({ google_task_id: created.id, imported_from_google: true })
              .eq("id", localTask.id)
              .eq("user_id", userData.user.id);

            upsertGoogleTaskCache({
              id: created.id,
              title: created.title ?? localTitle,
              status: created.status === "completed" ? "completed" : localStatus,
              due: created.due ?? (localDueIso ?? undefined),
              updated: created.updated,
            });
            continue;
          }

          const remoteTask = googleTaskById.get(existingGoogleTaskId);
          if (!remoteTask) {
            const recreateBody: Record<string, string> = { title: localTitle };
            if (localDueIso) recreateBody.due = localDueIso;
            if (localStatus === "completed") recreateBody.status = "completed";

            const recreateResponse = await authorizedRequest("https://www.googleapis.com/tasks/v1/lists/@default/tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(recreateBody),
            });
            if (recreateResponse.status === 401) {
              throw new Error("Google authorization expired. Please sign in again.");
            }
            if (!recreateResponse.ok) {
              throw new Error(await parseGoogleError(recreateResponse));
            }

            const recreated = (await recreateResponse.json().catch(() => ({}))) as {
              id?: string;
              title?: string;
              status?: "needsAction" | "completed";
              due?: string;
              updated?: string;
            };
            if (!recreated.id) continue;

            result.tasks.pushed_remote += 1;
            result.tasks.created_remote += 1;

            await supabase
              .from("tasks")
              .update({ google_task_id: recreated.id, imported_from_google: true })
              .eq("id", localTask.id)
              .eq("user_id", userData.user.id);

            upsertGoogleTaskCache({
              id: recreated.id,
              title: recreated.title ?? localTitle,
              status: recreated.status === "completed" ? "completed" : localStatus,
              due: recreated.due ?? (localDueIso ?? undefined),
              updated: recreated.updated,
            });
            continue;
          }

          const remoteTitle = normalizeText(remoteTask.title ?? "");
          const remoteStatus = remoteTask.status;
          const remoteDueDateOnly = toDateOnly(remoteTask.due);
          const needsPatch =
            remoteTitle !== normalizeText(localTitle) ||
            remoteStatus !== localStatus ||
            remoteDueDateOnly !== localDueDateOnly;

          if (!needsPatch) continue;

          const patchBody: Record<string, string | null> = {
            title: localTitle,
            status: localStatus,
            due: localDueIso,
          };
          if (localStatus === "needsAction") {
            patchBody.completed = null;
          }

          const patchResponse = await authorizedRequest(
            `https://www.googleapis.com/tasks/v1/lists/@default/tasks/${encodeURIComponent(existingGoogleTaskId)}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(patchBody),
            }
          );

          if (patchResponse.status === 401) {
            throw new Error("Google authorization expired. Please sign in again.");
          }
          if (!patchResponse.ok) {
            throw new Error(await parseGoogleError(patchResponse));
          }

          const patched = (await patchResponse.json().catch(() => ({}))) as {
            id?: string;
            title?: string;
            status?: "needsAction" | "completed";
            due?: string;
            updated?: string;
          };

          result.tasks.pushed_remote += 1;
          result.tasks.updated_remote += 1;

          upsertGoogleTaskCache({
            id: existingGoogleTaskId,
            title: patched.title ?? localTitle,
            status: patched.status === "completed" ? "completed" : localStatus,
            due: patched.due ?? (localDueIso ?? undefined),
            updated: patched.updated,
          });
        }
      }

      result.tasks.total_google = googleTasks.length;

      const payloadRows = googleTasks.map((task) => ({
        user_id: userData.user.id,
        title: task.title,
        status: googleStatusToLocalStatus(task.status),
        due_date: toDateOnly(task.due),
        imported_from_google: true,
        google_task_id: task.id,
        subject_id: findSubjectIdByTitle(task.title, (subjects as Array<{ id: string; name: string }> | null) ?? null),
      }));

      if (payloadRows.length > 0) {
        const { error: upsertError } = await supabase
          .from("tasks")
          .upsert(payloadRows, { onConflict: "user_id,google_task_id" });
        if (upsertError) {
          throw new Error(upsertError.message);
        }
      }
      result.tasks.upserted = payloadRows.length;

      const { data: existingImported, error: existingError } = await supabase
        .from("tasks")
        .select("id, google_task_id")
        .eq("user_id", userData.user.id)
        .eq("imported_from_google", true)
        .not("google_task_id", "is", null);
      if (existingError) {
        throw new Error(existingError.message);
      }

      const incomingIds = new Set(googleTasks.map((item) => item.id));
      const staleLocalTaskIds = (existingImported ?? [])
        .filter((row) => {
          const googleTaskId = typeof row.google_task_id === "string" ? row.google_task_id : "";
          return googleTaskId.length > 0 && !incomingIds.has(googleTaskId);
        })
        .map((row) => row.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);

      if (staleLocalTaskIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("tasks")
          .delete()
          .eq("user_id", userData.user.id)
          .in("id", staleLocalTaskIds);
        if (deleteError) {
          throw new Error(deleteError.message);
        }
      }
      result.tasks.removed = staleLocalTaskIds.length;
    } catch (error: any) {
      result.errors.tasks = error?.message ?? "tasks-sync-failed";
    }
  }

  // Google Calendar read-only bridge: fetch upcoming events across selected calendars.
  if (typedProfile.google_calendar_sync) {
    try {
      const calendarIds: string[] = [];
      let pageToken: string | undefined;

      do {
        const listParams = new URLSearchParams({
          minAccessRole: "reader",
          showDeleted: "false",
          showHidden: "true",
        });
        if (pageToken) listParams.set("pageToken", pageToken);

        const calendarListResponse = await authorizedGet(
          `https://www.googleapis.com/calendar/v3/users/me/calendarList?${listParams.toString()}`
        );

        if (calendarListResponse.status === 401) {
          throw new Error("Google authorization expired. Please sign in again.");
        }
        if (!calendarListResponse.ok) {
          throw new Error(await parseGoogleError(calendarListResponse));
        }

        const calendarListPayload = (await calendarListResponse.json()) as GoogleCalendarListResponse;
        for (const item of calendarListPayload.items ?? []) {
          if (!item?.id || item.deleted) continue;
          calendarIds.push(item.id);
        }
        pageToken = calendarListPayload.nextPageToken;
      } while (pageToken);

      const selectionMode = normalizeSelectionMode(typedProfile.google_calendar_selection_mode);
      const selectedIds = (typedProfile.google_calendar_selected_ids ?? []).filter(
        (id): id is string => typeof id === "string" && id.length > 0
      );
      const selectedSet = new Set(selectedIds);
      const activeCalendarIds =
        selectionMode === "none"
          ? []
          : selectionMode === "some"
          ? calendarIds.filter((id) => selectedSet.has(id))
          : calendarIds;

      if (activeCalendarIds.length === 0) {
        result.calendar.events_fetched = 0;
      } else {
        const totalMax = 50;
        const perCalendarMax = Math.min(100, Math.max(5, Math.ceil(totalMax / activeCalendarIds.length)));
        const timeMin = new Date().toISOString();
        let totalEvents = 0;

        for (const calendarId of activeCalendarIds) {
          const params = new URLSearchParams({
            maxResults: String(perCalendarMax),
            singleEvents: "true",
            orderBy: "startTime",
            timeMin,
            showDeleted: "false",
          });

          const calendarResponse = await authorizedGet(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`
          );

          if (calendarResponse.status === 401) {
            throw new Error("Google authorization expired. Please sign in again.");
          }
          if (!calendarResponse.ok) {
            // Skip calendars that fail individually so one calendar does not break the whole sync.
            continue;
          }

          const calendarPayload = (await calendarResponse.json()) as GoogleCalendarResponse;
          totalEvents += calendarPayload.items?.length ?? 0;
        }

        result.calendar.events_fetched = totalEvents;
      }
    } catch (error: any) {
      const message = error?.message ?? "calendar-sync-failed";
      result.errors.calendar = message;
    }
  }

  const nowIso = new Date().toISOString();
  result.synced_at = nowIso;
  const lastSyncErrorParts = [result.errors.auth, result.errors.tasks, result.errors.calendar].filter(Boolean);
  const lastSyncErrorText = lastSyncErrorParts.length > 0 ? lastSyncErrorParts.join(" | ").slice(0, 800) : null;

  const profilePatch: Record<string, string | null> = {
    google_last_synced_at: nowIso,
    google_last_sync_error: lastSyncErrorText,
  };
  if (tokenWasRefreshed && accessToken) {
    profilePatch.google_access_token = accessToken;
    if (refreshToken) profilePatch.google_refresh_token = refreshToken;
    profilePatch.google_token_expires_at = refreshedTokenExpiresAt;
  }

  await supabase.from("profiles").update(profilePatch).eq("id", userData.user.id);

  if (result.errors.tasks || result.errors.calendar) {
    return NextResponse.json(result, { status: 207 });
  }

  return NextResponse.json(result);
}
