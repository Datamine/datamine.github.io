import { COLLECTION_ITEMS } from '../config/collection.js';
const collectionIDs = new Set(COLLECTION_ITEMS.map((item) => item.id));
const parse = (value) => {
  try {
    return JSON.parse(value || '{}') || {};
  } catch {
    return {};
  }
};
export function discoverCollection(profile, purse, meta) {
  const found = new Set((profile.collection || []).filter((id) => collectionIDs.has(id))),
    add = (id, owned) => {
      if (owned && collectionIDs.has(id)) found.add(id);
    };
  add('unarmed', true);
  for (const id of purse.ownedHats) add('hat:' + id, true);
  for (const id of purse.ownedEquipment) add(id, true);
  for (const [id, owned] of Object.entries({
    coins: purse.coins,
    sandwich: meta.sandwiches,
    peptides: meta.peptides,
    'bison-hide': meta.bisonHides,
    coffee: meta.coffee,
    iphone: purse.iphoneOwned,
    grain: purse.grain,
    fish: purse.fish,
    sand: purse.sand,
    bouquet: purse.bouquets,
    letter: purse.saltLetters,
    software: purse.softwareCopies,
    equity: purse.equity,
    growth: profile.growth?.cost,
    'grappling-hook': profile.grapplingHook,
    'fuel-can': purse.fuelCans,
  }))
    add(id, owned);
  for (const [id, count] of Object.entries(meta.tablets || {})) add(id + '-tablet', count);
  const state = profile.privateState,
    quest = parse(state['sf-quests-v1']),
    live = quest.theyLive || {},
    expedition = parse(state['sf-expeditions-v1']);
  add('sunglasses', parse(state['sf-sunglasses-v1']).owned);
  add('monkey', quest.monkey === 'carrying' || quest.monkey === 'completed');
  add('certificate', live.certificate || live.evidence);
  add('permit', live.permit);
  add('bayonet', live.bayonet);
  add('skateboard', live.completed);
  add('railgun', expedition.railgun);
  add('raptor', expedition.raptor === 'carrying' || expedition.raptor === 'completed');
  add('cape', expedition.cape);
  add('kraken', expedition.krakenDefeated);
  profile.collection = [...found];
  return profile.collection;
}
