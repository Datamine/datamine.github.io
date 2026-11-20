import { configuredDialogue } from './dialogue-config.js';

/** Appearance and examine text are separate from fixed conversation topics. */
export const RESEARCHERS = Object.freeze(
  [
    {
      id: 'ada-meridian',
      campus: 'centeredness-institute',
      name: 'Professor Ada Meridian',
      label: 'Professor Ada Meridian',
      side: -1,
      skin: '#aa785c',
      shirt: '#d5d9ce',
      hair: '#514638',
      female: true,
      coat: true,
      description:
        'A director with a chalk-dusted coat and a compass that points toward the nearest open grant application.',
    },
    {
      id: 'mira-softmax',
      campus: 'centeredness-institute',
      name: 'Mira Softmax',
      label: 'Mira Softmax',
      side: 1,
      skin: '#bc8e70',
      shirt: '#a18ab8',
      hair: '#322d35',
      female: true,
      longHair: true,
      description:
        'A researcher carrying seven meditation timers, all confidently disagreeing about when the present begins.',
    },
    {
      id: 'soren-still',
      campus: 'centeredness-institute',
      name: 'Soren Still',
      label: 'Soren Still',
      side: -1,
      skin: '#c3a17d',
      shirt: '#779a89',
      hair: '#8a8175',
      seated: true,
      description:
        'A contemplative fellow taking a very slow walk around the bench he identifies as “compute infrastructure.”',
    },
    {
      id: 'elias-index',
      campus: 'center-research-institute',
      name: 'Professor Elias Index',
      label: 'Professor Elias Index',
      side: -1,
      skin: '#b58f6a',
      shirt: '#8796ad',
      hair: '#ded6c4',
      coat: true,
      description:
        'A professor with a very small ruler and an extraordinarily large jurisdictional dispute.',
    },
    {
      id: 'noor-qualia',
      campus: 'center-research-institute',
      name: 'Dr. Noor Qualia',
      label: 'Dr. Noor Qualia',
      side: 1,
      skin: '#8f6552',
      shirt: '#c9a377',
      hair: '#342e2b',
      female: true,
      hairstyle: 'curly',
      longHair: true,
      description:
        'A phenomenologist whose lab notebook contains careful observations, many question marks, and one excellent soup recipe.',
    },
    {
      id: 'rowan-zero',
      campus: 'center-research-institute',
      name: 'Rowan Zero',
      label: 'Rowan Zero',
      side: -1,
      skin: '#d1ac83',
      shirt: '#65858a',
      hair: '#5c5045',
      cap: true,
      seated: true,
      description:
        'The facilities lead. Their keyring is labeled “ground truth” and opens considerably more doors than the institute’s theories do.',
    },
  ].map((person) => Object.freeze(person)),
);

export function createResearchDialogue(npc) {
  const person = RESEARCHERS.find((p) => p.id === npc.id);
  if (!person) throw new Error('Unknown researcher ' + npc.id);
  return configuredDialogue(npc.id, { ...person, ...npc });
}
