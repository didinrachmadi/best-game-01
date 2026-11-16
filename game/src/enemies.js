// The shadow creatures: five kinds with their own habits, a spawn director that
// raises the pressure minute by minute, and elites that arrive on the hour mark.
// Enemies chase, strafe, shoot and lunge; the world resolves what they touch.

import { DIRECTOR, ELITE, ELITE_EVERY, ENEMY_KINDS, FIELD, SCORE } from './config.js';
import { addShake, burst, floatText, puff } from './particles.js';

/** Most creatures alive at once: a cap that keeps the sim fast. */
const MAX_ENEMIES = 170;
/** How far outside the field a creature spawns. */
const SPAWN_MARGIN = 46;

const MINUTE_BANNERS = [
  'The hollow stirs…',
  'Shadows gather…',
  'The dark deepens…',
  'Hold the light…',
  'Dawn is near…',
];

function pickKind(state) {
  const now = state.time;
  let total = 0;
  const entries = Object.entries(ENEMY_KINDS);
  for (const [, kind] of entries) {
    if (now >= kind.unlockAt) total += kind.weight;
  }
  let roll = state.rng.next() * total;
  for (const [id, kind] of entries) {
    if (now < kind.unlockAt) continue;
    roll -= kind.weight;
    if (roll <= 0) return id;
  }
  return 'wisp';
}

/** Spawn one creature of a kind at a point, with the time's scaling. */
export function spawnEnemy(state, kindId, x, y, elite = false) {
  const kind = ENEMY_KINDS[kindId];
  const t = state.time;
  const hpMul = 1 + t * DIRECTOR.hpGrowthPerSecond;
  const speedMul = 1 + Math.min(DIRECTOR.speedGrowthMax, t * DIRECTOR.speedGrowthPerSecond);
  const enemy = {
    kind: kindId,
    x, y,
    vx: 0, vy: 0,
    hp: kind.hp * hpMul * (elite ? ELITE.hpMul : 1),
    maxHp: kind.hp * hpMul * (elite ? ELITE.hpMul : 1),
    radius: kind.radius * (elite ? ELITE.radiusMul : 1),
    speed: kind.speed * speedMul * (elite ? ELITE.speedMul : 1),
    damage: kind.damage,
    xp: kind.xp * (elite ? ELITE.xpMul : 1),
    score: kind.score * (elite ? ELITE.scoreMul : 1),
    elite,
    flashT: 0,
    touchCd: 0,
    orbT: 0,
    shotT: state.rng.range(0.6, 1.6),
    mode: 'stalk',
    modeT: 0,
    lungeDx: 0,
    lungeDy: 0,
    strafeDir: state.rng.chance(0.5) ? 1 : -1,
    wobble: state.rng.range(0, Math.PI * 2),
    dead: false,
  };
  state.enemies.push(enemy);
  return enemy;
}

function spawnAtEdge(state, kindId, elite = false) {
  const side = state.rng.int(0, 3);
  const m = SPAWN_MARGIN + state.rng.range(0, 30);
  let x;
  let y;
  if (side === 0) { x = state.rng.range(0, FIELD.width); y = -m; }
  else if (side === 1) { x = FIELD.width + m; y = state.rng.range(0, FIELD.height); }
  else if (side === 2) { x = state.rng.range(0, FIELD.width); y = FIELD.height + m; }
  else { x = -m; y = state.rng.range(0, FIELD.height); }
  return spawnEnemy(state, kindId, x, y, elite);
}

/** The director: spawn ticks, elite arrivals and minute banners. */
export function updateDirector(state, dt, fx) {
  const director = state.director;
  const t = state.time;
  const progress = Math.min(1, t / 300);
  const interval = DIRECTOR.intervalStart
    + (DIRECTOR.intervalEnd - DIRECTOR.intervalStart) * progress;
  director.spawnT -= dt;
  if (director.spawnT <= 0) {
    director.spawnT += interval;
    const batch = Math.min(
      DIRECTOR.batchMax,
      DIRECTOR.batchStart + Math.floor(t / DIRECTOR.batchEvery),
    );
    for (let i = 0; i < batch && state.enemies.length < MAX_ENEMIES; i += 1) {
      spawnAtEdge(state, pickKind(state));
    }
  }
  if (t >= director.nextEliteAt) {
    director.nextEliteAt += ELITE_EVERY;
    const kindId = pickKind(state);
    spawnAtEdge(state, kindId, true);
    state.ui.banner = `An elite ${ENEMY_KINDS[kindId].name} stirs!`;
    state.ui.bannerT = 2.6;
    if (fx) fx.elite();
  }
  const minute = Math.floor(t / 60);
  if (minute > director.minute) {
    director.minute = minute;
    state.ui.banner = MINUTE_BANNERS[Math.min(minute - 1, MINUTE_BANNERS.length - 1)];
    state.ui.bannerT = 2.6;
  }
}

