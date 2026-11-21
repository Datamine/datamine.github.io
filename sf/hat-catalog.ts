import { HAT_CATALOG } from './config/hats.ts';
export { HAT_CATALOG };
export const hatById = (id: string | undefined) => HAT_CATALOG.find((h) => h.id === id) || null;
export const ownedHat = (owned: string | string[], id: string) =>
  id === 'none' || (!!hatById(id) && owned.includes(id));
