import test from 'node:test';
import assert from 'node:assert/strict';
import { ALIEN_TARGETS, createTheyLiveQuest, theyLiveDialogue } from '../they-live.js';
import { createQuestLog } from '../quests.js';
import { createEconomy } from '../economy.js';
import { createSquareNPCs, squareNPCDialogue } from '../times-square-life.js';
import { TIMES_SQUARE_PROPS } from '../times-square-layout.js';
import { inSquareConstruction } from '../square-construction-layout.js';
import { timesSquareWalkable } from '../southern-layout.js';
import { Mesh } from '../geometry.js';
import { drawCharacter, getCharacterMesh, sampleCharacterPose } from '../characters.js';
import { drawPlayerSkateboard } from '../skateboard.js';
const clerk = { questRole: 'clerk' },
  professor = { questRole: 'esoteric' },
  armorer = { questRole: 'armorer' };

test('the sunglasses quest gates permits, evidence and weapons in order', () => {
  const q = createTheyLiveQuest();
  for (const role of [clerk, professor, armorer])
    assert.equal(theyLiveDialogue(role, q).accept, undefined);
  assert.match(theyLiveDialogue(clerk, q).receipt, /activity/);
  assert.equal(q.certificate().ok, false);
  assert.equal(q.permit().ok, false);
  assert.equal(q.weapon().ok, false);
  assert.equal(q.start().ok, true);
  assert.equal(q.start().ok, false);
  assert.match(theyLiveDialogue(clerk, q).receipt, /Berkeley/);
  assert.equal(theyLiveDialogue(clerk, q).accept, undefined);
  assert.equal(q.weapon().ok, false);
  assert.equal(q.permit().ok, false);
  assert.equal(theyLiveDialogue(professor, q).accept().ok, true);
  assert.equal(q.certificate().ok, false);
  assert.equal(theyLiveDialogue(clerk, q).accept().ok, true);
  assert.equal(q.permit().ok, false);
  const unarmed = q.attack(ALIEN_TARGETS[0].id, { revealed: true });
  assert.equal(unarmed.ok, true);
  assert.equal(!!unarmed.illegal, false);
  assert.equal(unarmed.lethal, undefined);
  assert.equal(theyLiveDialogue(armorer, q).accept().ok, true);
  assert.equal(q.weapon().ok, false);
});

test('only revealed aliens with a permit can be defeated; rewards cannot repeat', () => {
  const q = createTheyLiveQuest(),
    id = ALIEN_TARGETS[0].id;
  q.start();
  assert.equal(q.attack(id, { revealed: true }).illegal, true);
  assert.equal(q.defeat(id, { revealed: true }).ok, false);
  q.certificate();
  q.permit();
  q.weapon();
  assert.equal(q.attack(id, { revealed: false }).illegal, true);
  assert.equal(q.attack('ordinary-citizen', { revealed: true }).illegal, true);
  assert.equal(q.reward().ok, false);
  for (const target of ALIEN_TARGETS) {
    assert.equal(q.defeat(target.id, { revealed: true }).ok, true);
    assert.equal(q.defeat(target.id, { revealed: true }).ok, false);
  }
  assert.equal(q.state.defeated.length, ALIEN_TARGETS.length);
  assert.equal(q.entry().status, 'Ready for reward');
  assert.ok(q.entry().targets.every((t) => t.done));
  assert.match(theyLiveDialogue(clerk, q).choice, /skateboard/);
  assert.equal(theyLiveDialogue(clerk, q).accept().ok, true);
  assert.equal(q.reward().ok, false);
  assert.equal(q.state.skateboard, true);
  assert.equal(q.entry().status, 'Complete');
  assert.match(q.entry().description, /sunglasses.*keep/);
});

