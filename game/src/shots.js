// Deterministic screenshot scenes, staged from ?shot=<scene>&seed=<n> so the
// entry's screenshots show the game at its best without playing for minutes.
// The scenes are honest stills of real game states: same code, same rendering,
// just a staged clock and a staged run. Nothing here runs in normal play.

import { DAWN_SECONDS, xpForLevel } from './config.js';
import { SCREEN_LEVELUP, SCREEN_OVER, SCREEN_PLAY, SCREEN_WIN } from './state.js';
import { spawnEnemy } from './enemies.js';
import { rollChoices } from './upgrades.js';
import { burst, ring } from './particles.js';

function ringOf(state, kind, count, minR, maxR, elite = false) {
  const player = state.player;
  for (let i = 0; i < count; i += 1) {
    const angle = state.rng.range(0, Math.PI * 2);
    const radius = state.rng.range(minR, maxR);
    spawnEnemy(
      state,
      kind,
      Math.max(30, Math.min(1250, player.x + Math.cos(angle) * radius)),
      Math.max(30, Math.min(690, player.y + Math.sin(angle) * radius)),
      elite,
    );
  }
}

function scatterGems(state, count) {
  const player = state.player;
  for (let i = 0; i < count; i += 1) {
    const angle = state.rng.range(0, Math.PI * 2);
    const radius = state.rng.range(40, 260);
    state.gems.push({
      x: player.x + Math.cos(angle) * radius,
      y: player.y + Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
      value: 1,
      t: state.rng.range(0, Math.PI * 2),
    });
  }
}

function stageRun(state, { time, level, hp, maxHp, kills, embers, score, mods, upgrades, xp = null }) {
  state.time = time;
  state.player.level = level;
  // Live scenes keep their XP low so the run does not level up mid-screenshot.
  state.player.xp = xp === null ? Math.floor(xpForLevel(level) * 0.6) : xp;
  state.player.xpNext = xpForLevel(level);
  state.player.maxHp = maxHp;
  state.player.hp = hp;
  state.kills = kills;
  state.embers = embers;
  state.score = score;
  Object.assign(state.mods, mods);
  state.upgrades = { ...upgrades };
  state.weapons.boltT = 0.02;
  state.weapons.novaT = 1.4;
  state.director.minute = Math.floor(time / 60);
  state.director.nextEliteAt = 60 * (Math.floor(time / 60) + 1);
}

export function applyShotScene(state, params) {
  const scene = params.get('shot');
  if (!scene) return false;

  if (scene === 'title') {
    // The fresh title screen over the idle hollow; nothing to stage.
    return true;
  }

  if (scene === 'play') {
    stageRun(state, {
      time: 95, level: 7, hp: 72, maxHp: 100, kills: 48, embers: 63, score: 1240, xp: 6,
      mods: { damage: 1.25, fireRate: 1.18, orbCount: 2, novaLevel: 1, pierce: 1 },
      upgrades: {
        'bright-bolt': 1, 'rapid-wick': 1, 'orbit-flames': 2, 'nova-burst': 1, 'piercing-light': 1,
      },
    });
    ringOf(state, 'wisp', 8, 180, 420);
    ringOf(state, 'skitter', 3, 220, 380);
    ringOf(state, 'spitter', 2, 300, 460);
    ringOf(state, 'bulwark', 1, 320, 420);
    scatterGems(state, 7);
    state.hearts.push({ x: state.player.x + 130, y: state.player.y - 90, value: 30, t: 0 });
    state.screen = SCREEN_PLAY;
    return true;
  }

  if (scene === 'levelup') {
    stageRun(state, {
      time: 95, level: 5, hp: 84, maxHp: 100, kills: 31, embers: 41, score: 860,
      mods: { damage: 1.25, orbCount: 1, novaLevel: 0, pierce: 0 },
      upgrades: { 'bright-bolt': 1, 'orbit-flames': 1, 'heart-ember': 1 },
    });
    ringOf(state, 'wisp', 5, 240, 460);
    ringOf(state, 'skitter', 2, 300, 440);
    state.ui.levelChoices = rollChoices(state, 3);
    state.screen = SCREEN_LEVELUP;
    return true;
  }

  if (scene === 'boss') {
    stageRun(state, {
      time: 265, level: 9, hp: 45, maxHp: 125, kills: 210, embers: 180, score: 9840, xp: 0,
      mods: { damage: 1.95, fireRate: 1.4, orbCount: 3, novaLevel: 2, pierce: 2, magnet: 147 },
      upgrades: {
        'bright-bolt': 3, 'rapid-wick': 2, 'orbit-flames': 3, 'nova-burst': 2,
        'piercing-light': 2, 'heart-ember': 1,
      },
    });
    ringOf(state, 'bulwark', 1, 220, 260, true);
    ringOf(state, 'wraith', 4, 180, 380);
    ringOf(state, 'wisp', 6, 200, 420);
    ringOf(state, 'spitter', 2, 320, 460);
    ringOf(state, 'skitter', 3, 200, 380);
    scatterGems(state, 5);
    state.ui.banner = 'An elite Bulwark stirs!';
    state.ui.bannerT = 2.6;
    state.screen = SCREEN_PLAY;
    return true;
  }

  if (scene === 'win') {
    stageRun(state, {
      time: DAWN_SECONDS, level: 11, hp: 63, maxHp: 125, kills: 320, embers: 260, score: 15240,
      mods: { damage: 2.4, fireRate: 1.6, orbCount: 4, novaLevel: 3, pierce: 3, magnet: 227 },
      upgrades: {
        'bright-bolt': 4, 'rapid-wick': 3, 'orbit-flames': 4, 'nova-burst': 3,
        'piercing-light': 3, 'heart-ember': 1, 'ember-magnet': 2,
      },
    });
    state.won = true;
    state.screen = SCREEN_WIN;
    burst(state, state.player.x, state.player.y, 60, '#ffe9b0', 320, 1.2, 4);
    ring(state, state.player.x, state.player.y, '#ffd166', 220, 0.9);
    return true;
  }

  if (scene === 'over') {
    stageRun(state, {
      time: 232, level: 8, hp: 0, maxHp: 125, kills: 187, embers: 150, score: 8730,
      mods: { damage: 1.95, fireRate: 1.18, orbCount: 2, novaLevel: 1, pierce: 1 },
      upgrades: {
        'bright-bolt': 3, 'rapid-wick': 1, 'orbit-flames': 2, 'nova-burst': 1,
        'piercing-light': 1, 'heart-ember': 1,
      },
    });
    state.player.hp = 0;
    state.player.dead = true;
    state.over = true;
    state.screen = SCREEN_OVER;
    ringOf(state, 'wisp', 4, 160, 380);
    burst(state, state.player.x, state.player.y, 50, '#ffd166', 300, 0.9, 4);
    return true;
  }

  return false;
}
