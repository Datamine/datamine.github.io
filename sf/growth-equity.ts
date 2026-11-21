import { isOneOf, isRecord, isSafeInteger } from './types/json.ts';

import type { GrowthPosition, GrowthSnapshot } from './types/finance.ts';
import type { Economy } from './types/controllers.ts';
import type { ActionReceipt } from './types/world.ts';

import { GROWTH_EQUITY } from './config/finance.ts';
/** One private holding can contain several purchase batches. A listed holding
 * follows geometric Brownian motion, sampled once per wall-clock second.
 * Transfers never apply income bonuses to returned investment principal. */
export function createGrowthEquity({
  saved = null,
  economy,
  now = Date.now,
  random = Math.random,
  onSave = () => {},
  onClose = () => {},
}: {
  saved?: unknown;
  economy: Economy;
  now?: () => number;
  random?: () => number;
  onSave?: (position: GrowthPosition | null) => void;
  onClose?: (receipt: ActionReceipt & { value: number; profit: number }) => void;
}) {
  const initial = isRecord(saved) ? saved : null;
  let position: GrowthPosition | null =
    initial &&
    typeof initial.phase === 'string' &&
    (['private', 'listed'] satisfies [string, string]).includes(initial.phase) &&
    isSafeInteger(initial.cost) &&
    initial.cost > 0 &&
    initial.cost <= GROWTH_EQUITY.maxPrincipal
      ? (structuredClone(initial) as unknown as GrowthPosition)
      : null;
  if (position) {
    position.value = Math.max(
      position.cost * GROWTH_EQUITY.minMultiple,
      Math.min(position.cost * GROWTH_EQUITY.maxMultiple, Number(position.value) || position.cost),
    );
    position.fee = Math.ceil(position.cost * GROWTH_EQUITY.fee);
    if (position.phase === 'listed' && ![position.listedAt, position.lastAt].every(Number.isFinite))
      position = null;
  }
  const save = () => onSave(position ? structuredClone(position) : null),
    coins = () => economy.state.coins;
  function settle(message: string) {
    const value = Math.floor(position!.value);
    if (!Number.isSafeInteger(coins() + value))
      return { ok: false, message: 'Your coin purse cannot hold the proceeds.' };
    const profit = value - position!.cost - position!.fee;
    economy.state.coins += value;
    position = null;
    save();
    const result = {
      ok: true,
      message:
        message +
        ' You receive ' +
        value.toLocaleString('en-US') +
        ' coins (' +
        (profit >= 0 ? '+' : '') +
        profit +
        ' after the listing fee).',
      value,
      profit,
    };
    onClose(result);
    return result;
  }
  function update() {
    if (position?.phase !== 'listed') return;
    const end = position.listedAt! + GROWTH_EQUITY.seconds * 1000,
      time = Math.min(now(), end);
    let changed = false;
    while (position.lastAt! + 1000 <= time) {
      const u = Math.max(1e-9, random()),
        v = random(),
        normal = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      position.value = Math.max(
        position.cost * GROWTH_EQUITY.minMultiple,
        Math.min(
          position.cost * GROWTH_EQUITY.maxMultiple,
          position.value *
            Math.exp(GROWTH_EQUITY.volatility * normal - GROWTH_EQUITY.volatility ** 2 / 2),
        ),
      );
      position.lastAt! += 1000;
      changed = true;
      (position.history ??= []).push(Math.floor(position.value));
      position.history = position.history.slice(-48);
    }
    if (now() >= end) {
      settle('The three-minute trading window closes.');
      return;
    }
    if (changed) save();
  }
  function buy(amount: unknown) {
    update();
    if (!isOneOf(GROWTH_EQUITY.batches, amount))
      return { ok: false, message: 'Choose a 1,000, 5,000 or 10,000 coin batch.' };
    if (position?.phase === 'listed')
      return { ok: false, message: 'Sell your listed shares before buying another holding.' };
    if ((position?.cost || 0) + amount > GROWTH_EQUITY.maxPrincipal || coins() < amount)
      return { ok: false, message: 'You do not have enough coins, or this holding is full.' };
    economy.state.coins -= amount;
    const cost = (position?.cost || 0) + amount;
    position = { phase: 'private', cost, value: cost, fee: Math.ceil(cost * GROWTH_EQUITY.fee) };
    save();
    return {
      ok: true,
      message:
        'You buy ' +
        amount.toLocaleString('en-US') +
        ' coins of growth equity. Visit the stockbroker in Times Square to take it public.',
    };
  }
  function list() {
    update();
    if (position?.phase !== 'private')
      return {
        ok: false,
        message: 'You have no private growth equity to list.',
      };
    if (coins() < position.fee)
      return {
        ok: false,
        message: 'Listing costs ' + position.fee + ' coins (5% of purchase value).',
      };
    economy.state.coins -= position.fee;
    const time = now();
    Object.assign(position, {
      phase: 'listed',
      value: position.cost,
      listedAt: time,
      lastAt: time,
      history: [position.cost],
    });
    save();
    return {
      ok: true,
      message: 'Your equity is public. Listing fee: ' + position.fee + ' coins.',
    };
  }
  function sell() {
    update();
    return position?.phase === 'listed'
      ? settle('You sell your listed growth equity.')
      : { ok: false, message: 'You have no listed shares to sell.' };
  }
  function snapshot(): GrowthSnapshot | null {
    return position
      ? {
          ...structuredClone(position),
          value: Math.floor(position.value),
          seconds:
            position.phase === 'listed'
              ? Math.max(
                  0,
                  Math.ceil((position.listedAt! + GROWTH_EQUITY.seconds * 1000 - now()) / 1000),
                )
              : null,
          net: Math.floor(position.value) - position.cost - position.fee,
        }
      : null;
  }
  return { buy, list, sell, update, snapshot };
}
