import type {
  PreviewWorld,
  PreviewEntity,
  InspectionTarget,
  InspectionRecord,
  InspectionActionVariant,
  InspectionDialogueVariant,
  PreviewProfile,
  SerializedDialogue,
  SerializedBindings,
} from '../types/editor.ts';
import type { WorldContext } from '../world/scene.ts';
import { errorMessage, isFiniteNumber } from '../types/json.ts';

import type { RuntimeDialogue, RuntimeChoice, Actor } from '../types/world.ts';
import previewProfiles from '../content/preview-profiles.json' with { type: 'json' };

import {
  tigerInteractionTarget,
  ropeInteractionTarget,
  whaleInteractionTarget,
} from '../interaction-targets.ts';
import { createInteractions } from '../world/interactions.ts';
import { actionTargetKind } from '../context-menu.ts';
import { npcDisplayLabel, npcContextActions } from '../npc-interactions.ts';
import { actorLevel } from '../levels.ts';
import { describeCharacter } from '../descriptions.ts';
import { createEconomy } from '../economy.ts';
import { createQuestLog } from '../quests.ts';
import '../they-live.ts';
import { CONVERSATION_POOL, createAmbientDialogue } from '../dialogues/ambient.ts';
import { HAT_CATALOG } from '../hat-catalog.ts';
import { menuDocument } from './menu-dom.mts';
import { dialogueChoices } from '../dialogue-choices.ts';
import { applyEntityEdits, applyDialogueEdits, editedSpeechText } from '../world-edits.ts';

const noop = () => ({ ok: true });
const stopped = () => {};
const stateful = (state: {
  active?: boolean;
  phase?: string;
  riding?: boolean;
  jump?: null;
  mode?: string;
  ride?: null;
  rented?: boolean;
  hired?: boolean;
}) => ({ state, stop: stopped, cancel: stopped, reset: stopped });
export const profiles: PreviewProfile[] = previewProfiles.profiles;

export function isInspectableNPC(
  npc: Pick<PreviewEntity, 'child' | 'baby' | 'editorKey' | 'label' | 'name' | 'female'>,
) {
  return (
    !npc.child &&
    !npc.baby &&
    (!!npc.editorKey ||
      !/^(man|woman|child|boy|girl|baby)$/i.test((npc.label || npc.name || '').trim()))
  );
}
const position = (entity: PreviewEntity) => ({
  x: isFiniteNumber(entity.x) ? entity.x : entity.entry?.x,
  z: isFiniteNumber(entity.z) ? entity.z : (entity.entry?.y ?? entity.y),
});

