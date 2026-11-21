import type { ContentBundle, PlayerDocument, TextSpec } from './types/content.ts';
import Ajv from 'ajv';
import entitiesSchema from './content/schemas/entities.schema.json' with { type: 'json' };
import dialoguesSchema from './content/schemas/dialogues.schema.json' with { type: 'json' };
import textsSchema from './content/schemas/texts.schema.json' with { type: 'json' };
import playerSchema from './content/schemas/player-state.schema.json' with { type: 'json' };

const ajv = new Ajv({ allErrors: true, jsonPointers: true, strictNumbers: true });
const validators = {
  entities: ajv.compile(entitiesSchema),
  dialogues: ajv.compile(dialoguesSchema),
  texts: ajv.compile(textsSchema),
  playerState: ajv.compile(playerSchema),
};
function assertSchema(kind: keyof typeof validators, value: unknown) {
  const validate = validators[kind];
  if (!validate(value))
    throw new Error(
      'Invalid ' +
        kind +
        ': ' +
        (validate.errors || [])
          .slice(0, 8)
          .map((e) => (e.dataPath || '/') + ' ' + e.message)
          .join('; '),
    );
}
function unique(items: readonly { id: string }[], label: string) {
  const keys = items.map((x) => x.id);
  if (keys.length !== new Set(keys).size) throw new Error('Duplicate stable ID in ' + label);
}
export function validatePlayerDocument(value: unknown): PlayerDocument {
  assertSchema('playerState', value);
  return value as PlayerDocument;
}

export function validateContent(value: unknown): ContentBundle {
  const bundle = value as ContentBundle;
  for (const kind of ['entities', 'dialogues', 'texts'] as const) assertSchema(kind, bundle[kind]);
  const { definitions, placements } = bundle.entities;
  const variants = bundle.dialogues.variants;
  function text(value: TextSpec | undefined) {
    if (typeof value === 'string') return;
    if (value && 'text' in value && value.text && !bundle.texts.texts[value.text])
      throw new Error('Unknown text ID: ' + value.text);
    if (value && 'select' in value) {
      value.select.forEach((v) => text(v.text));
      text(value.default);
    }
  }
  for (const [id, p] of Object.entries(placements))
    if (p.id !== id || !definitions[p.definition])
      throw new Error('Invalid entity placement: ' + id);
  for (const [id, def] of Object.entries(definitions)) {
    if (id !== def.id) throw new Error('Entity key must match its stable ID: ' + id);
    unique(def.menus, id + ' menus');
    text(def.description);
    for (const menu of def.menus) {
      unique(menu.actions, menu.id);
      for (const action of menu.actions) {
        if (!def.capabilities.includes(action.action))
          throw new Error('Unregistered action ' + action.action + ' in ' + id);
        text(action.label);
      }
      for (const p of menu.placements)
        if (placements[p]?.definition !== id)
          throw new Error('Menu placement belongs to another entity: ' + p);
    }
    for (const v of def.dialogues)
      if (!variants[v]) throw new Error('Unknown dialogue variant: ' + v);
  }
  for (const [id, variant] of Object.entries(variants)) {
    if (id !== variant.id) throw new Error('Dialogue variant key must match its ID: ' + id);
    for (const placement of variant.placements)
      if (
        !placements[placement] ||
        !definitions[placements[placement].definition].dialogues.includes(id)
      )
        throw new Error('Dialogue placement has no matching definition: ' + placement);
    if (!variant.nodes) continue;
    if (!variant.nodes[variant.root!]) throw new Error('Unknown dialogue root: ' + id);
    const checked = new Set<string>();
    function walk(nodeId: string, stack = new Set<string>()) {
      if (stack.has(nodeId)) throw new Error('Dialogue cycle in ' + id + ': ' + nodeId);
      if (checked.has(nodeId)) return;
      const node = variant.nodes![nodeId];
      if (!node) throw new Error('Broken dialogue link in ' + id + ': ' + nodeId);
      if (node.id !== nodeId) throw new Error('Dialogue node key must match its ID: ' + nodeId);
      unique(node.choices, nodeId);
      for (const field of ['intro', 'question', 'decline'] as const) text(node[field]);
      for (const choice of node.choices) {
        text(choice.label);
        if (choice.receipt) text(choice.receipt);
        for (const placement of variant.placements)
          if (
            choice.action &&
            !definitions[placements[placement].definition].capabilities.includes(choice.action)
          )
            throw new Error('Unregistered dialogue action: ' + choice.action);
        if (choice.next) walk(choice.next, new Set([...stack, nodeId]));
      }
      checked.add(nodeId);
    }
    walk(variant.root!);
  }
  for (const [id, chain] of Object.entries(bundle.dialogues.shared)) {
    if (id !== chain.id || !chain.nodes[chain.start])
      throw new Error('Invalid shared conversation: ' + id);
    function visit(nodeId: string, stack = new Set<string>()) {
      if (stack.has(nodeId)) throw new Error('Shared dialogue cycle: ' + id);
      const next = new Set([...stack, nodeId]);
      for (const choice of chain.nodes[nodeId]?.choices || []) visit(choice.next, next);
    }
    visit(chain.start);
    for (const node of Object.values(chain.nodes)) {
      unique(node.choices || [], id + '/' + node.id);
      for (const choice of node.choices || [])
        if (!chain.nodes[choice.next])
          throw new Error('Broken shared dialogue link: ' + choice.next);
    }
  }
  return bundle;
}
