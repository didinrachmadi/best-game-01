// A small seeded generator (mulberry32). Every roll in the game comes from one of
// these, never from Math.random, so a seeded run — a screenshot scene, a replay —
// always plays out the same way.

/**
 * Create a generator from a 32-bit seed. The same seed always gives the same stream.
 */
export function createRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  return {
    /** Next value in [0, 1). */
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    /** Next value in [min, max). */
    range(min, max) {
      return min + this.next() * (max - min);
    },
    /** Next integer in [min, max] inclusive. */
    int(min, max) {
      return Math.floor(this.range(min, max + 1));
    },
    /** True with probability p (0..1). */
    chance(p) {
      return this.next() < p;
    },
    /** One element of a non-empty array, uniformly. */
    pick(items) {
      return items[Math.floor(this.next() * items.length)];
    },
  };
}
