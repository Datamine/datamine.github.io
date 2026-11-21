import type { PlayerDocument, MonkeyStage } from './types/content.ts';
import type { PlayerProfile } from './types/profile.ts';

import { isRecord } from './types/json.ts';
import { validatePlayerDocument } from './content/validate.js';
import defaults from './content/player-state-defaults.json' with { type: 'json' };
import bindings from './content/player-state-bindings.json' with { type: 'json' };
import { stateValue } from './content-conditions.ts';
import { dogSurfingRound } from './dog-surfing.ts';

const attached = new WeakSet();
const clone = <T>(value: T) => (value == null ? value : structuredClone(value));
const parse = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};
function set(state: object, path: string, value: unknown) {
  const parts = path.split('.');
  let node: Record<string, unknown> = state as Record<string, unknown>;
  for (const part of parts.slice(0, -1)) {
    const next = (node[part] ??= {});
    if (!isRecord(next)) throw new Error('Invalid player-state parent: ' + path);
    node = next;
  }
  node[parts.at(-1)!] = value;
}
function merge<T>(base: T, input: unknown): T {
  if (!isRecord(base) || !input || typeof input !== 'object' || Array.isArray(input)) return base;
  const record: Record<string, unknown> = base;
  for (const [key, value] of Object.entries(input)) {
    if (
      (['__proto__', 'constructor', 'prototype'] satisfies [string, string, string]).includes(key)
    )
      continue;
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      record[key] &&
      typeof record[key] === 'object' &&
      !Array.isArray(record[key])
    )
      merge(record[key], value);
    else record[key] = clone(value);
  }
  return base;
}
function moduleValue(document: PlayerDocument, key: string) {
  const path = (bindings.modules as Record<string, string>)[key];
  return path === '$quests'
    ? { monkey: document.quests.monkey.stage, theyLive: document.quests.theyLive }
    : stateValue(document, path);
}
function setModule(document: PlayerDocument, key: string, value: unknown) {
  const path = (bindings.modules as Record<string, string>)[key];
  if (path === '$quests') {
    if (isRecord(value)) {
      document.quests.monkey.stage =
        typeof value.monkey === 'string' ? (value.monkey as MonkeyStage) : 'not-started';
      document.quests.theyLive = merge(
        clone(validatePlayerDocument(defaults).quests.theyLive),
        value.theyLive,
      );
    }
  } else if (path) {
    const initial = stateValue(defaults, path);
    set(
      document,
      path,
      initial && typeof initial === 'object' && !Array.isArray(initial)
        ? merge(clone(initial), value)
        : value,
    );
  } else document.migration.unknownPrivateState[key] = value;
  if (!document.migration.legacyKeys.includes(key)) document.migration.legacyKeys.push(key);
}

export function createPlayerDocument(input: unknown = {}): PlayerDocument {
  const result = merge(clone(validatePlayerDocument(defaults)), input);
  result.schema = 2;
  return result;
}

/** Migrate old persisted profiles once. The live aliases point into one plain JSON document. */
export function hydratePlayerProfile<T extends object>(input: T): T & PlayerProfile {
  const profile = input as T & PlayerProfile;
  if (attached.has(profile)) return profile;
  const legacy = profile.privateState || {};
  const document = createPlayerDocument(profile.playerState || {});
  if (!profile.playerState) {
    for (const [key, path] of Object.entries(bindings.profile) as [
      keyof typeof bindings.profile,
      string,
    ][])
      if (Object.hasOwn(profile, key)) set(document, path, clone(profile[key]));
    for (const [key, value] of Object.entries(legacy)) {
      const decoded = typeof value === 'string' ? parse(value) : value;
      if (decoded !== undefined) setModule(document, key, decoded);
    }
  }
  profile.playerState = document;
  Object.defineProperty(profile, 'stateRevision', { value: 0, writable: true, configurable: true });
  for (const [key, path] of Object.entries(bindings.profile) as [
    keyof typeof bindings.profile,
    string,
  ][]) {
    Reflect.deleteProperty(profile, key);
    Object.defineProperty(profile, key, {
      configurable: true,
      get: () => stateValue(profile.playerState, path) ?? undefined,
      set: (value) => {
        set(
          profile.playerState,
          path,
          value === undefined ? clone(stateValue(defaults, path)) : value,
        );
        if (!(['position', 'police'] satisfies [string, string]).includes(key))
          profile.stateRevision++;
      },
    });
  }
  const privateState = new Proxy(
    {},
    {
      ownKeys: () => [...profile.playerState.migration.legacyKeys],
      getOwnPropertyDescriptor: (_, key: string) =>
        typeof key === 'string' && profile.playerState.migration.legacyKeys.includes(key)
          ? { enumerable: true, configurable: true }
          : undefined,
      get: (_, key: string) => {
        if (typeof key !== 'string' || !profile.playerState.migration.legacyKeys.includes(key))
          return undefined;
        return JSON.stringify(
          (bindings.modules as Record<string, string>)[key]
            ? moduleValue(profile.playerState, key)
            : profile.playerState.migration.unknownPrivateState[key],
        );
      },
      set: (_, key: string, value) => {
        const decoded = typeof value === 'string' ? parse(value) : undefined;
        if (decoded !== undefined && typeof key === 'string') {
          setModule(profile.playerState, key, decoded);
          profile.stateRevision++;
        }
        return true;
      },
    },
  );
  Reflect.deleteProperty(profile, 'privateState');
  Object.defineProperty(profile, 'privateState', { configurable: true, get: () => privateState });
  attached.add(profile);
  return profile;
}

