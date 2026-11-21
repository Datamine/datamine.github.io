import '../types/assert.ts';
import type { SimulationServices, ServerPlayer } from '../types/server.ts';
import { createBankAccount } from '../banking.ts';

export function bankSnapshotFor(p: { profile: { bank: unknown } }, now = Date.now) {
  const account = createBankAccount(p.profile.bank, now, (saved) => (p.profile.bank = saved));
  account.settle();
  return account.snapshot();
}
export function bankAction(
  p: ServerPlayer,
  action: string,
  args: { amount?: unknown },
  { geometry, now, dirty }: Pick<SimulationServices, 'geometry' | 'now' | 'dirty'>,
) {
  const teller = geometry.merchants?.find((n) => n.id === 'green-banker'),
    alive = p.hp > 0 && !p.respawnAllowed && !p.personalJailed;
  if (
    action !== 'bankStatus' &&
    action !== 'bankCoffeeDrink' &&
    (!alive ||
      !teller ||
      (p.instance?.kind || 'world') !== 'world' ||
      p.bomberActive ||
      Math.hypot(p.x - teller.x, p.z - teller.z) > 2.6 ||
      Math.abs(p.y - Number(teller.base)) > 2.5)
  )
    return { ok: false, message: 'Visit the friendly banker at Green Bank first.' };
  const account = createBankAccount(p.profile.bank, now, (saved) => {
    p.profile.bank = saved;
    dirty(p);
  });
  if (action === 'bankStatus') {
    account.settle();
    return { ok: true, bank: account.snapshot() };
  }
  if (action === 'bankCoffee') {
    if (p.inventory.meta.coffee)
      return {
        ok: false,
        message: 'You already have a fresh coffee. Enjoy that one first!',
        inventory: p.inventory.snapshot(),
      };
    p.inventory.meta.coffee = 1;
    p.inventory.save();
    dirty(p);
    return {
      ok: true,
      inventory: p.inventory.snapshot(),
      message:
        'Of course! One fresh coffee, on the house. You can drink it from your inventory. It is lovely to have you here.',
    };
  }
  if (action === 'bankCoffeeDrink') {
    if (!alive || p.bomberActive)
      return { ok: false, message: 'Find a moment to enjoy your coffee safely.' };
    if (!p.inventory.meta.coffee) return { ok: false, message: 'You have no coffee to drink.' };
    p.inventory.meta.coffee = 0;
    const healed = Math.min(1, Math.max(0, p.max - p.hp));
    p.hp += healed;
    p.damagePending = true;
    p.inventory.save();
    p.gesture = 'drink';
    p.gestureUntil = now() + 1600;
    dirty(p);
    return {
      ok: true,
      inventory: p.inventory.snapshot(),
      healed,
      hp: p.hp,
      message:
        'You recover ' +
        healed +
        ' HP. You sip your complimentary coffee. Warm, excellent, and somehow served exactly how you like it.',
    };
  }
  const amount =
    args.amount === 'all'
      ? action === 'bankDeposit'
        ? p.inventory.economy.state.coins
        : (account.settle(), account.snapshot().withdrawable)
      : args.amount;
  const result = account.transfer(
    action === 'bankDeposit' ? 'deposit' : 'withdraw',
    amount,
    p.inventory.economy.state,
  );
  if (result.ok) {
    p.inventory.save();
    dirty(p);
  }
  return { ...result, bank: account.snapshot(), inventory: p.inventory.snapshot() };
}
