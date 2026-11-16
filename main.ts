// Emberfall — the entry program (Node 22, standard library only).
//
// It hands the game in: copies game/ and screenshots/ from beside this file into
// the output directory and writes dossier.json there with the vendored make.fun
// library, the summary the judge reads. Deterministic — the same repo always
// produces the same output bytes. No network, no build step.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// (Inside the grader's container the output directory is /output.)

import { cp, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps (reference/gate.json): text_max_bytes shapes the dossier
// bytes; the rest refuse an entry the scorer would refuse.
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

async function main() {
  await mkdir(out, { recursive: true });
  await cp(join(here, 'game'), join(out, 'game'), { recursive: true });
  await mkdir(join(out, 'screenshots'), { recursive: true });
  if (existsSync(join(here, 'screenshots'))) {
    await cp(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
  }
  await writeFile(join(out, 'dossier.json'), buildDossier(out, DOSSIER_LIMITS));
  console.log(`Emberfall entry written to ${out}`);
}

await main();
