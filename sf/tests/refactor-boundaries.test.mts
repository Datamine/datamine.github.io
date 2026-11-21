import { createEconomy } from '../economy.ts';
import { createSecretAdventures } from '../secret-adventures.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { replaceInitializers } from '../build-bundle.mts';
import { worldInputs, worldInputVersion } from '../build-world-inputs.mts';
import { createUIJob, createDOMView } from '../ui/scheduler.ts';
import { createClientControllerFactory } from '../client/controllers.ts';

test('asset inlining accepts normal module formatting and only changes the chosen initializer', () => {
  const source =
    "import {\n model,\n helper\n} from './model.js';\nconst atlasURL = new URL('texture.svg', import.meta.url);\nconst keep = 'atlasURL';";
  const changed = replaceInitializers(source, { atlasURL: "({href:'data:image/svg+xml,test'})" });
  assert.match(changed, /import \{\n model/);
  assert.match(changed, /const keep = 'atlasURL'/);
  assert.doesNotMatch(changed, /import\.meta/);
  assert.throws(() => replaceInitializers(source, { missing: '1' }), /Missing asset binding/);
});

test('map inputs exclude UI, dialogue, networking and artwork; layout edits change their version', async () => {
  const inputs = await worldInputs(),
    version = await worldInputVersion();
  assert.ok(inputs.has('sf/world/generation.ts'));
  assert.ok(inputs.has('sf/geography.ts'));
  assert.ok(!inputs.has('sf/world/hud.ts'));
  assert.ok(!inputs.has('sf/config/dialogue.ts'));
  assert.ok(![...inputs.keys()].some((file) => file.startsWith('sf/dialogues/')));
  assert.ok(!inputs.has('index.html'));
  assert.ok(![...inputs.keys()].some((k) => /\.svg$|\.png$/.test(k)));
  const root = new URL('../', import.meta.url),
    readSource = async (file: string | URL) => {
      const source = await readFile(
        new URL(typeof file === 'string' ? file.replace(/^sf\//, '') : file, root),
        'utf8',
      );
      return file === 'sf/world/hud.ts' ? source + '\nthrow Error("UI changed");' : source;
    };
  assert.equal(await worldInputVersion({ readSource }), version);
  const layout = async (file: string | URL) => {
    const source = await readFile(
      new URL(typeof file === 'string' ? file.replace(/^sf\//, '') : file, root),
      'utf8',
    );
    return file === 'sf/geography.ts' ? source + '\nexport const auditLayoutRevision=1;' : source;
  };
  assert.notEqual(await worldInputVersion({ readSource: layout }), version);
});

test('UI frame requests coalesce at 10 Hz while event refreshes apply immediately', () => {
  let time = 0,
    runs = 0;
  const update = createUIJob(() => runs++, { now: () => time });
  for (let frame = 0; frame < 60; frame++) {
    time = (frame * 1000) / 60;
    update(false);
  }
  assert.ok(runs >= 9 && runs <= 10);
  const before = runs;
  update();
  assert.equal(runs, before + 1);
  assert.equal(update(false), false);
});

test('DOM view caches handles, binds native receivers and skips unchanged text writes', () => {
  let gets = 0,
    writes = 0;
  const element = {
      _text: '',
      get textContent() {
        return this._text;
      },
      set textContent(value) {
        writes++;
        this._text = value;
      },
      focus() {
        assert.equal(this, element);
      },
    },
    $ = createDOMView({
      getElementById() {
        gets++;
        return element;
      },
    });
  for (let i = 0; i < 20; i++) $('value').textContent = 'same';
  $('value').focus();
  assert.equal(writes, 1);
  assert.equal(gets, 1);
  $('value').textContent = 'changed';
  assert.equal(writes, 2);
});

test('client views issue intents without patching domain controllers or advancing simulation', async () => {
  const calls: { action: string; args: object | undefined }[] = [],
    client = {
      state: {},
      command: async (action: string, args?: object) => {
        calls.push({ action, args });
        return { ok: true };
      },
    },
    view = createClientControllerFactory({ client }),
    state = { ...createEconomy().state, coins: 25 };
  let advances = 0;
  const source = {
      ...createEconomy(),
      state,
      trade() {
        state.coins = 0;
        return { ok: true };
      },
      update() {
        advances++;
      },
    },
    economy = view('economy', source);
  const result = economy.trade('equity');
  assert.equal(state.coins, 25);
  assert.equal(advances, 0);
  assert.equal(typeof Reflect.get(economy, 'update'), 'undefined');
  assert.notEqual(economy.trade, source.trade);
  await result.promise;
  assert.deepEqual(calls, [{ action: 'inventory', args: { op: 'trade', kind: 'equity' } }]);
  const native = createClientControllerFactory({ headless: true });
  assert.equal(native('economy', source), source, 'Node retains the real simulation API');
});

test('secret-adventure effects expire without advancing aircraft simulation', () => {
  let effects = 0,
    advances = 0;
  const base = createSecretAdventures({});
  const source = {
    ...base,
    update: () => effects++,
    bomber: {
      ...base.bomber,
      update: () => {
        advances++;
        return undefined;
      },
    },
  };
  const view = createClientControllerFactory({
    client: { state: {}, command: async () => ({ ok: false }) },
  })('secret', source);
  assert.ok('updatePresentation' in view);
  view.updatePresentation();
  assert.equal(effects, 1);
  assert.equal(advances, 0);
  assert.equal(Reflect.get(view, 'update'), undefined);
  assert.equal(Reflect.get(view.bomber, 'update'), undefined);
});
