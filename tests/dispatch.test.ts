import test from "node:test";
import assert from "node:assert/strict";
import { dispatchDuePushJobs, type DispatcherRepo, type DuePushJob, type PushInstallation } from "../src/push/dispatch";

class InMemoryRepo implements DispatcherRepo {
  jobs = new Map<string, DuePushJob & { status: string; claimed_at?: string | null; sent_at?: string | null; last_error?: string | null }>();
  installations = new Map<string, PushInstallation & { revoked?: boolean }>();

  constructor(jobs: DuePushJob[], installations: Array<{ userId: string; installationId: string; data: PushInstallation }>) {
    jobs.forEach((job) => this.jobs.set(job.id, { ...job, status: "scheduled", claimed_at: null }));
    installations.forEach((item) => this.installations.set(`${item.userId}:${item.installationId}`, { ...item.data, revoked: false }));
  }

  async claimDueJobs(limit: number): Promise<DuePushJob[]> {
    const claimed: DuePushJob[] = [];
    for (const job of this.jobs.values()) {
      if (claimed.length >= limit) break;
      if (job.status !== "scheduled") continue;
      job.status = "processing";
      job.claimed_at = new Date().toISOString();
      claimed.push(job);
    }
    return claimed;
  }

  async getActiveInstallation(params: { userId: string; installationId: string }): Promise<PushInstallation | null> {
    const key = `${params.userId}:${params.installationId}`;
    const found = this.installations.get(key);
    if (!found || found.revoked) return null;
    return found;
  }

  async markSent(jobId: string, attempts: number): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.status = "sent";
    job.attempts = attempts;
    job.sent_at = new Date().toISOString();
    job.claimed_at = null;
  }

  async markFailed(params: { jobId: string; attempts: number; lastError: string; terminal: boolean }): Promise<void> {
    const job = this.jobs.get(params.jobId);
    if (!job) return;
    job.status = params.terminal ? "failed" : "scheduled";
    job.attempts = params.attempts;
    job.last_error = params.lastError;
    job.claimed_at = null;
  }

  async revokeInstallation(params: { userId: string; installationId: string }): Promise<void> {
    const key = `${params.userId}:${params.installationId}`;
    const sub = this.installations.get(key);
    if (sub) sub.revoked = true;
  }

  async releaseClaim(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.status = "scheduled";
    job.claimed_at = null;
  }
}

function baseJob(id: string, installationId = "inst-a"): DuePushJob {
  return {
    id,
    user_id: "user-1",
    session_id: `session-${id}`,
    event_type: "work_complete",
    installation_id: installationId,
    fire_at: new Date().toISOString(),
    attempts: 0,
    payload: { title: "Pomodoro completado", body: "Hora de descansar" },
  };
}

test("targeting por user_id + installation_id sin broadcast", async () => {
  const repo = new InMemoryRepo([baseJob("1", "inst-a")], [
    { userId: "user-1", installationId: "inst-a", data: { endpoint: "https://a", p256dh: "a", auth: "a" } },
    { userId: "user-1", installationId: "inst-b", data: { endpoint: "https://b", p256dh: "b", auth: "b" } },
  ]);

  const deliveries: string[] = [];
  const metrics = await dispatchDuePushJobs({
    repo,
    sendNotification: async (sub) => {
      deliveries.push(sub.endpoint);
    },
  });

  assert.deepEqual(deliveries, ["https://a"]);
  assert.equal(metrics.sent, 1);
});

test("claim transaccional evita duplicados en ejecuciones multiples", async () => {
  const repo = new InMemoryRepo([baseJob("2")], [
    { userId: "user-1", installationId: "inst-a", data: { endpoint: "https://a", p256dh: "a", auth: "a" } },
  ]);

  await dispatchDuePushJobs({ repo, sendNotification: async () => {} });
  await dispatchDuePushJobs({ repo, sendNotification: async () => {} });

  const sentJobs = [...repo.jobs.values()].filter((j) => j.status === "sent");
  assert.equal(sentJobs.length, 1);
});

test("404/410 revoca instalacion y no hace fallback", async () => {
  const repo = new InMemoryRepo([baseJob("3")], [
    { userId: "user-1", installationId: "inst-a", data: { endpoint: "https://a", p256dh: "a", auth: "a" } },
  ]);

  const metrics = await dispatchDuePushJobs({
    repo,
    sendNotification: async () => {
      const err: any = new Error("gone");
      err.statusCode = 410;
      throw err;
    },
  });

  assert.equal(metrics.invalidSubscriptionCleanup, 1);
  assert.equal(metrics.failed, 1);
  assert.equal(repo.installations.get("user-1:inst-a")?.revoked, true);
});

test("instalacion inexistente/revocada falla terminal", async () => {
  const repo = new InMemoryRepo([baseJob("4", "missing")], []);
  await dispatchDuePushJobs({ repo, sendNotification: async () => {} });
  assert.equal(repo.jobs.get("4")?.status, "failed");
});

test("jobs cancelados no se despachan", async () => {
  const repo = new InMemoryRepo([baseJob("5")], [
    { userId: "user-1", installationId: "inst-a", data: { endpoint: "https://a", p256dh: "a", auth: "a" } },
  ]);
  const job = repo.jobs.get("5");
  if (job) job.status = "canceled";

  const deliveries: string[] = [];
  await dispatchDuePushJobs({ repo, sendNotification: async (sub) => { deliveries.push(sub.endpoint); } });
  assert.equal(deliveries.length, 0);
});

