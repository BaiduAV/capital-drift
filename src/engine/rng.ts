// ── Deterministic Seeded RNG (mulberry32) ──

export interface RNG {
  next(): number;        // [0, 1)
  nextGaussian(): number; // Normal(0,1) via Box-Muller
  state(): number;
  fork(namespace: string): RNG; // Spawn a child RNG deterministically
}

// Simple deterministic hash for strings (MurmurHash3 32-bit simplified)
function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h;
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

  function fork(namespace: string): RNG {
    // Combine current state with namespace hash to seed the child
    const childSeed = (s ^ hashString(namespace)) >>> 0;
    return createRNG(childSeed);
  }

  return {
    next,
    nextGaussian,
    state: () => s,
    fork,
  };
}
