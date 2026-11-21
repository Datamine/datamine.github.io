import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEconomy } from '../economy.ts';
import { createInebriation } from '../inebriation.ts';
import {
  createSocialBusiness,
  softwareSalesChance,
  softwareSalesDialogue,
} from '../sales-conference.ts';

const setup = (
  percent = 0,
  random: { (): number; (): number; (): number; (): number } | undefined = () => 0,
  saved: Parameters<typeof createEconomy>[0] = { coins: 25 },
) => {
  const economy = createEconomy(saved),
    inebriation = createInebriation(percent),
    events: Parameters<NonNullable<Parameters<typeof createSocialBusiness>[0]['onEvent']>>[0][] =
      [];
  const game = createSocialBusiness({
    economy,
    inebriation,
    random,
    onEvent: (e) => events.push(e),
  });
  return {
    economy,
    inebriation,
    game,
    events,
    npc: {
      id: 'prospect',
      kind: 'software-buyer',
      name: 'Software salesman',
      thinking: false,
      waiting: false,
    },
  };
};
test('sales software purchases are atomic, saved, repeatable, and require inventory to sell', () => {
  const { economy, game, npc } = setup();
  assert.equal(game.startPitch(npc).ok, false);
  assert.equal(economy.trade('sales-software-sale').ok, false);
  assert.equal(economy.trade('sales-software-buy').ok, true);
  assert.equal(economy.state.coins, 15);
  assert.equal(economy.state.softwareCopies, 1);
  assert.equal(economy.trade('sales-software-buy').ok, true);
  assert.equal(economy.state.coins, 5);
  assert.equal(economy.state.softwareCopies, 2);
  assert.equal(economy.trade('sales-software-buy').ok, false);
  assert.equal(economy.state.softwareCopies, 2);
  assert.equal(createEconomy(JSON.parse(JSON.stringify(economy.state))).state.softwareCopies, 2);
  for (const value of [-1, 1.4, '3', null, Infinity])
    assert.equal(createEconomy({ softwareCopies: value }).state.softwareCopies, 0);
});
test('every pitch takes ten active seconds, pays once, and consumes only a successful copy', () => {
  const { economy, game, npc, events } = setup();
  economy.trade('sales-software-buy');
  assert.equal(game.startPitch(npc).pending, true);
  assert.equal(npc.thinking, true);
  assert.equal(game.startPitch({ id: 'another' }).ok, false);
  assert.equal(game.update(9.999), null);
  assert.equal(economy.state.coins, 15);
  assert.equal(economy.state.softwareCopies, 1);
  const decision = game.update(0.001);
  assert.ok(decision != null, 'Missing test fixture: decision');
  assert.equal(decision.accepted, true);
  assert.equal(economy.state.coins, 35);
  assert.equal(economy.state.softwareCopies, 0);
  assert.equal(npc.thinking, false);
  assert.equal(npc.waiting, false);
  game.update(100);
  assert.equal(events.length, 1);
  assert.equal(economy.state.coins, 35);
});
test('a refusal or cancellation keeps the copy, and another pitch can be attempted', () => {
  const { economy, game, npc } = setup(0, () => 0.1);
  economy.trade('sales-software-buy');
  game.startPitch(npc);
  assert.equal(requiredFixture(game.update(10)).accepted, false);
  assert.equal(economy.state.softwareCopies, 1);
  assert.equal(economy.state.coins, 15);
  assert.equal(game.startPitch(npc).ok, true);
  game.update(5);
  assert.equal(game.cancelPitch(), true);
  assert.equal(npc.thinking, false);
  assert.equal(economy.state.softwareCopies, 1);
  assert.equal(game.cancelPitch(), false);
  game.update(20);
  assert.equal(economy.state.coins, 15);
});
test('purchase odds rise monotonically from 10% to exactly 50%, and are locked when pitched', () => {
  assert.equal(softwareSalesChance(0), 0.1);
  assert.ok(Math.abs(softwareSalesChance(50) - 0.3) < 1e-12);
  assert.equal(softwareSalesChance(100), 0.5);
  assert.equal(softwareSalesChance(-100), 0.1);
  assert.equal(softwareSalesChance(200), 0.5);
  assert.equal(softwareSalesChance(NaN), 0.1);
  let previous = 0;
  for (let p = 0; p <= 100; p++) {
    const chance = softwareSalesChance(p);
    assert.ok(chance >= previous && chance <= 0.5);
    previous = chance;
  }
  const { economy, inebriation, game, npc } = setup(100, () => 0.4999);
  economy.trade('sales-software-buy');
  game.startPitch(npc);
  inebriation.set(0);
  assert.equal(requiredFixture(game.update(10)).accepted, true);
  const f = setup(100, () => 0.5);
  f.economy.trade('sales-software-buy');
  f.game.startPitch(f.npc);
  assert.equal(requiredFixture(f.game.update(10)).accepted, false);
});
test('Twitter adds three percentage points per visible second, caps at 100, and sobers normally outside', () => {
  const { inebriation, game } = setup();
  for (let i = 0; i < 100; i++) game.update(0.1, { insideTwitter: true });
  assert.ok(Math.abs(inebriation.state.percent - 30) < 1e-8);
  game.update(50, { insideTwitter: true });
  assert.equal(inebriation.state.percent, 100);
  game.update(3);
  assert.equal(inebriation.state.percent, 99);
  game.update(500);
  assert.equal(inebriation.state.percent, 0);
  for (const dt of [NaN, Infinity, -2] satisfies [number, number, number])
    game.update(dt, { insideTwitter: true });
  assert.equal(inebriation.state.percent, 0);
});
test('pitch and inebriation clocks exclude hidden time and ignore backwards timestamps', () => {
  const { economy, game, npc, inebriation } = setup();
  economy.trade('sales-software-buy');
  game.startPitch(npc);
  game.advanceTo(1000, { insideTwitter: true });
  game.advanceTo(6000, { insideTwitter: true });
  assert.equal(inebriation.state.percent, 15);
  assert.ok(game?.state?.pitch != null, 'Missing test fixture: game.state.pitch');
  assert.equal(game.state.pitch.remaining, 5);
  game.advanceTo(2000, { insideTwitter: true });

  assert.equal(game.state.pitch.remaining, 5);
  game.advanceTo(20000, { eligible: false });
  game.advanceTo(900000, { insideTwitter: true });
  assert.equal(inebriation.state.percent, 15);
  assert.equal(requiredFixture(game.advanceTo(905000, { insideTwitter: true })).accepted, true);
  assert.equal(inebriation.state.percent, 30);
  game.suspend();
  game.advanceTo(999999, { insideTwitter: true });
  assert.equal(inebriation.state.percent, 30);
});
test('vendor dialogue buys for ten coins and successful resales honor the equipped iPhone bonus', async () => {
  const s = setup(100, () => 0, { coins: 25, iphoneOwned: true, iphoneEquipped: true }),
    vendor = softwareSalesDialogue(
      { id: 'prospect', kind: 'software-vendor' },
      s.economy,
      s.game,
      s.inebriation,
    );
  assert.ok(vendor?.choices != null, 'Missing test fixture: vendor.choices');
  assert.equal(vendor.choices[0].trade, 'sales-software-buy');
  assert.equal(vendor.repeat, true);

  s.economy.trade(vendor.choices[0].trade);
  const buyer = softwareSalesDialogue(s.npc, s.economy, s.game, s.inebriation);
  assert.ok(buyer?.choices != null, 'Missing test fixture: buyer.choices');
  assert.equal(
    requiredFixture(await requiredFixture(await requiredFixture(buyer.choices[0].accept)()))
      .pending,
    true,
  );
  const result = s.game.update(10);
  assert.ok(result != null, 'Missing test fixture: result');
  assert.equal(result.earned, 25);
  assert.equal(s.economy.state.coins, 40);
  assert.equal(s.economy.state.softwareCopies, 0);
});
