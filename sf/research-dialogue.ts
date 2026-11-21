// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { configuredDialogue } from './dialogue-config.ts';
import type { Actor } from './types/world.ts';

/** Appearance and examine text are separate from fixed conversation topics. */
export const RESEARCHERS = Object.freeze(
  [
    {
      id: 'ada-meridian',
      campus: 'centeredness-institute',
      name: contentText('research-dialogue.module.name-1', {}),
      label: contentText('research-dialogue.module.label-2', {}),
      side: -1,
      skin: '#aa785c',
      shirt: '#d5d9ce',
      hair: '#514638',
      female: true,
      coat: true,
      description: contentText('research-dialogue.module.description-3', {}),
    },
    {
      id: 'mira-softmax',
      campus: 'centeredness-institute',
      name: contentText('research-dialogue.module.name-4', {}),
      label: contentText('research-dialogue.module.label-5', {}),
      side: 1,
      skin: '#bc8e70',
      shirt: '#a18ab8',
      hair: '#322d35',
      female: true,
      longHair: true,
      description: contentText('research-dialogue.module.description-6', {}),
    },
    {
      id: 'soren-still',
      campus: 'centeredness-institute',
      name: contentText('research-dialogue.module.name-7', {}),
      label: contentText('research-dialogue.module.label-8', {}),
      side: -1,
      skin: '#c3a17d',
      shirt: '#779a89',
      hair: '#8a8175',
      seated: true,
      description: contentText('research-dialogue.module.description-9', {}),
    },
    {
      id: 'elias-index',
      campus: 'center-research-institute',
      name: contentText('research-dialogue.module.name-10', {}),
      label: contentText('research-dialogue.module.label-11', {}),
      side: -1,
      skin: '#b58f6a',
      shirt: '#8796ad',
      hair: '#ded6c4',
      coat: true,
      description: contentText('research-dialogue.module.description-12', {}),
    },
    {
      id: 'noor-qualia',
      campus: 'center-research-institute',
      name: contentText('research-dialogue.module.name-13', {}),
      label: contentText('research-dialogue.module.label-14', {}),
      side: 1,
      skin: '#8f6552',
      shirt: '#c9a377',
      hair: '#342e2b',
      female: true,
      hairstyle: 'curly',
      longHair: true,
      description: contentText('research-dialogue.module.description-15', {}),
    },
    {
      id: 'rowan-zero',
      campus: 'center-research-institute',
      name: contentText('research-dialogue.module.name-16', {}),
      label: contentText('research-dialogue.module.label-17', {}),
      side: -1,
      skin: '#d1ac83',
      shirt: '#65858a',
      hair: '#5c5045',
      cap: true,
      seated: true,
      description: contentText('research-dialogue.module.description-18', {}),
    },
  ].map((person) => Object.freeze(person)),
);

export function createResearchDialogue(npc: Partial<Actor>) {
  const person = RESEARCHERS.find((p) => p.id === npc.id);
  if (!person) throw new Error('Unknown researcher ' + npc.id);
  return configuredDialogue(person.id, { ...person, ...npc });
}
