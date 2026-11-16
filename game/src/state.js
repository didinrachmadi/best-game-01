// The single game state store. Everything the sim touches lives in one object
// created here, so a run can be reset by rebuilding it and the renderer never
// keeps its own copy of the truth.

import { ELITE_EVERY, FIELD, PLAYER, xpForLevel } from './config.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_LEVELUP = 'levelup';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function freshPlayer() {
  return {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    vx: 0,
    vy: 0,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    level: 1,
    xp: 0,
    xpNext: xpForLevel(1),
    radius: PLAYER.radius,
    facingX: 1,
    facingY: 0,
    dashT: 0,
    dashCd: 0,
    dashDx: 1,
    dashDy: 0,
    invulnT: 0,
    walkT: 0,
    dead: false,
  };
}

function freshMods() {
  return {
    damage: 1,
    fireRate: 1,
    moveSpeed: 1,
    magnet: PLAYER.magnet,
    pierce: 0,
    orbCount: 0,
    novaLevel: 0,
    thorns: 0,
    dashCdMul: 1,
  };
}

/** Build a brand-new run state from a seed. */
export function createGame(seed) {
  const state = {
    seed,
    rng: createRandom(seed),
    time: 0,
    screen: SCREEN_TITLE,
    player: freshPlayer(),
    mods: freshMods(),
    /** Upgrade id -> times taken, for card levels and availability. */
    upgrades: {},
    weapons: { boltT: 0.25, novaT: 2, orbAngle: 0 },
    enemies: [],
    shots: [],
    globs: [],
    gems: [],
    hearts: [],
    particles: [],
    floats: [],
    novaRings: [],
    kills: 0,
    embers: 0,
    score: 0,
    director: { spawnT: 1.2, nextEliteAt: ELITE_EVERY, minute: 0 },
    ui: { banner: '', bannerT: 0, shake: 0, hitStop: 0, levelChoices: [] },
    stats: { shotsFired: 0, damageDealt: 0 },
    over: false,
    won: false,
  };
  return state;
}

/** Reset an existing state in place so a restart reuses the same arrays. */
export function resetGame(state, seed) {
  state.seed = seed;
  state.rng = createRandom(seed);
  state.time = 0;
  state.screen = SCREEN_PLAY;
  state.player = freshPlayer();
  state.mods = freshMods();
  state.upgrades = {};
  state.weapons.boltT = 0.25;
  state.weapons.novaT = 2;
  state.weapons.orbAngle = 0;
  state.enemies.length = 0;
  state.shots.length = 0;
  state.globs.length = 0;
  state.gems.length = 0;
  state.hearts.length = 0;
  state.particles.length = 0;
  state.floats.length = 0;
  state.novaRings.length = 0;
  state.kills = 0;
  state.embers = 0;
  state.score = 0;
  state.director.spawnT = 1.2;
  state.director.nextEliteAt = ELITE_EVERY;
  state.director.minute = 0;
  state.ui.banner = '';
  state.ui.bannerT = 0;
  state.ui.shake = 0;
  state.ui.hitStop = 0;
  state.ui.levelChoices = [];
  state.stats.shotsFired = 0;
  state.stats.damageDealt = 0;
  state.over = false;
  state.won = false;
}
