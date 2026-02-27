import type { PomodoroSession, Profile } from "@/supabase/types";

export type SessionCountByDay = {
  date: string;
  count: number;
};

export type PomodoroStats = {
  workSessionsCount: number;
  focusHours: number;
  breakOvertimeMinutes: number;
  sessionsByDay: SessionCountByDay[];
  weeklyDeltaPercent: number;
};

export type RewardBadge = {
  id: string;
  name: string;
  description: string;
  color: string;
  unlocked: boolean;
};

export type RewardSummary = {
  points: number;
  level: number;
  nextLevelPoints: number;
  levelProgressPct: number;
  streakDays: number;
  badges: RewardBadge[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function isWorkSession(session: PomodoroSession) {
  return session.mode === "work" && !!session.completed_at;
}

export function buildPomodoroStats(sessions: PomodoroSession[]): PomodoroStats {
  const workSessions = sessions.filter(isWorkSession);
  const workSessionsCount = workSessions.length;

  const totalWorkSec = workSessions.reduce((acc, s) => acc + (s.duration_sec || 0), 0);
  const focusHours = Math.round(totalWorkSec / 3600);

  const breakOvertimeMinutes = Math.round(
    sessions
      .filter(s => s.mode === "break")
      .reduce((acc, s) => acc + (s.overtime_sec || 0), 0) / 60
  );

  const groups: Record<string, number> = {};
  workSessions.forEach(session => {
    const date = new Date(session.completed_at as string).toLocaleDateString();
    groups[date] = (groups[date] || 0) + 1;
  });
  const sessionsByDay = Object.entries(groups)
    .map(([date, count]) => ({ date, count }))
    .reverse();

  const now = Date.now();
  const startCurrent = now - 7 * DAY_MS;
  const startPrev = now - 14 * DAY_MS;

  const currentWeek = workSessions.filter(s => {
    const ts = new Date(s.completed_at as string).getTime();
    return ts >= startCurrent && ts <= now;
  }).length;

  const previousWeek = workSessions.filter(s => {
    const ts = new Date(s.completed_at as string).getTime();
    return ts >= startPrev && ts < startCurrent;
  }).length;

  let weeklyDeltaPercent = 0;
  if (previousWeek === 0) {
    weeklyDeltaPercent = currentWeek === 0 ? 0 : 100;
  } else {
    weeklyDeltaPercent = Math.round(((currentWeek - previousWeek) / previousWeek) * 100);
  }

  return {
    workSessionsCount,
    focusHours,
    breakOvertimeMinutes,
    sessionsByDay,
    weeklyDeltaPercent,
  };
}

export function buildRewardSummary(
  profile: Profile | null,
  sessions: PomodoroSession[],
  stats: PomodoroStats
): RewardSummary {
  const points = profile?.puntos_totales ?? 0;
  const streakDays = profile?.streak_days ?? 0;

  const levelSize = 500;
  const level = Math.floor(points / levelSize) + 1;
  const nextLevelPoints = level * levelSize;
  const levelProgressPct = Math.min(100, Math.round(((points % levelSize) / levelSize) * 100));

  const workSessions = sessions.filter(isWorkSession);
  const hasEarlySession = workSessions.some(session => {
    const hour = new Date(session.completed_at as string).getHours();
    return hour < 9;
  });
  const hasDeepFocus = workSessions.some(session => (session.duration_sec || 0) >= 50 * 60);
  const hasConsistency = streakDays >= 3;
  const hasNoOvertime = stats.breakOvertimeMinutes === 0 && workSessions.length >= 5;
  const hasMarathon = stats.focusHours >= 10;

  const badges: RewardBadge[] = [
    {
      id: "early-bird",
      name: "Madrugador",
      description: "Completaste una sesion antes de las 9am.",
      color: "bg-blue-100 text-blue-600",
      unlocked: hasEarlySession,
    },
    {
      id: "deep-focus",
      name: "Enfoque Profundo",
      description: "Terminaste una sesion de 50 minutos o mas.",
      color: "bg-orange-100 text-orange-600",
      unlocked: hasDeepFocus,
    },
    {
      id: "consistency",
      name: "Consistencia",
      description: "Mantenes una racha de 3 dias.",
      color: "bg-purple-100 text-purple-600",
      unlocked: hasConsistency,
    },
    {
      id: "rest-master",
      name: "Respeta Descansos",
      description: "0 minutos extra de descanso en 5 sesiones.",
      color: "bg-emerald-100 text-emerald-600",
      unlocked: hasNoOvertime,
    },
    {
      id: "marathon",
      name: "Maraton",
      description: "Sumaste 10 horas de foco.",
      color: "bg-slate-100 text-slate-700",
      unlocked: hasMarathon,
    },
  ];

  return {
    points,
    level,
    nextLevelPoints,
    levelProgressPct,
    streakDays,
    badges,
  };
}
