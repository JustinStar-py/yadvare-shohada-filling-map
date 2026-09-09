"use client";

import React, { useEffect, useRef } from "react";
import { ConstellationStar } from "@/types/campaign";
import { detectRenderQuality, getDprCap, RenderQuality } from "@/lib/client/quality";

interface AtmosphereCanvasProps {
  fuelPercentage: number;
  isLaunching: boolean;
  hasLiftedOff: boolean;
  constellation: ConstellationStar[];
  readyBloomTrigger: number;
}

interface BgStar {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  phase: number;
  layer: number;
  flare: boolean;
}

interface StreamOrb {
  x0: number;
  y0: number;
  cx: number;
  cy: number;
  x1: number;
  y1: number;
  t: number;
  dur: number;
  size: number;
  alpha: number;
  delay: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  grow: number;
  smoke: boolean;
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  len: number;
}

interface Ring {
  x: number;
  y: number;
  r: number;
  maxR: number;
  alpha: number;
  width: number;
}

interface Streak {
  x: number;
  y: number;
  len: number;
  speed: number;
  alpha: number;
}

function easeInQuad(t: number) {
  return t * t;
}

function bezier(t: number, p0: number, c: number, p1: number): number {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * c + t * t * p1;
}

function makeGlowSprite(size: number, stops: [number, string][]): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (const [pos, color] of stops) g.addColorStop(pos, color);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return c;
}

