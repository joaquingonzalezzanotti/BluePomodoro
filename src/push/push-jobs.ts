import type { SupabaseClient } from "@supabase/supabase-js";
import { PUSH_JOB_STATUS, type PushEventType } from "@/push/constants";

type Json = Record<string, unknown>;

export type SchedulePushJobInput = {
  userId: string;
  sessionId: string;
  eventType: PushEventType;
  installationId: string;
  fireAt: string;
  payload: Json;
};

export async function schedulePushJob(
  supabase: SupabaseClient,
  input: SchedulePushJobInput,
): Promise<void> {
  const { error } = await supabase.from("push_jobs").upsert(
    {
      user_id: input.userId,
      session_id: input.sessionId,
      event_type: input.eventType,
      installation_id: input.installationId,
      fire_at: input.fireAt,
      payload: input.payload,
      status: PUSH_JOB_STATUS.scheduled,
      attempts: 0,
      claimed_at: null,
      sent_at: null,
      canceled_at: null,
      last_error: null,
    },
    {
      onConflict: "user_id,session_id,event_type",
      ignoreDuplicates: false,
    },
  );

  if (error) throw error;
}

export async function cancelPushJob(
  supabase: SupabaseClient,
  params: { userId: string; sessionId: string; eventType?: PushEventType },
): Promise<number> {
  let query = supabase
    .from("push_jobs")
    .update({
      status: PUSH_JOB_STATUS.canceled,
      canceled_at: new Date().toISOString(),
      claimed_at: null,
      last_error: null,
    })
    .eq("user_id", params.userId)
    .eq("session_id", params.sessionId)
    .in("status", [PUSH_JOB_STATUS.scheduled, PUSH_JOB_STATUS.processing])
    .select("id");

  if (params.eventType) {
    query = query.eq("event_type", params.eventType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data?.length ?? 0;
}
