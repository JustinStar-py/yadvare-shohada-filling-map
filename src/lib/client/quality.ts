export type RenderQuality = "high" | "low";

/**
 * Detects device rendering capability to scale canvas workloads.
 * Low-end phones get fewer particles, no meteors, lower DPR.
 */
export function detectRenderQuality(): RenderQuality {
  if (typeof window === "undefined") return "high";
  try {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const cores = navigator.hardwareConcurrency || 8;
    const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
    if (coarse && (cores <= 4 || (mem !== undefined && mem <= 4))) return "low";
    return "high";
  } catch {
    return "high";
  }
}
