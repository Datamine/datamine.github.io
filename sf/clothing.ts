import { isRecord, isOneOf } from './types/json.ts';
/** Canonical clothing slots, including migration of the original ice toggles. */
export function clothingSelection(input: unknown = {}) {
  const value = isRecord(input) ? input : {};
  const torso = isOneOf(
    ['shirt', 'ice-top', 'black-cloak-top', 'tinfoil-suit'] satisfies [
      string,
      string,
      string,
      string,
    ],
    value.torso,
  )
    ? value.torso
    : value.iceTop === true
      ? 'ice-top'
      : value.cloakTop === true
        ? 'black-cloak-top'
        : 'shirt';
  const legs = isOneOf(
    ['trousers', 'ice-pants', 'black-cloak-bottom'] satisfies [string, string, string],
    value.legs,
  )
    ? value.legs
    : value.icePants === true
      ? 'ice-pants'
      : value.cloakBottom === true
        ? 'black-cloak-bottom'
        : 'trousers';
  return {
    torso,
    legs,
    tinfoil: torso === 'tinfoil-suit',
    iceTop: torso === 'ice-top',
    icePants: legs === 'ice-pants',
    cloakTop: torso === 'black-cloak-top',
    cloakBottom: legs === 'black-cloak-bottom',
  };
}
export function ownedClothing(value: unknown, owns: (id: string) => boolean) {
  const c = clothingSelection(value);
  return clothingSelection({
    ...c,
    torso: c.torso === 'shirt' || owns(c.torso) ? c.torso : 'shirt',
    legs: c.legs === 'trousers' || owns(c.legs) ? c.legs : 'trousers',
  });
}
