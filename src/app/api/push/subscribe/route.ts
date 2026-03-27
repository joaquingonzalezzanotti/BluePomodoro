import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseUserClient(authHeader: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase env vars");
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, detectSessionInUrl: false },
    global: { headers: { Authorization: authHeader } },
  });
}

function getSupabaseServiceClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing service role env vars");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, detectSessionInUrl: false },
  });
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const installationId = body?.installation_id as string | undefined;
  const subscription = body?.subscription;
  const endpoint = subscription?.endpoint as string | undefined;
  const p256dh = subscription?.keys?.p256dh as string | undefined;
  const auth = subscription?.keys?.auth as string | undefined;

  if (!installationId || !endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Missing subscription payload" }, { status: 400 });
  }

  const userClient = getSupabaseUserClient(authHeader);
  const serviceClient = getSupabaseServiceClient();

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nowIso = new Date().toISOString();
  const { error } = await serviceClient
    .from("push_installations")
    .upsert(
      {
        user_id: userData.user.id,
        installation_id: installationId,
        endpoint,
        p256dh,
        auth,
        last_seen_at: nowIso,
        revoked_at: null,
      },
      { onConflict: "user_id,installation_id" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, installation_id: installationId });
}
