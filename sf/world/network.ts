import type { PersonalSnapshot } from '../types/network.ts';
import { requiredValue } from '../types/assert.ts';
import { isFiniteNumber } from '../types/json.ts';
import type { WorldContext } from './scene.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from '../content-runtime.ts';
import { FERRARI_SPEED } from '../ferrari.ts';
import { createActorAnimation } from '../animation-presentation.ts';
import { serverConnected } from '../server-connection.ts';
import { createDuelMenu } from '../finance-ui.ts';
import { DUEL_ARENA, atDuelArena } from '../duel-layout.ts';
import { TABLET_PLACES } from '../teleport-tablets.ts';
import { ownedHat } from '../hat-catalog.ts';
import { PEQUOD } from '../jurassic-layout.ts';
import { FORWARD_ROLL_DURATION } from '../forward-roll.ts';
import { createWorldMultiplayer, setupMultiplayerSettings } from '../multiplayer-world.ts';
import { interpolateGamePresentation, createRocketPresentation } from '../multiplayer-actions.ts';
import { MP_ENTITY_INTERPOLATION_MS } from '../multiplayer-protocol.ts';
import { normalizeCharacter } from '../character-config.ts';

/** Network services for the browser scene.
 * Dependencies are explicit live scene bindings, preserving initialization
 * order without globals. This module only reads bindings when a method runs. */
