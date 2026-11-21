import { requiredValue } from './types/assert.ts';
import { isFiniteNumber } from './types/json.ts';
interface ExpeditionDialogueController {
  state: ExpeditionState;
  ship: { aboard: boolean; phase: string };
  startQuest: () => ActionReceipt | Promise<ActionReceipt>;
  finishQuest: () => ActionReceipt | Promise<ActionReceipt>;
  returnShip: () => boolean | ActionReceipt | Promise<ActionReceipt>;
  board: () => ActionReceipt | Promise<ActionReceipt>;
}
import type { WorldPoint } from './types/geometry.ts';
import type {
  ExpeditionState,
  ExpeditionPrey,
  ExpeditionOptions,
  ExpeditionLoot,
  ExpeditionEvent,
} from './types/expeditions.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { MONSTER_STATS, rollMonsterDrops } from './monster-drops.ts';
import { ITEM_STATS, weaponAttackInterval } from './item-stats.ts';
import { JURASSIC, cowSpawns, PEQUOD, KRAKEN_CAPE_TEXT } from './jurassic-layout.ts';
import { rollWeaponDamage, rollEnemyDamage } from './combat.ts';
import type { ActionReceipt, Actor, RuntimeDialogue } from './types/world.ts';

export const RAILGUN_RANGE = ITEM_STATS.railgun.range,
  RAILGUN_DAMAGE = 10,
  RAILGUN_INTERVAL = ITEM_STATS.railgun.interval;
const distance = (a: WorldPoint, b: WorldPoint) => Math.hypot(a.x - b.x, a.z - b.z);
/** Combat, drops and journeys use simulation time, not draw calls. Routes are
 * supplied by the production adjacency graph and refreshed at most twice/s. */
