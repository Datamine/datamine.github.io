/** Canonical clothing slots, including migration of the original ice toggles. */
export function clothingSelection(value = {}) {
  value ??= {};
  const torso = ['shirt', 'ice-top', 'black-cloak-top'].includes(value.torso)
    ? value.torso
    : value.iceTop === true
      ? 'ice-top'
      : value.cloakTop === true
        ? 'black-cloak-top'
        : 'shirt';
  const legs = ['trousers', 'ice-pants', 'black-cloak-bottom'].includes(value.legs)
    ? value.legs
    : value.icePants === true
      ? 'ice-pants'
      : value.cloakBottom === true
        ? 'black-cloak-bottom'
        : 'trousers';
  return {
    torso,
    legs,
    iceTop: torso === 'ice-top',
    icePants: legs === 'ice-pants',
    cloakTop: torso === 'black-cloak-top',
    cloakBottom: legs === 'black-cloak-bottom',
  };
}
export function ownedClothing(value, owns) {
  const c = clothingSelection(value);
  return clothingSelection({
    ...c,
    torso: c.torso === 'shirt' || owns(c.torso) ? c.torso : 'shirt',
    legs: c.legs === 'trousers' || owns(c.legs) ? c.legs : 'trousers',
  });
}
