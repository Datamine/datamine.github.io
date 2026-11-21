import type { TestPlayer } from './fixtures.mts';
import { requiredFixture } from '../../tests/helpers/required.mts';
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createWorldModel } from '../../world.ts';
import { auditInteractionApproaches } from '../../interaction-audit.ts';
import { createGame } from '../game.mts';
import { createMemoryStore } from '../store.mts';
import { player, latestResult } from './fixtures.mts';
import { SF_SPACEPORT } from '../../southern-district.ts';
import { createWhales, WHALE_JUMP_LEAD_MS } from '../../wildlife.ts';
import { ILLUMINATI_CAVE } from '../../map-instances.ts';
import { configuredDialogue } from '../../dialogue-config.ts';
import { createTeleportTablets } from '../../teleport-tablets.ts';
import type { Actor } from '../../types/world.ts';
import type { Point } from '../../types/geometry.ts';

// Exercise actual production geometry and command handlers. No browser clicks,
// replacement pathfinder, guessed building center or saved screenshot is used.
const geometry = createWorldModel(),
  game = await createGame({ geometry, store: createMemoryStore(), allowDebug: true });
after(() => game.close());
let serial = 20000;
async function visitor(point: Point | null, extra: { 'sf-purse-v1'?: string } | undefined = {}) {
  const a = await player(game, ++serial, {
    'sf-purse-v1':
      '{"coins":1000000,"equity":1,"grain":1,"fish":1,"sand":1,"saltLetters":1,"softwareCopies":1}',
    ...extra,
  });
  assert.ok(point != null, 'Missing test fixture: point');
  Object.assign(a.p, {
    x: point.x + 0.5,
    z: point.y + 0.5,
    y: geometry.characterGround(point.x + 0.5, point.y + 0.5),
  });
  return a;
}
async function act(a: TestPlayer, action: string, args: Record<string, unknown> = {}) {
  game.receive(a.p, {
    type: 'command',
    request: Math.random(),
    action,
    args,
    inventoryEpoch: a.p.inventory.meta.epoch,
  });
  await a.p.queue;
  return latestResult(a.messages);
}
const arrival = (n?: Actor | undefined) => geometry.approaches.merchant(requiredFixture(n));

test('every authored merchant approach and patrol waypoint is within authoritative conversation range', () => {
  const audit = auditInteractionApproaches(geometry);
  assert.ok(audit.checked > 100);
  assert.equal(audit.ok, true, audit.errors.join('\n'));
});

