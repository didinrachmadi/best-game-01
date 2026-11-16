// Everything drawn on top of the world: the HUD, the title, the level-up cards
// and the end screens. All coordinates are logical field pixels (1280x720).

import { DAWN_SECONDS, FIELD } from './config.js';
import { SCREEN_PLAY } from './state.js';
import { describeUpgrade, levelOf } from './upgrades.js';
import { timeLeft } from './world.js';

const GOLD = '#ffd166';
const PALE = '#ffe9b0';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function text(ctx, str, x, y, font, color, align = 'center') {
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatNumber(n) {
  return Math.round(n).toLocaleString('en-US');
}

/** The three card rectangles for a level-up offer, laid out across the field. */
export function levelUpCardRects(count) {
  const w = 300;
  const h = 280;
  const gap = 26;
  const total = count * w + (count - 1) * gap;
  const startX = (FIELD.width - total) / 2;
  const y = 236;
  const rects = [];
  for (let i = 0; i < count; i += 1) {
    rects.push({ x: startX + i * (w + gap), y, w, h });
  }
  return rects;
}

/** A small glyph for an upgrade icon id, drawn centred at (x, y). */
export function drawIcon(ctx, icon, x, y, size, color) {
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (icon === 'bolt') {
    ctx.beginPath();
    ctx.moveTo(2, -s);
    ctx.lineTo(-s * 0.6, 2);
    ctx.lineTo(-1, 2);
    ctx.lineTo(-4, s);
    ctx.lineTo(s * 0.6, -2);
    ctx.lineTo(1, -2);
    ctx.closePath();
    ctx.fill();
  } else if (icon === 'rapid') {
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.7 + i * s * 0.7, -s * 0.6);
      ctx.lineTo(-s * 0.1 + i * s * 0.7, 0);
      ctx.lineTo(-s * 0.7 + i * s * 0.7, s * 0.6);
      ctx.stroke();
    }
  } else if (icon === 'boots') {
    ctx.beginPath();
    ctx.moveTo(0, s);
    ctx.lineTo(0, -s * 0.6);
    ctx.moveTo(-s * 0.5, -s * 0.1);
    ctx.lineTo(0, -s * 0.6);
    ctx.lineTo(s * 0.5, -s * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s, s * 0.55);
    ctx.lineTo(-s * 0.4, s * 0.55);
    ctx.moveTo(s * 0.4, s * 0.55);
    ctx.lineTo(s, s * 0.55);
    ctx.stroke();
  } else if (icon === 'heart') {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.8);
    ctx.bezierCurveTo(-s * 1.1, -s * 0.1, -s * 0.6, -s * 0.9, 0, -s * 0.3);
    ctx.bezierCurveTo(s * 0.6, -s * 0.9, s * 1.1, -s * 0.1, 0, s * 0.8);
    ctx.fill();
  } else if (icon === 'orb') {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * 0.45, -0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(s * 0.7, -s * 0.55, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
  } else if (icon === 'nova') {
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.3);
      ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (icon === 'pierce') {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s, s * 0.7);
    ctx.lineTo(s * 0.8, -s * 0.5);
    ctx.moveTo(s * 0.3, -s * 0.5);
    ctx.lineTo(s * 0.8, -s * 0.5);
    ctx.lineTo(s * 0.8, 0);
    ctx.stroke();
  } else if (icon === 'magnet') {
    ctx.beginPath();
    ctx.arc(0, -s * 0.1, s * 0.6, Math.PI, 0, false);
    ctx.lineTo(s * 0.6, s * 0.5);
    ctx.lineTo(s * 0.2, s * 0.5);
    ctx.lineTo(s * 0.2, -s * 0.1);
    ctx.arc(0, -s * 0.1, s * 0.2, 0, Math.PI, true);
    ctx.lineTo(-s * 0.2, s * 0.5);
    ctx.lineTo(-s * 0.6, s * 0.5);
    ctx.closePath();
    ctx.stroke();
  } else if (icon === 'dash') {
    for (let i = 0; i < 3; i += 1) {
      const yy = -s * 0.6 + i * s * 0.6;
      ctx.beginPath();
      ctx.moveTo(-s, yy);
      ctx.lineTo(s * (0.4 - i * 0.15), yy);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(s * 0.5, -s * 0.4);
    ctx.lineTo(s, 0);
    ctx.lineTo(s * 0.5, s * 0.4);
    ctx.closePath();
    ctx.fill();
  } else if (icon === 'thorns') {
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * s * 0.4, Math.sin(a) * s * 0.4);
      ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // mend: a plus in a ring.
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.4, 0);
    ctx.lineTo(s * 0.4, 0);
    ctx.moveTo(0, -s * 0.4);
    ctx.lineTo(0, s * 0.4);
    ctx.stroke();
  }
  ctx.restore();
}

