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
import { PublicCampaignState, SalawatSubmissionResponse, MartyrProfile } from "@/types/campaign";
import { soundEngine } from "@/lib/client/procedural-audio";
import YadvareLogo from "@/components/ui/YadvareLogo";
import { toPersianDigits, getTehranDateString } from "@/lib/utils";
import DailyMissionTourModal, { UserDailyMission } from "@/components/DailyMissionTourModal";
import { getOrCreateVisitorId } from "@/lib/client/visitor-id";
import { drainOutbox, enqueueSalawat, subscribeOutbox } from "@/lib/client/salawat-outbox";
import OnboardingTour from "@/components/OnboardingTour";
import MemorialIntro from "@/components/MemorialIntro";

// Mission-state rank used to reconcile concurrent server updates with local
// optimistic state: a server update must never regress a locally reached state.
const STATE_PRECEDENCE: Record<string, number> = {
  ACTIVE: 0,
  READY_TO_LAUNCH: 1,
  LAUNCHING: 2,
  LAUNCHED: 3,
};

export default function HomePage() {
  const [state, setState] = useState<PublicCampaignState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTourOpen, setIsTourOpen] = useState(false);
  // Cinematic memorial intro: once per user, preloads the main experience.
  const [showIntro, setShowIntro] = useState(false);
  const showIntroRef = useRef(false);
  const isTourOpenRef = useRef(false);
  useEffect(() => {
    isTourOpenRef.current = isTourOpen;
  }, [isTourOpen]);
  const [isLaunching, setIsLaunching] = useState(false);
  // Physical liftoff (T-0), kept separate from isLaunching (the whole
  // ceremony) so the rocket stays on its pad while the countdown runs.
  const [hasLiftedOff, setHasLiftedOff] = useState(false);
  const [showLaunchOverlay, setShowLaunchOverlay] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [energyBurstTrigger, setEnergyBurstTrigger] = useState(0);
  const [readyBloomTrigger, setReadyBloomTrigger] = useState(0);

  // ── User's Personal Daily Mission Tour State ──
  const [userMission, setUserMission] = useState<UserDailyMission | null>(null);
  const [showTourModal, setShowTourModal] = useState(false);
  const [isTourReviewMode, setIsTourReviewMode] = useState(false);
  const [pendingMissionData, setPendingMissionData] = useState<{
    martyr: MartyrProfile;
    suggestedCount: number;
    cycle?: number;
  } | null>(null);

  const userMissionRef = useRef<UserDailyMission | null>(null);
  const pendingMissionDataRef = useRef<{
    martyr: MartyrProfile;
    suggestedCount: number;
    cycle?: number;
  } | null>(null);
  const missionStateRef = useRef<string | null>(null);
  const stateRef = useRef<PublicCampaignState | null>(null);
  // Mission as first seen this visit. The ceremony only ever auto-fires on a
  // *live escalation* past this snapshot — never just for opening the page
  // on an already-full tank.
  const entryMissionRef = useRef<{ date: string; state: string } | null>(null);

  // ── Optimistic & Multiplayer Salawat Bookkeeping ─────────────────────────
  // displayedCount = serverCount + inFlightLocalCount.
  // When a batch succeeds over HTTP POST, we re-anchor serverCount instantly
  // and decrement inFlightLocalCount without waiting for SSE.
  const displayedCountRef = useRef(0);
  const serverCountRef = useRef(0);
  const inFlightCountRef = useRef(0);
  const lastEpochRef = useRef(1);
  const lastSeqRef = useRef(0);

  // Fetch initial campaign state
  const loadState = useCallback(async () => {
    try {
      const res = await fetch("/api/campaign/state", { cache: "no-store" });
      if (res.ok) {
        const data: PublicCampaignState = await res.json();
        serverCountRef.current = data.mission.currentCount;
        inFlightCountRef.current = 0;
        displayedCountRef.current = data.mission.currentCount;
        lastEpochRef.current = data.mission.epoch ?? 1;
        stateRef.current = data;
        setState(data);
        missionStateRef.current = data.mission.state;
        if (!entryMissionRef.current) {
          entryMissionRef.current = { date: data.mission.date, state: data.mission.state };
        }

        // ── Check or initialize user's personal daily mission ──
        const todayStr = data.tehranDate;
        const visitorId = getOrCreateVisitorId();
        const storageKey = `salawat_daily_mission_${todayStr}`;
        let savedMission: UserDailyMission | null = null;
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) savedMission = JSON.parse(raw);
        } catch {}

        if (savedMission && savedMission.completedTour) {
          setUserMission(savedMission);
          userMissionRef.current = savedMission;
          setPendingMissionData({
            martyr: savedMission.martyr,
            suggestedCount: savedMission.suggestedCount,
          });
          pendingMissionDataRef.current = {
            martyr: savedMission.martyr,
            suggestedCount: savedMission.suggestedCount,
          };
        } else {
          fetch(`/api/campaign/daily-mission?visitorId=${encodeURIComponent(visitorId)}&date=${todayStr}`)
            .then((r) => r.json())
            .then((missionRes) => {
              if (missionRes && missionRes.success && missionRes.martyr) {
                const missionData = {
                  martyr: missionRes.martyr,
                  suggestedCount: missionRes.suggestedCount,
                };
                setPendingMissionData(missionData);
                pendingMissionDataRef.current = missionData;
              }
            })
            .catch(() => {});
        }
      }
    } catch (err) {
      console.error("Error loading campaign state:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadState();
    soundEngine.setupAutoPlayListeners();
  }, [loadState]);

  // Mirror of `state` for use inside event handlers (always current)
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ── Memorial intro: every user experiences it at least once a day ──
  useEffect(() => {
    try {
      const today = getTehranDateString(new Date());
      if (localStorage.getItem("yadvare_intro_last_seen") !== today) {
        showIntroRef.current = true;
        setShowIntro(true);
      }
    } catch {
      showIntroRef.current = true;
      setShowIntro(true);
    }
  }, []);

  const handleIntroDone = useCallback(() => {
    try {
      localStorage.setItem("yadvare_intro_last_seen", getTehranDateString(new Date()));
    } catch {}
    showIntroRef.current = false;
    setShowIntro(false);
  }, []);

  // Day for which THIS client already completed the launch ceremony —
  // prevents our own launch_event SSE echo from replaying the overlay
  const [ceremonyCompletedDate, setCeremonyCompletedDate] = useState<string | null>(null);
  const ceremonyCompletedDateRef = useRef<string | null>(null);

  useEffect(() => {
    ceremonyCompletedDateRef.current = ceremonyCompletedDate;
  }, [ceremonyCompletedDate]);

  // ── First-time Onboarding Guided Spotlight Tour Trigger ──
  // Waits for the memorial intro to finish first — one cinematic at a time.
  useEffect(() => {
    if (loading || !state || showIntro) return;
    try {
      const tourCompleted = localStorage.getItem("yadvare_tour_completed_v1");
      if (!tourCompleted) {
        // Allow the canvas atmosphere, 3D rocket, and odometer to settle
        const timer = setTimeout(() => {
          setIsTourOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [loading, state, showIntro]);

  // ── Daily envelope auto-present: one gentle invitation per day ──
  // Opens the personal martyr envelope once the intro and onboarding tour
  // are out of the way — unless the user already completed it today or a
  // ceremony is playing. Dismissing it never re-triggers it the same day.
  const envelopeAutoOpenedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state || loading) return;
    if (showIntro || isTourOpen || showTourModal) return;
    if (showLaunchOverlay || isLaunching) return;
    if (!pendingMissionData) return;
    const today = state.tehranDate;
    if (envelopeAutoOpenedRef.current === today) return;
    if (userMission && userMission.date === today && userMission.completedTour) return;
    // Wait until the onboarding spotlight tour has actually been finished or
    // skipped (not merely "not open right now") — otherwise both tours pop
    // together on first visit. Closing the tour re-runs this effect.
    try {
      if (!localStorage.getItem("yadvare_tour_completed_v1")) return;
    } catch {}

    envelopeAutoOpenedRef.current = today;
    const timer = setTimeout(() => {
      // Re-check: the user may have reopened the tour meanwhile.
      if (isTourOpenRef.current) {
        envelopeAutoOpenedRef.current = null;
        return;
      }
      if (pendingMissionDataRef.current) {
        setIsTourReviewMode(false);
        setShowTourModal(true);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [
    state,
    loading,
    showIntro,
    isTourOpen,
    showTourModal,
    showLaunchOverlay,
    isLaunching,
    pendingMissionData,
    userMission,
  ]);

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
      const url =
        lastSeqRef.current > 0
          ? `/api/salawat/stream?since=${lastSeqRef.current}`
          : "/api/salawat/stream";
      eventSource = new EventSource(url);

      eventSource.addEventListener("connected", (e) => {
        try {
          const info = JSON.parse(e.data);
          if (typeof info.seq === "number") {
            lastSeqRef.current = Math.max(lastSeqRef.current, info.seq);
          }
        } catch {}
      });

      eventSource.addEventListener("salawat_update", (e) => {
        try {
          const update = JSON.parse(e.data);
          if (typeof update.seq === "number") {
            lastSeqRef.current = Math.max(lastSeqRef.current, update.seq);
          }

          const isNewDay = update.date && update.date !== stateRef.current?.mission.date;

          // A new campaign day started — reload full state (outside setState)
          if (isNewDay) {
            loadState();
            return;
          }

          const incomingEpoch = update.epoch ?? 1;
          const isEpochReset = incomingEpoch > lastEpochRef.current;

          setState((prev) => {
            if (!prev) return prev;

            if (isEpochReset) {
              lastEpochRef.current = incomingEpoch;
              serverCountRef.current = update.currentCount;
              inFlightCountRef.current = 0;
              displayedCountRef.current = update.currentCount;
            } else {
              serverCountRef.current = Math.max(serverCountRef.current, update.currentCount);
              displayedCountRef.current = serverCountRef.current + inFlightCountRef.current;
            }

            // State precedence: server update must never regress a locally reached READY_TO_LAUNCH
            const serverState = update.state || prev.mission.state;
            const localState = prev.mission.state;
            const resolvedState =
              isEpochReset || (STATE_PRECEDENCE[serverState] ?? 0) >= (STATE_PRECEDENCE[localState] ?? 0)
                ? serverState
                : localState;

            return {
              ...prev,
              totalCampaignSalawat:
                typeof update.totalCampaignSalawat === "number"
                  ? update.totalCampaignSalawat + inFlightCountRef.current
                  : prev.totalCampaignSalawat,
              mission: {
                ...prev.mission,
                currentCount: displayedCountRef.current,
                target: update.target ?? prev.mission.target,
                state: resolvedState,
                epoch: incomingEpoch,
                participantsCount: Math.max(
                  isEpochReset ? 0 : prev.mission.participantsCount,
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

          // Don't replay the ceremony for the user who just completed it,
          // and never pop it over the memorial intro — the auto-launch
          // effect plays it fresh once the intro is dismissed.
          if (ceremonyCompletedDateRef.current !== mission.date && !showIntroRef.current) {
            setIsLaunching(true);
            setShowLaunchOverlay(true);
          }
        } catch (err) {
          console.error("SSE launch parse error:", err);
        }
      });

      eventSource.addEventListener("settings_update", (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.settings) {
            setState((prev) => {
              if (!prev) return prev;
              const next = {
                ...prev,
                settings: {
                  ...prev.settings,
                  ...payload.settings,
                },
              };
              stateRef.current = next;
              return next;
            });
          }
        } catch (err) {
          console.error("SSE settings parse error:", err);
        }
      });

      eventSource.onerror = () => {
        if (disposed) return;
        // The browser reconnects transient drops by itself (server sends a
        // retry: hint and replays the gap via Last-Event-ID). Only take over
        // manually when the browser has given up (CLOSED), e.g. a server
        // restart briefly failing the stream request.
        if (eventSource && eventSource.readyState === EventSource.CLOSED) {
          eventSource.close();
          reconnectTimer = setTimeout(connectSSE, 5000);
        }
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

  // ── Optimistic salawat handlers ─────────────────────────────────────────

  // Optimistic press from the Hero CTA - updates in realtime immediately on tap!
  const handleSalawatPress = useCallback((count: number) => {
    setEnergyBurstTrigger((prev) => prev + 1);
    inFlightCountRef.current += count;
    displayedCountRef.current = serverCountRef.current + inFlightCountRef.current;

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
          participantsCount: Math.max(1, prev.mission.participantsCount),
        },
      };
    });

    // Realtime live update for user's personal daily mission covenant chip
    setUserMission((prev) => {
      if (!prev) return null;
      const updated: UserDailyMission = {
        ...prev,
        userContributed: (prev.userContributed || 0) + count,
      };
      userMissionRef.current = updated;
      try {
        localStorage.setItem(`salawat_daily_mission_${prev.date}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // Server responded with authoritative state on batch success
  const handleSalawatSuccess = useCallback(
    (data: SalawatSubmissionResponse, flushedCount: number) => {
      const responseEpoch = data.epoch ?? 1;
      const isEpochAdopt = responseEpoch > lastEpochRef.current;

      if (isEpochAdopt) {
        // Server epoch moved forward (admin reset / rollover): adopt wholesale.
        lastEpochRef.current = responseEpoch;
        serverCountRef.current = data.currentCount;
        inFlightCountRef.current = 0;
      } else {
        // Monotonic re-anchor: never regress below a count an SSE update
        // already delivered while this POST was in flight.
        serverCountRef.current = Math.max(serverCountRef.current, data.currentCount);
        inFlightCountRef.current = Math.max(0, inFlightCountRef.current - flushedCount);
      }
      displayedCountRef.current = serverCountRef.current + inFlightCountRef.current;

      setState((prev) => {
        if (!prev) return prev;
        const newCount = displayedCountRef.current;
        const willBeReady =
          (newCount >= data.target || data.missionState === "READY_TO_LAUNCH") &&
          prev.mission.state === "ACTIVE";

        // A stale POST response must never regress a locally reached state.
        const resolvedState = willBeReady
          ? "READY_TO_LAUNCH"
          : (STATE_PRECEDENCE[data.missionState] ?? 0) >= (STATE_PRECEDENCE[prev.mission.state] ?? 0)
            ? data.missionState
            : prev.mission.state;

        return {
          ...prev,
          totalCampaignSalawat: data.totalCampaignSalawat ?? prev.totalCampaignSalawat,
          mission: {
            ...prev.mission,
            currentCount: newCount,
            target: data.target,
            state: resolvedState,
            participantsCount: Math.max(
              isEpochAdopt ? 0 : prev.mission.participantsCount,
              data.participantsCount
            ),
            epoch: responseEpoch,
          },
        };
      });

      // Confirm personal daily mission state is safely saved in localStorage
      if (userMissionRef.current) {
        try {
          localStorage.setItem(
            `salawat_daily_mission_${userMissionRef.current.date}`,
            JSON.stringify(userMissionRef.current)
          );
        } catch {}
      }
    },
    []
  );

  // The server explicitly rejected a submission (409 day launched / 400):
  // roll the optimistic increment back so the UI stays honest.
  const handleSalawatRejected = useCallback((count: number) => {
    inFlightCountRef.current = Math.max(0, inFlightCountRef.current - count);
    displayedCountRef.current = serverCountRef.current + inFlightCountRef.current;

    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        totalCampaignSalawat: Math.max(0, prev.totalCampaignSalawat - count),
        mission: {
          ...prev.mission,
          currentCount: displayedCountRef.current,
        },
      };
    });

    // Rollback personal daily mission count on rejection
    setUserMission((prev) => {
      if (!prev) return null;
      const updated: UserDailyMission = {
        ...prev,
        userContributed: Math.max(0, (prev.userContributed || 0) - count),
      };
      userMissionRef.current = updated;
      try {
        localStorage.setItem(`salawat_daily_mission_${prev.date}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // Inline retries in the button exhausted — persist the batch to the durable
  // outbox under its ORIGINAL idempotency key so it syncs exactly once when
  // the outbox drains (server-side idempotency dedupes any overlap).
  const handleSalawatDeferred = useCallback((idempotencyKey: string, count: number) => {
    const snapshot = stateRef.current;
    if (!snapshot) return;
    try {
      enqueueSalawat({
        idempotencyKey,
        visitorId: getOrCreateVisitorId(),
        count,
        missionDate: snapshot.tehranDate,
        clientEpoch: lastEpochRef.current,
        clientTimestamp: Date.now(),
      });
    } catch {
      // Outbox full or storage unavailable — nothing further we can do here.
    }
  }, []);

  // Durable outbox worker: drain deferred submissions until the server
  // confirms them, retrying with backoff on 429/5xx/network errors.
  useEffect(() => {
    const date = state?.tehranDate;
    if (!date) return;

    // One-time migration: carry over pending legacy-queue entries, preserving
    // their original idempotency keys (the legacy flush re-keyed batches,
    // risking double counts, and dropped recitations on non-OK responses).
    try {
      const legacy: Array<{ idempotencyKey?: string; count?: number }> = JSON.parse(
        localStorage.getItem("offline_salawat_queue") || "[]"
      );
      if (legacy.length > 0) {
        localStorage.removeItem("offline_salawat_queue");
        const visitorId = getOrCreateVisitorId();
        for (const item of legacy) {
          if (!item?.idempotencyKey || typeof item.count !== "number") continue;
          try {
            enqueueSalawat({
              idempotencyKey: item.idempotencyKey,
              visitorId,
              count: Math.min(50, Math.max(1, Math.round(item.count))),
              missionDate: date,
              clientEpoch: lastEpochRef.current,
              clientTimestamp: Date.now(),
            });
          } catch {}
        }
      }
    } catch {}

    const drain = () => {
      const snapshot = stateRef.current;
      if (!snapshot) return;
      drainOutbox(snapshot.tehranDate, lastEpochRef.current, getOrCreateVisitorId());
    };

    drain();
    const unsubscribe = subscribeOutbox((event) => {
      if (event.type === "success") {
        handleSalawatSuccess(event.data, event.entry.count);
      } else if (event.type === "rejected") {
        handleSalawatRejected(event.entry.count);
      }
    });
    window.addEventListener("online", drain);
    const retryInterval = setInterval(drain, 30_000);

    return () => {
      unsubscribe();
      window.removeEventListener("online", drain);
      clearInterval(retryInterval);
    };
  }, [state?.tehranDate, handleSalawatSuccess, handleSalawatRejected]);

  // ── Launch ceremony trigger ──
  // NEVER just for opening the home page on a full tank — entry shows only
  // the hero "watch flight" CTA. The overlay auto-fires solely on a live
  // escalation while browsing (fresh fill-up or fresh seal past the entry
  // snapshot), and even then waits out the intro/tour and yields to the CTA
  // for first-tour guests.
  const autoLaunchedDateRef = useRef<string | null>(null);
  const firstTourVisitRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!state || loading) return;
    if (autoLaunchedDateRef.current === state.mission.date) return;

    const isReadyOrLaunched =
      state.mission.currentCount >= state.mission.target ||
      state.mission.state === "READY_TO_LAUNCH" ||
      state.mission.state === "LAUNCHED";

    if (!isReadyOrLaunched) return;

    // Already full (or sealed) when the page opened? Stay quiet — CTA only.
    // Only a live escalation past the entry snapshot may auto-fire.
    const entry = entryMissionRef.current;
    const liveEscalation =
      !!entry &&
      (state.mission.date !== entry.date ||
        (STATE_PRECEDENCE[state.mission.state] ?? 0) > (STATE_PRECEDENCE[entry.state] ?? 0));
    if (!liveEscalation) return;

    // Capture visit type on first evaluation (before the tour can set its
    // completion flag), so a just-finished guest still counts as first-tour.
    if (firstTourVisitRef.current === null) {
      try {
        firstTourVisitRef.current = !localStorage.getItem("yadvare_tour_completed_v1");
      } catch {
        firstTourVisitRef.current = false;
      }
    }
    if (isTourOpen) return;
    // The memorial intro owns the screen until dismissed — the ceremony
    // starts fresh afterwards (this effect re-runs on showIntro change).
    if (showIntro) return;

    if (firstTourVisitRef.current) {
      // Leave the invitation to the hero CTA; mark the date so a later
      // top-up this visit still doesn't ambush them with the overlay.
      autoLaunchedDateRef.current = state.mission.date;
      return;
    }

    autoLaunchedDateRef.current = state.mission.date;

    const timer = setTimeout(() => {
      // Guarantee the hero/rocket is in view before the ceremony starts.
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        window.scrollTo(0, 0);
      }
      setIsLaunching(true);
      setShowLaunchOverlay(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [state, loading, isTourOpen, showIntro]);

  const handleFlightComplete = useCallback(() => {
    setHasLiftedOff(false);
    soundEngine.onMissileLaunchEnd();
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
    soundEngine.onMissileLaunchEnd();
  }, [state]);

  const handleLaunchOverlayClose = useCallback(() => {
    setShowLaunchOverlay(false);
    setIsLaunching(false);
    setHasLiftedOff(false);
    soundEngine.onMissileLaunchEnd();
  }, []);

  // Onboarding spotlight tour ended (finished or skipped): close it and bring
  // the user back to the hero section, where the "watch flight" CTA invites
  // them if the fuel is full. (No auto ceremony on entry — only live
  // escalations while browsing may auto-fire, via the effect above.)
  const handleOnboardingTourEnd = useCallback(() => {
    setIsTourOpen(false);
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  }, []);
  // Accepting the pledge contributes its suggested share to the day total,
  // exactly once per pledge (deterministic idempotency key per visitor/date/cycle).
  const handlePledgeContribution = useCallback(
    async (mission: UserDailyMission) => {
      const count = Math.floor(mission.suggestedCount) || 0;
      if (count < 1) return;
      handleSalawatPress(count);
      setEnergyBurstTrigger((t) => t + 1);
      try {
        const visitorId = getOrCreateVisitorId();
        const res = await fetch("/api/salawat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idempotencyKey: `pledge-${visitorId}-${mission.date}-c${mission.cycle ?? 0}`.slice(0, 64),
            count,
            visitorId,
            clientEpoch: lastEpochRef.current,
          }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data) {
          handleSalawatSuccess(data, count);
        } else {
          handleSalawatRejected(count);
        }
      } catch {
        handleSalawatRejected(count);
      }
    },
    [handleSalawatPress, handleSalawatSuccess, handleSalawatRejected]
  );

  const handleTourComplete = useCallback(
    (completed: UserDailyMission) => {
      const alreadySubmitted = !!completed.pledgeSubmitted;
      const stamped: UserDailyMission = alreadySubmitted
        ? completed
        : { ...completed, pledgeSubmitted: true };
      setUserMission(stamped);
      userMissionRef.current = stamped;
      setShowTourModal(false);
      setIsTourReviewMode(false);
      try {
        localStorage.setItem(`salawat_daily_mission_${stamped.date}`, JSON.stringify(stamped));
      } catch {}
      if (!alreadySubmitted) {
        void handlePledgeContribution(stamped);
      }
    },
    [handlePledgeContribution]
  );

  const handleOpenMissionCard = useCallback(() => {
    if (userMissionRef.current) {
      setPendingMissionData({
        martyr: userMissionRef.current.martyr,
        suggestedCount: userMissionRef.current.suggestedCount,
        cycle: userMissionRef.current.cycle,
      });
      setIsTourReviewMode(true);
      setShowTourModal(true);
    } else if (pendingMissionDataRef.current) {
      setIsTourReviewMode(false);
      setShowTourModal(true);
    }
  }, []);

  const handleRenewMission = useCallback(async () => {
    try {
      const visitorId = getOrCreateVisitorId();
      const todayStr = stateRef.current?.tehranDate || new Date().toISOString().slice(0, 10);
      const nextCycle = (userMissionRef.current?.cycle || 0) + 1;
      const currentMartyrId = userMissionRef.current?.martyr.id;

      // Temporarily hide modal while loading new mission
      setShowTourModal(false);

      const res = await fetch(
        `/api/campaign/daily-mission?visitorId=${encodeURIComponent(visitorId)}&date=${todayStr}&cycle=${nextCycle}&excludeId=${encodeURIComponent(currentMartyrId || "")}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.martyr) {
          const newMissionData = {
            martyr: data.martyr,
            suggestedCount: data.suggestedCount,
            cycle: nextCycle,
          };
          setPendingMissionData(newMissionData);
          pendingMissionDataRef.current = newMissionData;
          setIsTourReviewMode(false); // Make sure it starts with unopened envelope
          setShowTourModal(true);
        }
      }
    } catch (err) {
      console.error("Error renewing daily mission:", err);
    }
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
        <div className="relative w-24 h-24 mb-5 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-amber-500/30 animate-shockwave" />
          <div className="absolute inset-0 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center animate-pulse" />
          <YadvareLogo className="w-16 h-16 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)] z-10" priority />
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
          hasLiftedOff || showLaunchOverlay ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        <Header tehranDate={state.tehranDate} onStartTour={() => setIsTourOpen(true)} />
      </div>

      {/* Primary Cinematic Hero Interaction */}
      <main className="w-full flex-1 flex flex-col">
        <HeroSection
          campaignState={state}
          isLaunching={isLaunching}
          hasLiftedOff={hasLiftedOff}
          onSalawatPress={handleSalawatPress}
          onSalawatSuccess={handleSalawatSuccess}
          onSalawatRejected={handleSalawatRejected}
          onSalawatDeferred={handleSalawatDeferred}
          onOpenShareModal={() => setShowShareModal(true)}
          onReplayLaunch={handleReplayLaunch}
          onFlightComplete={handleFlightComplete}
          energyBurstTrigger={energyBurstTrigger}
          userMission={userMission}
          onOpenMissionCard={handleOpenMissionCard}
          onRenewMission={handleRenewMission}
        />

        {/* Below-the-fold Secondary Remembrance & Info Sections */}
        <div className="w-full bg-gradient-to-b from-transparent via-[#080c14]/95 to-[#05080e] pt-14 pb-16 border-t border-white/[0.03]">
          {/* Today's Dedication to Martyrs */}
          <DedicationCard martyr={state.todayMartyr} martyrs={state.todayMartyrs} />

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
            memorialTime={state.memorialTime || state.settings.memorialTime}
            memorialLocation={state.settings.memorialLocation}
          />
        </div>
      </main>

      {/* Solemn Footer */}
      <footer className="w-full py-10 border-t border-slate-900/90 text-center text-xs text-slate-500 relative z-10">
        <div className="flex justify-center mb-4">
          <YadvareLogo className="w-12 h-12 opacity-80 hover:opacity-100 transition-opacity drop-shadow-[0_2px_8px_rgba(245,158,11,0.2)]" />
        </div>
        <div className="w-16 h-px mx-auto mb-5 bg-gradient-to-l from-transparent via-amber-500/40 to-transparent" />
        <p className="max-w-md mx-auto px-4 leading-loose">
          «اللّهُمَّ صَلِّ عَلی مُحَمَّدٍ وَ آلِ مُحَمَّدٍ وَ عَجِّل فَرَجَهُم»
          <br />
          پویش مردمی و معنوی یادواره ۷۶ شهید شهیدیه میبد
        </p>
      </footer>

      {/* Launch Countdown & Ascension Sequence Overlay */}
      <LaunchOverlay
        isOpen={showLaunchOverlay}
        missileModel={state.settings.activeMissileModel || "kheibar"}
        martyrName={
          state.todayMartyrs && state.todayMartyrs.length > 1
            ? `${toPersianDigits(state.todayMartyrs.length)} شهید والامقام دیار شهیدیه`
            : state.todayMartyr?.name || "شهدای والامقام"
        }
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
        customShareMessage={state.settings.shareMessage}
      />

      {/* Daily Memorial Mission 3D Cinematic Tour Modal */}
      {pendingMissionData && (
        <DailyMissionTourModal
          key={`tour-modal-${pendingMissionData.martyr.id}-${pendingMissionData.cycle || 0}-${isTourReviewMode ? "review" : "envelope"}`}
          isOpen={showTourModal}
          date={state.tehranDate}
          mission={pendingMissionData}
          onComplete={handleTourComplete}
          onClose={() => setShowTourModal(false)}
          startRevealed={isTourReviewMode}
        />
      )}

      {/* First-Time Visitor Guided Spotlight Onboarding Tour */}
      <OnboardingTour
        isOpen={isTourOpen}
        onClose={handleOnboardingTourEnd}
        onComplete={handleOnboardingTourEnd}
      />

      {/* Cinematic memorial intro — once per user, preloads the experience */}
      {showIntro && <MemorialIntro onDone={handleIntroDone} />}
    </div>
  );
}
