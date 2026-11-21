import readerContent from '../config/reader-content.json' with { type: 'json' };
import type {
  EditableEntity,
  InteractionSight,
  ActionReceipt,
  RuntimeDialogue,
  Place,
  Site,
  Actor,
} from '../types/world.ts';

import { hasSiteEntry, isLootTarget } from '../interaction-sights.ts';
import { isFiniteNumber } from '../types/json.ts';
import { requiredValue } from '../types/assert.ts';

import type { WorldPoint } from '../types/geometry.ts';

import type { ExpeditionEvent } from '../types/expeditions.ts';
import type { WorldContext } from './scene.ts';
// MENU-ACTION-IDS
// CONTENT-BINDINGS-MIGRATED
import { contentText } from '../content-runtime.ts';
import { setActionText, actionTargetKind } from '../context-menu.ts';
import { applyEntityEdits } from '../world-edits.ts';
import { menuFromContent, compileEntityDialogue } from '../content-game.ts';
import { dialogueChoices } from '../dialogue-choices.ts';
import {
  createAmbientDialogue,
  withAmbientConversation,
  GOOSE_CHAINS,
} from '../dialogues/ambient.ts';
import { configuredDialogue } from '../dialogue-config.ts';
import { mapInteractionResult } from '../interaction-results.ts';
import { neighborhoodShopDialogue } from '../neighborhood-interactions.ts';
import { serverConnected, serverCommand } from '../server-connection.ts';
import { growthDialogue } from '../finance-ui.ts';
import { atDuelArena } from '../duel-layout.ts';
import { debugTilePosition } from '../debug-console.ts';
import { dogSurfingDialogue } from '../dog-surfing.ts';
import { ITEM_STATS, selectedWeapon, equipmentOwned, railgunUnlocked } from '../item-stats.ts';
import { besideBear, bearPettingApproach } from '../wilderness.ts';
import { softwareSalesDialogue } from '../sales-conference.ts';
import { techMerchantDialogue } from '../tech-ventures.ts';
import { haberdasherDialogue } from '../haberdashery.ts';
import { saltActivistDialogue, saltClerkDialogue } from '../salt-mail.ts';
import { AIRSHIP_TERMINAL } from '../airship.ts';
import { taxDialogue } from '../southern-district.ts';
import { scientistDialogue, ahabDialogue } from '../jurassic.ts';
import { forwardRollTarget, FORWARD_ROLL_DURATION, FORWARD_ROLL_SPEED } from '../forward-roll.ts';
import '../combat.ts';
import { GYM_EXERCISES, gymExercise, gymExercisePosition } from '../gym-exercises.ts';
import { createFuelDialogue, refuelFerrariFromCan } from '../fuel.ts';
import { SF_FITNESS } from '../southern-layout.ts';
import { monkeyQuestDialogue } from '../quests.ts';
import { renderLoreBook } from '../world-lore.ts';
import { theyLiveDialogue } from '../they-live.ts';
import { squareNPCDialogue } from '../times-square-life.ts';
import { SKATE_TRICKS } from '../skateboard.ts';
import { parrotDialogue } from '../parrots.ts';
import { rehabilitationDialogue } from '../rehabilitation.ts';
import { railWorkerDialogue } from '../rail-works.ts';
import { createResearchDialogue } from '../research-dialogue.ts';
import { TAHOE } from '../tahoe.ts';
import '../airship-basket.ts';
import { airshipAttendantDialogue } from '../airship-rental.ts';
import { AIRSHIP_RULES } from '../config/airship.ts';
import { MERCHANTS } from '../economy.ts';
import { guildDialogue, marketFarmerDialogue, TECHNOLOGIST_MARKET } from '../guild.ts';
import { bankerDialogue } from '../banking.ts';
import { npcContextActions, promoteWalkAction } from '../npc-interactions.ts';
import { describeCharacter, sightPrimaryVerb } from '../descriptions.ts';
import { buildingNPCService } from '../building-interactions.ts';
import { WHALE_JUMP_LEAD_MS } from '../wildlife.ts';
import { dogWalkerDialogue } from '../companions.ts';
import { NIGHTLIFE, inNightlife } from '../nightlife.ts';
import { WINDSURF_LAUNCH } from '../windsurfing.ts';
import { SURF_TRICKS } from '../surfing.ts';

/** Interactions services for the browser scene.
 * Dependencies are explicit live scene bindings, preserving initialization
 * order without globals. This module only reads bindings when a method runs. */
