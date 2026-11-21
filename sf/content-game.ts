import { CONTENT, renderContentText } from './content-runtime.ts';
import { conditionMatches, selectContentVariant, stateValue } from './content-conditions.ts';
import { dialogueChoices } from './dialogue-choices.ts';
import { playerDocumentFromContext } from './player-document.ts';
import type { EditableEntity, RuntimeDialogue, RuntimeChoice } from './types/world.ts';
import type { PlayerContentContext } from './player-document.ts';
import type { TextSpec, TextValues } from './types/content.ts';

export function contentPlacement(key: string | undefined) {
  return key ? CONTENT.entities.placements[key] || null : null;
}
export function contentDefinition(key: string | undefined) {
  const p = contentPlacement(key);
  return p ? CONTENT.entities.definitions[p.definition] : null;
}

export function resolveContentText(
  spec: TextSpec | undefined,
  { state = {}, values = {} }: { state?: unknown; values?: TextValues } = {},
) {
  if (typeof spec === 'string') return renderContentText(spec, values);
  if (!spec) return '';
  if ('select' in spec) {
    const selected = spec.select.find((v) => conditionMatches(v.when, state));
    return resolveContentText(selected?.text ?? spec.default, { state, values });
  }
  if (!('text' in spec)) return '';
  const text = CONTENT.texts.texts[spec.text];
  if (!text) throw new Error('Unknown authored text: ' + spec.text);
  const bound = { ...values };
  for (const [key, binding] of Object.entries(text.bindings || {})) {
    if (binding.path) {
      const value = stateValue(state, binding.path) ?? binding.default ?? '';
      bound[key] =
        typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
          ? value
          : String(value);
    } else if (Object.hasOwn(binding, 'value')) bound[key] = binding.value;
  }
  return renderContentText(text.template, bound);
}

export function applyContentEntity<T extends EditableEntity | null | undefined>(
  entity: T,
  key: string,
) {
  if (!entity) return entity;
  if (entity.police && entity.id) key = 'actor:police';
  const placement = contentPlacement(key),
    definition = contentDefinition(key);
  if (!placement || !definition) return entity;
  entity.editorKey = key;
  entity.contentDefinitionId = definition.id;
  entity.label = definition.name;
  if (entity.name !== undefined) entity.name = definition.name;
  if (entity.serviceTitle !== undefined) entity.serviceTitle = definition.name;
  entity.editorCategory = definition.category;
  entity.editorDescription = true;
  Object.defineProperty(entity, 'description', {
    value: resolveContentText(placement.description ?? definition.description),
    enumerable: true,
    writable: true,
    configurable: true,
  });
  if (placement.appearance)
    for (const key of ['skin', 'shirt', 'hair', 'pants', 'hat', 'coat', 'cap'] as const)
      if (placement.appearance[key] !== undefined)
        Object.assign(entity, { [key]: placement.appearance[key] });
  return entity;
}

export function menuFromContent<B extends object>(
  entity: string | EditableEntity | null | undefined,
  bindings: ReadonlyMap<string | undefined, B>,
  context: PlayerContentContext,
) {
  const key = typeof entity === 'string' ? entity : entity?.editorKey;
  const def = contentDefinition(key);
  if (!def || !key) return null;
  const placement = contentPlacement(key);
  const state = playerDocumentFromContext(context, typeof entity === 'string' ? null : entity);
  state.capabilities = [...bindings.keys()].filter((key): key is string => typeof key === 'string');
  const candidates = def.menus.filter(
    (m) => m.placements.includes(key) && conditionMatches(m.when, state),
  );
  const selected = selectContentVariant(candidates, state);
  const ordered = [...(selected?.actions || []), ...candidates.flatMap((m) => m.actions)];
  const result = [],
    seen = new Set<string>();
  for (const action of ordered) {
    if (
      seen.has(action.action) ||
      !bindings.has(action.action) ||
      !conditionMatches(action.when, state)
    )
      continue;
    seen.add(action.action);
    result.push({
      ...action,
      label: resolveContentText(action.label, {
        state,
        values: {
          name: def.name,
          level: (typeof entity === 'string' ? undefined : entity?.level) || placement?.level || 1,
        },
      }),
      binding: bindings.get(action.action)!,
    });
  }
  return result;
}

function rawBindings(person: RuntimeDialogue) {
  const actions = new Map<string, NonNullable<RuntimeChoice['accept']>>(),
    nodes = new Map<string, RuntimeDialogue>(),
    choices = new Map<string, RuntimeChoice>();
  function walk(node: RuntimeDialogue | undefined) {
    if (!node) return;
    if (node.contentNodeId) nodes.set(node.contentNodeId, node);
    for (const choice of dialogueChoices(node)) {
      const id = choice.contentNodeId || choice.id || choice.actionId;
      if (id) choices.set(id, choice);
      if (choice.actionId) choices.set(choice.actionId, choice);
      if (typeof choice.accept === 'function' && choice.actionId)
        actions.set(choice.actionId, choice.accept);
      if (!choice.ambientConversation) walk(choice.next);
    }
  }
  walk(person);
  return { actions, nodes, choices };
}

