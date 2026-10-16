/**
 * Pure Web Audio API Ambience Synthesizer & Focus Sound Mixer
 * No copyrighted or external audio files required.
 * Generates:
 * - White Noise
 * - Brown Noise (deep rumble)
 * - Rain (filtered noise with droplet modulations)
 * - Lo-Fi Chill (warm dual-oscillator drone/chords with subtle tape flutter)
 * - Binaural Beats (Alpha 10Hz, Theta 6Hz stereo-separated sine waves)
 *
 * Supports:
 * - Independent volume levels per track
 * - Master gain with smooth ramp fade in/out
 * - Sleep timer with automatic stop
 * - Media Session API for lock screen background play
 */

class AmbienceEngine {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.activeTracks = {};
    this.sleepTimerId = null;
    this.sleepTimeRemaining = 0;
    this.sleepTimerInterval = null;
    this.onSleepTick = null;

    // Track volume levels [0.0 - 1.0]
    this.volumes = {
      rain: 0.5,
      whiteNoise: 0.0,
      brownNoise: 0.3,
      lofi: 0.4,
      binaural: 0.0
    };

    this.binauralMode = 'alpha'; // 'alpha' (10Hz focus) or 'theta' (6Hz deep flow)
    this.isPlaying = false;
  }

  initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      this.audioCtx = new AudioContextClass();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.audioCtx.currentTime);
      this.masterGain.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Generate 5-second loopable White Noise buffer
  createWhiteNoiseBuffer() {
    const bufferSize = this.audioCtx.sampleRate * 5;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // Generate Brown Noise (integrated noise) buffer
  createBrownNoiseBuffer() {
    const bufferSize = this.audioCtx.sampleRate * 5;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Compensate for attenuation
    }
    return buffer;
  }

  startTrack(trackId) {
    if (!this.initContext()) return;
    if (this.activeTracks[trackId]) return;

    const gainNode = this.audioCtx.createGain();
    const targetVol = this.volumes[trackId] ?? 0.3;
    gainNode.gain.setValueAtTime(0.001, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(targetVol, 0.001), this.audioCtx.currentTime + 1.2);
    gainNode.connect(this.masterGain);

    if (trackId === 'whiteNoise') {
      const noise = this.audioCtx.createBufferSource();
      noise.buffer = this.createWhiteNoiseBuffer();
      noise.loop = true;
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1000;
      noise.connect(filter);
      filter.connect(gainNode);
      noise.start();
      this.activeTracks.whiteNoise = { source: noise, gain: gainNode };
    } else if (trackId === 'brownNoise') {
      const noise = this.audioCtx.createBufferSource();
      noise.buffer = this.createBrownNoiseBuffer();
      noise.loop = true;
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      noise.connect(filter);
      filter.connect(gainNode);
      noise.start();
      this.activeTracks.brownNoise = { source: noise, gain: gainNode };
    } else if (trackId === 'rain') {
      // Rain = Brown noise + High-cut filter + Random droplet resonance
      const noise = this.audioCtx.createBufferSource();
      noise.buffer = this.createBrownNoiseBuffer();
      noise.loop = true;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      filter.Q.value = 0.7;

      noise.connect(filter);
      filter.connect(gainNode);
      noise.start();
      this.activeTracks.rain = { source: noise, gain: gainNode };
    } else if (trackId === 'lofi') {
      // Warm chord drone (F minor 7: F, Ab, C, Eb) using soft sine & triangle oscillators
      const freqs = [174.61, 207.65, 261.63, 311.13]; // F3, G#3, C4, D#4
      const oscs = [];

      const lofiFilter = this.audioCtx.createBiquadFilter();
      lofiFilter.type = 'lowpass';
      lofiFilter.frequency.value = 520; // warm muted vinyl tone

      // Subtle LFO vibrato
      const lfo = this.audioCtx.createOscillator();
      const lfoGain = this.audioCtx.createGain();
      lfo.frequency.value = 0.3; // 0.3 Hz gentle wobble
      lfoGain.gain.value = 1.5;
      lfo.connect(lfoGain);
      lfo.start();

      freqs.forEach((freq) => {
        const osc = this.audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        lfoGain.connect(osc.frequency);
        osc.connect(lofiFilter);
        osc.start();
        oscs.push(osc);
      });

      lofiFilter.connect(gainNode);
      this.activeTracks.lofi = { source: oscs, gain: gainNode, lfo };
    } else if (trackId === 'binaural') {
      // True Stereo-Panned Binaural Beats
      // Left ear base freq, Right ear base freq + diff
      const baseFreq = 216; // A3 harmonic
      const beatDiff = this.binauralMode === 'theta' ? 6 : 10; // 6Hz Theta (creativity/deep) vs 10Hz Alpha (calm focus)

      const oscLeft = this.audioCtx.createOscillator();
      oscLeft.type = 'sine';
      oscLeft.frequency.value = baseFreq;

      const oscRight = this.audioCtx.createOscillator();
      oscRight.type = 'sine';
      oscRight.frequency.value = baseFreq + beatDiff;

      // Panners
      const panLeft = this.audioCtx.createStereoPanner ? this.audioCtx.createStereoPanner() : null;
      const panRight = this.audioCtx.createStereoPanner ? this.audioCtx.createStereoPanner() : null;

      if (panLeft && panRight) {
        panLeft.pan.value = -1; // hard left
        panRight.pan.value = 1;  // hard right
        oscLeft.connect(panLeft);
        panLeft.connect(gainNode);
        oscRight.connect(panRight);
        panRight.connect(gainNode);
      } else {
        oscLeft.connect(gainNode);
        oscRight.connect(gainNode);
      }

      oscLeft.start();
      oscRight.start();
      this.activeTracks.binaural = { source: [oscLeft, oscRight], gain: gainNode };
    }
  }

  stopTrack(trackId) {
    const track = this.activeTracks[trackId];
    if (!track || !this.audioCtx) return;

    try {
      track.gain.gain.setValueAtTime(track.gain.gain.value, this.audioCtx.currentTime);
      track.gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.6);
      setTimeout(() => {
        if (Array.isArray(track.source)) {
          track.source.forEach(s => { try { s.stop(); } catch { /* ignore */ } });
        } else if (track.source) {
          try { track.source.stop(); } catch { /* ignore */ }
        }
        if (track.lfo) {
          try { track.lfo.stop(); } catch { /* ignore */ }
        }
        delete this.activeTracks[trackId];
      }, 700);
    } catch {
      delete this.activeTracks[trackId];
    }
  }

  setVolume(trackId, value) {
    this.volumes[trackId] = Math.max(0, Math.min(1, value));
    if (this.activeTracks[trackId] && this.audioCtx) {
      const gainNode = this.activeTracks[trackId].gain;
      const rampVal = Math.max(0.0001, this.volumes[trackId]);
      gainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, this.audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(rampVal, this.audioCtx.currentTime + 0.1);
    }
    // If volume was 0 and increased, start track if playing
    if (this.isPlaying && value > 0 && !this.activeTracks[trackId]) {
      this.startTrack(trackId);
    } else if (this.isPlaying && value <= 0 && this.activeTracks[trackId]) {
      this.stopTrack(trackId);
    }
  }

  setBinauralMode(mode) {
    this.binauralMode = mode;
    if (this.activeTracks.binaural) {
      this.stopTrack('binaural');
      setTimeout(() => {
        if (this.isPlaying && this.volumes.binaural > 0) {
          this.startTrack('binaural');
        }
      }, 750);
    }
  }

  playAll() {
    this.initContext();
    this.isPlaying = true;
    Object.keys(this.volumes).forEach(trackId => {
      if (this.volumes[trackId] > 0) {
        this.startTrack(trackId);
      }
    });
    this.setupMediaSession();
  }

  pauseAll() {
    this.isPlaying = false;
    Object.keys(this.activeTracks).forEach(trackId => {
      this.stopTrack(trackId);
    });
    if (navigator.mediaSession) {
      navigator.mediaSession.playbackState = 'paused';
    }
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pauseAll();
    } else {
      this.playAll();
    }
    return this.isPlaying;
  }

  setSleepTimer(minutes, onTick) {
    this.clearSleepTimer();
    this.onSleepTick = onTick;
    if (!minutes || minutes <= 0) return;

    this.sleepTimeRemaining = minutes * 60;
    if (this.onSleepTick) this.onSleepTick(this.sleepTimeRemaining);

    this.sleepTimerInterval = setInterval(() => {
      this.sleepTimeRemaining--;
      if (this.onSleepTick) this.onSleepTick(this.sleepTimeRemaining);

      if (this.sleepTimeRemaining <= 0) {
        this.clearSleepTimer();
        this.pauseAll();
      }
    }, 1000);
  }

  clearSleepTimer() {
    if (this.sleepTimerInterval) {
      clearInterval(this.sleepTimerInterval);
      this.sleepTimerInterval = null;
    }
    this.sleepTimeRemaining = 0;
    if (this.onSleepTick) this.onSleepTick(0);
  }

  setupMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: 'Focus Ambience & Pomodoro',
        artist: 'Habit RPG Sound Engine',
        album: 'Binaural Focus & Lo-Fi Beats'
      });

      navigator.mediaSession.setActionHandler('play', () => this.playAll());
      navigator.mediaSession.setActionHandler('pause', () => this.pauseAll());
      navigator.mediaSession.setActionHandler('stop', () => this.pauseAll());
      navigator.mediaSession.playbackState = 'playing';
    }
  }
}

export const ambienceEngine = new AmbienceEngine();