/** Hurt one creature; returns true when it dies. Handles drops, score and juice. */
export function damageEnemy(state, enemy, damage, kx, ky, fx) {
  if (enemy.dead) return false;
  enemy.hp -= damage;
  enemy.flashT = 0.09;
  enemy.vx += kx;
  enemy.vy += ky;
  state.stats.damageDealt += damage;
  floatText(state, enemy.x, enemy.y - enemy.radius, String(Math.round(damage)), '#ffe9b0', enemy.elite ? 18 : 13);
  if (enemy.hp > 0) {
    if (fx) fx.hit();
    return false;
  }
  enemy.dead = true;
  state.kills += 1;
  state.score += enemy.score;
  const gems = enemy.xp <= 2 ? enemy.xp : 2;
  const per = Math.max(1, Math.round(enemy.xp / gems));
  for (let i = 0; i < gems; i += 1) {
    const angle = state.rng.range(0, Math.PI * 2);
    state.gems.push({
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * state.rng.range(40, 130),
      vy: Math.sin(angle) * state.rng.range(40, 130),
      value: per,
      t: state.rng.range(0, Math.PI * 2),
    });
  }
  if (enemy.elite) {
    state.hearts.push({ x: enemy.x, y: enemy.y, value: 30, t: 0 });
    addShake(state, 6);
    state.ui.hitStop = Math.max(state.ui.hitStop, 0.05);
  }
  burst(state, enemy.x, enemy.y, enemy.elite ? 26 : 12, ENEMY_KINDS[enemy.kind].glow, 220, 0.5, 3.5);
  puff(state, enemy.x, enemy.y, enemy.elite ? 10 : 5);
  if (fx) fx.kill();
  return true;
}

/** Drop the dead from the enemies array, in place. */
export function sweepDead(state) {
  const list = state.enemies;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (list[i].dead) {
      list[i] = list[list.length - 1];
      list.pop();
    }
  }
}

/**
 * Move every creature one step. `hooks.onTouch(enemy)` runs when a creature
 * reaches the player; the world owns what a touch does.
 */
export function updateEnemies(state, dt, hooks) {
  const player = state.player;
  const list = state.enemies;
  for (const enemy of list) {
    if (enemy.dead) continue;
    const kind = ENEMY_KINDS[enemy.kind];
    if (enemy.flashT > 0) enemy.flashT -= dt;
    if (enemy.touchCd > 0) enemy.touchCd -= dt;
    if (enemy.orbT > 0) enemy.orbT -= dt;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;
    let ax = ux * enemy.speed;
    let ay = uy * enemy.speed;

    if (kind.ranged) {
      // Spitters hold their distance and shoot globs.
      if (dist > kind.preferredRange + 50) {
        ax = ux * enemy.speed;
        ay = uy * enemy.speed;
      } else if (dist < kind.preferredRange - 50) {
        ax = -ux * enemy.speed * 0.8;
        ay = -uy * enemy.speed * 0.8;
      } else {
        ax = -uy * enemy.speed * 0.5 * enemy.strafeDir;
        ay = ux * enemy.speed * 0.5 * enemy.strafeDir;
      }
      enemy.shotT -= dt;
      if (enemy.shotT <= 0 && dist < 560) {
        enemy.shotT = kind.shotInterval * (0.85 + state.rng.next() * 0.3);
        state.globs.push({
          x: enemy.x,
          y: enemy.y,
          vx: ux * kind.shotSpeed,
          vy: uy * kind.shotSpeed,
          damage: kind.damage,
          radius: 6,
          life: 4,
        });
      }
    } else if (kind.lunges) {
      // Wraiths stalk, telegraph, then lunge.
      enemy.modeT -= dt;
      if (enemy.mode === 'stalk') {
        if (dist < 270 && enemy.modeT <= 0) {
          enemy.mode = 'telegraph';
          enemy.modeT = kind.lungeTelegraph;
        }
      } else if (enemy.mode === 'telegraph') {
        ax = ux * enemy.speed * 0.25;
        ay = uy * enemy.speed * 0.25;
        if (enemy.modeT <= 0) {
          enemy.mode = 'lunge';
          enemy.modeT = 0.32;
          enemy.lungeDx = ux;
          enemy.lungeDy = uy;
        }
      } else if (enemy.mode === 'lunge') {
        ax = enemy.lungeDx * kind.lungeSpeed;
        ay = enemy.lungeDy * kind.lungeSpeed;
        if (enemy.modeT <= 0) {
          enemy.mode = 'recover';
          enemy.modeT = 0.7;
        }
      } else {
        ax = ux * enemy.speed * 0.3;
        ay = uy * enemy.speed * 0.3;
        if (enemy.modeT <= 0) {
          enemy.mode = 'stalk';
          enemy.modeT = kind.lungeCooldown;
        }
      }
    }

    // A wobble keeps the horde from marching in lockstep.
    const wob = Math.sin(state.time * 2.2 + enemy.wobble) * 0.14;
    const wx = ax - ay * wob;
    const wy = ay + ax * wob;
    enemy.x += (wx + enemy.vx) * dt;
    enemy.y += (wy + enemy.vy) * dt;
    const drag = 1 - Math.min(0.9, 7 * dt);
    enemy.vx *= drag;
    enemy.vy *= drag;

    if (!player.dead && dist < enemy.radius + player.radius + 2 && enemy.touchCd <= 0) {
      enemy.touchCd = 0.7;
      hooks.onTouch(enemy);
    }
  }

  // Soft separation so creatures do not stack into one blob.
  for (let i = 0; i < list.length; i += 1) {
    const a = list[i];
    if (a.dead) continue;
    for (let j = i + 1; j < list.length; j += 1) {
      const b = list[j];
      if (b.dead) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const min = a.radius + b.radius;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0.01 && d2 < min * min) {
        const d = Math.sqrt(d2);
        const push = ((min - d) / d) * 0.5 * 30 * dt;
        a.x -= dx * push;
        a.y -= dy * push;
        b.x += dx * push;
        b.y += dy * push;
      }
    }
  }
}
