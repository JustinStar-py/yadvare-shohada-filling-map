"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ConstellationStar } from "@/types/campaign";
import { formatPersianNumber, toPersianDigits, formatShortJalaliDate } from "@/lib/utils";
import { detectRenderQuality, RenderQuality } from "@/lib/client/quality";
import { Sparkles, Heart, Calendar, X, Star } from "lucide-react";

interface ConstellationViewProps {
  constellation: ConstellationStar[];
}

interface PanelStar {
  x: number;
  y: number;
  baseR: number;
  star: ConstellationStar;
  phase: number;
}

interface MiniStar {
  x: number;
  y: number;
  size: number;
  alpha: number;
  speed: number;
  phase: number;
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

export default function ConstellationView({ constellation }: ConstellationViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const [selected, setSelected] = useState<ConstellationStar | null>(null);
  const [hovered, setHovered] = useState<ConstellationStar | null>(null);

  const constellationRef = useRef(constellation);
  const selectedRef = useRef<ConstellationStar | null>(null);
  const hoveredRef = useRef<ConstellationStar | null>(null);
  const panelStarsRef = useRef<PanelStar[]>([]);
  const miniStarsRef = useRef<MiniStar[]>([]);
  const meteorsRef = useRef<Meteor[]>([]);
  const drawStartRef = useRef(0);
  const nextMeteorRef = useRef(0);
  const layoutRef = useRef<() => void>(() => {});

  const qualityRef = useRef<RenderQuality>("high");
  const backdropRef = useRef<HTMLCanvasElement | null>(null);
  const haloSpriteRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const now = performance.now();
    if (drawStartRef.current === 0) drawStartRef.current = now;
    if (nextMeteorRef.current === 0) nextMeteorRef.current = now + 5000;
  }, []);

  useEffect(() => {
    constellationRef.current = constellation;
    drawStartRef.current = performance.now();
    layoutRef.current();
  }, [constellation]);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  useEffect(() => {
    hoveredRef.current = hovered;
  }, [hovered]);

  const hitTest = useCallback((clientX: number, clientY: number): ConstellationStar | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    for (const ps of panelStarsRef.current) {
      const dx = px - ps.x;
      const dy = py - ps.y;
      if (dx * dx + dy * dy < (ps.baseR + 12) * (ps.baseR + 12)) {
        return ps.star;
      }
    }
    return null;
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const hit = hitTest(e.clientX, e.clientY);
      setHovered(hit);
      if (canvasRef.current) {
        canvasRef.current.style.cursor = hit ? "pointer" : "default";
      }
    },
    [hitTest]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const hit = hitTest(e.clientX, e.clientY);
      setSelected(hit && hit.date !== selected?.date ? hit : null);
    },
    [hitTest, selected]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let visible = true;
    let w = 0;
    let h = 0;
    let time = 0;

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 }
    );
    io.observe(container);

    const layout = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, qualityRef.current === "low" ? 1.3 : 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Map constellation stars into panel space (pure % mapping — matches a11y buttons)
      const stars = [...constellationRef.current].sort((a, b) => a.dayNumber - b.dayNumber);
      const maxCount = Math.max(...stars.map((s) => s.salawatCount), 1);
      panelStarsRef.current = stars.map((s) => ({
        x: w * (0.12 + (s.x / 100) * 0.76),
        y: h * (0.1 + (s.y / 100) * 0.55),
        baseR: 3 + (s.salawatCount / maxCount) * 3.2,
        star: s,
        phase: s.dayNumber * 1.3,
      }));

      // Ambient mini starfield — scaled by device quality
      const minis: MiniStar[] = [];
      const density = qualityRef.current === "low" ? 9000 : 5200;
      const count = Math.round((w * h) / density);
      for (let i = 0; i < count; i++) {
        minis.push({
          x: Math.random() * w,
          y: Math.random() * h,
          size: 0.3 + Math.random() * 1.1,
          alpha: 0.12 + Math.random() * 0.3,
          speed: 0.4 + Math.random() * 1.4,
          phase: Math.random() * Math.PI * 2,
        });
      }
      miniStarsRef.current = minis;

      // Pre-render the static sky backdrop (gradient + aurora blob)
      const off = document.createElement("canvas");
      off.width = Math.max(1, Math.round(w));
      off.height = Math.max(1, Math.round(h));
      const octx = off.getContext("2d");
      if (octx) {
        const bg = octx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, "#070b14");
        bg.addColorStop(0.55, "#0b1220");
        bg.addColorStop(1, "#0e1830");
        octx.fillStyle = bg;
        octx.fillRect(0, 0, w, h);

        const aurora = octx.createRadialGradient(w * 0.7, h * 0.15, 0, w * 0.7, h * 0.15, w * 0.6);
        aurora.addColorStop(0, "rgba(30, 58, 95, 0.13)");
        aurora.addColorStop(1, "rgba(0,0,0,0)");
        octx.fillStyle = aurora;
        octx.fillRect(0, 0, w, h);
      }
      backdropRef.current = off;
    };

    const ro = new ResizeObserver(layout);
    ro.observe(container);
    layoutRef.current = layout;
    layout();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    qualityRef.current = detectRenderQuality();

    // Pre-rendered golden halo sprite (replaces per-frame radial gradients)
    {
      const size = 96;
      const sprite = document.createElement("canvas");
      sprite.width = size;
      sprite.height = size;
      const sctx = sprite.getContext("2d");
      if (sctx) {
        const g = sctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        g.addColorStop(0, "rgba(251, 191, 36, 0.9)");
        g.addColorStop(0.4, "rgba(245, 158, 11, 0.32)");
        g.addColorStop(1, "rgba(245, 158, 11, 0)");
        sctx.fillStyle = g;
        sctx.fillRect(0, 0, size, size);
      }
      haloSpriteRef.current = sprite;
    }

    const render = (now: number) => {
      rafRef.current = requestAnimationFrame(render);
      if (!visible || w === 0) return;
      time += 0.016;

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      // ── Pre-rendered sky backdrop (static gradient + aurora) ──
      if (backdropRef.current) {
        ctx.drawImage(backdropRef.current, 0, 0, w, h);
      }

      // ── Ambient mini stars ──
      ctx.globalCompositeOperation = "lighter";
      for (const ms of miniStarsRef.current) {
        const tw = 0.6 + Math.sin(time * ms.speed + ms.phase) * 0.4;
        ctx.fillStyle = `rgba(203, 213, 225, ${ms.alpha * tw})`;
        ctx.beginPath();
        ctx.arc(ms.x, ms.y, ms.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Occasional shooting star inside the monument (high quality only) ──
      const low = qualityRef.current === "low";
      if (!reduced && !low && now > nextMeteorRef.current) {
        nextMeteorRef.current = now + 7000 + Math.random() * 12000;
        meteorsRef.current.push({
          x: Math.random() * w * 0.7 + w * 0.15,
          y: Math.random() * h * 0.3,
          vx: (Math.random() > 0.5 ? 1 : -1) * (4 + Math.random() * 3),
          vy: 1.6 + Math.random(),
          life: 0,
          maxLife: 46,
          len: 60 + Math.random() * 50,
        });
      }
      for (let i = meteorsRef.current.length - 1; i >= 0; i--) {
        const m = meteorsRef.current[i];
        m.life++;
        m.x += m.vx;
        m.y += m.vy;
        if (m.life >= m.maxLife) {
          meteorsRef.current.splice(i, 1);
          continue;
        }
        const p = m.life / m.maxLife;
        const alpha = Math.sin(p * Math.PI) * 0.55;
        const mag = Math.hypot(m.vx, m.vy);
        const tx = m.x - (m.vx / mag) * m.len;
        const ty = m.y - (m.vy / mag) * m.len;
        const grad = ctx.createLinearGradient(m.x, m.y, tx, ty);
        grad.addColorStop(0, `rgba(226,232,240,${alpha})`);
        grad.addColorStop(1, "rgba(226,232,240,0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }

      const panelStars = panelStarsRef.current;

      // ── Golden thread (chronological, self-drawing on mount) ──
      if (panelStars.length > 1) {
        ctx.globalCompositeOperation = "source-over";
        const elapsed = (now - drawStartRef.current) / 2600;
        const reveal = reduced ? 1 : Math.min(1, elapsed);

        ctx.save();
        ctx.strokeStyle = "rgba(245, 158, 11, 0.35)";
        ctx.lineWidth = 1.1;
        ctx.setLineDash([6, 7]);
        ctx.beginPath();
        const total = panelStars.length - 1;
        const visibleSegments = Math.max(0.001, reveal * total);
        const full = Math.floor(visibleSegments);
        for (let i = 0; i < Math.min(full, total); i++) {
          ctx.moveTo(panelStars[i].x, panelStars[i].y);
          ctx.lineTo(panelStars[i + 1].x, panelStars[i + 1].y);
        }
        // Partial segment for smooth draw-in
        const frac = visibleSegments - full;
        if (full < total && frac > 0) {
          const a = panelStars[full];
          const b = panelStars[full + 1];
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(a.x + (b.x - a.x) * frac, a.y + (b.y - a.y) * frac);
        }
        ctx.stroke();
        ctx.restore();
      }

      // ── Memorial stars ──
      ctx.globalCompositeOperation = "lighter";
      panelStars.forEach((ps) => {
        const isSelected = selectedRef.current?.date === ps.star.date;
        const isHovered = hoveredRef.current?.date === ps.star.date;
        const tw = 0.75 + Math.sin(time * 1.7 + ps.phase) * 0.25;
        const r = ps.baseR * (isSelected || isHovered ? 1.5 : 1) * (0.9 + tw * 0.1);

        // Halo — pre-rendered sprite (cheap on every device)
        const haloSize = r * 11;
        ctx.globalAlpha = ps.star.brightness * tw * 0.9;
        ctx.drawImage(haloSpriteRef.current!, ps.x - haloSize / 2, ps.y - haloSize / 2, haloSize, haloSize);
        ctx.globalAlpha = 1;

        // Core
        ctx.fillStyle = `rgba(255, 251, 235, ${0.85 + tw * 0.15})`;
        ctx.beginPath();
        ctx.arc(ps.x, ps.y, r * 0.55, 0, Math.PI * 2);
        ctx.fill();

        // 4-point sacred sparkle for selected/hovered
        if (isSelected || isHovered) {
          ctx.strokeStyle = `rgba(252, 211, 77, ${isSelected ? 0.9 : 0.5})`;
          ctx.lineWidth = 1;
          const ray = r * (isSelected ? 4.2 : 3.2);
          ctx.beginPath();
          ctx.moveTo(ps.x - ray, ps.y);
          ctx.lineTo(ps.x + ray, ps.y);
          ctx.moveTo(ps.x, ps.y - ray);
          ctx.lineTo(ps.x, ps.y + ray);
          ctx.stroke();

          if (isSelected) {
            ctx.strokeStyle = "rgba(252, 211, 77, 0.55)";
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(ps.x, ps.y, r * 2.6 + Math.sin(time * 2.4) * 2, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      });

      // ── Hover label ──
      const hov = hoveredRef.current;
      if (hov) {
        const ps = panelStars.find((p) => p.star.date === hov.date);
        if (ps) {
          ctx.globalCompositeOperation = "source-over";
          ctx.font = "600 12px Shabnam, Vazirmatn, sans-serif";
          ctx.direction = "rtl";
          ctx.textAlign = "center";
          const label = `روز ${toPersianDigits(hov.dayNumber)} • ${hov.martyrName}`;
          const metrics = ctx.measureText(label);
          const lw = metrics.width + 20;
          const lx = Math.min(Math.max(ps.x, lw / 2 + 8), w - lw / 2 - 8);
          const ly = Math.max(ps.y - ps.baseR * 6 - 30, 8);

          ctx.fillStyle = "rgba(9, 13, 22, 0.92)";
          ctx.strokeStyle = "rgba(251, 191, 36, 0.4)";
          ctx.lineWidth = 1;
          const rr = 8;
          ctx.beginPath();
          ctx.roundRect(lx - lw / 2, ly, lw, 26, rr);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#fde68a";
          ctx.fillText(label, lx, ly + 17);
        }
      }

      ctx.globalCompositeOperation = "source-over";
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  const sorted = [...constellation].sort((a, b) => a.dayNumber - b.dayNumber);

  return (
    <section className="w-full max-w-4xl mx-auto px-4 py-14 relative z-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400/90 mb-3 tracking-wide">
          <Sparkles className="w-4 h-4" />
          <span>حافظه معنوی پویش</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-3">
          صورت‌فلکی یادواره شهدا
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
          هر ستاره، پرتاب موفق یک روز است؛ نوری ماندگار که مردم به یاد شهدای والامقام به آسمان فرستادند.
        </p>
      </div>

      <div
        ref={containerRef}
        className="relative w-full h-96 sm:h-[26rem] rounded-3xl overflow-hidden border border-amber-500/25 shadow-[0_25px_60px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.05)]"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHovered(null)}
          onClick={handleClick}
          role="img"
          aria-label="آسمان صورت‌فلکی یادواره شهدا"
        />

        {/* Keyboard-accessible star buttons (visual transparent) */}
        {sorted.map((star) => (
          <button
            key={star.date}
            onClick={() => setSelected(selected?.date === star.date ? null : star)}
            className="absolute w-10 h-10 -translate-x-1/2 -translate-y-1/2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80 opacity-0 z-10"
            style={{ left: `calc(12% + ${star.x}% * 0.76)`, top: `calc(10% + ${star.y}% * 0.55)` }}
            aria-label={`پرواز روز ${star.dayNumber} به یاد ${star.martyrName}`}
            tabIndex={0}
          />
        ))}

        {/* Empty sky state */}
        {constellation.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
            <Star className="w-8 h-8 text-amber-400/50 mb-3 animate-twinkle" />
            <p className="text-sm text-slate-400 leading-relaxed">
              آسمان در انتظار نخستین پرواز است.
              <br />
              <span className="text-xs text-slate-500">
                با تکمیل هدف امروز، اولین ستاره این یادمان روشن می‌شود.
              </span>
            </p>
          </div>
        )}

        {/* Star count badge */}
        {constellation.length > 0 && (
          <div className="absolute top-4 right-4 glass-panel rounded-full px-4 py-1.5 text-[11px] text-amber-200/90 font-semibold flex items-center gap-1.5 pointer-events-none">
            <Star className="w-3.5 h-3.5 text-amber-400" />
            {toPersianDigits(constellation.length)} ستاره ماندگار
          </div>
        )}

        {/* Selected star memorial card */}
        {selected && (
          <div className="absolute bottom-4 right-4 left-4 sm:left-auto sm:w-96 glass-panel rounded-2xl p-4 animate-gentle-fade z-20">
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div>
                <span className="text-[10px] font-bold text-amber-400 tracking-wide">
                  پرواز روز {toPersianDigits(selected.dayNumber)}
                </span>
                <h4 className="text-base font-bold text-slate-100 mt-0.5">
                  به یاد {selected.martyrName}
                </h4>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-slate-500 hover:text-slate-200 transition-colors p-1 -m-1"
                aria-label="بستن جزئیات ستاره"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300 pt-2.5 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-amber-400" />
                <span className="tabular-nums">{formatPersianNumber(selected.salawatCount)} صلوات</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Calendar className="w-3 h-3" />
                <span>{formatShortJalaliDate(selected.date)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
