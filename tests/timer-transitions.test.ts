import test from "node:test";
import assert from "node:assert/strict";
import { buildCancelOperation, buildScheduleOperation, getEventTypeForMode } from "../src/push/timer-transitions";

test("crea job de work al iniciar", () => {
  const op = buildScheduleOperation({ mode: "work", sessionId: "11111111-1111-1111-1111-111111111111", fireAt: Date.now() + 1000 });
  assert.equal(op.type, "schedule");
  assert.equal(op.eventType, "work_complete");
});

test("crea job de break al iniciar descanso", () => {
  const op = buildScheduleOperation({ mode: "break", sessionId: "22222222-2222-2222-2222-222222222222", fireAt: Date.now() + 1000 });
  assert.equal(op.eventType, "break_complete");
});

test("pause/reset/skip cancelan job", () => {
  const paused = buildCancelOperation({ mode: "work", sessionId: "33333333-3333-3333-3333-333333333333" });
  const reset = buildCancelOperation({ mode: "work", sessionId: "33333333-3333-3333-3333-333333333333" });
  const skipped = buildCancelOperation({ mode: "work", sessionId: "33333333-3333-3333-3333-333333333333" });

  assert.equal(paused.type, "cancel");
  assert.equal(reset.type, "cancel");
  assert.equal(skipped.type, "cancel");
});

test("resume reprograma con nuevo fireAt", () => {
  const now = Date.now();
  const resumed = buildScheduleOperation({ mode: "work", sessionId: "44444444-4444-4444-4444-444444444444", fireAt: now + 60000 });
  assert.equal(resumed.type, "schedule");
  assert.ok(resumed.fireAt > now);
});

test("payload/evento corresponde al modo correcto", () => {
  assert.equal(getEventTypeForMode("work"), "work_complete");
  assert.equal(getEventTypeForMode("break"), "break_complete");
});
