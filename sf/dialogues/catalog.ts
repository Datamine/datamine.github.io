import type { JSONValue, ServiceNode, LegacyServiceNode } from '../types/content.ts';
import { isRecord } from '../types/json.ts';
import services from './services.json' with { type: 'json' };
import goose from './goose-corp.json' with { type: 'json' };
import { CONTENT } from '../content-runtime.ts';

const legacyServices: Record<string, ServiceNode> = {
  ...services.conversations,
  ...goose.conversations,
};
function compatibilityTemplate(value: unknown): JSONValue | undefined {
  if (Array.isArray(value)) return value.map((entry) => compatibilityTemplate(entry) ?? null);
  if (!isRecord(value)) return value as JSONValue;
  if (typeof value.text === 'string' && Object.keys(value).length === 1)
    return CONTENT.texts.texts[value.text]?.template || '';
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key]) =>
          key !== 'id' || !(typeof value.id === 'string' && value.id.startsWith('service.')),
      )
      .map(([key, v]) => [key, compatibilityTemplate(v) ?? null]),
  );
}
export const NPC_DIALOGUES = new Proxy<Record<string, LegacyServiceNode>>(
  {},
  {
    ownKeys: () =>
      Object.keys(
        Object.keys(CONTENT.dialogues.services).length
          ? CONTENT.dialogues.services
          : legacyServices,
      ),
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
    get: (_, key: string) =>
      compatibilityTemplate(CONTENT.dialogues.services[key] || legacyServices[key]),
  },
);
export const PARROT_GREETINGS = services.parrot_greetings;
export const DIALOGUE_TEXT = services.text;
export const LORE_BOOKS = Object.freeze(goose.books);
export const HOME_LORE_BOOKS = Object.freeze(goose.home_books);

// Named roles retain their authored topics; ordinary pedestrians use the ambient pool.
export const CASUAL_DIALOGUE_IDS = new Set<string>();