export function collectTargets(world: PreviewWorld) {
  const entries: InspectionTarget[] = [],
    keys = new Set<string>(),
    actors = new Set<PreviewEntity>();
  const add = (entity: PreviewEntity | null | undefined, source: string, actor = false) => {
    if (!entity) return;
    const id = entity.id || source + '-' + entries.length;
    const key = (actor ? 'actor:' : source === 'places' ? 'place:' : 'sight:') + id;
    applyEntityEdits(entity, key);
    const group =
      entity.editorCategory ||
      (actor ? 'npc' : actionTargetKind(entity) === 'npc' ? 'npc' : 'object');
    if (!actor && actionTargetKind(entity) === 'item') return;
    if (actor && (!isInspectableNPC(entity) || actors.has(entity))) return;
    if (actor) actors.add(entity);
    if (keys.has(key)) return;
    keys.add(key);
    entries.push({
      key,
      id,
      group,
      actor,
      source,
      entity,
      name: entity.label || entity.name || entity.named || id,
      kind: entity.combatKind || entity.kind || (actor ? 'person' : 'building'),
      position: position(entity),
    });
  };
  world.places.forEach((n) => add(n, 'places'));
  world.sights.forEach((n) => add(n, 'sights'));
  for (const site of [
    world.caveExitSite,
    world.bomberSite,
    world.zoo && tigerInteractionTarget(world.zoo),
    ropeInteractionTarget(world.airship.home),
  ])
    add(site, 'dynamic');
  for (const car of [...(world.streetTraffic?.cars || []), world.slowBus?.bus].filter(
    (car) => !!car,
  ))
    add({ ...car.sight, x: car.x, z: car.z, entry: { x: car.x - 0.5, y: car.z - 0.5 } }, 'traffic');
  for (let i = 0; i < (world.whales?.count || 0); i++) {
    const p = world.whales!.sample(0, i);
    add(
      { ...whaleInteractionTarget(i), x: p.x, z: p.z, entry: { x: p.x - 0.5, y: p.z - 0.5 } },
      'whales',
    );
  }
  const populations: [string, readonly PreviewEntity[] | undefined][] = [
    ['merchants', world.merchants],
    ['parrots', world.parrots],
    ['jailStaff', world.jailStaff],
    ['restaurantDiners', world.restaurantDiners],
    ['residents', world.southernNeighborhood?.residents],
    ['socialLife', world.socialLife?.people],
    ...world.lives.map((l, i): [string, readonly PreviewEntity[]] => ['lives-' + i, l.people]),
    ['wilderness', world.wilderness?.actors],
    ['cows', world.expeditions.cows],
    [
      'expeditions',
      [world.expeditions.raptor, world.expeditions.kraken].filter((n): n is PreviewEntity => !!n),
    ],
    ['keeper', world.keeperNPC ? [world.keeperNPC] : []],
    ['police', [{ id: 'police', label: 'Police', police: true }]],
  ];
  for (const [source, people] of populations) (people || []).forEach((n) => add(n, source, true));
  add(
    {
      id: 'unlabelled-ground',
      label: 'Street / unlabelled scenery',
      kind: 'ground',
      entry: world.spawn,
      description: 'Unlabelled scenery uses the ground action menu.',
    },
    'ground',
  );
  return entries.sort((a, b) => a.name.localeCompare(b.name) || a.key.localeCompare(b.key));
}

