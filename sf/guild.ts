import type { ActionReceipt, Actor } from './types/world.ts';
import { isSafeInteger, isRecord } from './types/json.ts';

// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { configuredDialogue } from './dialogue-config.ts';

export const GUILD_RESET_MS = 3600000,
  GUILD_RESETS_REQUIRED = 24,
  PEPTIDE_SPAWN_MS = 600000;
export const TECHNOLOGIST_MARKET = "Technologist's Farmers Market";
export const GUILD_BUILDINGS = Object.freeze([
  {
    id: 'freemasons-guild',
    name: contentText('guild.module.name-1', {}),
    label: contentText('guild.module.label-2', {}),
    category: 'Nob Hill · members club',
    x: 38,
    y: 24,
    w: 4.4,
    d: 3.8,
    h: 100,
    worldHeight: 3.15,
    color: '#b8a58a',
    trim: '#ddd0aa',
    style: 'civic',
    roof: 'gable',
    roofColor: '#5b7779',
    activityBuilding: true,
    description: contentText('guild.module.description-3', {}),
  },
  // Preserve the site ID so existing visits and map references still work.
  {
    id: 'sunset-whole-foods',
    name: TECHNOLOGIST_MARKET,
    label: TECHNOLOGIST_MARKET,
    signText: "Technologist's\nFarmers Market",
    category: 'Sunset · produce & molecular agriculture',
    x: 17,
    y: 40,
    w: 4,
    d: 3,
    h: 62,
    color: '#6e927d',
    trim: '#dbd2b1',
    style: 'shop',
    roof: 'flat',
    roofColor: '#344b42',
    activityBuilding: true,
    description: contentText('guild.module.description-6', {}),
  },
]);

/** Each return requires a full server-clock hour since the last qualifying
 * visit. Missed hours never turn into automatic promotions. */
export function createGuildMembership(
  savedInput: unknown = {},
  now = Date.now,
  onSave: (value0: {
    version: number;
    visits: number;
    lastVisitAt: number | null;
    member: boolean;
  }) => void = () => {},
) {
  const saved = isRecord(savedInput) ? savedInput : {};

  // Keep the existing progress field so saved hourly ranks remain intact.
  // A prior one-vial admission becomes one paid promotion under this rule.
  const state = {
    version: 2,
    visits: Math.max(
      0,
      Math.min(GUILD_RESETS_REQUIRED, Number.isInteger(saved.visits) ? saved.visits : 0),
    ),
    lastVisitAt:
      isSafeInteger(saved.lastVisitAt) && saved.lastVisitAt >= 0 ? saved.lastVisitAt : null,
    member: false,
  };
  if (saved.version !== 2 && saved.member === true && state.visits < GUILD_RESETS_REQUIRED)
    state.visits++;
  state.member = state.visits === GUILD_RESETS_REQUIRED;
  const status = () => ({
    ...state,
    rank: state.visits + 1,
    required: GUILD_RESETS_REQUIRED,
    nextVisitAt: state.lastVisitAt === null ? 0 : state.lastVisitAt + GUILD_RESET_MS,
  });
  function checkIn() {
    if (state.member)
      return { ok: true, message: 'Welcome back. The lodge is open to you.', guild: status() };
    const time = now();
    if (state.lastVisitAt !== null && time < state.lastVisitAt + GUILD_RESET_MS)
      return {
        ok: false,
        message:
          'You are Rank ' +
          (state.visits + 1) +
          '. Return in ' +
          Math.ceil((state.lastVisitAt + GUILD_RESET_MS - time) / 60000) +
          ' minutes; a full hour must pass between qualifying visits.',
        guild: status(),
      };
    if (state.lastVisitAt !== null) state.visits++;
    state.lastVisitAt = time;
    if (state.visits >= GUILD_RESETS_REQUIRED) state.member = true;
    onSave({ ...state });
    return {
      ok: true,
      message: state.member
        ? 'Rank 25. Twenty-four promotions. Welcome to the Freemasons’ Guild!'
        : 'You are now Rank ' + (state.visits + 1) + '. ' + state.visits + ' promotions completed.',
      guild: status(),
    };
  }
  function donate(consume: () => boolean) {
    if (state.member)
      return {
        ok: true,
        message:
          'You are already a member. Keep your peptides; the refreshments committee is quite lively enough.',
        guild: status(),
      };
    if (!consume())
      return {
        ok: false,
        message: 'You have no peptides to donate.',
        guild: status(),
      };
    state.visits++;
    state.lastVisitAt ??= now();
    state.member = state.visits === GUILD_RESETS_REQUIRED;
    onSave({ ...state });
    return {
      ok: true,
      message: state.member
        ? 'Your twenty-fourth promotion. Rank 25! Welcome to the Freemasons’ Guild!'
        : 'One vial, one promotion. You are now Rank ' +
          (state.visits + 1) +
          ' (' +
          state.visits +
          '/24 promotions).',
      guild: status(),
    };
  }
  return { state, status, checkIn, donate };
}

