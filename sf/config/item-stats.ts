export interface ItemDefinition {
  name: string;
  slot?: string;
  description?: string;
  defense?: number;
  range?: number;
  interval?: number;
  min?: number;
  max?: number;
  minPerLevel?: number;
  maxPerLevel?: number;
  accuracy?: number;
  accuracyPerLevel?: number;
  accuracyCap?: number;
  price?: number;
  color?: string;
  trim?: string;
  healing?: number;
  pickupPrice?: number;
  deliveryPrice?: number;
  inNOutPrice?: number;
  pickup?: string;
  pickupMessage?: string;
  hatId?: string;
  coins?: number;
}
function defineItems<T extends Record<string, ItemDefinition>>(
  items: T,
): Readonly<{ [K in keyof T]: T[K] & Partial<ItemDefinition> }> &
  Readonly<Record<string, ItemDefinition>> {
  return Object.freeze(items);
}
// CONTENT-BINDINGS-MIGRATED
import { contentText } from '../content-runtime.ts';
/** Edit item balance, prices, equipment colors and descriptions here. */
export const ITEM_STATS = defineItems({
  'tinfoil-suit': {
    name: contentText('config.item-stats.module.name-1', {}),
    slot: 'top',
    description: contentText('config.item-stats.module.description-2', {}),
  },
  'railgun-upgrade': {
    name: contentText('config.item-stats.module.name-3', {}),
    description: contentText('config.item-stats.module.description-4', {}),
  },
  'combat-boots': {
    name: contentText('config.item-stats.module.name-5', {}),
    slot: 'feet',
    defense: 2,
    description: contentText('config.item-stats.module.description-6', {}),
  },
  'ball-chair': {
    name: contentText('config.item-stats.module.name-7', {}),
    description: contentText('config.item-stats.module.description-8', {}),
  },
  unarmed: {
    name: contentText('config.item-stats.module.name-9', {}),
    slot: 'weapon',
    range: 1.35,
    interval: 1.05,
    min: 1,
    max: 2,
    minPerLevel: 0,
    maxPerLevel: 0.8,
    accuracy: 0.65,
    accuracyPerLevel: 0.02,
    accuracyCap: 0.9,
  },
  bayonet: {
    name: contentText('config.item-stats.module.name-10', {}),
    slot: 'weapon',
    range: 1.35,
    interval: 1.05,
    min: 4,
    max: 11,
    minPerLevel: 0.4,
    maxPerLevel: 1,
    accuracy: 0.92,
    accuracyPerLevel: 0.006,
    accuracyCap: 0.98,
  },
  battleaxe: {
    name: contentText('config.item-stats.module.name-11', {}),
    slot: 'weapon',
    price: 50,
    range: 1.5,
    interval: 1.05,
    min: 6,
    max: 11.5,
    minPerLevel: 0.35,
    maxPerLevel: 0.85,
    accuracy: 0.935,
    accuracyPerLevel: 0.005,
    accuracyCap: 0.985,
  },
  railgun: {
    name: contentText('config.item-stats.module.name-12', {}),
    slot: 'weapon',
    range: 5,
    interval: 0.8,
    min: 8,
    max: 12,
    minPerLevel: 0.3,
    maxPerLevel: 0.7,
    accuracy: 0.95,
    accuracyPerLevel: 0.004,
    accuracyCap: 0.99,
  },
  akibo: {
    name: contentText('config.item-stats.module.name-13', {}),
    slot: 'weapon',
    range: 7,
    interval: 0.8,
    min: 8,
    max: 12,
    minPerLevel: 0.3,
    maxPerLevel: 0.7,
    accuracy: 0.95,
    accuracyPerLevel: 0.004,
    accuracyCap: 0.99,
  },
  'new-year-rocket': {
    name: contentText('config.item-stats.module.name-14', {}),
    slot: 'back',
    description: contentText('config.item-stats.module.description-15', {}),
  },
  'clock-amulet': {
    name: contentText('config.item-stats.module.name-16', {}),
    slot: 'neck',
    description: contentText('config.item-stats.module.description-17', {}),
  },
  backpack: {
    name: contentText('config.item-stats.module.name-18', {}),
    slot: 'back',
    price: 100,
    description: contentText('config.item-stats.module.description-19', {}),
  },
  'bison-hide': {
    name: contentText('config.item-stats.module.name-20', {}),
    description: contentText('config.item-stats.module.description-21', {}),
  },
  'black-cloak-top': {
    name: contentText('config.item-stats.module.name-22', {}),
    slot: 'top',
    description: contentText('config.item-stats.module.description-23', {}),
  },
  'black-cloak-bottom': {
    name: contentText('config.item-stats.module.name-24', {}),
    slot: 'legs',
    description: contentText('config.item-stats.module.description-25', {}),
  },
  'downtown-tablet': {
    name: contentText('config.item-stats.module.name-26', {}),
    price: 20,
    description: contentText('config.item-stats.module.description-27', {}),
  },
  'tahoe-tablet': {
    name: contentText('config.item-stats.module.name-28', {}),
    price: 20,
    description: contentText('config.item-stats.module.description-29', {}),
  },
  'ice-top': {
    name: contentText('config.item-stats.module.name-30', {}),
    slot: 'top',
    defense: 2,
    color: '#92d9ed',
    trim: '#e1faff',
    description: contentText('config.item-stats.module.description-31', {}),
  },
  'ice-pants': {
    name: contentText('config.item-stats.module.name-32', {}),
    slot: 'legs',
    defense: 2,
    color: '#78bde5',
    trim: '#d1f4ff',
    description: contentText('config.item-stats.module.description-33', {}),
  },
  sandwich: {
    name: contentText('config.item-stats.module.name-34', {}),
    healing: 15,
    pickupPrice: 3,
    deliveryPrice: 4,
    inNOutPrice: 2,
    description: contentText('config.item-stats.module.description-35', {}),
  },
  peptides: {
    name: contentText('config.item-stats.module.name-36', {}),
    description: contentText('config.item-stats.module.description-37', {}),
  },
  coins: {
    name: contentText('config.item-stats.module.name-38', {}),
    description: contentText('config.item-stats.module.description-39', {}),
  },
  'goose-membership-card': {
    name: contentText('config.item-stats.module.name-40', {}),
    description: contentText('config.item-stats.module.description-41', {}),
    pickup: 'disintegrate',
    pickupMessage: 'The Goose Corp membership card disintegrates in your hands.',
  },
  'stetson-hat': {
    name: contentText('config.item-stats.module.name-42', {}),
    slot: 'hat',
    hatId: 'stetson',
    description: contentText('config.item-stats.module.description-43', {}),
  },
  'pirate-hat': {
    name: contentText('config.item-stats.module.name-44', {}),
    slot: 'hat',
    hatId: 'pirate',
    description: contentText('config.item-stats.module.description-45', {}),
  },
  raptor: {
    name: contentText('config.item-stats.module.name-46', {}),
    description: contentText('config.item-stats.module.description-47', {}),
  },
  kraken: {
    name: contentText('config.item-stats.module.name-48', {}),
    coins: 100,
    description: contentText('config.item-stats.module.description-49', {}),
  },
});
export const EQUIPMENT_IDS = Object.freeze([
  'tinfoil-suit',
  'railgun-upgrade',
  'combat-boots',
  'ball-chair',
  'battleaxe',
  'ice-top',
  'ice-pants',
  'akibo',
  'backpack',
  'new-year-rocket',
  'clock-amulet',
  'black-cloak-top',
  'black-cloak-bottom',
] satisfies [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
]);
