import { useEffect, useState } from "react";

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

/** True on phones/tablets: UA hint, coarse pointer, or narrow viewport. */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  try {
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return true;
    if (window.matchMedia("(pointer: coarse)").matches && Math.min(window.innerWidth, window.innerHeight) < 820) {
      return true;
    }
    return window.innerWidth < 768;
  } catch {
    return false;
  }
}

/**
 * Max WebGL/canvas pixel ratio. Mobile GPUs are tile-based: DPR 2 means 4x
 * the fragment work of DPR 1 for zero visible gain on 400+ dpi screens.
 */
export function getDprCap(): number {
  if (typeof window === "undefined") return 2;
  try {
    if (isMobileDevice()) return 1.25;
    return detectRenderQuality() === "low" ? 1.3 : 2;
  } catch {
    return 1.25;
  }
}

/** MSAA antialiasing is very expensive on mobile tile GPUs — skip it there. */
export function shouldUseAntialias(): boolean {
  return !isMobileDevice();
}

// ── Lite mode: skip WebGL entirely (static fallback) ──────────────────────

const LITE_MODE_KEY = "yadvare-lite-mode";
const LITE_MODE_EVENT = "yadvare:lite-mode-change";

function isLitePreferredByDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  try {
    const conn = navigator as unknown as { connection?: { saveData?: boolean } };
    if (conn.connection?.saveData) return true;
    const cores = navigator.hardwareConcurrency || 8;
    return isMobileDevice() && cores <= 4;
  } catch {
    return false;
  }
}

export function getLiteModeOverride(): boolean | null {
  try {
    const v = window.localStorage.getItem(LITE_MODE_KEY);
    if (v === "1") return true;
    if (v === "0") return false;
    return null;
  } catch {
    return null;
  }
}

export function setLiteModeOverride(value: boolean | null): void {
  try {
    if (value === null) window.localStorage.removeItem(LITE_MODE_KEY);
    else window.localStorage.setItem(LITE_MODE_KEY, value ? "1" : "0");
  } catch {
    // Private mode etc. — in-memory default still applies below.
  }
  window.dispatchEvent(new CustomEvent(LITE_MODE_EVENT));
}

/** Manual toggle wins; otherwise auto-enable on very weak devices / save-data. */
export function useLiteMode(): boolean {
  const [lite, setLite] = useState<boolean>(false);
  useEffect(() => {
    const compute = () => getLiteModeOverride() ?? isLitePreferredByDevice();
    setLite(compute());
    const onChange = () => setLite(compute());
    window.addEventListener(LITE_MODE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(LITE_MODE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return lite;
}

// ── Visibility pause: fully stop rAF when hidden ──────────────────────────
// Cheaper than "schedule-but-skip": a parked rAF still wakes the CPU/GPU
// every frame and keeps the radio from sleeping on Android.

/**
 * Observes viewport visibility + tab visibility. Calls `onChange(visible)`.
 * The consumer must start its loop when visible and fully stop (no pending
 * rAF) when hidden. Returns a cleanup function.
 */
export function attachVisibilityPause(
  target: Element,
  onChange: (visible: boolean) => void
): () => void {
  let inViewport = true;
  let tabVisible = typeof document === "undefined" ? true : !document.hidden;

  const emit = () => onChange(inViewport && tabVisible);

  const io =
    typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(
          (entries) => {
            inViewport = entries[0]?.isIntersecting ?? true;
            emit();
          },
          { threshold: 0 }
        )
      : null;
  io?.observe(target);

  const onVisibility = () => {
    tabVisible = !document.hidden;
    emit();
  };
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    io?.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
