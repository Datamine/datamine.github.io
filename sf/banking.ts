import type { ActionReceipt } from './types/world.ts';
import { isFiniteNumber, isSafeInteger, isRecord } from './types/json.ts';
export interface BankSnapshot {
  balance: number;
  updatedAt: number;
}

import { configuredDialogue } from './dialogue-config.ts';
export const BANK_HOUR_MS = 3600000,
  BANK_HOURLY_RATE = 0.05;
const bankLimit = Number.MAX_SAFE_INTEGER;
export function bankWholeCoins(balance: number) {
  return Math.floor(balance + Math.min(1e-8, Math.abs(balance) * Number.EPSILON * 4));
}
export function projectedBankBalance(
  snapshot: { balance?: unknown; updatedAt?: unknown } | null | undefined,
  time = Date.now(),
) {
  const value = Number(snapshot?.balance),
    balance = Number.isFinite(value) ? Math.max(0, Math.min(bankLimit, value)) : 0,
    stamp = Number(snapshot?.updatedAt),
    elapsed = Math.max(0, time - (Number.isFinite(stamp) ? stamp : time));
  if (!balance) return 0;
  const exponent = Math.min(
    (elapsed / BANK_HOUR_MS) * Math.log1p(BANK_HOURLY_RATE),
    Math.log(bankLimit / balance),
  );
  return Math.min(bankLimit, balance * Math.exp(exponent));
}
/** Interest is settled lazily on the authoritative clock, before every
 * transfer. New deposits never inherit the age of an existing deposit. */
export function createBankAccount(
  savedInput: unknown = {},
  now = Date.now,
  onSave: (value: BankSnapshot) => void = () => {},
) {
  const saved = isRecord(savedInput) ? savedInput : {};

  const state = {
    balance:
      isFiniteNumber(saved.balance) && saved.balance >= 0 ? Math.min(bankLimit, saved.balance) : 0,
    updatedAt: isSafeInteger(saved.updatedAt) && saved.updatedAt >= 0 ? saved.updatedAt : now(),
  };
  function settle() {
    state.balance = projectedBankBalance(state, now());
    state.updatedAt = Math.max(state.updatedAt, now());
    onSave({ ...state });
  }
  function snapshot() {
    return { ...state, withdrawable: bankWholeCoins(state.balance), hourlyRate: BANK_HOURLY_RATE };
  }
  function transfer(kind: string, amount: unknown, purse: { coins: number }) {
    if (
      !(['deposit', 'withdraw'] satisfies [string, string]).includes(kind) ||
      !isSafeInteger(amount) ||
      amount <= 0
    )
      return { ok: false, message: 'Enter a whole number of coins greater than zero.' };
    settle();
    if (kind === 'deposit') {
      if (amount > purse.coins)
        return {
          ok: false,
          message: 'You do not have that many coins in your purse.',
          bank: snapshot(),
        };
      if (state.balance > bankLimit - amount)
        return { ok: false, message: 'Your bank account is full.', bank: snapshot() };
      purse.coins -= amount;
      state.balance += amount;
    } else {
      if (amount > bankWholeCoins(state.balance))
        return {
          ok: false,
          message: 'You do not have that many whole coins deposited.',
          bank: snapshot(),
        };
      if (!Number.isSafeInteger(purse.coins + amount))
        return { ok: false, message: 'Your coin purse is full.', bank: snapshot() };
      state.balance = Math.max(0, state.balance - amount);
      purse.coins += amount;
    }
    onSave({ ...state });
    return {
      ok: true,
      bank: snapshot(),
      message:
        (kind === 'deposit' ? 'Deposited ' : 'Withdrew ') +
        amount.toLocaleString('en-US') +
        ' coins. ' +
        (kind === 'deposit'
          ? 'Your deposit earns 5% per hour, including while you are away.'
          : 'Your coins are now in your purse.'),
    };
  }
  return { state, settle, snapshot, transfer };
}
export function bankerDialogue(
  npc: { name?: string; label?: string },
  { open, coffee }: { open: () => void; coffee: () => ActionReceipt | Promise<ActionReceipt> },
) {
  return configuredDialogue('banker', npc, { bank: () => ({ ok: true, after: open }), coffee });
}
