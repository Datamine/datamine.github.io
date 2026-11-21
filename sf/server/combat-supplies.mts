import { isFiniteNumber } from '../types/json.ts';
import type { ServerPlayer } from '../types/server.ts';
import { equipmentOwned } from '../item-stats.ts';
export const AMMO_PACK_ROUNDS = 20,
  AMMO_PACK_PRICE = 5,
  BATTERY_PRICE = 20,
  BATTERY_SHOTS = 25;
/** A shot spends its resource only once, after range and cooldown validation. */
export function consumeWeaponShot(p: ServerPlayer, weapon: string) {
  const key = weapon === 'akibo' ? 'akimboAmmo' : weapon === 'railgun' ? 'railgunCharge' : null;
  if (!key) return { ok: true };
  if (!(p.inventory.meta[key] > 0))
    return {
      ok: false,
      message:
        weapon === 'akibo' ? 'Your akimbos are out of ammo.' : 'Your railgun battery is empty.',
    };
  p.inventory.meta[key]--;
  p.inventory.save();
  return { ok: true };
}
export function combatSupplyAction(
  p: ServerPlayer,
  op: string,
  {
    nearArmorer,
    nearBatterySeller,
    nearChef,
  }: { nearArmorer: boolean; nearBatterySeller: boolean; nearChef: boolean },
) {
  const meta = p.inventory.meta,
    purse = p.inventory.economy.state;
  if (op === 'chargeRailgun') {
    if (!meta.railgunBatteries) return { ok: false, message: 'You have no spare battery.' };
    if (meta.railgunCharge >= BATTERY_SHOTS)
      return { ok: false, message: 'The railgun is already fully charged.' };
    meta.railgunBatteries--;
    meta.railgunCharge = BATTERY_SHOTS;
  } else if (op === 'buyAmmo') {
    if (!nearArmorer) return { ok: false, message: 'Visit the industrial center armorer.' };
    if (purse.coins < AMMO_PACK_PRICE) return { ok: false, message: 'You need 5 coins.' };
    if (meta.akimboAmmo > 1000000 - AMMO_PACK_ROUNDS)
      return { ok: false, message: 'You cannot carry more ammo.' };
    purse.coins -= AMMO_PACK_PRICE;
    meta.akimboAmmo += AMMO_PACK_ROUNDS;
  } else if (op === 'buyBattery') {
    if (!nearBatterySeller) return { ok: false, message: 'Visit the battery seller.' };
    if (purse.coins < BATTERY_PRICE) return { ok: false, message: 'You need 20 coins.' };
    if (meta.railgunBatteries >= 1000000)
      return { ok: false, message: 'You cannot carry more batteries.' };
    purse.coins -= BATTERY_PRICE;
    meta.railgunBatteries++;
  } else if (op === 'buyTinfoil') {
    if (!nearChef) return { ok: false, message: 'Visit the Cotogna counter.' };
    if (equipmentOwned(purse, 'tinfoil-suit'))
      return { ok: false, message: 'You already own a tinfoil suit.' };
    if (purse.coins < 20) return { ok: false, message: 'You need 20 coins.' };
    purse.coins -= 20;
    purse.ownedEquipment.push('tinfoil-suit');
  } else return { ok: false, message: 'That supply is unavailable.' };
  p.inventory.save();
  return {
    ok: true,
    inventory: p.inventory.snapshot(),
    message:
      op === 'chargeRailgun'
        ? 'You fit a fresh battery.'
        : op === 'buyAmmo'
          ? 'You buy 20 rounds.'
          : op === 'buyBattery'
            ? 'You buy a spare battery.'
            : 'The chef folds an extravagant roll of foil into a full suit. Equip it in Character settings.',
  };
}

/** Carry sub-tick overshoot forward; a pause never banks a burst of shots. */
export function advanceAttackDeadline(time: number, previous: unknown, interval: number) {
  return isFiniteNumber(previous) && time - previous >= -1e-8 && time - previous <= 0.1
    ? previous + interval
    : time + interval;
}