function contextFor(
  world: PreviewWorld,
  target: InspectionTarget,
  profile: PreviewProfile,
  doc: ReturnType<typeof menuDocument>,
) {
  const npc = { ...target.entity },
    point = target.position;
  applyEntityEdits(npc, target.key);
  const economy = createEconomy({
    coins: 25,
    iphoneOwned: !!profile.iphoneOwned,
    iphoneEquipped: !!profile.iphoneEquipped,
    robotaxiOwned: !!profile.robotaxiOwned,
    saltLetters: profile.letter || 0,
    saltLettersDelivered: profile.lettersDelivered || 0,
    ownedHats: profile.hatsOwned ? HAT_CATALOG.map((h) => h.id) : [],
    ownedEquipment: profile.equipment ? ['ball-chair'] : [],
    fuelCans: profile.equipment ? 1 : 0,
  });
  const quests = createQuestLog({ monkey: profile.monkey, theyLive: profile.theyLive });
  const player = {
    x: (point.x || 0) - 0.5,
    y: (point.z || 0) - 0.5,
    angle: 0,
    path: [],
    motion: 0,
  };
  const captured: {
    dialogue: RuntimeDialogue | null;
    messages: string[];
    panel: string | null;
    requests: { action: string; args: unknown }[];
  } = { dialogue: null, messages: [], panel: null, requests: [] };
  const menu = doc.getElementById('sf-context');
  const guild = {
    rank: profile.guildMember ? 25 : 1 + (profile.guildVisits || 0),
    visits: profile.guildMember ? 24 : profile.guildVisits || 0,
    member: !!profile.guildMember,
  };
  const ship = {
    active: !!profile.airshipActive,
    rentalPrice: 15,
    resetAt: 1120000,
    pilot: 'Another player',
    canRecall: !!(profile.airshipActive || profile.reserved),
    reservedForYou: !!profile.prepaid,
    reservedName: profile.reserved ? 'Another player' : null,
  };
  const command = async (action: string, args: unknown) => {
    if (action !== 'airshipStatus')
      throw Error('Inspection attempted a mutating command: ' + action);
    captured.requests.push({ action, args });
    return { ok: true, airship: ship };
  };
  const panel = (label: string | null) => ({
    open: () => {
      captured.panel = label;
    },
  });
  const methods = new Proxy<Record<string, () => ReturnType<typeof noop>>>({}, { get: () => noop });
  const ctx = {
    ...world,
    active: true,
    headless: false,
    width: 1200,
    height: 900,
    $: (id: string) => doc.getElementById(id),
    world: new Proxy({}, { get: () => stopped }),
    canvas: doc.getElementById('canvas'),
    player,
    playerLook: { weapon: 'unarmed', sunglasses: !!profile.theyLive?.started },
    merchants: world.merchants.map((n) => (n.id === npc.id ? npc : n)),
    currentInterior: npc.interior || (profile.inside ? npc : null),
    currentInstitute: null,
    economy,
    quests,
    multiplayer: {
      state: {
        connected: true,
        guild,
        inventory: { peptides: 0 },
        pvp: { enabled: false },
        serverOffset: (npc.dogSurfJudge ? (profile.judging ? 40000 : 0) : 1000000) - Date.now(),
        world: { airship: ship },
      },
      command,
    },
    multiplayerWorld: null,
    capture: stateful({ active: false }),
    chase: { state: { jailed: !!profile.jailed }, start: stopped },
    zoo: stateful({ phase: profile.tigerLoose ? 'loose' : 'caged' }),
    rocket: stateful({ active: false }),
    rope: { climbing: false },
    surf: stateful({ riding: false, jump: null, mode: 'surf' }),
    waveSurf: stateful({ ride: null }),
    sutroClimb: stateful({ active: !!profile.climbing, phase: 'top' }),
    tahoe: stateful({ mode: 'ground', rented: !!profile.rented }),
    bike: { riding: false },
    motorcycle: stateful({ riding: false, rented: !!profile.rented }),
    skateboard: { riding: false },
    ferrari: {
      state: {
        riding: false,
        owned: !!profile.equipment,
        distance: npc.siteId ? world.sights.find((s) => s.id === npc.siteId)?.distance || 0 : 0,
        fuel: 0.5,
      },
      sample: () => ({ x: point.x, z: point.z }),
      position: { x: point.x, z: point.z },
    },
    secretWorld: {
      kind: 'world',
      initiated: !!profile.initiated,
      bomber: stateful({ active: false }),
      join: noop,
    },
    expeditions: {
      stop: stopped,
      state: {
        raptor: profile.raptor || 'not-started',
        railgun: !!profile.raptor,
        krakenReward: !!profile.krakenReward,
      },
      ship: { aboard: !!profile.aboard, phase: profile.victory ? 'victory' : 'fighting' },
      startQuest: noop,
      finishQuest: noop,
      returnShip: noop,
      board: noop,
    },
    ahabNPC: npc.expeditionRole === 'ahab' ? npc : null,
    sunglasses: { state: { owned: !!profile.theyLive?.started || !!profile.equipment } },
    social: { state: { pitch: profile.pitch ? {} : null }, startPitch: noop },
    tech: {
      state: { doomElapsed: 0, taxiElapsed: 0 },
      buyPhone: noop,
      equipPhone: noop,
      buyRobotaxi: noop,
    },
    inebriation: { state: { percent: 0 }, drink: noop },
    fishing: { cancel: stopped },
    forwardRoll: { cancel: stopped },
    deli: methods,
    tabletService: { state: { active: false }, buy: noop },
    growthService: methods,
    bankService: { act: noop },
    bankMenu: panel('Green Bank account'),
    duelMenu: panel('Duel Arena'),
    aiLabJob: stateful({ hired: !!profile.hired }),
    aiInterview: panel('Arithmetic interview'),
    rehabilitation: stateful({ active: false }),
    saltMail: { carrying: !!profile.letter, collect: noop, deliver: noop },
    strength: { state: { funded: !!profile.funded }, claim: noop },
    keys: new Set(),
    training: !!profile.training,
    dialogue: {
      active: false,
      open(person: RuntimeDialogue) {
        captured.dialogue = applyDialogueEdits(person, target.key);
        return true;
      },
      close: stopped,
    },
    hitCitizen: () => (target.actor ? npc : null),
    hitSight: () =>
      !target.actor && target.source !== 'places' && target.source !== 'ground' ? npc : null,
    hitPlace: () => (target.source === 'places' ? npc : null),
    tileAt: () => ({ x: player.x, y: player.y }),
    flying: () => false,
    activeInstituteRoom: () => (profile.inside ? npc : null),
    npcRevealed: (n: PreviewEntity) => !!(n.alienId && profile.theyLive?.started),
    npcLabel: (n: PreviewEntity, combat = true) =>
      npcDisplayLabel(n, {
        combat,
        level: actorLevel(n),
        revealed: !!(n.alienId && profile.theyLive?.started),
      }),
    npcPrimary: (n: PreviewEntity) =>
      n.wilderness
        ? n.combatKind === 'bear'
          ? 'pet'
          : 'attack'
        : n.police
          ? 'examine'
          : (['raptor', 'cow', 'kraken'] satisfies [string, string, string]).includes(
                n.combatKind || '',
              ) ||
              (n.alienId && profile.theyLive?.started)
            ? 'attack'
            : 'talk',
    merchantApproach: () => ({ x: player.x, y: player.y }),
    playerGround: () => npc.base || 0,
    clearAt: () => true,
    landClearAt: () => true,
    canTravel: () => true,
    pathTo: () => [{ x: player.x, y: player.y }],
    nearestNavigation: (x: number, y: number) => ({ x, y }),
    inPark: () => false,
    goldenGate: { targetAt: () => null },
    regionalRoad: { targetAt: () => null },
    closeHelp: stopped,
    closeCharacter: stopped,
    updateAdventureUI: stopped,
    announce: (text: string) => captured.messages.push(text),
    clicked: (_x: number, _y: number, fn: () => unknown) => fn(),
  };
  return { ctx, captured, npc, menu };
}

