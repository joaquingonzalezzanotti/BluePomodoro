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

type BuildPomodoroStatsOptions = {
  timeZone?: string;
};

type BuildRewardSummaryOptions = {
  timeZone?: string;
  isCurrentPeriod?: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function getDateParts(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  const year = Number(parts.find(part => part.type === "year")?.value ?? "0");
  const month = Number(parts.find(part => part.type === "month")?.value ?? "1");
  const day = Number(parts.find(part => part.type === "day")?.value ?? "1");

  return { year, month, day };
}

function getHourInTimeZone(value: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(value);
  return Number(parts.find(part => part.type === "hour")?.value ?? "0");
}

export function getDateKeyInTimeZone(value: Date | string, timeZone: string): string {
  const parsed = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(parsed.getTime())) return "";
  const { year, month, day } = getDateParts(parsed, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getMonthKeyInTimeZone(value: Date | string, timeZone: string): string {
  const parsed = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(parsed.getTime())) return "";
  const { year, month } = getDateParts(parsed, timeZone);
  return `${year}-${String(month).padStart(2, "0")}`;
}

function dateKeyToDate(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, 12, 0, 0);
}

function getCurrentStreakDays(workSessions: PomodoroSession[], timeZone: string): number {
  if (!workSessions.length) return 0;

  const dateKeys = new Set<string>();
  for (const session of workSessions) {
    if (!session.completed_at) continue;
    const key = getDateKeyInTimeZone(session.completed_at, timeZone);
    if (key) dateKeys.add(key);
  }

  const uniqueDates = Array.from(dateKeys).sort().reverse();
  if (!uniqueDates.length) return 0;

  const todayKey = getDateKeyInTimeZone(new Date(), timeZone);
  const yesterdayKey = getDateKeyInTimeZone(new Date(Date.now() - DAY_MS), timeZone);
  const mostRecent = uniqueDates[0];

  if (mostRecent !== todayKey && mostRecent !== yesterdayKey) return 0;

  let streak = 1;
  let cursor = dateKeyToDate(mostRecent);
  for (let i = 1; i < uniqueDates.length; i += 1) {
    const expected = getDateKeyInTimeZone(new Date(cursor.getTime() - DAY_MS), timeZone);
    if (uniqueDates[i] !== expected) break;
    streak += 1;
    cursor = dateKeyToDate(uniqueDates[i]);
  }

  return streak;
}

function getLongestStreakDays(workSessions: PomodoroSession[], timeZone: string): number {
  if (!workSessions.length) return 0;

  const dateKeys = new Set<string>();
  for (const session of workSessions) {
    if (!session.completed_at) continue;
    const key = getDateKeyInTimeZone(session.completed_at, timeZone);
    if (key) dateKeys.add(key);
  }
  const ordered = Array.from(dateKeys).sort();
  if (!ordered.length) return 0;

  let longest = 1;
  let current = 1;
  for (let i = 1; i < ordered.length; i += 1) {
    const prevDate = dateKeyToDate(ordered[i - 1]);
    const expected = getDateKeyInTimeZone(new Date(prevDate.getTime() + DAY_MS), timeZone);
    if (ordered[i] === expected) {
      current += 1;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }

  return longest;
}

function isWorkSession(session: PomodoroSession) {
  return session.mode === "work" && !!session.completed_at;
}

export function buildPomodoroStats(
  sessions: PomodoroSession[],
  options: BuildPomodoroStatsOptions = {}
): PomodoroStats {
  const timeZone = options.timeZone ?? "UTC";
  const workSessions = sessions.filter(isWorkSession);
  const workSessionsCount = workSessions.length;

  const totalWorkSec = workSessions.reduce((acc, s) => acc + (s.duration_sec || 0), 0);
  const focusHours = Math.round(totalWorkSec / 3600);

  const breakOvertimeMinutes = Math.round(
    sessions
      .filter(s => s.mode === "break" && !!s.completed_at)
      .reduce((acc, s) => acc + (s.overtime_sec || 0), 0) / 60
  );

  const groups: Record<string, number> = {};
  workSessions.forEach(session => {
    if (!session.completed_at) return;
    const key = getDateKeyInTimeZone(session.completed_at, timeZone);
    if (!key) return;
    groups[key] = (groups[key] || 0) + 1;
  });

  const sessionsByDay = Object.entries(groups)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dateKey, count]) => {
      const [year, month, day] = dateKey.split("-");
      return { date: `${day}/${month}`, count };
    });

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
  stats: PomodoroStats,
  options: BuildRewardSummaryOptions = {}
): RewardSummary {
  const timeZone = options.timeZone ?? profile?.timezone ?? "UTC";
  const isCurrentPeriod = options.isCurrentPeriod ?? true;
  const workSessions = sessions.filter(isWorkSession);
  const streakDays = isCurrentPeriod
    ? getCurrentStreakDays(workSessions, timeZone)
    : getLongestStreakDays(workSessions, timeZone);

  const focusMinutes = Math.round(
    workSessions.reduce((acc, session) => acc + (session.duration_sec || 0), 0) / 60
  );
  const overtimeMinutes = Math.round(
    sessions
      .filter(s => s.mode === "break" && !!s.completed_at)
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
    if (!session.completed_at) return;
    const key = getDateKeyInTimeZone(session.completed_at, timeZone);
    if (!key) return;
    sessionsByDate[key] = (sessionsByDate[key] || 0) + 1;
  });
  const maxSessionsInDay = Object.values(sessionsByDate).reduce((acc, count) => Math.max(acc, count), 0);

  const hasEarlySession = workSessions.some(session => {
    if (!session.completed_at) return false;
    return getHourInTimeZone(new Date(session.completed_at), timeZone) < 9;
  });
  const hasNightSession = workSessions.some(session => {
    if (!session.completed_at) return false;
    return getHourInTimeZone(new Date(session.completed_at), timeZone) >= 22;
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
      description: "Terminaste tu primera sesion del mes.",
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
      description: "Sumaste 10 horas de foco en el mes.",
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
