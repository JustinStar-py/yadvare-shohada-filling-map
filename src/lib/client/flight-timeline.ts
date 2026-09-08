/** Visual choreography, not physical flight parameters. */
export const FLIGHT_SECONDS = 18;
export const REDUCED_FLIGHT_SECONDS = 1.2;
export const COUNTDOWN_SECONDS = 3;
export function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}
export function smoothstep(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}
export interface FlightPose {
  altitude: number; capsuleOffset: number; thrust: number; star: number; complete: boolean;
}
export function sampleFlight(seconds: number, reduced = false): FlightPose {
  const t = Math.max(0, seconds);
  if (reduced) return { altitude: 0, capsuleOffset: 0, thrust: 0,
    star: Math.sin(Math.PI * clamp01(t / REDUCED_FLIGHT_SECONDS)), complete: t >= REDUCED_FLIGHT_SECONDS };
  if (t < 1) return { altitude: 0, capsuleOffset: 0, thrust: smoothstep(t), star: 0, complete: false };
  if (t < 7) return { altitude: 8 * smoothstep((t - 1) / 6), capsuleOffset: 0, thrust: 1, star: 0, complete: false };
  if (t < 10) return { altitude: 8, capsuleOffset: 5 * smoothstep((t - 7) / 3), thrust: 0.15, star: smoothstep((t - 8) / 2), complete: false };
  if (t < 15) return { altitude: 8 * (1 - smoothstep((t - 10) / 5)), capsuleOffset: 5, thrust: 0.6, star: 1, complete: false };
  return { altitude: 0, capsuleOffset: 5 * (1 - smoothstep((t - 15) / 2)), thrust: 0,
    star: 1 - smoothstep(t - 17), complete: t >= FLIGHT_SECONDS };
}