export function createInteractions(context: WorldContext) {
  function openNPCDialogue(person: RuntimeDialogue & Partial<Actor>) {
    const owner =
      person.editorKey ||
      (person.id
        ? 'actor:' + person.id
        : context.approachingNPC?.id
          ? 'actor:' + context.approachingNPC.id
          : null);
    if (owner) {
      person = { ...person, editorKey: owner };
      applyEntityEdits(person, owner);
    }
    const offer = (label: string, op: string) => ({
      label,
      accept: () => serverCommand(context.multiplayer, 'inventory', { op }),
      contentNodeId: 'world.interactions.offer.node-1',
      actionId: 'world.interactions.offer.action-2' + ':' + [op].join(':'),
    });
    if (person.questRole === 'armorer')
      person = {
        ...person,
        choices: [...dialogueChoices(person), offer('Buy 20 akimbo rounds · 5 coins', 'buyAmmo')],
        contentNodeId: 'world.interactions.openNPCDialogue.node-3',
      };
    return context.dialogue.open(
      compileEntityDialogue(withAmbientConversation(person), owner || '', context),
    );
  }

  function guildStatus() {
    return {
      visits: 0,
      member: false,
      ...context.multiplayer?.state.guild,
      peptides: context.multiplayer?.state.inventory?.peptides || 0,
    };
  }

  function sightById(id: string) {
    return context.sights.find((s) => s.id === id);
  }

  function playerWeapon() {
    return selectedWeapon(context.playerLook.weapon, {
      bayonet: context.quests.theyLive.state.bayonet,
      railgun: railgunUnlocked(context.expeditions.state) && context.expeditions.state.equipped,
      battleaxe: equipmentOwned(context.economy.state, 'battleaxe'),
      akibo: equipmentOwned(context.economy.state, 'akibo'),
    });
  }

  function attackWildMonster(npc: Actor) {
    if (
      context.capture.state.active ||
      context.chase?.state.jailed ||
      context.secretWorld?.bomber.state.active ||
      context.flying() ||
      context.rocket.state.active ||
      context.surf.state.riding ||
      context.rope.climbing ||
      context.sutroClimb.state.active ||
      context.tahoe.state.mode !== 'ground'
    )
      return false;
    if (context.ferrari?.state.riding) return parkCarFirst();
    const attack = () => {
      if (context.bike.riding) parkBike();
      parkMotorcycle(false);
      context.skateboard.riding = false;
      setDancing(false);
      context.alienCombat = null;
      context.expeditions.stop();
      context.wildTarget = npc;
      context.player.path = [];
      context.player.speed = 0;
      {
        context.multiplayerWorld.command('attack', { id: npc.id, weapon: playerWeapon() });
        context.wildTarget = null;
      }
      return true;
    };
    closeMenu();
    closeReader();
    const point = context.creatureApproach(npc);
    if (!point) {
      announce('You cannot reach the ' + npc.label.toLowerCase() + ' from here.');
      return false;
    }
    return Math.hypot(point.x - context.player.x, point.y - context.player.y) < 0.08
      ? attack()
      : walkTo(point.x, point.y, attack);
  }

  function petBear(npc: Actor, replans = 0): boolean {
    if (
      context.capture.state.active ||
      context.chase?.state.jailed ||
      context.secretWorld?.bomber.state.active ||
      context.flying() ||
      context.rocket.state.active ||
      context.surf.state.riding
    )
      return false;
    if (context.ferrari?.state.riding) return parkCarFirst();
    const inReach = () =>
      besideBear({ x: context.player.x + 0.5, z: context.player.y + 0.5 }, npc) &&
      context.canTravel(context.player.x, context.player.y, npc.x - 0.5, npc.z - 0.5, true);
    closeMenu();
    const pet = () => {
      // The bear may have wandered while we walked over. Re-plan beside
      // its live position, never walk onto the animal's occupied tile.
      if (!inReach()) return replans < 4 ? petBear(npc, replans + 1) : false;
      context.wildTarget = null;
      context.expeditions.stop();
      setDancing(false);
      if (context.bike.riding) parkBike();
      parkMotorcycle(false);
      context.skateboard.riding = false;
      const finish = (result: ActionReceipt) => {
        if (result.ok) {
          context.player.angle = Math.atan2(
            npc.z - context.player.y - 0.5,
            npc.x - context.player.x - 0.5,
          );
          context.player.gesture = {
            name: contentText('world.interactions.finish.name-8', {}),
            started: performance.now(),
            duration: 1500,
          };
        }
        return result.ok;
      };
      context.multiplayerWorld.command('petBear', { id: npc.id }).then(finish);
      return true;
    };
    if (inReach()) return pet();
    const point = bearPettingApproach({
      from: context.player,
      bear: npc,
      free: context.landClearAt,
      canTravel: context.canTravel,
      pathTo: context.pathTo,
    });
    return point ? walkTo(point.x, point.y, pet) : false;
  }

  function buyBattleaxe() {
    return { ok: true, pending: true, promise: serverCommand(context.multiplayer, 'buyBattleaxe') };
  }

  function expeditionEvent(e: ExpeditionEvent) {
    if (context.headless) return;
    if (e.message && e.type !== 'damage' && e.type !== 'shot')
      announce(
        e.message,
        e.type === 'illegal' ? 'Police' : e.type === 'damage' ? 'Combat' : 'Adventure',
      );
    if (e.type === 'illegal') {
      context.chase.start();
      context.$('sf-wanted').hidden = false;
    }
    if (e.type === 'shot' && e.target) {
      context.combatFeedback.hit(e.target, e.damage!, e.hp!, e.max!);
      context.combatFeedback.show(
        context.player,
        context.health.state.hp,
        context.health.state.max,
      );
      context.player.angle = Math.atan2(
        e.target.z - context.player.y - 0.5,
        e.target.x - context.player.x - 0.5,
      );
      context.player.gesture = {
        name: contentText('world.interactions.expeditionEvent.name-9', {}),
        started: performance.now(),
        duration: 450,
      };
    }
    if (e.type === 'boarded') {
      parkMotorcycle(false);
      if (context.bike.riding) parkBike();
      context.skateboard.riding = false;
      context.alienCombat = null;
      setDancing(false);
      context.player.path = [];
      context.player.speed = 0;
      context.action = null;
      context.destination = null;
      closeMenu();
      context.setCamera(0.65, 0.8);
    }
    if (e.type === 'disembarked' && context.pequodSite) {
      Object.assign(context.player, context.pequodSite.entry);
      context.player.path = [];
      context.player.speed = 0;
    }
    if (e.type === 'disembarked' && context.secretWorld?.kind === 'kraken')
      secretAction(context.secretWorld.leave());
    if (e.type === 'damage') {
      context.combatFeedback.hit(context.player, e.damage!, e.hp!, e.max!);
      if (e.target) context.combatFeedback.show(e.target, e.target.hp!, e.target.max!);
      context.updateAdventureUI();
    }
    if (e.type === 'death') beginCapture('alien', respawnAtHospital);
    if (e.type === 'cape') context.updateCapeControl();
  }

  function talkExpeditionNPC(npc: Actor) {
    if (
      context.capture.state.active ||
      context.chase?.state.jailed ||
      context.flying() ||
      context.rocket.state.active ||
      context.surf.state.riding ||
      context.rope.climbing ||
      context.sutroClimb.state.active ||
      context.tahoe.state.mode !== 'ground'
    )
      return false;
    if (context.ferrari?.state.riding) return parkCarFirst();
    context.expeditions.stop();
    closeMenu();
    closeReader();
    const open = () =>
      openNPCDialogue(
        npc.expeditionRole === 'scientist'
          ? scientistDialogue(npc, context.expeditions)
          : ahabDialogue(npc, context.expeditions),
      );
    if (context.expeditions.ship.aboard && npc === context.ahabNPC) {
      open();
      return true;
    }
    return approachNPC(npc, open);
  }

  function attackExpeditionTarget(npc: Actor) {
    if ((['cow', 'raptor'] satisfies [string, string]).includes(npc.combatKind || ''))
      return attackWildMonster(npc);
    if (
      context.capture.state.active ||
      context.chase?.state.jailed ||
      context.flying() ||
      context.rocket.state.active ||
      context.surf.state.riding ||
      context.rope.climbing ||
      context.sutroClimb.state.active ||
      context.tahoe.state.mode !== 'ground'
    )
      return false;
    const weapon = playerWeapon(),
      range = ITEM_STATS[weapon].range;
    if (
      npc.combatKind === 'kraken' &&
      !(['railgun', 'akibo'] satisfies [string, string]).includes(weapon)
    ) {
      announce('Equip your railgun to fight the kraken.', 'Equipment');
      return false;
    }
    if (
      weapon === 'railgun' &&
      (!railgunUnlocked(context.expeditions.state) || !context.expeditions.state.equipped)
    ) {
      announce('You do not have a suitable weapon equipped.');
      return false;
    }
    if (npc.combatKind === 'raptor' && context.expeditions.raptor.phase === 'caged') {
      announce('The cage is locked.');
      return false;
    }
    if (npc.alienId) {
      const permission = context.quests.theyLive.attack(npc.alienId, {
        revealed: context.npcRevealed(npc),
      });
      if (!permission.ok) {
        announce(permission.message);
        if (permission.illegal) {
          context.chase.start();
          context.$('sf-wanted').hidden = false;
        }
        return false;
      }
      npc.combatKind = 'spectre';
      npc.hp = npc.alienHP ?? 36;
      npc.max = 36;
    }
    const shoot = () => {
      if (context.bike.riding) parkBike();
      parkMotorcycle(false);
      context.skateboard.riding = false;
      context.alienCombat = null;
      context.player.path = [];
      context.player.speed = 0;
      setDancing(false);
      const result = context.expeditions.attack(npc, weapon);
      if (result.message) announce(result.message, 'Railgun');
      context.canvas.focus({ preventScroll: true });
      return result.ok || result.cooldown;
    };
    closeMenu();
    if (
      Math.hypot(npc.x - context.player.x - 0.5, npc.z - context.player.y - 0.5) <= range &&
      context.railgunLineClear(
        { x: context.player.x + 0.5, z: context.player.y + 0.5, base: context.playerGround() },
        npc,
      )
    )
      return shoot();
    if (context.expeditions.ship.aboard) return false;
    const point = nearestExpeditionPoint(
      npc.x - 0.5,
      npc.z - 0.5,
      range,
      (x: number, y: number) => {
        const d = Math.hypot(x + 0.5 - npc.x, y + 0.5 - npc.z);
        return (
          d > 0.6 &&
          d < range - 0.1 &&
          context.landClearAt(x, y) &&
          context.railgunLineClear(
            { x: x + 0.5, z: y + 0.5, base: context.characterGround(x + 0.5, y + 0.5) },
            npc,
          )
        );
      },
    );
    if (!point) {
      announce('You cannot reach that target with your current weapon.');
      return false;
    }
    return walkTo(point.x, point.y, shoot);
  }

  function nearestExpeditionPoint(
    x: number,
    y: number,
    radius: number,
    predicate: ((x: number, y: number) => boolean) | undefined,
  ) {
    if (context.marinLand?.onLand(x + 0.5, y + 0.5))
      return context.marinLand.nearest(x, y, radius, predicate);
    return y >= context.N - 1.5
      ? context.airship.nearest(x, y, radius, predicate)
      : context.nearestNavigation(x, y, radius, predicate);
  }

  function collectExpeditionLoot(item: InteractionSight) {
    if (!isLootTarget(item)) return false;
    if (context.capture.state.active || context.chase?.state.jailed) return false;
    closeMenu();
    const collect = () => {
      const r = context.expeditions.collect(item);
      if (r.message) announce(r.message, 'Loot');
      context.updateAdventureUI();
      return r.ok;
    };
    const distance = Math.hypot(item.x - context.player.x - 0.5, item.z - context.player.y - 0.5);
    if (context.expeditions.ship.aboard)
      return item.lootKind === 'kraken' && distance < 2 ? collect() : false;
    if (context.airship.state.active) {
      const floor = item.base ?? context.characterGround(item.x, item.z);
      return distance < 1.5 && Math.abs(context.playerGround() - floor) < 2.5 ? collect() : false;
    }
    if (distance < 1.5) return collect();
    const point = nearestExpeditionPoint(item.x - 0.5, item.z - 0.5, 1.3, (x: number, y: number) =>
      context.landClearAt(x, y),
    );
    return point ? walkTo(point.x, point.y, collect) : false;
  }

  function toggleRailgun() {
    if (!railgunUnlocked(context.expeditions.state)) return false;
    const equipped = playerWeapon() === 'railgun';
    context.playerLook.weapon = equipped
      ? context.quests.theyLive.state.bayonet
        ? 'bayonet'
        : 'unarmed'
      : 'railgun';
    context.expeditions.state.equipped = equipped;
    if (context.expeditions.toggleWeapon()) {
      context.alienCombat = null;
      try {
        localStorage.setItem('sf-character-v1', JSON.stringify(context.playerLook));
      } catch {}
      context.updateAdventureUI();
    }
    context.canvas.focus({ preventScroll: true });
  }

  function releaseTiger() {
    {
      context.multiplayerWorld.releaseTiger();
      return true;
    }
  }

  function beginCapture(
    kind: string,
    complete: { (rehabilitated?: boolean): void; (rehabilitated?: boolean): void; (): void },
  ) {
    if (context.capture.state.active) return;
    context.social.cancelPitch();
    context.expeditions.stop();
    context.fishing.cancel();
    context.forwardRoll.cancel();
    context.skateboard.riding = false;
    context.alienCombat = null;
    parkMotorcycle(false);
    if (context.ferrari?.state.riding) parkFerrari();
    if (context.training) stopTraining();
    setDancing(false);
    context.questMenu?.close();
    context.closeCharacter();
    const base = context.playerGround(true);
    if (
      !context.capture.start(kind, base, () => {
        context.world.inert = false;
        complete();
      })
    )
      return;
    context.tech.losePhone(kind === 'police' ? 'arrest' : 'death');
    closeMenu();
    closeReader();
    context.closeHelp();
    context.dialogue.close();
    context.aiInterview.close();
    context.keys.clear();
    context.pointers.clear();
    clearTimeout(context.pressTimer);
    context.action = null;
    context.destination = null;
    context.player.path = [];
    context.player.speed = 0;
    context.player.motion = 0;
    context.player.moving = false;
    context.player.gesture = null;
    context.playerSpeechUntil = 0;
    if (context.bike.riding) {
      context.bike.x = context.player.x;
      context.bike.y = context.player.y;
      context.bike.riding = false;
    }
    context.waveSurf.stop();
    context.surf.cancelJump();
    context.surf.state.riding = false;
    context.tahoe.reset();
    context.rope.reset();
    context.sutroClimb.cancel();
    context.world.inert = true;
  }

  function respawnAtHospital(rehabilitated = false) {
    context.secretWorld?.reset();
    if (context.multiplayer?.state.connected && !rehabilitated)
      context.multiplayer.command('respawn');
    context.social.cancelPitch();
    if (!rehabilitated) context.tech.losePhone('death');
    context.expeditions.abandonShip();
    context.health.restore();
    context.combatFeedback.clear();
    context.alienCombat = null;
    context.forwardRoll.cancel();
    context.action = null;
    context.destination = null;
    context.dialogue.close();
    closeMenu();
    closeReader();
    context.closeHelp();
    context.keys.clear();
    context.pointers.clear();
    clearTimeout(context.pressTimer);
    context.gesture = false;
    context.rocket.cancel();
    context.rope.reset();
    context.airship.cancel();
    context.sutroClimb.cancel();
    context.tahoe.reset();
    context.waveSurf.stop();
    context.surf.cancelJump();
    context.surf.state.riding = false;
    context.bike.riding = false;
    context.currentInterior = null;
    context.readerPlace = null;
    context.playerSpeechUntil = 0;
    if (context.chase) {
      context.chase.state.wanted = false;
      context.chase.state.jailed = false;
      context.chase.state.officers = [];
    }
    context.$('sf-wanted').hidden = true;
    context.$('sf-custody').hidden = true;
    const entry = requiredValue(sightById('ucsf'), 'Missing authored entity: ucsf').entry;
    Object.assign(context.player, {
      x: entry.x,
      y: entry.y,
      path: [],
      speed: 0,
      moving: false,
      motion: 0,
      phase: 0,
      runBlend: 0,
      vx: 0,
      vy: 0,
      gesture: null,
      angle: Math.PI,
    });
    for (const input of context.world.querySelectorAll<HTMLButtonElement>(
      '#sf-map-button,#sf-bike-button,.sf-place-marker',
    ))
      input.disabled = false;
    context.updateClimbButton();
    context.updateRocketControls();
    context.updateAirshipButton();
    context.updateSurfButton();
    context.updateBikeButton();
    context.updateTahoeButton();
    context.setCamera(-Math.PI * 0.75 - 0.18, 1.08);
    context.drawMini();
    announce(
      rehabilitated
        ? 'Rehabilitation complete. You arrive outside UCSF in a completely different outfit, 100% inebriated.'
        : 'You have died and respawned at UCSF Hospital',
      'Hospital',
    );
    context.canvas.focus({ preventScroll: true });
  }

  function airshipUnavailable() {
    if (context.clickAttempt) context.clickAttempt.worked = false;
    announce(
      'Return the airship to the terminal before using a vehicle or entering a building. Press A to land.',
    );
    return false;
  }

  function boardAirship(
    price = context.multiplayerWorld?.sharedAirship?.rentalPrice ?? AIRSHIP_RULES.initialPrice,
  ) {
    if (context.chase?.state.jailed || context.sutroClimb.state.active || context.surf.state.riding)
      return false;
    const entry = AIRSHIP_TERMINAL.boarding;
    if (Math.hypot(context.player.x - entry.x, context.player.y - entry.y) > 0.08) {
      closeReader();
      closeMenu();
      return walkTo(entry.x, entry.y, () => boardAirship(price));
    }
    if (context.bike.riding) parkBike();
    parkMotorcycle(false);
    closeReader();
    closeMenu();
    serverCommand(context.multiplayer, 'airshipBoard', { price }).then((result) => {
      if (!result.ok) {
        announce(result.message, 'Airship');
        return;
      }
      context.rope.reset();
      context.ropeReturnHome = false;
      context.basket.reset();
      context.basketArrival = null;
      context.keys.clear();
      context.player.path = [];
      context.player.speed = 0;
      context.player.gesture = null;
      context.action = null;
      context.destination = null;
      context.currentInterior = null;
      context.updateAirshipButton();
      announce(
        'You board the airship’s white flight basket. Click its floor to walk around; click the ground or minimap to fly.',
        'Pilot',
      );
      context.canvas.focus({ preventScroll: true });
    });
    return true;
  }

  function walkInBasket(point: WorldPoint) {
    setDancing(false);
    context.basketArrival = null;
    const ok = context.basket.walkTo(point.x, point.z);
    if (ok) {
      closeMenu();
      context.canvas.focus({ preventScroll: true });
    }
    return ok;
  }

  function showAirshipMenu(sx = context.width / 2, sy = context.height / 2) {
    closeMenu();
    const menu = context.$('sf-context');
    menu.replaceChildren();
    const title = document.createElement('div');
    title.className = 'sf-context-title';
    title.textContent = context.airship.state.active
      ? 'Airship · Choose an option'
      : 'Private Jet Terminal · Airship rental';
    menu.append(title);
    const floor = context.flying()
      ? context.basket.pick(
          context.mouseRay(sx, sy),
          context.airship.state.position!,
          context.airship.state.heading,
        )
      : null;
    const sharedShip = context.multiplayerWorld?.sharedAirship,
      price = sharedShip?.rentalPrice ?? AIRSHIP_RULES.initialPrice;
    const rentalLabel = sharedShip?.active
      ? 'Board as passenger'
      : sharedShip?.reservedFor === context.multiplayer?.state.id
        ? 'Board prepaid airship'
        : 'Rent airship · ' + price + ' coins';
    const choices: [string, () => unknown][] = context.airship.state.active
      ? [
          ...(floor
            ? [['Walk here', () => walkInBasket(floor)] satisfies [string, () => unknown]]
            : []),
          [
            'Fly to Tahoe',
            () => {
              if (context.rope.state.deployed) {
                announce('Retract the rope before flying.');
                return false;
              }
              context.airship.flyTo(TAHOE.base.x, TAHOE.base.z);
              context.destination = { x: TAHOE.base.x - 0.5, y: TAHOE.base.z - 0.5 };
              announce(
                'Flying northeast across California to Lake Tahoe. This is a long continuous flight.',
                'Pilot',
              );
              return true;
            },
          ],
          ['Rope options', showRopeMenu],
          ['Return to terminal', useAirship],
          [
            'Float here',
            () => {
              const p = context.tileAt(sx, sy);
              walkTo(p.x, p.y);
            },
          ],
        ]
      : [
          [rentalLabel, () => boardAirship(price)],
          ...(context.multiplayerWorld
            ? [
                [
                  'Buy grappling hook · 5 coins',
                  () => context.multiplayerWorld.buyGrapple(),
                ] satisfies [string, () => unknown],
              ]
            : []),
          ['Examine terminal', () => examine(sightById('airship'))],
        ];
    if (!context.airship.state.active)
      choices.splice(1, 0, [
        'Talk-To Airship attendant',
        () =>
          talkAirshipAttendant(context.merchants.find((n) => n.id === 'airship-rental-attendant')),
      ]);
    for (const [label, fn] of choices) {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'menuitem');
      setActionText(button, label, [
        { label: contentText('world.interactions.showAirshipMenu.label-10', {}), kind: 'npc' },
        { label: contentText('world.interactions.showAirshipMenu.label-11', {}), kind: 'object' },
        { label: contentText('world.interactions.showAirshipMenu.label-12', {}), kind: 'object' },
      ]);
      button.addEventListener('click', (e) =>
        clicked(e.clientX, e.clientY, () => {
          closeMenu();
          return fn();
        }),
      );
      menu.append(button);
    }
    promoteWalkAction(menu);
    menu.hidden = false;
    menu.style.left = Math.min(context.width - menu.offsetWidth - 12, Math.max(12, sx)) + 'px';
    menu.style.top = Math.min(context.height - menu.offsetHeight - 12, Math.max(12, sy)) + 'px';
    menu.querySelector<HTMLElementTagNameMap['button']>('button')!.focus({ preventScroll: true });
    return true;
  }

  function useAirship() {
    if (context.tahoe.state.mode !== 'ground') return false;
    if (context.chase?.state.jailed) return false;
    if (context.rope.climbing) return false;
    if (context.rope.onGround) {
      context.ropeReturnHome = true;
      return climbRope(false);
    }
    if (context.rope.state.deployed && !context.rope.retract()) {
      announce('Wait for your passenger to finish climbing.');
      return false;
    }
    if (context.airship.state.active) {
      closeMenu();
      closeReader();
      context.basketArrival = null;
      context.basket.state.target = null;
      context.airship.returnHome();
      context.destination = { x: context.airship.home.x - 0.5, y: context.airship.home.z - 0.5 };
      context.action = null;
      context.updateAirshipButton();
      announce(
        'Returning to the private jet terminal. The airship will descend onto its mooring.',
        'Pilot',
      );
      context.canvas.focus({ preventScroll: true });
      return true;
    }
    if (context.sutroClimb.state.active) return climbUnavailable();
    if (context.surf.state.riding) {
      if (context.clickAttempt) context.clickAttempt.worked = false;
      announce('Return to shore before renting an airship.');
      return false;
    }
    const entry = AIRSHIP_TERMINAL.entry;
    if (Math.hypot(context.player.x - entry.x, context.player.y - entry.y) < 1)
      return showAirshipMenu();
    closeReader();
    closeMenu();
    const accepted = walkTo(entry.x, entry.y, showAirshipMenu);
    if (accepted)
      announce('Walking south to the private jet terminal and airship rental stand.', 'Pilot');
    context.canvas.focus({ preventScroll: true });
    return accepted;
  }

  function readLoreBook(site: InteractionSight) {
    if (!hasSiteEntry(site)) return false;
    if (!context.multiplayer?.state.connected || !canUseTablet()) return false;
    closeMenu();
    closeReader();
    return walkTo(site.entry.x, site.entry.y, () => {
      context.dialogue.close();
      context.closeCharacter();
      context.closeHelp();
      context.readerPlace = site;
      context.world.classList.add('sf-reading');
      const book = renderLoreBook(
        context.$('sf-reader-content'),
        requiredValue(site.bookId, 'Readable book ID'),
      );
      context.$('sf-reader').dataset.lore = 'true';
      context.$('sf-reader-title').textContent = book.title;
      context.$('sf-reader-category').textContent = 'From a local bookshelf';
      context.$('sf-reader-description').textContent = book.subtitle;
      context.$('sf-reader').hidden = false;
      context.$('sf-reader-shade').hidden = true;
      context.$('sf-reader').scrollTop = 0;
    });
  }

  function searchHouseStorage(site: InteractionSight) {
    if (!hasSiteEntry(site)) return false;
    if (!context.multiplayerWorld || context.capture.state.active || context.chase?.state.jailed)
      return false;
    closeMenu();
    closeReader();
    return walkTo(site.entry.x, site.entry.y, async () => {
      const result = await context.multiplayer.command('searchHouse', { id: site.id });
      if (result.message) announce(result.message, 'You');
      if (result.ok)
        context.player.gesture = {
          name: contentText('world.interactions.searchHouseStorage.name-13', {}),
          started: performance.now(),
          duration: 1200,
        };
    });
  }

  function useRocket(sight: Site | undefined, npcInput: Actor | null = null) {
    const npc =
      npcInput || context.merchants.find((n) => n.kind === 'crew' && n.siteId === sight?.id);
    if (!npc) return false;
    if (
      context.rocket.state.active ||
      context.chase?.state.jailed ||
      context.rope.climbing ||
      context.sutroClimb.state.active ||
      context.tahoe.state.mode !== 'ground' ||
      context.flying()
    )
      return false;
    const go = () => {
      closeMenu();
      closeReader();
      context.player.path = [];
      context.player.speed = 0;
      context.keys.clear();
      const toTahoe = requiredValue(sight, 'Rocket site').id === 'sf-spaceport';
      openNPCDialogue(
        configuredDialogue(
          'rocket',
          npc,
          {
            launch: () => ({
              ok: true,
              after: () => {
                serverCommand(context.multiplayer, 'travel', { kind: 'rocket' }).then((result) => {
                  if (!result.ok) {
                    announce(
                      result.message || 'Unable to launch. Please speak to the attendant again.',
                      'SpaceX',
                    );
                    return;
                  }
                  context.rope.reset();
                  context.airship.cancel();
                  context.waveSurf.stop();
                  context.surf.cancelJump();
                  context.surf.state.riding = false;
                  context.bike.riding = false;
                  context.tahoe.reset();
                  context.currentInterior = null;
                  context.action = null;
                  context.destination = null;
                  context.setCamera(Math.PI * 0.75 + 0.3, 0.72);
                  context.setZoom(0.85);
                  context.updateAirshipButton();
                  context.updateTahoeButton();
                  context.updateRocketControls();
                  context.drawMini();
                  announce(
                    'You board the reusable rocket. Next stop: ' +
                      (toTahoe ? 'Lake Tahoe.' : 'San Francisco.'),
                    'SpaceX',
                  );
                });
              },
            }),
          },
          { destination: toTahoe ? 'to Lake Tahoe' : 'back to San Francisco' },
        ),
      );
    };
    return approachNPC(npc, go);
  }

  function useGondola(up = true) {
    if (context.ferrari?.state.riding) return parkCarFirst();
    if (
      context.chase?.state.jailed ||
      context.flying() ||
      context.rope.climbing ||
      context.tahoe.state.mode !== 'ground'
    )
      return false;
    const entry = up ? context.tahoe.baseEntry : context.tahoe.summitEntry,
      start = () => {
        closeMenu();
        closeReader();
        context.player.path = [];
        context.player.speed = 0;
        context.action = null;
        context.destination = null;
        context.tahoe.gondola(up);
        context.updateTahoeButton();
        announce(
          up
            ? 'You board the gondola. The mountain rises far above the lake.'
            : 'You board the gondola down to the lakeside station.',
          'Gondola',
        );
      };
    if (Math.hypot(context.player.x - entry.x, context.player.y - entry.y) < 2) {
      start();
      return true;
    }
    return walkTo(entry.x, entry.y, start);
  }

  function rentSkis() {
    if (context.ferrari?.state.riding) return parkCarFirst();
    if (context.tahoe.state.rented) {
      announce('Your skis are already rented for this visit.');
      return true;
    }
    return talkLiftAttendant(context.merchants.find((n) => n.kind === 'lift'));
  }

  function talkLiftAttendant(npc: Actor | undefined) {
    if (!npc) return false;
    if (
      !npc ||
      context.capture.state.active ||
      context.chase?.state.jailed ||
      context.flying() ||
      context.rope.climbing ||
      context.rocket.state.active ||
      context.tahoe.state.mode !== 'ground'
    )
      return false;
    return approachNPC(npc, () =>
      openNPCDialogue(
        configuredDialogue('ski-lift', npc, {
          rentSkis: async () => {
            if (context.tahoe.state.rented)
              return { ok: false, message: 'Your skis are already rented for this visit.' };
            const result = await serverCommand(context.multiplayer, 'inventory', {
              op: 'trade',
              kind: 'skis',
            });
            if (result.ok) context.tahoe.state.rented = true;
            context.updateTahoeButton();
            return {
              ...result,
              message: result.ok
                ? 'Your skis are ready. Use Ski down to begin your descent.'
                : result.message,
            };
          },
        }),
      ),
    );
  }

  function startSkiRun() {
    if (!context.tahoe.state.rented) return rentSkis();
    const start = () => {
      context.player.path = [];
      context.player.speed = 0;
      context.action = null;
      context.destination = null;
      context.tahoe.startSki();
      context.setCamera((-Math.PI * 3) / 4, 0.65);
      context.updateTahoeButton();
      announce('You push off. Click to steer and press Space while airborne to flip!', 'Skiing');
    };
    if (
      Math.hypot(
        context.player.x - context.tahoe.summitEntry.x,
        context.player.y - context.tahoe.summitEntry.y,
      ) < 1.2
    ) {
      start();
      return true;
    }
    return walkTo(context.tahoe.summitEntry.x, context.tahoe.summitEntry.y, start);
  }

  function useTahoeActivity() {
    if (context.tahoe.state.mode === 'ski') return context.tahoe.flip();
    if (context.tahoe.state.mode === 'gondola') return false;
    return Math.hypot(
      context.player.x + 0.5 - TAHOE.peak.x,
      context.player.y + 0.5 - TAHOE.peak.z,
    ) < 10
      ? context.tahoe.state.rented
        ? startSkiRun()
        : rentSkis()
      : useGondola(true);
  }

  function approachNPC(
    npc: Actor | null | undefined,
    begin: () => void,
    { distance = 1.8, approach = context.merchantApproach } = {},
  ): boolean {
    if (!npc) return false;
    const open = () => {
      context.fishing.cancel();
      releaseNPC();
      context.approachingNPC = npc;
      npc.waiting = true;
      npc.speech = '';
      npc.speechUntil = 0;
      npc.hold = 2;
      npc.moving = false;
      npc.motion = 0;
      context.player.path = [];
      context.player.speed = 0;
      context.action = null;
      context.destination = null;
      context.keys.clear();
      if (!npc.seated && !npc.fixedFacing && Number.isFinite(npc.x) && Number.isFinite(npc.z))
        npc.angle = Math.atan2(context.player.y + 0.5 - npc.z, context.player.x + 0.5 - npc.x);
      begin();
    };
    if (
      distance === Infinity ||
      Math.hypot(context.player.x + 0.5 - npc.x, context.player.y + 0.5 - npc.z) < distance
    ) {
      open();
      return true;
    }
    const target = approach(npc);
    if (!target) return false;
    const accepted = walkTo(target.x, target.y, open);
    if (accepted && context.player.path.length) {
      context.approachingNPC = npc;
      npc.waiting = true;
      npc.moving = false;
      npc.motion = 0;
    }
    return accepted;
  }

  function releaseNPC() {
    if (context.approachingNPC) {
      if (!context.approachingNPC.thinking) context.approachingNPC.waiting = false;
      context.approachingNPC = null;
    }
  }

  function talkResearcher(npc: Actor) {
    if (context.ferrari?.state.riding) return parkCarFirst();
    if (
      context.chase?.state.jailed ||
      context.rope.climbing ||
      context.sutroClimb.state.active ||
      context.rocket.state.active
    )
      return false;
    if (context.flying()) return airshipUnavailable();
    closeReader();
    closeMenu();
    return approachNPC(npc, () =>
      openNPCDialogue(
        npc.id === 'ada-meridian'
          ? monkeyQuestDialogue(npc, context.quests, context.economy)
          : createResearchDialogue(npc),
      ),
    );
  }

  function talkRailWorker(npc: Actor | undefined) {
    if (!npc) return false;
    if (context.ferrari?.state.riding) return parkCarFirst();
    if (context.chase?.state.jailed || context.flying() || context.capture.state.active)
      return false;
    closeMenu();
    closeReader();
    return approachNPC(npc, () => openNPCDialogue(railWorkerDialogue()));
  }

  function stealQuestMonkey() {
    if (context.ferrari?.state.riding) return parkCarFirst();
    if (
      context.chase?.state.jailed ||
      context.flying() ||
      context.capture.state.active ||
      context.surf.state.riding
    )
      return false;
    const site = requiredValue(sightById('zoo-monkeys'), 'Missing authored entity: zoo-monkeys'),
      take = () => {
        const result = mapInteractionResult(context.quests.steal(), (receipt) => {
          if (receipt.ok) {
            context.player.path = [];
            context.player.speed = 0;
            context.action = null;
            context.destination = null;
            context.monkeyKeeper.start();
            announce(
              '“Stop! That monkey has a keeper!” The zookeeper gives chase.',
              'Monkey Business',
            );
          }
          return receipt;
        });
        return result.ok;
      };
    closeMenu();
    if (Math.hypot(context.player.x - site.entry.x, context.player.y - site.entry.y) < 1.5)
      return take();
    return walkTo(site.entry.x, site.entry.y, take);
  }

  function parkMotorcycle(speak = true) {
    if (!context.motorcycle?.state.riding) return false;
    context.motorcycle.park(context.player.x, context.player.y, context.player.angle);
    context.player.speed = Math.min(context.player.speed, context.WALK_SPEED);
    if (!context.headless) {
      context.updateAdventureUI();
      if (speak) announce('You park the motorcycle. Your rental remains valid.', 'You');
    }
    return true;
  }

  function useMotorcycle(actionName = 'ride') {
    if (
      !context.motorcycle ||
      context.chase?.state.jailed ||
      context.capture.state.active ||
      context.rocket.state.active ||
      context.flying() ||
      context.rope.climbing ||
      context.sutroClimb.state.active ||
      context.surf.state.riding ||
      context.tahoe.state.mode !== 'ground'
    )
      return false;
    if (context.ferrari?.state.riding) return parkCarFirst();
    if (context.motorcycle.state.riding) return parkMotorcycle();
    if (context.currentInterior) return false;
    closeMenu();
    closeReader();
    const begin = () => {
      if (context.bike.riding) parkBike();
      context.skateboard.riding = false;
      setDancing(false);
      context.player.path = [];
      context.player.speed = 0;
      context.action = null;
      context.destination = null;
      if (actionName === 'steal' && !context.motorcycle.state.rented) {
        announce(
          'You try to steal the conveniently parked motorcycle. Its alarm summons the police!',
          'You',
        );
        context.chase.start();
        context.$('sf-wanted').hidden = false;
        return true;
      }
      if (context.motorcycle.state.rented) {
        context.motorcycle.mount();
        context.updateAdventureUI();
        announce('You start the motorcycle. Click to ride; M parks.', 'You');
        return true;
      }
      announce('You have not rented this motorcycle.', 'Motorcycle');
      return true;
    };
    const p = context.motorcycle.state;
    if (Math.hypot(context.player.x - p.x, context.player.y - p.y) < 1.6) return begin();
    const target = context.motorcycleApproach();
    return target ? walkTo(target.x, target.y, begin) : false;
  }

  function talkMotorcycleClerk(npc: Actor | undefined) {
    if (!npc) return false;
    if (
      !npc ||
      context.capture.state.active ||
      context.chase?.state.jailed ||
      context.flying() ||
      context.rocket.state.active ||
      context.surf.state.riding ||
      context.rope.climbing ||
      context.sutroClimb.state.active
    )
      return false;
    if (context.ferrari?.state.riding) return parkCarFirst();
    return approachNPC(npc, () =>
      openNPCDialogue(
        configuredDialogue(
          context.motorcycle.state.rented ? 'motorcycle-rented' : 'motorcycle-rental',
          npc,
          {
            rent: () => {
              return mapInteractionResult(
                context.motorcycle.rent(context.economy, { pursued: context.quests.carrying }),
                (result) => {
                  context.updateAdventureUI();
                  return {
                    ...result,
                    message: result.ok
                      ? 'The motorcycle is yours to ride. Click it or press M to get on.'
                      : result.message,
                  };
                },
              );
            },
          },
        ),
      ),
    );
  }

  function canUseTablet() {
    return (
      !context.capture.state.active &&
      !context.chase?.state.jailed &&
      context.secretWorld?.kind === 'world' &&
      !context.secretWorld.bomber.state.active &&
      !context.flying() &&
      !context.rocket.state.active &&
      !context.surf.state.riding &&
      !context.rope.climbing &&
      !context.sutroClimb.state.active &&
      !context.bike.riding &&
      !context.motorcycle?.state.riding &&
      !context.ferrari?.state.riding &&
      !context.skateboard.riding &&
      context.tahoe.state.mode === 'ground'
    );
  }

  function talkTabletWizard(npc = context.tabletWizard) {
    if (!canUseTablet()) return false;
    closeMenu();
    closeReader();
    return approachNPC(npc, () =>
      openNPCDialogue(
        configuredDialogue('wizard', npc, {
          buyTablet: (id: string) => context.tabletService.buy(id),
        }),
      ),
    );
  }

  function talkYohji(npc: Actor | undefined) {
    if (!npc) return false;
    if (!canUseTablet()) return false;
    closeMenu();
    closeReader();
    return approachNPC(npc, () =>
      openNPCDialogue(
        configuredDialogue('yohji', npc, {
          tailor: () => ({
            ok: true,
            pending: true,
            promise: context.multiplayer.command('playerAction', { verb: 'tailorCloak' }),
          }),
        }),
      ),
    );
  }

  function useTeleportTablet(id: string) {
    context.tabletService.use(id).then((r) => {
      if (r.message) announce(r.message, 'Teleport');
      context.updateAdventureUI();
    });
  }

  function talkBanker(npc = context.banker) {
    if (
      context.capture.state.active ||
      context.chase?.state.jailed ||
      context.secretWorld?.kind !== 'world' ||
      context.secretWorld.bomber.state.active ||
      context.flying()
    )
      return false;
    closeMenu();
    closeReader();
    return approachNPC(npc, () =>
      openNPCDialogue(
        bankerDialogue(npc, {
          open: () => requiredValue(context.bankMenu, 'Bank menu').open(),
          coffee: () => context.bankService.act('coffee'),
        }),
      ),
    );
  }

  function drinkBankCoffee() {
    context.bankService.act('drink').then((r) => {
      if (r.message) announce(r.message, 'Green Bank');
      context.updateAdventureUI();
    });
  }

  function changeMapInstance(message: {
    instance: { kind: string };
    position?: { x: number; z: number };
  }) {
    if (context.headless) return;
    context.multiplayerWorld?.stopFollowing(true);
    context.expeditions.stop();
    context.alienCombat = null;
    context.fishing.cancel();
    context.forwardRoll.cancel();
    setDancing(false);
    context.keys.clear();
    if (message.instance.kind !== 'kraken') {
      context.expeditions.abandonShip();
      context.expeditions.state.loot = context.expeditions.state.loot.filter((n) => n.network);
    }
    closeReader();
    closeMenu();
    context.currentInterior = null;
    context.currentInstitute = null;
    context.readerPlace = null;
    context.destination = null;
    context.action = null;
    if (message.position)
      Object.assign(context.player, {
        x: message.position.x - 0.5,
        y: message.position.z - 0.5,
        path: [],
        speed: 0,
        moving: false,
        motion: 0,
      });
    if (context.chase) {
      Object.assign(context.chase.state, { wanted: false, officers: [] });
      context.$('sf-wanted').hidden = true;
    }
    for (const view of context.placeMarkerViews)
      view.button.hidden = message.instance.kind !== 'world';
    context.$('sf-hover').hidden = true;
    context.pickedCache = null;
    context.updateAdventureUI();
    context.updateCamera();
    context.drawMini();
  }

  function secretAction(result: ActionReceipt | Promise<ActionReceipt>) {
    if (result instanceof Promise) {
      result.then(() => {
        context.updateAdventureUI();
        context.canvas.focus({ preventScroll: true });
      });
      return true;
    }
    if (result.message) announce(result.message, 'Illuminati');
    context.updateAdventureUI();
    return result.ok !== false;
  }

  function talkOldMan(npc = context.oldMan) {
    if (
      context.capture.state.active ||
      context.chase?.state.jailed ||
      context.secretWorld?.kind !== 'world' ||
      !guildStatus().member
    )
      return false;
    closeMenu();
    return approachNPC(npc, () =>
      openNPCDialogue(
        context.secretWorld.initiated
          ? configuredDialogue('illuminati-member', npc)
          : {
              ...npc,
              intro: contentText('world.interactions.talkOldMan.intro-15', {}),
              choice: contentText('world.interactions.talkOldMan.choice-16', {}),
              decline: contentText('world.interactions.talkOldMan.decline-17', {}),
              accept: () => context.secretWorld.join(),
              contentNodeId: 'world.interactions.talkOldMan.node-14',
              introTextId: 'world.interactions.talkOldMan.intro-15',
              introTextValues: {},
              choiceTextId: 'world.interactions.talkOldMan.choice-16',
              choiceTextValues: {},
              declineTextId: 'world.interactions.talkOldMan.decline-17',
              declineTextValues: {},
              actionId: 'world.interactions.talkOldMan.action-18',
            },
      ),
    );
  }

  function useSecretSite(sight: InteractionSight) {
    if (!hasSiteEntry(sight)) return false;
    if (context.capture.state.active || context.chase?.state.jailed) return false;
    const action =
      sight.kind === 'secret-stairs'
        ? () => context.secretWorld.enterCave()
        : sight.kind === 'cave-exit'
          ? () => context.secretWorld.leave()
          : () => context.secretWorld.boardBomber();
    if (sight.kind === 'secret-stairs' && !context.secretWorld.initiated) {
      announce('You do not have access to this passage.');
      return false;
    }
    return walkTo(sight.entry.x, sight.entry.y, () => secretAction(action()));
  }

  function talkGuildRay(npc: Actor | undefined) {
    if (!npc) return false;
    if (
      context.chase?.state.jailed ||
      context.capture.state.active ||
      context.flying() ||
      context.surf.state.riding ||
      context.rocket.state.active ||
      context.rope.climbing ||
      context.sutroClimb.state.active
    )
      return false;
    closeMenu();
    closeReader();
    return approachNPC(npc, () =>
      openNPCDialogue(
        guildDialogue(npc, {
          status: guildStatus,
          act: (kind: string) => {
            return serverCommand(
              context.multiplayer,
              kind === 'donate' ? 'guildDonate' : 'guildCheckIn',
            );
          },
        }),
      ),
    );
  }

  function talkMarketFarmer(npc: Actor | undefined) {
    if (!npc) return false;
    if (!canUseTablet()) return false;
    closeMenu();
    closeReader();
    return approachNPC(npc, () => openNPCDialogue(marketFarmerDialogue(npc)));
  }

  function talkAirshipAttendant(npc: Actor | undefined) {
    if (!npc) return false;
    if (!npc || !canUseTablet()) return false;
    closeMenu();
    closeReader();
    return approachNPC(npc, async () => {
      const initial = await serverCommand(context.multiplayer, 'airshipStatus');
      if (!initial.ok) {
        announce(initial.message, 'Airship');
        return;
      }
      let status = requiredValue(initial.airship, 'Airship rental status');
      context.contentAirshipStatus = status;
      const act = async (action: string, args = {}) => {
        const result = await serverCommand(context.multiplayer, action, args);
        if (result.airship) status = result.airship;
        context.contentAirshipStatus = status;
        return result;
      };
      openNPCDialogue(
        airshipAttendantDialogue(npc, {
          status: () => status,
          now: () => Date.now() + (context.multiplayer.state.serverOffset || 0),
          refresh: () => act('airshipStatus'),
          recall: (price: number) => act('airshipRecall', { price }),
          rent: boardAirship,
        }),
      );
    });
  }

  function talkMerchant(npc: Actor) {
    if (npc.kind === 'airship-agent') return talkAirshipAttendant(npc);
    if (npc.kind === 'yohji') return talkYohji(npc);
    if (npc.kind === 'hiking-supplier')
      return approachNPC(npc, () =>
        openNPCDialogue(
          configuredDialogue('hiking-supplies', npc, {
            buy: () => ({
              ok: true,
              pending: true,
              promise: context.multiplayer.command('inventory', { op: 'buyBackpack' }),
            }),
          }),
        ),
      );
    if (npc.kind === 'stockbroker')
      return approachNPC(npc, () => openNPCDialogue(growthDialogue(npc, context.growthService)));
    if (npc.kind === 'duel-referee')
      return approachNPC(npc, () => {
        announce(
          'Equal coin stakes and a fair 50–50 flip. Both players must agree here at the arena.',
          'Referee',
        );
        context.duelMenu?.open();
      });
    if (npc.kind === 'market-farmer') return talkMarketFarmer(npc);
    if (npc.kind === 'tablet-wizard') return talkTabletWizard(npc);
    if (npc.kind === 'guild-master') return talkGuildRay(npc);
    if (npc.socialActor) {
      if (context.ferrari?.state.riding) return parkCarFirst();
      if (
        context.chase?.state.jailed ||
        context.capture.state.active ||
        context.flying() ||
        context.surf.state.riding ||
        context.rocket.state.active ||
        context.rope.climbing ||
        context.sutroClimb.state.active
      )
        return false;
      closeMenu();
      closeReader();
      return approachNPC(
        npc,
        () => {
          if (npc.kind?.startsWith('twitter-')) {
            npc.speech =
              npc.kind === 'twitter-poster'
                ? 'Very busy, someone is wrong on the internet.'
                : 'One envelope in, one bottle out. Please do not tap the backend.';
            npc.speechUntil = performance.now() + 4000;
          } else
            openNPCDialogue(
              softwareSalesDialogue(npc, context.economy, context.social, context.inebriation),
            );
        },
        { distance: 1.25 },
      );
    }
    if ((['tim-apple', 'robotaxi-sales'] satisfies [string, string]).includes(npc.kind || '')) {
      if (context.ferrari?.state.riding) return parkCarFirst();
      if (
        context.chase?.state.jailed ||
        context.capture.state.active ||
        context.flying() ||
        context.surf.state.riding ||
        context.rocket.state.active ||
        context.rope.climbing ||
        context.sutroClimb.state.active
      )
        return false;
      closeMenu();
      closeReader();
      return approachNPC(npc, () =>
        openNPCDialogue(techMerchantDialogue(npc, context.tech, context.economy)),
      );
    }
    if (npc.kind === 'haberdasher') {
      if (context.ferrari?.state.riding) return parkCarFirst();
      if (
        context.chase?.state.jailed ||
        context.capture.state.active ||
        context.flying() ||
        context.surf.state.riding ||
        context.rocket.state.active ||
        context.rope.climbing ||
        context.sutroClimb.state.active
      )
        return false;
      closeMenu();
      closeReader();
      return approachNPC(npc, () =>
        openNPCDialogue(haberdasherDialogue(npc, context.economy, context.wearHat)),
      );
    }
    if (npc.kind === 'salt-activist') {
      if (context.ferrari?.state.riding) return parkCarFirst();
      if (
        context.chase?.state.jailed ||
        context.capture.state.active ||
        context.flying() ||
        context.surf.state.riding ||
        context.rocket.state.active ||
        context.rope.climbing ||
        context.sutroClimb.state.active
      )
        return false;
      closeMenu();
      closeReader();
      return approachNPC(npc, () =>
        openNPCDialogue(saltActivistDialogue(npc, context.saltMail, context.economy)),
      );
    }
    if (npc.expeditionRole) return talkExpeditionNPC(npc);
    if (npc.kind === 'fuel-attendant') return useFuel(sightById(npc.siteId || ''), npc);
    if (npc.kind === 'motorcycle-clerk') return talkMotorcycleClerk(npc);
    if (npc.kind === 'lift') return talkLiftAttendant(npc);
    if (npc.kind === 'recruiter') return talkLabRecruiter();
    if (npc.kind === 'deli') return talkDeli();
    if (npc.kind === 'burger-clerk') return talkBurger(npc);
    if (npc.kind === 'bartender') return talkBeer();
    if (npc.questRole) return talkQuestNPC(npc);
    if (npc.researcher) return talkResearcher(npc);
    if (npc.kind === 'rail-worker') return talkRailWorker(npc);
    if (npc.kind === 'capital') return talkCapital();
    if (npc.kind === 'crew') return useRocket(sightById(npc.siteId || ''), npc);
    if (context.chase?.state.jailed || context.rope.climbing) return false;
    if (context.flying() && npc.kind !== 'passenger') return airshipUnavailable();
    closeReader();
    closeMenu();
    return approachNPC(
      npc,
      () =>
        openNPCDialogue(
          npc.kind === 'tax'
            ? taxDialogue(context.economy)
            : configuredDialogue(npc.kind || '', npc, {
                board: () => serverCommand(context.multiplayer, 'airshipInvite'),
                buyTinfoil: () =>
                  serverCommand(context.multiplayer, 'inventory', { op: 'buyTinfoil' }),
              }),
        ),
      { distance: npc.kind === 'passenger' ? Infinity : 1.8 },
    );
  }

  function talkQuestNPC(npc: Actor | undefined) {
    if (!npc) return false;
    if (context.ferrari?.state.riding) return parkCarFirst();
    if (
      context.chase?.state.jailed ||
      context.capture.state.active ||
      context.rope.climbing ||
      context.sutroClimb.state.active ||
      context.rocket.state.active ||
      context.surf.state.riding ||
      context.tahoe.state.mode !== 'ground'
    )
      return false;
    if (context.flying()) return airshipUnavailable();
    closeMenu();
    closeReader();
    const begin = () => {
      parkMotorcycle(false);
      context.skateboard.riding = false;
      context.alienCombat = null;
      context.player.gesture = null;
      context.player.path = [];
      context.player.speed = 0;
      context.keys.clear();
      if (!npc.seated)
        npc.angle = Math.atan2(context.player.y + 0.5 - npc.z, context.player.x + 0.5 - npc.x);
      const person = npc.questRole?.startsWith('square-')
        ? squareNPCDialogue(npc, context.economy)
        : theyLiveDialogue(npc, context.quests.theyLive, { buyBattleaxe });
      openNPCDialogue(
        npc.questRole === 'clerk' ? saltClerkDialogue(person, context.saltMail) : person,
      );
    };
    return approachNPC(npc, begin);
  }

  function attackAlien(npc: Partial<Actor>) {
    {
      context.multiplayerWorld.actions.request('attackPersonal', {
        id: npc.id,
        weapon: playerWeapon(),
      });
      return true;
    }
  }

  function updateAlienCombat(dt: number, t: number) {
    if (!context.alienCombat) return;
    const combat = context.alienCombat,
      npc = combat.npc;
    if (
      !context.playerLook.sunglasses ||
      Math.hypot(context.player.x + 0.5 - npc.x, context.player.y + 0.5 - npc.z) > 2.3
    ) {
      context.alienCombat = null;
      context.player.gesture = null;
      announce('You break off the fight.', 'They Live');
      return;
    }
    npc.hold = 2;
    const events = combat.battle.update(dt);
    for (const event of events) {
      if (event.type === 'player-hit') {
        context.player.gesture = {
          name: contentText('world.interactions.updateAlienCombat.name-19', {}),
          started: t,
          duration: 540,
        };
        npc.gesture = {
          name: contentText('world.interactions.updateAlienCombat.name-20', {}),
          started: t,
          duration: 430,
        };
        npc.alienHP = event.hp;
        npc.hp = event.hp;
        context.combatFeedback.hit(npc, event.damage, event.hp, combat.battle.state.max);
        context.combatFeedback.show(
          context.player,
          context.health.state.hp,
          context.health.state.max,
        );
      } else if (event.type === 'alien-hit') {
        context.combatFeedback.hit(
          context.player,
          event.damage,
          event.hp,
          context.health.state.max,
        );
        npc.gesture = {
          name: contentText('world.interactions.updateAlienCombat.name-21', {}),
          started: t,
          duration: 540,
        };
        context.player.gesture = {
          name: contentText('world.interactions.updateAlienCombat.name-22', {}),
          started: t,
          duration: 430,
        };
      } else if (event.type === 'victory') {
        const r = context.quests.theyLive.defeat(npc.alienId, { revealed: true });
        if (r.ok) {
          npc.defeatAt = t;
          announce(r.message, 'They Live');
        }
        context.alienCombat = null;
      } else if (event.type === 'death') {
        context.alienCombat = null;
        context.updateAdventureUI();
        beginCapture('alien', respawnAtHospital);
        return;
      }
    }
    if (events.length) context.updateAdventureUI();
  }

  function deployRope() {
    {
      context.multiplayerWorld.command('airshipRope');
      return true;
    }
  }

  function climbRope(down: boolean) {
    {
      context.multiplayerWorld.command(down ? 'airshipClimbDown' : 'airshipClimbUp');
      return true;
    }
  }

  function showRopeMenu() {
    closeMenu();
    if (!context.airship.state.active && !context.rope.onGround) return false;
    if (!context.rope.state.deployed) return deployRope();
    const menu = context.$('sf-context');
    menu.replaceChildren();
    const heading = document.createElement('div');
    heading.className = 'sf-context-title';
    heading.textContent = 'Airship rope';
    menu.append(heading);
    const options: [string, () => unknown][] = context.rope.onGround
      ? [['Climb up', () => climbRope(false)]]
      : [
          ['Climb down', () => climbRope(true)],
          [
            'Offer a ride · 5 coins',
            () => {
              const invited = context.rope.invite();
              announce(
                invited
                  ? 'A traveler accepts your offer and starts climbing. They will pay you 5 coins once aboard.'
                  : 'Your passenger has already boarded or is still climbing.',
                'Airship',
              );
            },
          ],
          [
            'Retract rope',
            () => {
              {
                context.multiplayerWorld.command('airshipRope', { retract: true });
                return;
              }
            },
          ],
        ];
    for (const [text, fn] of options) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = text;
      b.addEventListener('click', () => {
        closeMenu();
        fn();
        context.canvas.focus({ preventScroll: true });
      });
      menu.append(b);
    }
    menu.hidden = false;
    menu.style.left = Math.max(12, context.width / 2 - menu.offsetWidth / 2) + 'px';
    menu.style.top = Math.max(12, context.height / 2 - menu.offsetHeight / 2) + 'px';
    menu.querySelector<HTMLElementTagNameMap['button']>('button')?.focus();
    return true;
  }

  function climbUnavailable(
    text = 'Climb down from Sutro Tower before walking elsewhere. Use Climb down or press E.',
  ) {
    if (context.clickAttempt) context.clickAttempt.worked = false;
    announce(text);
    return false;
  }

  function descendSutro() {
    setDancing(false);
    if (
      context.chase?.state.jailed ||
      !context.sutroClimb.state.active ||
      context.sutroTravelPending
    )
      return false;
    requestSutroTravel('descend');
    return true;
  }

  async function requestSutroTravel(kind: string) {
    if (context.sutroTravelPending) return false;
    context.sutroTravelPending = true;
    context.updateClimbButton();
    try {
      const result = await serverCommand(context.multiplayer, 'travel', { kind });
      if (!result.ok) {
        announce(result.message, 'Sutro Tower');
        return false;
      }
      closeMenu();
      closeReader();
      context.player.path = [];
      context.player.speed = 0;
      context.player.gesture = null;
      context.action = null;
      context.destination = null;
      context.currentInterior = null;
      context.keys.clear();
      announce(
        kind === 'sutro'
          ? 'You take the service ladder up Sutro Tower. Press E or Climb down to turn back.'
          : 'You start climbing down Sutro Tower.',
        'You',
      );
      context.canvas.focus({ preventScroll: true });
      return true;
    } finally {
      context.sutroTravelPending = false;
      context.updateClimbButton();
    }
  }

  function climbSutro() {
    if (context.airship.state.active) return airshipUnavailable();
    if (context.chase?.state.jailed) return false;
    if (context.sutroClimb.state.active) return descendSutro();
    if (context.surf.state.riding)
      return climbUnavailable('Return to shore before climbing Sutro Tower.');
    closeMenu();
    closeReader();
    if (context.sutroTravelPending) return false;
    const approach = context.sutroApproach();
    if (!approach) return climbUnavailable('There is no clear route to the Sutro Tower ladder.');
    const accepted = walkTo(approach.x, approach.y, () => {
      if (context.chase?.state.jailed) return;
      if (context.bike.riding) parkBike();
      requestSutroTravel('sutro');
    });
    if (accepted && !context.sutroClimb.state.active)
      announce('Walking to the Sutro Tower service ladder…');
    context.canvas.focus({ preventScroll: true });
    return accepted;
  }

  function goToSight(s: InteractionSight | undefined): unknown {
    if (!s) return false;
    if (isLootTarget(s)) return collectExpeditionLoot(s);
    if (!hasSiteEntry(s)) return s.kind === 'whale' ? jumpWhale(s) : examine(s);
    if (
      (
        ['secret-stairs', 'cave-exit', 'stealth-bomber'] satisfies [string, string, string]
      ).includes(s.kind)
    )
      return useSecretSite(s);
    if (s.kind === 'airship-rope') return walkTo(s.entry.x, s.entry.y, () => climbRope(false));
    if (s.kind === 'house-storage') return searchHouseStorage(s);
    if (s.kind === 'lore-book') return readLoreBook(s);
    if (s.kind === 'loot') return collectExpeditionLoot(s);
    if (s.kind === 'bench') return sitOnBench(s);
    if (s.kind === 'neighborhood-garden' && s.seats?.length)
      return sitOnBench(sightById(requiredValue(s.seats, 'Garden seats')[0].id));
    if (context.rocket.state.active) return false;
    if (context.chase?.state.jailed) return;
    if (s.enterableInstitute) {
      closeMenu();
      const inside = requiredValue(s.inside, 'Institute entrance');
      return walkTo(inside.x, inside.y);
    }
    if (buildingNPCService(s)) return examine(s);
    if (s.kind === 'sand') return collectOceanSand();
    if (s.kind === 'sunglasses') return pickUpSunglasses();
    if (s.kind === 'fishing') return fishAtWharf();
    if (s.kind === 'motorcycle')
      return context.motorcycle.state.rented ? useMotorcycle() : examine(s);
    if (s.id === 'zoo-monkeys') return stealQuestMonkey();
    if (s.id === 'sutro') return climbSutro();
    if (s.kind === 'bunny') return petBunny();
    if (s.kind === 'ferrari') return useFerrari();
    if (s.kind === 'gym') return useGym();
    if (s.kind === 'surfing') return usePacificaSurf();
    if (s.kind === 'nightlife') return walkTo(NIGHTLIFE.inside.x, NIGHTLIFE.inside.y);
    if (s.kind === 'zoo') return releaseTiger();
    if (s.kind === 'gondola') return useGondola(s.id === 'gondola-base');
    if (s.kind === 'rail-pit') return examine(s);
    closeMenu();
    if (s.kind === 'whale') return jumpWhale(s);
    if (s.kind === 'airship') {
      useAirship();
      return;
    }
    if (s.kind === 'windsurf') {
      useSurf();
      return;
    }
    if (s.kind === 'bike') {
      useBike();
      return;
    }
    if (s.kind === 'guest') {
      walkTo(s.entry.x, s.entry.y, talkToBani);
      return;
    }
    return examine(s);
  }

  function orderDoorDash() {
    if (!context.deli || context.capture.state.active || context.chase?.state.jailed) return false;
    if (
      context.flying() ||
      context.surf.state.riding ||
      context.rocket.state.active ||
      context.sutroClimb.state.active ||
      context.rope.climbing ||
      context.currentInterior
    ) {
      announce('Meet your DoorDash cooler on walkable ground.', 'Lucinda’s');
      return false;
    }
    const result = context.deli.order(context.player);
    announce(result.message, 'Lucinda’s');
    context.updateAdventureUI();
    return result.ok;
  }

  function eatSandwich() {
    if (context.capture.state.active) return false;
    const result = context.deli.eat();
    announce(result.message, 'You');
    context.updateAdventureUI();
    return result.ok;
  }

  function talkBurger(npc: Actor | undefined) {
    if (!npc) return false;
    if (
      context.capture.state.active ||
      context.chase?.state.jailed ||
      context.flying() ||
      context.rocket.state.active ||
      context.secretWorld?.bomber.state.active
    )
      return false;
    if (context.ferrari?.state.riding) return parkCarFirst();
    closeMenu();
    closeReader();
    return approachNPC(npc, () =>
      openNPCDialogue(
        configuredDialogue('burger', npc, { pickup: () => context.deli.pickup('in-n-out') }),
      ),
    );
  }

  function talkDeli() {
    if (context.chase?.state.jailed || context.flying() || context.capture.state.active)
      return false;
    const npc = context.merchants.find((n) => n.kind === 'deli');
    return approachNPC(npc, () =>
      openNPCDialogue(
        configuredDialogue('deli', npc, {
          pickup: () => context.deli.pickup(),
          delivery: () => context.deli.order(context.player),
        }),
      ),
    );
  }

  function labOffer() {
    const lab = context.places.find((p) => p.id === 'ai-lab'),
      npc = context.merchants.find((n) => n.kind === 'recruiter');
    context.player.path = [];
    context.player.speed = 0;
    context.action = null;
    context.destination = null;
    context.keys.clear();
    closeReader();
    closeMenu();
    openNPCDialogue(
      configuredDialogue(context.aiLabJob.state.hired ? 'ai-employee' : 'ai-recruiter', npc, {
        work: () => ({ ok: true, after: () => goToPlace(lab) }),
        interview: () => ({ ok: true, after: () => context.aiInterview.open() }),
      }),
    );
  }

  function talkLabRecruiter() {
    if (
      context.chase?.state.jailed ||
      context.capture.state.active ||
      context.rocket.state.active ||
      context.flying() ||
      context.rope.climbing ||
      context.sutroClimb.state.active
    )
      return false;
    return approachNPC(
      context.merchants.find((n) => n.kind === 'recruiter'),
      labOffer,
    );
  }

  function talkBeer() {
    if (context.chase?.state.jailed || context.flying() || context.capture.state.active)
      return false;
    const npc = context.merchants.find((n) => n.kind === 'bartender');
    return approachNPC(npc, () =>
      openNPCDialogue(
        configuredDialogue('bartender', npc, {
          beer: () => context.inebriation.drink(context.economy),
        }),
      ),
    );
  }

  function talkToBani() {
    announce(
      '“Best way to see the city? Borrow the bicycle, take Market west, and go say hello to the ducks.”',
      'Bani',
    );
  }

  function collectOceanSand() {
    if (context.ferrari?.state.riding) return parkCarFirst();
    if (
      context.capture.state.active ||
      context.chase?.state.jailed ||
      context.flying() ||
      context.rocket.state.active ||
      context.surf.state.riding ||
      context.rope.climbing ||
      context.sutroClimb.state.active ||
      context.expeditions.ship.aboard ||
      context.tahoe.state.mode !== 'ground'
    )
      return false;
    const gather = () => {
      context.fishing.cancel();
      context.expeditions.stop();
      context.alienCombat = null;
      if (context.bike.riding) parkBike();
      parkMotorcycle(false);
      context.skateboard.riding = false;
      setDancing(false);
      closeMenu();
      closeReader();
      context.player.path = [];
      context.player.speed = 0;
      context.action = null;
      context.destination = null;
      const result = mapInteractionResult(context.economy.trade('collect-sand'), (receipt) => {
        if (receipt.ok) {
          context.player.angle = Math.atan2(
            context.sandSite.z - context.player.y - 0.5,
            context.sandSite.x - context.player.x - 0.5,
          );
          context.player.gesture = {
            name: contentText('world.interactions.gather.name-23', {}),
            started: performance.now(),
            duration: 750,
          };
          announce('You fill a sack with Ocean Beach sand.', 'You');
        }
        return receipt;
      });
      return result.ok;
    };
    closeMenu();
    return Math.hypot(
      context.player.x - context.sandSite.entry.x,
      context.player.y - context.sandSite.entry.y,
    ) < 0.8
      ? gather()
      : walkTo(context.sandSite.entry.x, context.sandSite.entry.y, gather);
  }

  function talkParrot(npc: Actor | undefined) {
    if (!npc) return false;
    return approachNPC(npc, () => openNPCDialogue(parrotDialogue(npc)));
  }

  function fishAtWharf() {
    if (context.ferrari?.state.riding) return parkCarFirst();
    if (
      context.capture.state.active ||
      context.chase?.state.jailed ||
      context.rocket.state.active ||
      context.flying() ||
      context.rope.climbing ||
      context.sutroClimb.state.active ||
      context.surf.state.riding ||
      context.tahoe.state.mode !== 'ground'
    )
      return false;
    if (context.economy.state.fish) {
      announce('You can only carry one live fish.', 'Fishing');
      return false;
    }
    const begin = () => {
      if (context.bike.riding) parkBike();
      parkMotorcycle(false);
      context.skateboard.riding = false;
      setDancing(false);
      closeMenu();
      closeReader();
      context.keys.clear();
      context.player.path = [];
      context.player.speed = 0;
      context.player.motion = 0;
      context.player.gesture = null;
      context.action = null;
      context.destination = null;
      const result = context.fishing.start(context.fishingSite);
      if (result.ok)
        context.player.angle = Math.atan2(
          context.fishingSite.water.z - context.player.y - 0.5,
          context.fishingSite.water.x - context.player.x - 0.5,
        );
      announce(result.message, 'Fishing');
      return result.ok;
    };
    closeMenu();
    return Math.hypot(
      context.player.x - context.fishingSite.entry.x,
      context.player.y - context.fishingSite.entry.y,
    ) < 0.55
      ? begin()
      : walkTo(context.fishingSite.entry.x, context.fishingSite.entry.y, begin);
  }

  function pickUpSunglasses() {
    if (context.sunglasses.state.owned) return false;
    if (context.ferrari?.state.riding) return parkCarFirst();
    if (context.flying()) return airshipUnavailable();
    if (
      context.chase?.state.jailed ||
      context.capture.state.active ||
      context.rocket.state.active ||
      context.surf.state.riding ||
      context.rope.climbing ||
      context.sutroClimb.state.active ||
      context.tahoe.state.mode !== 'ground'
    )
      return false;
    closeMenu();
    if (context.bike.riding) parkBike();
    const collect = () => {
      const result = context.sunglasses.pickUp();
      announce(result.message, 'You');
      if (result.ok) {
        context.player.gesture = {
          name: contentText('world.interactions.collect.name-24', {}),
          started: performance.now(),
          duration: 750,
        };
        const quest = context.quests.theyLive.start();
        if (quest.ok) announce(quest.message, 'They Live');
      }
      return result.ok;
    };
    const e = context.sunglassesSite.entry;
    return Math.hypot(context.player.x - e.x, context.player.y - e.y) < 1
      ? collect()
      : walkTo(e.x, e.y, collect);
  }

  function petBunny() {
    if (
      !context.bunny ||
      context.chase?.state.jailed ||
      context.rocket.state.active ||
      context.rope.climbing ||
      context.sutroClimb.state.active ||
      context.surf.state.riding ||
      context.tahoe.state.mode !== 'ground'
    )
      return false;
    if (context.flying()) return airshipUnavailable();
    closeMenu();
    closeReader();
    const b = context.bunny.state,
      target = context.bunnyApproach();
    if (!target) return false;
    return walkTo(target.x, target.y, () => {
      if (context.bike.riding) parkBike();
      context.player.path = [];
      context.player.speed = 0;
      context.player.motion = 0;
      context.player.runBlend = 0;
      context.player.phase = 0;
      context.player.angle = Math.atan2(b.z - context.player.y - 0.5, b.x - context.player.x - 0.5);
      const now = performance.now();
      context.player.gesture = {
        name: contentText('world.interactions.petBunny.name-25', {}),
        started: now,
        duration: 1500,
      };
      context.bunny.pet(now, context.player.angle + Math.PI);
      announce('You pet the bunny. Its nose twitches approvingly.', 'You');
      context.canvas.focus({ preventScroll: true });
    });
  }

  function feedDucks() {
    const s = requiredValue(sightById('ducks'), 'Missing authored entity: ducks');
    closeMenu();
    if (!context.economy.state.grain) {
      announce('You have no grain.');
      return false;
    }
    return walkTo(s.entry.x, s.entry.y, () => {
      mapInteractionResult(context.economy.trade('feed'), (result) => {
        if (result.ok) {
          context.ducksFedUntil = performance.now() + 10000;
          announce(
            'You scatter one bag of grain. Quack! The mallards and ducklings paddle over to investigate.',
            'Ducks',
          );
        }
        return result;
      });
    });
  }

  function parkBike(x = context.player.x, y = context.player.y) {
    if (context.multiplayerWorld && context.bike.riding)
      context.multiplayerWorld.command('activity', { mode: 'walk' });
    context.bike.riding = false;
    context.bike.x = x;
    context.bike.y = y;
    context.player.speed = Math.min(context.player.speed, context.WALK_SPEED);
    context.updateBikeButton();
    announce('You park the bicycle. It will be waiting here.', 'You');
  }

  function mountBike() {
    parkMotorcycle(false);
    if (context.currentInterior) return;
    context.multiplayerWorld.command('activity', { mode: 'bike' });
    context.bike.riding = true;
    context.player.speed = 0;
    context.player.path = [];
    context.destination = null;
    context.action = null;
    context.updateBikeButton();
    announce('You hop on the bicycle. Click to ride; press B to park.', 'You');
    context.canvas.focus({ preventScroll: true });
  }

  function useBike() {
    context.skateboard.riding = false;
    if (context.chase?.state.jailed) return;
    if (context.sutroClimb.state.active) return climbUnavailable();
    if (context.airship.state.active) return airshipUnavailable();
    if (context.surf.state.riding) {
      if (context.clickAttempt) context.clickAttempt.worked = false;
      announce('Return to shore before collecting the bicycle.');
      return;
    }
    closeMenu();
    if (context.bike.riding) {
      parkBike();
      return;
    }
    if (
      !context.currentInterior &&
      Math.hypot(context.player.x - context.bike.x, context.player.y - context.bike.y) < 2.5
    )
      mountBike();
    else {
      walkTo(Math.round(context.bike.x), Math.round(context.bike.y), mountBike);
      announce('Walking to the bicycle…');
      context.canvas.focus({ preventScroll: true });
    }
  }

  function useSkateboard() {
    if (!context.quests.theyLive.state.skateboard) {
      announce('You do not own a skateboard.', 'You');
      return false;
    }
    if (
      context.capture.state.active ||
      context.chase?.state.jailed ||
      context.flying() ||
      context.rope.climbing ||
      context.rocket.state.active ||
      context.surf.state.riding ||
      context.sutroClimb.state.active ||
      context.training ||
      context.tahoe.state.mode !== 'ground' ||
      context.currentInterior
    )
      return false;
    if (context.ferrari?.state.riding) return parkCarFirst();
    if (context.bike.riding) parkBike();
    closeMenu();
    setDancing(false);
    context.alienCombat = null;
    context.player.gesture = null;
    context.player.path = [];
    context.player.speed = 0;
    context.action = null;
    context.destination = null;
    parkMotorcycle(false);
    context.skateboard.riding = !context.skateboard.riding;
    context.multiplayerWorld.command('activity', {
      mode: context.skateboard.riding ? 'skateboard' : 'walk',
    });
    context.updateAdventureUI();
    announce(
      context.skateboard.riding
        ? 'You set down your skateboard. Click to skate; K puts it away.'
        : 'You pick up your skateboard.',
      'You',
    );
    context.canvas.focus({ preventScroll: true });
    return true;
  }

  function performSkateTrick(id: string) {
    if (
      !context.skateboard.riding ||
      context.capture.state.active ||
      context.chase?.state.jailed ||
      context.dialogue.active ||
      !context.$('sf-help').hidden ||
      !context.$('sf-character').hidden
    )
      return false;
    const accepted = context.skateTricks.start(id);
    if (accepted) {
      setDancing(false);
      closeMenu();
      announce(
        requiredValue(
          SKATE_TRICKS.find((t) => t.id === id),
          'Skate trick',
        ).label + '!',
        'Skateboard',
      );
      context.updateAdventureUI();
      context.canvas.focus({ preventScroll: true });
    }
    return accepted;
  }

  function usePacificaSurf() {
    if (context.surf.state.riding) return useSurf();
    if (
      context.capture.state.active ||
      context.chase?.state.jailed ||
      context.flying() ||
      context.rocket.state.active ||
      context.rope.climbing ||
      context.sutroClimb.state.active ||
      context.tahoe.state.mode !== 'ground'
    )
      return false;
    if (context.ferrari?.state.riding) return parkCarFirst();
    if (context.training) stopTraining();
    const mount = () => {
      context.surf.state.mode = 'surf';
      Object.assign(context.surf.state.launch, context.pacificaSurfSite.launch);
      context.surf.state.shore = { ...context.pacificaSurfSite.entry };
      mountSurf();
    };
    closeMenu();
    return walkTo(context.pacificaSurfSite.entry.x, context.pacificaSurfSite.entry.y, mount);
  }

  function catchPacificaWave() {
    if (!context.surf.state.riding || context.surf.state.mode !== 'surf') return false;
    if (context.waveSurf.state.ride) return performSurfTrick('air-360');
    {
      context.multiplayerWorld.command('travel', { kind: 'catchWave' });
      return true;
    }
  }

  function performSurfTrick(id: string) {
    {
      context.multiplayerWorld.command('travel', { kind: 'surfTrick', id });
      return true;
    }
  }

  function jumpWhale(sight: { index?: number }) {
    closeMenu();
    if (
      !context.surf.state.riding ||
      context.surf.state.mode !== 'windsurf' ||
      context.chase?.state.jailed
    ) {
      if (context.clickAttempt) context.clickAttempt.worked = false;
      announce(
        'Borrow a windsurf board at Crissy Field to jump over the whales.',
        'Whale watching',
      );
      return false;
    }
    if (context.surf.state.jump) return false;
    let attempts = 0;
    const launch = () => {
      const target = context.whales.sample(
        (context.multiplayerWorld?.clock ?? context.waveTime) * 1000 + WHALE_JUMP_LEAD_MS,
        sight.index ?? 0,
      );
      if (
        context.multiplayerWorld &&
        Math.hypot(target.x - context.player.x - 0.5, target.z - context.player.y - 0.5) >= 3 &&
        Math.hypot(target.x - context.player.x - 0.5, target.z - context.player.y - 0.5) <= 6
      ) {
        context.multiplayerWorld.command('travel', { kind: 'surfJump', index: sight.index });
        return true;
      }
      if (context.surf.jumpOver(context.player, target)) {
        context.player.path = [];
        context.player.speed = 7.2;
        context.player.angle = requiredValue(context.surf.state.jump, 'Whale jump').angle;
        context.action = null;
        context.destination = null;
        announce('You launch your board over the humpback whale!', 'Windsurfing');
        context.canvas.focus({ preventScroll: true });
        return true;
      }
      const takeoff = context.surf.jumpApproach(context.player, target);
      if (!takeoff || attempts++ >= 3) {
        if (context.clickAttempt) context.clickAttempt.worked = false;
        announce('Choose a whale with enough open water around it to jump.', 'Windsurfing');
        return false;
      }
      const accepted = walkTo(takeoff.x, takeoff.y, launch);
      if (accepted) announce('You sail into position to jump the humpback.', 'Windsurfing');
      return accepted;
    };
    return launch();
  }

  function mountSurf() {
    parkMotorcycle(false);
    if (context.chase?.state.jailed) return;
    if (context.bike.riding) parkBike();
    context.skateboard.riding = false;
    setDancing(false);
    closeReader();
    closeMenu();
    context.surf.cancelJump();
    context.multiplayerWorld.command('activity', {
      mode: 'surf',
      pacifica: context.surf.state.mode === 'surf',
    });
    context.surf.state.riding = true;
    context.player.x = context.surf.state.launch.x;
    context.player.y = context.surf.state.launch.y;
    context.player.path = [];
    context.player.speed = 0;
    context.destination = null;
    context.action = null;
    if (context.surf.state.mode === 'surf') {
      context.waveSurf.start({ x: context.player.x + 0.5, z: context.player.y + 0.5 });
      context.player.angle = Math.PI;
    }
    context.currentInterior = null;
    context.updateSurfButton();
    announce(
      context.surf.state.mode === 'surf'
        ? 'You paddle out from Pacifica. Click the water to paddle; Space catches a wave. 1 / 2 / 3 perform tricks while riding. U returns to the beach.'
        : 'You launch from Crissy Field. Click the bay to windsurf; F returns you to shore.',
      'You',
    );
  }

  function landSurf() {
    context.multiplayerWorld.command('activity', { mode: 'walk' });
    const pacifica = context.surf.state.mode === 'surf';
    context.waveSurf.stop();
    context.surf.cancelJump();
    context.surf.state.riding = false;
    context.player.x = requiredValue(context.surf.state.shore, 'Surf landing').x;
    context.player.y = requiredValue(context.surf.state.shore, 'Surf landing').y;
    context.player.path = [];
    context.player.speed = 0;
    context.action = null;
    context.destination = null;
    context.updateSurfButton();
    announce(
      pacifica
        ? 'You carry the board back onto Pacifica beach.'
        : 'You carry the board back onto Crissy Field.',
      'You',
    );
  }

  function useSurf() {
    if (context.airship.state.active) return airshipUnavailable();
    if (context.chase?.state.jailed) return;
    if (context.sutroClimb.state.active) return climbUnavailable();
    closeMenu();
    closeReader();
    if (context.surf.state.riding) {
      context.waveSurf.cancelRide();
      walkTo(context.surf.state.launch.x, context.surf.state.launch.y, landSurf);
    } else {
      context.surf.state.mode = 'windsurf';
      Object.assign(context.surf.state.launch, {
        x: WINDSURF_LAUNCH.water[0] * context.MAP_SCALE - 0.5,
        y: WINDSURF_LAUNCH.water[1] * context.MAP_SCALE - 0.5,
      });
      context.surf.state.shore = {
        ...requiredValue(sightById('windsurf'), 'Missing authored entity: windsurf').entry,
      };
      if (walkTo(context.surf.state.shore.x, context.surf.state.shore.y, mountSurf))
        announce('Walking to the windsurf board at Crissy Field…');
    }
    context.canvas.focus({ preventScroll: true });
  }

  function talkRehabilitation(npc: Actor) {
    if (!context.chase.state.jailed || context.rehabilitation.state.active) return false;
    closeMenu();
    context.keys.clear();
    context.player.path = [];
    context.player.speed = 0;
    openNPCDialogue(
      rehabilitationDialogue(npc, () =>
        serverCommand(context.multiplayer, 'playerAction', { verb: 'rehabilitate' }).then(
          (result) => {
            if (!result.ok) {
              announce(result.message, 'Specialist');
              return;
            }
            context.rehabilitation.start();
            context.fishing.cancel();
            setDancing(false);
            context.player.path = [];
            context.player.motion = 0;
            context.player.gesture = null;
            context.world.inert = true;
          },
        ),
      ),
    );
    return true;
  }

  function arrestPlayer() {
    context.social.cancelPitch();
    context.tech.losePhone('arrest');
    context.expeditions.abandonShip();
    context.dialogue.close();
    context.rocket.cancel();
    context.updateRocketControls();
    context.rope.reset();
    context.airship.cancel();
    context.sutroClimb.cancel();
    context.updateClimbButton();
    context.waveSurf.stop();
    context.surf.cancelJump();
    context.surf.state.riding = false;
    context.bike.riding = false;
    context.player.x = context.detention.x - 0.5;
    context.player.y = context.detention.z - 0.5;
    context.player.path = [];
    context.player.speed = 0;
    context.player.moving = false;
    context.player.angle = -Math.PI / 2;
    context.player.motion = 0;
    context.player.runBlend = 0;
    context.player.phase = 0;
    context.player.gesture = null;
    context.action = null;
    context.destination = null;
    context.currentInterior = null;
    context.keys.clear();
    context.pointers.clear();
    clearTimeout(context.pressTimer);
    context.gesture = false;
    closeMenu();
    closeReader();
    context.closeHelp();
    context.$('sf-hover').hidden = true;
    context.$('sf-wanted').hidden = true;
    context.$('sf-custody').hidden = false;
    for (const input of context.world.querySelectorAll<HTMLButtonElement>(
      '#sf-map-button,#sf-bike-button,.sf-place-marker',
    ))
      input.disabled = true;
    context.camera.yaw = 0.35;
    context.camera.cos = Math.cos(context.camera.yaw);
    context.camera.sin = Math.sin(context.camera.yaw);
    context.camera.pitch = 0.7;
    context.zoom = 1;
    context.$('sf-zoom-slider').value = '100';
    context.$('sf-zoom-slider').setAttribute('aria-valuetext', '100% zoom');
    context.updateCamera();
    context.drawMini();
    context.updateSurfButton();
    announce(
      'You are under arrest! You have been placed in the Carceral Urbanist Facility in the Marin Headlands. Click the floor to walk within your cell, or talk through the bars to the rehabilitation specialist.',
      'Police',
    );
  }

  function talkDogWalker(npc: Actor) {
    if (
      context.capture.state.active ||
      context.chase?.state.jailed ||
      context.flying() ||
      context.surf.state.riding ||
      context.rocket.state.active ||
      context.rope.climbing ||
      context.sutroClimb.state.active ||
      context.tahoe.state.mode !== 'ground'
    )
      return false;
    if (context.ferrari?.state.riding) return parkCarFirst();
    closeMenu();
    closeReader();
    context.expeditions.stop();
    context.alienCombat = null;
    return approachNPC(
      npc,
      () => {
        npc.speech = '';
        context.approachingNPC = npc;
        npc.waiting = true;
        openNPCDialogue(dogWalkerDialogue(npc));
      },
      {
        approach: (n) =>
          n.regional
            ? context.regionalCitizenApproach(n)
            : context.nearestNavigation(n.x - 0.5, n.z - 0.5, 2, (x: number, y: number) => {
                const d = Math.hypot(x + 0.5 - n.x, y + 0.5 - n.z);
                return d > 0.7 && d < 1.5;
              }),
      },
    );
  }

  function interactCitizen(
    npc: import('../types/world.ts').InteractiveActor | null | undefined,
    verb: string,
  ): unknown {
    if (!npc) return false;
    if (npc.networkPlayer) {
      if (verb === 'attack') return context.multiplayerWorld.attackPlayer(npc);
      if (verb === 'follow') return context.multiplayerWorld.followPlayer(npc);
      return walkToActor(npc);
    }
    if (npc.kind === 'battery-seller' && verb === 'talk')
      return approachNPC(npc, () =>
        openNPCDialogue({
          ...npc,
          intro: contentText('world.interactions.interactCitizen.intro-27', {}),
          choices: [
            {
              label: contentText('world.interactions.interactCitizen.label-30', {}),
              accept: () => serverCommand(context.multiplayer, 'inventory', { op: 'buyBattery' }),
              contentNodeId: 'world.interactions.interactCitizen.node-29',
              labelTextId: 'world.interactions.interactCitizen.label-30',
              labelTextValues: {},
              actionId: 'world.interactions.interactCitizen.action-31',
            },
          ],
          decline: contentText('world.interactions.interactCitizen.decline-28', {}),
          contentNodeId: 'world.interactions.interactCitizen.node-26',
          introTextId: 'world.interactions.interactCitizen.intro-27',
          introTextValues: {},
          declineTextId: 'world.interactions.interactCitizen.decline-28',
          declineTextValues: {},
        }),
      );
    if (npc.kind === 'bolinas-local' && verb === 'talk')
      return approachNPC(npc, () =>
        openNPCDialogue({
          ...npc,
          intro: npc.localLine,
          choice: contentText('world.interactions.interactCitizen.choice-34', {}),
          receipt: contentText('world.interactions.interactCitizen.receipt-35', {}),
          decline: contentText('world.interactions.interactCitizen.decline-36', {}),
          contentNodeId: 'world.interactions.interactCitizen.node-32',
          choiceTextId: 'world.interactions.interactCitizen.choice-34',
          choiceTextValues: {},
          receiptTextId: 'world.interactions.interactCitizen.receipt-35',
          receiptTextValues: {},
          declineTextId: 'world.interactions.interactCitizen.decline-36',
          declineTextValues: {},
        }),
      );
    if (npc.kind === 'market-farmer' && verb === 'talk') return talkMarketFarmer(npc);
    if (npc.wilderness)
      return verb === 'pet'
        ? petBear(npc)
        : verb === 'attack'
          ? attackWildMonster(npc)
          : examine(npc);
    if (npc.police) return examine(npc);

    if (npc.kind === 'guild-master' && verb === 'talk') return talkGuildRay(npc);
    if (npc.kind === 'illuminati-elder' && verb === 'talk') return talkOldMan(npc);
    if (npc.kind === 'tablet-wizard' && verb === 'talk') return talkTabletWizard(npc);
    if (npc.kind === 'yohji' && verb === 'talk') return talkYohji(npc);
    if (npc.kind === 'banker' && verb === 'talk') return talkBanker(npc);
    if (npc.dogSurfJudge)
      return approachNPC(npc, () =>
        openNPCDialogue(
          dogSurfingDialogue(
            npc,
            (Date.now() + (context.multiplayer?.state.serverOffset || 0)) / 1000,
          ),
        ),
      );
    if (npc.dogWalker && verb === 'talk') return talkDogWalker(npc);
    if (npc.expeditionRole) return talkExpeditionNPC(npc);
    if (
      (['raptor', 'cow', 'kraken'] satisfies [string, string, string]).includes(
        npc.combatKind || '',
      ) &&
      verb === 'attack'
    )
      return attackExpeditionTarget(npc);
    if (npc.alienId && verb === 'attack') return approachNPC(npc, () => attackAlien(npc));
    if (npc.rehabilitation) return talkRehabilitation(npc);
    if (npc.parrot) return talkParrot(npc);
    if (npc.dog === true && !npc.dogWalker) {
      npc.speech = 'Woof!';
      npc.speechUntil = performance.now() + 3000;
      context.player.gesture = {
        name: contentText('world.interactions.interactCitizen.name-37', {}),
        started: performance.now(),
        duration: 900,
      };
      announce('You pet the dog. Its afternoon has improved considerably.', 'You');
      return true;
    }
    if (npc.neighborhoodService && verb === 'talk')
      return approachNPC(npc, () =>
        openNPCDialogue(
          neighborhoodShopDialogue(npc, (id, offer) =>
            serverCommand(context.multiplayer, 'playerAction', {
              verb: 'neighborhoodService',
              id,
              offer,
            }),
          ),
        ),
      );
    if (npc.child && verb !== 'talk') return false;
    if (npc.questRole) return talkQuestNPC(npc);
    if (context.quests.theyLive.isDefeated(npc.alienId)) return false;
    if (npc.researcher) return talkResearcher(npc);
    if (npc.kind === 'rail-worker') return talkRailWorker(npc);
    if (npc.kind === 'fuel-attendant') return useFuel(sightById(npc.siteId || ''), npc);
    if (npc.kind === 'motorcycle-clerk') return talkMotorcycleClerk(npc);
    if (npc.kind === 'lift') return talkLiftAttendant(npc);
    if (npc.kind === 'recruiter') return talkLabRecruiter();
    if (npc.kind === 'deli') return talkDeli();
    if (npc.kind === 'burger-clerk') return talkBurger(npc);
    if (npc.kind === 'bartender') return talkBeer();
    if (npc.kind && MERCHANTS[npc.kind]) return talkMerchant(npc);
    if (context.flying()) return airshipUnavailable();
    if (
      context.chase?.state.jailed ||
      context.surf.state.riding ||
      context.rocket.state.active ||
      context.rope.climbing ||
      context.tahoe.state.mode !== 'ground'
    )
      return;
    closeMenu();
    if (context.dialogue.active) context.dialogue.close();
    if (context.sutroClimb.state.active) return climbUnavailable();
    if (npc.baby && npc.parent) npc.parent.hold = 8;
    npc.hold = 8;
    npc.lookAt = { x: context.player.x + 0.5, z: context.player.y + 0.5 };
    const target = npc.approach
      ? { ...npc.approach }
      : npc.regional
        ? context.regionalCitizenApproach(npc)
        : context.nearestNavigation(npc.x - 0.5, npc.z - 0.5, 2, (x: number, y: number) => {
            const d = Math.hypot(x + 0.5 - npc.x, y + 0.5 - npc.z);
            return d >= 0.8 && d < 1.5 && (!npc.interior || context.placeAt(x, y) === npc.interior);
          });
    const perform = () => {
      if (context.multiplayerWorld && verb !== 'talk') {
        context.multiplayerWorld.actions.request('attackPersonal', {
          id: npc.id,
          weapon: playerWeapon(),
          steal: verb !== 'attack',
        });
        return true;
      }
      if (npc.alienId && verb === 'attack') return attackAlien(npc);
      if (npc.baby && npc.parent) npc.parent.hold = 3;
      npc.hold = 3;
      npc.lookAt = { x: context.player.x + 0.5, z: context.player.y + 0.5 };
      const started = performance.now();
      context.player.gesture = { name: verb, started, duration: verb === 'talk' ? 900 : 650 };
      npc.gesture = {
        name: verb === 'attack' ? 'flinch' : verb === 'talk' ? 'talk' : null,
        started,
        duration: 900,
      };
      if (verb === 'talk') {
        if (npc.baby) {
          npc.speech = 'Goo!';
          npc.speechUntil = performance.now() + 4500;
        } else {
          releaseNPC();
          context.approachingNPC = npc;
          npc.waiting = true;
          npc.hold = 2;
          npc.speech = '';
          npc.speechUntil = 0;
          context.player.path = [];
          context.player.speed = 0;
          context.action = null;
          context.destination = null;
          context.keys.clear();
          openNPCDialogue(createAmbientDialogue(npc, npc.child ? { chain: GOOSE_CHAINS[1] } : {}));
        }
      } else {
        npc.speech = 'Help! Police!';
        npc.speechUntil = performance.now() + 4500;
        announce(
          verb === 'attack'
            ? 'You attack the ' + npc.label.toLowerCase() + '. They call for the police.'
            : 'You steal a few coins from the ' +
                npc.label.toLowerCase() +
                '. They raise the alarm.',
          'You',
        );
        context.chase.start();
        context.$('sf-wanted').hidden = false;
        announce('Stop! You are under arrest!', 'Police');
      }
    };
    if (
      Math.hypot(context.player.x + 0.5 - npc.x, context.player.y + 0.5 - npc.z) < 1.8 &&
      (!npc.interior || context.currentInterior === npc.interior)
    )
      perform();
    else if (!target || !walkTo(target.x, target.y, perform)) {
      if (context.clickAttempt) context.clickAttempt.worked = false;
      npc.hold = 0;
      announce('Move closer to the ' + npc.label.toLowerCase() + '.');
    }
    context.canvas.focus({ preventScroll: true });
  }

  function debugTeleport(x: number, y: number, serverApproved = false) {
    if (context.multiplayerWorld && !serverApproved) {
      context.multiplayerWorld.teleport(x, y);
      return { ok: true, message: 'Teleport requested from the server.' };
    }
    if (context.bankMenu?.active) context.bankMenu.close();
    const target = debugTilePosition(x, y),
      inCell = context.detention.walkable(x, y);

    if (!context.landClearAt(target.x, target.y) && !inCell)
      return {
        ok: false,
        message:
          'That point is blocked or outside the walkable map. Choose a road, path, or open ground.',
      };
    // Close committed dialogue receipts first, then cancel any travel they
    // started. No delayed arrival, capture or rehabilitation can undo :tp.
    context.dialogue.close();
    context.aiInterview.close();
    context.questMenu?.close();
    closeReader();
    context.closeCharacter();
    context.closeHelp();
    closeMenu();
    if (context.training) stopTraining();
    setDancing(false);
    parkMotorcycle(false);
    if (context.ferrari?.state.riding) parkFerrari();
    context.social.cancelPitch();
    context.fishing.cancel();
    context.forwardRoll.cancel();
    context.alienCombat = null;
    context.expeditions.stop();
    context.expeditions.abandonShip();
    context.monkeyKeeper?.stop();
    context.capture.cancel();
    context.rehabilitation.cancel();
    context.combatFeedback.clear();
    context.world.inert = false;
    if (context.health.state.hp === 0) context.health.restore();
    context.rocket.cancel();
    context.rope.reset();
    context.basket.reset();
    context.basketArrival = null;
    context.airship.cancel();
    context.sutroClimb.cancel();
    context.tahoe.reset();
    context.waveSurf.stop();
    context.surf.cancelJump();
    context.surf.state.riding = false;
    context.bike.riding = false;
    context.skateboard.riding = false;
    Object.assign(context.chase.state, { wanted: false, jailed: inCell, officers: [], elapsed: 0 });
    context.keys.clear();
    context.pointers.clear();
    clearTimeout(context.pressTimer);
    context.gesture = false;
    context.action = null;
    context.destination = null;
    context.carArrival = null;
    context.currentInterior = null;
    context.currentInstitute = null;
    context.readerPlace = null;
    context.playerSpeechUntil = 0;
    context.pickedCache = null;
    Object.assign(context.player, {
      ...target,
      path: [],
      speed: 0,
      vx: 0,
      vy: 0,
      moving: false,
      motion: 0,
      phase: 0,
      runBlend: 0,
      gesture: null,
      dancing: false,
      sitting: false,
      sitBlend: 0,
    });
    context.$('sf-hover').hidden = true;
    context.$('sf-wanted').hidden = true;
    context.$('sf-custody').hidden = !inCell;
    context.$('sf-player-speech').hidden = true;
    for (const input of context.world.querySelectorAll<HTMLButtonElement>(
      '#sf-map-button,#sf-bike-button,.sf-place-marker',
    ))
      input.disabled = inCell;
    context.updateClimbButton();
    context.updateRocketControls();
    context.updateAirshipButton();
    context.updateSurfButton();
    context.updateBikeButton();
    context.updateTahoeButton();
    context.updateAdventureUI();
    context.updateCamera();
    context.drawMini();
    context.debugConsole?.update();
    return {
      ok: true,
      message: 'Teleported to ' + Number(x.toFixed(4)) + ', ' + Number(y.toFixed(4)) + '.',
    };
  }

  function walkTo(x: number, y: number, onArrival: (() => void) | null = null): boolean {
    if (!serverConnected(context.multiplayer)) return false;
    releaseNPC();
    context.worldStream?.prefetch(x + 0.5, y + 0.5);
    setSitting(false);
    context.wildTarget = null;
    if (context.secretWorld?.bomber.state.active) {
      closeMenu();
      closeReader();
      if (context.clickAttempt) context.clickAttempt.walking = true;
      context.destination = { x, y };
      return context.secretWorld.bomber.target(x + 0.5, y + 0.5);
    }
    context.multiplayerWorld?.stopFollowing(false);
    context.expeditions.stop();
    if (context.expeditions.ship.aboard) {
      announce('Speak to Captain Ahab to return to shore.');
      return false;
    }
    if (context.clickAttempt && !onArrival) context.clickAttempt.walking = true;
    if (onArrival) context.skateboard.riding = false;
    if (context.alienCombat) {
      context.alienCombat = null;
      context.player.gesture = null;
    }
    if (context.training) stopTraining();
    if (context.ferrari?.state.riding) {
      if (onArrival) return parkCarFirst();
      return driveFerrari(x, y);
    }
    if (context.capture.state.active) return false;
    setDancing(false);
    if (
      (['pet', 'pet-bear'] satisfies [string, string]).includes(context.player.gesture?.name || '')
    )
      context.player.gesture = null;
    if (context.rocket.state.active) {
      if (context.clickAttempt) context.clickAttempt.worked = false;
      return false;
    }
    if (context.surf.state.jump) {
      if (context.clickAttempt) context.clickAttempt.worked = false;
      return false;
    }
    if (context.dialogue.active) context.dialogue.close();
    if (context.tahoe.state.mode === 'ski') return context.tahoe.steerTo(x + 0.5, y + 0.5);
    if (context.tahoe.state.mode === 'gondola') return false;
    if (context.rope.climbing) return false;
    if (context.flying()) {
      if (context.rope.state.deployed) {
        announce('Retract the rope before flying.');
        return false;
      }
      const accepted = context.airship.flyTo(x + 0.5, y + 0.5);
      if (!accepted) {
        if (context.clickAttempt) context.clickAttempt.worked = false;
        return false;
      }
      context.destination = { x, y };
      context.action = null;
      closeReader();
      context.updateAirshipButton();
      context.drawMini();
      return true;
    }
    if (context.sutroClimb.state.active) return climbUnavailable();
    const jailed = context.chase?.state.jailed;
    if (
      context.surf.state.riding &&
      context.surf.state.mode === 'surf' &&
      context.waveSurf.state.ride &&
      !onArrival
    )
      return context.waveSurf.steer(x + 0.5, y + 0.5);
    if (
      context.surf.state.riding &&
      !context.surf.water(x + 0.5, y + 0.5) &&
      Math.hypot(
        x - requiredValue(context.surf.state.shore, 'Surf shore').x,
        y - requiredValue(context.surf.state.shore, 'Surf shore').y,
      ) < 5
    ) {
      useSurf();
      return true;
    }
    {
      context.fishing.cancel();
      releaseNPC();
      context.player.path = [];
      context.action = jailed
        ? null
        : onArrival
          ? () => {
              parkMotorcycle(false);
              onArrival();
            }
          : null;
      context.destination = { x, y };
      closeReader();
      closeMenu();
      context.multiplayerWorld.moveTo(x + 0.5, y + 0.5);
      context.drawMini();
      return true;
    }
  }

  function goToPlace(p: Place | undefined) {
    if (!p) return false;
    closeMenu();
    if (p.id === 'freemasons-guild' && !guildStatus().member) {
      announce('The guild admits members only.', 'Guild');
      return false;
    }
    if (walkTo(p.inside.x, p.inside.y, () => enter(p))) announce('Walking to ' + p.label + '…');
    context.canvas.focus({ preventScroll: true });
  }

  function announce(text: string | undefined, who = 'Guide') {
    context.$('sf-status').textContent = text ?? '';
    const row = document.createElement('div'),
      time = document.createElement('time');
    time.textContent = who;
    row.append(time, document.createTextNode(' ' + text));
    const log = context.$('sf-log');
    log.append(row);
    while (log.children.length > 12) log.firstChild!.remove();
    log.scrollTop = log.scrollHeight;
  }

  function enter(p: Place) {
    if (!context.active || context.chase?.state.jailed) return;
    if (context.placeAt(context.player.x, context.player.y) !== p) {
      goToPlace(p);
      return;
    }
    if (p.searchHome) {
      closeReader();
      closeMenu();
      context.visited.add(p.id);
      context.drawMini();
      return;
    }
    if (p.activityBuilding) {
      closeReader();
      closeMenu();
      context.visited.add(p.id);
      announce(
        p.id === 'orin-house'
          ? 'You step inside Orin’s house. Purple tablets and a well-worn armchair suggest a wizard who dislikes commuting.'
          : p.id === 'freemasons-guild'
            ? 'You enter the lodge. A checkerboard floor, brass compasses, and extremely exclusive biscuits.'
            : 'You enter the ' +
              TECHNOLOGIST_MARKET +
              '. The farmers wear black coats and sunglasses. The produce may know kung fu.',
        'You',
      );
      context.drawMini();
      return;
    }
    if (p.id === 'ai-lab') {
      closeReader();
      closeMenu();
      context.visited.add(p.id);
      if (context.aiLabJob.state.hired) announce('Welcome back to the AI Lab.', 'AI Lab');
      else announce('You enter the AI Lab.', 'AI Lab');
      context.drawMini();
      return;
    }
    if (context.readerPlace === p && !context.$('sf-reader').hidden) return;
    context.readerPlace = p;
    closeMenu();
    context.$('sf-help').hidden = true;
    context.world.classList.add('sf-reading');
    delete context.$('sf-reader').dataset.lore;
    context.visited.add(p.id);
    context.$('sf-reader-title').textContent = p.label;
    context.$('sf-reader-category').textContent = p.category + ' / San Francisco';
    context.$('sf-reader-description').textContent = p.description || '';
    const content = context.$('sf-reader-content');
    content.replaceChildren();
    delete content.dataset.format;
    if (p.source === 'Bio') {
      const bio = document.createElement('div');
      bio.className = 'bio-content';
      bio.innerHTML = readerContent.bio;
      const contact = document.createElement('div');
      contact.className = 'sf-contact';
      contact.innerHTML = readerContent.contact;
      content.append(bio, contact);
    } else {
      const sections: Readonly<Record<string, string>> = readerContent.sections;
      const source = document.createElement('div');
      source.innerHTML = requiredValue(
        sections[requiredValue(p.source, 'Source section ID')],
        'Source section',
      );
      for (const child of source.children) {
        if (child.tagName === 'SUMMARY') continue;
        if (p.match) {
          if (
            child.tagName === 'P' &&
            (child.querySelector(`a[href*="${p.match}"]`) || !child.querySelector('a'))
          )
            content.append(child.cloneNode(true));
        } else content.append(child.cloneNode(true));
      }
    }
    content.querySelectorAll<HTMLElementTagNameMap['a']>('a').forEach((a) => {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });
    context.$('sf-reader').hidden = false;
    context.$('sf-reader-shade').hidden = true;
    context.$('sf-reader').scrollTop = 0;
    announce(
      'You step inside ' + p.label + '. The roof is hidden; walk out to return to the street.',
      'You',
    );
    context.drawMini();
  }

  function closeReader() {
    if (context.$('sf-reader').hidden) return;
    context.$('sf-reader').hidden = true;
    context.readerPlace = null;
    context.world.classList.remove('sf-reading');
    context.$('sf-reader-shade').hidden = context.$('sf-help').hidden;
    if (context.active) context.canvas.focus({ preventScroll: true });
  }

  function closeMenu() {
    context.$('sf-context').hidden = true;
  }

  function clicked(sx: unknown, sy: unknown, fn: () => unknown) {
    if (!context.built || context.tabletService?.state.active) return false;
    const previous = context.clickAttempt,
      attempt = { worked: true, walking: false };
    context.clickAttempt = attempt;
    try {
      const result = fn();
      if (result === false) attempt.worked = false;
      return result;
    } finally {
      context.clickAttempt = previous;
      if (attempt.walking && isFiniteNumber(sx) && isFiniteNumber(sy) && (sx || sy)) {
        const feedback = context.$('sf-click-marker');
        context.clickAnimation?.cancel();
        feedback.hidden = false;
        feedback.dataset.accepted = String(attempt.worked);
        feedback.style.left = sx + 'px';
        feedback.style.top = sy + 'px';
        context.clickAnimation = feedback.animate(
          [
            { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
            { transform: 'translate(-50%,-50%) scale(.08)', opacity: 0 },
          ],
          { duration: context.reduced ? 180 : 440, easing: 'ease-in', fill: 'forwards' },
        );
        context.clickAnimation.onfinish = () => {
          feedback.hidden = true;
        };
      }
    }
  }

  function actorWalkPoint(npc: { x: number; z: number }) {
    const requested = { x: npc.x - 0.5, y: npc.z - 0.5 };
    if (!Number.isFinite(requested.x) || !Number.isFinite(requested.y)) return null;
    if (context.clearAt(requested.x, requested.y) && context.pathTo(requested.x, requested.y))
      return requested;
    for (let r = 0.25; r <= 1.75; r += 0.25)
      for (let i = 0; i < 16; i++) {
        const x = requested.x + Math.cos((i * Math.PI) / 8) * r,
          y = requested.y + Math.sin((i * Math.PI) / 8) * r;
        if (context.clearAt(x, y) && context.pathTo(x, y)) return { x, y };
      }
    return null;
  }

  function walkToActor(npc: { x: number; z: number }) {
    const p = actorWalkPoint(npc);
    return p ? walkTo(p.x, p.y) : false;
  }

  function examine(p: { description?: string } | null | undefined) {
    closeMenu();
    if (!p)
      p = applyEntityEdits(
        {
          id: 'unlabelled-ground',
          description: contentText('world.interactions.examine.description-40', {}),
        },
        'sight:unlabelled-ground',
      );
    if (p.description) announce(p.description, 'Examine');
    context.canvas.focus({ preventScroll: true });
  }

  function showMenu(sx: number, sy: number) {
    if (context.tabletService?.state.active) return false;
    if (context.rocket.state.active) return false;
    if (context.surf.state.jump) return false;
    if (context.tahoe.state.mode !== 'ground') return false;
    if (context.flying() && !context.hitCitizen(sx, sy)?.networkPlayer)
      return showAirshipMenu(sx, sy);
    if (context.sutroClimb.state.active) {
      const menu = context.$('sf-context');
      menu.replaceChildren();
      const heading = document.createElement('div');
      heading.className = 'sf-context-title';
      heading.textContent = 'Sutro Tower · Choose an option';
      menu.append(heading);
      for (const [label, fn] of [
        ...(context.sutroClimb.state.phase === 'top'
          ? [
              [context.player.dancing ? 'Stop dancing' : 'Dance on Sutro Tower', dance] satisfies [
                string,
                () => unknown,
              ],
            ]
          : []),
        ['Climb down Sutro Tower', descendSutro] satisfies [string, () => unknown],
        ['Examine Sutro Tower', () => examine(sightById('sutro'))] satisfies [
          string,
          () => unknown,
        ],
      ]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.actionId =
          fn === dance ? 'tower.dance' : fn === descendSutro ? 'tower.descend' : 'examine';
        button.setAttribute('role', 'menuitem');
        setActionText(button, label, [
          { label: contentText('world.interactions.showMenu.label-41', {}), kind: 'object' },
        ]);
        button.addEventListener('click', (e) =>
          clicked(e.clientX, e.clientY, () => {
            closeMenu();
            return fn();
          }),
        );
        menu.append(button);
      }
      promoteWalkAction(menu);
      editMenuLabels(menu, sightById('sutro'), [
        {
          label: requiredValue(sightById('sutro'), 'Missing authored entity: sutro').label,
          kind: 'object',
        },
      ]);
      menu.hidden = false;
      menu.style.left = Math.min(context.width - menu.offsetWidth - 12, Math.max(12, sx)) + 'px';
      menu.style.top = Math.min(context.height - menu.offsetHeight - 12, Math.max(12, sy)) + 'px';
      menu.querySelector<HTMLElementTagNameMap['button']>('button')!.focus({ preventScroll: true });
      return true;
    }
    const npc = context.hitCitizen(sx, sy),
      s = npc ? null : context.hitSight(sx, sy),
      p = s || npc ? null : context.hitPlace(sx, sy),
      t = context.tileAt(sx, sy),
      menu = context.$('sf-context');
    const owner: EditableEntity = npc ||
      s ||
      p || {
        id: 'unlabelled-ground',
        label: contentText('world.interactions.showMenu.label-43', {}),
      };
    if (owner)
      applyEntityEdits(
        owner,
        owner.editorKey || (npc ? 'actor:' : p ? 'place:' : 'sight:') + owner.id,
      );
    menu.replaceChildren();
    context.$('sf-hover').hidden = true;
    const actionTargets = npc
      ? [
          { label: context.npcLabel(npc), kind: npc.editorCategory || 'npc' },
          { label: context.npcLabel(npc, false), kind: npc.editorCategory || 'npc' },
        ]
      : s
        ? [{ label: s.label, kind: actionTargetKind(s) }]
        : p
          ? [{ label: p.label, kind: p.editorCategory || 'object' }]
          : owner.editorKey
            ? [{ label: owner.label || 'Ground', kind: owner.editorCategory || 'object' }]
            : [];
    const heading = document.createElement('div');
    heading.className = 'sf-context-title';
    setActionText(
      heading,
      npc ? context.npcLabel(npc) + ' · Choose an option' : 'Choose an option',
      actionTargets,
    );
    menu.append(heading);
    const add = (text: string, fn: () => unknown, actionId: string | undefined) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.actionId = actionId;
      b.setAttribute('role', 'menuitem');
      setActionText(b, text, actionTargets);
      b.addEventListener('click', (e) =>
        clicked(e.clientX, e.clientY, () => {
          closeMenu();
          fn();
        }),
      );
      menu.append(b);
    };
    if (!npc && context.secretWorld?.bomber.state.active) {
      if (context.secretWorld.bomber.state.phase === 'flying') {
        add('Fly here', () => walkTo(t.x, t.y), 'interaction.1');
        add('Barrel roll · R', () => context.secretWorld.bomber.barrelRoll(), 'interaction.2');
        add(
          'Drop bomb · ' +
            (context.secretWorld.bomber.bombSeconds
              ? context.secretWorld.bomber.bombSeconds + 's reload'
              : 'Ready'),
          () => secretAction(context.secretWorld.dropBomb()),
          'interaction.3',
        );
        add(
          'Land · Parachute out',
          () => secretAction(context.secretWorld.ejectBomber()),
          'interaction.4',
        );
      }
      add('Examine B-2', () => examine(context.bomberSite), 'examine');
      promoteWalkAction(menu);
      menu.hidden = false;
      menu.style.left = Math.min(context.width - menu.offsetWidth - 12, Math.max(12, sx)) + 'px';
      menu.style.top = Math.min(context.height - menu.offsetHeight - 12, Math.max(12, sy)) + 'px';
      menu.querySelector<HTMLElementTagNameMap['button']>('button')!.focus({ preventScroll: true });
      return;
    }
    if (!npc && context.surf.state.riding && context.surf.state.mode === 'surf') {
      if (context.waveSurf.state.ride)
        for (const trick of SURF_TRICKS)
          add(trick.label, () => performSurfTrick(trick.id), 'trick.' + trick.id);
      else add('Catch wave', catchPacificaWave, 'interaction.5');
      add('Return to Pacifica beach', useSurf, 'interaction.6');
    }
    if (npc)
      for (const verb of npcContextActions(npc, {
        primary: context.npcPrimary(npc),
        duel:
          atDuelArena(context.player.x + 0.5, context.player.y + 0.5) && atDuelArena(npc.x, npc.z),
        following: context.multiplayerWorld?.following === npc.id,
        pvp:
          context.multiplayer.state.pvp?.enabled &&
          npc.pvp &&
          npc.mode !== 'bomber' &&
          !context.secretWorld?.bomber.state.active,
      })) {
        if (verb === 'duel')
          add(
            'Challenge to coin duel',
            () => {
              if (npc.networkPlayer) requiredValue(context.duelMenu, 'Duel menu').open(npc);
            },
            'npc.duel',
          );
        else if (verb === 'follow')
          add(
            'Follow ' + npc.label,
            () => {
              if (npc.networkPlayer) context.multiplayerWorld.followPlayer(npc);
            },
            'npc.follow',
          );
        else if (verb === 'unfollow')
          add('Stop following', () => context.multiplayerWorld.stopFollowing(true), 'npc.unfollow');
        else if (verb === 'examine')
          add(
            'Examine ' + context.npcLabel(npc, false),
            () => {
              announce(
                context.npcLabel(npc, false) +
                  ': ' +
                  (context.npcRevealed(npc)
                    ? 'An alien silhouette ripples beneath a coating of green slime.'
                    : describeCharacter(npc)),
                'Examine',
              );
              context.canvas.focus({ preventScroll: true });
            },
            'npc.examine',
          );
        else if (verb === 'walk') {
          const target = actorWalkPoint(npc);
          if (target)
            add(
              'Walk here ' + context.npcLabel(npc, false),
              () => walkTo(target.x, target.y),
              'npc.walk',
            );
        } else
          add(
            { talk: 'Talk-To', attack: 'Attack', steal: 'Steal-from', pet: 'Pet' }[verb] +
              ' ' +
              context.npcLabel(npc),
            () => interactCitizen(npc, verb),
            'npc.' + verb,
          );
      }
    if (s?.kind === 'airship-rope') add('Climb airship rope', () => goToSight(s), 'interaction.7');
    if (s?.kind === 'house-storage')
      add('Search ' + s.label, () => searchHouseStorage(s), 'interaction.8');
    if (s?.kind === 'lore-book') add('Read ' + s.label, () => readLoreBook(s), 'interaction.9');
    if (s?.kind === 'loot')
      add('Take ' + s.label, () => collectExpeditionLoot(s), 'interaction.10');
    if (s?.kind === 'bench') add('Sit on ' + s.label, () => sitOnBench(s), 'interaction.11');
    if (s?.kind === 'neighborhood-garden' && s.seats?.length)
      add(
        'Sit in garden',
        () => sitOnBench(sightById(requiredValue(s.seats, 'Garden seats')[0].id)),
        'interaction.12',
      );
    if (s && (['waymo', 'robotaxi'] satisfies [string, string]).includes(s.kind))
      add('Examine ' + s.label, () => examine(s), 'examine');
    if (s?.enterableInstitute && context.activeInstituteRoom()?.id !== s.id)
      add('Enter ' + s.label, () => goToSight(s), 'interaction.13');
    if (p && !(context.currentInterior === p && (p.searchHome || p.activityBuilding)))
      add(
        (context.currentInterior === p
          ? p.activityBuilding
            ? 'Walk inside '
            : 'Browse '
          : 'Enter ') + p.label,
        () => (context.currentInterior === p ? enter(p) : goToPlace(p)),
        'interaction.14',
      );
    if (s && !buildingNPCService(s)) {
      if (
        (
          ['secret-stairs', 'cave-exit', 'stealth-bomber'] satisfies [string, string, string]
        ).includes(s.kind)
      )
        add(sightPrimaryVerb(s) + ' ' + s.label, () => useSecretSite(s), 'interaction.15');
      if (s.kind === 'sunglasses' && !context.sunglasses.state.owned)
        add('Take ' + s.label, pickUpSunglasses, 'interaction.16');
      if (s.kind === 'sand') add('Collect Ocean Beach sand', collectOceanSand, 'interaction.17');
      if (s.kind === 'fishing') add('Catch live fish', fishAtWharf, 'interaction.18');
      if (s.id === 'zoo-monkeys') add('Steal monkey', stealQuestMonkey, 'interaction.19');
      if (s.kind === 'motorcycle') {
        if (context.motorcycle.state.rented)
          add('Ride motorcycle', () => useMotorcycle(), 'interaction.20');
        else add('Steal motorcycle', () => useMotorcycle('steal'), 'interaction.21');
      }
      if (s.kind === 'bunny') add('Pet bunny', petBunny, 'interaction.22');
      if (s.kind === 'zoo' && context.zoo.state.phase === 'caged')
        add('Release tiger', releaseTiger, 'interaction.23');
      if (s.kind === 'gondola')
        add(
          s.id === 'gondola-base' ? 'Ride gondola up' : 'Ride gondola down',
          () => useGondola(s.id === 'gondola-base'),
          'interaction.24',
        );
      else if (s.id === 'sutro') {
        add('Climb Sutro Tower', climbSutro, 'interaction.25');
        add('Walk to Sutro Tower', () => goToSight(s), 'interaction.26');
      } else if (s.kind === 'gym') {
        for (const exercise of GYM_EXERCISES)
          add('Perform ' + exercise.label, () => useGym(exercise.id), 'gym.' + exercise.id);
        if (context.training) add('Stop training', stopTraining, 'interaction.27');
      } else if (s.kind === 'ferrari') {
        add('Drive / park Ferrari', useFerrari, 'interaction.28');
        if (context.economy.state.fuelCans) add('Use fuel can', useFuelCan, 'interaction.29');
      } else if (s.kind === 'airship') add('Rent an airship', useAirship, 'interaction.30');
      else if (s.kind === 'bike') add('Ride bicycle', useBike, 'interaction.31');
      else if (s.kind === 'windsurf') add('Go windsurfing', useSurf, 'interaction.32');
      else if (s.kind === 'surfing') add('Paddle out', usePacificaSurf, 'interaction.33');
      else if (s.kind === 'whale')
        add('Jump over ' + s.label, () => jumpWhale(s), 'interaction.34');
      else if (s.kind === 'guest') add('Talk to Bani', () => goToSight(s), 'interaction.35');
      else if (s.kind === 'ducks') add('Feed ducks', feedDucks, 'interaction.36');
    }
    const roadTarget =
      context.goldenGate?.targetAt(t.x + 0.5, t.y + 0.5) ||
      context.regionalRoad?.targetAt(t.x + 0.5, t.y + 0.5);
    if (!npc) {
      if (s?.kind !== 'loot' && s?.kind !== 'sunglasses') {
        if (context.surf.state.riding && context.surf.water(t.x + 0.5, t.y + 0.5))
          add(
            context.surf.state.mode === 'surf' ? 'Paddle here' : 'Windsurf here',
            () => {
              if (context.surf.state.mode === 'surf') context.waveSurf.cancelRide();
              walkTo(t.x, t.y);
            },
            'interaction.37',
          );
        else if (roadTarget) add('Walk here', () => walkTo(roadTarget.x, roadTarget.y), 'walk');
        else if (context.clearAt(t.x, t.y)) add('Walk here', () => walkTo(t.x, t.y), 'walk');
        else if (p) add('Walk to entrance', () => walkTo(p.entry.x, p.entry.y), 'walk');
      }
      if (!(['waymo', 'robotaxi'] satisfies [string, string]).includes(s?.kind || ''))
        add(
          'Examine ' +
            (s
              ? s.label
              : p
                ? p.label
                : context.inPark(t.x, t.y)
                  ? 'Golden Gate Park'
                  : owner.label),
          () => examine(s || p || (context.inPark(t.x, t.y) ? sightById('park') : null)),
          'examine',
        );
    }
    if (!npc && equipmentOwned(context.economy.state, 'ball-chair'))
      add(
        'Sit (chair)',
        () => context.multiplayerWorld.command('activity', { mode: 'sit', chair: true }),
        'interaction.38',
      );
    if (!npc && !s && !p && context.skateboard.riding)
      for (const trick of SKATE_TRICKS)
        add(trick.label, () => performSkateTrick(trick.id), 'trick.' + trick.id);
    promoteWalkAction(menu);
    editMenuLabels(menu, owner || 'sight:unlabelled-ground', actionTargets);
    menu.hidden = false;
    menu.style.left = Math.min(context.width - menu.offsetWidth - 12, Math.max(12, sx)) + 'px';
    menu.style.top = Math.min(context.height - menu.offsetHeight - 12, Math.max(12, sy)) + 'px';
    menu.querySelector<HTMLElementTagNameMap['button']>('button')!.focus({ preventScroll: true });
  }

  function editMenuLabels(
    menu: HTMLDivElement,
    owner: string | EditableEntity | null | undefined,
    targets: readonly { label: string; kind: string }[],
  ) {
    const buttons = [...menu.querySelectorAll<HTMLElementTagNameMap['button']>('button')];
    const bindings = new Map(buttons.map((b) => [b.dataset.actionId, b]));
    const authored = menuFromContent(owner, bindings, context);
    if (!authored) return;
    const heading = menu.firstChild;
    menu.replaceChildren(requiredValue(heading, 'Context menu heading'));
    for (const action of authored) {
      const b = action.binding;
      setActionText(b, action.label, targets);
      b.disabled = !!action.disabled;
      menu.append(b);
    }
  }

  function parkCarFirst() {
    announce('Park the Ferrari with R before doing that.', 'Ferrari');
    return false;
  }

  function nearestFuel() {
    if (!context.ferrari) return null;
    const car = context.ferrari;
    return car.stations.reduce<(typeof car.stations)[number] | null>(
      (best, s) =>
        !best ||
        Math.abs(s.distance - car.state.distance) < Math.abs(best.distance - car.state.distance)
          ? s
          : best,
      null,
    );
  }

  function driveFerrari(
    x: number,
    y: number,
    onArrival: ((() => boolean) | undefined) | null = null,
  ): boolean {
    if (!context.ferrari?.state.riding) return false;
    if (context.ferrari.state.fuel <= 0) {
      const s = nearestFuel();
      if (s && Math.abs(s.distance - context.ferrari.state.distance) <= 6)
        return useFuel(sightById(s.id));
      announce(
        'Out of gas. Park with R, walk to a gas station for a fuel can, then bring it back.',
        'Ferrari',
      );
      return false;
    }
    context.carArrival = onArrival;
    setDancing(false);
    closeMenu();
    closeReader();
    const point = context.ferrari.destinationFor(x + 0.5, y + 0.5);
    if (!point) return false;
    const accepted = context.ferrari.driveTo(point.x, point.z);
    if (accepted) context.destination = { x: point.x - 0.5, y: point.z - 0.5 };
    return accepted;
  }

  function parkFerrari() {
    if (!context.ferrari?.state.riding) return false;
    const p = context.ferrari.position;
    context.ferrari.park();
    context.carArrival = null;
    Object.assign(context.player, {
      x: p.x - 0.5,
      y: p.z - 0.5,
      path: [],
      speed: 0,
      moving: false,
      motion: 0,
    });
    context.destination = null;
    context.updateAdventureUI();
    return true;
  }

  function useFerrari() {
    if (
      !context.ferrari ||
      context.capture.state.active ||
      context.rocket.state.active ||
      context.chase?.state.jailed ||
      context.rope.climbing ||
      context.sutroClimb.state.active ||
      context.tahoe.state.mode !== 'ground' ||
      context.surf.state.riding
    )
      return false;
    if (context.flying()) return airshipUnavailable();
    if (context.training) stopTraining();
    if (context.ferrari.state.riding) {
      parkFerrari();
      announce('You park the Ferrari. It will be waiting here.', 'Ferrari');
      return true;
    }
    const p = context.ferrari.position,
      mount = () => {
        parkMotorcycle(false);
        if (context.bike.riding) parkBike();
        setDancing(false);
        context.player.path = [];
        context.player.speed = 0;
        context.player.motion = 0;
        context.player.gesture = null;
        context.currentInterior = null;
        context.action = null;
        context.destination = null;
        context.ferrari.mount();
        context.player.x = p.x - 0.5;
        context.player.y = p.z - 0.5;
        context.player.angle = p.angle;
        context.updateAdventureUI();
        closeMenu();
        closeReader();
        announce(
          'The Ferrari does twenty times walking speed. Click the road or minimap to drive, or use Drive to Tahoe. Keep an eye on the gas gauge. R parks.',
          'Ferrari',
        );
        context.canvas.focus({ preventScroll: true });
      };
    if (Math.hypot(context.player.x + 0.5 - p.x, context.player.y + 0.5 - p.z) < 1.8) {
      mount();
      return true;
    }
    return walkTo(p.x - 0.5, p.z - 0.5, mount);
  }

  function useFuelCan() {
    if (
      !context.ferrari ||
      context.capture.state.active ||
      context.rocket.state.active ||
      context.chase?.state.jailed ||
      context.rope.climbing ||
      context.sutroClimb.state.active ||
      context.tahoe.state.mode !== 'ground' ||
      context.surf.state.riding
    )
      return false;
    if (context.flying()) return airshipUnavailable();
    if (!context.economy.state.fuelCans) {
      announce('You have no fuel can.', 'Fuel');
      return false;
    }
    closeMenu();
    closeReader();
    const pour = () => {
      const result = refuelFerrariFromCan(context.ferrari, context.economy),
        finish = (receipt: import('../types/world.ts').ActionReceipt) => {
          if (receipt.message) announce(receipt.message, 'Fuel');
          context.updateAdventureUI();
        };
      if (result.promise) result.promise.then(finish);
      else finish(result);
      return result.ok;
    };
    const p = context.ferrari.position;
    if (
      context.ferrari.state.riding ||
      Math.hypot(context.player.x + 0.5 - p.x, context.player.y + 0.5 - p.z) < 1.8
    )
      return pour();
    return walkTo(p.x - 0.5, p.z - 0.5, pour);
  }

  function useFuel(site: Site | undefined, npcInput: Actor | null = null): boolean {
    if (!site || !context.ferrari) return false;
    const npc =
      npcInput ||
      context.merchants.find((n) => n.kind === 'fuel-attendant' && n.siteId === site.id);
    if (!npc) return false;
    if (
      context.capture.state.active ||
      context.rocket.state.active ||
      context.chase?.state.jailed ||
      context.rope.climbing ||
      context.sutroClimb.state.active ||
      context.tahoe.state.mode !== 'ground'
    )
      return false;
    if (context.flying()) return airshipUnavailable();
    const go = () => {
      closeReader();
      closeMenu();
      context.player.path = [];
      context.player.speed = 0;
      context.keys.clear();
      npc.hold = 3;
      openNPCDialogue({
        ...npc,
        ...createFuelDialogue(site, context.ferrari, context.economy, context.updateAdventureUI, {
          npc,
          refuel: () => serverCommand(context.multiplayer, 'playerAction', { verb: 'refuel' }),
        }),
        name: npc.name,
      });
      return true;
    };
    if (context.ferrari.state.riding) {
      if (Math.hypot(context.player.x + 0.5 - npc.x, context.player.y + 0.5 - npc.z) <= 1.8)
        return go();
      if (context.ferrari.state.fuel > 0) return driveFerrari(npc.x - 0.5, npc.z - 0.5, go);
      parkFerrari();
    }
    return approachNPC(npc, go);
  }

  function stopTraining() {
    context.multiplayerWorld.actions.request('stopTraining');
    if (!context.training) return;
    context.training = false;
    Object.assign(context.player, {
      x: SF_FITNESS.entry.x,
      y: SF_FITNESS.entry.y,
      path: [],
      speed: 0,
      moving: false,
      motion: 0,
    });
    context.updateAdventureUI();
  }

  function setGymExercise(id: string) {
    context.gymSelection = gymExercise(id).id;
    if (!context.headless)
      try {
        localStorage.setItem('sf-gym-exercise-v1', context.gymSelection);
      } catch {}
    if (context.training) {
      context.multiplayerWorld.actions.request('train', { exercise: context.gymSelection });
      const p = gymExercisePosition(context.gymSelection);
      context.player.x = p.x - 0.5;
      context.player.y = p.z - 0.5;
      announce(
        'You switch to ' + gymExercise(context.gymSelection).label.toLowerCase() + '.',
        'Gym',
      );
    }
    context.updateAdventureUI();
  }

  function useGym(exercise?: string) {
    const chosen = typeof exercise === 'string' && GYM_EXERCISES.some((e) => e.id === exercise);
    if (chosen) setGymExercise(exercise);
    if (context.training) {
      if (chosen) return true;
      stopTraining();
      return true;
    }
    if (context.ferrari?.state.riding) return parkCarFirst();
    if (
      context.capture.state.active ||
      context.rocket.state.active ||
      context.chase?.state.jailed ||
      context.flying() ||
      context.bike.riding ||
      context.surf.state.riding ||
      context.rope.climbing ||
      context.sutroClimb.state.active ||
      context.tahoe.state.mode !== 'ground'
    )
      return false;
    if (context.strength.status.level === 50) {
      announce('You have reached the maximum strength level, 50.', 'Gym');
      return true;
    }
    const begin = async () => {
      parkMotorcycle(false);
      closeReader();
      closeMenu();
      setDancing(false);
      const result = await serverCommand(context.multiplayer, 'playerAction', {
        verb: 'train',
        exercise: context.gymSelection,
      });
      if (!result.ok) {
        announce(result.message, 'Gym');
        return false;
      }
      const spot = gymExercisePosition(context.gymSelection);
      context.training = true;
      context.trainingLast = performance.now();
      Object.assign(context.player, {
        x: spot.x - 0.5,
        y: spot.z - 0.5,
        path: [],
        speed: 0,
        moving: false,
        motion: 0,
      });
      context.action = null;
      context.destination = null;
      context.updateAdventureUI();
      announce(
        'You begin ' +
          gymExercise(context.gymSelection).label.toLowerCase() +
          '. Every exercise earns the same strength XP. Choose another exercise to switch, or Stop training / Escape to finish.',
        'Gym',
      );
      return true;
    };
    if (
      Math.hypot(context.player.x - SF_FITNESS.entry.x, context.player.y - SF_FITNESS.entry.y) < 2
    ) {
      begin();
      return true;
    }
    return walkTo(SF_FITNESS.entry.x, SF_FITNESS.entry.y, begin);
  }

  function talkCapital() {
    if (context.ferrari?.state.riding) return parkCarFirst();
    const begin = () => {
      const npc = context.merchants.find((n) => n.kind === 'capital');
      openNPCDialogue(
        growthDialogue(npc, context.growthService, {
          capital: true,
          claimFunding: () => context.strength.claim(context.economy),
          funded: context.strength.state.funded,
        }),
      );
    };
    return approachNPC(
      context.merchants.find((n) => n.kind === 'capital'),
      begin,
    );
  }

  function sitOnBench(site: InteractionSight | undefined) {
    if (
      !site ||
      !hasSiteEntry(site) ||
      context.capture.state.active ||
      context.chase?.state.jailed ||
      context.flying() ||
      context.rocket.state.active ||
      context.surf.state.riding ||
      context.training
    )
      return false;
    closeMenu();
    return walkTo(site.entry.x, site.entry.y, async () => {
      const r = await context.multiplayerWorld.command('activity', { mode: 'sit', seat: site.id });
      if (r.ok) {
        context.action = null;
        context.destination = null;
        context.player.path = [];
        setSitting(true, true);
      }
    });
  }

  function setSitting(value: boolean, remote = false) {
    if (context.player.sitting === value) return;
    context.player.sitting = value;
    if (!remote && context.multiplayerWorld)
      context.multiplayerWorld.command('activity', { mode: value ? 'sit' : 'walk' }).then((r) => {
        if (!r.ok) {
          setSitting(false, true);
          if (r.message) announce(r.message, 'You');
        }
      });
    if (!context.headless) {
      const button = context.$('sf-sit-button');
      button.setAttribute('aria-pressed', String(value));
      button.innerHTML = (value ? 'Stand up' : 'Sit') + ' <span class="sf-key">X</span>';
      button.title = value ? 'Stand up (X)' : 'Sit down and sober up twice as fast (X)';
    }
  }

  function updateSitting(dt: number) {
    const danceTarget = context.player.dancing ? 1 : 0;
    context.player.danceBlend =
      (context.player.danceBlend || 0) +
      Math.max(-dt / 0.25, Math.min(dt / 0.25, danceTarget - (context.player.danceBlend || 0)));
    if (
      context.player.sitting &&
      (context.player.moving ||
        context.player.path.length ||
        context.training ||
        context.capture.state.active ||
        context.rehabilitation.state.active ||
        context.tabletService?.state.active ||
        context.rocket.state.active ||
        context.flying() ||
        context.surf.state.riding ||
        context.bike.riding ||
        context.motorcycle?.state.riding ||
        context.ferrari?.state.riding ||
        context.skateboard.riding ||
        context.sutroClimb.state.active ||
        context.rope.climbing ||
        context.tahoe.state.mode !== 'ground' ||
        context.forwardRoll.state.active ||
        context.alienCombat ||
        context.wildTarget ||
        context.health.state.hp <= 0)
    )
      setSitting(false, true);
    const target = context.player.sitting ? 1 : 0,
      step = Math.max(0, dt) / 0.45;
    context.player.sitBlend += Math.max(-step, Math.min(step, target - context.player.sitBlend));
  }

  function sit() {
    if (context.player.sitting) {
      setSitting(false);
      context.canvas.focus({ preventScroll: true });
      return true;
    }
    if (
      !context.active ||
      context.health.state.hp <= 0 ||
      context.training ||
      context.capture.state.active ||
      context.rehabilitation.state.active ||
      context.tabletService?.state.active ||
      context.rocket.state.active ||
      context.flying() ||
      context.surf.state.riding ||
      context.bike.riding ||
      context.motorcycle?.state.riding ||
      context.ferrari?.state.riding ||
      context.skateboard.riding ||
      context.sutroClimb.state.active ||
      context.rope.climbing ||
      context.tahoe.state.mode !== 'ground' ||
      context.secretWorld?.bomber.state.active ||
      context.expeditions.ship.aboard
    ) {
      announce('Find a place on foot before sitting down.', 'You');
      return false;
    }
    context.multiplayerWorld?.stopFollowing(true);
    context.forwardRoll.cancel();
    context.fishing.cancel();
    context.expeditions.stop();
    context.alienCombat = null;
    context.wildTarget = null;
    setDancing(false);
    context.player.path = [];
    context.player.speed = 0;
    context.player.motion = 0;
    context.player.moving = false;
    context.player.gesture = null;
    context.action = null;
    context.destination = null;
    closeMenu();
    setSitting(true);
    context.canvas.focus({ preventScroll: true });
    return true;
  }

  function setDancing(value: boolean) {
    if (value) setSitting(false);
    if (context.multiplayerWorld && value !== context.player.dancing)
      context.multiplayerWorld.command('activity', { mode: value ? 'dance' : 'walk' });
    context.player.dancing = value;
    if (!context.headless) {
      context.$('sf-dance-button').setAttribute('aria-pressed', String(value));
      context.$('sf-dance-button').title = value ? 'Stop dancing (D)' : 'Dance (D)';
    }
  }

  function dance() {
    context.forwardRoll.cancel();
    if (
      context.secretWorld?.bomber.state.active ||
      context.ferrari?.state.riding ||
      context.training ||
      context.capture.state.active ||
      context.rocket.state.active ||
      (context.sutroClimb.state.active && context.sutroClimb.state.phase !== 'top') ||
      context.rope.climbing ||
      context.bike.riding ||
      context.motorcycle?.state.riding ||
      context.surf.state.riding ||
      context.tahoe.state.mode !== 'ground'
    ) {
      announce('Find your feet before dancing.', 'You');
      return false;
    }
    context.fishing.cancel();
    context.skateboard.riding = false;
    context.alienCombat = null;
    closeMenu();
    context.basket.state.target = null;
    context.basketArrival = null;
    context.player.path = [];
    context.player.speed = 0;
    context.player.motion = 0;
    context.player.gesture = null;
    context.action = null;
    context.destination = null;
    setDancing(!context.player.dancing);
    if (context.player.dancing && inNightlife(context.player.x + 0.5, context.player.y + 0.5))
      for (const [i, npc] of context.restaurantDiners.filter((n) => n.club).entries()) {
        npc.speech = i ? 'Wow! Good moves!' : 'Good moves! You’ve got rhythm.';
        npc.speechUntil = performance.now() + 3500;
      }
    context.canvas.focus({ preventScroll: true });
    return true;
  }

  function canForwardRoll() {
    return (
      context.active &&
      !context.secretWorld?.bomber.state.active &&
      !context.capture.state.active &&
      !context.rehabilitation.state.active &&
      !context.training &&
      !context.rocket.state.active &&
      !context.sutroClimb.state.active &&
      !context.rope.climbing &&
      !context.flying() &&
      !context.ferrari?.state.riding &&
      !context.bike.riding &&
      !context.motorcycle?.state.riding &&
      !context.skateboard.riding &&
      !context.surf.state.riding &&
      context.tahoe.state.mode === 'ground' &&
      !context.dialogue.active &&
      !context.aiInterview.visible &&
      !context.questMenu?.active &&
      context.$('sf-help').hidden &&
      context.$('sf-character').hidden
    );
  }

  function rollForward() {
    if (context.player.rollPending || context.forwardRoll.state.active || !canForwardRoll())
      return false;
    if (!context.player.path.length) {
      const target = forwardRollTarget(
        context.player,
        context.player.angle,
        context.WALK_SPEED * FORWARD_ROLL_SPEED * FORWARD_ROLL_DURATION,
        (from, to) =>
          context.chase?.state.jailed
            ? context.detention.path(from, to)?.length === 1
            : context.canTravel(from.x, from.y, to.x, to.y),
      );
      if (!target || Math.hypot(target.x - context.player.x, target.y - context.player.y) < 0.4) {
        announce('There is no room to roll forward. Face some open ground.', 'You');
        return false;
      }
      context.player.path = [target];
      context.destination = { ...target };
      context.action = null;
    }
    setSitting(false);
    context.fishing.cancel();
    context.alienCombat = null;
    setDancing(false);
    context.player.gesture = null;
    closeMenu();
    closeReader();
    {
      context.player.rollPending = true;
      context.multiplayerWorld.command('activity', { mode: 'roll' }).then((r) => {
        context.player.rollPending = false;
        if (!r.ok) context.forwardRoll.cancel();
      });
      if (context.destination)
        context.multiplayerWorld.moveTo(context.destination.x + 0.5, context.destination.y + 0.5);
    }
    context.player.speed = context.WALK_SPEED * FORWARD_ROLL_SPEED;
    context.canvas.focus({ preventScroll: true });
    return true;
  }
  return {
    guildStatus,
    sightById,
    playerWeapon,
    expeditionEvent,
    nearestExpeditionPoint,
    collectExpeditionLoot,
    toggleRailgun,
    beginCapture,
    respawnAtHospital,
    airshipUnavailable,
    walkInBasket,
    useAirship,
    useTahoeActivity,
    releaseNPC,
    parkMotorcycle,
    useMotorcycle,
    canUseTablet,
    useTeleportTablet,
    drinkBankCoffee,
    changeMapInstance,
    secretAction,
    updateAlienCombat,
    showRopeMenu,
    climbUnavailable,
    descendSutro,
    climbSutro,
    goToSight,
    orderDoorDash,
    eatSandwich,
    parkBike,
    useBike,
    useSkateboard,
    performSkateTrick,
    usePacificaSurf,
    catchPacificaWave,
    performSurfTrick,
    useSurf,
    talkRehabilitation,
    arrestPlayer,
    interactCitizen,
    debugTeleport,
    walkTo,
    goToPlace,
    announce,
    enter,
    closeReader,
    closeMenu,
    clicked,
    walkToActor,
    examine,
    showMenu,
    nearestFuel,
    driveFerrari,
    parkFerrari,
    useFerrari,
    useFuelCan,
    useFuel,
    stopTraining,
    useGym,
    setSitting,
    updateSitting,
    sit,
    setDancing,
    dance,
    canForwardRoll,
    rollForward,
  };
}
