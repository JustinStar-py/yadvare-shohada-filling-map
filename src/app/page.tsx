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
  const [showLaunchOverlay, setShowLaunchOverlay] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [energyBurstTrigger, setEnergyBurstTrigger] = useState(0);
  const [readyBloomTrigger, setReadyBloomTrigger] = useState(0);

  const missionStateRef = useRef<string | null>(null);

  // Fetch initial campaign state
  const loadState = useCallback(async () => {
    try {
      const res = await fetch("/api/campaign/state");
      if (res.ok) {
        const data: PublicCampaignState = await res.json();
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

    const connectSSE = () => {
      eventSource = new EventSource("/api/salawat/stream");

      eventSource.addEventListener("salawat_update", (e) => {
        try {
          const update = JSON.parse(e.data);
          setState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              mission: {
                ...prev.mission,
                currentCount: update.currentCount,
                target: update.target,
                state: update.state,
                participantsCount: update.participantsCount,
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
          setIsLaunching(true);
          setShowLaunchOverlay(true);

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
        } catch (err) {
          console.error("SSE launch parse error:", err);
        }
      });

      eventSource.onerror = () => {
        eventSource?.close();
        // Reconnect after 5 seconds
        setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    return () => {
      eventSource?.close();
    };
  }, []);

  // Flush any offline retry queue on mount
  useEffect(() => {
    try {
      const queue = JSON.parse(localStorage.getItem("offline_salawat_queue") || "[]");
      if (queue.length > 0) {
        localStorage.removeItem("offline_salawat_queue");
        queue.forEach((item: { idempotencyKey: string; count: number }) => {
          fetch("/api/salawat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
          }).catch(() => {});
        });
      }
    } catch {}
  }, []);

  // Handle optimistic Salawat press from Hero CTA
  const handleSalawatPress = useCallback((count: number) => {
    setEnergyBurstTrigger((prev) => prev + 1);

    setState((prev) => {
      if (!prev) return prev;
      const newCount = prev.mission.currentCount + count;
      const newTotal = prev.totalCampaignSalawat + count;
      const willBeReady = newCount >= prev.mission.target && prev.mission.state === "ACTIVE";

      return {
        ...prev,
        totalCampaignSalawat: newTotal,
        mission: {
          ...prev.mission,
          currentCount: newCount,
          state: willBeReady ? "READY_TO_LAUNCH" : prev.mission.state,
          participantsCount: prev.mission.participantsCount + 1,
        },
      };
    });
  }, []);

  const handleLaunchOverlayComplete = () => {
    setShowLaunchOverlay(false);
    setIsLaunching(false);
  };

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
        constellation={state.constellation}
        readyBloomTrigger={readyBloomTrigger}
      />

      {/* Header Bar */}
      <Header tehranDate={state.tehranDate} />

      {/* Primary Cinematic Hero Interaction */}
      <main className="w-full flex-1 flex flex-col">
        <HeroSection
          campaignState={state}
          isLaunching={isLaunching}
          onSalawatPress={handleSalawatPress}
          onOpenShareModal={() => setShowShareModal(true)}
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