export function compileSharedConversation<T extends RuntimeDialogue>(
  id: string,
  person: T,
  state: unknown = {},
): (T & RuntimeDialogue) | null {
  const chain = CONTENT.dialogues.shared[id];
  if (!chain) return null;
  function node(key: string): RuntimeDialogue {
    const source = chain.nodes[key];
    return {
      contentNodeId: chain.id + '/' + key,
      intro: source.text,
      repeat: false,
      choices: (source.choices || [])
        .filter(
          (c) =>
            conditionMatches(c.when, state) &&
            !/^(?:i should get going[.!]?|leave[.!]?|goodbye[.!]?)$/i.test(c.text.trim()),
        )
        .map((c) => {
          const target = chain.nodes[c.next];
          return {
            id: c.id,
            contentNodeId: c.id,
            label: c.text,
            repeat: false,
            ...(target.end ? { receipt: target.text } : { next: node(c.next) }),
          };
        }),
    };
  }
  return {
    ...person,
    ...node(chain.start),
    ambientConversation: true,
    conversationId: id,
    decline: 'Leave',
    contentResolved: true,
  };
}

export function compileEntityDialogue<T extends RuntimeDialogue>(
  person: T,
  key: string,
  context: PlayerContentContext = {},
): T & RuntimeDialogue {
  if (person.conversationId && CONTENT.dialogues.shared[person.conversationId])
    return compileSharedConversation(
      person.conversationId,
      person,
      playerDocumentFromContext(context, person),
    )!;
  if (person.contentResolved) return person;
  const definition = contentDefinition(key);
  if (!definition) return person;
  const def = definition;
  const state = playerDocumentFromContext(context, person);
  const raw = rawBindings(person);
  state.capabilities = [...raw.actions.keys()];
  const variants = def.dialogues
    .map((id) => CONTENT.dialogues.variants[id])
    .filter((v) => v.placements.includes(key));
  const selectedVariant = selectContentVariant(variants, state);
  if (!selectedVariant)
    return {
      ...person,
      intro: '',
      choices: [],
      choice: null,
      accept: null,
      trade: null,
      receipt: null,
      contentResolved: true,
    };
  const variant = selectedVariant;
  if (variant.shared) {
    const ids = Object.keys(CONTENT.dialogues.shared);
    return compileSharedConversation(
      person.conversationId && CONTENT.dialogues.shared[person.conversationId]
        ? person.conversationId
        : ids[Math.floor(Math.random() * ids.length)],
      { ...person, name: def.name },
      state,
    )!;
  }
  if (!variant.nodes || !variant.root) return person;
  const authoredNodes = variant.nodes;
  function field(
    spec: TextSpec | undefined,
    source: RuntimeDialogue | RuntimeChoice | undefined,
    name: 'intro' | 'question' | 'decline' | 'label' | 'receipt',
    id: string,
  ) {
    const value = source?.[(name + 'TextValues') as 'introTextValues'];
    const bound = typeof value === 'function' ? value() : value;
    const samples = variant.sampleValues?.[id + ':' + name] || {};
    return resolveContentText(spec, { state, values: { ...samples, ...bound, name: def.name } });
  }
  function node(id: string): RuntimeDialogue {
    const source = authoredNodes[id],
      runtime = raw.nodes.get(id);
    const result: RuntimeDialogue = {
      ...runtime,
      contentNodeId: id,
      repeat: source.repeat,
      skipIntro: source.skipIntro,
    };
    for (const name of ['intro', 'question', 'decline'] as const) {
      result[name] = field(source[name], runtime, name, id);
      const spec = source[name];
      if (spec && typeof spec === 'object' && 'text' in spec) {
        result[(name + 'TextId') as 'introTextId'] = spec.text;
        result[(name + 'TextValues') as 'introTextValues'] =
          runtime?.[(name + 'TextValues') as 'introTextValues'] ||
          variant.sampleValues?.[id + ':' + name] ||
          {};
      } else {
        delete result[(name + 'TextId') as 'introTextId'];
        delete result[(name + 'TextValues') as 'introTextValues'];
      }
    }
    delete result.choice;
    delete result.accept;
    delete result.trade;
    delete result.receipt;
    result.choices = source.choices
      .filter(
        (choice) =>
          conditionMatches(choice.when, state) &&
          (!choice.action || choice.trade || raw.actions.has(choice.action) || choice.shared),
      )
      .map((choice) => {
        const binding = raw.choices.get(choice.action || '') || raw.choices.get(choice.id);
        const compiled: RuntimeChoice = {
          ...binding,
          id: choice.id,
          contentNodeId: choice.id,
          actionId: choice.action,
          label: field(choice.label, binding, 'label', choice.id),
        };
        delete compiled.next;
        delete compiled.accept;
        if (choice.action && raw.actions.has(choice.action))
          compiled.accept = raw.actions.get(choice.action);
        if (choice.trade) compiled.trade = choice.trade;
        if (choice.receipt !== undefined)
          compiled.receipt = field(choice.receipt, binding, 'receipt', choice.id);
        if (choice.serverReceipt) compiled.serverReceipt = true;
        if (choice.next) compiled.next = node(choice.next);
        if (choice.shared) {
          compiled.ambientConversation = true;
          const ids = Object.keys(CONTENT.dialogues.shared);
          compiled.next = compileSharedConversation(
            ids[Math.floor(Math.random() * ids.length)],
            person,
            state,
          )!;
        }
        return compiled;
      });
    return result;
  }
  return {
    ...person,
    ...node(variant.root),
    editorKey: key,
    name: def.name,
    contentResolved: true,
  };
}