function wrapText(ctx, str, maxWidth) {
  const words = str.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function drawHud(ctx, state, best, muted, nowSec) {
  const player = state.player;
  const progress = Math.min(1, state.time / DAWN_SECONDS);
  // Dawn progress across the very top.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, FIELD.width, 7);
  const dawnFill = ctx.createLinearGradient(0, 0, FIELD.width, 0);
  dawnFill.addColorStop(0, '#ff9a3c');
  dawnFill.addColorStop(1, '#ffd166');
  ctx.fillStyle = dawnFill;
  ctx.fillRect(0, 0, FIELD.width * progress, 7);
  text(ctx, `DAWN IN ${formatTime(timeLeft(state))}`, FIELD.width / 2, 30, '700 17px system-ui, sans-serif', PALE);
  // HP bar, top left.
  const hpPct = Math.max(0, player.hp / player.maxHp);
  roundRect(ctx, 20, 20, 260, 22, 11);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fill();
  roundRect(ctx, 22, 22, 256 * hpPct, 18, 9);
  ctx.fillStyle = hpPct > 0.5 ? '#58c96b' : hpPct > 0.25 ? '#ffd166' : '#ff5d5d';
  ctx.fill();
  text(ctx, `${Math.ceil(player.hp)} / ${player.maxHp} HP`, 150, 31, '700 13px system-ui, sans-serif', '#ffffff');
  // Score, top right.
  text(ctx, formatNumber(state.score), FIELD.width - 20, 30, '700 24px system-ui, sans-serif', '#ffffff', 'right');
  text(ctx, `${state.kills} banished · ${state.embers} embers`, FIELD.width - 20, 54, '13px system-ui, sans-serif', 'rgba(255,255,255,0.75)', 'right');
  // XP bar along the bottom.
  const xpPct = Math.min(1, player.xp / player.xpNext);
  roundRect(ctx, 20, FIELD.height - 26, FIELD.width - 40, 14, 7);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fill();
  roundRect(ctx, 22, FIELD.height - 24, (FIELD.width - 44) * xpPct, 10, 5);
  ctx.fillStyle = GOLD;
  ctx.fill();
  // The XP count sits above the bar: inside it, it would vanish against the
  // unfilled half.
  text(ctx, `${player.xp} / ${player.xpNext} XP`, FIELD.width / 2, FIELD.height - 36, '700 12px system-ui, sans-serif', PALE);
  // Dash cooldown, bottom left above the XP bar; the level sits beside it.
  const dashReady = player.dashCd <= 0;
  const dashPct = dashReady ? 1 : 1 - player.dashCd / (2.1 * state.mods.dashCdMul);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.arc(46, FIELD.height - 62, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = dashReady ? GOLD : 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(46, FIELD.height - 62, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * dashPct);
  ctx.stroke();
  drawIcon(ctx, 'dash', 46, FIELD.height - 62, 20, dashReady ? GOLD : 'rgba(255,255,255,0.5)');
  text(ctx, 'DASH', 46, FIELD.height - 34, '700 10px system-ui, sans-serif', 'rgba(255,255,255,0.7)');
  text(ctx, `LEVEL ${player.level}`, 78, FIELD.height - 62, '700 16px system-ui, sans-serif', GOLD, 'left');
  // Controls hint, bottom right.
  text(ctx, 'WASD move · SPACE dash · P pause · M sound', FIELD.width - 20, FIELD.height - 38, '12px system-ui, sans-serif', 'rgba(255,255,255,0.6)', 'right');
  if (muted) {
    text(ctx, 'SOUND OFF', FIELD.width - 20, 74, '700 12px system-ui, sans-serif', 'rgba(255,255,255,0.6)', 'right');
  }
  // Banner and the low-health pulse belong to live play only: on the level-up
  // screen they would collide with the cards.
  if (state.screen !== SCREEN_PLAY) return;
  if (state.ui.bannerT > 0) {
    ctx.globalAlpha = Math.min(1, state.ui.bannerT);
    text(ctx, state.ui.banner, FIELD.width / 2, 116, 'italic 700 30px Georgia, serif', GOLD);
    ctx.globalAlpha = 1;
  }
  // Low health: the edges bleed red.
  if (hpPct < 0.3 && hpPct > 0) {
    const pulse = 0.1 + 0.07 * Math.sin(nowSec * 6);
    const red = ctx.createRadialGradient(
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.35,
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.8,
    );
    red.addColorStop(0, 'rgba(255,40,40,0)');
    red.addColorStop(1, `rgba(255,40,40,${pulse})`);
    ctx.fillStyle = red;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }
}

export function drawTitle(ctx, state, best, nowSec) {
  ctx.fillStyle = 'rgba(5,6,15,0.58)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  const titleGradient = ctx.createLinearGradient(0, 130, 0, 230);
  titleGradient.addColorStop(0, '#fff3c4');
  titleGradient.addColorStop(1, '#ff9a3c');
  ctx.save();
  ctx.letterSpacing = '10px';
  text(ctx, 'EMBERFALL', FIELD.width / 2, 178, '700 88px Georgia, serif', titleGradient);
  ctx.restore();
  text(ctx, 'Survive the night. Keep the lantern lit.', FIELD.width / 2, 238, 'italic 24px Georgia, serif', PALE);
  if (best.runs > 0) {
    text(
      ctx,
      `Best run: ${formatTime(best.bestTime)} survived · ${formatNumber(best.bestScore)} score · ${best.bestKills} banished`,
      FIELD.width / 2, 272, '15px system-ui, sans-serif', 'rgba(255,255,255,0.75)',
    );
  }
  const pulse = 0.65 + 0.35 * Math.sin(nowSec * 2.4);
  ctx.globalAlpha = pulse;
  text(ctx, '—  PRESS SPACE OR CLICK TO BEGIN  —', FIELD.width / 2, 330, '700 20px system-ui, sans-serif', GOLD);
  ctx.globalAlpha = 1;
  // How to play.
  roundRect(ctx, FIELD.width / 2 - 330, 372, 660, 218, 16);
  ctx.fillStyle = 'rgba(10,13,30,0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,209,102,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(ctx, 'HOW TO PLAY', FIELD.width / 2, 402, '700 16px system-ui, sans-serif', GOLD);
  const rows = [
    ['WASD / ARROWS', 'Move the Lantern Keeper'],
    ['SPACE / SHIFT / CLICK', 'Dash — briefly untouchable'],
    ['LANTERN BOLTS', 'Fire on their own at the nearest shadow'],
    ['EMBERS', 'Collect them to level up and choose blessings'],
    ['DAWN', 'Survive 5 minutes. When the sun rises, you win.'],
  ];
  rows.forEach(([key, desc], i) => {
    const y = 434 + i * 29;
    text(ctx, key, FIELD.width / 2 - 306, y, '700 14px system-ui, sans-serif', PALE, 'left');
    text(ctx, desc, FIELD.width / 2 + 24, y, '14px system-ui, sans-serif', 'rgba(255,255,255,0.85)', 'left');
  });
  text(ctx, 'v1.0 · a game about holding the light', FIELD.width / 2, 668, '12px system-ui, sans-serif', 'rgba(255,255,255,0.45)');
}

export function drawLevelUp(ctx, state, mouse) {
  ctx.fillStyle = 'rgba(5,6,15,0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  text(ctx, 'LEVEL UP', FIELD.width / 2, 132, '700 52px Georgia, serif', GOLD);
  text(ctx, `Level ${state.player.level} — choose a blessing`, FIELD.width / 2, 178, '18px system-ui, sans-serif', PALE);
  const choices = state.ui.levelChoices;
  const rects = levelUpCardRects(choices.length);
  choices.forEach((upgrade, i) => {
    const rect = rects[i];
    const hovered = mouse.inside
      && mouse.x >= rect.x && mouse.x <= rect.x + rect.w
      && mouse.y >= rect.y && mouse.y <= rect.y + rect.h;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 16);
    ctx.fillStyle = hovered ? 'rgba(34,42,78,0.96)' : 'rgba(20,26,51,0.96)';
    ctx.fill();
    ctx.strokeStyle = hovered ? GOLD : 'rgba(255,209,102,0.4)';
    ctx.lineWidth = hovered ? 2.5 : 1.5;
    ctx.stroke();
    drawIcon(ctx, upgrade.icon, rect.x + rect.w / 2, rect.y + 62, 52, GOLD);
    text(ctx, upgrade.name, rect.x + rect.w / 2, rect.y + 118, '700 21px system-ui, sans-serif', '#ffffff');
    const level = levelOf(state, upgrade.id);
    const levelText = upgrade.max === Infinity ? 'BLESSING' : level === 0 ? 'NEW' : `LEVEL ${level + 1} / ${upgrade.max}`;
    text(ctx, levelText, rect.x + rect.w / 2, rect.y + 146, '700 12px system-ui, sans-serif', GOLD);
    ctx.font = '15px system-ui, sans-serif';
    const lines = wrapText(ctx, describeUpgrade(upgrade, state), rect.w - 44);
    lines.forEach((line, j) => {
      text(ctx, line, rect.x + rect.w / 2, rect.y + 178 + j * 22, '15px system-ui, sans-serif', 'rgba(255,255,255,0.85)');
    });
    text(ctx, `Press ${i + 1} or click`, rect.x + rect.w / 2, rect.y + rect.h - 24, '12px system-ui, sans-serif', 'rgba(255,255,255,0.55)');
  });
}

export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(5,6,15,0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  text(ctx, 'PAUSED', FIELD.width / 2, 300, '700 56px Georgia, serif', PALE);
  text(ctx, 'The night waits for no one — except now.', FIELD.width / 2, 352, 'italic 20px Georgia, serif', 'rgba(255,255,255,0.8)');
  text(ctx, 'P / ESC to resume · R to restart · M to mute', FIELD.width / 2, 408, '16px system-ui, sans-serif', GOLD);
}

function drawStats(ctx, state, y) {
  const rows = [
    ['Survived', formatTime(state.time)],
    ['Level reached', String(state.player.level)],
    ['Shadows banished', formatNumber(state.kills)],
    ['Embers gathered', formatNumber(state.embers)],
    ['Score', formatNumber(state.score)],
  ];
  rows.forEach(([label, value], i) => {
    const rowY = y + i * 32;
    text(ctx, label, FIELD.width / 2 - 170, rowY, '16px system-ui, sans-serif', 'rgba(255,255,255,0.75)', 'left');
    text(ctx, value, FIELD.width / 2 + 170, rowY, '700 16px system-ui, sans-serif', '#ffffff', 'right');
  });
  return y + rows.length * 32;
}

export function drawOver(ctx, state, best, isNewBest, nowSec) {
  ctx.fillStyle = 'rgba(24,4,12,0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  text(ctx, 'THE LIGHT FADES', FIELD.width / 2, 168, '700 60px Georgia, serif', '#ff8a8a');
  text(ctx, `The shadows took the hollow at ${formatTime(state.time)}.`, FIELD.width / 2, 218, 'italic 20px Georgia, serif', 'rgba(255,255,255,0.85)');
  const after = drawStats(ctx, state, 288);
  if (isNewBest) {
    text(ctx, '★ NEW BEST SCORE ★', FIELD.width / 2, after + 22, '700 20px system-ui, sans-serif', GOLD);
  } else if (best.runs > 1) {
    text(ctx, `Best score: ${formatNumber(best.bestScore)}`, FIELD.width / 2, after + 22, '15px system-ui, sans-serif', 'rgba(255,255,255,0.7)');
  }
  const pulse = 0.65 + 0.35 * Math.sin(nowSec * 2.4);
  ctx.globalAlpha = pulse;
  text(ctx, 'PRESS R OR CLICK TO TRY AGAIN', FIELD.width / 2, after + 78, '700 19px system-ui, sans-serif', GOLD);
  ctx.globalAlpha = 1;
}

export function drawWin(ctx, state, best, isNewBest, nowSec) {
  ctx.fillStyle = 'rgba(40,25,5,0.62)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  const gradient = ctx.createLinearGradient(0, 120, 0, 220);
  gradient.addColorStop(0, '#fff3c4');
  gradient.addColorStop(1, '#ff9a3c');
  text(ctx, 'DAWN BREAKS', FIELD.width / 2, 168, '700 68px Georgia, serif', gradient);
  text(ctx, 'You kept the lantern lit all night. The hollow is safe.', FIELD.width / 2, 218, 'italic 20px Georgia, serif', 'rgba(255,255,255,0.9)');
  const after = drawStats(ctx, state, 288);
  if (isNewBest) {
    text(ctx, '★ NEW BEST SCORE ★', FIELD.width / 2, after + 22, '700 20px system-ui, sans-serif', GOLD);
  } else if (best.runs > 1) {
    text(ctx, `Best score: ${formatNumber(best.bestScore)}`, FIELD.width / 2, after + 22, '15px system-ui, sans-serif', 'rgba(255,255,255,0.7)');
  }
  const pulse = 0.65 + 0.35 * Math.sin(nowSec * 2.4);
  ctx.globalAlpha = pulse;
  text(ctx, 'PRESS R OR CLICK TO PLAY AGAIN', FIELD.width / 2, after + 78, '700 19px system-ui, sans-serif', GOLD);
  ctx.globalAlpha = 1;
}