export function createExpeditions({
  saved = {},
  onSave = () => {},
  health,
  economy,
  food = () => {},
  hasBayonet = () => false,
  level = () => 1,
  defense = () => 0,
  inebriation = () => 0,
  sharedWorld = () => false,
  player = () => ({ x: 0, z: 0, base: 0, eligible: true }),
  pedestrians = () => [],
  routeTo = () => null,
  canTravel = () => false,
  lineClear = () => true,
  random = Math.random,
  onEvent = () => {},
  consumeShot = () => ({ ok: true }),
}: ExpeditionOptions = {}) {
  const stages: readonly string[] = ['not-started', 'escaped', 'carrying', 'completed'];
  const state: ExpeditionState = {
    raptor:
      typeof saved.raptor === 'string' && stages.includes(saved.raptor)
        ? saved.raptor
        : 'not-started',
    railgun: saved.railgun === true,
    armed: false,
    cape: saved.cape === true,
    krakenStarted:
      saved.krakenStarted === true || saved.krakenDefeated === true || saved.krakenReward === true,
    krakenDefeated: saved.krakenDefeated === true,
    krakenReward: saved.krakenReward === true,
    equipped: saved.equipped !== false,
    target: null,
    clock: 0,
    cooldown: 0,
    beams: [],
    splats: [],
    loot: [],
    victims: [],
  };
  if (state.raptor !== 'not-started') state.railgun = true;
  if (state.krakenReward) {
    state.cape = true;
    state.krakenDefeated = true;
  }
  const raptor: Actor & {
    hp: number;
    max: number;
    path: WorldPoint[];
    replan: number;
    attackIn: number;
    prey: ExpeditionPrey | { isPlayer: boolean } | null;
    phase: string;
    release: number;
    angle: number;
  } = {
    id: 'jurassic-raptor',
    combatKind: 'raptor',
    label: contentText('jurassic.createExpeditions.label-1', {}),
    description: contentText('jurassic.createExpeditions.description-2', {}),
    x: JURASSIC.cage.x,
    z: JURASSIC.cage.z,
    hp: MONSTER_STATS.raptor.hp,
    max: MONSTER_STATS.raptor.hp,
    angle: Math.PI / 2,
    path: [],
    replan: 0,
    attackIn: 1,
    prey: null,
    phase:
      state.raptor === 'escaped' ? 'loose' : state.raptor === 'not-started' ? 'caged' : 'recovered',
    release: 0,
  };
  if (raptor.phase === 'loose') Object.assign(raptor, JURASSIC.exit);
  const cows = cowSpawns().map(
    (c): Actor & { homeX: number; homeZ: number; hp: number; max: number; respawn: number } => ({
      ...c,
      description: contentText('jurassic.createExpeditions.description-3', {}),
      homeX: c.x,
      homeZ: c.z,
      hp: MONSTER_STATS.cow.hp,
      max: MONSTER_STATS.cow.hp,
      respawn: 0,
    }),
  );
  const ship: {
    phase: string;
    home: WorldPoint | null;
    x: number;
    z: number;
    progress: number;
    attackIn: number;
    aboard: boolean;
    returnX?: number;
    angle?: number;
  } = {
    phase: 'moored',
    home: null,
    x: 0,
    z: PEQUOD.z,
    progress: 0,
    attackIn: 3.5,
    aboard: false,
  };
  const kraken: Actor & { hp: number; max: number; visible: boolean; enraged: boolean } = {
    id: 'pacific-kraken',
    combatKind: 'kraken',
    label: contentText('jurassic.createExpeditions.label-4', {}),
    description: contentText('jurassic.createExpeditions.description-5', {}),
    x: 0,
    z: PEQUOD.z,
    hp: MONSTER_STATS.kraken.hp,
    max: MONSTER_STATS.kraken.hp,
    visible: false,
    enraged: false,
  };
  let serial = 0;
  const save = () =>
    onSave({
      raptor: state.raptor,
      railgun: state.railgun,
      equipped: state.equipped,
      cape: state.cape,
      krakenStarted: state.krakenStarted,
      krakenDefeated: state.krakenDefeated,
      krakenReward: state.krakenReward,
    });
  const event = (
    type: string,
    message: string | null,
    extra: Omit<ExpeditionEvent, 'type' | 'message'> = {},
  ) => onEvent({ type, message, ...extra });
  const drop = (kind: string, x: number, z: number, amount = 1) => {
    const item = {
      id: 'expedition-loot-' + ++serial,
      kind: 'loot',
      lootKind: kind,
      label:
        kind === 'coins'
          ? contentText('jurassic.drop.label-6.yes', { v0: amount })
          : kind === 'sandwich'
            ? contentText('jurassic.drop.label-6.no.yes', {})
            : kind === 'raptor'
              ? contentText('jurassic.drop.label-6.no.no.yes', {})
              : contentText('jurassic.drop.label-6.no.no.no', {}),
      x,
      z,
      amount,
      expires: kind === 'raptor' || kind === 'kraken' ? Infinity : state.clock + 120,
      description:
        kind === 'raptor'
          ? 'The emergency recovery protocol is now considerably less mobile.'
          : kind === 'sandwich'
            ? 'A sandwich. Store it in your food bag and eat it to recover hitpoints.'
            : kind === 'kraken'
              ? KRAKEN_CAPE_TEXT
              : 'Loose coins, awaiting a less theoretical owner.',
    };
    state.loot.push(item);
    return item;
  };
  function dropMonster(kind: string, x: number, z: number) {
    // Keep the hunt reward on the open deck beside the hunter. At the
    // ship's center the mast hides the tiny loot mesh from the camera.
    if (kind === 'kraken') {
      x -= 0.8;
      z -= 0.6;
    }
    for (const record of rollMonsterDrops(kind, random))
      Object.assign(drop(record.lootKind, x, z, record.amount), record);
  }
  function killRaptor(by = 'player') {
    if (raptor.phase !== 'loose') return;
    raptor.hp = 0;
    raptor.phase = 'dead';
    raptor.path = [];
    state.target = null;
    dropMonster('raptor', raptor.x, raptor.z);
    event(
      'raptor-dead',
      by === 'player' ? 'The velociraptor falls.' : 'A citizen defeats the velociraptor!',
    );
  }
  function startQuest() {
    if (state.raptor !== 'not-started')
      return { ok: false, message: 'Your recovery assignment is already in the Quest Menu.' };
    state.raptor = 'escaped';
    state.railgun = true;
    state.equipped = true;
    raptor.phase = 'releasing';
    raptor.release = 0;
    save();
    event(
      'released',
      'The scientist hands you a railgun and opens the cage. The velociraptor is loose! Click it to fire from up to five tiles away.',
    );
    return { ok: true, message: 'Railgun issued. Emergency recovery protocol initiated.' };
  }
  function recover() {
    if (state.raptor !== 'escaped' || raptor.phase !== 'dead') return { ok: false };
    state.raptor = 'carrying';
    raptor.phase = 'recovered';
    state.loot = state.loot.filter((l) => l.lootKind !== 'raptor');
    save();
    return {
      ok: true,
      message: 'You recover the velociraptor remains.',
    };
  }
  function finishQuest() {
    if (state.raptor !== 'carrying')
      return { ok: false, message: 'Recover the velociraptor first.' };
    state.raptor = 'completed';
    save();
    return {
      ok: true,
      message:
        '“This was a good test of the raptor escape and emergency recovery protocol.” Quest complete. You keep the railgun.',
    };
  }
  function setHarbor(home: WorldPoint) {
    ship.home = { ...home };
    ship.x = home.x;
    ship.z = home.z;
  }
  function board() {
    if (!state.railgun)
      return {
        ok: false,
        message: 'Ahab refuses to board you without a sufficiently powerful weapon.',
      };
    if (ship.aboard) return { ok: false };
    if (state.krakenReward)
      return {
        ok: false,
        message:
          'Ahab is still writing the incident report. You already claimed the kraken’s reward.',
      };
    state.krakenStarted = true;
    save();
    ship.aboard = true;
    ship.phase = 'outbound';
    ship.progress = 0;
    ship.attackIn = 3.5;
    kraken.hp = MONSTER_STATS.kraken.hp;
    kraken.enraged = false;
    state.target = null;
    event('boarded', 'You board the Pequod. Ahab sets sail into the western Pacific.');
    return { ok: true, message: 'All aboard the Pequod.' };
  }
  function returnShip() {
    if (!ship.aboard) return false;
    state.target = null;
    ship.phase = 'inbound';
    ship.progress = 0;
    ship.returnX = ship.x;
    kraken.visible = false;
    return true;
  }
  function abandonShip() {
    ship.aboard = false;
    ship.phase = 'moored';
    if (ship.home) {
      ship.x = ship.home!.x;
      ship.z = ship.home.z;
    }
    kraken.visible = false;
    state.target = null;
  }
  function collect(item: ExpeditionLoot) {
    if (!state.loot.includes(item))
      return { ok: false, message: 'That loot has already been collected.' };
    if (item.lootKind === 'raptor') return recover();
    if (item.lootKind === 'coins') economy!.credit(item.amount);
    if (item.lootKind === 'sandwich') food(1);
    if (item.lootKind === 'kraken') {
      if (state.krakenReward) return { ok: false };
      economy!.credit(ITEM_STATS.kraken.coins);
      state.krakenReward = true;
      state.cape = true;
      save();
      event(
        'cape',
        'You collect 100 coins and a commemorative cape. Equip it in Character settings.',
      );
    }
    state.loot.splice(state.loot.indexOf(item), 1);
    return {
      ok: true,
      message:
        item.lootKind === 'sandwich'
          ? 'You store a sandwich in your food bag.'
          : item.lootKind === 'kraken'
            ? '100 coins and one lousy cape.'
            : 'You pick up ' + item.amount + ' coins.',
    };
  }
  function shoot(
    target: Actor | null,
    origin = player(),
    weapon = state.weapon || 'railgun',
  ): { ok: boolean; message?: string; cooldown?: boolean; damage?: number } {
    if (ITEM_STATS[weapon]?.slot !== 'weapon')
      return { ok: false, message: 'That weapon is unavailable.' };
    if (
      (weapon === 'railgun' && (!state.railgun || !state.equipped)) ||
      ((['battleaxe', 'akibo'] satisfies [string, string]).includes(weapon) &&
        !economy!.state.ownedEquipment.includes(weapon)) ||
      (weapon === 'bayonet' && !hasBayonet())
    )
      return {
        ok: false,
        message: 'You do not have a suitable weapon equipped.',
      };
    if (state.cooldown > 1e-8) return { ok: false, cooldown: true };
    if (
      !target ||
      target.hp === 0 ||
      target.expeditionDead ||
      distance(origin, target) > (ITEM_STATS[weapon]?.range || 0) + 0.001 ||
      !lineClear(origin, target)
    )
      return { ok: false, message: 'Move within weapon range with a clear line of attack.' };
    if (
      (target.combatKind === 'raptor' && raptor.phase !== 'loose') ||
      (target.combatKind === 'kraken' && (!ship.aboard || ship.phase !== 'fighting'))
    )
      return { ok: false, message: 'There is no active target.' };
    const supply = consumeShot(weapon);
    if (!supply.ok) {
      state.target = null;
      return supply;
    }
    state.cooldown = weaponAttackInterval(weapon, economy!.state) + Math.min(0, state.cooldown);
    const kind = target.combatKind || 'pedestrian',
      damage = (['spectre', 'pedestrian'] satisfies [string, string]).includes(kind)
        ? 0
        : Math.min(target.hp!, rollWeaponDamage(level(), weapon, random, inebriation()));
    if ((['railgun', 'akibo'] satisfies [string, string]).includes(weapon))
      state.beams.push({
        from: { x: origin.x, y: (origin.base || 0) + 1.14, z: origin.z },
        to: {
          x: target.x,
          y: (target.base || 0) + (target.combatKind === 'kraken' ? 1.35 : 0.9),
          z: target.z,
        },
        ttl: 0.22,
      });
    state.splats.push({ target, damage, ttl: 0.8 });
    event('shot', null, {
      target,
      damage,
      hp: isFiniteNumber(target.hp) ? target.hp! - damage : 1,
      max: target.max || target.hp || 1,
    });
    if (kind === 'pedestrian') {
      state.target = null;
      event('illegal', 'You fire at a pedestrian. The police are on their way!', { target });
      return { ok: true, damage: 0 };
    }
    if (kind === 'spectre')
      return {
        ok: true,
        damage: 0,
        message: '0 — the blue beam passes through the alien.',
      };
    target.hp! -= damage;
    if (!target.hp) {
      if (target === raptor) killRaptor();
      else if (target.combatKind === 'cow') {
        target.respawn = MONSTER_STATS.cow.respawn;
        state.target = null;
        dropMonster('cow', target.x, target.z);
        event('cow-down', 'The cow drops a sandwich.');
      } else if (target === kraken) {
        state.target = null;
        ship.phase = 'victory';
        state.krakenDefeated = true;
        save();
        dropMonster('kraken', ship.x, ship.z);
        event(
          'kraken-dead',
          'The kraken sinks beneath the waves. Collect its spoils from the deck, then speak to Ahab to return.',
        );
      }
    }
    return { ok: true, damage };
  }
  function attack(target: Actor | null, weapon = 'railgun') {
    state.target = target;
    state.weapon = weapon;
    return shoot(target, player(), weapon);
  }
  function damagePlayer(amount: number, source: string, target: Actor) {
    const damage = health!.damage(rollEnemyDamage(amount, level(), random, defense()));
    event('damage', null, { damage, target, hp: health!.state.hp, max: health!.state.max });
    if (!health!.state.hp) {
      state.target = null;
      event('death', 'You have died and respawned at UCSF Hospital');
    }
  }
  function advance(dt: number) {
    state.clock += dt;
    state.cooldown = Math.max(state.target ? -0.05 : 0, state.cooldown - dt);
    for (const b of state.beams) b.ttl -= dt;
    state.beams = state.beams.filter((b) => b.ttl > 0);
    for (const s of state.splats) s.ttl -= dt;
    state.splats = state.splats.filter((s) => s.ttl > 0);
    state.loot = state.loot.filter((l) => l.expires > state.clock);
    for (const v of state.victims)
      if (v.until <= state.clock) {
        v.npc.expeditionDead = false;
        v.npc.hold = 0;
      }
    state.victims = state.victims.filter((v) => v.until > state.clock);
    if (!sharedWorld())
      for (const c of cows)
        if (!c.hp) {
          c.respawn = Math.max(0, c.respawn - dt);
          if (c.respawn <= 1e-8) {
            c.hp = c.max;
            event('cow-respawn', null);
          }
        }
    const p = player();
    p.isPlayer = true;
    if (ship.aboard) {
      if (ship.phase === 'outbound') {
        ship.progress = Math.min(1, ship.progress + dt / 6);
        const t = ship.progress * ship.progress * (3 - 2 * ship.progress);
        ship.x = ship.home!.x - PEQUOD.travel * t;
        if (ship.progress >= 1 - 1e-8) {
          ship.progress = 1;
          ship.phase = state.krakenDefeated ? 'victory' : 'fighting';
          kraken.visible = !state.krakenDefeated;
          kraken.x = ship.x - 4.4;
          kraken.z = ship.z;
          if (
            state.krakenDefeated &&
            !state.krakenReward &&
            !state.loot.some((l) => l.lootKind === 'kraken')
          )
            dropMonster('kraken', ship.x, ship.z);
          event(
            'kraken-arrived',
            'Ahab: “Moby Dick was too hard. We’ll just hunt the kraken instead.” Click the kraken to fire. Stronger hunters hit harder.',
          );
        }
      } else if (ship.phase === 'inbound') {
        ship.progress = Math.min(1, ship.progress + dt / 5);
        ship.x = ship.returnX! + (ship.home!.x - ship.returnX!) * ship.progress;
        if (ship.progress >= 1 - 1e-8) {
          ship.progress = 1;
          abandonShip();
          event('disembarked', 'The Pequod returns you to the beach.');
        }
      } else if (ship.phase === 'fighting' && p.eligible) {
        const stats = MONSTER_STATS.kraken;
        if (!kraken.enraged && kraken.hp <= kraken.max * stats.enrageAt) {
          kraken.enraged = true;
          ship.attackIn = Math.min(ship.attackIn, stats.enrageInterval);
          event(
            'kraken-enraged',
            'The kraken is enraged! Its tentacles strike faster and harder. Ahab: “I may have underestimated the squid.”',
          );
        }
        ship.attackIn -= dt;
        if (ship.attackIn <= 1e-8) {
          ship.attackIn += kraken.enraged ? stats.enrageInterval : stats.interval;
          damagePlayer(
            stats.damage + (kraken.enraged ? stats.enrageDamageBonus : 0),
            'The kraken',
            kraken,
          );
        }
      }
    }
    if (
      state.target &&
      p.eligible &&
      state.cooldown <= 1e-8 &&
      (!sharedWorld() ||
        !(['cow', 'raptor'] satisfies [string, string]).includes(state.target.combatKind || ''))
    ) {
      if (
        distance(p, state.target) <=
        (ITEM_STATS[state.weapon || 'railgun']?.range || 0) + 0.001
      ) {
        const result = shoot(state.target, p);
        if (!result.ok && !result.cooldown) state.target = null;
      } else state.target = null;
    }
    if (state.target?.combatKind === 'spectre' && p.eligible && distance(p, state.target) < 1.8) {
      state.spectreAttack = (state.spectreAttack || 0) + dt;
      if (state.spectreAttack >= 1.25) {
        state.spectreAttack = 0;
        damagePlayer(7, 'The spectre', state.target);
      }
    }
    if (sharedWorld()) return;
    if (raptor.phase === 'releasing') {
      raptor.release = Math.min(1, raptor.release + dt);
      raptor.z = JURASSIC.cage.z + (JURASSIC.exit.z - JURASSIC.cage.z) * raptor.release;
      if (raptor.release >= 1 - 1e-8) {
        raptor.phase = 'loose';
        raptor.replan = 0;
      }
      return;
    }
    if (raptor.phase !== 'loose') return;
    raptor.replan -= dt;
    raptor.attackIn = Math.max(0, raptor.attackIn - dt);
    if (raptor.replan <= 0) {
      raptor.replan = 0.6;
      const citizens = pedestrians().filter(
        (n) =>
          !n.expeditionDead &&
          !n.child &&
          !n.baby &&
          !n.dogWalker &&
          !n.stroller &&
          !n.alienId &&
          (['Man', 'Woman'] satisfies [string, string]).includes(n.label) &&
          distance(n, raptor) < 22,
      );
      citizens.sort((a, b) => distance(a, raptor) - distance(b, raptor));
      const candidates = (
        p.eligible && !ship.aboard && distance(p, raptor) < 8
          ? [p, ...citizens.slice(0, 4)]
          : [...citizens.slice(0, 4), p.eligible && !ship.aboard ? p : null]
      ).filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null);
      raptor.prey = null;
      raptor.path = [];
      for (const candidate of candidates) {
        const path = routeTo(raptor, candidate);
        if (path) {
          raptor.prey = candidate;
          raptor.path = path;
          break;
        }
      }
    }
    let budget = dt * 5.1;
    while (budget > 0 && raptor.path.length) {
      const q = raptor.path[0],
        d = distance(raptor, q),
        step = Math.min(d, budget),
        next = {
          x: raptor.x + (q.x - raptor.x) * (d ? step / d : 0),
          z: raptor.z + (q.z - raptor.z) * (d ? step / d : 0),
        };
      if (!canTravel(raptor, next)) {
        raptor.path = [];
        raptor.replan = 0;
        break;
      }
      raptor.angle = Math.atan2(q.z - raptor.z, q.x - raptor.x);
      raptor.x = next.x;
      raptor.z = next.z;
      budget -= step;
      if (d <= step + 1e-8) raptor.path.shift();
    }
    const prey = raptor.prey;
    if (
      !prey ||
      !('x' in prey) ||
      distance(raptor, prey) > 1.15 ||
      raptor.attackIn > 0 ||
      prey.expeditionDead
    )
      return;
    raptor.attackIn = 1.5;
    if (prey === p || prey.isPlayer) {
      if (p.eligible && !ship.aboard && distance(raptor, p) < 1.3)
        damagePlayer(MONSTER_STATS.raptor.damage, 'The velociraptor', raptor);
    } else {
      const victimDies = random() < 0.5,
        raptorDies = random() < 0.5;
      if (victimDies) {
        prey.expeditionDead = true;
        prey.hold = 35;
        state.victims.push({ npc: prey, until: state.clock + 35 });
        drop('coins', prey.x, prey.z, 3 + Math.floor(random() * 5));
        event(
          'citizen-down',
          'The velociraptor attacks a ' + prey.label!.toLowerCase() + '. Coins fall to the ground.',
        );
      }
      if (raptorDies) killRaptor('citizen');
      if (!victimDies && !raptorDies)
        event('standoff', 'A citizen fends off the velociraptor. Neither looks pleased.');
      raptor.replan = 0;
    }
  }
  function update(dt: unknown) {
    if (!isFiniteNumber(dt) || dt <= 0) return;
    let remaining = Math.min(dt, 60);
    while (remaining > 1e-8) {
      const step = Math.min(0.05, remaining);
      advance(step);
      remaining -= step;
    }
  }
  function entries() {
    const result = [
      {
        id: 'jurassic-recovery',
        title: 'Jurassic Biosciences: Emergency Recovery',
        stage: state.raptor === 'escaped' ? 'accepted' : state.raptor,
        status:
          state.raptor === 'not-started'
            ? 'Not started'
            : state.raptor === 'carrying'
              ? 'Ready to turn in'
              : state.raptor === 'completed'
                ? 'Complete'
                : 'In progress',
        description:
          state.raptor === 'not-started'
            ? contentText('jurassic.entries.description-8.yes', {})
            : state.raptor === 'escaped'
              ? contentText('jurassic.entries.description-8.no.yes', {})
              : state.raptor === 'carrying'
                ? contentText('jurassic.entries.description-8.no.no.yes', {})
                : contentText('jurassic.entries.description-8.no.no.no', {}),
        rewardLabel: 'Railgun',
      },
    ];
    if (state.krakenStarted)
      result.push({
        id: 'pequod-kraken',
        title: 'Ahab’s Rather Easier Hunt',
        stage: state.krakenReward ? 'completed' : 'accepted',
        status: state.krakenReward ? 'Complete' : 'In progress',
        description: state.krakenReward ? KRAKEN_CAPE_TEXT : 'You have joined Captain Ahab’s hunt.',
        rewardLabel: '100 coins · commemorative cape',
      });
    return result;
  }
  return {
    state,
    raptor,
    cows,
    ship,
    kraken,
    startQuest,
    recover,
    finishQuest,
    setHarbor,
    board,
    returnShip,
    abandonShip,
    collect,
    shoot,
    attack,
    update,
    entries,
    stop() {
      state.target = null;
    },
    toggleWeapon() {
      if (!state.railgun) return false;
      state.equipped = !state.equipped;
      state.target = null;
      save();
      return true;
    },
  };
}

