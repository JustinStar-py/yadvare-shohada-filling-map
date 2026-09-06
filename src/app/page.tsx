"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Header from "@/components/Header";
import AtmosphereCanvas from "@/components/engine/AtmosphereCanvas";
import HeroSection from "@/components/HeroSection";
import DedicationCard from "@/components/DedicationCard";
import CampaignStory from "@/components/CampaignStory";
import ConstellationView from "@/components/ConstellationView";
import CollectiveRecord from "@/components/CollectiveRecord";
import MemorialInfo from "@/components/MemorialInfo";
import LaunchOverlay from "@/components/LaunchOverlay";
import ShareCardModal from "@/components/ShareCardModal";
import { PublicCampaignState } from "@/types/campaign";
import { soundEngine } from "@/lib/client/procedural-audio";
import { Shield } from "lucide-react";

export default function HomePage() {
  const [state, setState] = useState<PublicCampaignState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);
  // Physical liftoff (T-0), kept separate from isLaunching (the whole
  // ceremony) so the rocket stays on its pad while the countdown runs.
  const [hasLiftedOff, setHasLiftedOff] = useState(false);
  const [showLaunchOverlay, setShowLaunchOverlay] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [energyBurstTrigger, setEnergyBurstTrigger] = useState(0);
  const [readyBloomTrigger, setReadyBloomTrigger] = useState(0);

  const missionStateRef = useRef<string | null>(null);
  const stateRef = useRef<PublicCampaignState | null>(null);

  // ── Optimistic salawat bookkeeping ──────────────────────────────────────
  // The server count is the single source of truth. Local clicks raise the
  // displayed count instantly; a stale SSE snapshot can never drag it back
  // down (or negative) because the display is monotonic and only re-anchors
  // to server values once the server has caught up with it.
  const displayedCountRef = useRef(0);
  const serverCountRef = useRef(0);

  // Fetch initial campaign state
  const loadState = useCallback(async () => {
    try {
      const res = await fetch("/api/campaign/state");
      if (res.ok) {
        const data: PublicCampaignState = await res.json();
        serverCountRef.current = data.mission.currentCount;
        displayedCountRef.current = data.mission.currentCount;
        setState(data);
        missionStateRef.current = data.mission.state;
      }
    } catch (err) {
      console.error("Error loading campaign state:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  // Mirror of `state` for use inside event handlers (always current)
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Day for which THIS client already completed the launch ceremony —
  // prevents our own launch_event SSE echo from replaying the overlay
  const [ceremonyCompletedDate, setCeremonyCompletedDate] = useState<string | null>(null);
  const ceremonyCompletedDateRef = useRef<string | null>(null);

  useEffect(() => {
    ceremonyCompletedDateRef.current = ceremonyCompletedDate;
  }, [ceremonyCompletedDate]);

  // Sacred golden bloom when the day's target is reached (once per transition)
  useEffect(() => {
    if (!state) return;
    const prev = missionStateRef.current;
    const current = state.mission.state;
    if (prev && prev !== "READY_TO_LAUNCH" && current === "READY_TO_LAUNCH") {
      setReadyBloomTrigger((t) => t + 1);
      soundEngine.playReadyChime();
    }
    missionStateRef.current = current;
  }, [state?.mission.state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Connect to realtime SSE stream
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const connectSSE = () => {
      if (disposed) return;
      eventSource = new EventSource("/api/salawat/stream");

      eventSource.addEventListener("salawat_update", (e) => {
        try {
          const update = JSON.parse(e.data);
          const isNewDay = update.date && update.date !== stateRef.current?.mission.date;

          // A new campaign day started — reload full state (outside setState)
          if (isNewDay) {
            loadState();
            return;
          }

          setState((prev) => {
            if (!prev) return prev;

            // Monotonic reconciliation: only move the display when the server
            // count has caught up with (or passed) what we're showing.
            serverCountRef.current = Math.max(serverCountRef.current, update.currentCount);
            if (update.currentCount >= displayedCountRef.current) {
              displayedCountRef.current = update.currentCount;
            }

            // State precedence: server update must never regress a locally reached READY_TO_LAUNCH
            const STATE_PRECEDENCE: Record<string, number> = {
              ACTIVE: 0,
              READY_TO_LAUNCH: 1,
              LAUNCHING: 2,
              LAUNCHED: 3,
            };
            const serverState = update.state || prev.mission.state;
            const localState = prev.mission.state;
            const resolvedState =
              (STATE_PRECEDENCE[serverState] ?? 0) >= (STATE_PRECEDENCE[localState] ?? 0)
                ? serverState
                : localState;

            return {
              ...prev,
              mission: {
                ...prev.mission,
                currentCount: displayedCountRef.current,
                target: update.target ?? prev.mission.target,
                state: resolvedState,
                participantsCount: Math.max(
                  prev.mission.participantsCount,
                  update.participantsCount ?? 0
                ),
              },
            };
          });
        } catch (err) {
          console.error("SSE parse error:", err);
        }
      });

      eventSource.addEventListener("launch_event", (e) => {
        try {
          const { mission, newStar } = JSON.parse(e.data);

          // The day is sealed — re-anchor to the authoritative final count
          serverCountRef.current = mission.currentCount;
          displayedCountRef.current = mission.currentCount;

          setState((prev) => {
            if (!prev) return prev;
            const updatedConstellation = prev.constellation.filter(
              (s) => s.date !== newStar.date
            );
            updatedConstellation.push(newStar);
            return {
              ...prev,
              mission,
              constellation: updatedConstellation,
              totalLaunchesCount: prev.totalLaunchesCount + 1,
            };
          });

          // Don't replay the ceremony for the user who just completed it
          if (ceremonyCompletedDateRef.current !== mission.date) {
            // The ceremony starts with the overlay: isLaunching drives the
            // countdown engine glow + pad venting. The rocket itself lifts
            // off at T-0 (onLiftOff -> hasLiftedOff), never during the count.
            setIsLaunching(true);
            setShowLaunchOverlay(true);
          }
        } catch (err) {
          console.error("SSE launch parse error:", err);
        }
      });

      eventSource.onerror = () => {
        eventSource?.close();
        if (disposed) return;
        // Reconnect after 5 seconds (single pending timer — no duplicate streams)
        reconnectTimer = setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      eventSource?.close();
    };
  }, [loadState]);

  // Daily reset watchdog: poll every 60s so the Tehran-midnight rollover
  // lands (fresh empty rocket) even when no SSE traffic is flowing.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hidden) return; // don't poll background tabs
      loadState();
    }, 60_000);
    return () => clearInterval(interval);
  }, [loadState]);

  // Flush any offline retry queue on mount
  useEffect(() => {
    const flush = async () => {
      try {
        const queue: Array<{ idempotencyKey: string; count: number }> = JSON.parse(
          localStorage.getItem("offline_salawat_queue") || "[]"
        );
        if (queue.length === 0) return;
        localStorage.removeItem("offline_salawat_queue");

        const failed: typeof queue = [];
        // Idempotency keys make re-sending safe — keep failures for the next visit
        for (const item of queue) {
          try {
            const res = await fetch("/api/salawat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item),
            });
            if (!res.ok) failed.push(item);
          } catch {
            failed.push(item);
          }
        }
        if (failed.length > 0) {
          localStorage.setItem("offline_salawat_queue", JSON.stringify(failed.slice(-50)));
        }
      } catch {}
    };
    flush();
  }, []);

  // ── Optimistic salawat handlers ─────────────────────────────────────────

  // Optimistic press from the Hero CTA
  const handleSalawatPress = useCallback((count: number) => {
    setEnergyBurstTrigger((prev) => prev + 1);
    displayedCountRef.current += count;

    setState((prev) => {
      if (!prev) return prev;
      const newCount = displayedCountRef.current;
      const willBeReady = newCount >= prev.mission.target && prev.mission.state === "ACTIVE";

      return {
        ...prev,
        totalCampaignSalawat: prev.totalCampaignSalawat + count,
        mission: {
          ...prev.mission,
          currentCount: newCount,
          state: willBeReady ? "READY_TO_LAUNCH" : prev.mission.state,
          participantsCount: prev.mission.participantsCount + 1,
        },
      };
    });
  }, []);

  // The server explicitly rejected a submission (rate-limited / day launched):
  // roll the optimistic increment back so the UI stays honest.
  const handleSalawatRejected = useCallback((count: number) => {
    displayedCountRef.current = Math.max(serverCountRef.current, displayedCountRef.current - count);

    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        totalCampaignSalawat: Math.max(0, prev.totalCampaignSalawat - count),
        mission: {
          ...prev.mission,
          currentCount: displayedCountRef.current,
          participantsCount: Math.max(0, prev.mission.participantsCount - 1),
        },
      };
    });
  }, []);

  // ── Auto launch for every user when they open the page if fuel is full ──
  const autoLaunchedDateRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state || loading) return;
    if (autoLaunchedDateRef.current === state.mission.date) return;

    const isReadyOrLaunched =
      state.mission.currentCount >= state.mission.target ||
      state.mission.state === "READY_TO_LAUNCH" ||
      state.mission.state === "LAUNCHED";

    if (!isReadyOrLaunched) return;

    autoLaunchedDateRef.current = state.mission.date;

    const timer = setTimeout(() => {
      setIsLaunching(true);
      setShowLaunchOverlay(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [state, loading]);

  const handleFlightComplete = useCallback(() => {
    setHasLiftedOff(false);
  }, []);

  const handleLaunchOverlayComplete = useCallback(async () => {
    // Mark the ceremony as completed for today BEFORE sealing, so our own
    // launch_event SSE echo doesn't replay the overlay
    if (state?.mission.date) {
      setCeremonyCompletedDate(state.mission.date);
    }

    // If mission is ready but not yet officially marked launched on server, seal it
    if (state?.mission.state === "READY_TO_LAUNCH") {
      try {
        await fetch("/api/campaign/launch", { method: "POST" });
      } catch {}
    }
    setShowLaunchOverlay(false);
    setIsLaunching(false);
    setHasLiftedOff(false);
  }, [state]);

  const handleLaunchOverlayClose = useCallback(() => {
    setShowLaunchOverlay(false);
    setIsLaunching(false);
    setHasLiftedOff(false);
  }, []);

  // T-0 - the countdown overlay reached zero: ignite and lift off.
  const handleLiftOff = useCallback(() => {
    setIsLaunching(true);
    setHasLiftedOff(true);
  }, []);

  const handleReplayLaunch = useCallback(() => {
    setIsLaunching(true);
    setShowLaunchOverlay(true);
  }, []);

  // Loading state — a quiet, expectant night
  if (loading || !state) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center text-slate-100 p-4">
        <div className="relative w-20 h-20 mb-5">
          <div className="absolute inset-0 rounded-full border border-amber-500/30 animate-shockwave" />
          <div className="absolute inset-0 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 animate-pulse">
            <Shield className="w-9 h-9" />
          </div>
        </div>
        <p className="text-sm font-semibold text-amber-300/90 animate-pulse tracking-wide">
          در حال برقراری ارتباط با پویش یادواره شهدا...
        </p>
      </div>
    );
  }

  const fuelPercentage = Math.min(
    100,
    Math.round((state.mission.currentCount / (state.mission.target || 1)) * 100)
  );

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 relative overflow-x-hidden flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950">
      {/* Background Starfield & Particle Atmosphere */}
      <AtmosphereCanvas
        fuelPercentage={fuelPercentage}
        isLaunching={isLaunching}
        hasLiftedOff={hasLiftedOff}
        constellation={state.constellation}
        readyBloomTrigger={readyBloomTrigger}
      />

      {/* Header Bar: Fixed overlay at top, floats seamlessly over the celestial sky without displacing layout */}
      <div
        className={`fixed top-0 inset-x-0 z-30 pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] pt-[env(safe-area-inset-top)] ${
          hasLiftedOff ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        <Header tehranDate={state.tehranDate} />
      </div>

      {/* Primary Cinematic Hero Interaction */}
      <main className="w-full flex-1 flex flex-col">
        <HeroSection
          campaignState={state}
          isLaunching={isLaunching}
          hasLiftedOff={hasLiftedOff}
          onSalawatPress={handleSalawatPress}
          onSalawatRejected={handleSalawatRejected}
          onOpenShareModal={() => setShowShareModal(true)}
          onReplayLaunch={handleReplayLaunch}
          onFlightComplete={handleFlightComplete}
          energyBurstTrigger={energyBurstTrigger}
        />

        {/* Below-the-fold Secondary Remembrance & Info Sections */}
        <div className="w-full bg-gradient-to-b from-transparent via-[#080c14]/95 to-[#05080e] pt-14 pb-16 border-t border-white/[0.03]">
          {/* Today's Dedication to Martyr */}
          <DedicationCard martyr={state.todayMartyr} />

          {/* Campaign Narrative & Metaphor Story */}
          <CampaignStory />

          {/* Persistent Celestial Constellation View */}
          <ConstellationView constellation={state.constellation} />

          {/* Restrained Collective Campaign Statistics */}
          <CollectiveRecord
            totalSalawat={state.totalCampaignSalawat}
            totalLaunches={state.totalLaunchesCount}
          />

          {/* Ceremony and Memorial Program Information */}
          <MemorialInfo
            memorialTitle={state.settings.memorialTitle}
            memorialDate={state.memorialDate}
            memorialLocation={state.settings.memorialLocation}
          />
        </div>
      </main>

      {/* Solemn Footer */}
      <footer className="w-full py-9 border-t border-slate-900/90 text-center text-xs text-slate-500 relative z-10">
        <div className="w-16 h-px mx-auto mb-6 bg-gradient-to-l from-transparent via-amber-500/40 to-transparent" />
        <p className="max-w-md mx-auto px-4 leading-loose">
          «اللّهُمَّ صَلِّ عَلی مُحَمَّدٍ وَ آلِ مُحَمَّدٍ وَ عَجِّل فَرَجَهُم»
          <br />
          پویش مردمی و معنوی گرامیداشت یادواره شهدای والامقام میهن اسلامی
        </p>
      </footer>

      {/* Launch Countdown & Ascension Sequence Overlay */}
      <LaunchOverlay
        isOpen={showLaunchOverlay}
        martyrName={state.todayMartyr?.name || "شهدای والامقام"}
        onComplete={handleLaunchOverlayComplete}
        onLiftOff={handleLiftOff}
        onClose={handleLaunchOverlayClose}
      />

      {/* Social Media Share Card Modal */}
      <ShareCardModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        salawatCount={state.mission.currentCount}
        daysRemaining={state.daysRemaining}
        tehranDate={state.tehranDate}
      />
    </div>
  );
}
