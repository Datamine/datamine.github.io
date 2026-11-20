import { NPC_DIALOGUES } from './dialogue.js';

/** NPC names and palettes. Conversation catalogs live in ../dialogues/. */
const NPC_APPEARANCES = {
  'hiking-supplier': {
    name: 'Hiking supplies clerk',
    skin: '#ba9371',
    hair: '#5e4b3d',
    shirt: '#748968',
  },
  'airship-agent': {
    name: 'Airship attendant',
    skin: '#a77d60',
    hair: '#393c40',
    shirt: '#c3d4df',
  },
  stockbroker: {
    name: 'Stockbroker',
    skin: '#b58a69',
    hair: '#454037',
    shirt: '#6c8f87',
  },
  'duel-referee': {
    name: 'Duel referee',
    skin: '#a47859',
    hair: '#534439',
    shirt: '#b7aa86',
  },
  'twitter-worker': {
    name: 'Bottle-post engineer',
    skin: '#aa7d5e',
    hair: '#4c3d34',
    shirt: '#69848c',
  },
  'twitter-poster': {
    name: 'Poster',
    skin: '#b79577',
    hair: '#4b4141',
    shirt: '#8b788b',
  },
  'software-vendor': {
    name: 'Redheaded software salesman',
    skin: '#cfaa8d',
    hair: '#b9673e',
    shirt: '#557c88',
  },
  'software-buyer': {
    name: 'Software salesman',
    skin: '#b78c6c',
    hair: '#4c4140',
    shirt: '#778190',
  },
  'tim-apple': {
    name: 'Tim Apple',
    skin: '#d0ae91',
    hair: '#b8bab5',
    shirt: '#3c4348',
  },
  'robotaxi-sales': {
    name: 'Tesla robotaxi dealer',
    skin: '#b48c6c',
    hair: '#44494b',
    shirt: '#657d88',
  },
  haberdasher: {
    name: 'Haberdasher',
    skin: '#b58b6c',
    hair: '#493b35',
    shirt: '#77546b',
  },
  'salt-activist': {
    name: 'Salt conservationist',
    skin: '#a77b5b',
    hair: '#534836',
    shirt: '#71947e',
  },
  'gpu-buyer': {
    name: 'GPU Factory buyer',
    skin: '#b69270',
    hair: '#4a4940',
    shirt: '#cbd9d4',
  },
  'fuel-attendant': {
    name: 'Fuel attendant',
    skin: '#ba9674',
    hair: '#43433a',
    shirt: '#709d8b',
  },
  'motorcycle-clerk': {
    name: 'Motorcycle rental clerk',
    skin: '#ac815e',
    hair: '#3f3832',
    shirt: '#507e82',
  },
  recruiter: {
    name: 'AI Lab recruiter',
    skin: '#b99276',
    hair: '#393e42',
    shirt: '#71939c',
  },
  chef: {
    name: 'Cotogna chef',
    skin: '#b38c6d',
    hair: '#40352f',
    shirt: '#e3e2d5',
  },
  lift: {
    name: 'Ski lift attendant',
    skin: '#c69a7a',
    hair: '#514239',
    shirt: '#b64c58',
  },
  capital: {
    name: 'Sand Hill Road Capital Partner',
    skin: '#c29a76',
    hair: '#51453c',
    shirt: '#6f859d',
  },
  crew: {
    name: 'SpaceX attendant',
    skin: '#ba9678',
    hair: '#3c4145',
    shirt: '#e4e8ec',
  },
  tax: {
    name: 'Tax authority',
    skin: '#b99b75',
    hair: '#342f27',
    shirt: '#d4b85d',
  },
  founder: {
    name: 'Startup founder',
    skin: '#b88b68',
    hair: '#423c31',
    shirt: '#c0824e',
  },
  secondary: {
    name: 'Secondary purchaser',
    skin: '#9c7256',
    hair: '#302f2c',
    shirt: '#527c77',
  },
  grain: {
    name: 'Grain merchant',
    skin: '#c3a17c',
    hair: '#77776b',
    shirt: '#828b57',
  },
  passenger: {
    name: 'Traveler',
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
