import {
  encodePlayerFrame,
  MP_FRAME_HEADER,
  MP_PLAYER_BYTES,
  MP_PROTOCOL,
} from '../multiplayer-protocol.ts';

/** Encode each source actor once per broadcast, then copy its 32-byte record
 * to nearby observers. Compare actual wire bytes rather than rounded JSON. */
export function createPlayerFrames() {
  const records = new Map<number, { bytes: Uint8Array; version: number }>();
  let revision = 0;
  function capture(
    players:
      | Iterable<Parameters<typeof encodePlayerFrame>[0][number]>
      | ArrayLike<Parameters<typeof encodePlayerFrame>[0][number]>,
  ) {
    const actors = Array.from(players),
      frame = new Uint8Array(encodePlayerFrame(actors, 0, 0)),
      live = new Set<number>();
    for (let i = 0; i < actors.length; i++) {
      const actor = actors[i],
        bytes = frame.subarray(
          MP_FRAME_HEADER + i * MP_PLAYER_BYTES,
          MP_FRAME_HEADER + (i + 1) * MP_PLAYER_BYTES,
        ),
        previous = records.get(actor.id);
      live.add(actor.id);
      if (!previous || bytes.some((v, j) => v !== previous.bytes[j]))
        records.set(actor.id, { bytes: bytes.slice(), version: ++revision });
    }
    for (const id of records.keys()) if (!live.has(id)) records.delete(id);
  }
  function encode(actors: readonly { id: number }[], tick: number, time: number) {
    const buffer = new ArrayBuffer(MP_FRAME_HEADER + actors.length * MP_PLAYER_BYTES),
      view = new DataView(buffer),
      bytes = new Uint8Array(buffer);
    view.setUint32(0, MP_PROTOCOL, true);
    view.setUint32(4, tick >>> 0, true);
    view.setUint32(8, time >>> 0, true);
    for (let i = 0; i < actors.length; i++)
      bytes.set(records.get(actors[i].id)!.bytes, MP_FRAME_HEADER + i * MP_PLAYER_BYTES);
    return buffer;
  }
  return { capture, encode, version: (id: number) => records.get(id)?.version };
}