test('shop, quest and finance actions accept the same arrival points used by the client', async () => {
  const trades: Record<string, string> = {
    founder: 'equity',
    secondary: 'secondary',
    grain: 'grain',
    tax: 'tax',
    chef: 'fish-sale',
    'gpu-buyer': 'sand-sale',
    'software-vendor': 'sales-software-buy',
    'motorcycle-clerk': 'motorcycle-rental',
    'square-coffee': 'coffee',
    'square-busker': 'busker-tip',
    lift: 'skis',
    bartender: 'beer',
  };
  const cases: {
    n: import('../../types/world.ts').Actor;
    action: string;
    args:
      | { op: string; kind: string }
      | { op: string; store: string }
      | { op: string; id: string }
      | { op: string }
      | { amount: number }
      | {}
      | { destination: string }
      | { verb: string }
      | { verb: string; id: string }
      | undefined;
    extra: {};
  }[] = [];
  for (const n of geometry.merchants) {
    let action,
      args,
      extra = {};
    if (trades[n.kind ?? '']) {
      action = 'inventory';
      args = { op: 'trade', kind: trades[n.kind ?? ''] };
    } else if (n.kind === 'deli' || n.id === 'in-n-out-clerk') {
      action = 'inventory';
      args = { op: 'pickup', store: n.kind === 'deli' ? 'lucindas' : 'in-n-out' };
    } else if (n.kind === 'haberdasher') {
      action = 'inventory';
      args = { op: 'buyHat', id: 'paper' };
    } else if (n.kind === 'tim-apple') {
      action = 'inventory';
      args = { op: 'buyPhone' };
    } else if (n.kind === 'robotaxi-sales') {
      action = 'inventory';
      args = { op: 'buyRobotaxi' };
    } else if (n.kind === 'salt-activist') {
      action = 'inventory';
      args = { op: 'trade', kind: 'salt-letter-collect' };
      extra = { 'sf-purse-v1': '{"coins":1000000}' };
    } else if (n.kind === 'capital') {
      action = 'growthBuy';
      args = { amount: 1000 };
    } else if (n.kind === 'banker') {
      action = 'bankCoffee';
      args = {};
    } else if (n.kind === 'tablet-wizard') {
      action = 'buyTablet';
      args = { destination: 'downtown' };
    } else if (n.kind === 'guild-master') {
      action = 'guildCheckIn';
      args = {};
    } else if (n.kind === 'airship-agent') {
      action = 'airshipStatus';
      args = {};
    } else if (n.kind === 'recruiter') {
      action = 'playerAction';
      args = { verb: 'interviewStart' };
    } else if (n.kind === 'software-buyer') {
      action = 'playerAction';
      args = { verb: 'pitch', id: n.id };
    } else if (n.id === 'ada-meridian') {
      action = 'playerAction';
      args = { verb: 'acceptMonkey' };
    } else if (n.questRole === 'esoteric') {
      action = 'playerAction';
      args = { verb: 'certificate' };
      extra = { 'sf-quests-v1': '{"theyLive":{"started":true}}' };
    } else if (n.questRole === 'clerk') {
      action = 'playerAction';
      args = { verb: 'permit' };
      extra = { 'sf-quests-v1': '{"theyLive":{"started":true,"evidence":true}}' };
    } else if (n.questRole === 'armorer') {
      action = 'playerAction';
      args = { verb: 'bayonet' };
      extra = { 'sf-quests-v1': '{"theyLive":{"started":true,"evidence":true,"permit":true}}' };
    }
    if (action) cases.push({ n, action, args, extra });
  }
  assert.ok(cases.length > 25);
  for (const { n, action, args, extra } of cases) {
    const a = await visitor(arrival(n), extra),
      r = await act(a, action, args);
    assert.equal(requiredFixture(r).ok, true, n.id + ': ' + requiredFixture(r).message);
  }
  const broker = geometry.merchants.find((n) => n.kind === 'stockbroker'),
    a = await visitor(arrival(broker));
  game.finance.account(a.p).buy(1000);
  assert.equal(requiredFixture(await act(a, 'growthList')).ok, true);
  const elder = geometry.merchants.find((n) => n.id === 'illuminati-old-man'),
    initiate = await visitor(arrival(elder));
  initiate.p.profile.guild = { member: true, visits: 0 };
  const result = await act(initiate, 'joinIlluminati');
  assert.equal(requiredFixture(result).ok, true, requiredFixture(result).message);
});

test('both wizard dialogue choices purchase tablets from the authored house approach', async () => {
  const wizard = geometry.tabletWizard,
    house = geometry.places.find((p) => p.id === 'orin-house'),
    point = arrival(wizard);
  assert.equal(wizard.interior, house);
  assert.ok(point != null, 'Missing test fixture: point');
  assert.equal(geometry.placeAt(point.x, point.y), house);
  const a = await visitor(point),
    before = a.p.inventory.economy.state.coins;
  const client = {
    state: { connected: true, inventory: a.p.inventory.snapshot() },
    subscribe() {},
    async command(action: string, args?: {} | undefined) {
      const result = requiredFixture(await act(a, action, args));
      if (result.inventory) this.state.inventory = result.inventory;
      return result;
    },
  };
  const tablets = createTeleportTablets({ client }),
    dialogue = configuredDialogue('wizard', wizard, { buyTablet: (id: string) => tablets.buy(id) });
  assert.ok(dialogue?.choices != null, 'Missing test fixture: dialogue.choices');
  const purchases = dialogue.choices.filter((choice) => typeof choice.accept === 'function');
  assert.equal(purchases.length, 2);

  assert.ok(dialogue.choices.some((choice) => choice.ambientConversation));
  for (const choice of purchases) {
    assert.ok(choice?.accept != null, 'Missing test fixture: choice.accept');
    const result = await choice.accept();
    assert.equal(requiredFixture(await result).ok, true, requiredFixture(await result).message);
  }
  assert.deepEqual(tablets.inventory(), { downtown: 1, tahoe: 1 });
  assert.equal(a.p.inventory.economy.state.coins, before - 40);
  const poor = await visitor(point, { 'sf-purse-v1': '{"coins":19}' }),
    denied = await act(poor, 'buyTablet', { destination: 'tahoe' });
  assert.equal(requiredFixture(denied).ok, false);
  assert.match(requiredFixture(requiredFixture(denied).message), /20 coins/);
  assert.equal(poor.p.inventory.economy.state.coins, 19);
  assert.deepEqual(poor.p.inventory.snapshot().tablets, { downtown: 0, tahoe: 0 });
});

