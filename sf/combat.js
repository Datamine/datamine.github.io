import { GAMEPLAY } from './config/gameplay.js';
import { skillStatus, hitpointMaximum } from './progression.js';
import { ITEM_STATS } from './item-stats.js';
export const MAX_HITPOINTS = GAMEPLAY.maxHitpoints;
export const ALIEN_HITPOINTS = 36;
export const SANDWICH_HEALING = ITEM_STATS.sandwich.healing;

const combatLevel = (value) => Math.max(1, Math.min(50, Math.floor(value) || 1));
const combatRandom = (random) => Math.max(0, Math.min(1 - Number.EPSILON, Number(random()) || 0));
/** At 100% inebriation, hit chance is half its sober value. Damage on a
 * successful hit stays intact; sobering up restores accuracy continuously. */
export function inebriationAccuracyMultiplier(percent = 0) {
  return 1 - (0.5 * Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0))) / 100;
}
export function weaponDamageRange(level = 1, weapon = 'unarmed', inebriation = 0) {
  const bonus = combatLevel(level) - 1;
  const item = ITEM_STATS[weapon]?.slot === 'weapon' ? ITEM_STATS[weapon] : ITEM_STATS.unarmed;
  return {
    min: Math.floor(item.min + bonus * item.minPerLevel),
    max: Math.floor(item.max + bonus * item.maxPerLevel),
    accuracy:
      Math.min(item.accuracyCap, item.accuracy + bonus * item.accuracyPerLevel) *
      inebriationAccuracyMultiplier(inebriation),
  };
}
export function rollWeaponDamage(level, weapon, random = Math.random, inebriation = 0) {
  const range = weaponDamageRange(level, weapon, inebriation);
  return combatRandom(random) >= range.accuracy
    ? 0
    : range.min + Math.floor(combatRandom(random) * (range.max - range.min + 1));
}
export function rollEnemyDamage(base, level = 1, random = Math.random, defense = 0) {
  // Broader individual hits, with roughly the same average as the former
  // half-to-full damage roll. Strength still reduces the whole range.
  const power = Math.max(2, base - Math.floor((combatLevel(level) - 1) / 3)),
    min = Math.max(1, Math.floor(power * GAMEPLAY.monsterMinMultiplier)),
    max = Math.ceil(power * GAMEPLAY.monsterMaxMultiplier);
  const hit =
    combatRandom(random) >= GAMEPLAY.monsterHitChance
      ? 0
      : min + Math.floor(combatRandom(random) * (max - min + 1));
  return Math.max(0, hit - (Number.isFinite(defense) ? Math.max(0, Math.floor(defense)) : 0));
}

/** Combat runs on elapsed simulation time, independently of rendering speed. */
export function combatStats(level = 1, bayonet = false) {
  level = Math.max(1, Math.min(50, Math.floor(level) || 1));
  return {
    damage: 2 + Math.floor((level - 1) * 0.8) + (bayonet ? 7 : 0),
    alienDamage: Math.max(3, 7 - Math.floor((level - 1) / 3)),
  };
}
export function createHitpoints(saved = {}, onChange = () => {}) {
  const xp = skillStatus(saved.xp).xp,
    max = hitpointMaximum(xp),
    state = {
      hp: Number.isFinite(saved.hp) ? Math.max(1, Math.min(max, Math.floor(saved.hp))) : max,
      max,
      xp,
      level: skillStatus(xp).level,
    };
  const save = () => onChange({ ...state });
  return {
    state,
    damage(amount) {
      const hit = Math.min(state.hp, Math.max(0, Math.floor(amount)));
      state.hp -= hit;
      save();
      return hit;
    },
    heal(amount = SANDWICH_HEALING) {
      const healed = Math.min(state.max - state.hp, Math.max(0, Math.floor(amount)));
      state.hp += healed;
      save();
      return healed;
    },
    restore() {
      state.hp = state.max;
      save();
    },
  };
}
export function createAlienBattle({
  health,
  level = () => 1,
  defense = () => 0,
  bayonet = false,
  hp = ALIEN_HITPOINTS,
  random = Math.random,
  inebriation = () => 0,
}) {
  const state = {
    hp,
    max: ALIEN_HITPOINTS,
    elapsed: 0,
    nextPlayer: 0.25,
    nextAlien: 0.85,
    ended: false,
  };
  return {
    state,
    update(dt) {
      const events = [];
      if (state.ended || !Number.isFinite(dt) || dt <= 0) return events;
      state.elapsed += dt;
      while (!state.ended && Math.min(state.nextPlayer, state.nextAlien) <= state.elapsed) {
        if (state.nextPlayer <= state.nextAlien) {
          const armed = typeof bayonet === 'function' ? bayonet() : bayonet,
            damage = armed
              ? Math.min(state.hp, rollWeaponDamage(level(), 'bayonet', random, inebriation()))
              : 0;
          state.hp -= damage;
          state.nextPlayer += 1.05;
          events.push({ type: 'player-hit', damage, hp: state.hp });
          if (state.hp === 0) {
            state.ended = true;
            events.push({ type: 'victory' });
          }
        } else {
          const damage = health.damage(rollEnemyDamage(7, level(), random, defense()));
          state.nextAlien += 1.25;
          events.push({ type: 'alien-hit', damage, hp: health.state.hp });
          if (health.state.hp === 0) {
            state.ended = true;
            events.push({ type: 'death' });
          }
        }
      }
      return events;
    },
  };
}