export function insideGuild(
  site: { x: number; y: number; w: number; d: number; rotation?: number } | undefined | null,
  x: number,
  z: number,
) {
  if (!site) return false;
  const a = site.rotation || 0,
    c = Math.cos(a),
    s = Math.sin(a),
    dx = x - site.x - site.w / 2,
    dz = z - site.y - site.d / 2;
  return (
    Math.abs(dx * c + dz * s) < site.w / 2 - 0.12 && Math.abs(-dx * s + dz * c) < site.d / 2 - 0.12
  );
}
export function guildDialogue(
  ray: Partial<Actor> | undefined,
  {
    status,
    act,
  }: {
    status: () => Partial<ReturnType<ReturnType<typeof createGuildMembership>['status']>> & {
      peptides?: number;
    };
    act: (kind: string) => ActionReceipt | Promise<ActionReceipt>;
  },
) {
  const info = status();
  return {
    ...ray,
    intro: info.member
      ? contentText('guild.guildDialogue.intro-8.yes', {})
      : contentText('guild.guildDialogue.intro-8.no', { v0: info.rank, v1: info.peptides || 0 }),
    question: () => {
      const current = status();
      return current.member
        ? 'Your membership is confirmed. Welcome to the lodge.'
        : 'Rank ' +
            current.rank +
            ' · ' +
            current.visits +
            ' promotions. Peptides carried: ' +
            (current.peptides || 0) +
            '.';
    },
    decline: contentText('guild.guildDialogue.decline-10', {}),
    repeat: true,
    choices: [
      {
        label: info.member
          ? contentText('guild.guildDialogue.label-12.yes', {})
          : contentText('guild.guildDialogue.label-12.no', {}),
        accept: () => act('checkIn'),
        contentNodeId: 'guild.guildDialogue.node-11',
        labelTextId: info.member
          ? 'guild.guildDialogue.label-12.yes'
          : 'guild.guildDialogue.label-12.no',
        labelTextValues: info.member ? {} : {},
        actionId: 'guild.guildDialogue.action-13',
      },
      {
        label: contentText('guild.guildDialogue.label-15', {}),
        accept: () => act('donate'),
        contentNodeId: 'guild.guildDialogue.node-14',
        labelTextId: 'guild.guildDialogue.label-15',
        labelTextValues: {},
        actionId: 'guild.guildDialogue.action-16',
      },
      ...(configuredDialogue('guild-rumours').choices || []),
    ],
    contentNodeId: 'guild.guildDialogue.node-7',
    introTextId: info.member ? 'guild.guildDialogue.intro-8.yes' : 'guild.guildDialogue.intro-8.no',
    introTextValues: info.member ? {} : { v0: info.rank, v1: info.peptides || 0 },
    declineTextId: 'guild.guildDialogue.decline-10',
    declineTextValues: {},
  };
}

/** Every point is selected from authored, reachable pavement, never a
 * random tile anywhere in the city or a point inside shelving. */
export function peptideSpawnPoints(
  site: { rotation?: number; x: number; w: number; y: number; d: number },
  walkable: (x: number, y: number) => boolean,
) {
  const angle = site.rotation || 0,
    c = Math.cos(angle),
    s = Math.sin(angle),
    cx = site.x + site.w / 2,
    cz = site.y + site.d / 2,
    points = [];
  for (const u of [-1.2, -0.6, 0, 0.6, 1.2] satisfies [number, number, number, number, number])
    for (const v of [0.55, 0.95] satisfies [number, number]) {
      const x = cx + u * c - (site.d / 2 + v) * s,
        z = cz + u * s + (site.d / 2 + v) * c;
      if (walkable(x - 0.5, z - 0.5)) points.push({ x, z });
    }
  if (!points.length) throw Error(TECHNOLOGIST_MARKET + ' needs a reachable peptide forecourt');
  return points;
}

export function marketFarmerDialogue(npc: Partial<Actor>) {
  const report = () => 'The crops keep their own hours. I try not to argue.',
    actions = { countdown: () => ({ ok: true, message: report() }) };
  const person = configuredDialogue('market-farmer', npc, actions, {
    marketLine: npc.marketLine,
    countdown: report(),
  });
  person.intro = () => {
    const intro = configuredDialogue('market-farmer', npc, actions, {
      marketLine: npc.marketLine,
      countdown: report(),
    }).intro;
    return typeof intro === 'function' ? intro() : intro || '';
  };
  return person;
}
