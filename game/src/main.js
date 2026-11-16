// Boot and the frame loop. Input is read once a frame, the sim runs on a fixed
// 60 Hz step, and the renderer draws the world plus the overlay for the current
// screen. Screenshot scenes (?shot=) are staged before the first frame.

import {
  createGame, resetGame,
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_LEVELUP, SCREEN_PAUSED, SCREEN_OVER, SCREEN_WIN,
} from './state.js';
import {
  createInput,
  ACTION_CONFIRM, ACTION_DASH, ACTION_PAUSE, ACTION_MUTE, ACTION_RESTART,
  ACTION_CHOICE_1, ACTION_CHOICE_2, ACTION_CHOICE_3,
} from './input.js';
import { createRenderer } from './render.js';
import { createAudio } from './audio.js';
import { step, checkLevelUp } from './world.js';
import { applyUpgrade } from './upgrades.js';
import { readBest, recordRun } from './storage.js';
import {
  drawHud, drawTitle, drawLevelUp, drawPaused, drawOver, drawWin, levelUpCardRects,
} from './screens.js';
import { updateParticles } from './particles.js';
import { applyShotScene } from './shots.js';

const STEP = 1 / 60;
const MUTE_KEY = 'emberfall-muted-v1';
/** Seconds an end screen shows before it accepts restart input. */
const RESTART_DELAY = 0.8;

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);
const input = createInput(canvas);
const audio = createAudio();
input.setMapper((x, y) => renderer.toLogical(x, y));
renderer.resize();
window.addEventListener('resize', () => renderer.resize());

try {
  audio.setMuted(window.localStorage.getItem(MUTE_KEY) === '1');
} catch {
  // Storage may be unavailable; sound just stays on.
}
window.addEventListener('pointerdown', () => audio.unlock());
window.addEventListener('keydown', () => audio.unlock());

const params = new URLSearchParams(window.location.search);
const seedParam = Number.parseInt(params.get('seed'), 10);
const state = createGame(Number.isFinite(seedParam) ? seedParam : 1);
let best = readBest();
let isNewBest = false;
let runRecorded = true;
let screenEnteredAt = performance.now();
let pendingDash = false;
let pendingDashTarget = null;
let ambientT = 0;
let frames = 0;

const shotMode = applyShotScene(state, params);
if (shotMode) runRecorded = true; // staged scenes never touch the best run

function setScreen(screen) {
  state.screen = screen;
  screenEnteredAt = performance.now();
}

function startRun() {
  const seed = Number.isFinite(seedParam)
    ? seedParam
    : (Date.now() % 2147483647);
  resetGame(state, seed);
  runRecorded = false;
  isNewBest = false;
  pendingDash = false;
  pendingDashTarget = null;
  setScreen(SCREEN_PLAY);
  state.ui.banner = 'Survive until dawn';
  state.ui.bannerT = 2.6;
}

