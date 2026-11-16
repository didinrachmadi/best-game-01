// The Lantern Keeper: snappy acceleration, a dash with i-frames, and a walk cycle
// the renderer reads. Movement answers at once (high accel, fast stop) because a
// survivor game lives or dies on how the keeper feels under the keys.

import { FIELD, PLAYER } from './config.js';
import { ring } from './particles.js';

/** Acceleration toward the wanted velocity, per second. */
const ACCEL = 16;
/** How fast the keeper stops when the keys lift, per second. */
const STOP = 20;

export function updatePlayer(state, move, dash, dashTarget, dt, fx) {
  const player = state.player;
  if (player.dead) return;

  if (player.dashCd > 0) player.dashCd -= dt;
  if (player.invulnT > 0) player.invulnT -= dt;

  // Starting a dash: toward the click point, else along the movement keys, else
  // the way the keeper already faces. The dash is a burst with i-frames.
  if (dash && player.dashCd <= 0 && player.dashT <= 0) {
    let dx = move.x;
    let dy = move.y;
    if (dashTarget) {
      dx = dashTarget.x - player.x;
      dy = dashTarget.y - player.y;
    }
    // A cardinal move is exactly length 1, so the test is "any direction at
    // all", not "longer than 1" — the old > 1 test sent a fresh W+ Shift dash
    // along the facing instead of up.
    const len = Math.hypot(dx, dy);
    if (len > 0.01) {
      dx /= len;
      dy /= len;
    } else {
      dx = player.facingX;
      dy = player.facingY;
    }
    player.dashDx = dx;
    player.dashDy = dy;
    player.dashT = PLAYER.dashTime;
    player.dashCd = PLAYER.dashCooldown * state.mods.dashCdMul;
    player.invulnT = Math.max(player.invulnT, PLAYER.dashTime + 0.12);
    ring(state, player.x, player.y, '#ffd166', 46, 0.3);
    if (fx) fx.dash();
  }

  if (player.dashT > 0) {
    player.dashT -= dt;
    const speed = PLAYER.dashDistance / PLAYER.dashTime;
    player.vx = player.dashDx * speed;
    player.vy = player.dashDy * speed;
  } else {
    const speed = PLAYER.speed * state.mods.moveSpeed;
    const wantX = move.x * speed;
    const wantY = move.y * speed;
    const rate = move.x === 0 && move.y === 0 ? STOP : ACCEL;
    const k = Math.min(1, rate * dt);
    player.vx += (wantX - player.vx) * k;
    player.vy += (wantY - player.vy) * k;
  }

  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.x = Math.max(player.radius, Math.min(FIELD.width - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(FIELD.height - player.radius, player.y));

  const moving = Math.hypot(player.vx, player.vy);
  if (moving > 12) {
    player.facingX = player.vx / moving;
    player.facingY = player.vy / moving;
    player.walkT += dt * (moving / PLAYER.speed);
  }
}
