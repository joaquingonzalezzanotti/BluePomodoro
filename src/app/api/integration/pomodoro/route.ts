import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

async function getProfileFromToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid authorization header");
  }

  const token = authHeader.substring(7);
  if (!token || token.trim() === "") {
    throw new Error("Empty authorization token");
  }

  const supabase = getSupabaseAdmin();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("api_token", token)
    .maybeSingle();

  if (error || !profile) {
    throw new Error("Invalid API Token");
  }

  return profile.id;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getProfileFromToken(req);
    const body = await req.json();

    const { mode, started_at, duration_sec, overtime_sec, task_id, client_session_id } = body;

    if (!mode || !["work", "break"].includes(mode)) {
      return NextResponse.json({ error: "Invalid or missing pomodoro mode (must be 'work' or 'break')" }, { status: 400 });
    }

    if (!started_at) {
      return NextResponse.json({ error: "Missing started_at timestamp" }, { status: 400 });
    }

    if (duration_sec === undefined || isNaN(parseInt(duration_sec))) {
      return NextResponse.json({ error: "Invalid or missing duration_sec" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Verify task belongs to user if task_id is provided
    if (task_id) {
      const { data: task, error: checkError } = await supabase
        .from("tasks")
        .select("id")
        .eq("id", task_id)
        .eq("user_id", userId)
        .maybeSingle();

      if (checkError || !task) {
        return NextResponse.json({ error: "Task not found or access denied" }, { status: 400 });
      }
    }

    const sessionId = client_session_id || crypto.randomUUID();
    const startedAtDate = new Date(started_at);
    const completedAtDate = new Date(startedAtDate.getTime() + duration_sec * 1000 + (overtime_sec || 0) * 1000);

    const { data: session, error: insertError } = await supabase
      .from("pomodoro_sessions")
      .insert({
        user_id: userId,
        task_id: task_id || null,
        mode,
        started_at: startedAtDate.toISOString(),
        completed_at: completedAtDate.toISOString(),
        duration_sec: parseInt(duration_sec),
        overtime_sec: overtime_sec ? parseInt(overtime_sec) : 0,
        client_session_id: sessionId,
      })
      .select("*")
      .single();

    if (insertError) {
      // Check for duplicate client_session_id (in case of retry)
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "Duplicate session detected", code: "DUPLICATE" }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to record session: " + insertError.message }, { status: 500 });
    }

    // Return the inserted session along with updated user stats
    const { data: updatedProfile } = await supabase
      .from("profiles")
      .select("puntos_totales,streak_days,last_focus_date")
      .eq("id", userId)
      .single();

    return NextResponse.json({
      session,
      profile: updatedProfile
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 401 });
  }
}
