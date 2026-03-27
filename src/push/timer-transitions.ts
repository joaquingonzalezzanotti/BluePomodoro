import { PUSH_EVENT_TYPE, type PushEventType } from "@/push/constants";
import type { PomodoroMode } from "@/pomodoro/logic";

export type PushJobOperation =
  | { type: "schedule"; sessionId: string; mode: PomodoroMode; eventType: PushEventType; fireAt: number }
  | { type: "cancel"; sessionId: string; mode: PomodoroMode; eventType: PushEventType };

export function getEventTypeForMode(mode: PomodoroMode): PushEventType {
  return mode === "work" ? PUSH_EVENT_TYPE.workComplete : PUSH_EVENT_TYPE.breakComplete;
}

export function buildScheduleOperation(params: {
  mode: PomodoroMode;
  sessionId: string;
  fireAt: number;
}): PushJobOperation {
  return {
    type: "schedule",
    mode: params.mode,
    sessionId: params.sessionId,
    eventType: getEventTypeForMode(params.mode),
    fireAt: params.fireAt,
  };
}

export function buildCancelOperation(params: {
  mode: PomodoroMode;
  sessionId: string;
}): PushJobOperation {
  return {
    type: "cancel",
    mode: params.mode,
    sessionId: params.sessionId,
    eventType: getEventTypeForMode(params.mode),
  };
}
