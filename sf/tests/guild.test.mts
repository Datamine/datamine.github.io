import { requiredFixture } from './helpers/required.mts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGuildMembership,
  GUILD_RESET_MS,
  insideGuild,
  marketFarmerDialogue,
  TECHNOLOGIST_MARKET,
  GUILD_BUILDINGS,
} from '../guild.ts';
import { sightPrimaryVerb } from '../descriptions.ts';

test('guild admission requires 24 actual returns, each a full hour after the last qualifying visit', () => {
  let time = 3599999;
  const guild = createGuildMembership({}, () => time);
  assert.equal(guild.checkIn().guild.rank, 1);
  assert.equal(guild.state.visits, 0);
  time++;
  assert.equal(guild.checkIn().ok, false, 'crossing a wall-clock hour is not a full elapsed hour');
  time += GUILD_RESET_MS - 2;
  assert.equal(guild.checkIn().ok, false);
  time++;
  assert.equal(guild.checkIn().guild.rank, 2);
  for (let rank = 3; rank <= 25; rank++) {
    time += GUILD_RESET_MS;
    const result = guild.checkIn();
    assert.equal(result.guild.rank, rank);
    assert.equal(result.guild.member, rank === 25);
  }
  assert.equal(guild.state.visits, 24);
  assert.equal(time - 3599999, 24 * GUILD_RESET_MS);
});
test('waiting many hours gives one promotion, and a reconnect cannot repeat it', () => {
  let time = 1000000;
  const original = createGuildMembership({}, () => time);
  original.checkIn();
  time += 10 * GUILD_RESET_MS;
  assert.equal(original.checkIn().guild.rank, 2);
  const restored = createGuildMembership(original.state, () => time);
  assert.equal(restored.checkIn().ok, false);
  assert.equal(restored.status().nextVisitAt, time + GUILD_RESET_MS);
  let consumed = 0;
  assert.equal(restored.donate(() => false).ok, false);
  const donation = restored.donate(() => {
    consumed++;
    return true;
  });
  assert.equal(donation.guild.rank, 3);
  assert.equal(donation.guild.member, false);
  assert.equal(
    restored.status().nextVisitAt,
    time + GUILD_RESET_MS,
    'donations do not extend an existing hourly wait',
  );
  for (let i = 0; i < 22; i++)
    restored.donate(() => {
      consumed++;
      return true;
    });
  assert.equal(restored.status().member, true);
  restored.donate(() => {
    consumed++;
    return true;
  });
  assert.equal(
    consumed,
    23,
    'one hourly promotion plus 23 donations earns admission; members do not donate twice',
  );
});
test('24 peptides grant exactly 24 ranks, and a prior instant admission converts to one paid rank', () => {
  const guild = createGuildMembership({}, () => 1000000);
  let consumed = 0;
  for (let i = 1; i <= 24; i++) {
    const r = guild.donate(() => {
      consumed++;
      return true;
    });
    assert.equal(r.guild.rank, i + 1);
    assert.equal(r.guild.member, i === 24);
  }
  assert.equal(consumed, 24);
  assert.equal(guild.checkIn().guild.rank, 25);
  const migrated = createGuildMembership({ member: true, visits: 0 });
  assert.equal(migrated.status().rank, 2);
  assert.equal(migrated.status().member, false);
  const restored = createGuildMembership(migrated.state);
  assert.equal(restored.status().rank, 2, 'the old donation must only be credited once');
});
test('all dropped items default to Take, and guild membership tests honor building rotation', () => {
  for (const kind of ['loot', 'sunglasses'] satisfies [string, string])
    assert.equal(sightPrimaryVerb({ kind }), 'Take');
  const site = { x: 10, y: 20, w: 6, d: 2, rotation: Math.PI / 2 };
  assert.equal(insideGuild(site, 13, 23), true);
  assert.equal(insideGuild(site, 15, 21), false);
});

test('farmers discuss their crops without revealing spawn timers or guild shortcuts', async () => {
  const market = GUILD_BUILDINGS.find((p) => p.id === 'sunset-whole-foods');
  assert.ok(market != null, 'Missing test fixture: market');
  assert.equal(market.name, TECHNOLOGIST_MARKET);
  assert.ok(market?.signText != null, 'Missing test fixture: market.signText');
  assert.ok(market.signText.includes('\n'));
  const d = marketFarmerDialogue({ marketLine: 'There is no spoon.' });
  assert.equal(typeof d.intro === 'function' ? d.intro() : d.intro, 'There is no spoon.');
  assert.ok(d?.choices != null, 'Missing test fixture: d.choices');
  const response = requiredFixture(d.choices[0].accept)();
  assert.equal(requiredFixture(await response).ok, true);
  assert.match(requiredFixture(requiredFixture(await response).message), /crops/);
  assert.doesNotMatch(
    JSON.stringify(d) + requiredFixture(await response).message,
    /ten minutes|promotion|Rank 25|vial appears|Whole Foods/,
  );
});
