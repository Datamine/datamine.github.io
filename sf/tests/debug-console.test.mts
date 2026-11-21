import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWorldCommand, debugMapPosition, debugTilePosition } from '../debug-console.ts';
import { createCaptureAnimation } from '../capture-animation.ts';
import { createRehabilitation } from '../rehabilitation.ts';

test('commands parse signed, fractional map coordinates without evaluating code', () => {
  assert.deepEqual(parseWorldCommand(' :DEBUG '), { type: 'debug' });
  for (const [command, x, y] of [
    [':tp 32,45', 32, 45] satisfies [string, number, number],
    [':TP -12.5, +.25', -12.5, 0.25] satisfies [string, number, number],
    [':tp 1e2, -2E-1', 100, -0.2] satisfies [string, number, number],
  ]) {
    assert.deepEqual(parseWorldCommand(command), { type: 'teleport', x, y });
    const position = debugMapPosition(debugTilePosition(x, y));
    assert.ok(Math.abs(position.x - x) < 1e-10 && Math.abs(position.y - y) < 1e-10);
  }
  for (const command of [
    ':tp 1 2',
    ':tp 1,',
    ':tp NaN,2',
    ':tp Infinity,2',
    ':tp 1e999,2',
    ':tp 1000001,2',
    ':tp 1,2;alert(1)',
    ':debug now',
    ':tp (2+2),4',
  ] satisfies [string, string, string, string, string, string, string, string, string])
    assert.ok('error' in parseWorldCommand(command), command);
});

test('teleport can discard pending capture and rehabilitation arrivals', () => {
  let arrivals = 0;
  const capture = createCaptureAnimation(),
    rehab = createRehabilitation(() => arrivals++);
  capture.start('police', 0, () => arrivals++);
  rehab.start();
  capture.update(0.5);
  rehab.update(0.5);
  capture.cancel();
  rehab.cancel();
  capture.update(20);
  rehab.update(20);
  assert.equal(arrivals, 0);
  assert.equal(capture.state.active, false);
  assert.equal(rehab.state.active, false);
  assert.ok(capture.start('tiger', 0, () => arrivals++));
  assert.ok(rehab.start());
  capture.update(20);
  rehab.update(20);
  assert.equal(arrivals, 2);
});
