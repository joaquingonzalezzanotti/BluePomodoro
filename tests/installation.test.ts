import test from "node:test";
import assert from "node:assert/strict";
import { getOrCreateInstallationId } from "../src/push/installation";

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

test("genera y persiste installation_id una sola vez", () => {
  const storage = createMemoryStorage();
  const first = getOrCreateInstallationId(storage as any);
  const second = getOrCreateInstallationId(storage as any);

  assert.equal(first, second);
  assert.match(first, /^[0-9a-f-]{36}$/i);
});
