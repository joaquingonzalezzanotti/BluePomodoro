import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cancelPushJob, schedulePushJob } from "@/push/push-jobs";
import { PUSH_EVENT_TYPE, type PushEventType } from "@/push/constants";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type JobActionBody =
  | {
      action: "schedule";
      sessionId: string;
      installationId: string;
      eventType: PushEventType;
      fireAt: string;
      payload: Record<string, unknown>;
    }
  | {
      action: "cancel";
      sessionId: string;
      eventType?: PushEventType;
    };

function getUserClient(authHeader: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase env vars");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, detectSessionInUrl: false },
    global: { headers: { Authorization: authHeader } },
  });
}

function getServiceClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing service role env vars");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, detectSessionInUrl: false },
  });
}

function isValidEventType(value: unknown): value is PushEventType {
  return value === PUSH_EVENT_TYPE.workComplete || value === PUSH_EVENT_TYPE.breakComplete;
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as JobActionBody;

  const userClient = getUserClient(authHeader);
  const serviceClient = getServiceClient();
  const { data: userData, error: userError } = await userClient.auth.getUser();

  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!body?.sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  if (body.action === "schedule") {
    if (!body.installationId || !body.fireAt || !isValidEventType(body.eventType)) {
      return NextResponse.json({ error: "Missing schedule payload" }, { status: 400 });
    }

    await schedulePushJob(serviceClient, {
      userId: userData.user.id,
      sessionId: body.sessionId,
      eventType: body.eventType,
      installationId: body.installationId,
      fireAt: body.fireAt,
      payload: body.payload ?? {},
    });

    return NextResponse.json({ ok: true, action: "schedule" });
  }

  if (body.action === "cancel") {
    const canceled = await cancelPushJob(serviceClient, {
      userId: userData.user.id,
      sessionId: body.sessionId,
      eventType: isValidEventType(body.eventType) ? body.eventType : undefined,
    });
    return NextResponse.json({ ok: true, action: "cancel", canceled });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
