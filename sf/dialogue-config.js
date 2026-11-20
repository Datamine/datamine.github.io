import { NPC_DIALOGUES, CASUAL_DIALOGUE_IDS } from './dialogues/catalog.js';
import { createAmbientDialogue, withAmbientConversation } from './dialogues/ambient.js';
import { TRADE_PRICES } from './config/economy.js';
import { ITEM_STATS } from './item-stats.js';

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

export function renderDialogueText(text, values = {}, id = 'catalog') {
  const context = { ...dialogueDefaults, ...values };
  return text.replace(/\{(\w+)\}/g, (_, key) => {
    if (!(key in context)) throw new Error('Missing dialogue value ' + key + ' in ' + id);
    return String(typeof context[key] === 'function' ? context[key]() : context[key]);
  });
}

/** Resolve data-only dialogue templates and bind named actions. Callbacks stay
 * in the domain module; the config never owns coins, quests or network calls. */
export function configuredDialogue(id, npc = {}, actions = {}, values = {}) {
  if (CASUAL_DIALOGUE_IDS.has(id)) return createAmbientDialogue(npc);
  const template = NPC_DIALOGUES[id];
  if (!template) throw new Error('Unknown NPC dialogue: ' + id);
  const context = { ...dialogueDefaults, ...values };
  function resolve(value) {
    if (typeof value === 'string') return renderDialogueText(value, context, id);
    if (Array.isArray(value)) return value.map(resolve);
    if (!value || typeof value !== 'object') return value;
    const node = Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !['action', 'args'].includes(key))
        .map(([key, v]) => [key, resolve(v)]),
    );
    if (value.action) {
      const action = actions[value.action];
      if (typeof action !== 'function')
        throw new Error('Missing dialogue action ' + value.action + ' in ' + id);
      node.accept = () => action(...resolve(value.args || []));
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
  ])
    delete person[key];
  return withAmbientConversation({ ...person, decline: 'Leave', ...resolve(template) });
}
