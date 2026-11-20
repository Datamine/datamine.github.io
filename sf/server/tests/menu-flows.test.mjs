import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createWorldModel } from '../../world.js';
import { createGame } from '../game.mjs';
import { createMemoryStore } from '../store.mjs';
import { player, latestResult } from './fixtures.mjs';
import { dialogueFixture } from '../../tests/helpers/dialogue-fixture.mjs';
import { npcContextActions, npcOffersAttack } from '../../npc-interactions.js';
import { neighborhoodShopDialogue } from '../../neighborhood-interactions.js';
import { NEIGHBORHOOD_SERVICES } from '../../config/neighborhood-services.js';
import { HAT_CATALOG } from '../../hat-catalog.js';
import { haberdasherDialogue } from '../../haberdashery.js';
import { createEconomy } from '../../economy.js';
import { createQuestLog, monkeyQuestDialogue } from '../../quests.js';
import { theyLiveDialogue, ALIEN_TARGETS } from '../../they-live.js';
import { createExpeditions, scientistDialogue, ahabDialogue } from '../../jurassic.js';
import { createSecretAdventures } from '../../secret-adventures.js';
import { PEQUOD } from '../../jurassic-layout.js';
import { configuredDialogue } from '../../dialogue-config.js';
import { createSaltMail, saltActivistDialogue, saltClerkDialogue } from '../../salt-mail.js';
import { rehabilitationDialogue } from '../../rehabilitation.js';
import { HAIRSTYLES } from '../../config/hairstyles.js';
import { guildDialogue } from '../../guild.js';
import { guildStatusFor } from '../guild.mjs';
import { ILLUMINATI_CAVE } from '../../map-instances.js';
import { SF_SPACEPORT } from '../../southern-district.js';

// Use production parcels, collision/navigation and authoritative handlers. The
// DOM double drives the actual dialogue UI; it does not replace its callbacks.
const geometry = createWorldModel();
geometry.hospital = geometry.sights.find((s) => s.id === 'ucsf').entry;
let time = 1_000_000,
  serial = 64000;
