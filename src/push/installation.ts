import { INSTALLATION_ID_STORAGE_KEY } from "@/push/constants";

export function getOrCreateInstallationId(storage?: Pick<Storage, "getItem" | "setItem">): string {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    throw new Error("crypto.randomUUID is required");
  }

  const targetStorage = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  if (!targetStorage) {
    return crypto.randomUUID();
  }

  const existing = targetStorage.getItem(INSTALLATION_ID_STORAGE_KEY);
  if (existing && existing.length > 10) {
    return existing;
  }

  const nextId = crypto.randomUUID();
  targetStorage.setItem(INSTALLATION_ID_STORAGE_KEY, nextId);
  return nextId;
}
