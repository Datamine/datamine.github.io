import { HAT_CATALOG } from './config/hats.js';
export { HAT_CATALOG };
export const hatById = (id) => HAT_CATALOG.find((h) => h.id === id) || null;
export const ownedHat = (owned, id) => id === 'none' || (!!hatById(id) && owned.includes(id));
