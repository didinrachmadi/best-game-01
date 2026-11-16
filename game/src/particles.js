// Juice: sparks, smoke, rings and floating numbers, plus the screen shake that
// sells every hit. Particles are plain objects in capped arrays, integrated by
// updateParticles() and drawn by the renderer; nothing here touches the canvas.

const MAX_PARTICLES = 420;
const MAX_FLOATS = 48;

/** A burst of glowing sparks. */
export function burst(state, x, y, count, color, speed = 180, life = 0.5, size = 3) {
  for (let i = 0; i < count; i += 1) {
    if (state.particles.length >= MAX_PARTICLES) state.particles.shift();
    const angle = state.rng.range(0, Math.PI * 2);
    const v = state.rng.range(speed * 0.3, speed);
    state.particles.push({
      kind: 'spark',
      x, y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: state.rng.range(life * 0.5, life),
      maxLife: life,
      size: state.rng.range(size * 0.6, size * 1.4),
      color,
      drag: 3.2,
      gravity: 0,
    });
  }
}

/** A puff of dark smoke, for a shadow creature dissolving. */
export function puff(state, x, y, count, color = '#2a2340') {
  for (let i = 0; i < count; i += 1) {
    if (state.particles.length >= MAX_PARTICLES) state.particles.shift();
    const angle = state.rng.range(0, Math.PI * 2);
    const v = state.rng.range(12, 70);
    state.particles.push({
      kind: 'smoke',
      x: x + state.rng.range(-6, 6),
      y: y + state.rng.range(-6, 6),
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v - 14,
      life: state.rng.range(0.4, 0.8),
      maxLife: 0.8,
      size: state.rng.range(8, 18),
      color,
      drag: 1.6,
      gravity: -12,
    });
  }
}

/** An expanding ring, for novas, level-ups and dashes. */
export function ring(state, x, y, color, maxRadius, life = 0.45) {
  if (state.particles.length >= MAX_PARTICLES) state.particles.shift();
  state.particles.push({
    kind: 'ring',
    x, y, vx: 0, vy: 0,
    life, maxLife: life,
    size: maxRadius,
    color,
    drag: 0,
    gravity: 0,
  });
}

/** A rising, fading number or word (damage, +XP, pickups). */
export function floatText(state, x, y, text, color = '#ffd166', size = 15) {
  if (state.floats.length >= MAX_FLOATS) state.floats.shift();
  state.floats.push({
    x: x + state.rng.range(-8, 8),
    y: y - 8,
    vy: -46,
    life: 0.8,
    maxLife: 0.8,
    text,
    color,
    size,
  });
}

/** Kick the camera. Small shakes sell hits; big ones sell deaths. */
export function addShake(state, amount) {
  state.ui.shake = Math.min(14, state.ui.shake + amount);
}

/** Advance particles, floating text and the shake by dt seconds. */
export function updateParticles(state, dt) {
  const parts = state.particles;
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const p = parts[i];
    p.life -= dt;
    if (p.life <= 0) {
      parts[i] = parts[parts.length - 1];
      parts.pop();
      continue;
    }
    const drag = 1 - Math.min(0.9, p.drag * dt);
    p.vx *= drag;
    p.vy = p.vy * drag + p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  const floats = state.floats;
  for (let i = floats.length - 1; i >= 0; i -= 1) {
    const f = floats[i];
    f.life -= dt;
    if (f.life <= 0) {
      floats[i] = floats[floats.length - 1];
      floats.pop();
      continue;
    }
    f.y += f.vy * dt;
    f.vy *= 1 - 1.8 * dt;
  }
  const rings = state.novaRings;
  for (let i = rings.length - 1; i >= 0; i -= 1) {
    rings[i].t += dt;
    if (rings[i].t >= rings[i].maxT) {
      rings[i] = rings[rings.length - 1];
      rings.pop();
    }
  }
  state.ui.shake = Math.max(0, state.ui.shake - 34 * dt);
  if (state.ui.bannerT > 0) state.ui.bannerT -= dt;
  if (state.ui.hitStop > 0) state.ui.hitStop -= dt;
}