function string(value: unknown) {
  return typeof value === 'function' ? String(value()) : value == null ? '' : String(value);
}
export function serializeDialogue(
  person: RuntimeDialogue | null | undefined,
  path: ReadonlySet<RuntimeDialogue> = new Set(),
  inherited: Pick<RuntimeDialogue, 'decline' | 'repeat'> = {},
): SerializedDialogue | null {
  if (!person || path.has(person)) return null;
  const nextPath = new Set([...path, person]);
  const choices = dialogueChoices(person);
  const fields = (node: RuntimeDialogue | RuntimeChoice): SerializedBindings =>
    Object.fromEntries(
      (['intro', 'question', 'label', 'receipt', 'decline'] as const).flatMap((field) => {
        const id = node[`${field}TextId`];
        let values = node[`${field}TextValues`];
        if (typeof values === 'function') values = values();
        return id ? [[field, { id, values: values || {} }]] : [];
      }),
    );
  return {
    id: person.contentNodeId || null,
    textBindings: fields(person),
    intro: string(person.intro),
    question: string(person.question),
    decline: person.decline || inherited.decline || 'Leave',
    repeat: person.repeat ?? inherited.repeat ?? false,
    skipIntro: !!person.skipIntro,
    sharedPool: !!person.ambientConversation,
    choices: choices
      .filter((c) => !/^(?:i should get going[.!]?|leave[.!]?|goodbye[.!]?)$/i.test(c.label.trim()))
      .map((c) => ({
        id: c.contentNodeId || c.id || c.actionId || null,
        action:
          typeof c.accept === 'function' ? c.actionId || null : c.trade ? 'trade:' + c.trade : null,
        textBindings: fields(c),
        label: c.label,
        receipt: string(c.receipt),
        trade: c.trade || null,
        binding: c.accept?.toString() || null,
        serverReceipt: !!c.serverReceipt,
        sharedPool: !!c.ambientConversation,
        next: c.ambientConversation
          ? null
          : serializeDialogue(c.next, nextPath, {
              decline: person.decline || inherited.decline,
              repeat: person.repeat ?? inherited.repeat,
            }),
      })),
  };
}

