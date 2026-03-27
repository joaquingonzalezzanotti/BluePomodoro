import webpush from "web-push";
import { PUSH_JOB_STATUS, PUSH_MAX_ATTEMPTS } from "@/push/constants";

export type DuePushJob = {
  id: string;
  user_id: string;
  session_id: string;
  event_type: string;
  installation_id: string;
  fire_at: string;
  attempts: number;
  payload: Record<string, unknown>;
};

export type PushInstallation = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type DispatcherRepo = {
  claimDueJobs: (limit: number) => Promise<DuePushJob[]>;
  getActiveInstallation: (params: { userId: string; installationId: string }) => Promise<PushInstallation | null>;
  markSent: (jobId: string, attempts: number) => Promise<void>;
  markFailed: (params: { jobId: string; attempts: number; lastError: string; terminal: boolean }) => Promise<void>;
  revokeInstallation: (params: { userId: string; installationId: string }) => Promise<void>;
  releaseClaim: (jobId: string) => Promise<void>;
};

export type DispatchMetrics = {
  claimed: number;
  sent: number;
  failed: number;
  canceled: number;
  invalidSubscriptionCleanup: number;
};

export async function dispatchDuePushJobs(params: {
  repo: DispatcherRepo;
  batchSize?: number;
  sendNotification?: (subscription: PushInstallation, payload: string) => Promise<void>;
}): Promise<DispatchMetrics> {
  const batchSize = Math.max(1, params.batchSize ?? 100);
  const sendNotification = params.sendNotification ?? ((subscription, payload) => webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload));

  const jobs = await params.repo.claimDueJobs(batchSize);
  const metrics: DispatchMetrics = {
    claimed: jobs.length,
    sent: 0,
    failed: 0,
    canceled: 0,
    invalidSubscriptionCleanup: 0,
  };

  for (const job of jobs) {
    const attempts = (job.attempts ?? 0) + 1;
    const installation = await params.repo.getActiveInstallation({
      userId: job.user_id,
      installationId: job.installation_id,
    });

    if (!installation) {
      metrics.canceled += 1;
      await params.repo.markFailed({
        jobId: job.id,
        attempts,
        lastError: "installation_not_found_or_revoked",
        terminal: true,
      });
      continue;
    }

    try {
      await sendNotification(
        {
          endpoint: installation.endpoint,
          p256dh: installation.p256dh,
          auth: installation.auth,
        },
        JSON.stringify(job.payload),
      );
      metrics.sent += 1;
      await params.repo.markSent(job.id, attempts);
    } catch (error: any) {
      const statusCode = Number(error?.statusCode ?? 0);
      const isInvalidSubscription = statusCode === 404 || statusCode === 410;
      if (isInvalidSubscription) {
        await params.repo.revokeInstallation({ userId: job.user_id, installationId: job.installation_id });
        metrics.invalidSubscriptionCleanup += 1;
      }

      metrics.failed += 1;
      await params.repo.markFailed({
        jobId: job.id,
        attempts,
        lastError: String(error?.message ?? error ?? "push_send_failed"),
        terminal: isInvalidSubscription || attempts >= PUSH_MAX_ATTEMPTS,
      });

      if (!isInvalidSubscription && attempts < PUSH_MAX_ATTEMPTS) {
        await params.repo.releaseClaim(job.id);
      }
    }
  }

  return metrics;
}

export { PUSH_JOB_STATUS };
