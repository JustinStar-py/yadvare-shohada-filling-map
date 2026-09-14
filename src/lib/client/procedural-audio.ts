// Web Audio API procedural sound engine with zero external audio dependencies.
// Layered synthesis designed for a solemn, sacred celestial atmosphere.

type BellConfig = {
  freq: number;
  gain: number;
  decay: number;
  type?: OscillatorType;
  detune?: number;
};

class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true; // Default muted for respectful UX
  private masterGain: GainNode | null = null;
  private ambientNodes: OscillatorNode[] = [];
  private ambientGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private bgMusic: HTMLAudioElement | null = null;
  private musicVolume: number = 0.75; // 75% volume
  private isLaunchMuted: boolean = false; // Muted during missile launch until mission passed
  private launchNodes: (AudioNode & { stop?: (when?: number) => void })[] = [];
  private launchTimers: (NodeJS.Timeout | number)[] = [];
  private lastReturnSoundTimes: Record<string, number> = {};

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("salawat_audio_muted_v2");
        // Default to false (unmuted) so playground music plays immediately upon user visit/interaction
        this.isMuted = saved !== null ? saved === "true" : false;
      } catch {
        this.isMuted = false;
      }
      (window as unknown as { __soundEngine?: ProceduralAudioEngine }).__soundEngine = this;
    }
  }

  private initContext() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.isMuted ? 0 : 0.4;
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  private getNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    if (this.noiseBuffer) return this.noiseBuffer;

    const length = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }


  /**
   * Lazily initializes the playground background music element.
   * File is large (~1.08MB), so preload is strictly set to "none"
   * and the Audio object is only created on-demand.
   */
  private autoPlayInitialized = false;

  /**
   * Unlocks and starts playground music upon first user interaction
   * or page load, adhering to browser Autoplay Policy.
   */
  public setupAutoPlayListeners() {
    if (typeof window === "undefined" || this.autoPlayInitialized) return;
    this.autoPlayInitialized = true;

    const onUserInteraction = () => {
      if (!this.isMuted && !this.isLaunchMuted) {
        this.playPlaygroundMusic();
      }
      if (this.bgMusic && !this.bgMusic.paused) {
        window.removeEventListener("pointerdown", onUserInteraction, { capture: true });
        window.removeEventListener("keydown", onUserInteraction, { capture: true });
        window.removeEventListener("touchstart", onUserInteraction, { capture: true });
        window.removeEventListener("click", onUserInteraction, { capture: true });
      }
    };

    // Try immediately (works if browser allows or user already engaged)
    if (!this.isMuted && !this.isLaunchMuted) {
      this.playPlaygroundMusic();
    }

    window.addEventListener("pointerdown", onUserInteraction, { capture: true, passive: true });
    window.addEventListener("keydown", onUserInteraction, { capture: true, passive: true });
    window.addEventListener("touchstart", onUserInteraction, { capture: true, passive: true });
    window.addEventListener("click", onUserInteraction, { capture: true, passive: true });
  }

  private initPlaygroundMusic(): HTMLAudioElement | null {
    if (typeof window === "undefined") return null;
    if (!this.bgMusic) {
      try {
        const audio = new Audio();
        audio.src = "/audio/bayad-barkhast-playground.mp3";
        audio.preload = "none";
        audio.loop = true;
        audio.volume = this.musicVolume;

        audio.addEventListener("error", () => {
          console.error("Playground audio error:", audio.error);
        });
        audio.addEventListener("playing", () => {
          console.log("Playground background music playing at 75% volume");
        });

        this.bgMusic = audio;
      } catch (err) {
        console.warn("Failed to create playground audio:", err);
        return null;
      }
    }
    return this.bgMusic;
  }

  public playPlaygroundMusic() {
    if (this.isMuted || this.isLaunchMuted || typeof window === "undefined") return;
    const music = this.initPlaygroundMusic();
    if (!music) return;
    music.volume = this.musicVolume;
    if (music.paused) {
      if (music.readyState === 0) {
        music.load();
      }
      const p = music.play();
      if (p !== undefined) {
        p.catch((e) => {
          console.debug("Playground music waiting for user interaction:", e);
        });
      }
    }
  }

  public pausePlaygroundMusic() {
    if (this.bgMusic && !this.bgMusic.paused) {
      try {
        this.bgMusic.pause();
      } catch {}
    }
  }

  /**
   * Ducks / mutes background playground music when a missile launch starts
   * so rocket thrusters and countdown sound effects have full acoustic focus.
   */
  public onMissileLaunchStart() {
    this.isLaunchMuted = true;
    this.pausePlaygroundMusic();
  }

  /**
   * Resumes playground music once the missile mission has passed / completed
   * (honoring the user's manual mute toggle) and terminates any lingering launch nodes.
   */
  public onMissileLaunchEnd() {
    this.stopLaunchSounds();
    if (!this.isLaunchMuted) return;
    this.isLaunchMuted = false;
    if (!this.isMuted) {
      this.playPlaygroundMusic();
    }
  }

  /**
   * Immediately stops all active rocket ascent, descent, and return sound nodes and timers.
   */
  public stopLaunchSounds() {
    this.launchTimers.forEach((t) => clearTimeout(t));
    this.launchTimers = [];
    const now = this.ctx ? this.ctx.currentTime : 0;
    this.launchNodes.forEach((node) => {
      try {
        if ("gain" in node && (node as GainNode).gain) {
          (node as GainNode).gain.setTargetAtTime(0.0001, now, 0.04);
        }
        if (typeof (node as AudioScheduledSourceNode).stop === "function") {
          (node as AudioScheduledSourceNode).stop(now + 0.05);
        }
      } catch {}
    });
    this.launchNodes = [];
  }

  public isMissileLaunchMuted(): boolean {
    return this.isLaunchMuted;
  }

  public setPlaygroundMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.bgMusic) {
      this.bgMusic.volume = this.musicVolume;
    }
  }

  public toggleMute(): boolean {
    this.initContext();
    this.isMuted = !this.isMuted;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("salawat_audio_muted_v2", String(this.isMuted));
      } catch {}
    }
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : 0.4;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
    if (!this.isMuted) {
      this.playPlaygroundMusic();
    } else {
      this.pausePlaygroundMusic();
      this.stopAmbient();
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /** A single warm bell voice with inharmonic partials */
  private playBell({ freq, gain, decay, type = "sine", detune = 0 }: BellConfig) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Fundamental
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.detune.setValueAtTime(detune, now);

    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.linearRampToValueAtTime(gain, now + 0.012);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + decay + 0.05);

    // Quint partial (warmth)
    const partial = this.ctx.createOscillator();
    const partialGain = this.ctx.createGain();
    partial.type = "sine";
    partial.frequency.setValueAtTime(freq * 1.5, now);
    partialGain.gain.setValueAtTime(0.0001, now);
    partialGain.gain.linearRampToValueAtTime(gain * 0.32, now + 0.02);
    partialGain.gain.exponentialRampToValueAtTime(0.0001, now + decay * 0.6);

    partial.connect(partialGain);
    partialGain.connect(this.masterGain);
    partial.start(now);
    partial.stop(now + decay * 0.6 + 0.05);

    // Inharmonic shimmer partial (bell character)
    const shimmer = this.ctx.createOscillator();
    const shimmerGain = this.ctx.createGain();
    shimmer.type = "sine";
    shimmer.frequency.setValueAtTime(freq * 2.76, now);
    shimmerGain.gain.setValueAtTime(0.0001, now);
    shimmerGain.gain.linearRampToValueAtTime(gain * 0.14, now + 0.015);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + decay * 0.35);

    shimmer.connect(shimmerGain);
    shimmerGain.connect(this.masterGain);
    shimmer.start(now);
    shimmer.stop(now + decay * 0.35 + 0.05);
  }

  /**
   * Gentle, warm bell when sending a Salawat.
   * Soft pentatonic frequencies with progressive ascending step on rapid taps.
   * Soft pentatonic frequencies — never jarring.
   */
  public playSalawatTone(stepIndex?: number) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.bgMusic || this.bgMusic.paused) {
      this.playPlaygroundMusic();
    }
    if (!this.ctx || !this.masterGain) return;

    const scale = [432, 486, 540, 648, 729];
    const freq = typeof stepIndex === "number"
      ? scale[Math.min(scale.length - 1, stepIndex % scale.length)]
      : scale[Math.floor(Math.random() * scale.length)];
    this.playBell({ freq, gain: 0.15, decay: 1.2 });
  }

  /**
   * Soft ascending arpeggio when the day's target is reached —
   * a moment of quiet fulfillment, not fanfare.
   */
  public playReadyChime() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const notes = [523.25, 659.25, 783.99]; // C5 - E5 - G5
    notes.forEach((freq, i) => {
      setTimeout(() => {
        if (!this.isMuted) {
          this.playBell({ freq, gain: 0.13, decay: 2.2 });
        }
      }, i * 260);
    });
  }

  /**
   * Quiet sparkle when a new star is born in the memorial sky.
   */
  public playStarBirth() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    this.playBell({ freq: 1046.5, gain: 0.08, decay: 2.8 });
    setTimeout(() => {
      if (!this.isMuted) {
        this.playBell({ freq: 1318.5, gain: 0.06, decay: 3.2 });
      }
    }, 180);
  }

  /**
   * Subtle countdown tick.
   */
  public playTick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    this.playBell({ freq: 880, gain: 0.06, decay: 0.5, type: "triangle" });
  }

  /**
   * Resonant, thrilling launch crescendo:
   * 1. Ignition shockwave
   * 2. Dual-beating sub-propulsion core
   * 3. Supersonic aero-whistle & turbine climb (high-excitement tension)
   * 4. Supersonic flame roar with flutter
   * 5. Stratospheric celestial swell
   * 6. Stage separation, booster return descent, pad touchdown, and docking lock
   */
  public playLaunchAscent() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    this.stopLaunchSounds();

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // ── 1. Ignition Shockwave Punch (0.0s - 1.2s) ──
    const shock = ctx.createOscillator();
    const shockGain = ctx.createGain();
    shock.type = "sawtooth";
    shock.frequency.setValueAtTime(78, now);
    shock.frequency.exponentialRampToValueAtTime(34, now + 0.6);
    shockGain.gain.setValueAtTime(0.42, now);
    shockGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    shock.connect(shockGain);
    shockGain.connect(this.masterGain);
    shock.start(now);
    shock.stop(now + 0.75);
    this.launchNodes.push(shock, shockGain);

    // ── 2. Dual Sub-Bass Propulsion Rumble (0.0s - 16.2s) ──
    // Two detuned low oscillators create natural acoustic beating and chest-rumbling pressure
    const rumbleA = ctx.createOscillator();
    const rumbleB = ctx.createOscillator();
    const rumbleGain = ctx.createGain();
    const rumbleFilter = ctx.createBiquadFilter();

    rumbleA.type = "sawtooth";
    rumbleA.frequency.setValueAtTime(46, now);
    rumbleA.frequency.exponentialRampToValueAtTime(68, now + 4.0);
    rumbleA.frequency.exponentialRampToValueAtTime(52, now + 14.0);

    rumbleB.type = "square";
    rumbleB.frequency.setValueAtTime(48.5, now);
    rumbleB.frequency.exponentialRampToValueAtTime(71.5, now + 4.0);
    rumbleB.frequency.exponentialRampToValueAtTime(54, now + 14.0);

    rumbleFilter.type = "lowpass";
    rumbleFilter.frequency.setValueAtTime(160, now);
    rumbleFilter.frequency.exponentialRampToValueAtTime(540, now + 3.8); // Thruster nozzle opens full throttle
    rumbleFilter.frequency.exponentialRampToValueAtTime(240, now + 14.0);
    rumbleFilter.Q.setValueAtTime(2.2, now);

    rumbleGain.gain.setValueAtTime(0.0001, now);
    rumbleGain.gain.linearRampToValueAtTime(0.38, now + 1.8);
    rumbleGain.gain.linearRampToValueAtTime(0.32, now + 6.0);
    rumbleGain.gain.linearRampToValueAtTime(0.18, now + 13.5);
    rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + 16.2);

    rumbleA.connect(rumbleFilter);
    rumbleB.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(this.masterGain);

    rumbleA.start(now);
    rumbleB.start(now);
    rumbleA.stop(now + 16.3);
    rumbleB.stop(now + 16.3);
    this.launchNodes.push(rumbleA, rumbleB, rumbleFilter, rumbleGain);

    // ── 3. Supersonic Aero Whistle & Turbine Scream (1.2s - 14.8s) ──
    // The exhilarating high-altitude pitch climb that makes the ascent thrilling!
    const whistle = ctx.createOscillator();
    const whistleGain = ctx.createGain();
    const whistleFilter = ctx.createBiquadFilter();

    whistle.type = "triangle";
    whistle.frequency.setValueAtTime(180, now + 1.2);
    whistle.frequency.exponentialRampToValueAtTime(440, now + 4.5);
    whistle.frequency.exponentialRampToValueAtTime(880, now + 8.5);
    whistle.frequency.exponentialRampToValueAtTime(1320, now + 13.0);

    whistleFilter.type = "bandpass";
    whistleFilter.frequency.setValueAtTime(200, now + 1.2);
    whistleFilter.frequency.exponentialRampToValueAtTime(460, now + 4.5);
    whistleFilter.frequency.exponentialRampToValueAtTime(920, now + 8.5);
    whistleFilter.frequency.exponentialRampToValueAtTime(1380, now + 13.0);
    whistleFilter.Q.setValueAtTime(3.8, now); // Tight resonant whistle

    whistleGain.gain.setValueAtTime(0.0001, now);
    whistleGain.gain.setValueAtTime(0.0001, now + 1.2);
    whistleGain.gain.linearRampToValueAtTime(0.10, now + 4.5);
    whistleGain.gain.linearRampToValueAtTime(0.18, now + 8.5);
    whistleGain.gain.linearRampToValueAtTime(0.20, now + 12.5);
    whistleGain.gain.exponentialRampToValueAtTime(0.0001, now + 14.8);

    whistle.connect(whistleFilter);
    whistleFilter.connect(whistleGain);
    whistleGain.connect(this.masterGain);
    whistle.start(now + 1.2);
    whistle.stop(now + 15.0);
    this.launchNodes.push(whistle, whistleFilter, whistleGain);

    // ── 4. Supersonic Exhaust Flame Roar & Flutter (0.0s - 16.0s) ──
    const noiseBuffer = this.getNoiseBuffer();
    if (noiseBuffer) {
      const noise = ctx.createBufferSource();
      const noiseGain = ctx.createGain();
      const noiseFilter = ctx.createBiquadFilter();

      // Flutter LFO to modulate exhaust amplitude organically (combustion instability)
      const flutter = ctx.createOscillator();
      const flutterGain = ctx.createGain();
      flutter.type = "sine";
      flutter.frequency.setValueAtTime(13.5, now);
      flutterGain.gain.setValueAtTime(0.04, now);

      noise.buffer = noiseBuffer;
      noise.loop = true;
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(360, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(1600, now + 3.8);
      noiseFilter.frequency.exponentialRampToValueAtTime(900, now + 8.0);
      noiseFilter.frequency.exponentialRampToValueAtTime(450, now + 14.0);
      noiseFilter.Q.setValueAtTime(1.1, now);

      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.linearRampToValueAtTime(0.24, now + 1.6);
      noiseGain.gain.linearRampToValueAtTime(0.20, now + 6.0);
      noiseGain.gain.linearRampToValueAtTime(0.09, now + 13.5);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 15.8);

      flutter.connect(flutterGain);
      flutterGain.connect(noiseGain.gain);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      noise.start(now);
      flutter.start(now);
      noise.stop(now + 16.0);
      flutter.stop(now + 16.0);
      this.launchNodes.push(noise, noiseFilter, noiseGain, flutter, flutterGain);
    }

    // ── 5. Stratospheric Celestial Pad Swell (5.0s - 15.2s) ──
    const choirA = ctx.createOscillator();
    const choirB = ctx.createOscillator();
    const choirGain = ctx.createGain();

    choirA.type = "sine";
    choirA.frequency.setValueAtTime(164.81, now); // E3
    choirB.type = "sine";
    choirB.frequency.setValueAtTime(329.63, now); // E4

    choirGain.gain.setValueAtTime(0.0001, now);
    choirGain.gain.setValueAtTime(0.0001, now + 5.0);
    choirGain.gain.linearRampToValueAtTime(0.07, now + 9.0);
    choirGain.gain.linearRampToValueAtTime(0.08, now + 12.5);
    choirGain.gain.exponentialRampToValueAtTime(0.0001, now + 15.2);

    choirA.connect(choirGain);
    choirB.connect(choirGain);
    choirGain.connect(this.masterGain);
    choirA.start(now + 5.0);
    choirB.start(now + 5.0);
    choirA.stop(now + 15.5);
    choirB.stop(now + 15.5);
    this.launchNodes.push(choirA, choirB, choirGain);

    // ── 6. Stage Separation & Apogee Bell (16.2s - 18.0s) ──
    const tSep = setTimeout(() => {
      if (!this.isMuted) {
        this.playStageSeparation();
      }
    }, 16200);
    this.launchTimers.push(tSep);

    // ── 7. Booster Retro-Burn Descent (18.6s - 24.6s) ──
    const tDescent = setTimeout(() => {
      if (!this.isMuted) {
        this.playBoosterDescent();
      }
    }, 18600);
    this.launchTimers.push(tDescent);

    // ── 8. Booster Touchdown on Launch Pad (24.6s) ──
    const tTouchdown = setTimeout(() => {
      if (!this.isMuted) {
        this.playBoosterTouchdown();
      }
    }, 24600);
    this.launchTimers.push(tTouchdown);

    // ── 9. Capsule RCS Alignment Puffs (26.2s & 27.4s) ──
    const tRcs1 = setTimeout(() => {
      if (!this.isMuted) this.playRcsBurst();
    }, 26200);
    const tRcs2 = setTimeout(() => {
      if (!this.isMuted) this.playRcsBurst();
    }, 27400);
    this.launchTimers.push(tRcs1, tRcs2);

    // ── 10. Golden Docking Lock (28.8s) ──
    const tDocking = setTimeout(() => {
      if (!this.isMuted) {
        this.playDockingLock();
      }
    }, 28800);
    this.launchTimers.push(tDocking);
  }

  /**
   * Stage separation: clean pneumatic detachment pop & celestial apogee chime.
   */
  public playStageSeparation() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Pneumatic separation pop & hiss
    const noiseBuffer = this.getNoiseBuffer();
    if (noiseBuffer) {
      const pop = ctx.createBufferSource();
      const popGain = ctx.createGain();
      const popFilter = ctx.createBiquadFilter();

      pop.buffer = noiseBuffer;
      popFilter.type = "bandpass";
      popFilter.frequency.setValueAtTime(750, now);
      popFilter.Q.setValueAtTime(2.0, now);

      popGain.gain.setValueAtTime(0.20, now);
      popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      pop.connect(popFilter);
      popFilter.connect(popGain);
      popGain.connect(this.masterGain);
      pop.start(now);
      pop.stop(now + 0.4);
      this.launchNodes.push(pop, popGain);
    }

    // Celestial Apogee Bells
    this.playBell({ freq: 784, gain: 0.14, decay: 3.5 });
    setTimeout(() => {
      if (!this.isMuted) {
        this.playBell({ freq: 1046.5, gain: 0.10, decay: 3.8 });
      }
    }, 120);
  }

  /**
   * Booster Retro-Burn Descent Sound:
   * Throttled deceleration thruster roar + reverse Doppler air resistance whoosh.
   */
  public playBoosterDescent() {
    const nowMs = Date.now();
    if (this.isMuted || nowMs - (this.lastReturnSoundTimes["descent"] || 0) < 4000) return;
    this.lastReturnSoundTimes["descent"] = nowMs;

    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Deceleration retro-burn: pulsed thruster rumble + descending air whoosh
    const retro = ctx.createOscillator();
    const retroGain = ctx.createGain();
    const retroFilter = ctx.createBiquadFilter();

    retro.type = "sawtooth";
    retro.frequency.setValueAtTime(65, now);
    retro.frequency.exponentialRampToValueAtTime(42, now + 5.5);

    retroFilter.type = "lowpass";
    retroFilter.frequency.setValueAtTime(320, now);
    retroFilter.frequency.exponentialRampToValueAtTime(160, now + 5.5);
    retroFilter.Q.setValueAtTime(2.5, now);

    retroGain.gain.setValueAtTime(0.0001, now);
    retroGain.gain.linearRampToValueAtTime(0.24, now + 1.0);
    retroGain.gain.linearRampToValueAtTime(0.20, now + 4.5);
    retroGain.gain.exponentialRampToValueAtTime(0.0001, now + 5.8);

    retro.connect(retroFilter);
    retroFilter.connect(retroGain);
    retroGain.connect(this.masterGain);
    retro.start(now);
    retro.stop(now + 6.0);
    this.launchNodes.push(retro, retroGain);

    // Retro exhaust noise with ground proximity cushion
    const noiseBuffer = this.getNoiseBuffer();
    if (noiseBuffer) {
      const noise = ctx.createBufferSource();
      const noiseGain = ctx.createGain();
      const noiseFilter = ctx.createBiquadFilter();

      noise.buffer = noiseBuffer;
      noise.loop = true;
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(450, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(820, now + 5.0); // Ground cushion hiss increases near pad
      noiseFilter.Q.setValueAtTime(1.0, now);

      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.linearRampToValueAtTime(0.12, now + 1.2);
      noiseGain.gain.linearRampToValueAtTime(0.16, now + 4.8);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 5.8);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noise.start(now);
      noise.stop(now + 6.0);
      this.launchNodes.push(noise, noiseGain);
    }
  }

  /**
   * Booster Pad Touchdown Sound:
   * Heavy mechanical pad contact impact + metallic leg ring + pneumatic damper release ("pssshhht!").
   */
  public playBoosterTouchdown() {
    const nowMs = Date.now();
    if (this.isMuted || nowMs - (this.lastReturnSoundTimes["touchdown"] || 0) < 4000) return;
    this.lastReturnSoundTimes["touchdown"] = nowMs;

    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // 1. Heavy pad contact thud (sub-bass impact)
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.type = "sine";
    thud.frequency.setValueAtTime(95, now);
    thud.frequency.exponentialRampToValueAtTime(28, now + 0.38);

    thudGain.gain.setValueAtTime(0.42, now);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    thud.connect(thudGain);
    thudGain.connect(this.masterGain);
    thud.start(now);
    thud.stop(now + 0.45);
    this.launchNodes.push(thud, thudGain);

    // 2. Metallic clamp ping / ring
    const clang = ctx.createOscillator();
    const clangGain = ctx.createGain();
    clang.type = "triangle";
    clang.frequency.setValueAtTime(480, now);
    clang.frequency.exponentialRampToValueAtTime(240, now + 0.18);

    clangGain.gain.setValueAtTime(0.12, now);
    clangGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    clang.connect(clangGain);
    clangGain.connect(this.masterGain);
    clang.start(now);
    clang.stop(now + 0.25);
    this.launchNodes.push(clang, clangGain);

    // 3. Pneumatic damper air-release hiss ("pssshhht")
    const noiseBuffer = this.getNoiseBuffer();
    if (noiseBuffer) {
      const hiss = ctx.createBufferSource();
      const hissGain = ctx.createGain();
      const hissFilter = ctx.createBiquadFilter();

      hiss.buffer = noiseBuffer;
      hissFilter.type = "bandpass";
      hissFilter.frequency.setValueAtTime(1400, now);
      hissFilter.frequency.exponentialRampToValueAtTime(600, now + 0.7);
      hissFilter.Q.setValueAtTime(1.8, now);

      hissGain.gain.setValueAtTime(0.24, now);
      hissGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

      hiss.connect(hissFilter);
      hissFilter.connect(hissGain);
      hissGain.connect(this.masterGain);
      hiss.start(now);
      hiss.stop(now + 0.8);
      this.launchNodes.push(hiss, hissGain);
    }
  }

  /**
   * Cold-gas RCS micro thruster alignment puff.
   */
  public playRcsBurst() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const noiseBuffer = this.getNoiseBuffer();
    if (noiseBuffer) {
      const puff = ctx.createBufferSource();
      const puffGain = ctx.createGain();
      const puffFilter = ctx.createBiquadFilter();

      puff.buffer = noiseBuffer;
      puffFilter.type = "highpass";
      puffFilter.frequency.setValueAtTime(2000, now);

      puffGain.gain.setValueAtTime(0.09, now);
      puffGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

      puff.connect(puffFilter);
      puffFilter.connect(puffGain);
      puffGain.connect(this.masterGain);
      puff.start(now);
      puff.stop(now + 0.1);
      this.launchNodes.push(puff, puffGain);
    }
  }

  /**
   * Golden Docking Lock Sound:
   * Tactile magnetic latch engagement + warm celestial triad confirmation chord.
   */
  public playDockingLock() {
    const nowMs = Date.now();
    if (this.isMuted || nowMs - (this.lastReturnSoundTimes["docking"] || 0) < 4000) return;
    this.lastReturnSoundTimes["docking"] = nowMs;

    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // 1. Mechanical docking clamp click-clack
    const clickA = ctx.createOscillator();
    const clickGainA = ctx.createGain();
    clickA.type = "triangle";
    clickA.frequency.setValueAtTime(740, now);
    clickA.frequency.exponentialRampToValueAtTime(220, now + 0.05);
    clickGainA.gain.setValueAtTime(0.18, now);
    clickGainA.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    clickA.connect(clickGainA);
    clickGainA.connect(this.masterGain);
    clickA.start(now);
    clickA.stop(now + 0.07);

    const clickB = ctx.createOscillator();
    const clickGainB = ctx.createGain();
    clickB.type = "triangle";
    clickB.frequency.setValueAtTime(980, now + 0.04);
    clickB.frequency.exponentialRampToValueAtTime(320, now + 0.10);
    clickGainB.gain.setValueAtTime(0.0001, now);
    clickGainB.gain.setValueAtTime(0.22, now + 0.04);
    clickGainB.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    clickB.connect(clickGainB);
    clickGainB.connect(this.masterGain);
    clickB.start(now + 0.04);
    clickB.stop(now + 0.14);

    this.launchNodes.push(clickA, clickGainA, clickB, clickGainB);

    // 2. Warm golden harmony confirmation chord (reunion of rocket & capsule)
    const chord = [523.25, 659.25, 783.99]; // C5, E5, G5
    chord.forEach((freq, i) => {
      setTimeout(() => {
        if (!this.isMuted) {
          this.playBell({ freq, gain: 0.09 - i * 0.015, decay: 2.2, type: "sine" });
        }
      }, 70 + i * 45);
    });
  }

  /**
   * Shahed-136 Drone Rail Launch Sound:
   * JATO booster ignition burst + rapid 2-stroke buzzing propeller acceleration (MD-550 lawnmower buzz).
   */
  public playDroneLaunch() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // 1. JATO Rocket Booster Flash / Puff (white noise burst)
    const noiseBuffer = this.getNoiseBuffer();
    if (noiseBuffer) {
      const puff = ctx.createBufferSource();
      const puffGain = ctx.createGain();
      const puffFilter = ctx.createBiquadFilter();

      puff.buffer = noiseBuffer;
      puffFilter.type = "bandpass";
      puffFilter.frequency.setValueAtTime(600, now);
      puffFilter.frequency.exponentialRampToValueAtTime(1400, now + 0.25);
      puffFilter.Q.setValueAtTime(1.5, now);

      puffGain.gain.setValueAtTime(0.35, now);
      puffGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

      puff.connect(puffFilter);
      puffFilter.connect(puffGain);
      puffGain.connect(this.masterGain);
      puff.start(now);
      puff.stop(now + 0.6);
      this.launchNodes.push(puff, puffGain);
    }

    // 2. High-speed 2-stroke piston propeller buzz (distinct Shahed engine sound)
    const buzz = ctx.createOscillator();
    const buzzGain = ctx.createGain();
    buzz.type = "sawtooth";
    buzz.frequency.setValueAtTime(120, now);
    buzz.frequency.exponentialRampToValueAtTime(260, now + 0.4);
    buzz.frequency.exponentialRampToValueAtTime(340, now + 1.8);

    buzzGain.gain.setValueAtTime(0.001, now);
    buzzGain.gain.linearRampToValueAtTime(0.18, now + 0.12);
    buzzGain.gain.linearRampToValueAtTime(0.15, now + 0.8);
    buzzGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

    // Filter to give that metallic raspy engine quality
    const buzzFilter = ctx.createBiquadFilter();
    buzzFilter.type = "lowpass";
    buzzFilter.frequency.setValueAtTime(1200, now);
    buzzFilter.frequency.exponentialRampToValueAtTime(2800, now + 1.2);

    buzz.connect(buzzFilter);
    buzzFilter.connect(buzzGain);
    buzzGain.connect(this.masterGain);
    buzz.start(now);
    buzz.stop(now + 2.3);
    this.launchNodes.push(buzz, buzzGain);
  }

  /**
   * Shahed-136 Kamikaze Detonation Sound:
   * Dive whine + massive sub-bass shockwave + explosive fireball crackle + celestial martyr resonance.
   */
  public playDroneKamikazeExplosion() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // 1. Massive Sub-bass shockwave impact
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(145, now);
    sub.frequency.exponentialRampToValueAtTime(24, now + 0.85);

    subGain.gain.setValueAtTime(0.65, now);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 1.3);
    this.launchNodes.push(sub, subGain);

    // 2. High-energy explosion fireball blast
    const noiseBuffer = this.getNoiseBuffer();
    if (noiseBuffer) {
      const blast = ctx.createBufferSource();
      const blastGain = ctx.createGain();
      const blastFilter = ctx.createBiquadFilter();

      blast.buffer = noiseBuffer;
      blastFilter.type = "lowpass";
      blastFilter.frequency.setValueAtTime(1200, now);
      blastFilter.frequency.exponentialRampToValueAtTime(180, now + 1.5);
      blastFilter.Q.setValueAtTime(2.2, now);

      blastGain.gain.setValueAtTime(0.48, now);
      blastGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

      blast.connect(blastFilter);
      blastFilter.connect(blastGain);
      blastGain.connect(this.masterGain);
      blast.start(now);
      blast.stop(now + 1.7);
      this.launchNodes.push(blast, blastGain);

      // 3. Crackling hot shrapnel & debris fallout
      const crackle = ctx.createBufferSource();
      const crackleGain = ctx.createGain();
      const crackleFilter = ctx.createBiquadFilter();

      crackle.buffer = noiseBuffer;
      crackleFilter.type = "highpass";
      crackleFilter.frequency.setValueAtTime(2200, now);

      crackleGain.gain.setValueAtTime(0.001, now);
      crackleGain.gain.linearRampToValueAtTime(0.16, now + 0.1);
      crackleGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

      crackle.connect(crackleFilter);
      crackleFilter.connect(crackleGain);
      crackleGain.connect(this.masterGain);
      crackle.start(now);
      crackle.stop(now + 1.9);
      this.launchNodes.push(crackle, crackleGain);
    }

    // 4. Sacred celestial golden harmonic ring (martyr's memory light)
    [528, 660, 792].forEach((freq, i) => {
      setTimeout(() => {
        if (!this.isMuted) {
          this.playBell({ freq, gain: 0.12 - i * 0.025, decay: 3.2, type: "sine" });
        }
      }, 180 + i * 80);
    });
  }

  /**
   * Deep, slow ambient drone — the hum of the night sky.
   */
  private startAmbient() {
    if (!this.ctx || !this.masterGain || this.ambientNodes.length > 0) return;
    try {
      const now = this.ctx.currentTime;
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.0001, now);
      this.ambientGain.gain.linearRampToValueAtTime(0.045, now + 4.0);
      this.ambientGain.connect(this.masterGain);

      // Two detuned low drones (beating interference — organic)
      const freqs = [108, 108.7, 162];
      freqs.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);
        osc.connect(this.ambientGain!);
        osc.start(now);
        this.ambientNodes.push(osc);

        // Slow amplitude LFO per voice — breathing sky
        const lfo = this.ctx!.createOscillator();
        const lfoGain = this.ctx!.createGain();
        lfo.type = "sine";
        lfo.frequency.setValueAtTime(0.05 + i * 0.023, now);
        lfoGain.gain.setValueAtTime(freq === 162 ? 0.004 : 0.008, now);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start(now);
        this.ambientNodes.push(lfo);
      });
    } catch {}
  }

  private stopAmbient() {
    if (this.ambientNodes.length > 0 && this.ambientGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.ambientGain.gain.linearRampToValueAtTime(0.0001, now + 1.2);
        const nodes = this.ambientNodes;
        setTimeout(() => {
          nodes.forEach((n) => {
            try {
              n.stop();
              n.disconnect();
            } catch {}
          });
        }, 1400);
      } catch {}
    }
    this.ambientNodes = [];
    this.ambientGain = null;
  }
}

export const soundEngine = new ProceduralAudioEngine();
