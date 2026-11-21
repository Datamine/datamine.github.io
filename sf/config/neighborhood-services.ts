interface ServiceEffect {
  id: string;
  price?: number;
  reward?: number;
  cooldownMs?: number;
  showMs?: number;
  heal?: number;
  sober?: number;
  bouquet?: number;
  sandwich?: number;
}
interface NeighborhoodService {
  intro?: string;
  offers: (ServiceEffect & { label?: string; message?: string })[];
  contentNodeId: string;
}
// CONTENT-BINDINGS-MIGRATED
import { NPC_DIALOGUES } from './dialogue.ts';
import { DOG_PONY_SHOW } from '../dog-pony-layout.ts';

/** Authoritative service prices and effects. Spoken copy is in ../dialogues/services.json. */
const SERVICE_EFFECTS: Record<string, ServiceEffect[]> = {
  mazarine: [{ id: 'sweep', reward: 1, cooldownMs: 180000 }],
  'dog-pony': [{ id: 'watch', price: DOG_PONY_SHOW.price, showMs: DOG_PONY_SHOW.durationMs }],
  tea: [
    {
      id: 'jasmine',
      price: 1,
      heal: 5,
      sober: 10,
    },
    {
      id: 'mint',
      price: 1,
      heal: 5,
      sober: 10,
    },
  ],
  books: [
    {
      id: 'garden',
    },
    {
      id: 'mind',
    },
    {
      id: 'coast',
    },
  ],
  flowers: [
    {
      id: 'bouquet',
      price: 2,
      bouquet: 1,
    },
    {
      id: 'water',
      reward: 1,
      cooldownMs: 180000,
    },
    {
      id: 'advice',
    },
  ],
  bakery: [
    {
      id: 'sandwich',
      price: 2,
      sandwich: 1,
    },
  ],
  pottery: [
    {
      id: 'wheel',
      reward: 1,
      cooldownMs: 180000,
    },
    {
      id: 'glaze',
    },
  ],
  workshop: [
    {
      id: 'repair',
      reward: 1,
      cooldownMs: 180000,
    },
  ],
  market: [
    {
      id: 'taste',
    },
  ],
};
export const NEIGHBORHOOD_SERVICES: Readonly<Record<string, NeighborhoodService>> = Object.freeze(
  Object.fromEntries(
    Object.entries(SERVICE_EFFECTS).map(([id, offers]) => {
      const dialogue = NPC_DIALOGUES['neighborhood-' + id];
      return [
        id,
        {
          intro: dialogue.intro,
          offers: offers.map((offer) => {
            const choice = dialogue.choices!.find((c) => c.id === offer.id)!;
            return { ...offer, label: choice.label, message: choice.receipt };
          }),
          contentNodeId: 'config.neighborhood-services.module.node-1',
        },
      ];
    }),
  ),
);

export function neighborhoodServiceFor(label = '') {
  return /books|bookshop/i.test(label)
    ? 'books'
    : /tea room|terrace/i.test(label)
      ? 'tea'
      : /flower/i.test(label)
        ? 'flowers'
        : /bakery/i.test(label)
          ? 'bakery'
          : /pottery/i.test(label)
            ? 'pottery'
            : /workshop/i.test(label)
              ? 'workshop'
              : /market/i.test(label)
                ? 'market'
                : null;
}