function handleFrame(now) {
  const dtRaw = Math.min(0.1, (now - last) / 1000);
  last = now;
  const actions = input.takeActions();
  const click = input.takeClick();
  const wasPlaying = state.screen === SCREEN_PLAY;

  if (actions & ACTION_MUTE) {
    const next = !audio.isMuted();
    audio.setMuted(next);
    try {
      window.localStorage.setItem(MUTE_KEY, next ? '1' : '0');
    } catch {
      // Ignore storage failures.
    }
  }
  if (actions & ACTION_PAUSE) {
    if (state.screen === SCREEN_PLAY) setScreen(SCREEN_PAUSED);
    else if (state.screen === SCREEN_PAUSED) setScreen(SCREEN_PLAY);
  }

  switch (state.screen) {
    case SCREEN_TITLE: {
      ambientT -= dtRaw;
      if (ambientT <= 0) {
        ambientT = 0.35;
        state.particles.push({
          kind: 'spark',
          x: state.rng.range(60, 1220),
          y: 712,
          vx: state.rng.range(-8, 8),
          vy: state.rng.range(-42, -18),
          life: 2.6,
          maxLife: 2.6,
          size: state.rng.range(1.8, 3),
          color: '#ffd166',
          drag: 0,
          gravity: -6,
        });
      }
      updateParticles(state, dtRaw);
      if ((actions & ACTION_CONFIRM) || click) {
        audio.unlock();
        audio.click();
        startRun();
      }
      break;
    }
    case SCREEN_PLAY: {
      const move = input.direction();
      if (wasPlaying && (actions & ACTION_DASH)) {
        pendingDash = true;
        if (click) pendingDashTarget = { x: click.x, y: click.y };
      }
      acc += dtRaw;
      let guard = 0;
      while (acc >= STEP && guard < 5) {
        const dashNow = guard === 0 && pendingDash;
        step(state, {
          move,
          dash: dashNow,
          dashTarget: dashNow ? pendingDashTarget : null,
        }, STEP, audio);
        if (dashNow) {
          pendingDash = false;
          pendingDashTarget = null;
        }
        acc -= STEP;
        guard += 1;
        if (state.screen !== SCREEN_PLAY) break;
      }
      if (acc > STEP * 5) acc = 0;
      break;
    }
    case SCREEN_LEVELUP: {
      updateParticles(state, dtRaw);
      let choice = -1;
      if (actions & ACTION_CHOICE_1) choice = 0;
      else if (actions & ACTION_CHOICE_2) choice = 1;
      else if (actions & ACTION_CHOICE_3) choice = 2;
      else if (click) {
        const rects = levelUpCardRects(state.ui.levelChoices.length);
        rects.forEach((rect, i) => {
          if (click.x >= rect.x && click.x <= rect.x + rect.w
            && click.y >= rect.y && click.y <= rect.y + rect.h) choice = i;
        });
      }
      if (choice >= 0 && choice < state.ui.levelChoices.length) {
        audio.click();
        applyUpgrade(state, state.ui.levelChoices[choice].id);
        if (!checkLevelUp(state, audio)) setScreen(SCREEN_PLAY);
      }
      break;
    }
    case SCREEN_PAUSED: {
      if ((actions & ACTION_RESTART) || click) {
        audio.click();
        startRun();
      } else if (actions & ACTION_CONFIRM) {
        setScreen(SCREEN_PLAY);
      }
      break;
    }
    case SCREEN_OVER:
    case SCREEN_WIN: {
      updateParticles(state, dtRaw);
      const elapsed = (now - screenEnteredAt) / 1000;
      if (elapsed > RESTART_DELAY && ((actions & (ACTION_RESTART | ACTION_CONFIRM)) || click)) {
        audio.click();
        startRun();
      }
      break;
    }
    default:
      break;
  }

  if ((state.screen === SCREEN_OVER || state.screen === SCREEN_WIN) && !runRecorded) {
    runRecorded = true;
    const result = recordRun(best, state);
    best = result.best;
    isNewBest = result.isNewBest;
  }

  const nowSec = now / 1000;
  renderer.frame(state, (ctx) => {
    if (state.screen === SCREEN_PLAY || state.screen === SCREEN_LEVELUP || state.screen === SCREEN_PAUSED) {
      drawHud(ctx, state, best, audio.isMuted(), nowSec);
    }
    if (state.screen === SCREEN_TITLE) drawTitle(ctx, state, best, nowSec);
    else if (state.screen === SCREEN_LEVELUP) drawLevelUp(ctx, state, input.mouse());
    else if (state.screen === SCREEN_PAUSED) drawPaused(ctx);
    else if (state.screen === SCREEN_OVER) drawOver(ctx, state, best, isNewBest, nowSec);
    else if (state.screen === SCREEN_WIN) drawWin(ctx, state, best, isNewBest, nowSec);
  });

  frames += 1;
  if (shotMode && frames === 2) window.__shotReady = true;
}

let last = performance.now();
let acc = 0;

function loop(now) {
  handleFrame(now);
  window.requestAnimationFrame(loop);
}

window.__emberfall = { state, get best() { return best; } };
window.requestAnimationFrame(loop);
