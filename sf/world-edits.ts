import type { EditableEntity, RuntimeDialogue, ContentEntity } from './types/world.ts';
interface EditableLife {
  people: EditableEntity[];
}
interface EditableWorld {
  places?: EditableEntity[];
  sights?: EditableEntity[];
  merchants?: EditableEntity[];
  parrots?: EditableEntity[];
  jailStaff?: EditableEntity[];
  restaurantDiners?: EditableEntity[];
  southernNeighborhood?: { residents: EditableEntity[] } | null;
  socialLife?: EditableLife | null;
  wilderness?: { actors: EditableEntity[] } | null;
  expeditions?: {
    cows?: EditableEntity[];
    raptor?: EditableEntity;
    kraken?: EditableEntity;
  } | null;
  keeperNPC?: EditableEntity;
  cityLife?: EditableLife | null;
  southernLife?: EditableLife | null;
  noeValleyLife?: EditableLife | null;
  squareLife?: EditableLife | null;
  esotericCampus?: { life?: EditableLife | null } | null;
  lives?: (EditableLife | null)[];
  streetTraffic?: { cars?: { sight: EditableEntity }[] } | null;
  slowBus?: { bus: { sight: EditableEntity } } | null;
  secretStairs?: EditableEntity | null;
  caveExitSite?: EditableEntity | null;
  bomberSite?: EditableEntity | null;
}

import type { PlayerContentContext } from './player-document.ts';
// Compatibility names for world/domain modules; authored content is canonical JSON.
import { CONTENT } from './content-runtime.ts';
import {
  applyContentEntity,
  compileEntityDialogue,
  compileSharedConversation,
  contentDefinition,
} from './content-game.ts';
import { playerDocumentFromContext } from './player-document.ts';

export const applyEntityEdits = applyContentEntity;

export function applyWorldEdits(world: EditableWorld) {
  for (const p of world.places || []) applyContentEntity(p, 'place:' + p.id);
  for (const s of world.sights || []) applyContentEntity(s, 'sight:' + s.id);
  const people = [
    ...(world.merchants || []),
    ...(world.parrots || []),
    ...(world.jailStaff || []),
    ...(world.restaurantDiners || []),
    ...(world.southernNeighborhood?.residents || []),
    ...(world.socialLife?.people || []),
    ...(world.wilderness?.actors || []),
    ...(world.expeditions?.cows || []),
    world.expeditions?.raptor,
    world.expeditions?.kraken,
    world.keeperNPC,
    ...[
      world.cityLife,
      world.southernLife,
      world.noeValleyLife,
      world.squareLife,
      world.esotericCampus?.life,
      ...(world.lives || []),
    ].flatMap((l) => l?.people || []),
  ];
  for (const npc of people) if (npc) applyContentEntity(npc, 'actor:' + npc.id);
  for (const car of [...(world.streetTraffic?.cars || []), world.slowBus?.bus].filter(
    (car) => car !== undefined,
  ))
    applyContentEntity(car.sight, 'sight:' + car.sight.id);
  for (const s of [world.secretStairs, world.caveExitSite, world.bomberSite])
    if (s) applyContentEntity(s, 'sight:' + s.id);
}

export function applyDialogueEdits<T extends RuntimeDialogue>(
  person: T,
  key = person?.editorKey || (person?.id ? 'actor:' + person.id : null),
  context: PlayerContentContext = {},
) {
  if (!person || person.contentResolved) return person;
  if (key?.startsWith('shared:'))
    return (
      compileSharedConversation(key.slice(7), person, playerDocumentFromContext(context)) || person
    );
  return key ? compileEntityDialogue(person, key, context) : person;
}

export function editedSpeechText(entity: ContentEntity, fallback: string) {
  const def = contentDefinition(entity.editorKey || 'actor:' + entity.id);
  if (!def) return fallback;
  const variant = def.dialogues.map((id) => CONTENT.dialogues.variants[id]).find((v) => v.speech);
  return variant?.speech || fallback;
}
