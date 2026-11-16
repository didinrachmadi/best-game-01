// The best run, kept in localStorage when the browser allows it. Storage can be
// off (private windows, sandboxes): then the best score lasts this visit only and
// nothing here ever throws.

import { BEST_KEY } from './config.js';

export function emptyBest() {
  return { score: 0, time: 0, kills: 0, wins: 0 };
}

export function readBest() {
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    if (!raw) return emptyBest();
    const parsed = JSON.parse(raw);
    return {
      score: Number(parsed.score) || 0,
      time: Number(parsed.time) || 0,
      kills: Number(parsed.kills) || 0,
      wins: Number(parsed.wins) || 0,
    };
  } catch {
    return emptyBest();
  }
}

export function saveBest(best) {
  try {
    window.localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {
    // Storage unavailable: the best score simply does not persist.
  }
}

/** Fold one finished run into the best record; returns the updated best. */
export function recordRun(best, run) {
  const next = {
    score: Math.max(best.score, run.score),
    time: Math.max(best.time, run.time),
    kills: Math.max(best.kills, run.kills),
    wins: best.wins + (run.won ? 1 : 0),
  };
  saveBest(next);
  return next;
}