test('roaming rocket attendants accept direct conversation positions as well as their walking approaches', async () => {
  let checked = 0,
    outsideOldEntry = 0;
  for (const npc of geometry.merchants.filter((n) => n.kind === 'crew')) {
    const site =
        npc.siteId === Reflect.get(SF_SPACEPORT, 'id') ? SF_SPACEPORT : geometry.tahoe.spaceport,
      original = { x: npc.x, z: npc.z, base: npc.base };
    let farthest: {
      p: Point | null;
      distance: number;
      actor: { x: number; z: number; base: number | undefined };
    } | null = null;
    try {
      for (const point of requiredFixture(npc.roam).points) {
        Object.assign(npc, {
          x: point.x + 0.5,
          z: point.y + 0.5,
          base: geometry.characterGround(point.x + 0.5, point.y + 0.5) + 0.025,
        });
        const candidates = [
          arrival(npc),
          ...Array.from({ length: 8 }, (_, i) => ({
            x: point.x + Math.cos((i * Math.PI) / 4) * 1.7,
            y: point.y + Math.sin((i * Math.PI) / 4) * 1.7,
          })),
        ];
        for (const p of candidates) {
          if (
            !geometry.clearAt(requiredFixture(p).x, requiredFixture(p).y) ||
            !geometry.canTravel(
              point.x,
              point.y,
              requiredFixture(p).x,
              requiredFixture(p).y,
              true,
            ) ||
            Math.abs(
              geometry.characterGround(requiredFixture(p).x + 0.5, requiredFixture(p).y + 0.5) -
                requiredFixture(npc.base),
            ) > 2.5
          )
            continue;
          assert.ok(p != null, 'Missing test fixture: p');
          const distance = Math.hypot(p.x - site.entry.x, p.y - site.entry.y);
          if (!farthest || distance > farthest.distance)
            farthest = { p, distance, actor: { x: npc.x, z: npc.z, base: npc.base } };
        }
      }
      assert.ok(farthest);
      Object.assign(npc, farthest.actor);
      if (farthest.distance > 3) outsideOldEntry++;
      const a = await visitor(farthest.p),
        movement = game.movement.state(a.p);
      requiredFixture(movement.ferrari).mount();
      movement.mode = 'ferrari';
      a.p.mode = 'ferrari';
      const r = await act(a, 'travel', { kind: 'rocket' });
      assert.equal(requiredFixture(r).ok, true, npc.id + ': ' + requiredFixture(r).message);
      assert.equal(requiredFixture(requiredFixture(r).inventory).purse.coins, 999999);
      assert.equal(
        requiredFixture(movement.ferrari).state.riding,
        false,
        'the server parks the car even if the client never sends another input',
      );
      assert.equal(movement.mode, 'walk');
      const before = a.p.inventory.economy.state.coins;
      assert.equal(requiredFixture(await act(a, 'travel', { kind: 'rocket' })).ok, false);
      assert.equal(
        a.p.inventory.economy.state.coins,
        before,
        'repeated launch clicks cannot charge twice',
      );
      checked++;
    } finally {
      Object.assign(npc, original);
    }
  }
  assert.equal(checked, 2);
  assert.ok(
    outsideOldEntry > 0,
    'include a real conversation point rejected by the previous terminal-entry check',
  );
});

test('every pump sells cans at its live attendant and refuels only a locally parked Ferrari', async () => {
  for (const npc of geometry.merchants.filter((n) => n.kind === 'fuel-attendant')) {
    const a = await visitor(arrival(npc)),
      car = game.movement.state(a.p).ferrari,
      station = requiredFixture(car).stations.find((s) => s.id === npc.siteId);
    const can = await act(a, 'inventory', { op: 'trade', kind: 'fuel-can' });
    assert.equal(requiredFixture(can).ok, true, npc.id + ': ' + requiredFixture(can).message);
    assert.equal(
      requiredFixture(requiredFixture(can).inventory).purse.coins,
      requiredFixture(station).paid ? 0 : 1000000,
    );
    assert.equal(requiredFixture(requiredFixture(can).inventory).purse.fuelCans, 1);
    requiredFixture(car).state.fuel = 0;
    requiredFixture(car).state.distance = requiredFixture(station).distance;
    requiredFixture(car).state.localPosition = null;
    const fill = await act(a, 'playerAction', { verb: 'refuel' });
    assert.equal(requiredFixture(fill).ok, true, npc.id + ': ' + requiredFixture(fill).message);
    assert.equal(requiredFixture(car).state.fuel, 1);
    const bay = requiredFixture(car).sample(requiredFixture(station).distance);
    requiredFixture(car).state.fuel = 0;
    requiredFixture(car).state.localPosition = {
      x: bay.x + 100,
      z: bay.z + 100,
      y: bay.y,
      angle: 0,
    };
    const coins = a.p.inventory.economy.state.coins;
    assert.equal(requiredFixture(await act(a, 'playerAction', { verb: 'refuel' })).ok, false);
    assert.equal(requiredFixture(car).state.fuel, 0);
    assert.equal(a.p.inventory.economy.state.coins, coins);
  }
});

