export const INSTALLATION_ID_STORAGE_KEY = "bluepomodoro:installation-id:v1";

export const PUSH_JOB_STATUS = {
  scheduled: "scheduled",
  processing: "processing",
  sent: "sent",
  failed: "failed",
  canceled: "canceled",
} as const;

export type PushJobStatus = (typeof PUSH_JOB_STATUS)[keyof typeof PUSH_JOB_STATUS];

export const PUSH_EVENT_TYPE = {
  workComplete: "work_complete",
  breakComplete: "break_complete",
} as const;

export type PushEventType = (typeof PUSH_EVENT_TYPE)[keyof typeof PUSH_EVENT_TYPE];

export const PUSH_MAX_ATTEMPTS = 3;