export function createNetwork(context: WorldContext) {
  function setupWorldMultiplayer() {
    if (context.headless) return;
    let priorTravel: PersonalSnapshot['travel'] | null = null,
      currentTravel: PersonalSnapshot['travel'] | null = null,
      travelSource: PersonalSnapshot['travel'] | null = null,
      travelTime = 0;
    let priorPersonalShip: PersonalSnapshot['ship'] | null = null,
      currentPersonalShip: PersonalSnapshot['ship'] | null = null,
      personalShipSource: PersonalSnapshot['ship'] | null = null,
      personalShipTime = 0;
    const playerAnimation = createActorAnimation();
    context.multiplayer.subscribe((message) => {
      if (message.type === 'instance') {
        priorPersonalShip = currentPersonalShip = personalShipSource = null;
      }
    });
    const rocketPresentation = createRocketPresentation({ groundHeight: context.characterGround });
    function showTravel(travel: PersonalSnapshot['travel'] | null) {
      if (!travel) return;
      const rocketPhase = context.rocket.state.active ? context.rocket.state.phase : null,
        tahoeMode = context.tahoe.state.mode;
      const presentedRocket = rocketPresentation.sample();
      if (presentedRocket) Object.assign(context.rocket.state, presentedRocket);
      else context.rocket.state.active = false;
      if (travel.tahoe) Object.assign(context.tahoe.state, travel.tahoe);
      else context.tahoe.state.mode = 'ground';
      if (rocketPhase !== (context.rocket.state.active ? context.rocket.state.phase : null))
        context.updateRocketControls();
      if (tahoeMode !== context.tahoe.state.mode) context.updateTahoeButton();
      const wasActive = context.sutroClimb.state.active,
        phase = context.sutroClimb.state.phase;
      if (travel.sutro) Object.assign(context.sutroClimb.state, travel.sutro);
      else Object.assign(context.sutroClimb.state, { active: false, phase: 'ground' });
      if (
        wasActive !== context.sutroClimb.state.active ||
        phase !== context.sutroClimb.state.phase
      ) {
        context.updateClimbButton();
        if (wasActive && !context.sutroClimb.state.active)
          context.announce('You step off the Sutro Tower ladder and return to the trail.', 'You');
        else if (phase !== 'top' && context.sutroClimb.state.phase === 'top')
          context.announce(
            'You reach the upper platform of Sutro Tower. Use the arrows to look around; Climb down or E returns to the ground.',
            'You',
          );
      }
      if (travel.bomber) Object.assign(context.secretWorld.bomber.state, travel.bomber);
      if (travel.surf) {
        Object.assign(context.waveSurf.state, travel.surf.wave);
        context.surf.state.jump = travel.surf.jump;
        context.waveTime = travel.surf.clock;
      }
    }
    context.world.addEventListener(
      'click',
      (e) => {
        if (context.tabletService?.state.active) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      true,
    );
    context.multiplayerSettings = setupMultiplayerSettings(context.multiplayer, {
      showCharacter: context.showCharacter,
      announce: context.announce,
    });
    context.duelMenu = createDuelMenu({
      element: context.$('sf-duel'),
      client: context.multiplayer,
      player: context.player,
      announce: context.announce,
    });
    context.$('sf-duel-button').addEventListener('click', () => {
      if (atDuelArena(context.player.x + 0.5, context.player.y + 0.5))
        requiredValue(context.duelMenu, 'Duel menu').open();
      else {
        context.walkTo(DUEL_ARENA.entry.x, DUEL_ARENA.entry.y, () =>
          requiredValue(context.duelMenu, 'Duel menu').open(),
        );
        context.announce('Walking to the Duel Arena gardens.', 'You');
      }
    });
    for (const id of TABLET_PLACES)
      context.$('sf-tablet-' + id).addEventListener('click', () => context.useTeleportTablet(id));
    context
      .$('sf-bomber-bomb')
      .addEventListener('click', () => context.secretAction(context.secretWorld.dropBomb()));
    context
      .$('sf-bomber-roll')
      .addEventListener('click', () => context.secretWorld.bomber.barrelRoll());
    context
      .$('sf-bomber-land')
      .addEventListener('click', () => context.secretAction(context.secretWorld.ejectBomber()));
    context
      .$('sf-grapple-button')
      .addEventListener('click', () => context.multiplayerWorld?.grapple());
    if (!context.multiplayer) return;
    context.multiplayerWorld = createWorldMultiplayer({
      client: context.multiplayer,
      lives: [
        context.cityLife,
        context.southernLife,
        context.noeValleyLife,
        context.squareLife,
        context.esotericCampus?.life,
      ].filter((life) => life != null),
      player: context.player,
      airship: context.airship,
      basket: context.basket,
      rope: context.rope,
      expeditions: context.expeditions,
      wilderness: context.wilderness,
      zoo: context.zoo,
      merchants: [
        ...context.merchants,
        ...[
          context.cityLife,
          context.southernLife,
          context.noeValleyLife,
          context.squareLife,
          context.esotericCampus?.life,
        ].flatMap((l) => l?.people || []),
      ],
      health: context.health,
      economy: context.economy,
      combatFeedback: context.combatFeedback,
      characterGround: context.characterGround,
      playerGround: context.playerGround,
      announce: context.announce,
      signs: context.signs,
      actorInView: context.actorInView,
      refreshUI: () => {
        context.updateAdventureUI();
        context.updateAirshipButton();
      },
      onPurse: context.updatePurse,
      controllers: {
        strength: context.strength,
        quests: context.quests,
        sunglasses: context.sunglasses,
        tech: context.tech,
        social: context.social,
        inebriation: context.inebriation,
        fishing: context.fishing,
        fishingSite: context.fishingSite,
        expeditions: context.expeditions,
        motorcycle: context.motorcycle,
        health: context.health,
        deli: context.deli,
        aiLabJob: context.aiLabJob,
        chase: context.chase,
        monkeyKeeper: context.monkeyKeeper,
        merchants: context.merchants,
        ferrari: context.ferrari,
        resolvePitch: (m) => context.dialogue.resolvePending(m.id || '', m.message),
      },
      applyPlayerState: (fields, state) => {
        if (state?.ship && personalShipSource !== state.ship) {
          personalShipSource = state.ship;
          priorPersonalShip = currentPersonalShip || state.ship;
          currentPersonalShip = state.ship;
          personalShipTime = performance.now();
        }
        if (fields['sf-character-v1']) {
          context.playerLook = normalizeCharacter(fields['sf-character-v1']);
          context.updateSunglassesControl();
          context.updateHatControl();
        }
        if (state?.travel && travelSource !== state.travel) {
          travelSource = state.travel;
          priorTravel = currentTravel || state.travel;
          currentTravel = state.travel;
          travelTime = performance.now();
          rocketPresentation.accept(state.travel.rocket);
          showTravel(state.travel);
        }
        if (state?.training !== undefined) context.training = state.training;
        if (fields['sf-sunglasses-v1']) context.updateSunglassesControl();
        if (state?.police) {
          context.$('sf-wanted').hidden = !state.police.wanted;
          context.$('sf-custody').hidden = !state.police.jailed;
        }
        context.questMenu?.render();
        context.updateAdventureUI();
      },
      applyServerPose: (p) => {
        if (p.gesture === 'work' && !context.player.serverWorking)
          context.player.gesture = {
            name: contentText('world.network.setupWorldMultiplayer.name-1', {}),
            started: performance.now(),
            duration: 2200,
          };
        context.player.serverWorking = p.gesture === 'work';
        if (p.gesture === 'eat' && !context.player.serverEating)
          context.player.gesture = {
            name: contentText('world.network.setupWorldMultiplayer.name-2', {}),
            started: performance.now(),
            duration: 900,
          };
        context.player.serverEating = p.gesture === 'eat';
        if (p.mode === 'roll') {
          context.forwardRoll.state.active = true;
          context.forwardRoll.state.elapsed =
            Math.max(0, Math.min(1, p.phase / (Math.PI * 2))) * FORWARD_ROLL_DURATION;
          context.player.serverRolling = true;
        } else if (context.player.serverRolling) {
          context.forwardRoll.cancel();
          context.player.serverRolling = false;
        }
        const animation = playerAnimation.sample(p, performance.now());
        showTravel(
          interpolateGamePresentation(
            priorTravel,
            currentTravel,
            (performance.now() - travelTime) / MP_ENTITY_INTERPOLATION_MS,
          ),
        );
        Object.assign(context.player, {
          x: p.x - 0.5,
          y: p.z - 0.5,
          angle: p.angle,
          phase: p.phase,
          motion: animation.motion,
          moving: !!p.moving,
          runBlend: animation.run,
          speed: p.moving ? context.WALK_SPEED : 0,
        });
        context.player.ballChair = p.mode === 'sit' && p.gesture === 'chair';
        context.player.benchSeat = p.mode === 'bench' || context.player.ballChair;
        context.setSitting(p.mode === 'sit' || p.mode === 'bench', true);
        if (context.rocket.state.active) {
          const position = requiredValue(context.rocket.state.position, 'Active rocket position'),
            pose = requiredValue(context.rocket.state.pose, 'Active rocket pose');
          Object.assign(context.player, {
            x: position.x - 0.5,
            y: position.z - 0.5,
            angle: pose.angle,
            phase: pose.phase,
            motion: pose.motion,
            moving: pose.motion > 1e-5,
            runBlend: 0,
          });
        }
        if (context.secretWorld?.kind === 'kraken' && currentPersonalShip?.aboard) {
          const ship = interpolateGamePresentation(
            priorPersonalShip,
            currentPersonalShip,
            (performance.now() - personalShipTime) / MP_ENTITY_INTERPOLATION_MS,
          );
          Object.assign(context.expeditions.ship, ship);
          Object.assign(context.player, {
            x: ship.x - 0.5,
            y: ship.z - 0.5,
            phase: 0,
            motion: 0,
            moving: false,
            runBlend: 0,
          });
          if (context.ahabNPC)
            Object.assign(context.ahabNPC, {
              x: ship.x - 1.45,
              z: ship.z + 0.55,
              base: PEQUOD.deck,
            });
        }
        if (p.mode === 'bomber' || p.mode === 'parachute') {
          Object.assign(context.secretWorld.bomber.state, {
            position: { x: p.x, y: p.y, z: p.z },
            heading: p.angle,
            bank: p.phase,
            rollAngle: 0,
            speed: p.moving ? 8 : 0,
          });
        }
        if (p.mode === 'ferrari' && context.ferrari) {
          context.ferrari.state.localPosition = { x: p.x, y: p.y, z: p.z, angle: p.angle };
          context.ferrari.state.speed = p.moving ? FERRARI_SPEED : 0;
        }
        if (
          context.destination &&
          Math.hypot(
            context.player.x - context.destination.x,
            context.player.y - context.destination.y,
          ) < 0.12 &&
          !p.moving
        ) {
          context.destination = null;
          context.player.path = [];
          if (context.action) {
            const fn = context.action;
            context.action = null;
            fn();
          }
        }
      },
      moveResult: (r) => {
        if (!r.ok) {
          context.action = null;
          context.destination = null;
        } else if (r.goal) {
          const goal = { x: r.goal.x - 0.5, y: r.goal.z - 0.5 };
          if (
            context.destination &&
            Math.hypot(context.destination.x - goal.x, context.destination.y - goal.y) > 0.01
          )
            context.action = null;
          context.destination = goal;
          context.drawMini();
        }
      },
      onDetained: () => context.beginCapture('police', context.arrestPlayer),
      applyInventory: (snapshot) => {
        context.collectionFound = snapshot.collection || [];
        if (context.collectionMenu?.active) context.collectionMenu.render();
        Object.assign(context.economy.state, snapshot.purse);
        context.deli.state.sandwiches = snapshot.sandwiches;
        context.deli.state.pending = snapshot.deliveryPending && !context.deli.state.arrived;
        if (isFiniteNumber(snapshot.hp)) {
          context.health.state.max = snapshot.max || context.health.state.max;
          context.health.state.hp = Math.max(0, Math.min(context.health.state.max, snapshot.hp));
          localStorage.setItem('sf-hitpoints-v1', JSON.stringify(context.health.state));
        }
        if (!ownedHat(context.economy.state.ownedHats, context.playerLook.hat)) {
          context.playerLook = normalizeCharacter({ ...context.playerLook, hat: 'none' });
          localStorage.setItem('sf-character-v1', JSON.stringify(context.playerLook));
        }
        context.updatePurse(context.economy.state);
        context.updateHatControl();
        context.updatePhoneControl();
        context.updateAdventureUI();
      },
      canFollow: () =>
        context.active &&
        !context.tabletService?.state.active &&
        context.multiplayer.state.connected &&
        context.secretWorld?.kind === 'world' &&
        !context.secretWorld.bomber.state.active &&
        !context.capture.state.active &&
        !context.rehabilitation.state.active &&
        !context.chase.state.jailed &&
        !context.flying() &&
        !context.rope.climbing &&
        !context.sutroClimb.state.active &&
        !context.rocket.state.active &&
        !context.surf.state.riding &&
        !context.bike.riding &&
        !context.motorcycle?.state.riding &&
        !context.ferrari?.state.riding &&
        !context.skateboard.riding &&
        !context.training &&
        context.tahoe.state.mode === 'ground' &&
        !context.dialogue.active &&
        !context.bankMenu?.active &&
        !context.questMenu?.active &&
        !context.aiInterview.visible &&
        context.$('sf-reader').hidden &&
        context.$('sf-character').hidden &&
        context.$('sf-help').hidden,
      stopFollowMotion: () => {
        context.player.path = [];
        context.player.speed = 0;
        context.player.moving = false;
        context.player.motion = 0;
      },
      applyFollowPose: (p, stopped) => {
        if (!p) return;
        const goal = stopped ? context.player.path.at(-1) : null;
        Object.assign(context.player, {
          x: p.x - 0.5,
          y: p.z - 0.5,
          angle: p.angle,
          phase: p.phase,
          motion: p.motion || 0,
          moving: !!p.moving,
          runBlend: p.moving ? 1 : 0,
          speed: p.moving ? context.WALK_SPEED : 0,
        });
        if (stopped) {
          context.player.path = goal ? context.pathTo(goal.x, goal.y) || [] : [];
          if (goal && !context.player.path.length) {
            context.action = null;
            context.destination = null;
          }
        } else context.player.path = [];
      },
      preparePlayerAction: () => {
        context.setSitting(false);
        context.fishing.cancel();
        context.forwardRoll.cancel();
        context.setDancing(false);
        context.alienCombat = null;
        context.player.path = [];
        context.player.speed = 0;
        context.action = null;
        context.destination = null;
      },
      onPrivateAward: (award) => {
        if (award.kind === 'raptor') context.expeditions.recover();
        else if (!award.inventory) {
          if (award.kind === 'coins') context.economy.credit(award.amount);
          else if (award.kind === 'sandwich') context.deli.storeSandwich(award.amount);
        }
        context.updateAdventureUI();
      },
      onCaught: (source: string) => {
        context.health.damage(context.health.state.hp);
        context.beginCapture(source === 'tiger' ? 'tiger' : 'alien', context.respawnAtHospital);
      },
      onPosition: (p) => {
        if (
          context.capture.state.active &&
          (['respawn', 'jail'] satisfies [string, string]).includes(p.reason || '')
        )
          return;
        if (p.reason === 'teleport') {
          context.debugTeleport(p.x, p.z, true);
          return;
        }
        if (p.reason === 'respawn') context.health.restore();
        if (context.secretWorld?.bomber.state.active)
          context.secretWorld.bomber.state.position = { x: p.x, y: p.y, z: p.z };
        Object.assign(context.player, {
          x: p.x - 0.5,
          y: p.z - 0.5,
          path: [],
          speed: 0,
          moving: false,
          motion: 0,
        });
        context.action = null;
        context.destination = null;
        if (p.reason === 'disembark' || p.reason === 'landed') {
          context.airship.state.active = false;
          context.rope.reset();
        }
        context.updateCamera();
        context.drawMini();
      },
    });
  }

  function publishMultiplayerPose() {
    if (!context.multiplayerWorld || !serverConnected(context.multiplayer)) return;
    if (context.chase.state.jailed && !context.sentMultiplayerCustody)
      context.multiplayer.command('personalTransit', { kind: 'jail' });
    context.sentMultiplayerCustody = context.chase.state.jailed;
    const mode = context.tabletService?.state.active
      ? 'teleport'
      : context.secretWorld?.bomber.state.active
        ? context.secretWorld.bomber.state.phase === 'parachuting'
          ? 'parachute'
          : 'bomber'
        : context.expeditions.ship.aboard
          ? 'hidden'
          : context.rocket.state.active
            ? (['boarding', 'disembarking'] satisfies [string, string]).includes(
                context.rocket.state.phase,
              )
              ? 'climb'
              : 'hidden'
            : context.multiplayerWorld.traversing
              ? 'climb'
              : context.flying()
                ? 'airship'
                : context.surf.state.riding
                  ? 'surf'
                  : context.ferrari?.state.riding
                    ? 'ferrari'
                    : context.motorcycle?.state.riding
                      ? 'motorcycle'
                      : context.bike.riding
                        ? 'bike'
                        : context.skateboard.riding
                          ? 'skateboard'
                          : context.tahoe.state.mode === 'ski'
                            ? 'ski'
                            : context.tahoe.state.mode === 'gondola' ||
                                context.sutroClimb.state.active ||
                                context.rope.climbing
                              ? 'climb'
                              : context.training
                                ? 'train'
                                : context.player.sitting
                                  ? 'sit'
                                  : context.player.dancing
                                    ? 'dance'
                                    : context.forwardRoll.state.active
                                      ? 'roll'
                                      : 'walk';
    context.multiplayerWorld.update({
      x: context.player.x + 0.5,
      z: context.player.y + 0.5,
      y: context.playerGround(),
      angle: context.player.angle,
      phase:
        mode === 'bomber'
          ? context.secretWorld.bomber.state.bank + context.secretWorld.bomber.state.rollAngle
          : context.player.phase,
      motion: Math.max(0, Math.min(1, context.player.motion || 0)),
      moving: !!context.player.moving,
      mode,
      boost: mode === 'bomber' && context.keys.has('shift'),
      hp: context.health.state.hp,
      talkingTo: context.approachingNPC?.id,
      gesture: context.capture.state.active
        ? 'caught'
        : context.player.gesture &&
            performance.now() - context.player.gesture.started < context.player.gesture.duration
          ? context.player.gesture.name
          : '',
    });
  }
  return { setupWorldMultiplayer, publishMultiplayerPose };
}
