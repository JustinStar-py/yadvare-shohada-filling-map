"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

interface Portrait {
  id: string;
  name: string;
  photoUrl: string;
}

interface MemorialIntroProps {
  onDone: () => void;
}

const LINE_1 = "عاشقانه‌ای ساختیم";
const LINE_2 = "تقدیم به ۷۶ لاله‌";

// Minimum time on screen so both poetic lines are actually read.
const MIN_DISPLAY_MS = 13400;
// Never trap the user on a slow network.
const HARD_CAP_MS = 20000;
// After everything is ready, glide in automatically unless they tap first.
const AUTO_ENTER_AFTER_READY_MS = 4200;
const EXIT_MS = 1400;

/** Deterministic PRNG so server/client render identical skies (no hydration flash). */
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function PortraitTile({ p }: { p: Portrait }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative w-full aspect-[3/4] shrink-0 rounded-xl overflow-hidden border border-white/10 bg-gradient-to-b from-slate-800/50 to-slate-950/70">
      <img
        src={p.photoUrl}
        alt=""
        aria-hidden="true"
        draggable={false}
        onLoad={() => setLoaded(true)}
        loading="eager"
        decoding="async"
        className={`h-full w-full object-cover saturate-[0.82] transition-opacity duration-[1200ms] ease-out ${
          loaded ? "opacity-70" : "opacity-0"
        }`}
      />
      <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-amber-100/10 pointer-events-none" />
    </div>
  );
}

function PlaceholderTile() {
  return (
    <div className="w-full aspect-[3/4] shrink-0 rounded-xl border border-white/[0.07] bg-gradient-to-b from-slate-800/40 to-slate-950/60 animate-pulse" />
  );
}

