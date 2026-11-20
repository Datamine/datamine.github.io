import { multiplayerEndpoint } from './multiplayer-client.js';

export const SERVER_REQUIRED_MESSAGE =
  'Connection required. Gameplay resumes when the server reconnects.';
export const serverConnected = (client) => client?.state.connected === true;
export function serverCommand(client, action, args = {}) {
  return serverConnected(client)
    ? client.command(action, args)
    : Promise.resolve({ ok: false, message: SERVER_REQUIRED_MESSAGE });
}

/** Connection settings remain usable while the entire game is inert. */
export function createServerConnectionGate({
  client,
  element,
  world,
  onDisconnect = () => {},
  storage = localStorage,
  locationObject = location,
}) {
  const form = element.querySelector('form'),
    input = form.querySelector('input'),
    status = element.querySelector('[data-connection-message]'),
    title = element.querySelector('h2');
  let active = false,
    blocked = false,
    seenConnection = serverConnected(client);
  input.value =
    new URL(locationObject.href).searchParams.get('server') ||
    storage.getItem('sf-multiplayer-endpoint') ||
    '';
  function update() {
    const next = active && !serverConnected(client);
    if (next !== blocked) {
      blocked = next;
      world.inert = blocked;
      element.hidden = !blocked;
      if (blocked) {
        onDisconnect();
        if (seenConnection) client.state.reloadOnWelcome = true;
        input.focus({ preventScroll: true });
      }
    }
    if (serverConnected(client)) seenConnection = true;
    title.textContent = seenConnection ? 'Connection lost' : 'Connect to San Francisco';
    status.textContent =
      client?.state.status === 'Character open in another tab'
        ? 'This character is open in another tab. Close that tab and reload here.'
        : client?.state.configured
          ? 'Gameplay is paused. Reconnecting to the server…'
          : 'Enter the game server address to play.';
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = multiplayerEndpoint(input.value, locationObject.href);
    if (!value) {
      status.textContent = 'Enter a ws:// or wss:// server address. HTTPS pages require wss://.';
      return;
    }
    storage.setItem('sf-multiplayer-endpoint', value);
    const url = new URL(locationObject.href);
    url.searchParams.delete('offline');
    url.searchParams.delete('server');
    locationObject.href = url.href;
  });
  // Native inert also blocks focus and accessibility traversal. Capture guards
  // cover already queued events and programmatic activation of old controls.
  function guard(event) {
    if (blocked && world.contains(event.target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }
  const events = [
    'click',
    'pointerdown',
    'pointermove',
    'pointerup',
    'contextmenu',
    'wheel',
    'keydown',
    'input',
    'change',
    'submit',
  ];
  for (const name of events)
    world.ownerDocument.addEventListener(name, guard, { capture: true, passive: false });
  client?.subscribe((message) => {
    if (message.type === 'connection') update();
  });
  return {
    update,
    setActive(value) {
      active = value;
      update();
    },
    get blocked() {
      return blocked;
    },
  };
}
