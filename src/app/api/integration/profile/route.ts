import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove "Bearer "
    if (!token || token.trim() === "") {
      return NextResponse.json({ error: "Empty authorization token" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("api_token", token)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Database error: " + error.message }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: "Invalid API Token" }, { status: 401 });
    }

    // Resolve today's date in user's timezone
    const tz = profile.timezone || 'America/Argentina/Buenos_Aires';
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz });

    const { data: todayStats } = await supabase
      .from("user_daily_stats")
      .select("*")
      .eq("user_id", profile.id)
      .eq("local_date", todayStr)
      .maybeSingle();

    // Return sanitized profile details + stats
    return NextResponse.json({
      id: profile.id,
      display_name: profile.display_name,
      email: profile.email,
      timezone: profile.timezone,
      puntos_totales: profile.puntos_totales,
      streak_days: profile.streak_days,
      pomodoro: {
        work_minutes: profile.pomodoro_work_minutes,
        break_minutes: profile.pomodoro_break_minutes,
        long_break_after: profile.pomodoro_long_break_after,
        long_break_threshold: profile.pomodoro_long_break_threshold,
        long_break_minutes_high: profile.pomodoro_long_break_minutes_high,
        long_break_minutes_low: profile.pomodoro_long_break_minutes_low,
        overtime_grace_seconds: profile.pomodoro_overtime_grace_seconds,
      },
      stats: todayStats ? {
        work_sessions: todayStats.work_sessions || 0,
        break_sessions: todayStats.break_sessions || 0,
        focus_minutes: todayStats.focus_minutes || 0,
        break_minutes: todayStats.break_minutes || 0,
        overtime_minutes: todayStats.overtime_minutes || 0,
        tasks_completed: todayStats.tasks_completed || 0,
        tasks_created: todayStats.tasks_created || 0,
      } : {
        work_sessions: 0,
        break_sessions: 0,
        focus_minutes: 0,
        break_minutes: 0,
        overtime_minutes: 0,
        tasks_completed: 0,
        tasks_created: 0,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
