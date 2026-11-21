import type { CommandResult } from '../types/network.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createUsernameForm } from '../username-form.ts';

function fixture() {
  const field = {
      value: '',
      disabled: false,
      input: () => {},
      addEventListener(_type: string, fn: () => void) {
        this.input = fn;
      },
    },
    button = { textContent: 'Save name', disabled: false },
    hint = { textContent: '', dataset: {} as Record<string, string> },
    form = {
      submit: (_event: { preventDefault: () => void }) => {},
      querySelector: (selector: string | string[]) =>
        selector.includes('input') ? field : selector.includes('save') ? button : hint,
      addEventListener(_type: string, fn: (event: { preventDefault: () => void }) => void) {
        this.submit = fn;
      },
      setAttribute() {},
      reportValidity: () => true,
    };
  let time = 1000000,
    calls = 0,
    resolve!: (value: CommandResult) => void;
  const client = {
    state: { connected: true, name: 'FogOtter123', autoName: true, renameAt: 0 },
    subscribe() {
      return () => {};
    },
    command() {
      calls++;
      return new Promise<CommandResult>(
        (done) =>
          (resolve = (value: CommandResult) => {
            if (value.ok) {
              client.state.name = value.name ?? client.state.name;
              client.state.autoName = false;
              client.state.renameAt = time + 60000;
            }
            done(value);
          }),
      );
    },
  };
  const picker = createUsernameForm(form as unknown as HTMLFormElement, {
    allowBlank: true,
    now: () => time,
  });
  return {
    field,
    button,
    hint,
    form,
    client,
    picker,
    get calls() {
      return calls;
    },
    reply: (r: CommandResult) => resolve(r),
    advance: (ms: number) => (time += ms),
  };
}

test('loading drafts survive connection and duplicate submissions share one server request', async () => {
  const f = fixture();
  f.field.value = 'HarborAda';
  f.field.input();
  f.picker.setClient(f.client);
  assert.equal(f.field.value, 'HarborAda');
  const a = f.picker.save(),
    b = f.picker.save();
  await Promise.resolve();
  assert.equal(f.calls, 1);
  assert.equal(f.button.disabled, true);
  f.reply({ ok: true, name: 'HarborAda' });
  await Promise.all([a, b]);
  assert.equal(f.field.value, 'HarborAda');
  assert.equal(f.client.state.autoName, false);
  f.advance(2000);
  f.picker.update();
  assert.match(f.hint.textContent, /58s/);
  assert.equal(f.button.disabled, true);
});

test('keeping the random name does not issue a rename or create a cooldown', async () => {
  const f = fixture();
  f.picker.setClient(f.client);
  assert.equal(f.field.value, 'FogOtter123');
  assert.match(f.hint.textContent, /first change/);
  assert.equal((await f.picker.save()).unchanged, true);
  assert.equal(f.calls, 0);
  assert.equal(f.client.state.renameAt, 0);
  f.field.value = '';
  f.field.input();
  assert.equal((await f.picker.save()).ok, true);
  assert.equal(f.calls, 0);
});

test('server naming errors preserve the draft and allow a corrected retry', async () => {
  const f = fixture();
  f.picker.setClient(f.client);
  f.field.value = 'TakenName';
  f.field.input();
  const saving = f.picker.save();
  await Promise.resolve();
  f.reply({ ok: false, message: 'That username is already taken.' });
  await saving;
  assert.equal(f.field.value, 'TakenName');
  assert.equal(f.hint.dataset.error, 'true');
  assert.match(f.hint.textContent, /taken/);
  assert.equal(f.button.disabled, false);
  f.client.state.connected = false;
  assert.equal((await f.picker.save()).ok, false);
  assert.equal(f.calls, 1);
});
