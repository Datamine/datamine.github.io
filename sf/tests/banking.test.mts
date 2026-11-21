import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createBankAccount, BANK_HOUR_MS, projectedBankBalance } from '../banking.ts';
import { createBankService } from '../bank-ui.ts';
import { createEconomy } from '../economy.ts';
import {
  drawBankInterior,
  drawBankBillboard,
  drawCoffeeCup,
  drawDrinkingCoffee,
} from '../bank-models.ts';
import { Mesh } from '../geometry.ts';

test('deposits leave the purse and accrue 5% per elapsed hour, including offline compounding', () => {
  let time = 0;
  const purse = { coins: 1000 },
    account = createBankAccount({}, () => time);
  assert.equal(account.transfer('deposit', 1000, purse).ok, true);
  assert.equal(purse.coins, 0);
  time = BANK_HOUR_MS;
  account.settle();
  assert.ok(Math.abs(account.snapshot().balance - 1050) < 1e-8);
  const restored = createBankAccount(account.state, () => time);
  time += BANK_HOUR_MS;
  restored.settle();
  assert.ok(Math.abs(restored.snapshot().balance - 1102.5) < 1e-8);
  assert.equal(restored.transfer('withdraw', 1102, purse).ok, true);
  assert.equal(purse.coins, 1102);
  assert.ok(Math.abs(restored.snapshot().balance - 0.5) < 1e-8);
});
test('late deposits do not acquire earlier interest, invalid transfers do not move funds and the clock cannot run backwards', () => {
  let time = 1000000;
  const purse = { coins: 2000 },
    bank = createBankAccount({}, () => time);
  bank.transfer('deposit', 1000, purse);
  time += BANK_HOUR_MS / 2;
  bank.transfer('deposit', 1000, purse);
  time += BANK_HOUR_MS / 2;
  bank.settle();
  assert.ok(Math.abs(bank.state.balance - (1050 + 1000 * Math.sqrt(1.05))) < 1e-8);
  const balance = bank.state.balance;
  for (const n of [-1, 0, 0.5, NaN, Infinity, '100'] satisfies [
    number,
    number,
    number,
    number,
    number,
    string,
  ])
    assert.equal(bank.transfer('withdraw', n, purse).ok, false);
  assert.equal(bank.state.balance, balance);
  time -= BANK_HOUR_MS;
  bank.settle();
  assert.equal(bank.state.balance, balance);
  assert.equal(bank.transfer('withdraw', 9999, purse).ok, false);
  assert.ok(
    Number.isFinite(projectedBankBalance({ balance: 100, updatedAt: 0 }, Number.MAX_SAFE_INTEGER)),
  );
});
test('the bank has no local transfers or coffee fallback and applies only server receipts', async () => {
  const economy = createEconomy({ coins: 1000 });
  let drinks = 0,
    calls: unknown[] = [];
  const service = createBankService({ onDrink: () => drinks++ });
  for (const action of ['deposit', 'withdraw', 'coffee', 'drink'] as const)
    assert.equal((await service.act(action, 100)).ok, false);
  assert.equal(economy.state.coins, 1000);
  assert.equal(drinks, 0);
  assert.equal(service.snapshot().balance, 0);
  const client = {
    state: {
      connected: true,
      bank: { balance: 100, updatedAt: 1000, withdrawable: 100, hourlyRate: 0.05 },
      inventory: { coffee: 1 },
    },
    command: async (...args: unknown[]) => {
      calls.push(args);
      return { ok: true };
    },
  };
  const online = createBankService({ client, now: () => 1000, onDrink: () => drinks++ });
  assert.equal(online.snapshot().balance, 100);
  await online.act('deposit', 50);
  assert.deepEqual(calls[0], ['bankDeposit', { amount: 50 }]);
  assert.equal(online.snapshot().balance, 100);
  await online.act('drink');
  assert.equal(drinks, 1);
  client.state.connected = false;
  assert.equal((await online.act('drink')).ok, false);
  assert.equal(drinks, 1);
  assert.equal(calls.length, 2);
});
test('bank furnishings, billboard and coffee animation use finite reusable geometry', () => {
  const m = new Mesh(),
    building: import('../types/interiors.ts').InteriorBuilding = { x: 0, y: 0, w: 3, d: 3 },
    signs = new Map([
      [
        'green-bank-roof',
        [
          [0, 0] satisfies [number, number],
          [1, 0] satisfies [number, number],
          [1, 1] satisfies [number, number],
          [0, 1] satisfies [number, number],
        ],
      ],
    ]);
  drawBankInterior(m, building, 1);
  drawBankBillboard(m, building, 4, signs);
  drawCoffeeCup(m, 0, 1, 0, { steam: 1 });
  for (const time of [0, 400, 800, 1200, 1599] satisfies [number, number, number, number, number])
    drawDrinkingCoffee(m, { x: 0, y: 0, angle: 0.4 }, 1, time, 0);
  assert.ok(m.data.length > 0 && m.data.every(Number.isFinite));
  assert.equal(requiredFixture(building.interiorObstacles).length, 3);
});
