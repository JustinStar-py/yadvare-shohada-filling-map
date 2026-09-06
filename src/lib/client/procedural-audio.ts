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
  private musicVolume: number = 0.10; // 10% volume per specification

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
      if (!this.isMuted) {
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
    if (!this.isMuted) {
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
          console.log("Playground background music playing at 10% volume");
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
    if (this.isMuted || typeof window === "undefined") return;
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
   * Resonant launch crescendo: sub rumble + rising sweep + exhaust hiss.
   */
  public playLaunchAscent() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // 1. Sub rumble — felt more than heard
    // 1. Sub rumble — felt more than heard, sustains through the 15-second ascent
    const rumble = ctx.createOscillator();
    const rumbleGain = ctx.createGain();
    const rumbleFilter = ctx.createBiquadFilter();
    rumble.type = "sawtooth";
    rumble.frequency.setValueAtTime(48, now);
    rumble.frequency.exponentialRampToValueAtTime(110, now + 4.2);
    rumble.frequency.exponentialRampToValueAtTime(64, now + 14.0);
    rumbleFilter.type = "lowpass";
    rumbleFilter.frequency.setValueAtTime(140, now);
    rumbleFilter.frequency.exponentialRampToValueAtTime(420, now + 4.0);
    rumbleFilter.frequency.exponentialRampToValueAtTime(380, now + 3.5);
    rumbleFilter.frequency.exponentialRampToValueAtTime(180, now + 14.0);

    rumbleGain.gain.setValueAtTime(0.0001, now);
    rumbleGain.gain.linearRampToValueAtTime(0.3, now + 1.8);
    rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + 5.4);
    rumbleGain.gain.linearRampToValueAtTime(0.28, now + 1.8);
    rumbleGain.gain.linearRampToValueAtTime(0.08, now + 5.0);
    rumbleGain.gain.linearRampToValueAtTime(0.06, now + 14.0);
    rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + 16.0);

    rumble.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(this.masterGain);
    rumble.start(now);
    rumble.stop(now + 5.6);
    rumble.stop(now + 16.2);

    // 2. Rising celestial sweep
    const riser = ctx.createOscillator();
    const riserGain = ctx.createGain();
    riser.type = "sine";
    riser.frequency.setValueAtTime(220, now);
    riser.frequency.exponentialRampToValueAtTime(880, now + 3.8);
    riser.frequency.exponentialRampToValueAtTime(660, now + 4.0);

    riserGain.gain.setValueAtTime(0.0001, now);
    riserGain.gain.linearRampToValueAtTime(0.07, now + 2.6);
    riserGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.8);
    riserGain.gain.linearRampToValueAtTime(0.06, now + 2.5);
    riserGain.gain.exponentialRampToValueAtTime(0.0001, now + 6.0);

    riser.connect(riserGain);
    riserGain.connect(this.masterGain);
    riser.start(now);
    riser.stop(now + 5.0);
    riser.stop(now + 6.2);

    // 3. Exhaust hiss — filtered noise burst
    // 3. Exhaust hiss — filtered noise burst sustaining into thin air
    const noiseBuffer = this.getNoiseBuffer();
    if (noiseBuffer) {
      const noise = ctx.createBufferSource();
      const noiseGain = ctx.createGain();
      const noiseFilter = ctx.createBiquadFilter();
      noise.buffer = noiseBuffer;
      noise.loop = true;
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(400, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(1800, now + 3.5);
      noiseFilter.frequency.exponentialRampToValueAtTime(1600, now + 3.0);
      noiseFilter.frequency.exponentialRampToValueAtTime(600, now + 14.0);
      noiseFilter.Q.setValueAtTime(0.6, now);

      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.linearRampToValueAtTime(0.1, now + 1.2);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 5.2);
      noiseGain.gain.linearRampToValueAtTime(0.09, now + 1.2);
      noiseGain.gain.linearRampToValueAtTime(0.035, now + 4.5);
      noiseGain.gain.linearRampToValueAtTime(0.025, now + 13.5);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 15.5);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noise.start(now);
      noise.stop(now + 5.4);
      noise.stop(now + 15.8);
    }

    // 4. Celestial bell as the rocket reaches apogee
    setTimeout(() => {
      if (!this.isMuted) {
        this.playBell({ freq: 648, gain: 0.12, decay: 3.2 });
      }
    }, 14500);
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
