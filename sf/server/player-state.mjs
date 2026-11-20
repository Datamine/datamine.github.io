import { createPlayerComponents } from './player-components.mjs';
import { PROGRESSION } from '../config/progression.js';
import { skillStatus, hitpointMaximum } from '../progression.js';
import { GAMEPLAY } from '../config/gameplay.js';
import { createStrength } from '../strength.js';
import { createQuestLog } from '../quests.js';
import { createSunglasses } from '../sunglasses.js';
import { createInebriation } from '../inebriation.js';
import { createTechVentures } from '../tech-ventures.js';
import { createSocialBusiness } from '../sales-conference.js';
import { createAILabJob, createArithmeticInterview } from '../ai-lab.js';
import { createFishing } from '../fishing.js';
import { createDeli } from '../deli.js';
import { createAlienBattle } from '../combat.js';
import { createExpeditions } from '../jurassic.js';
import { createMonkeyPursuit } from '../monkey-escape.js';
import { createPoliceChase } from '../encounters.js';
import { PEQUOD } from '../jurassic-layout.js';
import { SF_FITNESS } from '../southern-layout.js';
import { gymExercise, gymExercisePosition } from '../gym-exercises.js';
import { CAPTURE_DURATION } from '../capture-animation.js';
import { ownedEquipmentDefense, sandwichCapacity } from '../item-stats.js';
import { nearbyServiceNPC, fuelCarInRange } from '../interaction-access.js';
import { NEIGHBORHOOD_SERVICES } from '../config/neighborhood-services.js';
import { scrambleAppearance } from '../rehabilitation.js';

const parse = (v, fallback = {}) => {
  try {
    return JSON.parse(v) || fallback;
  } catch {
    return fallback;
  }
};
const deny = (message) => ({ ok: false, message });
/** Per-player domain controllers. Their clocks advance on the server even
 * when the browser is backgrounded. The client cannot submit balances, XP,
 * quest flags, enemy HP, interview scores or elapsed time. */