export function scientistDialogue(
  npc: RuntimeDialogue | undefined,
  game: {
    state: Pick<ExpeditionState, 'raptor'>;
    startQuest: ExpeditionDialogueController['startQuest'];
    finishQuest: ExpeditionDialogueController['finishQuest'];
  },
) {
  const p = { ...npc, decline: contentText('jurassic.scientistDialogue.decline-10', {}) };
  if (game.state.raptor === 'not-started')
    return {
      ...p,
      intro: contentText('jurassic.scientistDialogue.intro-12', {}),
      question: contentText('jurassic.scientistDialogue.question-13', {}),
      choice: contentText('jurassic.scientistDialogue.choice-14', {}),
      accept: () => game.startQuest(),
      contentNodeId: 'jurassic.scientistDialogue.node-11',
      introTextId: 'jurassic.scientistDialogue.intro-12',
      introTextValues: {},
      questionTextId: 'jurassic.scientistDialogue.question-13',
      questionTextValues: {},
      choiceTextId: 'jurassic.scientistDialogue.choice-14',
      choiceTextValues: {},
      actionId: 'jurassic.scientistDialogue.action-15',
    };
  if (game.state.raptor === 'carrying')
    return {
      ...p,
      intro: contentText('jurassic.scientistDialogue.intro-17', {}),
      question: contentText('jurassic.scientistDialogue.question-18', {}),
      choice: contentText('jurassic.scientistDialogue.choice-19', {}),
      accept: game.finishQuest,
      contentNodeId: 'jurassic.scientistDialogue.node-16',
      introTextId: 'jurassic.scientistDialogue.intro-17',
      introTextValues: {},
      questionTextId: 'jurassic.scientistDialogue.question-18',
      questionTextValues: {},
      choiceTextId: 'jurassic.scientistDialogue.choice-19',
      choiceTextValues: {},
      actionId: 'jurassic.scientistDialogue.action-20',
    };
  if (game.state.raptor === 'completed')
    return {
      ...p,
      intro: contentText('jurassic.scientistDialogue.intro-22', {}),
      question: contentText('jurassic.scientistDialogue.question-23', {}),
      choice: contentText('jurassic.scientistDialogue.choice-24', {}),
      receipt: contentText('jurassic.scientistDialogue.receipt-25', {}),
      contentNodeId: 'jurassic.scientistDialogue.node-21',
      introTextId: 'jurassic.scientistDialogue.intro-22',
      introTextValues: {},
      questionTextId: 'jurassic.scientistDialogue.question-23',
      questionTextValues: {},
      choiceTextId: 'jurassic.scientistDialogue.choice-24',
      choiceTextValues: {},
      receiptTextId: 'jurassic.scientistDialogue.receipt-25',
      receiptTextValues: {},
    };
  return {
    ...p,
    intro: contentText('jurassic.scientistDialogue.intro-27', {}),
    question: contentText('jurassic.scientistDialogue.question-28', {}),
    choice: contentText('jurassic.scientistDialogue.choice-29', {}),
    receipt: contentText('jurassic.scientistDialogue.receipt-30', {}),
    contentNodeId: 'jurassic.scientistDialogue.node-26',
    introTextId: 'jurassic.scientistDialogue.intro-27',
    introTextValues: {},
    questionTextId: 'jurassic.scientistDialogue.question-28',
    questionTextValues: {},
    choiceTextId: 'jurassic.scientistDialogue.choice-29',
    choiceTextValues: {},
    receiptTextId: 'jurassic.scientistDialogue.receipt-30',
    receiptTextValues: {},
  };
}
export function ahabDialogue(
  npc: RuntimeDialogue | undefined,
  game: {
    state: Partial<Pick<ExpeditionState, 'railgun' | 'krakenReward'>>;
    ship: { aboard: boolean; phase?: string };
    returnShip?: ExpeditionDialogueController['returnShip'];
    board: ExpeditionDialogueController['board'];
  },
) {
  if (game.ship.aboard)
    return {
      ...npc,
      intro:
        game.ship.phase === 'victory'
          ? contentText('jurassic.ahabDialogue.intro-32.yes', {})
          : contentText('jurassic.ahabDialogue.intro-32.no', {}),
      question: contentText('jurassic.ahabDialogue.question-33', {}),
      choice: contentText('jurassic.ahabDialogue.choice-34', {}),
      decline: contentText('jurassic.ahabDialogue.decline-35', {}),
      accept: () => {
        const result = requiredValue(game.returnShip, 'Aboard ship return action')();
        return typeof result === 'boolean'
          ? { ok: result, message: 'Ahab turns the Pequod toward the coast.' }
          : result;
      },
      contentNodeId: 'jurassic.ahabDialogue.node-31',
      introTextId:
        game.ship.phase === 'victory'
          ? 'jurassic.ahabDialogue.intro-32.yes'
          : 'jurassic.ahabDialogue.intro-32.no',
      introTextValues: game.ship.phase === 'victory' ? {} : {},
      questionTextId: 'jurassic.ahabDialogue.question-33',
      questionTextValues: {},
      choiceTextId: 'jurassic.ahabDialogue.choice-34',
      choiceTextValues: {},
      declineTextId: 'jurassic.ahabDialogue.decline-35',
      declineTextValues: {},
      actionId: 'jurassic.ahabDialogue.action-36',
    };
  if (game.state.krakenReward)
    return {
      ...npc,
      intro: contentText('jurassic.ahabDialogue.intro-38', {}),
      choice: contentText('jurassic.ahabDialogue.choice-39', {}),
      receipt: contentText('jurassic.ahabDialogue.receipt-40', {}),
      contentNodeId: 'jurassic.ahabDialogue.node-37',
      introTextId: 'jurassic.ahabDialogue.intro-38',
      introTextValues: {},
      choiceTextId: 'jurassic.ahabDialogue.choice-39',
      choiceTextValues: {},
      receiptTextId: 'jurassic.ahabDialogue.receipt-40',
      receiptTextValues: {},
    };
  if (!game.state.railgun)
    return {
      ...npc,
      intro: contentText('jurassic.ahabDialogue.intro-42', {}),
      question: contentText('jurassic.ahabDialogue.question-43', {}),
      choice: contentText('jurassic.ahabDialogue.choice-44', {}),
      receipt: contentText('jurassic.ahabDialogue.receipt-45', {}),
      contentNodeId: 'jurassic.ahabDialogue.node-41',
      introTextId: 'jurassic.ahabDialogue.intro-42',
      introTextValues: {},
      questionTextId: 'jurassic.ahabDialogue.question-43',
      questionTextValues: {},
      choiceTextId: 'jurassic.ahabDialogue.choice-44',
      choiceTextValues: {},
      receiptTextId: 'jurassic.ahabDialogue.receipt-45',
      receiptTextValues: {},
    };
  return {
    ...npc,
    intro: contentText('jurassic.ahabDialogue.intro-47', {}),
    question: contentText('jurassic.ahabDialogue.question-48', {}),
    choice: contentText('jurassic.ahabDialogue.choice-49', {}),
    decline: contentText('jurassic.ahabDialogue.decline-50', {}),
    choices: [
      {
        label: contentText('jurassic.ahabDialogue.label-52', {}),
        next: {
          intro: contentText('jurassic.ahabDialogue.intro-54', {}),
          question: contentText('jurassic.ahabDialogue.question-55', {}),
          choice: contentText('jurassic.ahabDialogue.choice-56', {}),
          choices: undefined,
          decline: contentText('jurassic.ahabDialogue.decline-57', {}),
          accept: () => game.board(),
          contentNodeId: 'jurassic.ahabDialogue.node-53',
          introTextId: 'jurassic.ahabDialogue.intro-54',
          introTextValues: {},
          questionTextId: 'jurassic.ahabDialogue.question-55',
          questionTextValues: {},
          choiceTextId: 'jurassic.ahabDialogue.choice-56',
          choiceTextValues: {},
          declineTextId: 'jurassic.ahabDialogue.decline-57',
          declineTextValues: {},
          actionId: 'jurassic.ahabDialogue.action-58',
        },
        contentNodeId: 'jurassic.ahabDialogue.node-51',
        labelTextId: 'jurassic.ahabDialogue.label-52',
        labelTextValues: {},
      },
    ],
    contentNodeId: 'jurassic.ahabDialogue.node-46',
    introTextId: 'jurassic.ahabDialogue.intro-47',
    introTextValues: {},
    questionTextId: 'jurassic.ahabDialogue.question-48',
    questionTextValues: {},
    choiceTextId: 'jurassic.ahabDialogue.choice-49',
    choiceTextValues: {},
    declineTextId: 'jurassic.ahabDialogue.decline-50',
    declineTextValues: {},
  };
}
