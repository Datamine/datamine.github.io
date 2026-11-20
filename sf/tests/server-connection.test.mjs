import test from 'node:test';
import assert from 'node:assert/strict';
import { createMultiplayerClient, bootMultiplayer } from '../multiplayer-client.js';
import { createServerConnectionGate, serverCommand } from '../server-connection.js';
import { createDialogue } from '../dialogue.js';

const memory = () => {
  const values = new Map([['sf-mp-identity', 'a'.repeat(64)]]);
  return { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
};
class Socket {
  static instances = [];
  constructor() {
    Socket.instances.push(this);
    this.readyState = 1;
    this.bufferedAmount = 0;
    this.handlers = {};
    this.sent = [];
  }
  addEventListener(type, fn) {
    this.handlers[type] = fn;
  }
  send(value) {
    this.sent.push(JSON.parse(value));
  }
  close() {
    this.readyState = 3;
    this.handlers.close?.({ code: 1000 });
  }
  message(message) {
    this.handlers.message({ data: JSON.stringify(message) });
  }
}
const welcome = {
  type: 'welcome',
  id: 1,
  name: 'Test',
  time: Date.now(),
  privateState: {},
  position: { x: 1, y: 1, z: 1 },
  shared: { npcs: [] },
};

test('world and private movement share server sample times rather than jittery arrival times', async () => {
  let time = 1000;
  const client = createMultiplayerClient({
      endpoint: 'ws://localhost/ws',
      storage: memory(),
      WebSocketClass: Socket,
      now: () => time,
    }),
    socket = Socket.instances.at(-1),
    events = [];
  client.subscribe((m) => events.push(m));
  try {
    socket.message({ ...welcome, time: 100000 });
    await client.first;
    time = 1250;
    socket.message({ type: 'world', time: 100200, state: { population: 1 } });
    time = 1405;
    socket.message({ type: 'world', time: 100400, state: { population: 1 } });
    const samples = events.filter((m) => m.type === 'world');
    assert.deepEqual(
      samples.map((m) => m.sampleTime),
      [1200, 1400],
    );
    time = 1470;
    socket.message({
      type: 'playerState',
      time: 100400,
      state: { police: { wanted: true, officers: [] } },
    });
    assert.equal(events.at(-1).sampleTime, 1400);
    assert.equal(client.state.personalSampleAt, client.state.worldSampleAt);
    time = 1600;
    socket.message({ type: 'world', state: { population: 1 } });
    assert.equal(events.at(-1).sampleTime, 1600, 'older servers remain compatible');
  } finally {
    client.stop();
  }
});

test('missing configuration still supplies a disconnected client, never a single-player mode', async () => {
  const count = Socket.instances.length,
    client = createMultiplayerClient({ endpoint: null, storage: memory(), WebSocketClass: Socket });
  try {
    assert.equal(await client.first, null);
    assert.equal(client.state.connected, false);
    assert.equal(client.state.configured, false);
    assert.equal(Socket.instances.length, count);
    assert.equal((await client.command('moveTo', { x: 10, z: 10 })).ok, false);
    assert.equal(client.say('yo'), false);
  } finally {
    client.stop();
  }
});

test('socket loss rejects pending actions, clears peers and emits the connection gate transition', async () => {
  const client = createMultiplayerClient({
      endpoint: 'ws://localhost/ws',
      storage: memory(),
      WebSocketClass: Socket,
    }),
    socket = Socket.instances.at(-1),
    events = [];
  client.subscribe((m) => events.push(m));
  try {
    socket.message(welcome);
    await client.first;
    client.peers.set(2, { id: 2 });
    const pending = client.command('buyTablet', { destination: 'tahoe' });
    socket.close();
    assert.equal((await pending).ok, false);
    assert.equal(client.peers.size, 0);
    assert.equal(client.state.connected, false);
    assert.ok(events.some((m) => m.type === 'connection' && m.connected === false));
    const sent = socket.sent.length;
    assert.equal(
      (await serverCommand(client, 'inventory', { op: 'trade', kind: 'tax' })).ok,
      false,
    );
    assert.equal(socket.sent.length, sent);
    socket.message(welcome);
    assert.equal(
      client.state.connected,
      false,
      'a late packet from a closed socket cannot restore gameplay',
    );
  } finally {
    client.stop();
  }
});

test('legacy offline URLs cannot bypass the server requirement', async () => {
  const saved = {
    location: globalThis.location,
    localStorage: globalThis.localStorage,
    document: globalThis.document,
  };
  globalThis.location = { href: 'file:///tmp/explore.html?offline=1', protocol: 'file:' };
  globalThis.localStorage = memory();
  globalThis.document = { getElementById: () => null };
  let client;
  try {
    client = await bootMultiplayer();
    assert.ok(client);
    assert.equal(client.state.connected, false);
    assert.equal(client.state.configured, false);
  } finally {
    client?.stop();
    for (const [key, value] of Object.entries(saved))
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
  }
});

test('a silent open socket stops gameplay instead of waiting indefinitely for a close event', async () => {
  let time = 0;
  const client = createMultiplayerClient({
      endpoint: 'ws://localhost/ws',
      storage: memory(),
      WebSocketClass: Socket,
      now: () => time,
    }),
    socket = Socket.instances.at(-1);
  try {
    socket.message(welcome);
    await client.first;
    time = 7000;
    await new Promise((resolve) => setTimeout(resolve, 1100));
    assert.equal(client.state.connected, false);
    assert.equal(socket.readyState, 3);
    assert.equal((await client.command('moveTo', { x: 10, z: 10 })).ok, false);
  } finally {
    client.stop();
  }
});

// Minimal DOM fixture tests actual option callbacks, rather than source strings.
function dom() {
  const doc = {
    activeElement: null,
    listeners: new Map(),
    addEventListener(name, fn) {
      this.listeners.set(name, fn);
    },
  };
  class Element {
    constructor(tag = 'div') {
      this.tagName = tag;
      this.children = [];
      this.hidden = false;
      this.dataset = {};
      this.listeners = {};
      this.ownerDocument = doc;
      this.classes = new Set();
      this.classList = { add: (x) => this.classes.add(x), remove: (x) => this.classes.delete(x) };
    }
    append(...children) {
      this.children.push(...children);
    }
    replaceChildren(...children) {
      this.children = children;
    }
    addEventListener(name, fn) {
      this.listeners[name] = fn;
    }
    focus() {
      doc.activeElement = this;
    }
    contains(target) {
      return target === this || this.children.some((c) => c.contains?.(target));
    }
    querySelectorAll(selector) {
      const found = [];
      for (const child of this.children) {
        if (child.tagName === 'button' && (!selector.includes('disabled') || !child.disabled))
          found.push(child);
        found.push(...child.querySelectorAll(selector));
      }
      return found;
    }
    querySelector(selector) {
      return this.querySelectorAll(selector)[0];
    }
    click() {
      this.listeners.click?.();
    }
  }
  doc.createElement = (tag) => new Element(tag);
  return { doc, Element };
}

test('disconnected dialogue cannot open, execute a choice, apply a delayed reply or run an after-action', async () => {
  const { doc, Element } = dom(),
    previous = globalThis.document;
  globalThis.document = doc;
  let connected = false,
    actions = 0,
    after = 0,
    resolve;
  const notices = [],
    element = new Element(),
    dialogue = createDialogue({
      element,
      journal: new Element(),
      log: new Element(),
      canInteract: () => connected,
      trade: () => assert.fail('unexpected trade'),
      announce: (m) => notices.push(m),
    });
  const person = {
    name: 'Merchant',
    intro: 'Hello',
    choice: 'Purchase',
    accept: () => {
      actions++;
      return new Promise((r) => (resolve = r));
    },
  };
  try {
    assert.equal(dialogue.open(person), false);
    connected = true;
    dialogue.open(person);
    element.querySelector('button').click();
    const buy = element.querySelector('button');
    connected = false;
    buy.click();
    assert.equal(actions, 0);
    assert.equal(dialogue.active, false);
    connected = true;
    dialogue.open(person);
    element.querySelector('button').click();
    element.querySelector('button').click();
    assert.equal(actions, 1);
    connected = false;
    dialogue.cancel();
    resolve({ ok: true, message: 'Paid', after: () => after++ });
    await Promise.resolve();
    assert.deepEqual(notices, []);
    assert.equal(after, 0);
    assert.equal(dialogue.resolvePending(undefined, 'Paid'), false);
    connected = true;
    dialogue.open({
      ...person,
      accept: () => ({ ok: true, message: 'Ready', after: () => after++ }),
    });
    element.querySelector('button').click();
    element.querySelector('button').click();
    connected = false;
    dialogue.cancel();
    assert.equal(after, 0);
  } finally {
    globalThis.document = previous;
  }
});

test('the connection screen makes the world inert, captures old controls, and keeps server settings usable', () => {
  const { doc, Element } = dom(),
    world = new Element(),
    oldButton = new Element('button');
  world.append(oldButton);
  const element = new Element(),
    form = new Element('form'),
    input = new Element('input'),
    status = new Element(),
    title = new Element('h2');
  form.querySelector = () => input;
  element.querySelector = (s) => (s === 'form' ? form : s === 'h2' ? title : status);
  let subscriber,
    disconnects = 0;
  const client = {
      state: { connected: true, configured: true, status: 'Online' },
      subscribe: (f) => (subscriber = f),
    },
    storage = memory(),
    locationObject = { href: 'http://localhost/explore.html?offline=1' },
    gate = createServerConnectionGate({
      client,
      world,
      element,
      storage,
      locationObject,
      onDisconnect: () => disconnects++,
    });
  gate.setActive(true);
  assert.equal(gate.blocked, false);
  client.state.connected = false;
  subscriber({ type: 'connection' });
  assert.equal(world.inert, true);
  assert.equal(element.hidden, false);
  assert.equal(disconnects, 1);
  assert.equal(client.state.reloadOnWelcome, true);
  let prevented = 0,
    stopped = 0;
  const event = (target) => ({
    target,
    preventDefault: () => prevented++,
    stopImmediatePropagation: () => stopped++,
  });
  doc.listeners.get('click')(event(oldButton));
  assert.equal(prevented, 1);
  assert.equal(stopped, 1);
  doc.listeners.get('input')(event(input));
  assert.equal(prevented, 1);
  input.value = 'ws://localhost:8787/ws';
  form.listeners.submit(event(form));
  assert.equal(storage.getItem('sf-multiplayer-endpoint'), input.value);
  assert.equal(new URL(locationObject.href).searchParams.has('offline'), false);
  gate.setActive(false);
  assert.equal(element.hidden, true);
  assert.equal(world.inert, false);
});
