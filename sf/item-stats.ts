import type { Appearance, ExpeditionProgress, EconomyState } from './types/content.ts';
import { isOneOf } from './types/json.ts';
import { ITEM_STATS, EQUIPMENT_IDS } from './config/item-stats.ts';

export { ITEM_STATS, EQUIPMENT_IDS };

/** Runtime inventory helpers; editable definitions live in config/item-stats.js. */
export function itemById(id: PropertyKey) {
  return Object.hasOwn(ITEM_STATS, id) ? ITEM_STATS[String(id)] : null;
}
export function equipmentOwned(purse: { ownedEquipment: string | string[] }, id: string) {
  return !!purse?.ownedEquipment?.includes(id);
}
export function selectedWeapon(
  preference: string = 'unarmed',
  { bayonet = false, railgun = false, battleaxe = false, akibo = false } = {},
) {
  const owned = { unarmed: true, bayonet, railgun, battleaxe, akibo };
  return isOneOf(['unarmed', 'bayonet', 'railgun', 'battleaxe', 'akibo'] as const, preference) &&
    owned[preference]
    ? preference
    : 'unarmed';
}
export function equipmentDefense(look: Appearance = {}) {
  return (
    (look.boots ? ITEM_STATS['combat-boots'].defense : 0) +
    (look.iceTop ? ITEM_STATS['ice-top'].defense : 0) +
    (look.icePants ? ITEM_STATS['ice-pants'].defense : 0)
  );
}
export function ownedEquipmentDefense(
  purse: Pick<EconomyState, 'ownedEquipment'>,
  look: Appearance = {},
) {
  return equipmentDefense({
    boots: look.boots && equipmentOwned(purse, 'combat-boots'),
    iceTop: look.iceTop && equipmentOwned(purse, 'ice-top'),
    icePants: look.icePants && equipmentOwned(purse, 'ice-pants'),
  });
}
export function itemLoot(id: string, amount = 1) {
  const item = itemById(id);
  return {
    lootKind: item?.slot === 'hat' ? 'hat' : EQUIPMENT_IDS.includes(id) ? 'equipment' : id,
    ...(EQUIPMENT_IDS.includes(id) ? { itemId: id } : {}),
    ...(item?.slot === 'hat' ? { hatId: item.hatId } : {}),
    amount,
    label: id === 'coins' ? amount + ' coins' : item?.name || id,
    description: item?.description || 'A well-made piece of equipment.',
  };
}

export const sandwichCapacity = (purse: Pick<EconomyState, 'ownedEquipment'>) =>
  equipmentOwned(purse, 'backpack') ? 20 : 5;

/** The recovery quest issues a railgun only after its first explicit step. */
export function railgunUnlocked(progress: Partial<ExpeditionProgress> = {}) {
  return (
    progress.railgun === true &&
    (['escaped', 'carrying', 'completed'] satisfies [string, string, string]).includes(
      progress.raptor || '',
    )
  );
}

export function weaponAttackInterval(weapon: string, purse: { ownedEquipment: string | string[] }) {
  return (
    (ITEM_STATS[weapon]?.interval ?? ITEM_STATS.unarmed.interval) /
    (weapon === 'railgun' && equipmentOwned(purse, 'railgun-upgrade') ? 1.1 : 1)
  );
}
