import type { ConnectionSocketEvents } from '../../multiplayer-client.ts';

/** In-memory WebSocket transport; messages still pass through the production decoder. */
export class FixtureSocket {
  static last: FixtureSocket;
  readyState = 1;
  bufferedAmount = 0;
  binaryType = 'arraybuffer';
  handlers: { [K in keyof ConnectionSocketEvents]?: (event: ConnectionSocketEvents[K]) => void } =
    {};
  constructor() {
    FixtureSocket.last = this;
  }
  addEventListener<K extends keyof ConnectionSocketEvents>(
    type: K,
    fn: (event: ConnectionSocketEvents[K]) => void,
  ) {
    Object.assign(this.handlers, { [type]: fn });
  }
  send() {}
  close() {}
  message(value: unknown) {
    this.handlers.message?.({
      data:
        value instanceof ArrayBuffer || typeof value === 'string' ? value : JSON.stringify(value),
    });
  }
}
