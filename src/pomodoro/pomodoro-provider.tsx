"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSupabase, useUser } from "@/supabase";
import type { Profile } from "@/supabase/types";

type PomodoroMode = "work" | "break";

type PomodoroState = {
  mode: PomodoroMode;
  isActive: boolean;
  workMinutes: number;
  breakMinutes: number;
  longBreakAfter: number;
  longBreakThreshold: number;
  longBreakMinutesHigh: number;
  longBreakMinutesLow: number;
  overtimeGraceSeconds: number;
  sessionsCompleted: number;
  activeTaskId: string | null;
  currentSessionId: string | null;
  currentSessionStartedAt: number | null;
  targetEndAt: number | null;
  pausedRemainingSec: number | null;
  isOvertime: boolean;
  alarmOpen: boolean;
  alarmOpenedAt: number | null;
};

type PomodoroContextValue = PomodoroState & {
  timeLeft: number;
  isLongBreakMode: boolean;
  toggleTimer: () => void;
  resetTimer: () => void;
  stopAlarm: () => void;
  setWorkMinutes: (m: number) => void;
  setBreakMinutes: (m: number) => void;
  setActiveTaskId: (id: string | null) => void;
  syncSettingsFromProfile: (profile: Profile) => void;
};

const PomodoroContext = createContext<PomodoroContextValue | undefined>(undefined);

const STORAGE_KEY = "bluepomodoro:pomo-state:v1";

function safeParseState(raw: string | null): PomodoroState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PomodoroState;
    return parsed;
  } catch {
    return null;
  }
}

function defaultState(): PomodoroState {
  return {
    mode: "work",
    isActive: false,
    workMinutes: 40,
    breakMinutes: 10,
    longBreakAfter: 4,
    longBreakThreshold: 40,
    longBreakMinutesHigh: 20,
    longBreakMinutesLow: 15,
    overtimeGraceSeconds: 10,
    sessionsCompleted: 0,
    activeTaskId: null,
    currentSessionId: null,
    currentSessionStartedAt: null,
    targetEndAt: null,
    pausedRemainingSec: null,
    isOvertime: false,
    alarmOpen: false,
    alarmOpenedAt: null,
  };
}

