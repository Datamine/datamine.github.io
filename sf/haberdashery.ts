import type { Economy } from './types/controllers.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { configuredDialogue } from './dialogue-config.ts';
import { HAT_CATALOG } from './hat-catalog.ts';
import type { Actor } from './types/world.ts';

export function haberdasherDialogue(
  npc: Partial<Actor> | undefined,
  economy: Economy,
  wear: (hatId: string) => unknown,
) {
  return {
    ...configuredDialogue('haberdasher', npc),
    choices: HAT_CATALOG.filter((h) => !h.dropOnly).map((h) => ({
      label: contentText('haberdashery.haberdasherDialogue.label-3', {
        v0: h.name,
        v1: economy.state.ownedHats.includes(h.id)
          ? 'Wear owned hat'
          : h.price.toLocaleString('en-US') + (h.price === 1 ? ' coin' : ' coins'),
      }),
      accept: () => {
        const owned = economy.state.ownedHats.includes(h.id),
          result = owned ? { ok: true } : economy.buyHat(h.id);
        if (result.promise)
          return {
            ...result,
            promise: result.promise.then((r) => {
              if (r.ok) wear(h.id);
              return r;
            }),
          };
        if (!result.ok) return result;
        wear(h.id);
        return {
          ok: true,
          message:
            (owned ? 'You put on your ' : 'You purchase and put on your ') +
            h.name +
            '. You can wear any owned hat from the Character menu.',
        };
      },
      contentNodeId: 'haberdashery.haberdasherDialogue.node-2',
      labelTextId: 'haberdashery.haberdasherDialogue.label-3',
      labelTextValues: {
        v0: h.name,
        v1: economy.state.ownedHats.includes(h.id)
          ? 'Wear owned hat'
          : h.price.toLocaleString('en-US') + (h.price === 1 ? ' coin' : ' coins'),
      },
      actionId: 'haberdashery.haberdasherDialogue.action-4' + ':' + [h.id].join(':'),
    })),
    contentNodeId: 'haberdashery.haberdasherDialogue.node-1',
  };
}
