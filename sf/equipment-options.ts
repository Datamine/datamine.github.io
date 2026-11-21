import { ITEM_STATS } from './item-stats.ts';
import { HAT_CATALOG } from './hat-catalog.ts';
/** Wardrobe choices expose owned finds, never an unavailable-item checklist. */
export function equipmentOptions(
  {
    ownedEquipment = [],
    ownedHats = [],
  }: { ownedEquipment?: string[]; ownedHats?: string[] } | undefined = {},
  progress: { bayonet?: boolean; railgun?: boolean; cape?: boolean } = {},
) {
  const owns = (id: string) => ownedEquipment.includes(id),
    option = (value: string, label: string) => ({ value, label });
  return {
    hat: [
      option('none', 'No hat'),
      ...HAT_CATALOG.filter((h) => ownedHats.includes(h.id)).map((h) => option(h.id, h.name)),
    ],
    weapon: [
      option('unarmed', 'Fist'),
      ...(['bayonet', 'battleaxe', 'railgun', 'akibo'] satisfies [string, string, string, string])
        .filter((id) =>
          id === 'bayonet' ? progress.bayonet : id === 'railgun' ? progress.railgun : owns(id),
        )
        .map((id) => option(id, ITEM_STATS[id].name)),
    ],
    back: [
      option('none', 'Nothing on back'),
      ...(['backpack', 'new-year-rocket'] satisfies [string, string])
        .filter(owns)
        .map((id) => option(id, ITEM_STATS[id].name)),
      ...(progress.cape ? [option('cape', 'Kraken cape')] : []),
    ],
    neck: [
      option('none', 'No necklace'),
      ...(owns('clock-amulet') ? [option('clock-amulet', ITEM_STATS['clock-amulet'].name)] : []),
    ],
    torso: [
      option('shirt', 'Regular shirt'),
      ...(['ice-top', 'black-cloak-top', 'tinfoil-suit'] satisfies [string, string, string])
        .filter(owns)
        .map((id) => option(id, ITEM_STATS[id].name)),
    ],
    legs: [
      option('trousers', 'Regular trousers'),
      ...(['ice-pants', 'black-cloak-bottom'] satisfies [string, string])
        .filter(owns)
        .map((id) => option(id, ITEM_STATS[id].name)),
    ],
    boots: [
      option('false', 'Regular shoes'),
      ...(owns('combat-boots') ? [option('true', 'Combat boots')] : []),
    ],
    iceTop: [
      option('false', 'Regular shirt'),
      ...(owns('ice-top') ? [option('true', ITEM_STATS['ice-top'].name)] : []),
    ],
    icePants: [
      option('false', 'Regular trousers'),
      ...(owns('ice-pants') ? [option('true', ITEM_STATS['ice-pants'].name)] : []),
    ],
  };
}
export function fillEquipmentSelect(
  field: HTMLSelectElement,
  options: readonly { value: string; label: string }[],
  value: string | boolean,
) {
  field.replaceChildren();
  for (const choice of options) {
    const option = document.createElement('option');
    option.value = choice.value;
    option.textContent = choice.label;
    field.append(option);
  }
  field.value = options.some((o) => o.value === String(value)) ? String(value) : options[0].value;
}
