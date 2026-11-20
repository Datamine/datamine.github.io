import { sampleRocketPresentation } from './rocket.js';
import { MP_ENTITY_INTERPOLATION_MS } from './multiplayer-protocol.js';
import { createPursuitPresentation } from './pursuit-presentation.js';

/** Keep one visual clock for the rider, rocket, hatch and camera. Buffer one
 * entity sample, and bound continuation if packets stop arriving. */
export function createRocketPresentation({
  now = () => performance.now(),
  groundHeight = () => 0,
  delayMs = MP_ENTITY_INTERPOLATION_MS,
} = {}) {
  let snapshot = null,
    receivedAt = 0;
  return {
    accept(value) {
      snapshot = value;
      receivedAt = now();
    },
    sample() {
      return sampleRocketPresentation(
        snapshot,
        (Math.min(Math.max(0, now() - receivedAt), delayMs + 50) - delayMs) / 1000,
        groundHeight,
      );
    },
  };
}

/** Smooth server-authored vehicle/pose samples without advancing gameplay. */
export function interpolateGamePresentation(previous, current, t, key = '') {
  if (
    typeof current === 'number' &&
    typeof previous === 'number' &&
    Number.isFinite(current) &&
    Number.isFinite(previous)
  ) {
    const delta =
      key === 'angle' || key === 'heading'
        ? Math.atan2(Math.sin(current - previous), Math.cos(current - previous))
        : current - previous;
    return previous + delta * Math.max(0, Math.min(1, t));
  }
  if (
    !current ||
    typeof current !== 'object' ||
    Array.isArray(current) ||
    !previous ||
    typeof previous !== 'object'
  )
    return current;
  return Object.fromEntries(
    Object.entries(current).map(([k, v]) => [k, interpolateGamePresentation(previous[k], v, t, k)]),
  );
}

/** Input adapters and server-state application. Local controllers are read
 * models for the renderer, dialogue, wardrobe and quest journal. */
export function createMultiplayerActions({ client, controllers, announce, onState = () => {} }) {
  const {
    strength,
    quests,
    sunglasses,
    tech,
    social,
    inebriation,
    fishing,
    expeditions,
    motorcycle,
    health,
    deli,
    aiLabJob,
    chase,
    monkeyKeeper,
  } = controllers;
  const pursuits = createPursuitPresentation({ police: chase, keeper: monkeyKeeper });
  function request(verb, args = {}) {
    const promise = client.command('playerAction', { verb, ...args }).then((r) => {
      if (r.message) announce(r.message, r.ok ? 'You' : 'Server');
      return r;
    });
    return { ok: true, pending: true, message: 'Waiting for the server…', promise };
  }
  function apply(fields = {}, state, time = client.state.personalSampleAt) {
    const mapping = {
      'sf-strength-v1': strength,
      'sf-sunglasses-v1': sunglasses,
      'sf-tech-ventures-v1': tech,
      'sf-ai-lab-job-v1': aiLabJob,
      'sf-expeditions-v1': expeditions,
      'sf-motorcycle-v1': motorcycle,
    };
    for (const [key, value] of Object.entries(fields)) {
      if (key === 'sf-quests-v1') {
        const { theyLive, ...rest } = value;
        Object.assign(quests.state, rest);
        if (theyLive) Object.assign(quests.theyLive.state, theyLive);
      } else if (key === 'sf-inebriation-v1') inebriation.state.percent = value;
      else if (mapping[key]) Object.assign(mapping[key].state, value);
      else if (key === 'sf-hitpoints-v1') Object.assign(health.state, value);
    }
    if (state) {
      if (state.fishing) {
        Object.assign(fishing.state, state.fishing);
        fishing.state.site = controllers.fishingSite;
      }
      if (state.delivery) {
        Object.assign(deli.state, state.delivery);
        deli.state.pending = true;
      } else if (deli.state.pending && !client.state.inventory?.deliveryPending) {
        deli.state.pending = false;
        deli.state.arrived = true;
      }
      social.state.pitch = state.pitch
        ? {
            ...state.pitch,
            npc: controllers.merchants.find((n) => n.id === state.pitch.id) || {
              id: state.pitch.id,
            },
          }
        : null;
      pursuits.syncPersonal(state, time);
      if (state.ship) Object.assign(expeditions.ship, state.ship);
      if (state.kraken) Object.assign(expeditions.kraken, state.kraken);
      if (state.loot)
        expeditions.state.loot = [
          ...expeditions.state.loot.filter((n) => n.network),
          ...state.loot,
        ];
      if (state.vehicle && controllers.ferrari)
        controllers.ferrari.state.fuel = state.vehicle.fuel ?? controllers.ferrari.state.fuel;
    }
    onState(fields, state);
  }
  client.subscribe((message) => {
    if (message.type === 'instance' || message.type === 'welcome') pursuits.clear();
    if (message.type === 'playerState')
      apply(message.privateState, message.state, message.sampleTime);
    if (message.type === 'notice') announce(message.message, 'World');
    if (message.type === 'salesDecision') {
      announce(message.message, 'Software salesman');
      controllers.resolvePitch?.(message);
    }
  });
  const initial = {};
  for (const [key, value] of Object.entries(client.state.privateState || {}))
    try {
      initial[key] = JSON.parse(value);
    } catch {}
  apply(initial, client.state.personal);
  return { request, apply, update: (connected) => pursuits.update(connected) };
}
