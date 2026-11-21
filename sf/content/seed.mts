import type {
  ContentBundle,
  Condition,
  EntityDefinition,
  EntityPlacement,
  DialogueNode,
  DialogueChoice,
  MenuVariant,
  DialogueVariant,
  JSONPrimitive,
  TextSpec,
  TextValues,
  SharedConversation,
  SharedNode,
  SharedChoice,
} from '../types/content.ts';
import type {
  InspectionRecord,
  PreviewProfile,
  SerializedDialogue,
  SerializedBindings,
} from '../types/editor.ts';
import { requiredValue } from '../types/assert.ts';
import { readFile, writeFile } from 'node:fs/promises';
import { HAT_CATALOG } from '../config/hats.ts';
import { groupEditorRecords } from '../editor/groups.ts';
const read = async <T,>(name: string | URL): Promise<T> =>
  JSON.parse(await readFile(new URL(name, import.meta.url), 'utf8')) as T;
const raw = JSON.parse(
  await readFile(process.argv[2] || '/tmp/sf-content-raw-catalog.json', 'utf8'),
) as { records: InspectionRecord[] };
const entities: ContentBundle['entities'] = { schema: 1, definitions: {}, placements: {} };
const dialogues = await read<ContentBundle['dialogues']>('dialogues.json');
const texts = await read<ContentBundle['texts']>('texts.json');
const profiles = (await read<{ profiles: PreviewProfile[] }>('preview-profiles.json')).profiles;
const eq = (path: string, value: JSONPrimitive) => ({ path, eq: value });
const all = (...conditions: Condition[]) => ({ all: conditions });
function condition(
  label: string,
  definition: Pick<EntityDefinition, 'id' | 'kind'>,
): Condition | undefined {
  const p: Partial<PreviewProfile> = profiles.find((v) => v.label === label) || {};
  if (p.monkey) return eq('quests.monkey.stage', p.monkey);
  if (p.theyLive)
    return all(
      ...(['started', 'evidence', 'permit', 'bayonet', 'completed'] as const).map((k) =>
        eq('quests.theyLive.' + k, !!p.theyLive![k]),
      ),
      { path: 'quests.theyLive.defeated', count: { eq: p.theyLive.defeated?.length || 0 } },
    );
  if (p.aboard)
    return all(eq('activities.aboard', true), eq('activities.krakenVictory', !!p.victory));
  if (p.krakenReward) return eq('quests.expeditions.krakenReward', true);
  if (p.raptor) return eq('quests.expeditions.raptor', p.raptor);
  if (p.initiated) return eq('quests.illuminatus.initiated', true);
  if (p.guildMember)
    return all(
      eq('quests.illuminatus.guild.member', true),
      eq('quests.illuminatus.initiated', false),
    );
  if (p.guildVisits)
    return all(eq('quests.illuminatus.guild.member', false), {
      path: 'quests.illuminatus.guild.visits',
      gte: p.guildVisits,
    });
  if (p.hired) return eq('employment.aiLab.hired', true);
  if (p.iphoneEquipped) return eq('inventory.economy.iphoneEquipped', true);
  if (p.iphoneOwned)
    return all(
      eq('inventory.economy.iphoneOwned', true),
      eq('inventory.economy.iphoneEquipped', false),
    );
  if (p.robotaxiOwned) return eq('inventory.economy.robotaxiOwned', true);
  if (p.pitch) return eq('activities.pitchPending', true);
  if (p.letter) return { path: 'inventory.economy.saltLetters', gte: 1 };
  if (p.lettersDelivered) return { path: 'inventory.economy.saltLettersDelivered', gte: 1 };
  if (p.funded) return eq('skills.strength.funded', true);
  if (p.hatsOwned)
    return { path: 'inventory.economy.ownedHats', count: { gte: HAT_CATALOG.length } };
  if (p.airshipActive) return eq('activities.airship.active', true);
  if (p.prepaid) return eq('activities.airship.reservedForYou', true);
  if (p.reserved) return { path: 'activities.airship.reservedName', exists: true };
  if (p.judging) return eq('activities.dogSurfJudging', true);
  if (p.jailed) return eq('conditions.jailed', true);
  if (p.equipment || label === 'Equipment and rentals available')
    return definition.id.includes('fuel-attendant')
      ? eq('vehicles.ferrari.owned', true)
      : { path: 'inventory.economy.ownedEquipment', contains: 'ball-chair' };
  if (p.rented)
    return eq(
      definition.kind === 'lift' ? 'activities.skisRented' : 'vehicles.motorcycle.rented',
      true,
    );
  if (label === 'Inside this building') return eq('activities.insideTarget', true);
  if (label === 'Training') return eq('activities.training', true);
  if (label === 'At the top of Sutro Tower') return eq('activities.climbing', true);
  return undefined;
}
function when(
  states: string[],
  definition: Pick<EntityDefinition, 'id' | 'kind'>,
): Condition | undefined {
  if (states.includes('New visitor')) return undefined;
  const options = states
    .map((label) => condition(label, definition))
    .filter((value): value is Condition => value !== undefined);
  return options.length === 1 ? options[0] : options.length ? { any: options } : undefined;
}
function templateText(
  value: string | undefined,
  binding: SerializedBindings[keyof SerializedBindings] | undefined,
  samples: Record<string, TextValues>,
  sampleKey: string,
): TextSpec {
  if (binding?.id && texts.texts[binding.id]) {
    samples[sampleKey] = binding.values || {};
    return { text: binding.id };
  }
  return value || '';
}
function graph(source: SerializedDialogue) {
  const nodes: Record<string, DialogueNode> = {},
    samples: Record<string, TextValues> = {};
  let serial = 0;
  function node(n: SerializedDialogue): string {
    const base = n.id || 'node-' + ++serial;
    let id = base;
    let count = 1;
    while (nodes[id]) id = base + '.' + ++count;
    const result: DialogueNode = {
      id,
      choices: [],
      repeat: !!n.repeat,
      skipIntro: !!n.skipIntro,
      intro: '',
      question: '',
      decline: '',
    };
    nodes[id] = result;
    for (const field of ['intro', 'question', 'decline'] as const)
      result[field] = templateText(n[field], n.textBindings?.[field], samples, id + ':' + field);
    const ids = new Set();
    for (const [i, c] of n.choices.entries()) {
      let cid = c.id || c.action || id + '.choice-' + (i + 1);
      if (ids.has(cid)) cid += '.' + (i + 1);
      ids.add(cid);
      const choice: DialogueChoice = {
        id: cid,
        label: templateText(c.label, c.textBindings?.label, samples, cid + ':label'),
      };
      if (c.receipt)
        choice.receipt = templateText(
          c.receipt,
          c.textBindings?.receipt,
          samples,
          cid + ':receipt',
        );
      if (c.action) choice.action = c.action;
      if (c.trade) choice.trade = c.trade;
      if (c.serverReceipt) choice.serverReceipt = true;
      if (c.sharedPool) choice.shared = true;
      else if (c.next) choice.next = node(c.next);
      result.choices.push(choice);
    }
    return id;
  }
  return { root: node(source), nodes, sampleValues: samples };
}
for (const group of groupEditorRecords(raw.records)) {
  const def: EntityDefinition = {
    id: group.key,
    name: group.name,
    category: group.group,
    kind: group.kind,
    description: group.description || '',
    menus: [],
    dialogues: [],
    capabilities: [],
  };
  entities.definitions[def.id] = def;
  const menuMap = new Map<string, MenuVariant>(),
    dialogueMap = new Map<string, DialogueVariant>();
  for (const r of group.members) {
    const placement: EntityPlacement = {
      id: r.key,
      definition: def.id,
      actor: r.key.startsWith('actor:'),
      source: r.source,
      position: r.position,
    };
    if (r.description !== def.description) placement.description = r.description;
    if (r.appearance) placement.appearance = r.appearance;
    entities.placements[r.key] = placement;
    for (const v of r.actions) {
      const actions = v.actions.map((a) => ({
        id: requiredValue(a.id, 'An inspected action has no ID.'),
        action: requiredValue(a.id, 'An inspected action has no ID.'),
        label: a.label.replace(r.name, '{name}').replace(/\(Level (\d+)\)/, '(Level {level})'),
        ...(a.disabled ? { disabled: true } : {}),
      }));
      const signature = JSON.stringify(actions);
      let menu = menuMap.get(signature);
      if (!menu) {
        menu = { id: def.id + '.menu-' + (menuMap.size + 1), states: [], placements: [], actions };
        menuMap.set(signature, menu);
        def.menus.push(menu);
      }
      menu.states = [...new Set([...menu.states, ...v.states])];
      menu.placements.push(r.key);
      for (const a of actions)
        if (!def.capabilities.includes(a.action)) def.capabilities.push(a.action);
      const level = /\(Level (\d+)\)/.exec(v.actions.map((a) => a.label).join(' '));
      if (level) placement.level = Number(level[1]);
    }
    for (const v of r.dialogues) {
      if (v.dialogue?.sharedPool) {
        const signature = 'shared';
        let variant = dialogueMap.get(signature);
        if (!variant) {
          variant = {
            id: def.id + '.dialogue-' + (dialogueMap.size + 1),
            states: [],
            placements: [],
            shared: true,
          };
          dialogueMap.set(signature, variant);
          def.dialogues.push(variant.id);
          dialogues.variants[variant.id] = variant;
        }
        variant.states = [...new Set([...variant.states, ...v.states])];
        variant.placements.push(r.key);
        continue;
      }
      const tree: Pick<DialogueVariant, 'root' | 'nodes' | 'sampleValues' | 'speech' | 'panel'> =
        v.dialogue ? graph(v.dialogue) : { speech: v.speech || '', panel: v.panel || null };
      const { sampleValues, ...shape } = tree;
      const signature = JSON.stringify(shape);
      let variant = dialogueMap.get(signature);
      if (!variant) {
        variant = {
          id: def.id + '.dialogue-' + (dialogueMap.size + 1),
          states: [],
          placements: [],
          ...tree,
        };
        dialogueMap.set(signature, variant);
        def.dialogues.push(variant.id);
        dialogues.variants[variant.id] = variant;
      }
      variant.states = [...new Set([...variant.states, ...v.states])];
      variant.placements.push(r.key);
      for (const n of Object.values(tree.nodes || {}))
        for (const c of n.choices)
          if (c.action && !def.capabilities.includes(c.action)) def.capabilities.push(c.action);
    }
  }
  for (const menu of def.menus) {
    menu.placements = [...new Set(menu.placements)];
    const c = when(menu.states, def);
    if (c) menu.when = c;
  }
  for (const id of def.dialogues) {
    const v = dialogues.variants[id];
    v.placements = [...new Set(v.placements)];
    const c = when(v.states, def);
    if (c) v.when = c;
  }
}
type ArchivedNode = Omit<SharedNode, 'id' | 'choices'> & {
  id?: string;
  choices?: (Omit<SharedChoice, 'id'> & { id?: string })[];
};
type ArchivedConversation = Omit<SharedConversation, 'nodes'> & {
  nodes: Record<string, ArchivedNode>;
};
const archive = await read<{ dialogues: ArchivedConversation[] }>('../dialogues/chains.json'),
  goose = await read<{ ambient: ArchivedConversation[] }>('../dialogues/goose-corp.json');
for (const chain of [...archive.dialogues, ...goose.ambient]) {
  const copy = structuredClone(chain),
    nodes: Record<string, SharedNode> = {};
  for (const [id, n] of Object.entries(copy.nodes))
    nodes[id] = {
      ...n,
      id,
      choices: n.choices?.map((c, i) => ({ ...c, id: c.id || id + '.choice-' + (i + 1) })),
    };
  dialogues.shared[chain.id] = { ...copy, nodes };
}
await writeFile(
  new URL('entities.json', import.meta.url),
  JSON.stringify(entities, null, 2) + '\n',
);
await writeFile(
  new URL('dialogues.json', import.meta.url),
  JSON.stringify(dialogues, null, 2) + '\n',
);
await writeFile(new URL('texts.json', import.meta.url), JSON.stringify(texts, null, 2) + '\n');
console.log(
  'Migrated',
  Object.keys(entities.definitions).length,
  'definitions,',
  Object.keys(entities.placements).length,
  'placements,',
  Object.keys(dialogues.variants).length,
  'dialogue variants,',
  Object.keys(dialogues.shared).length,
  'shared conversations.',
);
