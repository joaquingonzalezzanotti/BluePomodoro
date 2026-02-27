export type Profile = {
  id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
  puntos_totales: number;
  streak_days: number;
  last_focus_date: string | null;
  modo_estricto_activo: boolean;
  sitios_bloqueados: string[] | null;
  spotify_playlist_url: string | null;
  spotify_access_token: string | null;
  spotify_refresh_token: string | null;
  spotify_token_expires_at: string | null;
  google_calendar_sync: boolean;
  google_tasks_sync: boolean;
  pomodoro_work_minutes: number;
  pomodoro_break_minutes: number;
  pomodoro_long_break_after: number;
  pomodoro_long_break_threshold: number;
  pomodoro_long_break_minutes_high: number;
  pomodoro_long_break_minutes_low: number;
  pomodoro_overtime_grace_seconds: number;
};

export type TaskStatus = "Pendiente" | "En Proceso" | "Completada";

export type Task = {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  status: TaskStatus;
  effort_estimated: number;
  pomodoros_completed: number;
  subtasks: Array<{ id: string; text: string; completed: boolean }> | null;
  created_at: string;
  due_date: string | null;
  priority: string | null;
  imported_from_google: boolean;
  google_task_id: string | null;
};

export type Project = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type Subject = {
  id: string;
  user_id: string;
  project_id: string;
  name: string;
  created_at: string;
};

export type PomodoroSession = {
  id: string;
  user_id: string;
  task_id: string | null;
  mode: "work" | "break";
  started_at: string;
  completed_at: string | null;
  duration_sec: number;
  overtime_sec: number;
  created_at: string;
  client_session_id: string;
};

export type PushSubscription = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
  last_seen_at: string | null;
};
