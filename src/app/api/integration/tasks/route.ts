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

export async function GET(req: NextRequest) {
  try {
    const userId = await getProfileFromToken(req);
    const supabase = getSupabaseAdmin();

    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch tasks: " + error.message }, { status: 500 });
    }

    return NextResponse.json({ tasks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getProfileFromToken(req);
    const body = await req.json();

    const { title, priority, effort_estimated, due_date } = body;
    if (!title || title.trim() === "") {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        user_id: userId,
        title: title.trim(),
        priority: priority || "Media",
        effort_estimated: effort_estimated !== undefined ? Math.max(1, parseInt(effort_estimated)) : 1,
        due_date: due_date || null,
        status: "Pendiente",
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create task: " + error.message }, { status: 500 });
    }

    return NextResponse.json({ task });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getProfileFromToken(req);
    const body = await req.json();

    const { id, status, effort_estimated, pomodoros_completed, title, priority } = body;
    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Verify task belongs to user
    const { data: existingTask, error: checkError } = await supabase
      .from("tasks")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (checkError || !existingTask) {
      return NextResponse.json({ error: "Task not found or access denied" }, { status: 404 });
    }

    // Build update object
    const updateData: any = {};
    if (status !== undefined) {
      if (!["Pendiente", "En Proceso", "Completada"].includes(status)) {
        return NextResponse.json({ error: "Invalid task status" }, { status: 400 });
      }
      updateData.status = status;
      if (status === "Completada") {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }
    }
    if (effort_estimated !== undefined) {
      updateData.effort_estimated = Math.max(0, parseInt(effort_estimated));
    }
    if (pomodoros_completed !== undefined) {
      updateData.pomodoros_completed = Math.max(0, parseInt(pomodoros_completed));
    }
    if (title !== undefined) {
      updateData.title = title.trim();
    }
    if (priority !== undefined) {
      updateData.priority = priority;
    }

    const { data: updatedTask, error: updateError } = await supabase
      .from("tasks")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: "Failed to update task: " + updateError.message }, { status: 500 });
    }

    return NextResponse.json({ task: updatedTask });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 401 });
  }
}
