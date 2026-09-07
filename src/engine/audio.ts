// ── Subtle regime-change sound effects using Web Audio API ──

import type { RegimeId } from './types';

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

type ToneConfig = { freq: number; freq2: number; type: OscillatorType; duration: number; gain: number };

const REGIME_TONES: Record<RegimeId, ToneConfig> = {
  CALM:             { freq: 523, freq2: 659, type: 'sine',     duration: 0.25, gain: 0.08 },
  BULL:             { freq: 440, freq2: 660, type: 'sine',     duration: 0.3,  gain: 0.10 },
  BEAR:             { freq: 330, freq2: 260, type: 'triangle', duration: 0.35, gain: 0.10 },
  CRISIS:           { freq: 220, freq2: 180, type: 'sawtooth', duration: 0.4,  gain: 0.07 },
  CRYPTO_EUPHORIA:  { freq: 587, freq2: 880, type: 'sine',     duration: 0.3,  gain: 0.10 },
};

export function playRegimeSound(regime: RegimeId) {
  try {
    const ctx = getCtx();
    const { freq, freq2, type, duration, gain } = REGIME_TONES[regime];
    const now = ctx.currentTime;

    // Two-note chime
    for (const [f, offset] of [[freq, 0], [freq2, duration * 0.4]] as [number, number][]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f, now + offset);
      g.gain.setValueAtTime(gain, now + offset);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + duration * 0.6);
      osc.connect(g).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + duration * 0.7);
    }
  } catch {
    // Audio not available — silently ignore
  }
}