test('quest reload preserves both quests, partial kills and skateboard ownership', () => {
  let saved;
  const log = createQuestLog({}, (s) => {
    saved = JSON.parse(JSON.stringify(s));
  });
  log.accept();
  log.steal();
  log.theyLive.start();
  log.theyLive.certificate();
  log.theyLive.permit();
  log.theyLive.weapon();
  log.theyLive.defeat(ALIEN_TARGETS[0].id, { revealed: true });
  const restored = createQuestLog(saved);
  assert.equal(restored.carrying, true);
  assert.equal(restored.theyLive.state.defeated.length, 1);
  assert.equal(restored.entries().length, 2);
  for (const a of ALIEN_TARGETS.slice(1)) restored.theyLive.defeat(a.id, { revealed: true });
  restored.theyLive.reward();
  const completed = createQuestLog(JSON.parse(JSON.stringify(restored.state)));
  assert.equal(completed.theyLive.state.skateboard, true);
  assert.equal(completed.theyLive.reward().ok, false);
  const invalid = createTheyLiveQuest({
    started: true,
    permit: true,
    bayonet: true,
    completed: true,
    defeated: ALIEN_TARGETS.map((a) => a.id),
  });
  assert.equal(invalid.state.permit, false);
  assert.equal(invalid.state.bayonet, false);
  assert.deepEqual(invalid.state.defeated, []);
  assert.equal(invalid.state.skateboard, false);
});

test('the square has usable public conversations and all native props block their own footprints', () => {
  for (const prop of TIMES_SQUARE_PROPS)
    assert.equal(timesSquareWalkable(prop.x, prop.z), false, prop.id);
  const npcs = createSquareNPCs(),
    economy = createEconomy();
  assert.ok(npcs.length >= 5);
  for (const n of npcs) {
    if (n.questRole === 'square-foreman') {
      assert.ok(inSquareConstruction(n.x, n.z));
      assert.equal(timesSquareWalkable(n.x, n.z), false);
      continue;
    }
    if (!n.seated) assert.ok(timesSquareWalkable(n.x, n.z), n.id + ' is inside a prop');
    assert.ok(
      timesSquareWalkable(n.approach.x + 0.5, n.approach.y + 0.5),
      n.id + ' has a blocked approach',
    );
  }
  const foreman = squareNPCDialogue(
    npcs.find((n) => n.questRole === 'square-foreman'),
    economy,
  );
  assert.match(foreman.intro, /Hillsborough is being demolished and replaced with Times Square/);
  assert.ok(foreman.choices.length >= 3);
  const cafe = squareNPCDialogue(npcs[0], economy);
  assert.ok(cafe.choices[0].accept().ok);
  assert.equal(economy.state.coins, 24);
  const busker = squareNPCDialogue(npcs[2], economy);
  assert.ok(busker.choices[0].accept().ok);
  assert.equal(economy.state.coins, 23);
});

test('revealed skulls, hand-rigged bayonets and pushing skate poses have finite inexpensive meshes', () => {
  assert.notEqual(getCharacterMesh({ alien: true }), getCharacterMesh({ alien: false }));
  assert.notEqual(getCharacterMesh({ bayonet: true }), getCharacterMesh({ bayonet: false }));
  for (const alien of [true, false])
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const m = new Mesh();
      drawCharacter(m, 0, 0, 0, 0, t * 6, false, '#b38f6d', '#789b87', {
        alien,
        bayonet: true,
        mode: 'idle',
        action: 'attack',
        actionT: t,
      });
      assert.ok(m.data.every(Number.isFinite));
      assert.ok(m.data.length / 33 < 2200);
    }
  for (let phase = 0; phase < 6.3; phase += 0.2) {
    const p = sampleCharacterPose('skate', phase, { motion: 1 });
    assert.ok(p.matrices.every(Number.isFinite));
    const m = new Mesh();
    drawPlayerSkateboard(m, 0, 0, 0, 0, phase, (x, z) => x * 0.1 + z * 0.03);
    assert.ok(m.data.every(Number.isFinite));
    assert.ok(m.data.length / 33 < 1500);
  }
});
