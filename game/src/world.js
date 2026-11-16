// The sim step: player, director, weapons, creatures, collisions, pickups, and
// the level-up and end-of-run transitions. One fixed step per frame, called by
// the loop in main.js.

import { DAWN_SECONDS, ORBS, SCORE, xpForLevel } from './config.js';
import { SCREEN_LEVELUP, SCREEN_OVER, SCREEN_WIN } from './state.js';
import { updatePlayer } from './player.js';
import { damageEnemy, sweepDead, updateDirector, updateEnemies } from './enemies.js';
import { orbPositions, updateGlobs, updateShots, updateWeapons } from './weapons.js';
import { rollChoices } from './upgrades.js';
import { addShake, burst, floatText, ring, updateParticles } from './particles.js';

const MAX_GEMS = 400;

/** Hurt the keeper, unless a dash or i-frames say otherwise. */
export function hurtPlayer(state, source, fx) {
  const player = state.player;
  if (player.dead || player.invulnT > 0 || player.dashT > 0) return;
  player.hp -= source.damage;
  player.invulnT = 0.7;
  addShake(state, 5);
  burst(state, player.x, player.y, 10, '#ff5d5d', 200, 0.4, 3);
  floatText(state, player.x, player.y - 22, `-${source.damage}`, '#ff8a8a', 16);
  if (fx) fx.hurt();
  // Thorns bite back.
  if (source.enemy && state.mods.thorns > 0) {
    const dx = source.enemy.x - player.x;
    const dy = source.enemy.y - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    damageEnemy(state, source.enemy, state.mods.thorns, (dx / dist) * 180, (dy / dist) * 180, null);
  }
  if (player.hp <= 0) {
    player.hp = 0;
    player.dead = true;
    state.over = true;
    state.screen = SCREEN_OVER;
    burst(state, player.x, player.y, 60, '#ffd166', 320, 0.9, 4);
    ring(state, player.x, player.y, '#ffd166', 120, 0.6);
    addShake(state, 10);
    if (fx) fx.lose();
  }
}

/** Offer a level-up when the keeper has earned one. Returns true if it did. */
export function checkLevelUp(state, fx) {
  const player = state.player;
  if (player.xp < player.xpNext || player.dead) return false;
  player.xp -= player.xpNext;
  player.level += 1;
  player.xpNext = xpForLevel(player.level);
  state.ui.levelChoices = rollChoices(state, 3);
  state.screen = SCREEN_LEVELUP;
  ring(state, player.x, player.y, '#ffd166', 90, 0.5);
  burst(state, player.x, player.y, 24, '#ffd166', 260, 0.7, 3.5);
  if (fx) fx.levelup();
  return true;
}

function collideShots(state, fx) {
  const shots = state.shots;
  for (let i = shots.length - 1; i >= 0; i -= 1) {
    const shot = shots[i];
    let spent = false;
    for (const enemy of state.enemies) {
      if (enemy.dead) continue;
      const dx = enemy.x - shot.x;
      const dy = enemy.y - shot.y;
      const rr = enemy.radius + shot.radius;
      if (dx * dx + dy * dy < rr * rr) {
        const speed = Math.hypot(shot.vx, shot.vy) || 1;
        damageEnemy(state, enemy, shot.damage, (shot.vx / speed) * 90, (shot.vy / speed) * 90, fx);
        shot.pierce -= 1;
        if (shot.pierce < 0) {
          spent = true;
          break;
        }
      }
    }
    if (spent) {
      shots[i] = shots[shots.length - 1];
      shots.pop();
    }
  }
}

function collideOrbs(state, fx) {
  if (state.mods.orbCount === 0) return;
  const damage = ORBS.damage * state.mods.damage;
  for (const orb of orbPositions(state)) {
    for (const enemy of state.enemies) {
      if (enemy.dead || enemy.orbT > 0) continue;
      const dx = enemy.x - orb.x;
      const dy = enemy.y - orb.y;
      const rr = enemy.radius + ORBS.radius;
      if (dx * dx + dy * dy < rr * rr) {
        const dist = Math.hypot(dx, dy) || 1;
        enemy.orbT = ORBS.hitCooldown;
        damageEnemy(state, enemy, damage, (dx / dist) * 150, (dy / dist) * 150, fx);
      }
    }
  }
}

