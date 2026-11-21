import { isRecord } from '../types/json.ts';
import type { SimulationServices, ServerPlayer } from '../types/server.ts';
import { railgunUnlocked } from '../item-stats.ts';
import {
  PUBLIC_INSTANCE,
  ILLUMINATI_INSTANCE,
  privateMapInstance,
  ILLUMINATI_CAVE,
  ILLUMINATI_PRICE,
  guildSecretSites,
} from '../map-instances.ts';
import { insideGuild } from '../guild.ts';
import { guildMayEnter } from './guild.mts';
import { PEQUOD } from '../jurassic-layout.ts';
import {
  BOMBER_LAUNCH,
  BOMBER_REPLACEMENT_MESSAGE,
  BOMB_COOLDOWN_MS,
  BOMB_FALL_MS,
  bombTileArea,
  bomberFlightHeight,
  bomberCruiseHeight,
  bomberLanding,
  createBomberDescent,
  bomberDescentPoint,
} from '../stealth-bomber.ts';

export function createServerInstances({
  geometry,
  shared,
  pvp,
  players,
  send,
  dirty,
  now = Date.now,
}: Pick<SimulationServices, 'geometry' | 'shared' | 'pvp' | 'players' | 'send' | 'dirty' | 'now'>) {
  const bombs = new Set<import('../types/aircraft.ts').BombFlight & { owner?: string | null }>();
  let serial = 0;
  const lodge = geometry.places?.find((p) => p.id === 'freemasons-guild'),
    secret = guildSecretSites(lodge);
  const kind = (p: ServerPlayer) => p.instance?.kind || 'world',
    alive = (p: ServerPlayer) => p.hp > 0 && !p.respawnAllowed && !p.personalJailed;
  const bomberStatus = (p: ServerPlayer) => ({
    owned: p.profile.bomber === true,
    active: !!p.bomberActive,
    readyAt: p.profile.bombReadyAt || 0,
  });
  const position = (p: ServerPlayer) => ({ x: p.x, y: p.y, z: p.z, angle: p.angle, hp: p.hp });
  function savePosition(p: ServerPlayer) {
    if (p.tabletTeleport) return { ...p.tabletTeleport.to, hp: p.hp, angle: p.angle };
    return kind(p) !== 'world' || p.bomberActive
      ? { ...(p.instanceReturn || position(p)), hp: p.hp }
      : position(p);
  }
  function transition(
    p: ServerPlayer,
    instance: import('../types/server.ts').MapInstance,
    to: import('../types/server.ts').NetworkPosition,
  ) {
    shared.leave(p);
    pvp.stop(p);
    p.attack = null;
    p.instance = instance;
    p.seen.clear();
    p.sharedVersions.clear();
    p.npcVersions.clear();
    Object.assign(p, to, {
      moving: false,
      motion: 0,
      lastPoseAt: now(),
      mode: p.bomberActive ? 'bomber' : 'walk',
    });
    p.revision++;
    p.entityVersions = {};
    p.globalVersions = {};
    p.poseVersions = new Map();
    p.seen = new Map();
    dirty(p);
    send(p, {
      type: 'instance',
      instance,
      position: position(p),
      bomber: bomberStatus(p),
      illuminati: p.profile.illuminati === true,
    });
  }
  function reset(p: ServerPlayer, to: import('../types/server.ts').NetworkPosition | null = null) {
    p.bomberActive = false;
    p.parachute = null;
    transition(p, PUBLIC_INSTANCE, to || p.instanceReturn || position(p));
    p.instanceReturn = null;
  }
  function command(p: ServerPlayer, action: string, args: { kind?: string } = {}) {
    if (action === 'joinIlluminati') {
      if (
        !alive(p) ||
        kind(p) !== 'world' ||
        !p.profile.guild?.member ||
        !secret ||
        !insideGuild(lodge, p.x, p.z) ||
        Math.hypot(p.x - secret.oldMan.x, p.z - secret.oldMan.z) > 2.4
      )
        return { ok: false, message: 'Speak to the Old Man inside the Freemasons’ Guild.' };
      if (p.profile.illuminati)
        return {
          ok: true,
          illuminati: true,
          message: 'You are already initiated. The underground passage is open to you.',
        };
      const purse = p.inventory.economy.state;
      if (purse.coins < ILLUMINATI_PRICE)
        return {
          ok: false,
          message: 'Initiation costs 250,000 coins. The Old Man does not accept installments.',
        };
      purse.coins -= ILLUMINATI_PRICE;
      p.inventory.save();
      p.profile.illuminati = true;
      dirty(p);
      return {
        ok: true,
        illuminati: true,
        inventory: p.inventory.snapshot(),
        message:
          'The Old Man accepts 250,000 coins. You join the Illuminati. Take the stairway inside the lodge to the underground hangar.',
      };
    }
    if (action === 'instanceEnter') {
      if (!alive(p) || kind(p) !== 'world' || p.bomberActive)
        return { ok: false, message: 'Finish your current journey first.' };
      if (args.kind === 'illuminati') {
        if (
          !p.profile.illuminati ||
          !secret ||
          Math.hypot(p.x - secret.portal.x, p.z - secret.portal.z) > 2.2 ||
          !insideGuild(lodge, p.x, p.z)
        )
          return {
            ok: false,
            message:
              'Join the Illuminati with the Old Man, then use the stairway inside the guild.',
          };
        p.instanceReturn = position(p);
        transition(p, ILLUMINATI_INSTANCE, {
          ...ILLUMINATI_CAVE.entrance,
          y: ILLUMINATI_CAVE.floor + 0.025,
        });
        return {
          ok: true,
          message: 'You descend below the guild into the underground hangar.',
        };
      }
      if (args.kind === 'kraken') {
        const captain = geometry.merchants?.find((n) => n.id === 'captain-ahab'),
          home = geometry.expeditions?.ship.home;
        let gear: unknown = {};
        try {
          gear = JSON.parse(p.profile.privateState['sf-expeditions-v1'] || '{}');
        } catch {}
        if (
          !railgunUnlocked(isRecord(gear) ? gear : {}) ||
          !captain ||
          !home ||
          Math.hypot(p.x - captain.x, p.z - captain.z) > 3
        )
          return {
            ok: false,
            message: 'Board with Captain Ahab on the beach, carrying your railgun.',
          };
        if (isRecord(gear) && gear.krakenReward)
          return {
            ok: false,
            message:
              'You have already claimed the kraken’s spoils. Ahab is still writing the incident report.',
          };
        p.instanceReturn = position(p);
        transition(p, privateMapInstance('kraken', p.owner, home), {
          ...position(p),
          x: home.x,
          y: PEQUOD.deck,
          z: home.z,
        });
        return { ok: true, message: 'The Pequod enters your private kraken-hunting waters.' };
      }
      return { ok: false, message: 'Unknown map instance.' };
    }
    if (action === 'instanceLeave') {
      if (kind(p) === 'world') return { ok: false, message: 'You are already in the city.' };
      if (
        kind(p) === 'illuminati' &&
        Math.hypot(p.x - ILLUMINATI_CAVE.entrance.x, p.z - ILLUMINATI_CAVE.entrance.z) > 2.2
      )
        return { ok: false, message: 'Use the stairs at the southern end of the cave.' };
      reset(p);
      return { ok: true, message: 'You return to the city.' };
    }
    if (action === 'bomberBoard') {
      if (
        !alive(p) ||
        !p.profile.illuminati ||
        kind(p) !== 'illuminati' ||
        Math.hypot(p.x - ILLUMINATI_CAVE.boarding.x, p.z - ILLUMINATI_CAVE.boarding.z) > 3
      )
        return { ok: false, message: 'Walk to your B-2 in the underground hangar.' };
      p.profile.bomber = true;
      p.bomberActive = true;
      transition(p, PUBLIC_INSTANCE, {
        ...BOMBER_LAUNCH,
        y: bomberFlightHeight(
          BOMBER_LAUNCH.x,
          BOMBER_LAUNCH.z,
          geometry.characterGround,
          bomberCruiseHeight(geometry.airship?.cruiseHeight),
        ),
        angle: 0,
      });
      return {
        ok: true,
        bomber: bomberStatus(p),
        message:
          'You take your personal B-2 out over the Pacific. Click to fly; hold Shift for rocket speed. R performs a barrel roll. Space drops a bomb. Land by parachuting out.',
      };
    }
    if (action === 'bomberReturn') {
      if (!alive(p) || !p.bomberActive || p.parachute || !p.profile.illuminati)
        return { ok: false, message: 'You are not flying your B-2.' };
      p.bomberActive = false;
      transition(p, ILLUMINATI_INSTANCE, {
        ...ILLUMINATI_CAVE.boarding,
        y: ILLUMINATI_CAVE.floor + 0.025,
      });
      return {
        ok: true,
        bomber: bomberStatus(p),
        message: 'Your B-2 returns to its underground hangar.',
      };
    }
    if (action === 'bomberEject') {
      if (!alive(p) || !p.bomberActive || p.parachute || !p.profile.bomber)
        return { ok: false, message: 'You are not flying your B-2.' };
      const to = bomberLanding(p.x, p.z, {
        free: (x: number, z: number) =>
          geometry.landClearAt(x - 0.5, z - 0.5) &&
          guildMayEnter(p, geometry, x, geometry.characterGround(x, z), z),
        ground: geometry.characterGround,
        fallback: { x: geometry.spawn.x + 0.5, z: geometry.spawn.y + 0.5 },
      });
      if (!to) return { ok: false, message: 'Fly closer to land before parachuting out.' };
      const flight = createBomberDescent(position(p), to, p.angle),
        impact = { x: p.x + Math.cos(p.angle) * 30, z: p.z + Math.sin(p.angle) * 30 },
        crash = {
          from: position(p),
          heading: p.angle,
          to: { ...impact, y: geometry.characterGround(impact.x, impact.z) },
        };
      p.parachute = { ...flight, startedAt: now() };
      p.instanceReturn = { ...to, angle: p.angle, hp: p.hp };
      p.mode = 'parachute';
      p.moving = false;
      p.motion = 0;
      p.attack = null;
      pvp.stop(p);
      dirty(p);
      for (const observer of players.values())
        if (
          kind(observer) === 'world' &&
          (observer === p || Math.hypot(observer.x - p.x, observer.z - p.z) < 80)
        )
          send(observer, { type: 'bomberEjected', player: p.id, flight, crash });
      return {
        ok: true,
        bomber: bomberStatus(p),
        message:
          'You parachute out as the B-2 flies on to a spectacularly small crash. ' +
          BOMBER_REPLACEMENT_MESSAGE,
      };
    }
    if (action === 'bomberBomb') {
      if (
        !alive(p) ||
        !p.bomberActive ||
        p.parachute ||
        !p.profile.bomber ||
        kind(p) !== 'world' ||
        p.mode !== 'bomber'
      )
        return { ok: false, message: 'Board your personal B-2 first.' };
      if (now() < (p.profile.bombReadyAt || 0))
        return {
          ok: false,
          bomber: bomberStatus(p),
          message:
            'Bomb bay reloading: ' +
            Math.ceil((p.profile.bombReadyAt - now()) / 1000) +
            ' seconds.',
        };
      const area = bombTileArea(p.x, p.z),
        bomb = {
          id: ++serial,
          owner: p.owner,
          attacker: p.id,
          from: { x: p.x, y: p.y, z: p.z },
          ...area,
          impactAt: now() + BOMB_FALL_MS,
        };
      bombs.add(bomb);
      p.profile.bombReadyAt = now() + BOMB_COOLDOWN_MS;
      dirty(p);
      for (const observer of players.values())
        if (
          kind(observer) === 'world' &&
          (observer === p || Math.hypot(observer.x - area.x, observer.z - area.z) < 60)
        )
          send(observer, { type: 'bombLaunched', bomb: { ...bomb, owner: undefined } });
      return {
        ok: true,
        bomber: bomberStatus(p),
        message:
          'Bomb released. Its 3×3 blast deals 100 damage to cows, bears and snow/ice giants. Players, townspeople and quest characters are protected.',
      };
    }
    return { ok: false, message: 'Unknown instance action.' };
  }
  function tick() {
    for (const p of players.values())
      if (p.parachute) {
        const flight = p.parachute,
          elapsed = (now() - flight.startedAt) / 1000;
        Object.assign(p, bomberDescentPoint(flight, elapsed));
        dirty(p);
        if (elapsed >= flight.duration) {
          reset(p, { ...flight.to, angle: flight.heading });
          send(p, {
            type: 'bomberLanded',
            message: 'You land gently. ' + BOMBER_REPLACEMENT_MESSAGE,
          });
        }
      }
    for (const bomb of bombs)
      if (now() >= bomb.impactAt) {
        bombs.delete(bomb);
        shared.bombCreatures(bomb);
      }
  }
  return { command, transition, reset, savePosition, bomberStatus, tick, kind };
}