function computeBreakMinutes(state: PomodoroState): number {
  if (state.sessionsCompleted > 0 && state.sessionsCompleted % state.longBreakAfter === 0) {
    return state.workMinutes >= state.longBreakThreshold
      ? state.longBreakMinutesHigh
      : state.longBreakMinutesLow;
  }
  return state.breakMinutes;
}

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const supabase = useSupabase();
  const { user } = useUser();
  const [state, setState] = useState<PomodoroState>(() => {
    if (typeof window === "undefined") return defaultState();
    return safeParseState(window.localStorage.getItem(STORAGE_KEY)) ?? defaultState();
  });
  const [now, setNow] = useState<number>(() => Date.now());
  const alarmTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (alarmTimerRef.current) {
        clearTimeout(alarmTimerRef.current);
      }
    };
  }, []);

  const isLongBreakMode = useMemo(() => {
    return state.mode === "break" && state.sessionsCompleted > 0 && state.sessionsCompleted % state.longBreakAfter === 0;
  }, [state.mode, state.sessionsCompleted, state.longBreakAfter]);

  const sessionDurationSec = useMemo(() => {
    if (state.mode === "work") return state.workMinutes * 60;
    const breakMins = computeBreakMinutes(state);
    return breakMins * 60;
  }, [
    state.mode,
    state.workMinutes,
    state.breakMinutes,
    state.longBreakAfter,
    state.longBreakThreshold,
    state.longBreakMinutesHigh,
    state.longBreakMinutesLow,
    state.sessionsCompleted,
  ]);

  const timeLeft = useMemo(() => {
    if (!state.targetEndAt) {
      const base = state.pausedRemainingSec ?? sessionDurationSec;
      return Math.round(base);
    }
    return Math.round((state.targetEndAt - now) / 1000);
  }, [state.targetEndAt, now, state.pausedRemainingSec, sessionDurationSec]);

  useEffect(() => {
    if (!state.isActive) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [state.isActive]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleVisibility = () => setNow(Date.now());
    window.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);
    return () => {
      window.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const recordSession = useCallback(
    async (params: {
      mode: PomodoroMode;
      startedAt: number;
      completedAt: number;
      durationSec: number;
      overtimeSec?: number;
      taskId?: string | null;
      clientSessionId: string;
    }) => {
      if (!user) return;
      const { error } = await supabase.from("pomodoro_sessions").insert({
        user_id: user.id,
        task_id: params.taskId ?? null,
        mode: params.mode,
        started_at: new Date(params.startedAt).toISOString(),
        completed_at: new Date(params.completedAt).toISOString(),
        duration_sec: params.durationSec,
        overtime_sec: params.overtimeSec ?? 0,
        client_session_id: params.clientSessionId,
      });
      if (error && error.code !== "23505") {
        console.warn("Failed to record pomodoro session:", error.message);
      }
    },
    [supabase, user?.id]
  );

  const openAlarmWithGrace = useCallback(() => {
    if (alarmTimerRef.current) clearTimeout(alarmTimerRef.current);
    setState(prev => ({
      ...prev,
      alarmOpen: true,
      alarmOpenedAt: Date.now(),
      isActive: false,
    }));

    alarmTimerRef.current = setTimeout(() => {
      setState(prev => {
        if (!prev.alarmOpen || prev.mode !== "break") return prev;
        return {
          ...prev,
          alarmOpen: false,
          isActive: true,
          isOvertime: true,
          targetEndAt: prev.targetEndAt ?? Date.now(),
        };
      });
    }, state.overtimeGraceSeconds * 1000);
  }, [state.overtimeGraceSeconds]);

  useEffect(() => {
    if (!state.isActive || state.targetEndAt === null) return;
    if (timeLeft > 0) return;

    if (state.mode === "work") {
      setState(prev => ({
        ...prev,
        isActive: false,
        alarmOpen: true,
        alarmOpenedAt: Date.now(),
      }));

      if (state.currentSessionId && state.currentSessionStartedAt) {
        const completedAt = state.targetEndAt ?? Date.now();
        recordSession({
          mode: "work",
          startedAt: state.currentSessionStartedAt,
          completedAt,
          durationSec: sessionDurationSec,
          taskId: state.activeTaskId,
          clientSessionId: state.currentSessionId,
        });
      }

      setState(prev => ({
        ...prev,
        sessionsCompleted: prev.sessionsCompleted + 1,
        currentSessionId: null,
        currentSessionStartedAt: null,
        targetEndAt: null,
        pausedRemainingSec: null,
      }));
      return;
    }

    openAlarmWithGrace();
  }, [
    timeLeft,
    state.isActive,
    state.targetEndAt,
    state.mode,
    state.currentSessionId,
    state.currentSessionStartedAt,
    state.activeTaskId,
    sessionDurationSec,
    recordSession,
    openAlarmWithGrace,
  ]);

  const stopAlarm = useCallback(() => {
    if (alarmTimerRef.current) clearTimeout(alarmTimerRef.current);

    if (state.mode === "break" && state.currentSessionId && state.currentSessionStartedAt) {
      const overtimeSec = Math.max(0, Math.round((Date.now() - (state.targetEndAt ?? Date.now())) / 1000));
      recordSession({
        mode: "break",
        startedAt: state.currentSessionStartedAt,
        completedAt: Date.now(),
        durationSec: sessionDurationSec,
        overtimeSec,
        taskId: state.activeTaskId,
        clientSessionId: state.currentSessionId,
      });
    }

    const nextMode: PomodoroMode = state.mode === "work" ? "break" : "work";
    const nextDuration = nextMode === "work" ? state.workMinutes * 60 : computeBreakMinutes(state) * 60;

    setState(prev => ({
      ...prev,
      mode: nextMode,
      isActive: false,
      alarmOpen: false,
      alarmOpenedAt: null,
      isOvertime: false,
      targetEndAt: null,
      pausedRemainingSec: nextDuration,
      currentSessionId: null,
      currentSessionStartedAt: null,
    }));
  }, [
    state.mode,
    state.currentSessionId,
    state.currentSessionStartedAt,
    state.targetEndAt,
    state.workMinutes,
    sessionDurationSec,
    recordSession,
  ]);

  const toggleTimer = useCallback(() => {
    if (state.mode === "break" && state.isOvertime && state.isActive) {
      // In overtime, the primary action should end the break.
      stopAlarm();
      return;
    }

    if (state.isActive) {
      const remaining = state.targetEndAt ? Math.max(0, Math.round((state.targetEndAt - Date.now()) / 1000)) : 0;
      setState(prev => ({
        ...prev,
        isActive: false,
        pausedRemainingSec: remaining,
        targetEndAt: null,
      }));
      return;
    }

    // Resume or start a new session
    if (state.pausedRemainingSec !== null) {
      const startedAt = state.currentSessionStartedAt ?? Date.now();
      const sessionId = state.currentSessionId ?? crypto.randomUUID();
      setState(prev => ({
        ...prev,
        isActive: true,
        isOvertime: false,
        currentSessionId: sessionId,
        currentSessionStartedAt: startedAt,
        targetEndAt: Date.now() + prev.pausedRemainingSec! * 1000,
        pausedRemainingSec: null,
      }));
      return;
    }

    const sessionId = crypto.randomUUID();
    const startedAt = Date.now();
    const duration = sessionDurationSec;
    setState(prev => ({
      ...prev,
      isActive: true,
      isOvertime: false,
      currentSessionId: sessionId,
      currentSessionStartedAt: startedAt,
      targetEndAt: startedAt + duration * 1000,
      pausedRemainingSec: null,
    }));
  }, [
    state.isActive,
    state.targetEndAt,
    state.pausedRemainingSec,
    state.mode,
    state.isOvertime,
    state.currentSessionId,
    state.currentSessionStartedAt,
    sessionDurationSec,
    stopAlarm,
  ]);

  const resetTimer = useCallback(() => {
    const duration = sessionDurationSec;
    setState(prev => ({
      ...prev,
      isActive: false,
      targetEndAt: null,
      pausedRemainingSec: duration,
      isOvertime: false,
      currentSessionId: null,
      currentSessionStartedAt: null,
    }));
  }, [sessionDurationSec]);

  const setWorkMinutes = useCallback((m: number) => {
    setState(prev => ({
      ...prev,
      workMinutes: Math.max(1, Math.round(m)),
    }));
  }, []);

  const setBreakMinutes = useCallback((m: number) => {
    setState(prev => ({
      ...prev,
      breakMinutes: Math.max(1, Math.round(m)),
    }));
  }, []);

  const setActiveTaskId = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, activeTaskId: id }));
  }, []);

  const syncSettingsFromProfile = useCallback((profile: Profile) => {
    setState(prev => ({
      ...prev,
      workMinutes: profile.pomodoro_work_minutes ?? prev.workMinutes,
      breakMinutes: profile.pomodoro_break_minutes ?? prev.breakMinutes,
      longBreakAfter: profile.pomodoro_long_break_after ?? prev.longBreakAfter,
      longBreakThreshold: profile.pomodoro_long_break_threshold ?? prev.longBreakThreshold,
      longBreakMinutesHigh: profile.pomodoro_long_break_minutes_high ?? prev.longBreakMinutesHigh,
      longBreakMinutesLow: profile.pomodoro_long_break_minutes_low ?? prev.longBreakMinutesLow,
      overtimeGraceSeconds: profile.pomodoro_overtime_grace_seconds ?? prev.overtimeGraceSeconds,
    }));
  }, []);

  const value: PomodoroContextValue = {
    ...state,
    timeLeft,
    isLongBreakMode,
    toggleTimer,
    resetTimer,
    stopAlarm,
    setWorkMinutes,
    setBreakMinutes,
    setActiveTaskId,
    syncSettingsFromProfile,
  };

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}

export function usePomodoro() {
  const ctx = useContext(PomodoroContext);
  if (!ctx) {
    throw new Error("usePomodoro must be used within PomodoroProvider");
  }
  return ctx;
}
