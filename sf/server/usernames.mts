interface ValidName {
  ok: true;
  name: string;
  canonical: string;
}
interface InvalidName {
  ok: false;
  message: string;
  retryAt?: number;
}
type RenameResult =
  | (ValidName & { retryAt?: number; unchanged?: boolean })
  | { ok: true; name: string; unchanged: true; retryAt: number }
  | InvalidName;
import { randomInt } from 'node:crypto';

export const RENAME_COOLDOWN_MS = 60_000;
const nameBeginnings = [
  'Fog',
  'Bay',
  'Oak',
  'Pine',
  'Dune',
  'Moon',
  'Sun',
  'Moss',
  'Wild',
  'Blue',
  'Red',
  'Sea',
  'Gold',
  'Star',
  'Lake',
  'Mist',
  'Sky',
  'Rose',
  'Dawn',
  'Hill',
  'Cove',
  'Reed',
  'Glen',
  'Fern',
];
const nameEndings = [
  'Otter',
  'Fox',
  'Duck',
  'Wren',
  'Bear',
  'Seal',
  'Lynx',
  'Finch',
  'Kite',
  'Owl',
  'Wolf',
  'Hare',
  'Moth',
  'Puma',
  'Lark',
  'Trout',
] satisfies [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];
/** Generated names follow the same length/moderation/uniqueness policy as
 * chosen names. Their persisted changed=0 leaves the first rename unlocked. */
export function generateUsername(
  taken: (canonical: string) => boolean = () => false,
  draw = randomInt,
) {
  for (let attempt = 0; attempt < 128; attempt++) {
    const candidate =
        nameBeginnings[draw(nameBeginnings.length)] +
        nameEndings[draw(nameEndings.length)] +
        draw(36 ** 3)
          .toString(36)
          .padStart(3, '0'),
      result = normalizeUsername(candidate);
    if (result.ok && !taken(result.canonical)) return result;
  }
  throw new Error('Unable to assign an available username. Please reconnect.');
}
// Kept server-side. Never use the rendered/escaped name as an identity key.
const forbidden = [
  'fuck',
  'fuk',
  'fuc',
  'fck',
  'fuq',
  'fook',
  'fack',
  'shit',
  'shyt',
  'shet',
  'bitch',
  'bich',
  'biatch',
  'cunt',
  'kunt',
  'cock',
  'dick',
  'pussy',
  'pussie',
  'asshole',
  'arsehole',
  'motherfucker',
  'wanker',
  'twat',
  'bollock',
  'bastard',
  'douche',
  'slut',
  'whore',
  'piss',
  'prick',
  'jizz',
  'nigger',
  'nigga',
  'faggot',
  'fag',
  'retard',
  'rape',
  'rapist',
];
const substitutions: Record<string, string> = {
  0: 'o',
  1: 'i',
  3: 'e',
  4: 'a',
  5: 's',
  7: 't',
  8: 'b',
  9: 'g',
};
export function normalizeUsername(value: unknown): ValidName | InvalidName {
  if (typeof value !== 'string')
    return { ok: false, message: 'Choose a username with 1–12 letters, numbers, or underscores.' };
  const name = value.normalize('NFKC').trim();
  if (!/^[A-Za-z0-9_]{1,12}$/.test(name))
    return { ok: false, message: 'Use 1–12 letters, numbers, or underscores.' };
  const canonical = name.toLowerCase(),
    letters = canonical
      .replace(/[01345789]/g, (c) => substitutions[c])
      .replace(/_/g, '')
      .replace(/ph/g, 'f'),
    fold = (s: string) => s.replace(/(.)\1+/g, '$1');
  // Check both spellings: digit substitutions must not hide ordinary text.
  const variants = [
    canonical.replace(/_/g, ''),
    letters,
    letters.replace(/i/g, 'l'),
    letters.replace(/v/g, 'u'),
  ] satisfies [string, string, string, string];
  const bad = variants.some(
    (v) =>
      (
        ['ass', 'arse', 'tit', 'tits', 'cum', 'sex'] satisfies [
          string,
          string,
          string,
          string,
          string,
          string,
        ]
      ).includes(v) || forbidden.some((word) => v.includes(word) || fold(v).includes(fold(word))),
  );
  if (bad || /^guest\d+$/i.test(name))
    return { ok: false, message: 'That username is unavailable. Please choose another.' };
  return { ok: true, name, canonical };
}
export function renameDecision({
  name,
  owner,
  now,
  lastChanged = 0,
  current = null,
  takenBy = null,
}: {
  name: unknown;
  owner: string;
  now: number;
  lastChanged?: number;
  current?: string | null;
  takenBy?: string | null;
}): RenameResult {
  const result = normalizeUsername(name);
  if (!result.ok) return result;
  if (current?.toLowerCase() === result.canonical)
    return {
      ok: true,
      name: current,
      unchanged: true,
      retryAt: lastChanged ? lastChanged + RENAME_COOLDOWN_MS : 0,
    };
  if (lastChanged && now < lastChanged + RENAME_COOLDOWN_MS)
    return {
      ok: false,
      message:
        'Wait ' +
        Math.ceil((lastChanged + RENAME_COOLDOWN_MS - now) / 1000) +
        ' seconds before changing your username.',
      retryAt: lastChanged + RENAME_COOLDOWN_MS,
    };
  if (takenBy && takenBy !== owner)
    return { ok: false, message: 'That username is already taken.' };
  return { ...result, retryAt: now + RENAME_COOLDOWN_MS };
}