export async function inspectTarget(
  world: PreviewWorld,
  target: InspectionTarget,
  { scenarios = profiles }: { scenarios?: readonly PreviewProfile[] } = {},
): Promise<InspectionRecord> {
  target = { ...target, entity: { ...target.entity } };
  const previous = globalThis.document,
    doc = menuDocument();
  // The legacy preview runs the production text menu against its intentionally small DOM adapter.
  globalThis.document = doc as unknown as Document;
  const actionVariants: InspectionActionVariant[] = [],
    dialogueVariants: InspectionDialogueVariant[] = [],
    signatures = {
      actions: new Map<string, InspectionActionVariant>(),
      dialogue: new Map<string, InspectionDialogueVariant>(),
    };
  function variant<T extends object>(
    list: (T & { states: string[] })[],
    seen: Map<string, T & { states: string[] }>,
    value: T,
    label: string,
  ) {
    const key = JSON.stringify(value);
    if (seen.has(key)) seen.get(key)!.states.push(label);
    else {
      const node = { states: [label], ...value };
      seen.set(key, node);
      list.push(node);
    }
  }
  try {
    const relevant = target.actor
      ? scenarios
      : [
          scenarios[0],
          { label: 'Inside this building', inside: true },
          { label: 'Equipment and rentals available', equipment: true, rented: true },
          ...(target.entity.kind === 'gym' ? [{ label: 'Training', training: true }] : []),
          ...(target.entity.id === 'sutro'
            ? [{ label: 'At the top of Sutro Tower', climbing: true }]
            : []),
        ];
    for (const profile of relevant) {
      const { ctx, captured, npc, menu } = contextFor(world, target, profile, doc),
        // This read-only harness replaces game services with capture stubs; mutations throw above.
        interactions = createInteractions(ctx as unknown as WorldContext);
      interactions.showMenu(50, 50);
      const actions = menu.querySelectorAll('button').map((b) => ({
        id: b.dataset.actionId || null,
        label: b.textContent,
        disabled: !!b.disabled,
      }));
      variant(actionVariants, signatures.actions, { actions }, profile.label);
      if (
        !target.actor ||
        !npcContextActions(npc, { primary: ctx.npcPrimary(npc) }).includes('talk')
      )
        continue;
      const result = interactions.interactCitizen(npc as Actor, 'talk');
      if (result instanceof Promise) await result;
      // approachNPC delegates some async read-only openings without returning them.
      for (let i = 0; i < 6; i++) await Promise.resolve();
      let dialogue = serializeDialogue(captured.dialogue);
      if (dialogue?.sharedPool)
        dialogue = {
          intro: '',
          sharedPool: true,
          choices: [],
          decline: 'Leave',
          question: '',
          repeat: false,
          skipIntro: false,
        };
      const speech = editedSpeechText(npc, npc.speech || captured.messages.join('\n'));
      if (dialogue || speech || captured.panel)
        variant(
          dialogueVariants,
          signatures.dialogue,
          { dialogue, speech: dialogue ? '' : speech, panel: captured.panel },
          profile.label,
        );
    }
    return {
      key: target.key,
      id: target.id,
      name: target.name,
      group: target.group,
      kind: target.kind,
      source: target.source,
      position: target.position,
      description: target.actor
        ? describeCharacter(target.entity)
        : target.entity.description || '',
      appearance:
        target.actor &&
        !target.entity.wilderness &&
        !(['cow', 'raptor', 'kraken'] satisfies [string, string, string]).includes(
          target.entity.combatKind || '',
        ) &&
        !target.entity.parrot &&
        !target.entity.dog
          ? {
              skin: target.entity.skin,
              shirt: target.entity.shirt,
              hair: target.entity.hair,
              pants: target.entity.pants,
              female: target.entity.female,
              gender: target.entity.female ? 'woman' : 'man',
              hat: target.entity.hat,
              cap: target.entity.cap,
              chef: target.entity.kind === 'chef',
              coat: target.entity.coat,
            }
          : null,
      actions: actionVariants,
      dialogues: dialogueVariants,
    };
  } finally {
    globalThis.document = previous;
  }
}
export async function createInspectionCatalog(world: PreviewWorld) {
  const records = [];
  for (const target of collectTargets(world)) {
    try {
      records.push(await inspectTarget(world, target));
    } catch (error) {
      throw new Error('Inspector could not read ' + target.key + ': ' + errorMessage(error), {
        cause: error,
      });
    }
  }
  return {
    schema: 1,
    records,
    sharedDialogue: CONVERSATION_POOL.map((chain) => ({
      id: chain.id,
      title: chain.title,
      dialogue: {
        ...serializeDialogue(createAmbientDialogue({ name: 'NPC' }, { chain })),
        sharedPool: false,
      },
    })),
  };
}
