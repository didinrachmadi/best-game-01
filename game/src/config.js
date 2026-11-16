// Every tuning number, colour and content table for Emberfall lives here, so the
// sim modules read data and never hard-code a balance value. The game runs on a
// fixed 1/60 s step in a fixed logical field of 1280x720, scaled to the window.

/** Fixed simulation step, in seconds. */
export const STEP = 1 / 60;
/** Logical playfield, in CSS pixels; the renderer letterboxes it to the window. */
export const FIELD = { width: 1280, height: 720 };
/** Survive this many seconds and dawn breaks: the win. */
export const DAWN_SECONDS = 300;
/** localStorage key for the best run. */
export const BEST_KEY = 'emberfall-best-v1';

/** Coherent night palette: deep indigo dark, ember orange light, gold and teal accents. */
export const PALETTE = {
  skyTop: '#070a18',
  skyBottom: '#131029',
  ground: '#0d0b1e',
  groundLine: 'rgba(120, 110, 200, 0.10)',
  fog: 'rgba(90, 80, 160, 0.10)',
  ember: '#ff9a3c',
  emberBright: '#ffd166',
  emberDeep: '#e85d3d',
  teal: '#4ecdc4',
  violet: '#a78bfa',
  bone: '#f4ead8',
  dim: '#9b93c4',
  danger: '#ff5d5d',
  heal: '#7be495',
  panel: 'rgba(10, 8, 26, 0.88)',
  panelEdge: 'rgba(255, 154, 60, 0.55)',
};

/** The Lantern Keeper. */
export const PLAYER = {
  radius: 14,
  speed: 238,
  maxHp: 100,
  /** Dash: distance covered during dashTime, then dashCooldown before the next. */
  dashDistance: 255,
  dashTime: 0.16,
  dashCooldown: 2.1,
  /** Brief invulnerability after any hit, so one touch is never a chain of hits. */
  invulnTime: 0.7,
  /** How close an ember must be before it flies to the player. */
  magnet: 95,
};

/** The lantern bolt: the starting weapon, auto-fired at the nearest foe. */
export const BOLT = {
  damage: 12,
  interval: 0.55,
  range: 560,
  speed: 660,
  radius: 5,
};

/** Orbiting flames, gained as an upgrade. */
export const ORBS = {
  damage: 14,
  radius: 10,
  orbitRadius: 74,
  angularSpeed: 2.6,
  /** Per-enemy cooldown between orb hits, in seconds. */
  hitCooldown: 0.45,
};

/** Nova burst, gained as an upgrade: a periodic ring of fire around the player. */
export const NOVA = {
  damage: 26,
  interval: 4.5,
  radius: 170,
  ringTime: 0.45,
};

/** XP embers needed to rise from `level` to `level + 1`. */
export function xpForLevel(level) {
  return 5 + (level - 1) * 4;
}

/** Shadow creatures. Each kind has its own shape, speed and habit. */
export const ENEMY_KINDS = {
  wisp: {
    name: 'Wisp',
    hp: 18, speed: 88, damage: 8, radius: 13, xp: 1, score: 10,
    body: '#3b2d5e', rim: '#6d5aa8', glow: '#a78bfa', eye: '#efe6ff',
    unlockAt: 0, weight: 10,
  },
  skitter: {
    name: 'Skitter',
    hp: 12, speed: 152, damage: 6, radius: 10, xp: 1, score: 15,
    body: '#243d33', rim: '#3f7d5c', glow: '#7be495', eye: '#d9ffe6',
    unlockAt: 40, weight: 7,
  },
  spitter: {
    name: 'Spitter',
    hp: 24, speed: 72, damage: 6, radius: 13, xp: 2, score: 20,
    body: '#1d3a44', rim: '#2f7d8c', glow: '#4ecdc4', eye: '#d8fbff',
    unlockAt: 90, weight: 5,
    ranged: true, shotInterval: 2.4, shotSpeed: 230, preferredRange: 280,
  },
  bulwark: {
    name: 'Bulwark',
    hp: 78, speed: 54, damage: 16, radius: 23, xp: 4, score: 40,
    body: '#4a2430', rim: '#8c3a4a', glow: '#ff7a6e', eye: '#ffe1d6',
    unlockAt: 130, weight: 4,
  },
  wraith: {
    name: 'Wraith',
    hp: 32, speed: 108, damage: 12, radius: 12, xp: 3, score: 30,
    body: '#2a2a4e', rim: '#5a5ab8', glow: '#c7d2fe', eye: '#ffffff',
    unlockAt: 180, weight: 5,
    lunges: true, lungeTelegraph: 0.5, lungeSpeed: 420, lungeCooldown: 2.2,
  },
};

/** Elites: bigger, tougher, worth more, and they drop a heart. */
export const ELITE = { hpMul: 6, speedMul: 0.85, radiusMul: 1.45, xpMul: 8, scoreMul: 5 };
/** An elite arrives every ELITE_EVERY seconds, starting at the first minute. */
export const ELITE_EVERY = 60;

/** The spawn director: pressure grows with time, never all at once. */
export const DIRECTOR = {
  /** Seconds between spawn ticks at t=0 and at the fastest. */
  intervalStart: 1.35,
  intervalEnd: 0.42,
  /** How many creatures a tick spawns, growing with time. */
  batchStart: 1,
  batchEvery: 75,
  batchMax: 4,
  /** Enemy health multiplier grows linearly with time. */
  hpGrowthPerSecond: 1 / 150,
  /** Enemy speed multiplier, capped. */
  speedGrowthPerSecond: 1 / 1400,
  speedGrowthMax: 0.28,
};

/** Score values. */
export const SCORE = {
  kill: 10,
  ember: 5,
  second: 2,
  level: 50,
  winBonus: 1000,
};
