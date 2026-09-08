"use client";
import { z } from "zod";
import type { SalawatSubmissionResponse } from "@/types/campaign";
import { SubmissionResponseSchema } from "./campaign-contract";
const PREFIX = "salawat_outbox_v3:";
const EntrySchema = z.object({
  idempotencyKey: z.string().min(8).max(64), visitorId: z.string().min(8).max(64),
  count: z.number().int().min(1).max(50), missionDate: z.string(), clientEpoch: z.number().int().nonnegative(),
  clientTimestamp: z.number().finite(),
});
export type OutboxEntry = z.infer<typeof EntrySchema>;
export type OutboxEvent =
  | { type: "success"; entry: OutboxEntry; data: SalawatSubmissionResponse }
  | { type: "rejected"; entry: OutboxEntry }
  | { type: "waiting"; durable: boolean };
const memory = new Map<string, OutboxEntry>();
const listeners = new Set<(event: OutboxEvent) => void>();
let running = false, nextAttempt = 0, failures = 0;
function emit(event: OutboxEvent) { listeners.forEach(listener => listener(event)); }
function entries(): OutboxEntry[] {
  const merged = new Map(memory);
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index); if (!key?.startsWith(PREFIX)) continue;
      try {
        const parsed = EntrySchema.safeParse(JSON.parse(localStorage.getItem(key) || "null"));
        if (parsed.success && key === PREFIX + parsed.data.idempotencyKey) merged.set(parsed.data.idempotencyKey, parsed.data);
      } catch { /* Invalid records stay untouched for manual review. */ }
    }
  } catch { /* Memory fallback is explicit in the UI. */ }
  return [...merged.values()].sort((a, b) => a.clientTimestamp - b.clientTimestamp);
}
function remove(entry: OutboxEntry) {
  memory.delete(entry.idempotencyKey);
  try { localStorage.removeItem(PREFIX + entry.idempotencyKey); } catch { /* Same key remains idempotent if replayed. */ }
}
export function enqueueSalawat(input: OutboxEntry): { durable: boolean } {
  const entry = EntrySchema.parse(input);
  if (entries().length >= 500) throw new Error("OUTBOX_FULL");
  memory.set(entry.idempotencyKey, entry);
  try { localStorage.setItem(PREFIX + entry.idempotencyKey, JSON.stringify(entry)); return { durable: true }; }
  catch { return { durable: false }; }
}
export function subscribeOutbox(listener: (event: OutboxEvent) => void): () => void {
  listeners.add(listener); return () => { listeners.delete(listener); };
}
/** Single worker per JS context; server must enforce idempotency across tabs/devices. */
export async function drainOutbox(missionDate: string, clientEpoch: number, visitorId: string): Promise<void> {
  if (running || Date.now() < nextAttempt || !navigator.onLine) return;
  running = true;
  try {
    // Do not silently attribute yesterday's recitations to today's mission.
    const queue = entries().filter(entry => entry.missionDate === missionDate && entry.clientEpoch === clientEpoch && entry.visitorId === visitorId);
    for (const entry of queue) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch("/api/salawat", {
          method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
          body: JSON.stringify({ idempotencyKey: entry.idempotencyKey, visitorId: entry.visitorId,
            count: entry.count, clientEpoch: entry.clientEpoch, clientTimestamp: entry.clientTimestamp }),
        });
        if (response.ok) {
          const data = SubmissionResponseSchema.parse(await response.json());
          remove(entry); failures = 0; nextAttempt = 0; emit({ type: "success", entry, data });
        } else if ([400, 401, 403, 409, 422].includes(response.status)) {
          remove(entry); emit({ type: "rejected", entry });
          // A context/auth rejection should not hammer every remaining entry.
          if ([401, 403, 409].includes(response.status)) break;
        } else {
          const retry = response.headers.get("Retry-After");
          const seconds = retry ? Number(retry) : NaN;
          const delay = Number.isFinite(seconds) ? seconds * 1000 : retry ? Date.parse(retry) - Date.now() : 0;
          nextAttempt = Date.now() + Math.min(300000, Math.max(2000, Number.isFinite(delay) ? delay : 0));
          throw new Error("RETRYABLE_RESPONSE");
        }
      } catch {
        failures = Math.min(failures + 1, 6);
        nextAttempt = Math.max(nextAttempt, Date.now() + Math.min(60000, 1000 * 2 ** failures));
        let durable = false;
        try { durable = localStorage.getItem(PREFIX + entry.idempotencyKey) !== null; } catch {}
        emit({ type: "waiting", durable }); break;
      } finally { clearTimeout(timeout); }
    }
  } finally { running = false; }
}