export function serializePlayerProfile(input: object) {
  const profile = hydratePlayerProfile(input);
  return {
    ...profile,
    playerState: validatePlayerDocument(JSON.parse(JSON.stringify(profile.playerState))),
  };
}

/** Only the state read by conditional content, shared by previews, server and scene. */
export interface PlayerContentContext {
  multiplayer?: {
    state: {
      playerState?: PlayerDocument | null;
      guild?: PlayerDocument['quests']['illuminatus']['guild'];
      serverOffset?: number;
      world?: { airship?: object | null } | null;
    };
  } | null;
  economy?: { state: Partial<PlayerDocument['inventory']['economy']> };
  quests?: {
    state: { monkey?: MonkeyStage; theyLive?: Partial<PlayerDocument['quests']['theyLive']> };
  };
  expeditions?: {
    state?: Partial<PlayerDocument['quests']['expeditions']>;
    ship?: { aboard?: boolean; phase?: string } | null;
  };
  secretWorld?: { initiated?: boolean };
  motorcycle?: {
    state: Pick<PlayerDocument['vehicles']['motorcycle'], 'rented' | 'x' | 'y' | 'angle'>;
  };
  ferrari?: { state: Pick<PlayerDocument['vehicles']['ferrari'], 'owned' | 'riding' | 'fuel'> };
  aiLabJob?: { state: PlayerDocument['employment']['aiLab'] };
  strength?: { state: PlayerDocument['skills']['strength'] };
  training?: boolean;
  currentInterior?: { id?: string } | null;
  sutroClimb?: { state: { active?: boolean } };
  chase?: { state: { jailed?: boolean } } | null;
  social?: { state: { pitch?: unknown } };
  tahoe?: { state: { rented?: boolean } };
  contentAirshipStatus?: object | null;
}
/** The same JSON shape supplies editor previews and in-game conditional dialogue. */
export function playerDocumentFromContext(
  context: PlayerContentContext,
  entity: import('./types/world.ts').EditableEntity | null = null,
) {
  const state = createPlayerDocument(context.multiplayer?.state.playerState || {});
  const economy = context.economy?.state || {};
  const quests = context.quests?.state || {};
  merge(state.inventory.economy, economy);
  if (quests.monkey) state.quests.monkey.stage = quests.monkey;
  if (quests.theyLive) merge(state.quests.theyLive, quests.theyLive);
  for (const key of Object.keys(
    defaults.quests.expeditions,
  ) as (keyof PlayerDocument['quests']['expeditions'])[])
    if (context.expeditions?.state?.[key] !== undefined)
      set(state, 'quests.expeditions.' + key, context.expeditions.state[key]);
  const guild = context.multiplayer?.state.guild;
  state.quests.illuminatus.guild = guild ? { ...guild } : state.quests.illuminatus.guild;
  state.quests.illuminatus.initiated =
    context.secretWorld?.initiated ?? state.quests.illuminatus.initiated;
  if (context.motorcycle?.state) state.vehicles.motorcycle = { ...context.motorcycle.state };
  if (context.ferrari?.state)
    state.vehicles.ferrari = {
      owned: !!context.ferrari?.state.owned,
      riding: !!context.ferrari?.state.riding,
      fuel: context.ferrari?.state.fuel || 0,
    };
  if (context.aiLabJob?.state) state.employment.aiLab = { ...context.aiLabJob.state };
  if (context.strength?.state) state.skills.strength = { ...context.strength.state };
  state.activities = {
    ...state.activities,
    training: !!context.training,
    inside: !!context.currentInterior,
    insideTarget: !!entity?.id && context.currentInterior?.id === entity.id,
    climbing: !!context.sutroClimb?.state.active,
    jailed: !!context.chase?.state.jailed,
    aboard: !!context.expeditions?.ship?.aboard,
    krakenVictory: context.expeditions?.ship?.phase === 'victory',
    pitchPending: !!context.social?.state.pitch,
    skisRented: !!context.tahoe?.state.rented,
    dogSurfJudging: dogSurfingRound(
      (Date.now() + (context.multiplayer?.state.serverOffset || 0)) / 1000,
    ).judging,
    airship: {
      ...(context.contentAirshipStatus || context.multiplayer?.state.world?.airship),
    } as import('./types/content.ts').JSONObject,
  };
  state.conditions.jailed = context.chase?.state.jailed ?? state.conditions.jailed;
  const entityState = {
    placement: entity?.editorKey || null,
    name: entity?.label || entity?.name || '',
    level: entity?.level || 1,
  };
  return Object.assign(state, { entity: entityState, capabilities: [] as string[] });
}
