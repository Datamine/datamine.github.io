import { updateGrazingCow } from '../cow-roaming.js';
import { createAirship } from '../airship.js';
import { validNPCRoamingState } from '../npc-roaming.js';
import { createAirshipRental } from './airship-rental.mjs';

import { AIRSHIP_BASKET } from '../airship-basket.js';
import { JURASSIC, cowSpawns } from '../jurassic-layout.js';
import { SF_ZOO } from '../zoo.js';
import { createTigerEncounter } from '../zoo-encounter.js';
import { rollWeaponDamage, rollEnemyDamage } from '../combat.js';
import { strengthStatus } from '../strength.js';
import { SpatialIndex } from './spatial-index.mjs';
import { moveResearcherNPCs } from '../research-campuses.js';
import { actorLevel } from '../levels.js';
import { PEPTIDE_SPAWN_MS } from '../guild.js';
import { BOMB_DAMAGE, monsterInBombArea } from '../stealth-bomber.js';
import { createWilderness } from '../wilderness.js';
import { combatInRange } from '../combat-navigation.js';
import { ITEM_STATS, itemLoot, equipmentOwned, ownedEquipmentDefense } from '../item-stats.js';
import { MONSTER_STATS, rollMonsterDrops } from '../monster-drops.js';

const near = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const privateJSON = (p, key) => {
  try {
    return JSON.parse(p.profile.privateState[key] || '{}');
  } catch {
    return {};
  }
};
export function createSharedWorld({
  geometry,
  routes,
  players,
  send,
  dirty,
  random = Math.random,
  now = Date.now,
  saved = {},
  onAirshipReset = () => {},
  onCombatDamage = () => {},
}) {
  const routeTo = (...args) => (routes ? routes.pathTo(...args) : geometry.pathTo(...args));
  const airship =
      geometry.airship || createAirship({ groundHeight: (x, z) => geometry.characterGround(x, z) }),
    passengers = new Set();
  let captain = null,
    clock = Number(saved.clock) || 0,
    lootSerial = Number(saved.lootSerial) || 0,
    focus = null;
  const shipHome = { ...airship.home },
    shipRope = { deployed: false, top: null, bottom: null },
    cows = cowSpawns().map((c) => ({
      ...c,
      home: { x: c.x, z: c.z },
      phase: 0,
      motion: 0,
      hp: MONSTER_STATS.cow.hp,
      max: MONSTER_STATS.cow.hp,
      respawn: 0,
    }));
  let nextPeptideAt = Number.isFinite(saved.nextPeptideAt)
    ? saved.nextPeptideAt
    : now() + PEPTIDE_SPAWN_MS;
  const raptor = {
    id: 'jurassic-raptor',
    combatKind: 'raptor',
    label: 'Velociraptor',
    x: JURASSIC.cage.x,
    z: JURASSIC.cage.z,
    hp: MONSTER_STATS.raptor.hp,
    max: MONSTER_STATS.raptor.hp,
    phase: 'caged',
    angle: Math.PI / 2,
    path: [],
    repath: 0,
    attackIn: 1,
    prey: null,
    resetAt: 0,
    release: 0,
  };
  const lives = geometry.lives || [],
    loot = new Map(),
    npcIndex = new SpatialIndex(),
    npcList = [...(geometry.merchants || []), ...lives.flatMap((l) => l?.people || [])],
    npcById = new Map(npcList.map((n) => [n.id, n])),
    pathTo = (a, b) =>
      routeTo(b.x - 0.5, b.z - 0.5, { x: a.x - 0.5, y: a.z - 0.5 })?.map((p) => ({
        x: p.x + 0.5,
        z: p.y + 0.5,
      }));
  for (const item of saved.loot || [])
    if (item.expires > clock && (!item.wallExpiresAt || item.wallExpiresAt > now()))
      loot.set(item.id, item);
  for (const cow of cows) {
    const previous = saved.cows?.find((c) => c.id === cow.id);
    if (previous) {
      if (
        Number.isFinite(previous.x) &&
        Number.isFinite(previous.z) &&
        Math.hypot(previous.x - cow.home.x, previous.z - cow.home.z) < 2 &&
        geometry.landClearAt(previous.x - 0.5, previous.z - 0.5)
      )
        Object.assign(cow, {
          x: previous.x,
          z: previous.z,
          phase: previous.phase || 0,
          grazingVisit: previous.grazingVisit || 0,
          grazingPause: previous.grazingPause ?? 2,
        });
      Object.assign(cow, {
        hp: Math.max(0, Math.min(MONSTER_STATS.cow.hp, previous.hp)),
        respawn: Math.max(0, Math.min(MONSTER_STATS.cow.respawn, previous.respawn)),
      });
    }
  }
  if (saved.raptor) Object.assign(raptor, saved.raptor, { path: [], prey: null, repath: 0 });
  // Saved animation positions belong to a particular authored patrol. A map
  // edit must not leave a relocated researcher walking back across the city.
  const npcLayouts = new Map(
    npcList.map((n) => [
      n.id,
      JSON.stringify(n.roam ? [n.roam.home, n.roam.bounds, n.roam.points] : n.points || [n.x, n.z]),
    ]),
  );
  for (const previous of saved.npcs || []) {
    const npc = npcById.get(previous.id);
    if (
      !npc ||
      !Number.isFinite(previous.x) ||
      !Number.isFinite(previous.z) ||
      !geometry.landClearAt(previous.x - 0.5, previous.z - 0.5)
    )
      continue;
    if (previous.layout && previous.layout !== npcLayouts.get(npc.id)) continue;
    if (npc.roam && (!previous.layout || !validNPCRoamingState(npc.roam, previous.roam))) continue;
    if (
      npc.points &&
      previous.routeIndex !== undefined &&
      (!Number.isInteger(previous.routeIndex) ||
        previous.routeIndex < 0 ||
        previous.routeIndex >= npc.points.length)
    )
      continue;
    if (!previous.layout) {
      const b = npc.roam?.bounds;
      if (
        b &&
        (previous.x - 0.5 < b.west ||
          previous.x - 0.5 > b.east ||
          previous.z - 0.5 < b.north ||
          previous.z - 0.5 > b.south)
      )
        continue;
      if (npc.researcher && npc.points) {
        const xs = npc.points.map((p) => p[0]),
          zs = npc.points.map((p) => p[1]);
        if (
          previous.x < Math.min(...xs) - 0.2 ||
          previous.x > Math.max(...xs) + 0.2 ||
          previous.z < Math.min(...zs) - 0.2 ||
          previous.z > Math.max(...zs) + 0.2
        )
          continue;
      }
    }
    const { roam, layout, ...fields } = previous;
    Object.assign(npc, fields);
    if (roam && npc.roam)
      Object.assign(npc.roam, { index: roam.index, pause: roam.pause, stops: roam.stops });
  }
  const tigerPlayer = { x: SF_ZOO.exit.x, y: SF_ZOO.exit.y },
    tiger = createTigerEncounter({
      player: tigerPlayer,
      home: { x: SF_ZOO.cage.x - 0.5, y: SF_ZOO.cage.z - 0.5 },
      exit: SF_ZOO.exit,
      wardenStarts: SF_ZOO.wardens,
      routeTo: (x, y, from) => routeTo(x, y, from),
      canCapture: (a, b) => geometry.canTravel(a.x, a.y, b.x, b.y, true),
      canPursue: () => !!focus,
      onDeath: () => {
        if (focus) {
          focus.hp = 0;
          send(focus, { type: 'caught', source: 'tiger' });
          focus.respawnAllowed = true;
          dirty(focus);
        }
      },
      random,
    });
  tiger.restore(saved.tiger);
  // Preserve the aircraft in flight, returning it safely to the mooring
  // after a restart; never restore dangling socket IDs as pilot authority.
  if (saved.airship?.active && saved.airship.position) {
    Object.assign(airship.state, saved.airship, {
      position: { ...saved.airship.position },
      active: true,
      target: null,
    });
    airship.returnHome();
  }
  const airshipRental = createAirshipRental({
    geometry,
    players,
    airship,
    captain: () => captain,
    reset: resetAirship,
    now,
    dirty,
    saved: saved.airshipLease,
  });
  const publicPlayer = (p) => (p.instance?.kind || 'world') === 'world';
  const eligible = (p) =>
    publicPlayer(p) &&
    p.hp > 0 &&
    !p.personalJailed &&
    !p.detainAt &&
    !p.grappling &&
    !passengers.has(p.id) &&
    ![
      'rocket',
      'hidden',
      'surf',
      'gondola',
      'climb',
      'airship',
      'bomber',
      'parachute',
      'teleport',
    ].includes(p.mode);
  npcIndex.rebuild(npcList);
  const level = (p) => strengthStatus(privateJSON(p, 'sf-strength-v1').xp).level;
  const ownsRailgun = (p) => privateJSON(p, 'sf-expeditions-v1').railgun === true;
  const ownsWeapon = (p, weapon) =>
    weapon === 'unarmed' ||
    (weapon === 'railgun' && ownsRailgun(p)) ||
    (weapon === 'bayonet' && privateJSON(p, 'sf-quests-v1').theyLive?.bayonet) ||
    (['battleaxe', 'akibo'].includes(weapon) && equipmentOwned(p.inventory.economy.state, weapon));
  const creatureSegment = (a, b) =>
    geometry.canTravel(a.x - 0.5, a.z - 0.5, b.x - 0.5, b.z - 0.5, true);
  const wilderness = createWilderness({
    spawns: geometry.wilderness?.actors || [],
    ground: geometry.characterGround,
    canTravel: creatureSegment,
    route: (actor, goal) => {
      // A small idle shuffle blocked by a tree should wait for the next
      // wander target, not search the entire mountain for a detour. Pursuit
      // and returning from a distant chase still use the full route planner.
      if (!actor.enemy && Math.hypot(actor.x - goal.x, actor.z - goal.z) < 3)
        return creatureSegment(actor, goal) ? [goal] : [];
      return pathTo(actor, goal);
    },
    random,
    onHit: ({ actor, attacker, damage }) => broadcastHit(attacker, actor, damage, attacker.weapon),
    onDrop: (record, attacker) =>
      Object.assign(
        drop(record.lootKind, record.x, record.z, attacker.owner, record.amount),
        record,
      ),
    onDamage: (p, amount, actor) => hitPlayer(p, amount, actor.label, actor),
  });
  wilderness.sync(
    (saved.wilderness || []).map((n) => {
      const actor = wilderness.actors.find((a) => a.id === n.id);
      if (!actor) return n;
      const stats = MONSTER_STATS[actor.combatKind],
        moved = n.home && Math.hypot(actor.home.x - n.home.x, actor.home.z - n.home.z) > 0.01;
      const outside =
        stats.territoryHalfWidth &&
        Math.max(Math.abs(n.x - actor.home.x), Math.abs(n.z - actor.home.z)) >
          stats.territoryHalfWidth;
      // Checkpoints retain encounter progress; difficulty and territory are
      // authored configuration and must follow balance changes after restart.
      return {
        ...n,
        combatKind: actor.combatKind,
        label: actor.label,
        description: actor.description,
        level: actor.level,
        height: actor.height,
        max: actor.max,
        hp: Number.isFinite(n.hp) ? Math.max(0, Math.min(actor.max, n.hp)) : actor.hp,
        enemy: null,
        ...(moved || outside
          ? { x: actor.x, z: actor.z, base: actor.base, home: { ...actor.home } }
          : {}),
      };
    }),
  );
  function broadcastHit(attacker, target, damage, weapon) {
    const p = players.get(attacker.id) || attacker;
    if (players.has(p.id)) onCombatDamage(p, damage);
    p.angle = Math.atan2(target.z - p.z, target.x - p.x);
    p.gesture = 'attack';
    p.gestureUntil = now() + 450;
    const event = {
      type: 'sharedHit',
      attacker: p.id,
      target: target.id,
      damage,
      hp: target.hp,
      max: target.max,
      weapon,
      from: { x: p.x, y: (p.y ?? p.base) + 1.14, z: p.z },
      to: { x: target.x, y: geometry.characterGround(target.x, target.z) + 0.9, z: target.z },
    };
    for (const observer of players.values())
      if (publicPlayer(observer) && near(observer, target) < 45) send(observer, event);
  }
  function monsterDrops(kind, target, owner) {
    for (const record of rollMonsterDrops(kind, random))
      Object.assign(drop(record.lootKind, target.x, target.z, owner, record.amount), record, {
        base: geometry.characterGround(target.x, target.z) + 0.025,
      });
  }
  function freeDeckSpot() {
    const spots = Array.from({ length: 16 }, (_, i) => ({
      x: -2.4 + (i % 4) * 0.8,
      z: -0.6 + Math.floor(i / 4) * 0.4,
    }));
    return (
      spots.find(
        (spot) =>
          ![...players.values()].some(
            (p) =>
              passengers.has(p.id) &&
              p.deck &&
              Math.hypot(p.deck.x - spot.x, p.deck.z - spot.z) < 0.32,
          ),
      ) || spots[0]
    );
  }
  function drop(kind, x, z, owner = null, amount = 1) {
    const item = {
      id: 'shared-loot-' + ++lootSerial,
      kind: 'loot',
      network: true,
      ...itemLoot(kind, amount),
      x,
      z,
      owner,
      unlockAt: clock + 15,
      expires: clock + 120,
    };
    loot.set(item.id, item);
    return item;
  }
  function hitPlayer(p, amount, source, attacker) {
    if (!eligible(p)) return;
    const damage = Math.min(
      p.hp,
      Math.max(
        0,
        rollEnemyDamage(amount, level(p), random) -
          ownedEquipmentDefense(p.inventory.economy.state, p.appearance),
      ),
    );
    p.hp -= damage;
    p.damagePending = true;
    send(p, { type: 'damage', damage, hp: p.hp, max: p.max, source, attacker: attacker?.id });
    if (!p.hp) {
      p.respawnAllowed = true;
      p.attack = null;
      send(p, { type: 'caught', source });
    }
    dirty(p);
  }
  function clearShot(p, target, range = 5) {
    if (
      range <= 1.5 &&
      !geometry.canTravel(p.x - 0.5, p.z - 0.5, target.x - 0.5, target.z - 0.5, true)
    )
      return false;
    if (
      !combatInRange(
        { ...p, base: p.y },
        { ...target, base: geometry.characterGround(target.x, target.z) },
        range,
      )
    )
      return false;
    if (!geometry.lineClear) return true;
    return geometry.lineClear(
      { ...p, base: p.y },
      { ...target, base: geometry.characterGround(target.x, target.z) },
    );
  }
  function shoot(p, target, weapon = 'railgun') {
    if (!eligible(p) || !ownsWeapon(p, weapon))
      return { ok: false, message: 'You need to own that weapon and have both feet available.' };
    if (!target || !target.hp || (target === raptor && raptor.phase !== 'loose'))
      return { ok: false, message: 'That target is unavailable.' };
    if (!clearShot(p, target, ITEM_STATS[weapon].range))
      return { ok: false, message: 'Move within weapon range with a clear line of attack.' };
    if (p.shotAt > clock + 1e-8) return { ok: false, cooldown: true };
    p.shotAt = clock + ITEM_STATS[weapon].interval;
    if (target.wilderness) {
      const result = wilderness.strike(target.id, {
        ...p,
        level: level(p),
        weapon,
        inebriation: privateJSON(p, 'sf-inebriation-v1'),
      });
      dirty(p);
      return result;
    }
    const damage = Math.min(
      target.hp,
      rollWeaponDamage(level(p), weapon, random, privateJSON(p, 'sf-inebriation-v1')),
    );
    target.hp -= damage;
    broadcastHit(p, target, damage, weapon);
    if (!target.hp) {
      p.attack = null;
      if (target === raptor) {
        raptor.phase = 'dead';
        raptor.path = [];
        raptor.resetAt = clock + MONSTER_STATS.raptor.respawn;
        monsterDrops('raptor', target, p.owner);
      } else {
        target.respawn = MONSTER_STATS.cow.respawn;
        monsterDrops('cow', target, p.owner);
      }
      dirty(p);
    }
    return { ok: true, damage };
  }
  function leave(p) {
    passengers.delete(p.id);
    p.grappling = null;
    if (captain === p.id) captain = passengers.values().next().value ?? null;
    if (!passengers.size && airship.state.active) {
      shipRope.deployed = false;
      airship.returnHome();
    }
    p.airship = false;
    return { ok: true };
  }
  function airshipSnapshot() {
    const s = airship.state;
    return {
      active: s.active,
      phase: s.phase,
      position: s.position || shipHome,
      heading: s.heading,
      speed: s.speed,
      captain,
      passengers: [...passengers],
      rope: { ...shipRope },
      grapplers: [...players.values()]
        .filter((p) => p.grappling)
        .map((p) => ({ id: p.id, x: p.x, y: p.y, z: p.z })),
      ...airshipRental.publicStatus(),
    };
  }
  function resetAirship(reason, requester = null) {
    const affected = new Set(
      [...players.values()].filter((p) => passengers.has(p.id) || p.airship || p.grappling),
    );
    airship.cancel();
    airship.state.heading = -Math.PI / 2;
    captain = null;
    passengers.clear();
    Object.assign(shipRope, {
      deployed: false,
      top: null,
      bottom: null,
      passenger: null,
      passengerPaid: false,
      fareOwner: null,
    });
    for (const item of loot.values())
      if (item.ship) {
        item.x = shipHome.x + (item.deck?.z || 0);
        item.z = shipHome.z - (item.deck?.x || 0);
        item.base = geometry.characterGround(item.x, item.z) + 0.025;
        item.ship = false;
        delete item.deck;
      }
    for (const p of affected) {
      Object.assign(p, {
        x: shipHome.x,
        z: shipHome.z,
        y: geometry.characterGround(shipHome.x, shipHome.z),
        mode: 'walk',
        moving: false,
        motion: 0,
        airship: false,
        grappling: null,
        deck: null,
        deckTarget: null,
        attack: null,
      });
      onAirshipReset(p);
      dirty(p);
    }
    const ship = airshipSnapshot();
    for (const p of players.values())
      if (publicPlayer(p)) {
        const message =
          reason === 'hourly'
            ? 'The hourly airship reset has returned the ship to the terminal.'
            : requester?.id === p.id
              ? 'Your priority recall has returned the airship to the terminal.'
              : 'The airship has been recalled by ' + requester.name + '.';
        send(p, {
          type: 'airshipReset',
          reason,
          airship: ship,
          ...(affected.has(p)
            ? {
                position: { x: p.x, y: p.y, z: p.z, angle: p.angle },
                message: message + ' You return safely to the mooring.',
              }
            : { message }),
        });
      }
  }
  function command(p, action, args = {}) {
    airshipRental.tick();
    if (action === 'stopAttack') {
      p.attack = null;
      return { ok: true };
    }
    if (!publicPlayer(p))
      return {
        ok: false,
        message: 'That shared-world interaction is unavailable in this private map instance.',
      };
    if (action === 'airshipStatus' || action === 'airshipRecall')
      return airshipRental.command(p, action, args);
    if (action === 'attack') {
      const target = [...cows, raptor, ...wilderness.actors].find((n) => n.id === args.id),
        weapon = args.weapon || 'railgun';
      const result = shoot(p, target, weapon);
      if (result.ok || result.cooldown) {
        p.attack = target.hp > 0 ? target.id : null;
        p.attackWeapon = weapon;
      }
      return result;
    }
    if (action === 'petBear') {
      if (!eligible(p)) return { ok: false, message: 'Find your feet before petting the bear.' };
      p.attack = null;
      const result = wilderness.pet(args.id, p);
      if (result.ok) {
        const bear = wilderness.actors.find((n) => n.id === args.id);
        p.angle = Math.atan2(bear.z - p.z, bear.x - p.x);
        p.gesture = 'pet-bear';
        p.gestureUntil = now() + 1500;
      }
      return result;
    }
    if (action === 'releaseRaptor') {
      if (near(p, { x: JURASSIC.x, z: JURASSIC.entry.y }) > 7)
        return { ok: false, message: 'Speak to the scientist at Jurassic Biosciences.' };
      if (raptor.phase !== 'caged')
        return { ok: true, message: 'The shared recovery protocol is already in progress.' };
      Object.assign(raptor, {
        phase: 'releasing',
        release: 0,
        hp: MONSTER_STATS.raptor.hp,
        x: JURASSIC.exit.x,
        z: JURASSIC.cage.z,
        path: [],
        repath: 0,
      });
      return { ok: true };
    }
    if (action === 'releaseTiger') {
      if (near(p, { x: SF_ZOO.entry.x + 0.5, z: SF_ZOO.entry.y + 0.5 }) > 14)
        return { ok: false, message: 'Go to the tiger enclosure first.' };
      return tiger.release()
        ? { ok: true }
        : { ok: false, message: 'The tiger is already out. This affects everyone.' };
    }
    if (action === 'collect') {
      const item = loot.get(args.id);
      if (!item) return { ok: false, message: 'Someone already collected that loot.' };
      if (
        !(eligible(p) || (p.hp > 0 && p.airship && item.ship)) ||
        near(p, item) > 1.8 ||
        Math.abs(p.y - (item.base ?? p.y)) > 2.5
      )
        return { ok: false, message: 'Walk closer to the loot.' };
      if (item.owner && item.owner !== p.owner && clock < item.unlockAt)
        return {
          ok: false,
          message:
            'The hunter has first claim for ' + Math.ceil(item.unlockAt - clock) + ' more seconds.',
        };
      if (item.lootKind === 'raptor' && privateJSON(p, 'sf-expeditions-v1').raptor !== 'escaped')
        return {
          ok: false,
          message: 'Accept the scientist’s recovery quest before collecting the remains.',
        };
      const definition = ITEM_STATS[item.lootKind];
      if (definition?.pickup === 'disintegrate') {
        loot.delete(item.id);
        dirty(p);
        return { ok: true, message: definition.pickupMessage };
      }
      const grant = p.inventory?.receive(item);
      if (grant && !grant.ok) return grant;
      loot.delete(item.id);
      return {
        ok: true,
        award: {
          kind: item.lootKind,
          amount: item.amount,
          hatId: item.hatId,
          inventory: grant?.inventory,
        },
        message: 'You collect ' + item.label.toLowerCase() + '.',
      };
    }
    if (action === 'airshipBoard') {
      const permission = airshipRental.mayBoard(p);
      if (!permission.ok) return permission;
      if (!eligible(p) || near(p, shipHome) > 3)
        return { ok: false, message: 'Walk to the airship mooring first.' };
      if (
        (airship.state.active && near(airship.state.position, shipHome) > 0.5) ||
        airship.state.position?.y > shipHome.y + 1
      )
        return {
          ok: false,
          message: 'The airship is away. A grappling hook can reach its basket from below.',
        };
      if (passengers.size >= 16) return { ok: false, message: 'The basket is full.' };
      const rental = airshipRental.rent(p, args.price);
      if (!rental.ok) return rental;
      if (!airship.state.active) airship.board({ x: shipHome.x - 0.5, y: shipHome.z - 0.5 });
      captain ??= p.id;
      p.deck = freeDeckSpot();
      passengers.add(p.id);
      p.airship = true;
      p.attack = null;
      airshipRental.boarded(p);
      return {
        ...rental,
        message:
          captain === p.id
            ? (rental.paid ? 'You rent the airship for ' + rental.paid + ' coins. ' : '') +
              'You are the airship pilot.'
            : 'You board as a passenger.',
      };
    }
    if (action === 'airshipTarget' || action === 'airshipStop' || action === 'airshipHome') {
      if (captain !== p.id)
        return {
          ok: false,
          message: 'Only the current pilot can steer. You can walk around the basket.',
        };
      if (shipRope.deployed && action !== 'airshipStop')
        return { ok: false, message: 'Retract the rope before flying.' };
      if (action === 'airshipStop') airship.stop();
      else if (action === 'airshipHome') airship.returnHome();
      else {
        if (
          !Number.isFinite(args.x) ||
          !Number.isFinite(args.z) ||
          Math.abs(args.x) > 5000 ||
          Math.abs(args.z) > 5000
        )
          return { ok: false, message: 'Invalid destination.' };
        airship.flyTo(args.x, args.z);
      }
      return { ok: true };
    }
    if (action === 'airshipRope') {
      if (captain !== p.id)
        return { ok: false, message: 'Only the pilot can lower or retract the shared rope.' };
      if (args.retract) {
        shipRope.deployed = false;
        return { ok: true };
      }
      const s = airship.state.position;
      if (!s || airship.state.phase !== 'flying' || !geometry.landClearAt(s.x - 0.5, s.z - 0.5))
        return { ok: false, message: 'Hover over walkable ground before lowering a rope.' };
      airship.stop();
      Object.assign(shipRope, {
        deployed: true,
        passenger: null,
        passengerPaid: false,
        top: { ...s },
        bottom: { x: s.x, y: geometry.characterGround(s.x, s.z), z: s.z },
      });
      return { ok: true, message: 'The shared rope is lowered. Other players can climb it too.' };
    }
    if (action === 'airshipInvite') {
      if (captain !== p.id || !shipRope.deployed || shipRope.passenger || shipRope.passengerPaid)
        return { ok: false, message: 'Lower the rope and invite one traveler at a time.' };
      shipRope.passenger = { ...shipRope.bottom, phase: 'ascending' };
      shipRope.fareOwner = p.id;
      return { ok: true, message: 'The traveler starts climbing. The fare is paid on arrival.' };
    }
    if (action === 'airshipClimbDown') {
      if (!passengers.has(p.id) || !shipRope.deployed)
        return { ok: false, message: 'Lower the rope first.' };
      const from = { x: p.x, y: p.y, z: p.z },
        to = { ...shipRope.bottom };
      passengers.delete(p.id);
      if (captain === p.id) captain = passengers.values().next().value ?? null;
      p.airship = false;
      p.grappling = {
        down: true,
        from,
        to,
        elapsed: 0,
        duration: Math.max(2, Math.min(8, (from.y - to.y) / 6)),
      };
      p.mode = 'climb';
      return { ok: true };
    }
    if (action === 'airshipClimbUp') {
      if (!shipRope.deployed || !eligible(p) || near(p, shipRope.bottom) > 1.5)
        return { ok: false, message: 'Stand next to the lowered rope.' };
      if (passengers.size >= 16) return { ok: false, message: 'The basket is full.' };
      p.grappling = {
        from: { x: p.x, y: p.y, z: p.z },
        elapsed: 0,
        duration: Math.max(2, Math.min(8, (shipRope.top.y - p.y) / 6)),
      };
      p.mode = 'climb';
      return { ok: true };
    }
    if (action === 'airshipDeck') {
      if (!passengers.has(p.id) || !Number.isFinite(args.x) || !Number.isFinite(args.z))
        return { ok: false, message: 'You are not aboard.' };
      p.deckTarget = {
        x: Math.max(AIRSHIP_BASKET.left + 0.3, Math.min(AIRSHIP_BASKET.right - 0.3, args.x)),
        z: Math.max(AIRSHIP_BASKET.north + 0.3, Math.min(AIRSHIP_BASKET.south - 0.3, args.z)),
      };
      return { ok: true };
    }
    if (action === 'airshipLeave') {
      if (!passengers.has(p.id) && !p.grappling) return { ok: true };
      const s = airship.state.position || shipHome,
        landing =
          geometry.nearestGround?.(s.x, s.z) ||
          (!geometry.landClearAt(s.x - 0.5, s.z - 0.5) ? null : { x: s.x, z: s.z });
      if (!landing)
        return { ok: false, message: 'Wait until the airship is above walkable ground.' };
      leave(p);
      p.x = landing.x;
      p.z = landing.z;
      p.y = geometry.characterGround(p.x, p.z);
      p.mode = 'walk';
      send(p, { type: 'position', x: p.x, z: p.z, y: p.y, reason: 'disembark' });
      return { ok: true };
    }
    if (action === 'grapple') {
      if (!p.profile.grapplingHook)
        return {
          ok: false,
          message: 'Buy a grappling hook from the airship outfitter at the terminal.',
        };
      if (
        !eligible(p) ||
        !airship.state.active ||
        near(p, airship.state.position) > 6 ||
        airship.state.position.y < p.y + 0.8
      )
        return { ok: false, message: 'Stand within six tiles underneath the flying airship.' };
      if (passengers.size >= 16) return { ok: false, message: 'The basket is full.' };
      p.attack = null;
      p.grappling = {
        from: { x: p.x, y: p.y, z: p.z },
        elapsed: 0,
        duration: Math.max(2, Math.min(8, (airship.state.position.y - p.y) / 6)),
      };
      p.mode = 'climb';
      return { ok: true, message: 'Your hook catches the basket. Hold on!' };
    }
    return { ok: false, message: 'Unknown world action.' };
  }
  function tick(dt) {
    clock += dt;
    airshipRental.tick();
    const points = geometry.peptideSpawns || [];
    if (points.length && now() >= nextPeptideAt) {
      const point = points[Math.min(points.length - 1, Math.floor(random() * points.length))],
        item = drop('peptides', point.x, point.z, null, 1);
      Object.assign(item, {
        label: 'Peptides',
        description:
          'A tiny vial with a very large social network. Donate it to Ray at the Freemasons’ Guild to gain one rank.',
        base: geometry.characterGround(point.x, point.z) + 0.025,
        unlockAt: clock,
        expires: clock + 1200,
        wallExpiresAt: now() + PEPTIDE_SPAWN_MS * 2,
      });
      nextPeptideAt = now() + PEPTIDE_SPAWN_MS;
    }
    for (const cow of cows)
      if (!cow.hp) {
        cow.respawn = Math.max(0, cow.respawn - dt);
        if (!cow.respawn) cow.hp = cow.max;
      }
    const engaged = new Set();
    for (const p of players.values()) if (p.attack) engaged.add(p.attack);
    for (const cow of cows)
      updateGrazingCow(cow, dt, {
        blocked: engaged.has(cow.id),
        clear: geometry.landClearAt,
        travel: geometry.canTravel,
      });
    for (const [id, item] of loot)
      if (item.expires <= clock || (item.wallExpiresAt && item.wallExpiresAt <= now()))
        loot.delete(id);
    for (const p of players.values()) {
      if (!p.attack) continue;
      const target =
          cows.find((n) => n.id === p.attack) ||
          (p.attack === raptor.id ? raptor : wilderness.actors.find((n) => n.id === p.attack)),
        weapon = p.attackWeapon || 'railgun';
      if (
        !target ||
        !target.hp ||
        !eligible(p) ||
        !ownsWeapon(p, weapon) ||
        (target === raptor && raptor.phase !== 'loose')
      ) {
        p.attack = null;
        continue;
      }
      // One accepted Attack establishes an engagement. A moving monster
      // or temporary cover pauses swings without forgetting the target.
      // Only successful swings consume the weapon's normal cooldown.
      if (p.shotAt <= clock + 1e-8 && near(p, target) <= ITEM_STATS[weapon].range + 0.001)
        shoot(p, target, weapon);
    }
    const event = airship.update(dt),
      ship = airship.state.position || shipHome;
    if (shipRope.deployed && shipRope.passenger?.phase === 'ascending') {
      shipRope.passenger.y = Math.min(shipRope.top.y, shipRope.passenger.y + dt * 2.6);
      if (shipRope.passenger.y === shipRope.top.y) {
        shipRope.passenger.phase = 'aboard';
        shipRope.passengerPaid = true;
        const pilot = players.get(shipRope.fareOwner);
        if (pilot) {
          pilot.inventory.economy.trade('passenger');
          pilot.inventory.save();
          dirty(pilot);
          send(pilot, {
            type: 'notice',
            message: 'The traveler reaches the basket and pays you 5 coins.',
          });
        }
      }
    }
    for (const item of loot.values())
      if (item.ship) {
        const c = Math.cos(airship.state.heading),
          s = Math.sin(airship.state.heading);
        item.x = ship.x + item.deck.x * c - item.deck.z * s;
        item.z = ship.z + item.deck.x * s + item.deck.z * c;
        item.base = ship.y + AIRSHIP_BASKET.floor;
      }
    for (const p of players.values()) {
      if (p.grappling) {
        const g = p.grappling,
          to = g.down ? g.to : ship;
        g.elapsed = Math.min(g.duration, g.elapsed + dt);
        const f = g.elapsed / g.duration,
          ease = f * f * (3 - 2 * f);
        p.x = g.from.x + (to.x - g.from.x) * ease;
        p.z = g.from.z + (to.z - g.from.z) * ease;
        p.y = g.from.y + (to.y - g.from.y) * ease;
        p.mode = 'climb';
        p.motion = 1;
        p.phase += dt * 7;
        if (f === 1) {
          p.grappling = null;
          if (g.down) {
            p.mode = 'walk';
            send(p, { type: 'position', x: p.x, y: p.y, z: p.z, reason: 'disembark' });
          } else {
            p.deck = freeDeckSpot();
            passengers.add(p.id);
            captain ??= p.id;
            p.airship = true;
          }
        }
      }
      if (!passengers.has(p.id)) continue;
      if (event === 'landed') {
        leave(p);
        p.x = shipHome.x;
        p.z = shipHome.z;
        p.y = shipHome.y;
        p.mode = 'walk';
        send(p, { type: 'position', x: p.x, z: p.z, y: p.y, reason: 'landed' });
        continue;
      }
      const deck = p.deck || (p.deck = { x: -1.2, z: 0 }),
        target = p.deckTarget;
      p.motion = 0;
      p.moving = false;
      if (target) {
        const dx = target.x - deck.x,
          dz = target.z - deck.z,
          d = Math.hypot(dx, dz),
          step = Math.min(d, 2.2 * dt);
        if (d > 1e-6) {
          deck.x += (dx / d) * step;
          deck.z += (dz / d) * step;
          p.angle = airship.state.heading + Math.atan2(dz, dx);
          p.motion = 1;
          p.moving = true;
          p.phase += step * 7;
        }
        if (d <= step + 1e-6) p.deckTarget = null;
      }
      const c = Math.cos(airship.state.heading),
        s = Math.sin(airship.state.heading);
      p.x = ship.x + deck.x * c - deck.z * s;
      p.z = ship.z + deck.x * s + deck.z * c;
      p.y = ship.y + AIRSHIP_BASKET.floor;
      p.mode = 'airship';
    }
    const available = [...players.values()].filter(eligible);
    wilderness.update(dt, available);
    focus = available.reduce(
      (best, p) =>
        !best ||
        near(p, { x: tiger.state.tiger.x + 0.5, z: tiger.state.tiger.y + 0.5 }) <
          near(best, { x: tiger.state.tiger.x + 0.5, z: tiger.state.tiger.y + 0.5 })
          ? p
          : best,
      null,
    );
    if (focus) {
      tigerPlayer.x = focus.x - 0.5;
      tigerPlayer.y = focus.z - 0.5;
    }
    tiger.update(dt);
    if (raptor.phase === 'releasing') {
      raptor.release = Math.min(1, raptor.release + dt);
      raptor.z = JURASSIC.cage.z + (JURASSIC.exit.z - JURASSIC.cage.z) * raptor.release;
      if (raptor.release === 1) {
        raptor.phase = 'loose';
        raptor.repath = 0;
      }
    } else if (raptor.phase === 'dead' && clock >= raptor.resetAt) {
      Object.assign(raptor, {
        phase: 'caged',
        x: JURASSIC.cage.x,
        z: JURASSIC.cage.z,
        hp: MONSTER_STATS.raptor.hp,
        path: [],
      });
    } else if (raptor.phase === 'loose') {
      raptor.repath -= dt;
      raptor.attackIn -= dt;
      if (raptor.repath <= 0) {
        raptor.repath = 0.75;
        const candidates = [
          ...available,
          ...npcList.filter(
            (n) =>
              !n.expeditionDead &&
              !n.alienId &&
              !n.child &&
              !n.baby &&
              !n.dogWalker &&
              !n.stroller &&
              ['Man', 'Woman'].includes(n.label),
          ),
        ];
        candidates.sort((a, b) => near(a, raptor) - near(b, raptor));
        raptor.prey = null;
        raptor.path = [];
        for (const target of candidates.slice(0, 8)) {
          const path = pathTo(raptor, target);
          if (path) {
            raptor.prey = target;
            raptor.path = path;
            break;
          }
        }
      }
      let budget = dt * 5.1;
      while (budget > 0 && raptor.path.length) {
        const target = raptor.path[0],
          distance = near(raptor, target),
          step = Math.min(budget, distance);
        if (distance > 1e-7) {
          raptor.angle = Math.atan2(target.z - raptor.z, target.x - raptor.x);
          raptor.x += ((target.x - raptor.x) * step) / distance;
          raptor.z += ((target.z - raptor.z) * step) / distance;
        }
        budget -= step;
        if (distance <= step + 1e-7) raptor.path.shift();
      }
      const prey = raptor.prey;
      if (prey && near(raptor, prey) < 1.15 && raptor.attackIn <= 0) {
        raptor.attackIn = 1.5;
        if (players.has(prey.id))
          hitPlayer(prey, MONSTER_STATS.raptor.damage, 'velociraptor', raptor);
        else {
          if (random() < 0.5) {
            prey.expeditionDead = true;
            prey.recoverAt = clock + 35;
            drop('coins', prey.x, prey.z, null, 3 + Math.floor(random() * 5));
          }
          if (random() < 0.5) {
            raptor.hp = 0;
            raptor.phase = 'dead';
            raptor.resetAt = clock + 45;
            raptor.path = [];
            drop('raptor', raptor.x, raptor.z);
          }
          raptor.repath = 0;
        }
      }
    }
    for (const npc of npcList)
      if (npc.expeditionDead && clock >= npc.recoverAt) npc.expeditionDead = false;
    geometry.specialNPCLife?.update(dt, {
      paused: false,
      lookAt: null,
      disabled: (n) => n.expeditionDead,
    });
    geometry.socialLife?.update(dt, { paused: false, lookAt: null });
    moveResearcherNPCs(npcList, dt);
    for (const life of lives) life?.update(dt);
    npcIndex.rebuild(npcList);
  }
  function dropInventory(victim, killer, items) {
    const deck = victim.deck ? { ...victim.deck } : null;
    return items.map((record, index) => {
      const item = drop(record.lootKind, victim.x, victim.z, killer?.owner || null, record.amount);
      Object.assign(item, record, {
        transfer: true,
        description: 'Dropped by ' + victim.name + ' after a PvP defeat.',
        base: victim.y + 0.02,
        expires: clock + 300,
      });
      if (victim.airship && deck)
        Object.assign(item, {
          ship: true,
          deck: { x: deck.x + ((index % 3) - 1) * 0.13, z: deck.z + Math.floor(index / 3) * 0.1 },
        });
      else {
        const a = index * 2.4,
          r = index ? 0.32 + Math.floor(index / 6) * 0.22 : 0;
        const x = item.x + Math.cos(a) * r,
          z = item.z + Math.sin(a) * r;
        if (geometry.landClearAt(x - 0.5, z - 0.5)) {
          item.x = x;
          item.z = z;
        }
      }
      return item.id;
    });
  }
  function bombCreatures(bomb) {
    // Query shared combat creatures only. Players, townspeople and personal
    // quest enemies never enter this collection; quest species are immune.
    const attacker = {
      id: bomb.attacker,
      owner: bomb.owner,
      x: bomb.from.x,
      y: bomb.from.y,
      z: bomb.from.z,
      weapon: 'bomb',
    };
    for (const cow of cows)
      if (monsterInBombArea(cow, bomb)) {
        const damage = Math.min(cow.hp, BOMB_DAMAGE);
        cow.hp -= damage;
        if (!cow.hp) {
          cow.respawn = MONSTER_STATS.cow.respawn;
          monsterDrops('cow', cow, bomb.owner);
        }
        broadcastHit(attacker, cow, damage, 'bomb');
      }
    for (const actor of wilderness.actors)
      if (monsterInBombArea(actor, bomb)) wilderness.damage(actor.id, BOMB_DAMAGE, attacker);
  }
  function snapshot(observer) {
    const npcs = observer ? npcIndex.near(observer.x, observer.z, 38, 32) : npcList;
    return {
      clock,
      peptideSpawnAt: nextPeptideAt,
      wilderness: wilderness.snapshot().filter((n) => !observer || near(observer, n) < 45),
      cows: cows.map((c) => ({ ...c })),
      raptor: {
        id: raptor.id,
        x: raptor.x,
        z: raptor.z,
        hp: raptor.hp,
        max: 50,
        phase: raptor.phase,
        angle: raptor.angle,
        release: raptor.release,
        preyId: raptor.prey?.id ?? null,
      },
      tiger: {
        ...tiger.state,
        elapsed: tiger.state.phase === 'caged' ? 0 : tiger.state.elapsed,
        tiger: { ...tiger.state.tiger, path: [], target: null },
        wardens: tiger.state.wardens.map((w) => ({ ...w, path: [], target: null })),
      },
      airship: airshipSnapshot(),
      loot: [...loot.values()]
        .filter((item) => !observer || near(observer, item) < 45)
        .slice(0, observer ? 64 : Infinity)
        .map((item) => {
          const { owner, ...visible } = item;
          return { ...visible, mine: !!observer && owner === observer.owner };
        }),
      npcs: npcs.map((n) => ({
        id: n.id,
        x: n.x,
        z: n.z,
        base: n.base,
        angle: n.angle,
        motion: n.motion || 0,
        phase: n.phase || 0,
        level: actorLevel(n),
        elapsed: n.elapsed,
        hold: n.hold || 0,
        showStartedAt: n.showStartedAt,
        expeditionDead: !!n.expeditionDead,
      })),
    };
  }
  airshipRental.tick();
  return {
    command,
    tick,
    snapshot,
    leave,
    dropInventory,
    wilderness,
    bombCreatures,
    airship,
    passengers,
    raptor,
    cows,
    tiger,
    loot,
    npcById,
    get clock() {
      return clock;
    },
    persist: () => ({
      clock,
      lootSerial,
      wilderness: wilderness.snapshot(),
      nextPeptideAt,
      tiger: tiger.snapshot(),
      airship: { ...airship.state },
      airshipLease: airshipRental.persist(),
      npcs: npcList.map((n) => ({
        id: n.id,
        layout: npcLayouts.get(n.id),
        x: n.x,
        z: n.z,
        angle: n.angle,
        phase: n.phase,
        elapsed: n.elapsed,
        hold: n.hold,
        motion: n.motion,
        pause: n.pause,
        routeIndex: n.routeIndex,
        expeditionDead: n.expeditionDead,
        recoverAt: n.recoverAt,
        showStartedAt: n.showStartedAt,
        ...(n.roam
          ? { roam: { index: n.roam.index, pause: n.roam.pause, stops: n.roam.stops } }
          : {}),
      })),
      loot: [...loot.values()],
      cows: cows.map((c) => ({ ...c })),
      raptor: {
        x: raptor.x,
        z: raptor.z,
        hp: raptor.hp,
        phase: raptor.phase,
        angle: raptor.angle,
        resetAt: raptor.resetAt,
        release: raptor.release,
      },
    }),
  };
}