const game = await createGame({
  geometry,
  store: createMemoryStore(),
  now: () => time,
  random: () => 0.5,
});
after(() => game.close());
const settle = async (a) => {
  await a.p.queue;
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
const npc = (predicate) => geometry.merchants.find(predicate);
function stand(a, point) {
  Object.assign(a.p, {
    x: point.x + 0.5,
    z: point.y + 0.5,
    y: geometry.characterGround(point.x + 0.5, point.y + 0.5),
    mode: 'walk',
  });
}
function atNPC(a, n) {
  stand(a, geometry.approaches.merchant(n));
}
async function visitor(point = geometry.spawn, extra = {}) {
  const a = await player(game, ++serial, { 'sf-purse-v1': '{"coins":1000000}', ...extra });
  stand(a, point);
  return a;
}
async function act(a, action, args = {}) {
  game.receive(a.p, {
    type: 'command',
    request: serial++,
    action,
    args,
    inventoryEpoch: a.p.inventory.meta.epoch,
  });
  await a.p.queue;
  return latestResult(a.messages);
}
function stop(a) {
  game.disconnect(a.p);
}
function tick(seconds) {
  for (let left = seconds; left > 1e-8; left -= 0.05) {
    time += 50;
    game.tick(0.05);
  }
}
async function choose(a, person, labels, { ok = true, message = null } = {}) {
  const f = dialogueFixture(
    { name: a.p.name },
    { trade: (kind) => act(a, 'inventory', { op: 'trade', kind }) },
  );
  try {
    f.dialogue.open(person);
    f.click('OK');
    for (const label of labels) {
      f.click(label);
      await settle(a);
      if (f.buttons().some((b) => b.textContent === 'OK') && label !== labels.at(-1)) {
        f.click('OK');
      }
    }
    const result = latestResult(a.messages);
    if (result) assert.equal(result.ok, ok, person.name + ': ' + result.message);
    if (message) assert.match(f.element.textContent, message);
    return { text: f.element.textContent, result };
  } finally {
    f.dialogue.cancel();
    f.restore();
  }
}

test('every authored actor has usable context actions, protected actors have no attack, and players have no Examine', (t) => {
  const actors = [
    ...geometry.merchants,
    ...geometry.parrots,
    ...geometry.jailStaff,
    ...geometry.restaurantDiners,
    ...geometry.lives.flatMap((l) => l.people),
    ...geometry.expeditions.cows,
    ...geometry.wilderness.actors,
  ];
  const valid = new Set([
    'talk',
    'attack',
    'steal',
    'pet',
    'examine',
    'walk',
    'duel',
    'follow',
    'unfollow',
  ]);
  for (const actor of actors) {
    const actions = npcContextActions(actor);
    assert.ok(actions.length, actor.id);
    assert.equal(new Set(actions).size, actions.length);
    assert.ok(
      actions.every((action) => valid.has(action)),
      actor.id,
    );
    assert.ok(actions.includes('examine'));
    assert.ok(actions.includes('walk'));
    if (!npcOffersAttack(actor))
      assert.ok(!actions.includes('attack'), actor.id + ' should be protected');
  }
  assert.deepEqual(
    npcContextActions({ networkPlayer: true }, { duel: true, following: true, pvp: true }),
    ['duel', 'follow', 'unfollow', 'attack', 'walk'],
  );
  assert.deepEqual(npcContextActions({ police: true }), ['examine', 'walk']);
  t.diagnostic(`${actors.length} placed actors; player/PvP/follow/duel variants`);
});

test('every offer at every neighborhood shop executes through its real menu and commits the configured effect', async (t) => {
  let count = 0;
  for (const n of geometry.merchants.filter((n) => n.neighborhoodService))
    for (const offer of NEIGHBORHOOD_SERVICES[n.neighborhoodService].offers) {
      const a = await visitor(undefined, { 'sf-inebriation-v1': '40' });
      atNPC(a, n);
      a.p.hp = 10;
      try {
        const person = neighborhoodShopDialogue(n, (id, offer) =>
          act(a, 'playerAction', { verb: 'neighborhoodService', id, offer }),
        );
        const choice = person.choices.find((c) => c.id === offer.id);
        assert.ok(choice, n.id + ': ' + offer.id);
        const before = a.p.inventory.economy.state.coins;
        await choose(a, person, [choice.label]);
        assert.equal(
          a.p.inventory.economy.state.coins,
          before - (offer.price || 0) + (offer.reward || 0),
        );
        if (offer.heal) assert.equal(a.p.hp, 15);
        if (offer.sober) assert.equal(game.personal.runtime(a.p).inebriation.state.percent, 30);
        if (offer.bouquet) assert.equal(a.p.inventory.economy.state.bouquets, 1);
        if (offer.sandwich) assert.equal(a.p.inventory.meta.sandwiches, 1);
        if (offer.reward)
          await choose(a, person, [choice.label], { ok: false, message: /Come back/ });
        if (offer.showMs) {
          assert.equal(n.showStartedAt, time);
          time += offer.showMs + 1;
        }
        count++;
      } finally {
        stop(a);
      }
    }
  assert.ok(count > 20);
  t.diagnostic(`${count} real shop/offer combinations`);
});

test('every purchasable hat menu charges its actual price, grants ownership and selects the purchased hat', async (t) => {
  const n = npc((n) => n.kind === 'haberdasher');
  let count = 0;
  for (const hat of HAT_CATALOG.filter((h) => !h.dropOnly)) {
    const a = await visitor();
    atNPC(a, n);
    let worn = null;
    try {
      const economy = createEconomy(a.p.inventory.economy.state);
      economy.buyHat = (id) => ({
        ok: true,
        pending: true,
        promise: act(a, 'inventory', { op: 'buyHat', id }),
      });
      const person = haberdasherDialogue(n, economy, (id) => (worn = id)),
        choice = person.choices.find((c) => c.label.startsWith(hat.name + ' · '));
      await choose(a, person, [choice.label]);
      assert.equal(a.p.inventory.economy.state.coins, 1_000_000 - hat.price);
      assert.ok(a.p.inventory.economy.state.ownedHats.includes(hat.id));
      assert.equal(worn, hat.id);
      count++;
    } finally {
      stop(a);
    }
  }
  t.diagnostic(`${count} hat purchases`);
});

test('They Live menus progress from no quest through evidence, permit, weapon, reward and the unlocked battleaxe', async () => {
  const a = await visitor(),
    r = game.personal.runtime(a.p),
    clerk = npc((n) => n.questRole === 'clerk'),
    researcher = npc((n) => n.questRole === 'esoteric'),
    armorer = npc((n) => n.questRole === 'armorer');
  const quest = createQuestLog().theyLive;
  quest.certificate = () => act(a, 'playerAction', { verb: 'certificate' });
  quest.permit = () => act(a, 'playerAction', { verb: 'permit' });
  quest.weapon = () => act(a, 'playerAction', { verb: 'bayonet' });
  quest.reward = () => act(a, 'playerAction', { verb: 'skateboard' });
  const sync = () => Object.assign(quest.state, structuredClone(r.quests.theyLive.state));
  try {
    atNPC(a, clerk);
    await choose(a, theyLiveDialogue(clerk, quest), ['Ask about the office']);
    assert.equal(r.quests.theyLive.state.started, false);
    stand(a, geometry.sunglassesSite.entry);
    assert.equal((await act(a, 'playerAction', { verb: 'pickSunglasses' })).ok, true);
    sync();
    atNPC(a, clerk);
    await choose(a, theyLiveDialogue(clerk, quest), ['How do I get evidence?'], {
      message: /Berkeley/,
    });
    atNPC(a, researcher);
    await choose(a, theyLiveDialogue(researcher, quest), ['Report the aliens'], {
      message: /Certificate/,
    });
    sync();
    atNPC(a, clerk);
    await choose(a, theyLiveDialogue(clerk, quest), ['Receive alien-removal permit']);
    sync();
    atNPC(a, armorer);
    await choose(a, theyLiveDialogue(armorer, quest), ['Collect bayonet']);
    sync();
    assert.equal(r.quests.theyLive.state.bayonet, true);
    for (const target of ALIEN_TARGETS)
      assert.equal(r.quests.theyLive.defeat(target.id, { revealed: true }).ok, true);
    sync();
    atNPC(a, clerk);
    await choose(a, theyLiveDialogue(clerk, quest), ['Accept skateboard']);
    sync();
    assert.equal(r.quests.theyLive.state.skateboard, true);
    atNPC(a, armorer);
    await choose(
      a,
      theyLiveDialogue(armorer, quest, { buyBattleaxe: () => act(a, 'buyBattleaxe') }),
      ['Buy battleaxe · 50 coins'],
    );
    assert.ok(a.p.inventory.economy.state.ownedEquipment.includes('battleaxe'));
  } finally {
    stop(a);
  }
});

test('Monkey Business accepts, steals, completes and keeps its completion dialogue without repeating the reward', async () => {
  const a = await visitor(),
    r = game.personal.runtime(a.p),
    professor = npc((n) => n.id === 'ada-meridian'),
    quests = createQuestLog();
  quests.accept = () => act(a, 'playerAction', { verb: 'acceptMonkey' });
  quests.complete = () => act(a, 'playerAction', { verb: 'completeMonkey' });
  const sync = () => Object.assign(quests.state, structuredClone(r.quests.state));
  try {
    atNPC(a, professor);
    await choose(a, monkeyQuestDialogue(professor, quests), ['Accept quest']);
    sync();
    await choose(a, monkeyQuestDialogue(professor, quests), ['Where should I go?'], {
      message: /zookeeper/,
    });
    stand(a, geometry.sights.find((s) => s.id === 'zoo-monkeys').entry);
    assert.equal((await act(a, 'playerAction', { verb: 'stealMonkey' })).ok, true);
    assert.equal(r.keeper.state.phase, 'chasing');
    sync();
    atNPC(a, professor);
    await choose(a, monkeyQuestDialogue(professor, quests), ['Hand over the monkey · 25 coins']);
    sync();
    assert.equal(a.p.inventory.economy.state.coins, 1_000_025);
    assert.equal(r.quests.state.monkey, 'completed');
    await choose(a, monkeyQuestDialogue(professor, quests), ['Ask about the monkey']);
    assert.equal(a.p.inventory.economy.state.coins, 1_000_025);
  } finally {
    stop(a);
  }
});

test('salt courier choices deliver the letter while preserving the clerk’s independent quest options', async () => {
  const a = await visitor(),
    activist = npc((n) => n.kind === 'salt-activist'),
    clerk = npc((n) => n.questRole === 'clerk'),
    economy = createEconomy();
  economy.trade = (kind) => ({
    ok: true,
    pending: true,
    promise: act(a, 'inventory', { op: 'trade', kind }).then((result) => {
      Object.assign(economy.state, a.p.inventory.economy.state);
      return result;
    }),
  });
  const mail = createSaltMail(economy);
  try {
    atNPC(a, activist);
    await choose(
      a,
      saltActivistDialogue(activist, mail, economy),
      ['Take a letter · 50 coins on delivery'],
      { message: /Deliver it to the City Hall clerk/ },
    );
    assert.equal(mail.carrying, true);
    atNPC(a, clerk);
    const person = saltClerkDialogue(theyLiveDialogue(clerk, createQuestLog().theyLive), mail);
    assert.equal(person.choices.length, 2);
    await choose(a, person, ['Deliver conservation letter · 50 coins'], {
      message: /pays you 50 coins/,
    });
    assert.equal(a.p.inventory.economy.state.coins, 1_000_050);
    assert.equal(mail.carrying, false);
  } finally {
    stop(a);
  }
});

test('Jurassic dialogue actually issues a railgun, accepts shared remains and completes the recovery protocol', async () => {
  const a = await visitor(undefined, { 'sf-expeditions-v1': '{}' }),
    scientist = npc((n) => n.expeditionRole === 'scientist'),
    r = game.personal.runtime(a.p),
    expeditions = createExpeditions();
  expeditions.startQuest = () => act(a, 'playerAction', { verb: 'startRaptor' });
  expeditions.finishQuest = () => act(a, 'playerAction', { verb: 'finishRaptor' });
  try {
    atNPC(a, scientist);
    await choose(a, scientistDialogue(scientist, expeditions), ['Do you have a quest for me?'], {
      message: /Railgun issued/,
    });
    assert.equal(r.expeditions.state.railgun, true);
    Object.assign(expeditions.state, r.expeditions.state);
    await choose(a, scientistDialogue(scientist, expeditions), ['Review recovery protocol']);
    const target = game.shared.raptor;
    Object.assign(target, { phase: 'loose', hp: 1, x: a.p.x + 0.5, z: a.p.z, path: [] });
    assert.equal((await act(a, 'attack', { id: target.id, weapon: 'railgun' })).ok, true);
    const remains = [...game.shared.loot.values()].find((l) => l.lootKind === 'raptor');
    assert.ok(remains);
    assert.equal((await act(a, 'collect', { id: remains.id })).ok, true);
    Object.assign(expeditions.state, r.expeditions.state);
    atNPC(a, scientist);
    await choose(
      a,
      scientistDialogue(scientist, expeditions),
      ['Hand over the remains and demand an explanation'],
      { message: /good test/ },
    );
    assert.equal(r.expeditions.state.raptor, 'completed');
  } finally {
    stop(a);
  }
});

test('Ahab’s menu boards a private hunt, arrives at the boss, collects the cape once, and returns to the beach', async () => {
  const a = await visitor(),
    captain = npc((n) => n.id === 'captain-ahab'),
    r = game.personal.runtime(a.p),
    expeditions = createExpeditions({ saved: { railgun: true } }),
    listeners = [];
  const client = {
    state: { connected: true, id: a.p.id },
    subscribe: (fn) => listeners.push(fn),
    command: async (action, args) => {
      const before = a.messages.length,
        result = await act(a, action, args);
      for (const message of a.messages.slice(before)) for (const fn of listeners) fn(message);
      return result;
    },
  };
  const secret = createSecretAdventures({ client, ground: geometry.characterGround });
  expeditions.board = () => secret.boardKraken(expeditions);
  expeditions.returnShip = () => act(a, 'playerAction', { verb: 'returnShip' });
  const tick = () => {
    time += 50;
    game.tick(0.05);
    Object.assign(expeditions.ship, r.expeditions.ship);
    Object.assign(expeditions.state, { krakenReward: r.expeditions.state.krakenReward });
  };
  try {
    atNPC(a, captain);
    const shore = { x: a.p.x, y: a.p.y, z: a.p.z };
    await choose(
      a,
      ahabDialogue(captain, expeditions),
      ['What happened to Moby Dick?', 'Board the Pequod'],
      { message: /unfurls the sails/ },
    );
    assert.equal(a.p.instance.kind, 'kraken');
    for (let i = 0; i < 122; i++) tick();
    assert.equal(r.expeditions.ship.phase, 'fighting');
    assert.equal(r.expeditions.kraken.visible, true);
    assert.equal(a.p.x, geometry.expeditions.ship.home.x - PEQUOD.travel);
    assert.equal(
      (await act(a, 'playerAction', { verb: 'attackKraken', weapon: 'railgun' })).ok,
      true,
    );
    for (let i = 0; i < 1500 && r.expeditions.kraken.hp > 0; i++) {
      a.p.hp = a.p.max;
      tick();
    }
    assert.equal(r.expeditions.kraken.hp, 0);
    assert.equal(r.expeditions.ship.phase, 'victory');
    const loot = r.expeditions.state.loot.find((l) => l.lootKind === 'kraken');
    assert.ok(loot);
    assert.equal((await act(a, 'playerAction', { verb: 'collectPersonal', id: loot.id })).ok, true);
    assert.equal(a.p.inventory.economy.state.coins, 1_000_100);
    assert.equal(r.expeditions.state.cape, true);
    assert.equal(
      (await act(a, 'playerAction', { verb: 'collectPersonal', id: loot.id })).ok,
      false,
    );
    await choose(a, ahabDialogue(captain, expeditions), ['Sail back to shore']);
    for (let i = 0; i < 102; i++) tick();
    assert.equal(a.p.instance.kind, 'world');
    assert.deepEqual({ x: a.p.x, y: a.p.y, z: a.p.z }, shore);
    assert.ok(!ahabDialogue(captain, expeditions).choices);
    assert.match(ahabDialogue(captain, expeditions).intro, /already claimed/);
  } finally {
    stop(a);
  }
});

test('rehabilitation’s final consent leads to UCSF, a valid changed appearance and 100% inebriation', async () => {
  const a = await visitor(),
    r = game.personal.runtime(a.p),
    oldGender = a.p.appearance.gender;
  a.p.personalJailed = true;
  r.police.state.jailed = true;
  Object.assign(a.p, {
    x: geometry.detention.x,
    z: geometry.detention.z,
    y: geometry.detention.base + 0.18,
  });
  const specialist = geometry.jailStaff[0],
    f = dialogueFixture();
  try {
    f.dialogue.open(
      rehabilitationDialogue(specialist, () => act(a, 'playerAction', { verb: 'rehabilitate' })),
    );
    f.click('OK');
    f.click('Yes. Are there any side effects?');
    f.click('OK');
    f.click('All right. Begin rehabilitation.');
    assert.equal(a.p.rehabilitateAt, undefined);
    f.click('OK');
    await settle(a);
    assert.equal(latestResult(a.messages).ok, true);
    assert.ok(a.p.rehabilitateAt > time);
    time += 3600;
    game.tick(0.05);
    assert.equal(a.p.personalJailed, false);
    assert.equal(a.p.x, geometry.hospital.x + 0.5);
    assert.equal(a.p.z, geometry.hospital.y + 0.5);
    assert.equal(r.inebriation.state.percent, 100);
    assert.ok(HAIRSTYLES[a.p.appearance.gender].some((h) => h.id === a.p.appearance.hairstyle));
    assert.notEqual(a.p.appearance.gender, oldGender);
  } finally {
    f.dialogue.cancel();
    f.restore();
    stop(a);
  }
});

test('Ray’s donation menu, the Old Man, the stairs and the bomber form a complete admission journey', async () => {
  const a = await visitor(),
    ray = npc((n) => n.kind === 'guild-master'),
    elder = npc((n) => n.kind === 'illuminati-elder');
  a.p.inventory.meta.peptides = 24;
  a.p.inventory.save();
  try {
    for (let i = 0; i < 24; i++) {
      atNPC(a, ray);
      const person = guildDialogue(ray, {
        status: () => guildStatusFor(a.p, () => time),
        act: (kind) => act(a, kind === 'donate' ? 'guildDonate' : 'guildCheckIn'),
      });
      await choose(a, person, ['Donate 1 peptide · gain 1 rank']);
    }
    assert.equal(a.p.profile.guild.member, true);
    assert.equal(a.p.inventory.meta.peptides, 0);
    atNPC(a, elder);
    await choose(
      a,
      {
        ...elder,
        intro: 'Donate 250,000 coins to join the Illuminati.',
        choice: 'Donate 250,000 coins',
        accept: () => act(a, 'joinIlluminati'),
      },
      ['Donate 250,000 coins'],
    );
    assert.equal(a.p.inventory.economy.state.coins, 750000);
    stand(a, geometry.secretStairs.entry);
    assert.equal((await act(a, 'instanceEnter', { kind: 'illuminati' })).ok, true);
    Object.assign(a.p, { ...ILLUMINATI_CAVE.boarding, y: ILLUMINATI_CAVE.floor + 0.025 });
    assert.equal((await act(a, 'bomberBoard')).ok, true);
    assert.equal(a.p.mode, 'bomber');
    assert.equal(a.p.profile.bomber, true);
    assert.equal((await act(a, 'bomberReturn')).ok, true);
    Object.assign(a.p, { ...ILLUMINATI_CAVE.entrance, y: ILLUMINATI_CAVE.floor + 0.025 });
    assert.equal((await act(a, 'instanceLeave')).ok, true);
    assert.equal(a.p.instance.kind, 'world');
  } finally {
    stop(a);
  }
});

test('both real rocket attendants complete their journeys and charge only once per flight', async () => {
  const a = await visitor();
  try {
    for (const [id, destination] of [
      ['sf-spaceport', geometry.tahoe.spaceport],
      ['tahoe-spaceport', SF_SPACEPORT],
    ]) {
      const attendant = npc((n) => n.kind === 'crew' && n.siteId === id);
      atNPC(a, attendant);
      const f = dialogueFixture();
      let launched;
      try {
        f.dialogue.open(
          configuredDialogue(
            'rocket',
            attendant,
            {
              launch: () => ({
                ok: true,
                after: () => (launched = act(a, 'travel', { kind: 'rocket' })),
              }),
            },
            { destination: id === 'sf-spaceport' ? 'to Lake Tahoe' : 'back to San Francisco' },
          ),
        );
        f.click('OK');
        f.click('Launch · 1 coin');
        assert.equal(game.movement.state(a.p).rocket.state.active, false);
        f.click('OK');
        assert.equal((await launched).ok, true);
        const rocket = game.movement.state(a.p).rocket;
        tick(rocket.duration + 0.1);
        assert.equal(rocket.state.active, false);
        assert.equal(a.p.x, destination.entry.x + 0.5);
        assert.equal(a.p.z, destination.entry.y + 0.5);
        assert.equal(a.p.mode, 'walk');
      } finally {
        f.dialogue.cancel();
        f.restore();
      }
    }
    assert.equal(a.p.inventory.economy.state.coins, 999998);
  } finally {
    stop(a);
  }
});

test('the actual gondola, summit ski-rental choice and skiing form a complete return trip', async () => {
  const a = await visitor(geometry.tahoe.baseEntry),
    tahoe = game.movement.state(a.p).tahoe;
  try {
    assert.equal((await act(a, 'travel', { kind: 'gondola' })).ok, true);
    for (let i = 0; i < 3000 && tahoe.state.mode !== 'ground'; i++) tick(0.05);
    assert.equal(tahoe.state.mode, 'ground');
    assert.equal(a.p.x, tahoe.summitEntry.x + 0.5);
    assert.equal(a.p.z, tahoe.summitEntry.y + 0.5);
    const attendant = npc((n) => n.kind === 'lift');
    atNPC(a, attendant);
    const person = configuredDialogue('ski-lift', attendant, {
      rentSkis: () => act(a, 'inventory', { op: 'trade', kind: 'skis' }),
    });
    await choose(a, person, [person.choices[0].label]);
    assert.equal(tahoe.state.rented, true);
    assert.equal(a.p.inventory.economy.state.coins, 999999);
    stand(a, tahoe.summitEntry);
    assert.equal((await act(a, 'travel', { kind: 'ski' })).ok, true);
    for (let i = 0; i < 6000 && tahoe.state.mode !== 'ground'; i++) tick(0.05);
    assert.equal(tahoe.state.mode, 'ground');
    assert.equal(a.p.mode, 'walk');
    assert.ok(Math.hypot(a.p.x - tahoe.baseEntry.x - 0.5, a.p.z - tahoe.baseEntry.y - 0.5) < 4);
  } finally {
    stop(a);
  }
});

test('every placed bench accepts Sit from its visible approach and releases the player onto walkable ground', async (t) => {
  const a = await visitor(),
    benches = geometry.sights.filter((s) => s.kind === 'bench');
  assert.ok(benches.length > 10);
  try {
    for (const bench of benches) {
      stand(a, bench.entry);
      const seated = await act(a, 'activity', { mode: 'sit', seat: bench.id });
      assert.equal(seated.ok, true, bench.id + ': ' + seated.message);
      assert.equal(a.p.mode, 'bench');
      assert.equal(a.p.seat.id, bench.id);
      assert.equal((await act(a, 'activity', { mode: 'walk' })).ok, true);
      assert.equal(a.p.seat, null);
      assert.ok(geometry.landClearAt(a.p.x - 0.5, a.p.z - 0.5), bench.id + ' has a blocked exit');
    }
    t.diagnostic(`${benches.length} bench menus and exits`);
  } finally {
    stop(a);
  }
});
