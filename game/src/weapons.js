// The keeper's arsenal: the lantern bolt that fires on its own at the nearest
// foe, the orbiting flames and the nova burst that upgrades unlock. This module
// fires and moves projectiles; the world resolves what they hit.

import { BOLT, FIELD, NOVA, ORBS } from './config.js';
import { damageEnemy } from './enemies.js';
import { addShake, ring } from './particles.js';

/** The nearest living enemy within `range` of a point, else null. */
export function nearestEnemy(state, x, y, range) {
  let best = null;
  let bestD2 = range * range;
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = enemy;
    }
  }
  return best;
}

/** Positions of the orbiting flames, evenly spaced around the keeper. */
export function orbPositions(state) {
  const out = [];
  const count = state.mods.orbCount;
  for (let i = 0; i < count; i += 1) {
    const angle = state.weapons.orbAngle + (i * Math.PI * 2) / count;
    out.push({
      x: state.player.x + Math.cos(angle) * ORBS.orbitRadius,
      y: state.player.y + Math.sin(angle) * ORBS.orbitRadius,
    });
  }
  return out;
}

function fireBolt(state, target, fx) {
  const player = state.player;
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const dist = Math.hypot(dx, dy) || 1;
  state.shots.push({
    x: player.x + (dx / dist) * (player.radius + 6),
    y: player.y + (dy / dist) * (player.radius + 6),
    vx: (dx / dist) * BOLT.speed,
    vy: (dy / dist) * BOLT.speed,
    damage: BOLT.damage * state.mods.damage,
    pierce: state.mods.pierce,
    radius: BOLT.radius,
    life: 1.6,
  });
  state.stats.shotsFired += 1;
  if (fx) fx.shoot();
}

function fireNova(state, fx) {
  const level = state.mods.novaLevel;
  const damage = NOVA.damage * (1 + 0.3 * (level - 1)) * state.mods.damage;
  const player = state.player;
  state.novaRings.push({ x: player.x, y: player.y, t: 0, maxT: NOVA.ringTime, radius: NOVA.radius });
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < NOVA.radius + enemy.radius) {
      const k = 260 / Math.max(40, dist);
      damageEnemy(state, enemy, damage, dx * k, dy * k, null);
    }
  }
  ring(state, player.x, player.y, '#ff9a3c', NOVA.radius, 0.4);
  addShake(state, 3);
  if (fx) fx.nova();
}

/** Fire timers and the orbit; called once per sim step. */
export function updateWeapons(state, dt, fx) {
  const weapons = state.weapons;
  weapons.boltT -= dt;
  if (weapons.boltT <= 0) {
    const target = nearestEnemy(state, state.player.x, state.player.y, BOLT.range);
    if (target) {
      fireBolt(state, target, fx);
      weapons.boltT = BOLT.interval / state.mods.fireRate;
    } else {
      weapons.boltT = 0.08;
    }
  }
  if (state.mods.orbCount > 0) {
    weapons.orbAngle += ORBS.angularSpeed * dt;
  }
  if (state.mods.novaLevel > 0) {
    weapons.novaT -= dt;
    if (weapons.novaT <= 0) {
      fireNova(state, fx);
      weapons.novaT = NOVA.interval * Math.pow(0.88, state.mods.novaLevel - 1);
    }
  }
}

/** Move the keeper's bolts; drop the spent ones. */
export function updateShots(state, dt) {
  const shots = state.shots;
  for (let i = shots.length - 1; i >= 0; i -= 1) {
    const shot = shots[i];
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    if (shot.life <= 0 || shot.x < -20 || shot.x > FIELD.width + 20 || shot.y < -20 || shot.y > FIELD.height + 20) {
      shots[i] = shots[shots.length - 1];
      shots.pop();
    }
  }
}

/** Move the spitters' globs; drop the spent ones. */
export function updateGlobs(state, dt) {
  const globs = state.globs;
  for (let i = globs.length - 1; i >= 0; i -= 1) {
    const glob = globs[i];
    glob.x += glob.vx * dt;
    glob.y += glob.vy * dt;
    glob.life -= dt;
    if (glob.life <= 0 || glob.x < -20 || glob.x > FIELD.width + 20 || glob.y < -20 || glob.y > FIELD.height + 20) {
      globs[i] = globs[globs.length - 1];
      globs.pop();
    }
  }
}