export default function MemorialIntro({ onDone }: MemorialIntroProps) {
  const [portraits, setPortraits] = useState<Portrait[]>([]);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  // ── Poetic text choreography: line 1 gets ~5s fully visible before morph ──
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 8000); // line 1 begins to dissolve
    const t2 = setTimeout(() => setPhase(2), 8900); // line 2 rises
    const t3 = setTimeout(() => setShowSkip(true), 2500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // ── Background preload: portraits, 3D chunks, fonts ──
  useEffect(() => {
    let cancelled = false;
    let imagesDone = false;
    let chunksDone = false;
    let fontsDone = false;
    let minElapsed = false;
    let loadedCount = 0;
    let totalCount = 1;
    let readyFired = false;

    const renderProgress = () => {
      if (cancelled) return;
      const imgPart = totalCount > 0 ? (loadedCount / totalCount) * 0.72 : 0.72;
      const rest = (chunksDone ? 0.18 : 0) + (fontsDone ? 0.1 : 0);
      setProgress(Math.min(0.99, imgPart + rest));
    };

    const maybeReady = () => {
      if (!cancelled && !readyFired && imagesDone && chunksDone && fontsDone && minElapsed) {
        readyFired = true;
        setProgress(1);
        setReady(true);
      }
    };

    const minTimer = setTimeout(() => {
      minElapsed = true;
      maybeReady();
    }, MIN_DISPLAY_MS);

    const hardCap = setTimeout(() => {
      // Slow network: enter with whatever we have rather than trapping anyone.
      imagesDone = true;
      chunksDone = true;
      fontsDone = true;
      minElapsed = true;
      maybeReady();
    }, HARD_CAP_MS);

    // 1. Martyr portraits (also feeds the floating columns below)
    fetch("/api/campaign/martyrs", { cache: "force-cache" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list: Portrait[] = Array.isArray(data?.portraits) ? data.portraits : [];
        setPortraits(list);
        totalCount = Math.max(1, list.length);
        if (list.length === 0) {
          imagesDone = true;
          renderProgress();
          maybeReady();
          return;
        }
        renderProgress();
        list.forEach((p) => {
          const im = new Image();
          try {
            im.decoding = "async";
          } catch {}
          im.onload = im.onerror = () => {
            loadedCount += 1;
            renderProgress();
            if (loadedCount >= list.length) {
              imagesDone = true;
              maybeReady();
            }
          };
          im.src = p.photoUrl;
        });
      })
      .catch(() => {
        imagesDone = true;
        renderProgress();
        maybeReady();
      });

    // 2. Warm the heavy 3D chunks so the hero appears instantly afterwards.
    Promise.allSettled([import("three"), import("./engine/ThreeRocketScene")]).then(() => {
      chunksDone = true;
      renderProgress();
      maybeReady();
    });

    // 3. Typography must be settled before the morph reads as cinematic.
    try {
      (document.fonts?.ready as Promise<unknown> | undefined)?.then?.(() => {
        fontsDone = true;
        renderProgress();
        maybeReady();
      });
      setTimeout(() => {
        if (!fontsDone) {
          fontsDone = true;
          renderProgress();
          maybeReady();
        }
      }, 4000);
    } catch {
      fontsDone = true;
      maybeReady();
    }

    return () => {
      cancelled = true;
      clearTimeout(minTimer);
      clearTimeout(hardCap);
    };
  }, []);

  const finish = React.useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setLeaving(true);
    setTimeout(() => onDoneRef.current(), EXIT_MS);
  }, []);

  // Auto-glide once ready (the button below is the faster path).
  useEffect(() => {
    if (!ready || doneRef.current) return;
    const t = setTimeout(finish, AUTO_ENTER_AFTER_READY_MS);
    return () => clearTimeout(t);
  }, [ready, finish]);

  // ── Deterministic sky + columns (identical on server & client) ──
  const stars = useMemo(() => {
    const rand = mulberry32(76);
    return Array.from({ length: 130 }, (_, i) => ({
      id: i,
      left: rand() * 100,
      top: rand() * 100,
      size: 1 + rand() * 1.8,
      delay: rand() * 6,
      dur: 2.6 + rand() * 3.6,
    }));
  }, []);

  const columns = useMemo(() => {
    const count = 5;
    const cols: Portrait[][] = Array.from({ length: count }, () => []);
    portraits.forEach((p, i) => cols[i % count].push(p));
    const rand = mulberry32(1405);
    return cols.map((items, i) => ({
      items,
      // A couple of columns drift upward for depth and rhythm.
      dir: i === 1 || i === 3 ? ("up" as const) : ("down" as const),
      dur: Math.round(85 + rand() * 55),
    }));
  }, [portraits]);

  const line1Words = LINE_1.split(" ");
  const line2Words = LINE_2.split(" ");

  return (
    <div
      dir="rtl"
      aria-label="یادبود شهدا"
      className={`fixed inset-0 z-[200] overflow-hidden bg-[#04060d] transition-all duration-[1400ms] ease-out ${
        leaving ? "opacity-0 scale-[1.04] blur-sm pointer-events-none" : "opacity-100"
      }`}
    >
      {/* ── Deep space atmosphere ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_65%_at_50%_110%,rgba(30,41,82,0.5),transparent),radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(120,53,80,0.16),transparent),radial-gradient(ellipse_45%_35%_at_50%_45%,rgba(245,158,11,0.05),transparent)]" />
      {stars.map((s) => (
        <span
          key={s.id}
          aria-hidden="true"
          className="memorial-twinkle-star absolute rounded-full bg-slate-100"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animation: `memorial-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}

      {/* ── Crystal shards: slow translucent prisms ── */}
      <div
        aria-hidden="true"
        className="memorial-float-el absolute -left-16 top-[16%] h-64 w-64 border border-cyan-100/15 bg-gradient-to-br from-cyan-200/[0.07] via-transparent to-amber-200/[0.06] blur-[1px]"
        style={{ animation: "memorial-float 14s ease-in-out infinite", ["--memorial-rot" as string]: "18deg" }}
      />
      <div
        aria-hidden="true"
        className="memorial-float-el absolute -right-20 top-[58%] h-80 w-80 border border-violet-100/10 bg-gradient-to-tl from-violet-200/[0.06] via-transparent to-cyan-100/[0.05] blur-[1px]"
        style={{ animation: "memorial-float 19s ease-in-out 2s infinite", ["--memorial-rot" as string]: "-14deg" }}
      />
      <div
        aria-hidden="true"
        className="memorial-float-el absolute left-[8%] bottom-[6%] h-36 w-36 border border-amber-100/15 bg-gradient-to-tr from-amber-200/[0.07] via-transparent to-transparent"
        style={{ animation: "memorial-float 11s ease-in-out 1s infinite", ["--memorial-rot" as string]: "30deg" }}
      />

      {/* ── Floating memories: portrait columns ── */}
      <div className="absolute inset-0 flex items-stretch justify-center gap-3 sm:gap-4 px-4 sm:px-8" aria-hidden="true">
        {columns.map((col, ci) => (
          <div key={ci} className="relative h-full w-14 xs:w-16 flex-1 max-w-24 sm:max-w-28 overflow-hidden">
            <div
              className="memorial-drift flex flex-col gap-3 py-3"
              style={{
                animation: `${col.dir === "up" ? "memorial-drift-up" : "memorial-drift-down"} ${
                  col.dur
                }s linear infinite`,
              }}
            >
              {(col.items.length > 0
                ? [...col.items, ...col.items]
                : Array.from({ length: 14 }, () => null)
              ).map((p, pi) =>
                // Note: each portrait renders twice for the seamless loop,
                // so the index MUST be part of the key.
                p ? (
                  <PortraitTile key={`${p.id}-${pi}`} p={p} />
                ) : (
                  <PlaceholderTile key={`ph-${ci}-${pi}`} />
                )
              )}
            </div>
            {/* Soften column edges into the dark */}
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#04060d] to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#04060d] to-transparent pointer-events-none" />
          </div>
        ))}
      </div>

      {/* ── Readability shade behind the words ── */}
      <div className="absolute inset-0 z-[5] bg-[radial-gradient(ellipse_75%_42%_at_50%_50%,rgba(4,6,13,0.82),transparent)] pointer-events-none" />

      {/* ── Center message: poetic morph ── */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center pointer-events-none">
        <div className="mb-5 flex items-center gap-2 text-amber-200/80">
          <span className="h-px w-10 bg-gradient-to-l from-amber-300/60 to-transparent" />
          <span className="text-base sm:text-md font-extrabold tracking-[0.3em]">یادواره شهدای شهیدیه</span>
          <span className="h-px w-10 bg-gradient-to-r from-amber-300/60 to-transparent" />
        </div>

        <div className="relative min-h-[9rem] sm:min-h-[11rem] flex items-center justify-center">
          {phase < 2 ? (
            <h1
              className={`relative text-[2rem] leading-[3rem] sm:text-[2.75rem] sm:leading-[3.9rem] font-black ${
                phase === 1 ? "memorial-dissolve-words" : ""
              }`}
            >
              {/* Luminous halo lives on its own layer — never a filter on text */}
              <span
                aria-hidden="true"
                className="absolute inset-x-8 inset-y-2 -z-10 rounded-full bg-amber-500/[0.14] blur-2xl pointer-events-none"
              />
              {line1Words.map((w, i) => (
                <span
                  key={i}
                  className="memorial-word"
                  style={{ animationDelay: `${0.25 + i * 0.34}s` }}
                >
                  <span className="memorial-sheen-text">{w}</span>
                  {i < line1Words.length - 1 ? " " : ""}
                </span>
              ))}
            </h1>
          ) : (
            <h1 className="relative text-[2rem] leading-[3rem] sm:text-[2.75rem] sm:leading-[3.9rem] font-black">
              {/* Luminous halo lives on its own layer — never a filter on text */}
              <span
                aria-hidden="true"
                className="absolute inset-x-8 inset-y-2 -z-10 rounded-full bg-rose-500/[0.14] blur-2xl pointer-events-none"
              />
              {line2Words.map((w, i) => (
                <span
                  key={i}
                  className="memorial-word"
                  style={{ animationDelay: `${i * 0.3}s` }}
                >
                  <span className="memorial-sheen-text-red">{w}</span>
                  {i < line2Words.length - 1 ? " " : ""}
                </span>
              ))}
            </h1>
          )}
        </div>

        {/* Breathing room under the verse — the scene glides on by itself */}
        <div className="pointer-events-none mt-7 h-11" aria-hidden="true" />
      </div>

      {/* ── Quiet progress + skip chrome ── */}
      <div className="absolute bottom-7 inset-x-0 z-20 flex flex-col items-center gap-2.5 pointer-events-none">
        <div className="w-40 h-px bg-white/10 overflow-hidden rounded-full" aria-hidden="true">
          <div
            className="h-full bg-gradient-to-l from-amber-500 to-amber-200 transition-[width] duration-500 ease-out"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <span className="text-[10px] text-slate-500 font-medium">
          {ready ? "آماده است" : "در حال آماده‌سازی تجربه…"}
        </span>
        {showSkip && !ready && !leaving && (
          <button
            type="button"
            onClick={finish}
            className="pointer-events-auto text-[11px] text-slate-500 hover:text-amber-300 transition-colors cursor-pointer font-bold mt-1"
          >
            رد کردن
          </button>
        )}
      </div>
    </div>
  );
}
