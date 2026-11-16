# Emberfall

[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/c/best-game-01)
[![rank](https://make.fun/badge/best-game-01/didinrachmadi/best-game-01/rank.svg)](https://make.fun/c/best-game-01)
[![reward](https://make.fun/badge/best-game-01/didinrachmadi/best-game-01/reward.svg)](https://make.fun/c/best-game-01)

**Emberfall** is a top-down arena survival game for the [make.fun best-game-01](https://make.fun/c/best-game-01) bounty. You are the Lantern Keeper, alone in a dark hollow. Shadows rise all night; your lantern fires bolts on its own, and your job is to stay alive until dawn breaks — five minutes away.

## How to play

- **WASD / Arrow keys** — move
- **Space / Shift / Click** — dash (briefly untouchable, toward the click point)
- **1 / 2 / 3 or click** — choose a blessing on level-up
- **P / Esc** — pause · **R** — restart · **M** — mute

Collect the embers shadows drop to level up and choose from ten blessings: brighter bolts, orbiting flames, a nova burst, piercing light, thorns, and more. Five kinds of shadow hunt you — drifting wisps, skittering spikes, spitters that shoot back, armoured bulwarks, and wraiths that telegraph a lunge — and an elite, crowned and twice as hard, stirs every minute. Survive 300 seconds and dawn breaks; fall, and the light fades. Your best run is kept on the title screen.

## Play it

No build step, no network, no libraries — plain static files plus WebAudio sound, all synthesized in the browser.

```sh
node serve.ts
# open http://localhost:8080
```

Screenshot scenes (deterministic staged states, for the entry's screenshots):

```sh
http://localhost:8080/?shot=play&seed=7
http://localhost:8080/?shot=levelup&seed=7
http://localhost:8080/?shot=boss&seed=7
http://localhost:8080/?shot=win&seed=7
```

## Layout

```
game/
  index.html          the shell: a full-viewport canvas
  src/
    main.js           boot + frame loop + screen transitions
    config.js         tuning: field, player, weapons, enemies, director
    state.js          the single game-state store
    world.js          the sim step: collisions, pickups, level-up, win/lose
    player.js         movement + dash
    enemies.js        five enemy kinds + the spawn director + elites
    weapons.js        auto-fire bolts, orbiting flames, nova burst
    upgrades.js       the ten level-up blessings
    particles.js      sparks, smoke, rings, floating numbers, screen shake
    audio.js          synthesized WebAudio sound + music (no audio files)
    render.js         the night field, creatures, keeper, particles
    screens.js        HUD, title, level-up cards, pause, end screens
    input.js          keyboard + mouse
    random.js         seeded RNG (mulberry32)
    storage.js        best-run persistence (localStorage)
    shots.js          deterministic screenshot scenes (?shot=)
main.ts               the entry program: copies game/ + screenshots/ to the
                      output directory and writes dossier.json
serve.ts              tiny local static server for development
shots.json            the four screenshot scenes and their queries
screenshots/          the entry's screenshots (cover first by name)
vendor/               the make.fun dossier library, copied unchanged from the kit
```

## Build the entry

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/game/`, `out/screenshots/` and `out/dossier.json`, the summary the judge reads.

## License

MIT — see [LICENSE](LICENSE).