function collideGlobs(state, fx) {
  const player = state.player;
  const globs = state.globs;
  for (let i = globs.length - 1; i >= 0; i -= 1) {
    const glob = globs[i];
    const dx = player.x - glob.x;
    const dy = player.y - glob.y;
    const rr = player.radius + glob.radius;
    if (dx * dx + dy * dy < rr * rr) {
      globs[i] = globs[globs.length - 1];
      globs.pop();
      hurtPlayer(state, { damage: glob.damage }, fx);
    }
  }
}

function updatePickups(state, dt, fx) {
  const player = state.player;
  const gems = state.gems;
  for (let i = gems.length - 1; i >= 0; i -= 1) {
    const gem = gems[i];
    gem.t += dt;
    const dx = player.x - gem.x;
    const dy = player.y - gem.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < state.mods.magnet) {
      const pull = 1500;
      gem.vx += (dx / dist) * pull * dt;
      gem.vy += (dy / dist) * pull * dt;
      const speed = Math.hypot(gem.vx, gem.vy);
      if (speed > 560) {
        gem.vx = (gem.vx / speed) * 560;
        gem.vy = (gem.vy / speed) * 560;
      }
    } else {
      const drag = 1 - Math.min(0.9, 3 * dt);
      gem.vx *= drag;
      gem.vy *= drag;
    }
    gem.x += gem.vx * dt;
    gem.y += gem.vy * dt;
    if (dist < player.radius + 10) {
      gems[i] = gems[gems.length - 1];
      gems.pop();
      player.xp += gem.value;
      state.embers += gem.value;
      state.score += SCORE.ember * gem.value;
      burst(state, gem.x, gem.y, 3, '#ffd166', 90, 0.3, 2);
      if (fx) fx.pickup();
    }
  }
  while (gems.length > MAX_GEMS) gems.shift();
  const hearts = state.hearts;
  for (let i = hearts.length - 1; i >= 0; i -= 1) {
    const heart = hearts[i];
    heart.t += dt;
    const dx = player.x - heart.x;
    const dy = player.y - heart.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < state.mods.magnet * 0.8) {
      heart.x += (dx / dist) * 220 * dt;
      heart.y += (dy / dist) * 220 * dt;
    }
    if (dist < player.radius + 14) {
      hearts[i] = hearts[hearts.length - 1];
      hearts.pop();
      player.hp = Math.min(player.maxHp, player.hp + heart.value);
      floatText(state, player.x, player.y - 24, `+${heart.value} HP`, '#7dff9a', 16);
      burst(state, player.x, player.y, 10, '#7dff9a', 140, 0.5, 3);
      if (fx) fx.heart();
    }
  }
}

/**
 * Advance the run one fixed step. `input` is { move, dash, dashTarget } from
 * the loop. Hit-stop freezes the sim for a beat while particles keep falling.
 */
export function step(state, input, dt, fx) {
  if (state.ui.hitStop > 0) {
    updateParticles(state, dt);
    return;
  }
  state.time += dt;
  updatePlayer(state, input.move, input.dash, input.dashTarget, dt, fx);
  updateDirector(state, dt, fx);
  updateWeapons(state, dt, fx);
  updateEnemies(state, dt, {
    onTouch: (enemy) => hurtPlayer(state, { damage: enemy.damage, enemy }, fx),
  });
  updateShots(state, dt);
  updateGlobs(state, dt);
  collideShots(state, fx);
  collideOrbs(state, fx);
  collideGlobs(state, fx);
  updatePickups(state, dt, fx);
  sweepDead(state);
  updateParticles(state, dt);

  if (state.player.dead) return;
  if (checkLevelUp(state, fx)) return;
  if (state.time >= DAWN_SECONDS) {
    state.won = true;
    state.screen = SCREEN_WIN;
    burst(state, state.player.x, state.player.y, 80, '#ffe9b0', 360, 1.2, 4);
    ring(state, state.player.x, state.player.y, '#ffd166', 220, 0.9);
    if (fx) fx.win();
  }
}

/** Seconds left until dawn, never below zero. */
export function timeLeft(state) {
  return Math.max(0, DAWN_SECONDS - state.time);
}
