import type { CommandResult, ServerEvent } from './types/network.ts';
interface ConnectionState {
  connected: boolean;
  configured?: boolean;
  status?: string;
  reloadOnWelcome?: boolean;
}
interface CommandClient {
  state: ConnectionState;
  command: (action: string, args?: object) => Promise<CommandResult>;
}
interface ConnectionClient {
  state: ConnectionState;
  subscribe: (listener: (message: ServerEvent) => void) => unknown;
}
interface ConnectionGateOptions {
  client: ConnectionClient | null;
  element: HTMLElement;
  world: HTMLElement;
  onDisconnect?: () => void;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
  locationObject?: Pick<Location, 'href'>;
}
import { multiplayerEndpoint } from './multiplayer-client.ts';

export const SERVER_REQUIRED_MESSAGE =
  'Connection required. Gameplay resumes when the server reconnects.';
export function serverConnected<T extends { state: { connected: boolean } }>(
  client: T | null | undefined,
): client is T {
  return client?.state.connected === true;
}
export function serverCommand(
  client: CommandClient | null,
  action: string,
  args: object = {},
): Promise<CommandResult> {
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
}: ConnectionGateOptions) {
  const form = element.querySelector<HTMLElementTagNameMap['form']>('form')!,
    input = form.querySelector<HTMLElementTagNameMap['input']>('input')!,
    status = element.querySelector<HTMLElement>('[data-connection-message]')!,
    title = element.querySelector<HTMLElementTagNameMap['h2']>('h2')!;
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
        if (seenConnection && client) client.state.reloadOnWelcome = true;
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
  function guard(event: Event) {
    if (blocked && world.contains(event.target as Node | null)) {
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
  ] satisfies [string, string, string, string, string, string, string, string, string, string];
  for (const name of events)
    world.ownerDocument.addEventListener(name, guard, { capture: true, passive: false });
  client?.subscribe((message) => {
    if (message.type === 'connection') update();
  });
  return {
    update,
    setActive(value: boolean) {
      active = value;
      update();
    },
    get blocked() {
      return blocked;
    },
  };
}
