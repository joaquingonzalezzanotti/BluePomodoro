export type GoogleSyncReason = "manual" | "focus";

export type GoogleSyncResult = {
  ok: boolean;
  throttled: boolean;
  synced_at: string | null;
  tasks: {
    enabled: boolean;
    total_google: number;
    upserted: number;
    removed: number;
  };
  calendar: {
    enabled: boolean;
    events_fetched: number;
  };
  errors: {
    auth?: string;
    tasks?: string;
    calendar?: string;
  };
};

type SyncRequest = {
  accessToken: string;
  reason: GoogleSyncReason;
  force?: boolean;
};

function extractErrorMessage(payload: any): string {
  if (typeof payload?.error === "string" && payload.error) return payload.error;
  if (typeof payload?.message === "string" && payload.message) return payload.message;
  return "google-sync-failed";
}

export async function syncGoogleBridge({ accessToken, reason, force = false }: SyncRequest): Promise<GoogleSyncResult> {
  const response = await fetch("/api/google/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ reason, force }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload));
  }

  return payload as GoogleSyncResult;
}

