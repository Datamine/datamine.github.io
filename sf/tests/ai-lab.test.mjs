import test from 'node:test';
import assert from 'node:assert/strict';
import {
  arithmeticProblem,
  createArithmeticInterview,
  createAILabJob,
  drawAILabInterior,
  AI_INTERVIEW_SECONDS,
} from '../ai-lab.js';
import { createEconomy } from '../economy.js';
import { Mesh } from '../geometry.js';
import { drawNeuralLabAnimation, neuralBrainMesh } from '../ai-lab-interior.js';
import { createRegionalNavigation } from '../regional-navigation.js';

test('the normal interview uses all four operations, default operand ranges and exact inverse problems', () => {
  for (let operation = 0; operation < 4; operation++)
    for (const [u, v] of [
      [0, 0],
      [0.999999, 0.999999],
      [0.4, 0.7],
    ]) {
      const values = [(operation + 0.1) / 4, u, v];
      const p = arithmeticProblem(() => values.shift()),
        [left, , right] = p.text.split(' '),
        a = Number(left),
        b = Number(right);
      assert.equal(p.operation, ['add', 'subtract', 'multiply', 'divide'][operation]);
      if (operation === 0) {
        assert.ok(a >= 2 && a <= 100 && b >= 2 && b <= 100);
        assert.equal(p.answer, a + b);
      }
      if (operation === 1) {
        assert.ok(b >= 2 && b <= 100 && p.answer >= 2 && p.answer <= 100);
        assert.equal(a - b, p.answer);
      }
      if (operation === 2) {
        assert.ok(a >= 2 && a <= 12 && b >= 2 && b <= 100);
        assert.equal(p.answer, a * b);
      }
      if (operation === 3) {
        assert.ok(b >= 2 && b <= 12 && p.answer >= 2 && p.answer <= 100);
        assert.equal(a / b, p.answer);
      }
    }
});

function interview(score) {
  let now = 0;
  const game = createArithmeticInterview({ clock: () => now, random: () => 0.5 });
  game.start();
  for (let i = 0; i < score; i++) assert.ok(game.submit(String(game.state.problem.answer)));
  return {
    game,
    advance: (milliseconds) => {
      now += milliseconds;
      game.update();
    },
  };
}
test('only completed interviews with 40 or more correct answers award a job', () => {
  for (const score of [0, 39, 40, 41]) {
    const { game, advance } = interview(score),
      job = createAILabJob({ economy: createEconomy() });
    assert.equal(game.state.remaining, 120);
    assert.equal(game.result().passed, false);
    assert.equal(job.recordInterview(game.result()).ok, false);
    assert.equal(job.state.hired, false);
    advance(119999);
    assert.equal(game.state.phase, 'running');
    advance(1);
    assert.equal(game.state.phase, 'finished');
    assert.equal(game.result().elapsed, AI_INTERVIEW_SECONDS);
    assert.ok(job.recordInterview(game.result()).ok);
    assert.equal(job.state.hired, score >= 40);
    assert.equal(job.state.bestScore, score);
  }
});

test('wrong and late answers cannot score; cancellation and retry do not retain progress', () => {
  let now = 0;
  const game = createArithmeticInterview({ clock: () => now, random: () => 0 });
  assert.equal(game.submit('4'), false);
  assert.ok(game.start());
  assert.equal(game.start(), false);
  for (const input of ['', ' ', null, '4x', '2+2', '4.0', 'Infinity', '5'])
    assert.equal(game.submit(input), false);
  assert.equal(game.state.score, 0);
  assert.ok(game.submit('4'));
  assert.equal(game.state.score, 1);
  now = 120000;
  assert.equal(game.submit('4'), false);
  assert.equal(game.state.score, 1);
  assert.equal(game.result().finished, true);
  game.start();
  assert.equal(game.state.score, 0);
  game.cancel();
  now += 120000;
  assert.equal(game.result().finished, false);
  assert.equal(game.submit('4'), false);
  assert.ok(game.start());
  assert.equal(game.state.remaining, 120);
  assert.equal(game.state.score, 0);
});

test('deadline expiry catches background time even without any rendering updates', () => {
  let now = 100;
  const game = createArithmeticInterview({ clock: () => now });
  game.start();
  now += 123456;
  assert.equal(game.submit(game.state.problem.answer), false);
  assert.equal(game.state.phase, 'finished');
  assert.equal(game.state.remaining, 0);
});

