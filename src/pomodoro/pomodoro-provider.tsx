"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSession, useSupabase, useUser } from "@/supabase";
import type { Profile } from "@/supabase/types";
import { getSessionDurationSec, isLongBreakMode, type PomodoroMode, type PomodoroRules } from "@/pomodoro/logic";

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

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const supabase = useSupabase();
  const { user } = useUser();
  const { session } = useSession();
  const [state, setState] = useState<PomodoroState>(() => {
    if (typeof window === "undefined") return defaultState();
    return safeParseState(window.localStorage.getItem(STORAGE_KEY)) ?? defaultState();
  });
  const [now, setNow] = useState<number>(() => Date.now());
  const alarmTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pushSentRef = useRef<Set<string>>(new Set());

  const sendPush = useCallback(
    async (payload: { title: string; body: string; tag?: string; url?: string }) => {
      if (!session?.access_token) return;
      try {
        await fetch("/api/push/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        });
      } catch {
        // ignore push errors
      }
    },
    [session?.access_token]
  );

  const notifyOnce = useCallback(
    (key: string, payload: { title: string; body: string; tag?: string; url?: string }) => {
      if (pushSentRef.current.has(key)) return;
      pushSentRef.current.add(key);
      sendPush(payload);
    },
    [sendPush]
  );

  useEffect(() => {
    return () => {
      if (alarmTimerRef.current) {
        clearTimeout(alarmTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    pushSentRef.current.clear();
  }, [state.currentSessionId, user?.id]);

  useEffect(() => {
    if (!state.alarmOpen || state.mode !== "break" || !state.alarmOpenedAt) {
      if (alarmTimerRef.current) {
        clearTimeout(alarmTimerRef.current);
        alarmTimerRef.current = null;
      }
      return;
    }

    if (alarmTimerRef.current) {
      clearTimeout(alarmTimerRef.current);
      alarmTimerRef.current = null;
    }

    const elapsedMs = Date.now() - state.alarmOpenedAt;
    const remainingMs = state.overtimeGraceSeconds * 1000 - elapsedMs;

    if (remainingMs <= 0) {
      notifyOnce(`overtime:${state.currentSessionId ?? state.targetEndAt ?? "break"}`, {
        title: "Descanso excedido",
        body: "El descanso se pasÃ³ del tiempo. Es hora de volver al foco.",
        tag: "break-overtime",
        url: "/app",
      });
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
      return;
    }

    alarmTimerRef.current = setTimeout(() => {
      notifyOnce(`overtime:${state.currentSessionId ?? state.targetEndAt ?? "break"}`, {
        title: "Descanso excedido",
        body: "El descanso se pasÃ³ del tiempo. Es hora de volver al foco.",
        tag: "break-overtime",
        url: "/app",
      });
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
    }, remainingMs);

    return () => {
      if (alarmTimerRef.current) {
        clearTimeout(alarmTimerRef.current);
        alarmTimerRef.current = null;
      }
    };
  }, [
    state.alarmOpen,
    state.mode,
    state.alarmOpenedAt,
    state.overtimeGraceSeconds,
    state.currentSessionId,
    state.targetEndAt,
    notifyOnce,
  ]);

  const rules = useMemo<PomodoroRules>(() => ({
    workMinutes: state.workMinutes,
    breakMinutes: state.breakMinutes,
    longBreakAfter: state.longBreakAfter,
    longBreakThreshold: state.longBreakThreshold,
    longBreakMinutesHigh: state.longBreakMinutesHigh,
    longBreakMinutesLow: state.longBreakMinutesLow,
  }), [
    state.workMinutes,
    state.breakMinutes,
    state.longBreakAfter,
    state.longBreakThreshold,
    state.longBreakMinutesHigh,
    state.longBreakMinutesLow,
  ]);

  const isLongBreakModeValue = useMemo(() => {
    return isLongBreakMode(state.mode, state.sessionsCompleted, state.longBreakAfter);
  }, [state.mode, state.sessionsCompleted, state.longBreakAfter]);

  const sessionDurationSec = useMemo(() => {
    return getSessionDurationSec(state.mode, rules, state.sessionsCompleted);
  }, [state.mode, rules, state.sessionsCompleted]);

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
    setState(prev => ({
      ...prev,
      alarmOpen: true,
      alarmOpenedAt: Date.now(),
      isActive: false,
    }));
  }, [state.overtimeGraceSeconds]);

  useEffect(() => {
    if (!state.isActive || state.targetEndAt === null) return;
    if (timeLeft > 0) return;

    if (state.mode === "work") {
      const nextSessions = state.sessionsCompleted + 1;
      const longBreakNext = isLongBreakMode("break", nextSessions, state.longBreakAfter);
      notifyOnce(`work:${state.currentSessionId ?? state.targetEndAt ?? nextSessions}`, {
        title: "Pomodoro completado",
        body: longBreakNext
          ? "Descanso largo disponible. Recupera energias."
          : "Hora de descansar unos minutos.",
        tag: longBreakNext ? "long-break" : "work-complete",
        url: "/app",
      });
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
    state.sessionsCompleted,
    state.longBreakAfter,
    state.targetEndAt,
    sessionDurationSec,
    recordSession,
    openAlarmWithGrace,
    notifyOnce,
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

    if (state.mode === "break") {
      notifyOnce(`break:${state.currentSessionId ?? state.targetEndAt ?? "break-end"}`, {
        title: "Descanso terminado",
        body: "Hora de volver al foco.",
        tag: "break-complete",
        url: "/app",
      });
    }

    const nextMode: PomodoroMode = state.mode === "work" ? "break" : "work";
    const nextDuration = getSessionDurationSec(nextMode, rules, state.sessionsCompleted);

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
    notifyOnce,
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
    isLongBreakMode: isLongBreakModeValue,
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
