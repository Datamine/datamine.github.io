import { configuredDialogue } from './dialogue-config.js';
import { fuelCarInRange } from './interaction-access.js';
import { mapInteractionResult } from './interaction-results.js';

/** Station purchases never require the car. A can contains one full tank and
 * follows that station's normal pricing, including an empty purse at extortionate pumps. */
export function createFuelDialogue(
  site,
  car,
  economy,
  onChange = () => {},
  { npc = null, refuel = null } = {},
) {
  const near = () => fuelCarInRange(car, site, npc);
  const person = configuredDialogue(
    site.paid ? 'fuel-paid' : 'fuel-free',
    { name: site.label, shirt: site.paid ? '#a06865' : '#709d8b' },
    {
      refuel: () => {
        if (!near())
          return {
            ok: false,
            message: 'The Ferrari is too far from this pump. Take a fuel can back to it instead.',
          };
        if (refuel)
          return Promise.resolve(refuel()).then((result) => {
            onChange();
            return {
              ...result,
              message: result.ok ? 'Your tank is full. Safe travels!' : result.message,
            };
          });
        const result = site.paid ? economy.trade('extortion') : { ok: true };
        if (result.ok) car.refuel();
        onChange();
        return {
          ...result,
          message: result.ok ? 'Your tank is full. Safe travels!' : result.message,
        };
      },
      fuelCan: () =>
        mapInteractionResult(economy.trade(site.paid ? 'fuel-can' : 'free-fuel-can'), (result) => {
          onChange();
          return {
            ...result,
            message: result.ok
              ? 'One full fuel can. Return to your Ferrari and choose Use fuel can.'
              : result.message,
          };
        }),
    },
    { fuelPrice: site.paid ? 'all carried coins' : 'Free' },
  );
  if (!near()) person.choices = person.choices.filter((choice) => choice.id !== 'refuel');
  return person;
}

export function refuelFerrariFromCan(car, economy) {
  if (!car.state.owned)
    return { ok: false, message: 'Borrow the Ferrari before using a fuel can.' };
  if (car.state.fuel >= 1 - 1e-9)
    return { ok: false, message: 'The Ferrari already has a full tank. You keep your fuel can.' };
  const result = economy.trade('use-fuel-can'),
    remote = !!(result?.promise || result?.then);
  return mapInteractionResult(result, (receipt) => {
    if (!receipt.ok) return receipt;
    // Online gameplay already filled the authoritative car. Do not send a
    // second refuel command or predict fuel before that receipt arrives.
    if (!remote) car.refuel();
    return {
      ...receipt,
      message: 'You pour the fuel can into the Ferrari. A full tank, ready to go!',
    };
  });
}
