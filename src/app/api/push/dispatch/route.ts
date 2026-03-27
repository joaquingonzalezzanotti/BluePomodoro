import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { dispatchDuePushJobs } from "@/push/dispatch";
import { PUSH_JOB_STATUS } from "@/push/constants";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dispatchSecret = process.env.PUSH_DISPATCH_SECRET;
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:admin@bluepomodoro.app";

function getServiceClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing service role env vars");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, detectSessionInUrl: false },
  });
}

export async function POST(req: Request) {
  if (!dispatchSecret) {
    return NextResponse.json({ error: "Missing PUSH_DISPATCH_SECRET" }, { status: 500 });
  }

  const secret = req.headers.get("x-push-dispatch-secret");
  if (secret !== dispatchSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ error: "Missing VAPID keys" }, { status: 500 });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const supabase = getServiceClient();

  const metrics = await dispatchDuePushJobs({
    batchSize: 100,
    repo: {
      claimDueJobs: async (limit) => {
        const { data, error } = await supabase.rpc("claim_due_push_jobs", { p_limit: limit });
        if (error) throw error;
        return (data ?? []) as any[];
      },
      getActiveInstallation: async ({ userId, installationId }) => {
        const { data, error } = await supabase
          .from("push_installations")
          .select("endpoint,p256dh,auth")
          .eq("user_id", userId)
          .eq("installation_id", installationId)
          .is("revoked_at", null)
          .maybeSingle();
        if (error) throw error;
        return data;
      },
      markSent: async (jobId, attempts) => {
        const { error } = await supabase
          .from("push_jobs")
          .update({
            status: PUSH_JOB_STATUS.sent,
            attempts,
            sent_at: new Date().toISOString(),
            claimed_at: null,
            last_error: null,
          })
          .eq("id", jobId)
          .eq("status", PUSH_JOB_STATUS.processing);
        if (error) throw error;
      },
      markFailed: async ({ jobId, attempts, lastError, terminal }) => {
        const { error } = await supabase
          .from("push_jobs")
          .update({
            status: terminal ? PUSH_JOB_STATUS.failed : PUSH_JOB_STATUS.scheduled,
            attempts,
            last_error: lastError,
            claimed_at: null,
          })
          .eq("id", jobId)
          .eq("status", PUSH_JOB_STATUS.processing);
        if (error) throw error;
      },
      revokeInstallation: async ({ userId, installationId }) => {
        const { error } = await supabase
          .from("push_installations")
          .update({ revoked_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("installation_id", installationId)
          .is("revoked_at", null);
        if (error) throw error;
      },
      releaseClaim: async (jobId) => {
        const { error } = await supabase
          .from("push_jobs")
          .update({
            status: PUSH_JOB_STATUS.scheduled,
            claimed_at: null,
          })
          .eq("id", jobId)
          .eq("status", PUSH_JOB_STATUS.processing);
        if (error) throw error;
      },
    },
  });

  return NextResponse.json({ ok: true, metrics, dispatchedAt: new Date().toISOString() });
}
