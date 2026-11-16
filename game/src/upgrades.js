// The level-up blessings: ten upgrades, most of them stackable, each with a
// plain-language card. A level-up offers three distinct choices the player has
// not maxed out yet; when everything is maxed, the lantern simply mends them.

export const MEND = {
  id: 'mend',
  name: 'Ember Mend',
  icon: 'mend',
  max: Infinity,
  describe: () => 'Restore 50 HP now.',
  canOffer: () => true,
  apply(state) {
    const player = state.player;
    player.hp = Math.min(player.maxHp, player.hp + 50);
  },
};

export const UPGRADES = [
  {
    id: 'bright-bolt',
    name: 'Bright Bolt',
    icon: 'bolt',
    max: 5,
    describe: () => '+25% lantern bolt damage.',
    canOffer: () => true,
    apply(state) { state.mods.damage *= 1.25; },
  },
  {
    id: 'rapid-wick',
    name: 'Rapid Wick',
    icon: 'rapid',
    max: 5,
    describe: () => 'Bolts fly 18% faster.',
    canOffer: () => true,
    apply(state) { state.mods.fireRate *= 1.18; },
  },
  {
    id: 'swift-boots',
    name: 'Swift Boots',
    icon: 'boots',
    max: 4,
    describe: () => '+12% movement speed.',
    canOffer: () => true,
    apply(state) { state.mods.moveSpeed *= 1.12; },
  },
  {
    id: 'heart-ember',
    name: 'Heart Ember',
    icon: 'heart',
    max: 5,
    describe: () => '+25 max HP, and heal 30 now.',
    canOffer: () => true,
    apply(state) {
      state.player.maxHp += 25;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 30);
    },
  },
  {
    id: 'orbit-flames',
    name: 'Orbiting Flames',
    icon: 'orb',
    max: 4,
    describe: (level) => (level === 0
      ? 'A flame orbits you, burning what it touches.'
      : '+1 orbiting flame.'),
    canOffer: () => true,
    apply(state) { state.mods.orbCount += 1; },
  },
  {
    id: 'nova-burst',
    name: 'Nova Burst',
    icon: 'nova',
    max: 4,
    describe: (level) => (level === 0
      ? 'Every few seconds, a ring of fire bursts from you.'
      : 'Nova hits 30% harder and 12% sooner.'),
    canOffer: () => true,
    apply(state) { state.mods.novaLevel += 1; },
  },
  {
    id: 'piercing-light',
    name: 'Piercing Light',
    icon: 'pierce',
    max: 3,
    describe: () => 'Bolts pierce through +1 foe.',
    canOffer: () => true,
    apply(state) { state.mods.pierce += 1; },
  },
  {
    id: 'ember-magnet',
    name: 'Ember Magnet',
    icon: 'magnet',
    max: 3,
    describe: () => 'Embers fly to you from 55% further.',
    canOffer: () => true,
    apply(state) { state.mods.magnet *= 1.55; },
  },
  {
    id: 'quicksilver-dash',
    name: 'Quicksilver Dash',
    icon: 'dash',
    max: 3,
    describe: () => 'Dash recharges 22% faster.',
    canOffer: () => true,
    apply(state) { state.mods.dashCdMul *= 0.78; },
  },
  {
    id: 'thorn-lantern',
    name: 'Thorn Lantern',
    icon: 'thorns',
    max: 3,
    describe: (level) => (level === 0
      ? 'Foes that touch you take 12 damage.'
      : 'Thorns bite 8 harder.'),
    canOffer: () => true,
    apply(state) { state.mods.thorns += state.mods.thorns === 0 ? 12 : 8; },
  },
];

/** Times the upgrade has been taken this run (0 when never). */
export function levelOf(state, id) {
  return state.upgrades[id] || 0;
}

/** The card text for taking this upgrade next, at its current level. */
export function describeUpgrade(upgrade, state) {
  return upgrade.describe(levelOf(state, upgrade.id));
}

/** Take an upgrade: apply its effect and count it. */
export function applyUpgrade(state, id) {
  const upgrade = id === MEND.id ? MEND : UPGRADES.find((u) => u.id === id);
  if (!upgrade) return;
  upgrade.apply(state);
  state.upgrades[id] = levelOf(state, id) + 1;
}

/**
 * Roll `count` distinct choices from the upgrades not yet maxed. When nothing is
 * left to offer, the lantern offers a mend instead.
 */
export function rollChoices(state, count = 3) {
  const available = UPGRADES.filter((u) => levelOf(state, u.id) < u.max);
  if (available.length === 0) return [MEND];
  const pool = available.slice();
  const choices = [];
  while (choices.length < count && pool.length > 0) {
    const at = Math.floor(state.rng.next() * pool.length);
    choices.push(pool.splice(at, 1)[0]);
  }
  return choices;
}
