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

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateKeyToDate(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, 12, 0, 0);
}

function computeStreakDays(workSessions: PomodoroSession[]): number {
  if (!workSessions.length) return 0;
  const dateKeys = new Set<string>();
  for (const session of workSessions) {
    const completed = session.completed_at ? new Date(session.completed_at) : null;
    if (!completed) continue;
    dateKeys.add(getLocalDateKey(completed));
  }

  const uniqueDates = Array.from(dateKeys).sort().reverse();
  if (!uniqueDates.length) return 0;

  const todayKey = getLocalDateKey(new Date());
  const yesterdayKey = getLocalDateKey(new Date(Date.now() - DAY_MS));
  const mostRecent = uniqueDates[0];

  if (mostRecent !== todayKey && mostRecent !== yesterdayKey) return 0;

  let streak = 1;
  let cursor = dateKeyToDate(mostRecent);
  for (let i = 1; i < uniqueDates.length; i += 1) {
    const expected = getLocalDateKey(new Date(cursor.getTime() - DAY_MS));
    if (uniqueDates[i] !== expected) break;
    streak += 1;
    cursor = dateKeyToDate(uniqueDates[i]);
  }

  return streak;
}

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
  _profile: Profile | null,
  sessions: PomodoroSession[],
  stats: PomodoroStats
): RewardSummary {
  const workSessions = sessions.filter(isWorkSession);
  const streakDays = computeStreakDays(workSessions);

  const focusMinutes = Math.round(
    workSessions.reduce((acc, session) => acc + (session.duration_sec || 0), 0) / 60
  );
  const overtimeMinutes = Math.round(
    sessions
      .filter(s => s.mode === "break")
      .reduce((acc, s) => acc + (s.overtime_sec || 0), 0) / 60
  );

  const basePoints = focusMinutes * 2;
  const sessionBonus = workSessions.length * 10;
  const streakBonus = streakDays * 25;
  const overtimePenalty = overtimeMinutes * 5;
  const points = Math.max(0, basePoints + sessionBonus + streakBonus - overtimePenalty);

  const levelSize = 600;
  const level = Math.floor(points / levelSize) + 1;
  const nextLevelPoints = level * levelSize;
  const levelProgressPct = Math.min(100, Math.round(((points % levelSize) / levelSize) * 100));

  const sessionsByDate: Record<string, number> = {};
  workSessions.forEach(session => {
    const completed = session.completed_at ? new Date(session.completed_at) : null;
    if (!completed) return;
    const key = getLocalDateKey(completed);
    sessionsByDate[key] = (sessionsByDate[key] || 0) + 1;
  });
  const maxSessionsInDay = Object.values(sessionsByDate).reduce((acc, count) => Math.max(acc, count), 0);

  const hasEarlySession = workSessions.some(session => {
    const hour = new Date(session.completed_at as string).getHours();
    return hour < 9;
  });
  const hasNightSession = workSessions.some(session => {
    const hour = new Date(session.completed_at as string).getHours();
    return hour >= 22;
  });
  const hasDeepFocus = workSessions.some(session => (session.duration_sec || 0) >= 50 * 60);
  const hasConsistency = streakDays >= 3;
  const hasStreakMaster = streakDays >= 7;
  const hasNoOvertime = overtimeMinutes === 0 && workSessions.length >= 5;
  const hasMarathon = stats.focusHours >= 10;
  const hasComboDay = maxSessionsInDay >= 4;
  const hasFirstSession = workSessions.length >= 1;

  const badges: RewardBadge[] = [
    {
      id: "first-focus",
      name: "Primer Enfoque",
      description: "Terminaste tu primera sesion real.",
      color: "bg-slate-100 text-slate-700",
      unlocked: hasFirstSession,
    },
    {
      id: "early-bird",
      name: "Madrugador",
      description: "Completaste una sesion antes de las 9am.",
      color: "bg-blue-100 text-blue-600",
      unlocked: hasEarlySession,
    },
    {
      id: "night-owl",
      name: "Buho Nocturno",
      description: "Cerraste una sesion despues de las 10pm.",
      color: "bg-indigo-100 text-indigo-700",
      unlocked: hasNightSession,
    },
    {
      id: "deep-focus",
      name: "Enfoque Profundo",
      description: "Terminaste una sesion de 50 minutos o mas.",
      color: "bg-orange-100 text-orange-600",
      unlocked: hasDeepFocus,
    },
    {
      id: "combo-day",
      name: "Combo Diario",
      description: "Lograste 4 sesiones en un mismo dia.",
      color: "bg-cyan-100 text-cyan-700",
      unlocked: hasComboDay,
    },
    {
      id: "consistency",
      name: "Consistencia",
      description: "Mantenes una racha de 3 dias.",
      color: "bg-purple-100 text-purple-600",
      unlocked: hasConsistency,
    },
    {
      id: "streak-master",
      name: "Racha Legendaria",
      description: "Llegaste a 7 dias seguidos.",
      color: "bg-fuchsia-100 text-fuchsia-700",
      unlocked: hasStreakMaster,
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