export function createPlayerState({
  geometry,
  routes,
  shared,
  players,
  send,
  dirty,
  now,
  random,
  movement,
  instances,
}) {
  const routeTo = (...args) => (routes ? routes.pathTo(...args) : geometry.pathTo(...args));
  const runtimes = new Map();
  const componentSnapshots = createPlayerComponents({ movement, shared });
  const eligible = (p) =>
    p.hp > 0 &&
    !p.respawnAllowed &&
    !p.personalJailed &&
    !p.bomberActive &&
    !p.grappling &&
    !p.airship &&
    !p.tabletTeleport &&
    !['hidden', 'climb', 'gondola', 'rocket', 'parachute'].includes(p.mode);
  const near = (p, n, r = GAMEPLAY.interactionRange) =>
    !!n &&
    Math.hypot(p.x - (n.x ?? n.entry?.x + 0.5), p.z - (n.z ?? n.entry?.y + 0.5)) <= r &&
    Math.abs(p.y - (n.base ?? p.y)) < 3;
  function npc(p, predicate) {
    return (
      [...shared.npcById.values()].find((n) => predicate(n) && near(p, n)) ||
      geometry.merchants?.find((n) => predicate(n) && near(p, n))
    );
  }
  const byKind = (p, kind) =>
    npc(p, (n) => n.kind === kind || n.questRole === kind || n.id === kind);
  const defense = (p) => ownedEquipmentDefense(p.inventory.economy.state, p.appearance);
  function runtime(p) {
    let r = runtimes.get(p.id);
    if (r) return r;
    const saved = (key) => parse(p.profile.privateState[key]),
      save = (key) => (value) => {
        const next = JSON.stringify(value);
        if (p.profile.privateState[key] !== next) {
          p.profile.privateState[key] = next;
          p.presentationRevision = (p.presentationRevision || 0) + 1;
          dirty(p);
        }
      };
    const health = {
      state: {
        get hp() {
          return p.hp;
        },
        get max() {
          return p.max;
        },
      },
      damage(amount) {
        const damage = Math.min(p.hp, Math.max(0, Math.floor(amount)));
        p.hp -= damage;
        p.damagePending = true;
        send(p, {
          type: 'damage',
          damage,
          hp: p.hp,
          max: p.max,
          xp: p.hitpointsXP,
          source: 'creature',
        });
        dirty(p);
        if (!p.hp) {
          p.respawnAllowed = true;
          p.training = false;
          p.personalBattle = null;
          losePhone();
          send(p, { type: 'caught', source: 'alien' });
        }
        return damage;
      },
      heal(amount = 15) {
        const n = Math.min(p.max - p.hp, amount);
        p.hp += n;
        dirty(p);
        return n;
      },
    };
    const economy = p.inventory.economy,
      logical = {
        get x() {
          return p.x - 0.5;
        },
        get y() {
          return p.z - 0.5;
        },
        get angle() {
          return p.angle;
        },
      };
    const strength = createStrength(saved('sf-strength-v1'), save('sf-strength-v1')),
      quests = createQuestLog(saved('sf-quests-v1'), save('sf-quests-v1')),
      sunglasses = createSunglasses(saved('sf-sunglasses-v1'), save('sf-sunglasses-v1')),
      inebriation = createInebriation(saved('sf-inebriation-v1'), save('sf-inebriation-v1'));
    const tech = createTechVentures({
      economy,
      health,
      saved: saved('sf-tech-ventures-v1'),
      onSave: save('sf-tech-ventures-v1'),
      onDeath: () => {},
      onMessage: (message) => send(p, { type: 'notice', message }),
    });
    function losePhone() {
      if (economy.state.iphoneOwned) {
        tech.losePhone();
        p.inventory.save();
      }
    }
    const social = createSocialBusiness({
        economy,
        inebriation,
        random,
        onEvent: (event) =>
          send(p, { type: 'salesDecision', id: event.npc.id, message: event.message }),
      }),
      job = createAILabJob({
        saved: saved('sf-ai-lab-job-v1'),
        economy,
        onSave: save('sf-ai-lab-job-v1'),
      }),
      interview = createArithmeticInterview({ clock: now, random });
    const fishing = createFishing(economy),
      origin = geometry.sights?.find((n) => n.id === 'lucindas-deli')?.entry || geometry.spawn;
    const deli = createDeli({
      capacity: () => sandwichCapacity(economy.state),
      economy,
      health,
      origin,
      routeTo: (goal, from) => routeTo(goal.x, goal.y, from, true),
      canTravel: (a, b) => geometry.canTravel(a.x, a.y, b.x, b.y, true),
      saved: { sandwiches: p.inventory.meta.sandwiches, pending: p.inventory.meta.deliveryPending },
      onSave: (v) => {
        p.inventory.meta.sandwiches = v.sandwiches;
        p.inventory.meta.deliveryPending = v.pending;
        p.inventory.save();
        dirty(p);
      },
      onMessage: (message) => send(p, { type: 'notice', message }),
    });
    const expeditions = createExpeditions({
      saved: saved('sf-expeditions-v1'),
      onSave: save('sf-expeditions-v1'),
      health,
      economy,
      food: (amount) => p.inventory.receive({ lootKind: 'sandwich', amount }),
      hasBayonet: () => quests.theyLive.state.bayonet,
      level: () => strength.status.level,
      defense: () => defense(p),
      inebriation: () => inebriation.state.percent,
      sharedWorld: () => true,
      player: () => ({ x: p.x, z: p.z, base: p.y, eligible: p.hp > 0 && !p.respawnAllowed }),
      random,
      onEvent: (event) => {
        if (event.type === 'shot') {
          awardCombat(p, event.damage);
          p.angle = Math.atan2(event.target.z - p.z, event.target.x - p.x);
          p.gesture = 'attack';
          p.gestureUntil = now() + 450;
          send(p, {
            type: 'sharedHit',
            attacker: p.id,
            target: event.target.id,
            damage: event.damage,
            hp: event.hp,
            max: event.max,
            weapon: expeditions.state.weapon,
            from: { x: p.x, y: p.y + 1.14, z: p.z },
            to: { x: event.target.x, y: (event.target.base || 0) + 1, z: event.target.z },
          });
        } else if (event.message) send(p, { type: 'notice', message: event.message });
      },
    });
    if (geometry.expeditions?.ship.home) expeditions.setHarbor(geometry.expeditions.ship.home);
    const pen = geometry.sights?.find((n) => n.id === 'zoo-monkeys'),
      home = geometry.monkeyKeeper?.home || pen?.entry || { x: 15, y: 99 };
    const keeper = createMonkeyPursuit({
      player: logical,
      home,
      saved: saved('sf-monkey-keeper-v1'),
      onSave: save('sf-monkey-keeper-v1'),
      routeTo: (x, y, from) => routeTo(x, y, from, true),
      canCapture: (a, b) => geometry.canTravel(a.x, a.y, b.x, b.y, true),
      canPursue: () => eligible(p),
      onCaught: () => {
        quests.recover();
        send(p, { type: 'notice', message: 'The zookeeper recovers the monkey.' });
      },
    });
    const police = createPoliceChase({
      player: logical,
      routeTo: (x, y, from) => routeTo(x, y, from, true),
      nearest: (x, y, r, test) =>
        geometry.nearestNavigation?.(x, y, r, test) || geometry.airship?.nearest(x, y, r, test),
      canCapture: (a, b) => geometry.canTravel(a.x, a.y, b.x, b.y, true),
      onArrest: () => {
        social.cancelPitch();
        fishing.cancel();
        movement.clear(p);
        instances.reset(p);
        Object.assign(p, {
          personalJailed: true,
          detainAt: now() + CAPTURE_DURATION * 1000,
          gesture: 'caught',
          gestureUntil: now() + CAPTURE_DURATION * 1000,
          mode: 'walk',
          hp: p.max,
        });
        losePhone();
        send(p, { type: 'detained', position: movement.position(p) });
        dirty(p);
      },
    });
    r = {
      strength,
      quests,
      sunglasses,
      inebriation,
      tech,
      social,
      job,
      interview,
      fishing,
      deli,
      expeditions,
      keeper,
      police,
      health,
      lastInterview: false,
      battle: null,
      battles: new Map(),
      save,
      inventoryRevision: p.inventory.meta.revision,
    };
    runtimes.set(p.id, r);
    if (p.profile.police)
      Object.assign(police.state, p.profile.police, {
        officers: (p.profile.police.officers || []).map((n) => ({ ...n, path: [], repath: 0 })),
      });
    police.state.jailed = !!p.personalJailed;
    if (quests.carrying) keeper.start();
    strength.save();
    save('sf-quests-v1')(quests.state);
    save('sf-sunglasses-v1')(sunglasses.state);
    save('sf-expeditions-v1')(persistentExpedition(r));
    save('sf-inebriation-v1')(inebriation.state.percent);
    save('sf-ai-lab-job-v1')(job.state);
    save('sf-hitpoints-v1')({ hp: p.hp, max: p.max, xp: p.hitpointsXP });
    return r;
  }

  function awardCombat(p, damage) {
    if (!Number.isFinite(damage) || damage <= 0) return;
    const r = runtime(p),
      before = p.max;
    r.strength.gain(damage * PROGRESSION.strengthXPPerDamage);
    p.hitpointsXP = skillStatus(p.hitpointsXP + damage * PROGRESSION.hitpointsXPPerDamage).xp;
    p.max = hitpointMaximum(p.hitpointsXP);
    if (p.hp > 0) p.hp = Math.min(p.max, p.hp + p.max - before);
    if (p.level !== r.strength.status.level) {
      p.level = r.strength.status.level;
      p.revision++;
    }
    r.save('sf-hitpoints-v1')({ hp: p.hp, max: p.max, xp: p.hitpointsXP });
    dirty(p);
  }
  function commit(p, r) {
    p.inventory.save();
    dirty(p);
    const level = r.strength.status.level;
    if (p.level !== level) {
      p.level = level;
      p.revision++;
    }
  }
  function inventory(p, op, args = {}) {
    if (!p.hp || p.respawnAllowed)
      return deny('Wait until you respawn before using your inventory.');
    if (!eligible(p) && !['eat', 'equipPhone'].includes(op))
      return deny('Finish your current journey first.');
    const r = runtime(p);
    r.deli.state.sandwiches = p.inventory.meta.sandwiches;
    let result;
    if (op === 'eat') {
      r.deli.state.sandwiches = p.inventory.meta.sandwiches;
      result = r.deli.eat();
      if (result.ok) {
        p.gesture = 'eat';
        p.gestureUntil = now() + 900;
      }
    } else if (op === 'order') result = r.deli.order({ x: p.x - 0.5, y: p.z - 0.5 });
    else if (op === 'pickup') {
      if (!byKind(p, args.store === 'in-n-out' ? 'in-n-out-clerk' : 'deli'))
        return deny('Visit the sandwich counter first.');
      result = r.deli.pickup(args.store);
    } else if (op === 'buyBackpack') {
      if (!byKind(p, 'hiking-supplier')) return deny('Visit the hiking supplies clerk.');
      if (p.inventory.economy.state.ownedEquipment.includes('backpack'))
        return deny('You already have a hiking backpack.');
      if (p.inventory.economy.state.coins < 100) return deny('You need 100 coins.');
      p.inventory.economy.state.coins -= 100;
      result = p.inventory.receive({ lootKind: 'equipment', itemId: 'backpack', amount: 1 });
    } else if (op === 'buyHat') {
      if (!byKind(p, 'haberdasher')) return deny('Visit the haberdasher.');
      result = p.inventory.economy.buyHat(args.id);
    } else if (op === 'buyPhone') {
      if (!byKind(p, 'tim-apple')) return deny('Visit Tim Apple.');
      result = r.tech.buyPhone();
    } else if (op === 'equipPhone') result = r.tech.equipPhone(args.on === true);
    else if (op === 'buyRobotaxi') {
      if (!byKind(p, 'robotaxi-sales')) return deny('Visit the robotaxi dealer.');
      result = r.tech.buyRobotaxi();
    } else if (op === 'trade') result = trade(p, args.kind);
    else return deny('That inventory operation is not a user action.');
    if (result.ok) commit(p, r);
    return { ...result, inventory: { ...p.inventory.snapshot(), hp: p.hp, max: p.max } };
  }
  function trade(p, kind) {
    const r = runtime(p),
      economy = p.inventory.economy;
    const merchants = {
      equity: 'founder',
      secondary: 'secondary',
      grain: 'grain',
      tax: 'tax',
      'fish-sale': 'chef',
      'sand-sale': 'gpu-buyer',
      'salt-letter-collect': 'salt-activist',
      'salt-letter-deliver': 'clerk',
      'sales-software-buy': 'software-vendor',
      'motorcycle-rental': 'motorcycle-clerk',
      coffee: 'square-coffee',
      'busker-tip': 'square-busker',
      skis: 'lift',
    };
    if (merchants[kind]) {
      if (!byKind(p, merchants[kind])) return deny('Speak to the appropriate NPC nearby.');
      if (kind === 'motorcycle-rental') {
        if (r.quests.carrying) return deny('Arrange your rental before stealing the monkey.');
        const s = parse(p.profile.privateState['sf-motorcycle-v1']);
        if (s.rented) return deny('Your rental is already paid.');
        const result = economy.trade(kind);
        if (result.ok) {
          const home = geometry.motorcycle?.home || { x: p.x - 0.5, y: p.z - 0.5 };
          r.save('sf-motorcycle-v1')({ rented: true, ...home });
        }
        return result;
      }
      if (kind === 'skis') {
        const t = movement.state(p).tahoe;
        if (t.state.rented) return deny('Your skis are already rented.');
        const result = economy.trade(kind);
        if (result.ok) t.state.rented = true;
        return result;
      }
      return economy.trade(kind);
    }
    if (kind === 'beer') {
      if (!byKind(p, 'bartender')) return deny('Visit Shanghai Kelly’s bartender.');
      return r.inebriation.drink(economy);
    }
    if (kind === 'collect-sand') {
      if (!near(p, geometry.sandSite, 2)) return deny('Collect sand at Ocean Beach.');
      if (now() < (p.nextSandAt || 0)) return deny('Finish filling your sack first.');
      p.nextSandAt = now() + GAMEPLAY.sandCollectSeconds * 1000;
      return economy.trade(kind);
    }
    if (kind === 'feed') {
      if (!geometry.sights?.some((n) => n.kind === 'ducks' && near(p, n, 5)))
        return deny('Walk to the ducks.');
      return economy.trade(kind);
    }
    if (['extortion', 'free-fuel-can', 'fuel-can', 'use-fuel-can'].includes(kind)) {
      const car = movement.state(p).ferrari,
        attendant = nearbyServiceNPC(
          geometry,
          p,
          (n) => n.kind === 'fuel-attendant' && car?.stations.some((s) => s.id === n.siteId),
        ),
        station = car?.stations.find((s) => s.id === attendant?.siteId);
      if (kind === 'use-fuel-can') {
        if (!car || Math.hypot(car.position.x - p.x, car.position.z - p.z) > 4)
          return deny('Walk to your Ferrari.');
        const result = economy.trade(kind);
        if (result.ok) car.refuel();
        return result;
      }
      if (!station) return deny('Visit a gas station.');
      if (kind === 'extortion' && !fuelCarInRange(car, station, attendant))
        return deny(
          'The Ferrari is too far from this pump. Buy a fuel can and carry it back instead.',
        );
      const result =
        kind === 'extortion'
          ? station.paid
            ? economy.trade('extortion')
            : { ok: true }
          : economy.trade(station.paid ? 'fuel-can' : 'free-fuel-can');
      if (result.ok && kind === 'extortion') car.refuel();
      return result;
    }
    if (kind === 'rocket') return movement.travel(p, { kind: 'rocket' });
    return deny('Rewards and timed activities are calculated by the server.');
  }
  function action(p, args = {}) {
    const r = runtime(p),
      { verb } = args;
    if (
      !eligible(p) &&
      !['stopTraining', 'cancelFishing', 'rehabilitate', 'returnShip'].includes(verb) &&
      !(
        p.instance?.kind === 'kraken' &&
        p.hp > 0 &&
        !p.respawnAllowed &&
        ['attackKraken', 'collectPersonal'].includes(verb)
      )
    )
      return deny('Find your feet first.');
    let result;
    const questNPC = {
      acceptMonkey: 'professor',
      completeMonkey: 'professor',
      certificate: 'esoteric',
      permit: 'clerk',
      bayonet: 'armorer',
      skateboard: 'clerk',
      claimFunding: 'capital',
      finishRaptor: 'jurassic-scientist',
    };
    if (questNPC[verb]) {
      const key = questNPC[verb];
      if (
        !npc(p, (n) =>
          key === 'professor'
            ? n.id === 'ada-meridian'
            : n.kind === key || n.questRole === key || n.id === key,
        )
      )
        return deny('Speak to the appropriate NPC nearby.');
    }
    if (verb === 'tailorCloak') {
      const tailor = byKind(p, 'yohji');
      if (
        !tailor ||
        (tailor.interior &&
          geometry.placeAt &&
          geometry.placeAt(p.x - 0.5, p.z - 0.5)?.id !== tailor.interior.id)
      )
        return deny('Bring the hide to Yohji at his home in the southern garden lanes.');
      const pieces = ['black-cloak-top', 'black-cloak-bottom'].filter(
        (id) => !p.inventory.economy.state.ownedEquipment.includes(id),
      );
      if (!pieces.length) return deny('You already have the complete cloak. Wear it well.');
      if (!p.inventory.meta.bisonHides)
        return deny(
          'Bring me one bison hide from Golden Gate Park. I’ll make you a loose black top and a long black skirt.',
        );
      p.inventory.meta.bisonHides--;
      for (const itemId of pieces)
        p.inventory.receive({ lootKind: 'equipment', itemId, amount: 1 });
      p.gesture = 'talk';
      p.gestureUntil = now() + 900;
      result = {
        ok: true,
        message:
          'Yohji takes the hide, considers the silhouette, and hands you a black cloak top and bottom. “Leave room for the air.” Equip them in Character settings.',
        inventory: p.inventory.snapshot(),
      };
    } else if (verb === 'neighborhoodService') {
      const shopkeeper = npc(p, (n) => n.id === args.id && !!n.neighborhoodService),
        service = NEIGHBORHOOD_SERVICES[shopkeeper?.neighborhoodService],
        offer = service?.offers.find((o) => o.id === args.offer);
      if (!offer) return deny('Speak to the shopkeeper nearby.');
      if (
        offer.sandwich &&
        p.inventory.meta.sandwiches + offer.sandwich + (p.inventory.meta.deliveryPending ? 1 : 0) >
          sandwichCapacity(p.inventory.economy.state)
      )
        return deny('Your sandwich bag is full.');
      if (
        offer.showMs &&
        shopkeeper.showStartedAt > 0 &&
        now() < shopkeeper.showStartedAt + offer.showMs
      )
        return deny('The show is already underway. Enjoy this one, then ask for an encore.');
      const purse = p.inventory.economy.state;
      if (purse.coins < (offer.price || 0)) return deny('You need ' + offer.price + ' coins.');
      const laborKey = shopkeeper.id + ':' + offer.id,
        readyAt = p.profile.laborReadyAt?.[laborKey] || 0;
      if (offer.reward && now() < readyAt)
        return deny(
          'Come back in ' + Math.ceil((readyAt - now()) / 1000) + ' seconds for more work.',
        );
      if (offer.reward) {
        const paid = p.inventory.economy.credit(offer.reward);
        if (!paid.ok) return deny('Your coin purse is full.');
        (p.profile.laborReadyAt ??= {})[laborKey] = now() + offer.cooldownMs;
      }
      purse.coins -= offer.price || 0;
      if (offer.bouquet) purse.bouquets += offer.bouquet;
      if (offer.sandwich) p.inventory.meta.sandwiches += offer.sandwich;
      if (offer.showMs) shopkeeper.showStartedAt = Math.max(1, now());
      if (offer.heal) r.health.heal(offer.heal);
      if (offer.sober) r.inebriation.set(Math.max(0, r.inebriation.state.percent - offer.sober));
      p.gesture = offer.reward ? 'work' : service === NEIGHBORHOOD_SERVICES.tea ? 'drink' : 'talk';
      p.gestureUntil = now() + (offer.reward ? 2200 : 1200);
      result = {
        ok: true,
        message:
          offer.message +
          (offer.reward
            ? ' You receive ' +
              offer.reward +
              ' coin for your help. More work will be available in three minutes.'
            : ''),
      };
    } else if (verb === 'drinkBeer') result = trade(p, 'beer');
    else if (verb === 'refuel') result = trade(p, 'extortion');
    else if (verb === 'rentMotorcycle') result = trade(p, 'motorcycle-rental');
    else if (verb === 'acceptMonkey') result = r.quests.accept();
    else if (verb === 'completeMonkey') {
      result = r.quests.complete(p.inventory.economy);
      if (result.ok) r.keeper.stop();
    } else if (verb === 'stealMonkey') {
      const pen = geometry.sights?.find((n) => n.id === 'zoo-monkeys');
      if (!near(p, pen, 3)) return deny('Walk to the monkey enclosure.');
      result = r.quests.steal();
      if (result.ok) r.keeper.start();
    } else if (verb === 'certificate') result = r.quests.theyLive.certificate();
    else if (verb === 'permit') result = r.quests.theyLive.permit();
    else if (verb === 'bayonet') result = r.quests.theyLive.weapon();
    else if (verb === 'skateboard') result = r.quests.theyLive.reward();
    else if (verb === 'pickSunglasses') {
      if (!near(p, geometry.sunglassesSite, 2)) return deny('Walk to the sunglasses.');
      result = r.sunglasses.pickUp();
      if (result.ok) r.quests.theyLive.start();
    } else if (verb === 'claimFunding') result = r.strength.claim(p.inventory.economy);
    else if (verb === 'train') {
      if (Math.hypot(p.x - SF_FITNESS.x, p.z - SF_FITNESS.z) > 5) return deny('Visit SF Fitness.');
      movement.stop(p);
      const spot = gymExercisePosition(args.exercise);
      Object.assign(p, { x: spot.x, z: spot.z, y: SF_FITNESS.base + 0.07 });
      p.training = true;
      p.mode = 'train';
      p.gesture = gymExercise(args.exercise).action;
      p.gestureUntil = 0;
      result = { ok: true };
    } else if (verb === 'stopTraining') {
      movement.leaveTraining(p);
      r.strength.save();
      result = { ok: true };
    } else if (verb === 'fish') {
      if (!near(p, geometry.fishingSite, 2)) return deny('Walk to the wharf fishing spot.');
      movement.stop(p);
      result = r.fishing.start(geometry.fishingSite);
      if (result.ok) {
        p.gesture = 'fish';
        p.gestureUntil = 0;
      }
    } else if (verb === 'cancelFishing') {
      r.fishing.cancel();
      if (p.gesture === 'fish') p.gesture = '';
      result = { ok: true };
    } else if (verb === 'startRaptor') {
      if (!byKind(p, 'jurassic-scientist')) return deny('Speak to the Jurassic scientist.');
      result = r.expeditions.startQuest();
      if (result.ok) shared.command(p, 'releaseRaptor');
    } else if (verb === 'finishRaptor') result = r.expeditions.finishQuest();
    else if (verb === 'equipRailgun') {
      if (!r.expeditions.state.railgun) return deny('Obtain a railgun first.');
      r.expeditions.state.equipped = args.on === true;
      r.save('sf-expeditions-v1')(persistentExpedition(r));
      result = { ok: true };
    } else if (verb === 'cancelPitch') {
      r.social.cancelPitch();
      result = { ok: true };
    } else if (verb === 'pitch') {
      const target = npc(p, (n) => n.id === args.id && n.kind === 'software-buyer');
      if (!target) return deny('Speak to a nearby salesman.');
      result = r.social.startPitch({ ...target });
    } else if (verb === 'interviewStart') {
      if (!byKind(p, 'recruiter')) return deny('Visit the AI Lab recruiter.');
      if (!r.interview.start()) return deny('Your interview is already running.');
      r.lastInterview = false;
      result = interviewState(r);
    } else if (verb === 'interviewAnswer') {
      if (!r.interview.submit(args.answer)) return deny('Try that answer again.');
      result = interviewState(r);
    } else if (verb === 'interviewStatus') {
      r.interview.update();
      result = interviewState(r);
    } else if (verb === 'interviewCancel') {
      r.interview.cancel();
      result = { ok: true };
    } else if (verb === 'attackPersonal') {
      const target =
        shared.npcById.get(args.id) || geometry.merchants?.find((n) => n.id === args.id);
      if (!target || !near(p, target, 5)) return deny('Move closer to your target.');
      if (target.alienId && r.sunglasses.state.owned && p.appearance.sunglasses) {
        const valid = r.quests.theyLive.attack(target.alienId, { revealed: true });
        if (!valid.ok) {
          r.police.start();
          return valid;
        }
        movement.stop(p);
        p.attack = null;
        p.pvpTarget = null;
        target.hold = 2;
        let battle = r.battles.get(target.id);
        if (!battle) {
          battle = createAlienBattle({
            health: r.health,
            level: () => r.strength.status.level,
            defense: () => defense(p),
            bayonet: () => r.quests.theyLive.state.bayonet && r.battle?.weapon === 'bayonet',
            random,
            inebriation: () => r.inebriation.state.percent,
          });
          r.battles.set(target.id, battle);
        }
        r.battle = { target, weapon: args.weapon, battle };
        p.personalBattle = true;
        result = { ok: true };
      } else {
        r.police.start();
        result = { ok: true, message: 'The police are on their way!' };
      }
    } else if (verb === 'attackKraken') {
      if (p.instance?.kind !== 'kraken') return deny('Board the Pequod first.');
      result = r.expeditions.attack(r.expeditions.kraken, args.weapon || 'railgun');
    } else if (verb === 'collectPersonal') {
      const item = r.expeditions.state.loot.find((n) => n.id === args.id);
      if (!item || Math.hypot(p.x - item.x, p.z - item.z) > 3)
        return deny('That loot is not nearby.');
      result = r.expeditions.collect(item);
    } else if (verb === 'returnShip') {
      result =
        p.instance?.kind === 'kraken' && r.expeditions.returnShip()
          ? { ok: true, message: 'Ahab turns the Pequod toward the coast.' }
          : deny('Board the Pequod first.');
    } else if (verb === 'rehabilitate') {
      if (!p.personalJailed || p.detainAt || !geometry.detention?.walkable(p.x, p.z))
        return deny('Speak to the rehabilitation specialist from inside your cell.');
      p.rehabilitateAt = now() + 3500;
      send(p, { type: 'rehabilitating' });
      result = { ok: true };
    } else return deny('Unknown player action.');
    if (result.ok) {
      commit(p, r);
      if (verb === 'tailorCloak') result.inventory = p.inventory.snapshot();
    }
    return result;
  }
  function persistentExpedition(r) {
    const s = r.expeditions.state;
    return {
      raptor: s.raptor,
      railgun: s.railgun,
      equipped: s.equipped,
      cape: s.cape,
      krakenDefeated: s.krakenDefeated,
      krakenReward: s.krakenReward,
    };
  }
  function interviewState(r) {
    return {
      ok: true,
      interview: {
        phase: r.interview.state.phase,
        score: r.interview.state.score,
        remaining: r.interview.state.remaining,
        problem: r.interview.state.problem?.text || null,
      },
    };
  }
  function tick(dt) {
    for (const p of players.values()) {
      const r = runtime(p),
        coins = p.inventory.economy.state.coins,
        phone = p.inventory.economy.state.iphoneOwned;
      r.deli.state.sandwiches = p.inventory.meta.sandwiches;
      if (p.training) {
        if (!eligible(p) || p.moving || Math.hypot(p.x - SF_FITNESS.x, p.z - SF_FITNESS.z) > 5)
          p.training = false;
        else {
          r.strength.train(dt);
          if (p.level !== r.strength.status.level) {
            p.level = r.strength.status.level;
            p.revision++;
          }
          if (p.level === PROGRESSION.maxLevel) movement.leaveTraining(p);
        }
      }
      if (phone || p.inventory.economy.state.robotaxiOwned)
        r.tech.update(dt, { eligible: p.hp > 0 && !p.respawnAllowed });
      const inside =
        r.job.state.hired &&
        (geometry.placeAt
          ? geometry.placeAt(p.x - 0.5, p.z - 0.5)?.id === 'ai-lab'
          : geometry.places?.some(
              (n) =>
                n.id === 'ai-lab' &&
                p.x >= n.x &&
                p.x <= n.x + n.w &&
                p.z >= n.y &&
                p.z <= n.y + n.d,
            ));
      r.job.update(dt, { inside, eligible: eligible(p) });
      r.social.update(dt, {
        insideTwitter: geometry.instituteRoomAt?.(p.x, p.z)?.id === 'twitter-hq',
        sitting: ['sit', 'bench'].includes(p.mode) && !p.moving && p.hp > 0,
      });
      if (r.fishing.state.active) {
        if (!eligible(p) || p.moving || !near(p, geometry.fishingSite, 2)) {
          r.fishing.cancel();
          if (p.gesture === 'fish') p.gesture = '';
        } else {
          const result = r.fishing.update(dt);
          if (result) {
            if (p.gesture === 'fish') p.gesture = '';
            send(p, { type: 'notice', message: result.message });
          }
        }
      }
      if (r.deli.state.pending)
        r.deli.update(dt, { x: p.x - 0.5, y: p.z - 0.5 }, { deliverable: eligible(p) });
      if (r.interview.state.phase === 'running') r.interview.update();
      if (r.interview.state.phase === 'finished' && !r.lastInterview) {
        r.lastInterview = true;
        const result = r.job.recordInterview(r.interview.result());
        send(p, { type: 'interviewResult', ...result });
      }
      if (r.quests.carrying) r.keeper.update(dt);
      else r.keeper.stop();
      r.police.update(dt, GAMEPLAY.walkSpeed);
      if (!p.personalBattle) r.battle = null;
      if (r.battle) {
        const { target, battle } = r.battle;
        if (!eligible(p) || !near(p, target, 2)) {
          r.battle = null;
          p.personalBattle = null;
        } else {
          target.hold = 2;
          for (const event of battle.update(dt)) {
            if (event.type === 'player-hit') {
              awardCombat(p, event.damage);
              p.angle = Math.atan2(target.z - p.z, target.x - p.x);
              p.gesture = 'attack';
              p.gestureUntil = now() + 450;
              send(p, {
                type: 'sharedHit',
                attacker: p.id,
                target: target.id,
                damage: event.damage,
                hp: event.hp,
                max: 36,
                weapon: r.battle.weapon || 'unarmed',
                from: { x: p.x, y: p.y + 1, z: p.z },
                to: { x: target.x, y: target.base + 1, z: target.z },
              });
            }
            if (event.type === 'victory') {
              const result = r.quests.theyLive.defeat(target.alienId, { revealed: true });
              send(p, { type: 'notice', message: result.message });
              r.battle = null;
              p.personalBattle = null;
            }
          }
        }
      }
      if (p.instance?.kind === 'kraken') {
        if (!r.expeditions.ship.aboard) r.expeditions.board();
        r.expeditions.update(dt);
        const ship = r.expeditions.ship;
        if (ship.aboard) {
          p.x = ship.x;
          p.z = ship.z;
          p.y = PEQUOD.deck;
          p.mode = 'hidden';
        } else {
          instances.reset(p);
        }
      } else if (r.expeditions.ship.aboard) r.expeditions.abandonShip();
      if (p.detainAt && now() >= p.detainAt) {
        p.detainAt = 0;
        const jail = geometry.detention;
        Object.assign(p, { x: jail.x, z: jail.z, y: jail.base + 0.18, mode: 'walk' });
        send(p, { type: 'position', ...movement.position(p), reason: 'jail' });
        dirty(p);
      }
      if (p.rehabilitateAt && now() >= p.rehabilitateAt) {
        p.rehabilitateAt = 0;
        p.personalJailed = false;
        r.police.state.jailed = false;
        p.appearance = scrambleAppearance(p.appearance, random);
        r.save('sf-character-v1')(p.appearance);
        p.revision++;
        r.inebriation.set(100);
        const h = geometry.hospital;
        Object.assign(p, {
          x: h.x + 0.5,
          z: h.y + 0.5,
          y: geometry.characterGround(h.x + 0.5, h.y + 0.5),
          hp: p.max,
        });
        send(p, { type: 'position', ...movement.position(p), reason: 'respawn' });
      }
      r.save('sf-hitpoints-v1')({ hp: p.hp, max: p.max, xp: p.hitpointsXP });
      if (
        coins !== p.inventory.economy.state.coins ||
        phone !== p.inventory.economy.state.iphoneOwned
      )
        commit(p, r);
    }
  }
  function components(p) {
    return componentSnapshots.sample(p, runtime(p), travelState);
  }
  function transient(p) {
    return Object.fromEntries([...components(p)].map(([key, entry]) => [key, entry.value]));
  }

  function travelState(p) {
    const s = movement.state(p);
    return {
      rocket: s.rocket.state.active ? s.rocket.state : null,
      tahoe:
        s.tahoeValue && s.tahoeValue.state.mode !== 'ground'
          ? { ...s.tahoeValue.state, ramps: undefined }
          : null,
      sutro: s.sutro.state.active ? s.sutro.state : null,
      bomber: p.bomberActive
        ? { boost: s.bomber.state.boost, rollElapsed: s.bomber.state.rollElapsed }
        : null,
      surf:
        s.mode === 'surf'
          ? { wave: s.wave.state, jump: s.windsurf.state.jump, clock: shared.clock }
          : null,
    };
  }
  return {
    runtime,
    inventory,
    action,
    tick,
    transient,
    components,
    awardCombat,
    remove: (p) => {
      runtimes.delete(p.id);
      componentSnapshots.remove(p.id);
    },
    collect(p, award) {
      if (award.kind === 'raptor') {
        const r = runtime(p);
        r.expeditions.raptor.phase = 'dead';
        r.expeditions.recover();
      }
    },
    save(p) {
      const r = runtime(p);
      r.strength.save();
      r.tech.save();
      r.keeper.save();
    },
    attackIllegal: (p) => runtime(p).police.start(),
  };
}
