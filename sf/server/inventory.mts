import { isSafeInteger, isRecord } from '../types/json.ts';
import type { PlayerProfile } from '../types/profile.ts';
import type { InventorySnapshot } from '../types/network.ts';

export interface InventoryGrant {
  lootKind: string;
  amount: number;
  itemId?: string;
  hatId?: string;
  transfer?: boolean;
}
import { createEconomy } from '../economy.ts';
import { hatById } from '../hat-catalog.ts';
import { discoverCollection } from './collection.mts';
import { EQUIPMENT_IDS, sandwichCapacity } from '../item-stats.ts';
import { tabletCounts } from '../teleport-tablets.ts';

const inventoryParse = (value: string | undefined): Record<string, unknown> => {
  try {
    const parsed: unknown = JSON.parse(value || '{}');
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
};
export const INVENTORY_KEYS = new Set(['sf-purse-v1', 'sf-deli-v1'] satisfies [string, string]);

/** Owner-private finances, with server revisions and a death epoch. Client
 * checkpoints never overwrite this ledger or resurrect a pre-death balance. */
export function createInventoryAccount(profile: PlayerProfile) {
  profile.privateState ??= {};
  const economy = createEconomy(inventoryParse(profile.privateState['sf-purse-v1'])),
    savedFood = inventoryParse(profile.privateState['sf-deli-v1']);
  const meta = (profile.inventory ??= {
    epoch: 0,
    revision: 0,
    sandwiches: isSafeInteger(savedFood.sandwiches) ? Math.max(0, savedFood.sandwiches) : 0,
    deliveryPending: savedFood.pending === true,
    peptides: 0,
    bisonHides: 0,
    akimboAmmo: 0,
    railgunCharge: 0,
    railgunBatteries: 0,
    coffee: 0,
    tablets: {},
  });
  if (!Number.isSafeInteger(meta.peptides) || meta.peptides < 0) meta.peptides = 0;
  if (!Number.isSafeInteger(meta.bisonHides) || meta.bisonHides < 0) meta.bisonHides = 0;
  for (const key of ['akimboAmmo', 'railgunCharge', 'railgunBatteries'] as const)
    meta[key] =
      Number.isSafeInteger(meta[key]) && meta[key] >= 0
        ? Math.min(meta[key], key === 'railgunCharge' ? 25 : 1000000)
        : 0;
  meta.coffee = meta.coffee === 1 ? 1 : 0;
  meta.tablets = tabletCounts(meta.tablets);
  function save(change = true) {
    discoverCollection(profile, economy.state, meta);
    if (change) meta.revision++;
    profile.privateState['sf-purse-v1'] = JSON.stringify(economy.state);
    profile.privateState['sf-deli-v1'] = JSON.stringify({
      sandwiches: meta.sandwiches,
      pending: meta.deliveryPending,
    });
  }
  function snapshot(): InventorySnapshot {
    return {
      epoch: meta.epoch,
      revision: meta.revision,
      purse: structuredClone(economy.state),
      sandwiches: meta.sandwiches,
      capacity: sandwichCapacity(economy.state),
      collection: [...profile.collection],
      decorativeRocket: {
        readyAt: profile.decorativeRocketReadyAt || 0,
        burningUntil: profile.decorativeRocketBurnUntil || 0,
        hopStartedAt: profile.decorativeRocketHopAt || 0,
      },
      deliveryPending: meta.deliveryPending,
      peptides: meta.peptides,
      bisonHides: meta.bisonHides,
      coffee: meta.coffee,
      akimboAmmo: meta.akimboAmmo,
      railgunCharge: meta.railgunCharge,
      railgunBatteries: meta.railgunBatteries,
      tablets: { ...meta.tablets },
    };
  }
  function canReceive(item: InventoryGrant) {
    if (
      item.lootKind === 'sandwich' &&
      meta.sandwiches + item.amount + (meta.deliveryPending ? 1 : 0) >
        sandwichCapacity(economy.state)
    )
      return {
        ok: false,
        message: 'Your sandwich bag is full (' + sandwichCapacity(economy.state) + ').',
      };
    if (
      item.lootKind === 'equipment' &&
      (!EQUIPMENT_IDS.includes(item.itemId || '') ||
        economy.state.ownedEquipment.includes(item.itemId || ''))
    )
      return { ok: false, message: 'You already own this equipment, or it is unavailable.' };
    if (
      item.lootKind === 'hat' &&
      (!hatById(item.hatId || '') || economy.state.ownedHats.includes(item.hatId || ''))
    )
      return { ok: false, message: 'You already own that hat.' };
    if (item.lootKind === 'iphone' && economy.state.iphoneOwned)
      return { ok: false, message: 'You already own an iPhone.' };
    if (item.lootKind === 'peptides' && !Number.isSafeInteger(meta.peptides + item.amount))
      return { ok: false, message: 'Your peptide case is full.' };
    if (item.lootKind === 'bison-hide' && !Number.isSafeInteger(meta.bisonHides + item.amount))
      return { ok: false, message: 'You cannot carry any more bison hides.' };
    if (item.lootKind === 'coins' && !Number.isSafeInteger(economy.state.coins + item.amount))
      return { ok: false, message: 'Your coin purse is full.' };
    return { ok: true };
  }
  function receive(item: InventoryGrant) {
    const result = canReceive(item);
    if (!result.ok) return result;
    if (item.lootKind === 'coins') {
      if (item.transfer) economy.state.coins += item.amount;
      else economy.credit(item.amount);
    } else if (item.lootKind === 'sandwich') meta.sandwiches += item.amount;
    else if (item.lootKind === 'iphone') {
      economy.state.iphoneOwned = true;
      economy.state.iphoneEquipped = false;
    } else if (item.lootKind === 'hat') economy.state.ownedHats.push(item.hatId!);
    else if (item.lootKind === 'peptides') meta.peptides += item.amount;
    else if (item.lootKind === 'bison-hide') meta.bisonHides += item.amount;
    else if (item.lootKind === 'equipment') economy.state.ownedEquipment.push(item.itemId!);
    else return { ok: true };
    save();
    return { ok: true, inventory: snapshot() };
  }
  function deathDrops() {
    const purse = economy.state,
      items = [];
    if (purse.coins)
      items.push({ lootKind: 'coins', amount: purse.coins, label: purse.coins + ' coins' });
    if (meta.sandwiches)
      items.push({
        lootKind: 'sandwich',
        amount: meta.sandwiches,
        label: meta.sandwiches + ' sandwich' + (meta.sandwiches === 1 ? '' : 'es'),
      });
    if (purse.iphoneOwned) items.push({ lootKind: 'iphone', amount: 1, label: 'iPhone' });
    purse.coins = 0;
    purse.iphoneOwned = false;
    purse.iphoneEquipped = false;
    purse.incomeQuarters = 0;
    meta.sandwiches = 0;
    meta.epoch++;
    save();
    return items;
  }
  save(false);
  return { economy, meta, snapshot, canReceive, receive, deathDrops, save };
}
