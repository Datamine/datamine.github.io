// CONTENT-BINDINGS-MIGRATED
import { CONTENT, contentText } from './content-runtime.ts';
import { NPC_DIALOGUES, CASUAL_DIALOGUE_IDS } from './dialogues/catalog.ts';
import { createAmbientDialogue, withAmbientConversation } from './dialogues/ambient.ts';
import { TRADE_PRICES } from './config/economy.ts';
import { ITEM_STATS } from './item-stats.ts';
import type { RuntimeDialogue, RuntimeChoice, ActionReceipt } from './types/world.ts';
import type { ServiceNode, TextValues, TextSpec, JSONValue } from './types/content.ts';
import { resolveContentText } from './content-game.ts';

const dialogueDefaults = {
  equityPrice: TRADE_PRICES.equity,
  secondaryPrice: TRADE_PRICES.secondary,
  grainPrice: TRADE_PRICES.grain,
  fishPrice: TRADE_PRICES.fish,
  sandPrice: TRADE_PRICES.sand,
  passengerPrice: TRADE_PRICES.passenger,
  rocketPrice: 1,
  skiPrice: 1,
  tabletPrice: ITEM_STATS['tahoe-tablet'].price,
  sandwichPrice: ITEM_STATS.sandwich.pickupPrice,
  deliveryPrice: ITEM_STATS.sandwich.deliveryPrice,
  healing: ITEM_STATS.sandwich.healing,
  burgerPrice: ITEM_STATS.sandwich.inNOutPrice,
  softwarePrice: TRADE_PRICES.salesSoftware,
  softwareResalePrice: TRADE_PRICES.salesSoftwareResale,
  phonePrice: TRADE_PRICES.iphone,
  robotaxiPrice: TRADE_PRICES.robotaxi,
};

export function renderDialogueText(text: string, values: TextValues = {}, id = 'catalog') {
  const context: TextValues = { ...dialogueDefaults, ...values };
  return text.replace(/\{(\w+)\}/g, (_, key) => {
    if (!(key in context)) throw new Error('Missing dialogue value ' + key + ' in ' + id);
    return String(typeof context[key] === 'function' ? context[key]() : context[key]);
  });
}

/** Resolve data-only dialogue templates and bind named actions. Callbacks stay
 * in the domain module; the config never owns coins, quests or network calls. */
type DialogueAction = (...args: never[]) => ActionReceipt | Promise<ActionReceipt> | void;
export function configuredDialogue<T extends RuntimeDialogue>(
  id: string,
  npc: T = {} as T,
  actions: Record<string, DialogueAction> = {},
  values: TextValues = {},
) {
  if (CASUAL_DIALOGUE_IDS.has(id)) return createAmbientDialogue(npc);
  const template = CONTENT.dialogues.services[id] || NPC_DIALOGUES[id];
  if (!template) throw new Error('Unknown NPC dialogue: ' + id);
  const context: TextValues = { ...dialogueDefaults, ...values };
  function text(value: TextSpec) {
    return typeof value === 'string'
      ? renderDialogueText(value, context, id)
      : resolveContentText(value, { values: context });
  }
  function argument(value: JSONValue): JSONValue {
    if (typeof value === 'string') return renderDialogueText(value, context, id);
    if (Array.isArray(value)) return value.map(argument);
    if (value && typeof value === 'object') {
      if (typeof value.text === 'string' && Object.keys(value).length === 1)
        return contentText(value.text, context);
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, argument(entry)]),
      );
    }
    return value;
  }
  function resolve(value: ServiceNode, path = 'root'): RuntimeDialogue {
    const node: RuntimeDialogue = {};
    for (const field of ['intro', 'question', 'choice', 'label', 'receipt', 'decline'] as const) {
      const spec = value[field];
      if (spec === undefined) continue;
      node[field] = text(spec);
      if (typeof spec === 'object' && 'text' in spec) {
        node[`${field}TextId`] = spec.text;
        node[`${field}TextValues`] = context;
      }
    }
    if (value.id && !value.id.startsWith('service.')) node.id = value.id;
    node.contentNodeId = value.id || 'service.' + id + '.' + path;
    for (const field of ['trade', 'repeat', 'skipIntro'] as const)
      if (value[field] !== undefined) Object.assign(node, { [field]: value[field] });
    if (value.choices)
      node.choices = value.choices.map(
        (choice, index) =>
          ({
            ...resolve(choice, path + '.choices.' + index),
            label: text(choice.label || ''),
          }) as RuntimeChoice,
      );
    if (value.next) Object.assign(node, { next: resolve(value.next, path + '.next') });
    if (value.action) {
      const action = actions[value.action];
      if (typeof action !== 'function')
        throw new Error('Missing dialogue action ' + value.action + ' in ' + id);
      // JSON action arguments bind to domain callbacks by their authored action name.
      node.accept = () => action(...((value.args || []).map(argument) as never[]));
      node.actionId = 'service.' + id + '.' + value.action + ':' + JSON.stringify(value.args || []);
    }
    return node;
  }
  // A merchant's old intro/trade must never leak into a configured branch.
  const person = { ...npc };
  for (const key of [
    'intro',
    'question',
    'choices',
    'choice',
    'accept',
    'trade',
    'receipt',
    'repeat',
    'decline',
  ] as const)
    delete person[key];
  return withAmbientConversation({
    ...person,
    decline: contentText('dialogue-config.configuredDialogue.decline-1', {}),
    ...resolve(template),
  });
}
