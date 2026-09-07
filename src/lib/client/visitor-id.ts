import { generateUUID } from "@/lib/utils";

const VISITOR_STORAGE_KEY = "salawat_visitor_id";

/**
 * Returns a stable, anonymous visitor identifier persisted across sessions in localStorage.
 * Used for deterministic daily martyr missions, participant counting, and NAT-aware rate limiting.
 */
export function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "server-visitor";
  try {
    let id = localStorage.getItem(VISITOR_STORAGE_KEY);
    if (!id || id.trim().length === 0) {
      id = "v-" + generateUUID();
      localStorage.setItem(VISITOR_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return "v-fallback-" + Date.now();
  }
}
