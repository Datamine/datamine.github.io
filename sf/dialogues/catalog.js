import services from './services.json' with { type: 'json' };
import goose from './goose-corp.json' with { type: 'json' };

export const NPC_DIALOGUES = { ...services.conversations, ...goose.conversations };
export const PARROT_GREETINGS = services.parrot_greetings;
export const DIALOGUE_TEXT = services.text;
export const LORE_BOOKS = Object.freeze(goose.books);
export const HOME_LORE_BOOKS = Object.freeze(goose.home_books);

// These roles have no transaction or quest to preserve: use the ambient pool.
export const CASUAL_DIALOGUE_IDS = new Set([
  'dog-walker',
  'rail-worker',
  'square-foreman',
  'square-visitor',
  'ada-meridian',
  'mira-softmax',
  'soren-still',
  'elias-index',
  'noor-qualia',
  'rowan-zero',
]);
