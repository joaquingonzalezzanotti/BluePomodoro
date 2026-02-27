export type PomodoroMode = "work" | "break";

export type PomodoroRules = {
  workMinutes: number;
  breakMinutes: number;
  longBreakAfter: number;
  longBreakThreshold: number;
  longBreakMinutesHigh: number;
  longBreakMinutesLow: number;
};

export function isLongBreakMode(
  mode: PomodoroMode,
  sessionsCompleted: number,
  longBreakAfter: number
): boolean {
  return mode === "break" && sessionsCompleted > 0 && sessionsCompleted % longBreakAfter === 0;
}

export function computeBreakMinutes(rules: PomodoroRules, sessionsCompleted: number): number {
  if (sessionsCompleted > 0 && sessionsCompleted % rules.longBreakAfter === 0) {
    return rules.workMinutes >= rules.longBreakThreshold
      ? rules.longBreakMinutesHigh
      : rules.longBreakMinutesLow;
  }
  return rules.breakMinutes;
}

export function getSessionDurationSec(
  mode: PomodoroMode,
  rules: PomodoroRules,
  sessionsCompleted: number
): number {
  if (mode === "work") return rules.workMinutes * 60;
  return computeBreakMinutes(rules, sessionsCompleted) * 60;
}
