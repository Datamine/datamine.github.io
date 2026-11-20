import { ITEM_STATS, EQUIPMENT_IDS } from './config/item-stats.js';
export { ITEM_STATS, EQUIPMENT_IDS };

/** Runtime inventory helpers; editable definitions live in config/item-stats.js. */
export function itemById(id) {
  return Object.hasOwn(ITEM_STATS, id) ? ITEM_STATS[id] : null;
}
export function equipmentOwned(purse, id) {
  return !!purse?.ownedEquipment?.includes(id);
}
export function selectedWeapon(
  preference = 'unarmed',
  { bayonet = false, railgun = false, battleaxe = false, akibo = false } = {},
) {
  const owned = { unarmed: true, bayonet, railgun, battleaxe, akibo };
  return owned[preference] ? preference : 'unarmed';
}
export function equipmentDefense(look = {}) {
  return (
    (look.iceTop ? ITEM_STATS['ice-top'].defense : 0) +
    (look.icePants ? ITEM_STATS['ice-pants'].defense : 0)
  );
}
export function ownedEquipmentDefense(purse, look = {}) {
  return equipmentDefense({
    iceTop: look.iceTop && equipmentOwned(purse, 'ice-top'),
    icePants: look.icePants && equipmentOwned(purse, 'ice-pants'),
  });
}
export function itemLoot(id, amount = 1) {
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

export const sandwichCapacity = (purse) => (equipmentOwned(purse, 'backpack') ? 20 : 5);
