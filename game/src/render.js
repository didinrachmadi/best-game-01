// The renderer: a letterboxed 1280x720 field, a pre-rendered night background,
// glow sprites instead of shadowBlur (fast), and one draw function per thing in
// the world. Screens and HUD live in screens.js and draw on top of this frame.

import { DAWN_SECONDS, ENEMY_KINDS, FIELD } from './config.js';
import { orbPositions } from './weapons.js';
import { createRandom } from './random.js';

/** A soft radial glow, cached per colour, drawn with drawImage. */
function makeGlow(color) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.25, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return canvas;
}

/** The night field, painted once: stars, moon, nebulae and a dark hollow. */
function buildBackground() {
  const canvas = document.createElement('canvas');
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;
  const ctx = canvas.getContext('2d');
  const rng = createRandom(20261116);
  const sky = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  sky.addColorStop(0, '#0a0d1f');
  sky.addColorStop(0.55, '#10142e');
  sky.addColorStop(1, '#171233');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  for (const [x, y, r, color] of [
    [240, 150, 220, 'rgba(80,90,220,0.10)'],
    [760, 110, 260, 'rgba(40,160,160,0.08)'],
    [1080, 260, 200, 'rgba(150,80,220,0.09)'],
  ]) {
    const nebula = ctx.createRadialGradient(x, y, 0, x, y, r);
    nebula.addColorStop(0, color);
    nebula.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = nebula;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 170; i += 1) {
    const x = rng.range(0, FIELD.width);
    const y = rng.range(0, FIELD.height * 0.72);
    const r = rng.range(0.5, 1.7);
    ctx.globalAlpha = rng.range(0.25, 0.95);
    ctx.fillStyle = rng.chance(0.2) ? '#cfe4ff' : '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Moon, top right.
  const moon = ctx.createRadialGradient(1120, 108, 10, 1120, 108, 110);
  moon.addColorStop(0, 'rgba(230,238,255,0.5)');
  moon.addColorStop(1, 'rgba(230,238,255,0)');
  ctx.fillStyle = moon;
  ctx.fillRect(1000, 0, 240, 230);
  ctx.fillStyle = '#e8eeff';
  ctx.beginPath();
  ctx.arc(1120, 108, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(170,185,220,0.5)';
  for (const [x, y, r] of [[1106, 96, 8], [1132, 122, 6], [1118, 128, 4]]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // The hollow floor.
  ctx.fillStyle = '#0a0c1c';
  ctx.fillRect(0, FIELD.height - 130, FIELD.width, 130);
  const floorGlow = ctx.createLinearGradient(0, FIELD.height - 130, 0, FIELD.height - 60);
  floorGlow.addColorStop(0, 'rgba(90,110,200,0.16)');
  floorGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = floorGlow;
  ctx.fillRect(0, FIELD.height - 130, FIELD.width, 70);
  ctx.strokeStyle = 'rgba(30,40,80,0.8)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 90; i += 1) {
    const x = rng.range(0, FIELD.width);
    const y = rng.range(FIELD.height - 120, FIELD.height - 6);
    const h = rng.range(5, 14);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + rng.range(-4, 4), y - h);
    ctx.stroke();
  }
  // Tiny glowing mushrooms.
  for (let i = 0; i < 14; i += 1) {
    const x = rng.range(20, FIELD.width - 20);
    const y = rng.range(FIELD.height - 110, FIELD.height - 16);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 14);
    glow.addColorStop(0, 'rgba(255,190,90,0.5)');
    glow.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 14, y - 14, 28, 28);
    ctx.fillStyle = '#ffcf7a';
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const background = buildBackground();
  const glows = new Map();
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let dpr = 1;
  let vignette = null;

  function glow(color) {
    let sprite = glows.get(color);
    if (!sprite) {
      sprite = makeGlow(color);
      glows.set(color, sprite);
    }
    return sprite;
  }

  function drawGlow(x, y, size, color, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.drawImage(glow(color), x - size / 2, y - size / 2, size, size);
    ctx.globalAlpha = 1;
  }

  function drawEnemy(state, enemy) {
    const kind = ENEMY_KINDS[enemy.kind];
    const player = state.player;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;
    const r = enemy.radius;
    const telegraph = enemy.kind === 'wraith' && enemy.mode === 'telegraph';
    const pulse = telegraph ? 1 + Math.sin(state.time * 24) * 0.08 : 1;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y + r * 0.85, r * 0.8, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    if (enemy.elite) {
      drawGlow(enemy.x, enemy.y, r * 4.4, '#ffd166', 0.55);
    } else {
      drawGlow(enemy.x, enemy.y, r * 3.4, kind.glow, 0.5);
    }

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.scale(pulse, pulse);
    if (enemy.kind === 'wisp') {
      // A drifting flame with a fading tail.
      for (let i = 3; i >= 1; i -= 1) {
        ctx.globalAlpha = 0.22 * (1 - i / 4);
        ctx.fillStyle = kind.color;
        ctx.beginPath();
        ctx.arc(-ux * i * r * 0.7, -uy * i * r * 0.7, r * (0.7 - i * 0.14), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = kind.color;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-r * 0.3, -r * 0.2, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.kind === 'skitter') {
      ctx.fillStyle = kind.color;
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2 + state.time * 3 + enemy.wobble;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7);
        ctx.lineTo(Math.cos(a + 0.3) * r * 0.5, Math.sin(a + 0.3) * r * 0.5);
        ctx.lineTo(Math.cos(a) * r * 1.45, Math.sin(a) * r * 1.45);
        ctx.closePath();
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a0a1e';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.kind === 'spitter') {
      ctx.fillStyle = kind.color;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(ux * r * 0.45, uy * r * 0.45, r * 0.42, r * 0.3, Math.atan2(uy, ux), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d8ffd0';
      ctx.beginPath();
      ctx.arc(ux * r * 0.45, uy * r * 0.45, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.kind === 'bulwark') {
      ctx.fillStyle = kind.color;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8fa3d9';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.78, Math.PI * 0.9, Math.PI * 2.1);
      ctx.stroke();
      ctx.fillStyle = '#c6d4ff';
      for (let i = 0; i < 5; i += 1) {
        const a = Math.PI * (0.15 + i * 0.175);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 0.78, -Math.abs(Math.sin(a)) * r * 0.78, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Wraith: a tall ghost with a wavy hem.
      const hem = Math.sin(state.time * 4 + enemy.wobble) * 3;
      ctx.fillStyle = kind.color;
      ctx.beginPath();
      ctx.moveTo(-r, r * 0.6 + hem);
      ctx.quadraticCurveTo(-r, -r * 0.9, 0, -r * 1.15);
      ctx.quadraticCurveTo(r, -r * 0.9, r, r * 0.6 - hem);
      ctx.quadraticCurveTo(r * 0.5, r * 0.3, 0, r * 0.75 + hem);
      ctx.quadraticCurveTo(-r * 0.5, r * 0.3, -r, r * 0.6 + hem);
      ctx.closePath();
      ctx.fill();
      if (telegraph) {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    }
    // Eyes, always looking at the keeper.
    const ex = ux * r * 0.34;
    const ey = uy * r * 0.34;
    const px = -uy * r * 0.34;
    const py = ux * r * 0.34;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex + px, ey + py, r * 0.18, 0, Math.PI * 2);
    ctx.arc(ex - px, ey - py, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#101018';
    ctx.beginPath();
    ctx.arc(ex + px + ux * 1.5, ey + py + uy * 1.5, r * 0.09, 0, Math.PI * 2);
    ctx.arc(ex - px + ux * 1.5, ey - py + uy * 1.5, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
    if (enemy.flashT > 0) {
      ctx.globalAlpha = Math.min(1, (enemy.flashT / 0.09) * 0.85);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    if (enemy.elite) {
      // A crown marks the elite.
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.moveTo(enemy.x - 11, enemy.y - r - 6);
      ctx.lineTo(enemy.x - 11, enemy.y - r - 16);
      ctx.lineTo(enemy.x - 5.5, enemy.y - r - 10);
      ctx.lineTo(enemy.x, enemy.y - r - 18);
      ctx.lineTo(enemy.x + 5.5, enemy.y - r - 10);
      ctx.lineTo(enemy.x + 11, enemy.y - r - 16);
      ctx.lineTo(enemy.x + 11, enemy.y - r - 6);
      ctx.closePath();
      ctx.fill();
    }
    if (enemy.hp < enemy.maxHp) {
      const w = r * 2;
      const pct = Math.max(0, enemy.hp / enemy.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(enemy.x - w / 2, enemy.y - r - 12, w, 4);
      ctx.fillStyle = pct > 0.5 ? '#7dff9a' : pct > 0.25 ? '#ffd166' : '#ff5d5d';
      ctx.fillRect(enemy.x - w / 2, enemy.y - r - 12, w * pct, 4);
    }
  }

  function drawPlayer(state) {
    const player = state.player;
    if (player.dead) return;
    const bob = Math.sin(player.walkT * 9) * 1.6;
    const blink = player.invulnT > 0 && player.dashT <= 0
      ? 0.55 + 0.45 * Math.sin(state.time * 40)
      : 1;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 17, 15, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Dash afterimages.
    if (player.dashT > 0) {
      for (let i = 1; i <= 2; i += 1) {
        ctx.globalAlpha = 0.22 / i;
        ctx.fillStyle = '#3d5a99';
        ctx.beginPath();
        ctx.arc(
          player.x - player.dashDx * i * 22,
          player.y - player.dashDy * i * 22,
          player.radius,
          0, Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = blink;
    // Lantern light, the warm heart of the scene.
    drawGlow(player.x, player.y, 190, '#ffb347', 0.75);
    // Cloak.
    ctx.fillStyle = '#2b3a67';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - 16 + bob);
    ctx.quadraticCurveTo(player.x + 14, player.y - 2 + bob, player.x + 12, player.y + 15);
    ctx.quadraticCurveTo(player.x + 6, player.y + 18, player.x, player.y + 15);
    ctx.quadraticCurveTo(player.x - 6, player.y + 18, player.x - 12, player.y + 15);
    ctx.quadraticCurveTo(player.x - 14, player.y - 2 + bob, player.x, player.y - 16 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(player.x - 11, player.y + 12);
    ctx.quadraticCurveTo(player.x, player.y + 17, player.x + 11, player.y + 12);
    ctx.stroke();
    // Hood and face.
    ctx.fillStyle = '#1d2a4d';
    ctx.beginPath();
    ctx.arc(player.x, player.y - 12 + bob, 10.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9b0';
    ctx.beginPath();
    ctx.arc(player.x + player.facingX * 2.5, player.y - 12 + bob, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#101018';
    ctx.beginPath();
    ctx.arc(player.x + player.facingX * 2.5 - 2, player.y - 13 + bob, 1.1, 0, Math.PI * 2);
    ctx.arc(player.x + player.facingX * 2.5 + 2, player.y - 13 + bob, 1.1, 0, Math.PI * 2);
    ctx.fill();
    // The lantern, swinging with the walk.
    const swing = Math.sin(player.walkT * 9) * 2.5;
    const lx = player.x + player.facingX * 15;
    const ly = player.y + 4 + swing;
    drawGlow(lx, ly, 70, '#ffcf6e', 0.9);
    ctx.strokeStyle = '#8a6a2f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(lx, ly - 7, 4, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#ffcf6e';
    ctx.beginPath();
    ctx.roundRect(lx - 5, ly - 5, 10, 12, 2);
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.roundRect(lx - 2.5, ly - 2, 5, 6, 1);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawWorld(state) {
    ctx.drawImage(background, 0, 0);
    // Dawn warms the horizon as the night runs out.
    const progress = Math.min(1, state.time / DAWN_SECONDS);
    if (progress > 0.02) {
      const dawn = ctx.createLinearGradient(0, FIELD.height * 0.45, 0, FIELD.height);
      dawn.addColorStop(0, 'rgba(255,140,60,0)');
      dawn.addColorStop(1, `rgba(255,140,60,${0.34 * progress})`);
      ctx.fillStyle = dawn;
      ctx.fillRect(0, FIELD.height * 0.45, FIELD.width, FIELD.height * 0.55);
      ctx.fillStyle = `rgba(255,180,120,${0.07 * progress})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    // Embers.
    for (const gem of state.gems) {
      const bob = Math.sin(gem.t * 3) * 2;
      drawGlow(gem.x, gem.y + bob, 22, '#ffd166', 0.55);
      ctx.save();
      ctx.translate(gem.x, gem.y + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(-4, -4, 8, 8);
      ctx.fillStyle = '#fff3c4';
      ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
    }
    // Hearts.
    for (const heart of state.hearts) {
      const bob = Math.sin(heart.t * 3) * 3;
      drawGlow(heart.x, heart.y + bob, 34, '#ff5d7a', 0.6);
      ctx.fillStyle = '#ff5d7a';
      ctx.beginPath();
      ctx.moveTo(heart.x, heart.y + bob + 8);
      ctx.bezierCurveTo(heart.x - 11, heart.y + bob - 1, heart.x - 6, heart.y + bob - 9, heart.x, heart.y + bob - 3);
      ctx.bezierCurveTo(heart.x + 6, heart.y + bob - 9, heart.x + 11, heart.y + bob - 1, heart.x, heart.y + bob + 8);
      ctx.fill();
    }
    // Enemy globs.
    for (const glob of state.globs) {
      drawGlow(glob.x, glob.y, 30, '#b388ff', 0.7);
      ctx.fillStyle = '#c9a7ff';
      ctx.beginPath();
      ctx.arc(glob.x, glob.y, glob.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7c4dff';
      ctx.beginPath();
      ctx.arc(glob.x, glob.y, glob.radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const enemy of state.enemies) {
      if (!enemy.dead) drawEnemy(state, enemy);
    }
    // Nova rings.
    for (const ringFx of state.novaRings) {
      const p = ringFx.t / ringFx.maxT;
      const ease = 1 - (1 - p) * (1 - p);
      ctx.strokeStyle = `rgba(255,170,60,${0.9 * (1 - p)})`;
      ctx.lineWidth = 1 + 7 * (1 - p);
      ctx.beginPath();
      ctx.arc(ringFx.x, ringFx.y, Math.max(1, ringFx.radius * ease), 0, Math.PI * 2);
      ctx.stroke();
    }
    // Lantern bolts.
    for (const shot of state.shots) {
      drawGlow(shot.x, shot.y, 26, '#ffcf6e', 0.8);
      ctx.strokeStyle = '#ffe9b0';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(shot.x - shot.vx * 0.03, shot.y - shot.vy * 0.03);
      ctx.lineTo(shot.x, shot.y);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(shot.x, shot.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // Orbiting flames.
    const orbs = orbPositions(state);
    orbs.forEach((orb, i) => {
      const flicker = 1 + Math.sin(state.time * 18 + i * 2) * 0.12;
      drawGlow(orb.x, orb.y, 44 * flicker, '#ff9a3c', 0.85);
      ctx.fillStyle = '#ffcf6e';
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, 7 * flicker, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    drawPlayer(state);
    // Particles.
    for (const p of state.particles) {
      const lifePct = p.life / p.maxLife;
      if (p.kind === 'spark') {
        drawGlow(p.x, p.y, p.size * 5, p.color, lifePct);
      } else if (p.kind === 'smoke') {
        ctx.globalAlpha = 0.35 * lifePct;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        const p2 = 1 - lifePct;
        const ease = 1 - (1 - p2) * (1 - p2);
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = lifePct;
        ctx.lineWidth = 2 + 3 * lifePct;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, p.size * ease), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    // Floating numbers.
    for (const f of state.floats) {
      ctx.globalAlpha = Math.min(1, f.life / 0.3);
      ctx.font = `700 ${f.size}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  return {
    resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      scale = Math.min(w / FIELD.width, h / FIELD.height);
      offsetX = (w - FIELD.width * scale) / 2;
      offsetY = (h - FIELD.height * scale) / 2;
      vignette = ctx.createRadialGradient(
        FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.42,
        FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.85,
      );
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(2,3,10,0.55)');
    },
    toLogical(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left - offsetX) / scale,
        y: (clientY - rect.top - offsetY) / scale,
      };
    },
    /** Draw one frame: the world, then the overlay callback, then the vignette. */
    frame(state, overlay) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#05060f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const shake = state.ui.shake;
      const sx = shake > 0 ? (Math.random() * 2 - 1) * shake : 0;
      const sy = shake > 0 ? (Math.random() * 2 - 1) * shake : 0;
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (offsetX + sx * scale), dpr * (offsetY + sy * scale));
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, FIELD.width, FIELD.height);
      ctx.clip();
      drawWorld(state);
      ctx.restore();
      if (overlay) overlay(ctx);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },
  };
}
