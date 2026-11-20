import { configuredDialogue } from './dialogue-config.js';
import { HAT_CATALOG } from './hat-catalog.js';

export function haberdasherDialogue(npc, economy, wear) {
  return {
    ...configuredDialogue('haberdasher', npc),
    choices: HAT_CATALOG.filter((h) => !h.dropOnly).map((h) => ({
      label:
        h.name +
        ' · ' +
        (economy.state.ownedHats.includes(h.id)
          ? 'Wear owned hat'
          : h.price.toLocaleString('en-US') + (h.price === 1 ? ' coin' : ' coins')),
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
    })),
  };
}
