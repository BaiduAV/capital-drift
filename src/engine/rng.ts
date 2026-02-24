// ── Deterministic Seeded RNG (mulberry32) ──

export interface RNG {
  next(): number;        // [0, 1)
  nextGaussian(): number; // Normal(0,1) via Box-Muller
  state(): number;
}

export function createRNG(seed: number): RNG {
  let s = seed | 0;

  function next(): number {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  let hasSpare = false;
  let spare = 0;

  function nextGaussian(): number {
    if (hasSpare) {
      hasSpare = false;
      return spare;
    }
    let u: number, v: number, s2: number;
    do {
      u = next() * 2 - 1;
      v = next() * 2 - 1;
      s2 = u * u + v * v;
    } while (s2 >= 1 || s2 === 0);
    const mul = Math.sqrt(-2.0 * Math.log(s2) / s2);
    spare = v * mul;
    hasSpare = true;
    return u * mul;
  }

  return {
    next,
    nextGaussian,
    state: () => s,
  };
}