test('collectible, fishing, surf launch, gondola and cave-style world coordinates use the authored entry tiles', async () => {
  for (const [site, verb] of [
    [geometry.fishingSite, 'fish'] as const,
    [geometry.sunglassesSite, 'pickSunglasses'] as const,
  ]) {
    assert.ok(site != null, 'Missing test fixture: site');
    const a = await visitor(site.entry, { 'sf-purse-v1': '{"coins":1000000}' }),
      r = await act(a, 'playerAction', { verb });

    assert.equal(requiredFixture(r).ok, true, site.id + ': ' + requiredFixture(r).message);
  }
  assert.ok(geometry?.sandSite != null, 'Missing test fixture: geometry.sandSite');
  const sand = await visitor(geometry.sandSite.entry);
  assert.equal(
    requiredFixture(await act(sand, 'inventory', { op: 'trade', kind: 'collect-sand' })).ok,
    true,
  );
  for (const pacifica of [false, true] satisfies [boolean, boolean]) {
    const site = pacifica
        ? geometry.pacificaSurfSite
        : geometry.sights.find((s) => s.kind === 'windsurf'),
      a = await visitor(requiredFixture(site).entry);
    const r = await act(a, 'activity', { mode: 'surf', pacifica });
    assert.equal(requiredFixture(r).ok, true, JSON.stringify(r));
    assert.ok(site != null, 'Missing test fixture: site');
    const launch = pacifica ? site.launch : geometry.surf.state.launch;
    assert.ok(launch != null, 'Missing test fixture: launch');
    assert.equal(a.p.x, launch.x + 0.5);

    assert.equal(a.p.z, launch.y + 0.5);
  }
  const a = await visitor(geometry.tahoe.baseEntry);
  assert.equal(requiredFixture(await act(a, 'travel', { kind: 'gondola' })).ok, true);
  const initiate = await visitor(geometry.secretStairs.entry);
  initiate.p.profile.illuminati = true;
  initiate.p.profile.guild = { member: true, visits: 0 };
  assert.equal(
    requiredFixture(await act(initiate, 'instanceEnter', { kind: 'illuminati' })).ok,
    true,
  );
  Object.assign(initiate.p, { ...ILLUMINATI_CAVE.boarding, y: ILLUMINATI_CAVE.floor + 0.025 });
  assert.equal(requiredFixture(await act(initiate, 'bomberBoard')).ok, true);
  assert.equal(requiredFixture(await act(initiate, 'bomberReturn')).ok, true);
  Object.assign(initiate.p, ILLUMINATI_CAVE.entrance);
  assert.equal(requiredFixture(await act(initiate, 'instanceLeave')).ok, true);
});

test('dialogue holds a roaming merchant until the client releases its talking target', async () => {
  const npc = geometry.merchants.find((n) => n.kind === 'founder'),
    a = await visitor(arrival(npc)),
    before = { x: requiredFixture(npc).x, z: requiredFixture(npc).z };
  const controls = (talkingTo: string) => game.receive(a.p, { type: 'controls', talkingTo });
  assert.ok(npc != null, 'Missing test fixture: npc');
  controls(npc.id);
  for (let i = 0; i < 80; i++) game.tick(0.05);

  assert.equal(npc.x, before.x);

  assert.equal(npc.z, before.z);
  controls('');
  for (let i = 0; i < 160; i++) game.tick(0.05);

  assert.ok(Math.hypot(npc.x - before.x, npc.z - before.z) > 0.05);
});

test('a whale jump targets the displayed whale using simulation time, even after a long server uptime', async () => {
  const a = await visitor(
    requiredFixture(geometry.sights.find((s) => s.kind === 'windsurf')).entry,
  );
  assert.equal(
    requiredFixture(await act(a, 'activity', { mode: 'surf', pacifica: false })).ok,
    true,
  );
  game.shared.tick(7200);
  const target = createWhales().sample(game.shared.clock * 1000 + WHALE_JUMP_LEAD_MS, 0);
  Object.assign(a.p, { x: target.x - 4.5, z: target.z, y: 0.1, mode: 'surf' });
  const result = await act(a, 'travel', { kind: 'surfJump', index: 0 });
  assert.equal(requiredFixture(result).ok, true);
  assert.ok(game.movement.state(a.p).windsurf.state.jump);
});