test('wages pay once every two seconds inside, stop outside, and never pay an unemployed player', () => {
  const economy = createEconomy(),
    job = createAILabJob({ economy });
  job.update(60, { inside: true });
  assert.equal(economy.state.coins, 25);
  const { game, advance } = interview(40);
  advance(120000);
  job.recordInterview(game.result());
  assert.equal(job.update(1.99, { inside: true }), 0);
  assert.equal(economy.state.coins, 25);
  assert.equal(job.update(0.01, { inside: true }), 1);
  assert.equal(economy.state.coins, 26);
  assert.equal(job.update(8, { inside: true }), 4);
  assert.equal(economy.state.coins, 30);
  job.update(1.5, { inside: true });
  job.update(60, { inside: false });
  assert.equal(job.state.payElapsed, 0);
  assert.equal(economy.state.coins, 30);
  assert.equal(job.update(0.5, { inside: true }), 0);
  job.update(20, { inside: true, eligible: false });
  assert.equal(job.state.payElapsed, 0);
  for (const value of [NaN, Infinity, -2, 0]) assert.equal(job.update(value, { inside: true }), 0);
  assert.equal(economy.state.coins, 30);
  for (let i = 0; i < 120; i++) job.update(1 / 60, { inside: true });
  assert.equal(economy.state.coins, 31);
});

test('employment and best score survive reload without banking offline wages or duplicating a hiring award', () => {
  let saved;
  const economy = createEconomy(),
    job = createAILabJob({ economy, onSave: (s) => (saved = s) }),
    { game, advance } = interview(40);
  advance(120000);
  assert.equal(job.recordInterview(game.result()).hiredNow, true);
  assert.equal(job.recordInterview(game.result()).hiredNow, false);
  assert.equal(economy.state.coins, 25);
  job.update(1.5, { inside: true });
  const loaded = createAILabJob({ saved, economy });
  assert.equal(loaded.state.hired, true);
  assert.equal(loaded.state.bestScore, 40);
  assert.equal(loaded.state.payElapsed, 0);
  assert.equal(loaded.update(0.5, { inside: true }), 0);
  assert.equal(economy.state.coins, 25);
  assert.equal(
    createAILabJob({ saved: { hired: true, bestScore: 39 }, economy }).state.hired,
    false,
  );
  assert.equal(createAILabJob({ saved: null, economy }).state.hired, false);
});

test('the lab furniture is a finite native mesh with a clear central aisle and doorway', () => {
  const mesh = new Mesh(),
    lab = { x: 10, y: 20, w: 3.5, d: 3 };
  drawAILabInterior(mesh, lab, 1);
  assert.ok(mesh.data.length > 0 && mesh.data.every(Number.isFinite));
  assert.ok(mesh.data.length / 33 < 9000);
  assert.equal(lab.interiorObstacles.length, 5);
  const nav = createRegionalNavigation({
    west: lab.x,
    east: lab.x + lab.w,
    north: lab.y,
    south: lab.y + lab.d,
    walkable: () => true,
  });
  nav.setObstacles(lab.interiorObstacles);
  const start = { x: lab.x + lab.w / 2 - 0.5, y: lab.y + lab.d - 0.85 };
  for (const dx of [-0.25, 0, 0.25]) {
    const to = { x: lab.x + lab.w / 2 + dx - 0.5, y: lab.y + 1.65 - 0.5 };
    assert.ok(nav.path(start, to), 'neural equipment blocks the working aisle');
  }
  for (const polygon of lab.interiorObstacles)
    for (const [x, z] of polygon) {
      assert.ok(x > lab.x + 0.1 && x < lab.x + lab.w - 0.1);
      assert.ok(z > lab.y + 0.1 && z < lab.y + lab.d - 0.1);
    }
});

test('the folded brain and containment effects use cached geometry, animate, and respect reduced motion', () => {
  const lab = { id: 'ai-lab', x: 10, y: 20, w: 3.5, d: 3, rotation: 0.7 },
    staticMesh = new Mesh();
  drawAILabInterior(staticMesh, lab, 1);
  const brain = neuralBrainMesh(),
    before = brain.data.slice();
  assert.equal(neuralBrainMesh(), brain);
  assert.ok(brain.data.every(Number.isFinite));
  const a = new Mesh(),
    b = new Mesh(),
    stillA = new Mesh(),
    stillB = new Mesh(),
    other = new Mesh();
  drawNeuralLabAnimation(a, lab, 1, 1000);
  drawNeuralLabAnimation(b, lab, 1, 4000);
  drawNeuralLabAnimation(stillA, lab, 1, 1000, { reduced: true });
  drawNeuralLabAnimation(stillB, lab, 1, 4000, { reduced: true });
  drawNeuralLabAnimation(other, { ...lab, id: 'other' }, 1, 1000);
  assert.ok(a.data.length / 33 > 3000 && a.data.length / 33 < 5500);
  assert.ok(a.data.every(Number.isFinite));
  assert.notDeepEqual(a.data, b.data);
  assert.deepEqual(stillA.data, stillB.data);
  assert.equal(other.data.length, 0);
  assert.deepEqual(brain.data, before, 'animation mutated the cached brain');
  for (let i = 1; i < a.data.length; i += 11)
    assert.ok(a.data[i] > 1 && a.data[i] < 3.7, 'animated equipment clips the ceiling or floor');
});