export default function AtmosphereCanvas({
  fuelPercentage,
  isLaunching,
  hasLiftedOff,
  constellation,
  readyBloomTrigger,
}: AtmosphereCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const constellationRef = useRef(constellation);
  const isLaunchingRef = useRef(isLaunching);
  const liftedRef = useRef(hasLiftedOff);
  const liftedAtRef = useRef(-1e9);
  const fuelRef = useRef(fuelPercentage);
  const lastBloomRef = useRef(readyBloomTrigger);

  useEffect(() => {
    constellationRef.current = constellation;
  }, [constellation]);
  useEffect(() => {
    isLaunchingRef.current = isLaunching;
  }, [isLaunching]);
  useEffect(() => {
    liftedRef.current = hasLiftedOff;
  }, [hasLiftedOff]);
  useEffect(() => {
    fuelRef.current = fuelPercentage;
  }, [fuelPercentage]);

  const qualityRef = useRef<RenderQuality>("high");
  const dprCapRef = useRef(2);
  const bgStarsRef = useRef<BgStar[]>([]);
  const orbsRef = useRef<StreamOrb[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const meteorsRef = useRef<Meteor[]>([]);
  const ringsRef = useRef<Ring[]>([]);
  const streaksRef = useRef<Streak[]>([]);
  const orbSpriteRef = useRef<HTMLCanvasElement | null>(null);
  const starSpriteRef = useRef<HTMLCanvasElement | null>(null);
  const nebulaRef = useRef<HTMLCanvasElement | null>(null);
  const nebulaBucketRef = useRef(-1);
  const flashRef = useRef(0);
  const scrollYRef = useRef(0);
  const reducedMotionRef = useRef(false);

  const rocketAnchor = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return {
      coreX: w / 2,
      coreY: h * 0.42,
      baseY: h * 0.42 + Math.min(h * 0.3, 195),
    };
  };

  const spawnStream = (x: number, y: number) => {
    const anchor = rocketAnchor();
    const n = reducedMotionRef.current ? 4 : qualityRef.current === "low" ? 6 : 10;
    for (let i = 0; i < n; i++) {
      orbsRef.current.push({
        x0: x + (Math.random() - 0.5) * 34,
        y0: y + (Math.random() - 0.5) * 18,
        cx: (x + anchor.coreX) / 2 + (Math.random() - 0.5) * window.innerWidth * 0.2,
        cy: Math.min(y, anchor.coreY) - 40 - Math.random() * 80,
        x1: anchor.coreX + (Math.random() - 0.5) * 32,
        y1: anchor.coreY + (Math.random() - 0.5) * 80,
        t: 0,
        dur: 52 + Math.random() * 28,
        size: 5 + Math.random() * 6,
        alpha: 0.55 + Math.random() * 0.4,
        delay: Math.floor(Math.random() * 9),
      });
    }
    if (orbsRef.current.length > 200) {
      orbsRef.current.splice(0, orbsRef.current.length - 200);
    }
  };

  const spawnReadyBloom = () => {
    const anchor = rocketAnchor();
    const rings = qualityRef.current === "low" ? 2 : 3;
    for (let i = 0; i < rings; i++) {
      ringsRef.current.push({
        x: anchor.coreX,
        y: anchor.coreY,
        r: 20,
        maxR: 220 + i * 70,
        alpha: 0.5 - i * 0.12,
        width: 2.2 - i * 0.5,
      });
    }
    const moteCount = reducedMotionRef.current
      ? 14
      : qualityRef.current === "low"
      ? 16
      : 34;
    for (let i = 0; i < moteCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.6 + Math.random() * 1.4;
      sparksRef.current.push({
        x: anchor.coreX + Math.cos(angle) * 20,
        y: anchor.coreY + Math.sin(angle) * 28,
        vx: Math.cos(angle) * speed * 0.5,
        vy: -0.8 - Math.random() * 1.4,
        life: 0,
        maxLife: 80 + Math.random() * 60,
        size: 1 + Math.random() * 2,
        color: "#fbbf24",
        gravity: -0.004,
        grow: 0,
        smoke: false,
      });
    }
  };

  // Golden stream from the actual button coordinates
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ x: number; y: number }>).detail;
      if (detail && typeof detail.x === "number") {
        spawnStream(detail.x, detail.y);
      }
    };
    window.addEventListener("salawat:burst", handler);
    return () => window.removeEventListener("salawat:burst", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (readyBloomTrigger !== lastBloomRef.current) {
      lastBloomRef.current = readyBloomTrigger;
      spawnReadyBloom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyBloomTrigger]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    qualityRef.current = detectRenderQuality();
    // Mobile tile GPUs: 1.25 max (fullscreen canvas = millions of fragments).
    dprCapRef.current = getDprCap();

    // ── Sprites (pre-rendered radial glows — no per-frame gradients) ──
    orbSpriteRef.current = makeGlowSprite(48, [
      [0, "rgba(254, 243, 199, 1)"],
      [0.3, "rgba(251, 191, 36, 0.85)"],
      [1, "rgba(245, 158, 11, 0)"],
    ]);
    starSpriteRef.current = makeGlowSprite(64, [
      [0, "rgba(251, 191, 36, 0.9)"],
      [0.4, "rgba(245, 158, 11, 0.35)"],
      [1, "rgba(245, 158, 11, 0)"],
    ]);

    // ── Starfield ──
    const buildStars = () => {
      const low = qualityRef.current === "low";
      const layers = low
        ? [
            { count: 85, sizeMin: 0.4, sizeMax: 1.1, alpha: 0.32, layer: 0 },
            { count: 48, sizeMin: 0.8, sizeMax: 1.8, alpha: 0.48, layer: 1 },
            { count: 24, sizeMin: 1.4, sizeMax: 2.6, alpha: 0.62, layer: 2 },
          ]
        : [
            { count: 145, sizeMin: 0.4, sizeMax: 1.1, alpha: 0.3, layer: 0 },
            { count: 85, sizeMin: 0.8, sizeMax: 1.9, alpha: 0.46, layer: 1 },
            { count: 42, sizeMin: 1.4, sizeMax: 2.8, alpha: 0.64, layer: 2 },
          ];
      const stars: BgStar[] = [];
      for (const L of layers) {
        for (let i = 0; i < L.count; i++) {
          stars.push({
            x: Math.random(),
            y: Math.random(),
            size: L.sizeMin + Math.random() * (L.sizeMax - L.sizeMin),
            baseAlpha: L.alpha + Math.random() * 0.25,
            twinkleSpeed: 0.8 + Math.random() * 2.2,
            phase: Math.random() * Math.PI * 2,
            layer: L.layer,
            flare: L.layer === 2 ? Math.random() > 0.35 : L.layer === 1 ? Math.random() > 0.7 : false,
          });
        }
      }
      bgStarsRef.current = stars;
    };
    buildStars();

    let visible = !document.hidden;
    let w = window.innerWidth;
    let h = window.innerHeight;
    let time = 0;
    let nextMeteorAt = performance.now() + 1500;
    let liftPrev = false;

    // ── Nebula layer, pre-rendered offscreen; re-rendered only when fuel bucket changes ──
    const renderNebula = () => {
      const bucket = Math.floor(fuelRef.current / 12);
      if (bucket === nebulaBucketRef.current && nebulaRef.current) return;
      nebulaBucketRef.current = bucket;
      const warm = bucket / 8;
      const off = document.createElement("canvas");
      off.width = Math.max(1, Math.round(w));
      off.height = Math.max(1, Math.round(h));
      const octx = off.getContext("2d");
      if (octx) {
        const blobs: [number, number, number, number[]][] = [
          [0.18, 0.2, 0.45, [28 + warm * 36, 40 + warm * 20, 84]],
          [0.82, 0.12, 0.38, [20 + warm * 30, 30 + warm * 16, 62]],
          [0.62, 0.6, 0.5, [16 + warm * 28, 22 + warm * 14, 46]],
          [0.28, 0.75, 0.4, [24 + warm * 26, 20 + warm * 14, 42]],
        ];
        for (const [bx, by, br, rgb] of blobs) {
          const cx = bx * w;
          const cy = by * h;
          const r = br * Math.max(w, h);
          const g = octx.createRadialGradient(cx, cy, 0, cx, cy, r);
          g.addColorStop(0, `rgba(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${rgb[2]}, ${0.11 + warm * 0.04})`);
          g.addColorStop(1, "rgba(0,0,0,0)");
          octx.fillStyle = g;
          octx.fillRect(0, 0, w, h);
        }

        // Faint milky-way band so the hero sky never reads as empty black
        octx.save();
        octx.translate(w / 2, h * 0.3);
        octx.rotate(-0.5);
        const band = octx.createLinearGradient(0, -h * 0.2, 0, h * 0.2);
        band.addColorStop(0, "rgba(148, 163, 184, 0)");
        band.addColorStop(0.5, `rgba(148, 163, 184, ${0.055 + warm * 0.02})`);
        band.addColorStop(1, "rgba(148, 163, 184, 0)");
        octx.fillStyle = band;
        octx.fillRect(-w * 0.75, -h * 0.2, w * 1.5, h * 0.4);
        octx.restore();
      }
      nebulaRef.current = off;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, dprCapRef.current);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nebulaBucketRef.current = -1;
      renderNebula();
    };

    const onVisibility = () => {
      visible = !document.hidden;
      if (visible) {
        lastNow = performance.now();
        kick();
      }
    };
    const onScroll = () => {
      scrollYRef.current = window.scrollY;
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scroll", onScroll, { passive: true });

    // ── FPS watchdog: downgrade if the device can't keep up ──
    let frameCount = 0;
    let accDt = 0;
    let lastNow = performance.now();
    let judged = false;

    const kick = () => {
      if (rafRef.current === null && visible) rafRef.current = requestAnimationFrame(render);
    };

    const render = (now: number) => {
      rafRef.current = null;
      if (!visible) return; // fully parked: no pending rAF in background tabs

      const dt = now - lastNow;
      lastNow = now;
      if (!judged) {
        frameCount++;
        if (frameCount > 40) accDt += dt;
        if (frameCount >= 160) {
          judged = true;
          if (accDt / 120 > 24 && qualityRef.current === "high") {
            qualityRef.current = "low";
            dprCapRef.current = 1.3;
            buildStars();
            resize();
          }
        }
      }

      time += 0.016;
      const launching = isLaunchingRef.current;
      const lifted = liftedRef.current;
      const scroll = scrollYRef.current;
      const low = qualityRef.current === "low";
      const anchor = rocketAnchor();

      if (lifted && !liftPrev) {
        // T-0: engines ignite
        flashRef.current = 0.85;
        liftedAtRef.current = now;
      }
      liftPrev = lifted;

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      // 1. Nebula (single pre-rendered draw)
      if (nebulaRef.current) {
        renderNebula();
        ctx.drawImage(nebulaRef.current, 0, 0, w, h);
      }

      // 2. Parallax starfield
      // 2. Parallax starfield with enhanced lively twinkling
      const parallax = [0.016, 0.04, 0.075];
      for (const s of bgStarsRef.current) {
        const sy = ((s.y * h - scroll * parallax[s.layer]) % h + h) % h;
        // Natural lively twinkling pulse (floor kept visible on dim phone screens)
        const tw = 0.42 + Math.sin(time * s.twinkleSpeed + s.phase) * 0.58;
        const alpha = Math.max(0.1, s.baseAlpha * tw);
        const starColor = s.flare
          ? `rgba(254, 243, 199, ${alpha.toFixed(3)})`
          : `rgba(226, 232, 240, ${alpha.toFixed(3)})`;
        ctx.fillStyle = starColor;
        ctx.beginPath();
        ctx.arc(s.x * w, sy, s.size * (0.8 + tw * 0.35), 0, Math.PI * 2);
        ctx.fill();

        if (s.flare && alpha > 0.18) {
          ctx.strokeStyle = `rgba(251, 191, 36, ${(alpha * 0.45).toFixed(3)})`;
          ctx.lineWidth = 0.7;
          const fl = s.size * 4.5 * tw;
          ctx.beginPath();
          ctx.moveTo(s.x * w - fl, sy);
          ctx.lineTo(s.x * w + fl, sy);
          ctx.moveTo(s.x * w, sy - fl);
          ctx.lineTo(s.x * w, sy + fl);
          ctx.stroke();
        }
      }

      // 3. Faint memorial constellation (hero sky only)
      const cst = constellationRef.current;
      if (cst.length > 0 && scroll < h * 0.7) {
        const fade = Math.max(0, 1 - scroll / (h * 0.6));
        ctx.strokeStyle = `rgba(245, 158, 11, ${(0.09 * fade).toFixed(3)})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        const sorted = [...cst].sort((a, b) => a.dayNumber - b.dayNumber);
        for (let i = 0; i < sorted.length; i++) {
          const sx = (sorted[i].x / 100) * w;
          const sy = (sorted[i].y / 100) * h * 0.55;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();

        for (const star of cst) {
          const sx = (star.x / 100) * w;
          const sy = (star.y / 100) * h * 0.55;
          const pulse = 0.8 + Math.sin(time * 1.4 + star.dayNumber) * 0.2;
          const size = 22 * pulse;
          ctx.globalAlpha = 0.55 * fade * pulse * star.brightness;
          ctx.drawImage(starSpriteRef.current!, sx - size / 2, sy - size / 2, size, size);
          ctx.globalAlpha = 0.85 * fade;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // 4. Frequent celestial shooting stars passing behind the rocket
      if (!reducedMotionRef.current && !launching && now > nextMeteorAt) {
        nextMeteorAt = now + (low ? 4200 + Math.random() * 3200 : 2500 + Math.random() * 3000);
        const fromLeft = Math.random() > 0.45;
        meteorsRef.current.push({
          x: fromLeft ? -50 : w + 50,
          y: Math.random() * h * 0.55,
          vx: (fromLeft ? 1 : -1) * (6.5 + Math.random() * 4.5),
          vy: 2.0 + Math.random() * 2.2,
          life: 0,
          maxLife: 60,
          len: 110 + Math.random() * 90,
        });

        // 35% chance of a dual trailing meteor
        if (!low && Math.random() < 0.35) {
          const fromLeft2 = fromLeft;
          meteorsRef.current.push({
            x: (fromLeft2 ? -70 : w + 70) + (Math.random() - 0.5) * 40,
            y: Math.max(20, Math.random() * h * 0.52),
            vx: (fromLeft2 ? 1 : -1) * (6.0 + Math.random() * 4.0),
            vy: 2.0 + Math.random() * 2.0,
            life: -8, // slight delay for trail succession
            maxLife: 55,
            len: 90 + Math.random() * 70,
          });
        }
      }
      for (let i = meteorsRef.current.length - 1; i >= 0; i--) {
        const m = meteorsRef.current[i];
        m.life++;
        if (m.life < 0) continue; // pending delayed spawn
        m.x += m.vx;
        m.y += m.vy;
        if (m.life >= m.maxLife || m.x < -140 || m.x > w + 140) {
          meteorsRef.current.splice(i, 1);
          continue;
        }
        const p = m.life / m.maxLife;
        const alpha = Math.sin(p * Math.PI) * 0.65;
        const mag = Math.hypot(m.vx, m.vy);
        const tailX = m.x - (m.vx / mag) * m.len;
        const tailY = m.y - (m.vy / mag) * m.len;
        const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
        grad.addColorStop(0, `rgba(254, 243, 199, ${alpha.toFixed(3)})`);
        grad.addColorStop(0.25, `rgba(251, 191, 36, ${(alpha * 0.7).toFixed(3)})`);
        grad.addColorStop(1, "rgba(245, 158, 11, 0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        // Glowing starhead of the meteor
        ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 1.2).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. Salawat streams — golden orbs from the button into the rocket core
      for (let i = orbsRef.current.length - 1; i >= 0; i--) {
        const o = orbsRef.current[i];
        if (o.delay > 0) {
          o.delay--;
          continue;
        }
        o.t += 1 / o.dur;
        if (o.t >= 1) {
          orbsRef.current.splice(i, 1);
          sparksRef.current.push({
            x: o.x1,
            y: o.y1,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -0.3 - Math.random() * 0.4,
            life: 0,
            maxLife: 20,
            size: 3.5,
            color: "#fde68a",
            gravity: 0,
            grow: 0,
            smoke: false,
          });
          continue;
        }
        const et = easeInQuad(o.t);
        const px = bezier(et, o.x0, o.cx, o.x1);
        const py = bezier(et, o.y0, o.cy, o.y1);
        const tt = easeInQuad(Math.max(0, o.t - 0.08));
        const tx = bezier(tt, o.x0, o.cx, o.x1);
        const ty = bezier(tt, o.y0, o.cy, o.y1);

        ctx.globalAlpha = o.alpha * Math.sin(Math.min(1, o.t * 4) * Math.PI * 0.5) * 0.75;
        ctx.drawImage(orbSpriteRef.current!, px - o.size / 2, py - o.size / 2, o.size, o.size);

        ctx.strokeStyle = "rgba(251, 191, 36, 0.22)";
        ctx.lineWidth = Math.max(0.8, o.size * 0.06);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // 6. Launch exhaust plume + speed streaks
      if (launching && !lifted) {
        // Countdown: cryo venting - slow steam billowing around the pad
        const vent = reducedMotionRef.current ? 1 : low ? 1 : 2;
        for (let i = 0; i < vent; i++) {
          sparksRef.current.push({
            x: anchor.coreX + (Math.random() - 0.5) * 64,
            y: anchor.baseY - Math.random() * 22,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -0.2 - Math.random() * 0.7,
            life: 0,
            maxLife: 90 + Math.random() * 70,
            size: 4 + Math.random() * 7,
            color: "#cbd5e1",
            gravity: -0.004,
            grow: 0.12,
            smoke: true,
          });
        }
      } else if (lifted) {
        // Liftoff: bright plume root, then a heavy billowing smoke cloud
        const hotPhase = now - liftedAtRef.current < 1400;
        const spawn = reducedMotionRef.current ? 2 : low ? 5 : 9;
        for (let i = 0; i < spawn; i++) {
          const isSmoke = !hotPhase || Math.random() > 0.3;
          if (isSmoke) {
            sparksRef.current.push({
              x: anchor.coreX + (Math.random() - 0.5) * 56,
              y: anchor.baseY - Math.random() * 12,
              vx: (Math.random() - 0.5) * 3.2,
              vy: 1.2 + Math.random() * 2.6,
              life: 0,
              maxLife: 110 + Math.random() * 80,
              size: 5 + Math.random() * 9,
              color: Math.random() > 0.5 ? "#94a3b8" : "#cbd5e1",
              gravity: -0.028,
              grow: 0.16 + Math.random() * 0.12,
              smoke: true,
            });
          } else {
            sparksRef.current.push({
              x: anchor.coreX + (Math.random() - 0.5) * 30,
              y: anchor.baseY,
              vx: (Math.random() - 0.5) * 2.2,
              vy: 3.2 + Math.random() * 4.2,
              life: 0,
              maxLife: 26 + Math.random() * 16,
              size: 2 + Math.random() * 3,
              color: "#fbbf24",
              gravity: 0.05,
              grow: -0.02,
              smoke: false,
            });
          }
        }
        if (!reducedMotionRef.current && !low) {
          for (let i = 0; i < 2; i++) {
            streaksRef.current.push({
              x: Math.random() * w,
              y: h + 30,
              len: 40 + Math.random() * 80,
              speed: 14 + Math.random() * 10,
              alpha: 0.05 + Math.random() * 0.1,
            });
          }
        }
      }

      for (let i = streaksRef.current.length - 1; i >= 0; i--) {
        const st = streaksRef.current[i];
        st.y -= st.speed;
        if (st.y + st.len < -30) {
          streaksRef.current.splice(i, 1);
          continue;
        }
        const grad = ctx.createLinearGradient(st.x, st.y, st.x, st.y + st.len);
        grad.addColorStop(0, `rgba(226, 232, 240, ${st.alpha.toFixed(3)})`);
        grad.addColorStop(1, "rgba(226, 232, 240, 0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(st.x, st.y);
        ctx.lineTo(st.x, st.y + st.len);
        ctx.stroke();
      }

      // 7. Ready-bloom rings
      for (let i = ringsRef.current.length - 1; i >= 0; i--) {
        const ring = ringsRef.current[i];
        ring.r += (ring.maxR - ring.r) * 0.045 + 0.6;
        const p = ring.r / ring.maxR;
        const alpha = ring.alpha * (1 - p);
        if (alpha <= 0.01) {
          ringsRef.current.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = "#fbbf24";
        ctx.globalAlpha = alpha;
        ctx.lineWidth = ring.width;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // 8. Sparks & smoke (sprite-based for golden, arcs for smoke)
      const sparkCap = low ? 260 : 640;
      for (let i = sparksRef.current.length - 1; i >= 0; i--) {
        const sp = sparksRef.current[i];
        sp.life++;
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vy += sp.gravity;
        sp.size = Math.max(0.1, sp.size + sp.grow);

        if (sp.life >= sp.maxLife) {
          sparksRef.current.splice(i, 1);
          continue;
        }
        const p = sp.life / sp.maxLife;
        const alpha = (1 - p) * 0.9;
        if (sp.smoke) {
          ctx.globalAlpha = alpha * 0.35;
          ctx.fillStyle = sp.color;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const sz = sp.size * 3.4;
          ctx.globalAlpha = alpha;
          ctx.drawImage(orbSpriteRef.current!, sp.x - sz / 2, sp.y - sz / 2, sz, sz);
        }
        ctx.globalAlpha = 1;
      }
      if (sparksRef.current.length > sparkCap) {
        sparksRef.current.splice(0, sparksRef.current.length - sparkCap);
      }

      // 9. Ignition flash
      if (flashRef.current > 0.01) {
        ctx.fillStyle = `rgba(255, 241, 190, ${flashRef.current.toFixed(3)})`;
        ctx.fillRect(0, 0, w, h);
        flashRef.current *= 0.86;
      }

      ctx.globalCompositeOperation = "source-over";
      rafRef.current = requestAnimationFrame(render);
    };

    kick();

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 w-full h-full"
      style={{ opacity: 1 }}
    />
  );
}
