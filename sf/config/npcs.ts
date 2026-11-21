// CONTENT-BINDINGS-MIGRATED
import { contentText } from '../content-runtime.ts';
import { NPC_DIALOGUES } from './dialogue.ts';

/** NPC names and palettes. Conversation catalogs live in ../dialogues/. */
const NPC_APPEARANCES = {
  'hiking-supplier': {
    name: contentText('config.npcs.module.name-1', {}),
    skin: '#ba9371',
    hair: '#5e4b3d',
    shirt: '#748968',
  },
  'airship-agent': {
    name: contentText('config.npcs.module.name-2', {}),
    skin: '#a77d60',
    hair: '#393c40',
    shirt: '#c3d4df',
  },
  stockbroker: {
    name: contentText('config.npcs.module.name-3', {}),
    skin: '#b58a69',
    hair: '#454037',
    shirt: '#6c8f87',
  },
  'duel-referee': {
    name: contentText('config.npcs.module.name-4', {}),
    skin: '#a47859',
    hair: '#534439',
    shirt: '#b7aa86',
  },
  'twitter-worker': {
    name: contentText('config.npcs.module.name-5', {}),
    skin: '#aa7d5e',
    hair: '#4c3d34',
    shirt: '#69848c',
  },
  'twitter-poster': {
    name: contentText('config.npcs.module.name-6', {}),
    skin: '#b79577',
    hair: '#4b4141',
    shirt: '#8b788b',
  },
  'software-vendor': {
    name: contentText('config.npcs.module.name-7', {}),
    skin: '#cfaa8d',
    hair: '#b9673e',
    shirt: '#557c88',
  },
  'software-buyer': {
    name: contentText('config.npcs.module.name-8', {}),
    skin: '#b78c6c',
    hair: '#4c4140',
    shirt: '#778190',
  },
  'tim-apple': {
    name: contentText('config.npcs.module.name-9', {}),
    skin: '#d0ae91',
    hair: '#b8bab5',
    shirt: '#3c4348',
  },
  'robotaxi-sales': {
    name: contentText('config.npcs.module.name-10', {}),
    skin: '#b48c6c',
    hair: '#44494b',
    shirt: '#657d88',
  },
  haberdasher: {
    name: contentText('config.npcs.module.name-11', {}),
    skin: '#b58b6c',
    hair: '#493b35',
    shirt: '#77546b',
  },
  'salt-activist': {
    name: contentText('config.npcs.module.name-12', {}),
    skin: '#a77b5b',
    hair: '#534836',
    shirt: '#71947e',
  },
  'gpu-buyer': {
    name: contentText('config.npcs.module.name-13', {}),
    skin: '#b69270',
    hair: '#4a4940',
    shirt: '#cbd9d4',
  },
  'fuel-attendant': {
    name: contentText('config.npcs.module.name-14', {}),
    skin: '#ba9674',
    hair: '#43433a',
    shirt: '#709d8b',
  },
  'motorcycle-clerk': {
    name: contentText('config.npcs.module.name-15', {}),
    skin: '#ac815e',
    hair: '#3f3832',
    shirt: '#507e82',
  },
  recruiter: {
    name: contentText('config.npcs.module.name-16', {}),
    skin: '#b99276',
    hair: '#393e42',
    shirt: '#71939c',
  },
  chef: {
    name: contentText('config.npcs.module.name-17', {}),
    skin: '#b38c6d',
    hair: '#40352f',
    shirt: '#e3e2d5',
  },
  lift: {
    name: contentText('config.npcs.module.name-18', {}),
    skin: '#c69a7a',
    hair: '#514239',
    shirt: '#b64c58',
  },
  capital: {
    name: contentText('config.npcs.module.name-19', {}),
    skin: '#c29a76',
    hair: '#51453c',
    shirt: '#6f859d',
  },
  crew: {
    name: contentText('config.npcs.module.name-20', {}),
    skin: '#ba9678',
    hair: '#3c4145',
    shirt: '#e4e8ec',
  },
  tax: {
    name: contentText('config.npcs.module.name-21', {}),
    skin: '#b99b75',
    hair: '#342f27',
    shirt: '#d4b85d',
  },
  founder: {
    name: contentText('config.npcs.module.name-22', {}),
    skin: '#b88b68',
    hair: '#423c31',
    shirt: '#c0824e',
  },
  secondary: {
    name: contentText('config.npcs.module.name-23', {}),
    skin: '#9c7256',
    hair: '#302f2c',
    shirt: '#527c77',
  },
  grain: {
    name: contentText('config.npcs.module.name-24', {}),
    skin: '#c3a17c',
    hair: '#77776b',
    shirt: '#828b57',
  },
  passenger: {
    name: contentText('config.npcs.module.name-25', {}),
    skin: '#bb9776',
    hair: '#594839',
    shirt: '#7e7792',
  },
};
export const MERCHANTS = Object.freeze(
  Object.fromEntries(
    Object.entries(NPC_APPEARANCES).map(([id, appearance]) => [
      id,
      { ...appearance, ...NPC_DIALOGUES[id] },
    ]),
  ),
);
