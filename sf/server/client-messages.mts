import { isRecord, isOneOf } from '../types/json.ts';
interface ClientEnvelope {
  request?: unknown;
  privateState?: unknown;
  inventoryEpoch?: unknown;
  pose?: unknown;
  talkingTo?: unknown;
  boost?: unknown;
  gesture?: unknown;
  awardsAck?: unknown;
  time?: unknown;
  text?: unknown;
}
export type CommandMessage = ClientEnvelope & { type: 'command'; action: string; args?: unknown };
export type ClientMessage =
  | CommandMessage
  | (ClientEnvelope & {
      type: 'pose' | 'controls' | 'checkpoint' | 'ping' | 'say';
      action?: never;
    });
/** Only envelope structure is trusted here. Domain handlers validate action arguments. */
export function readClientMessage(value: unknown): ClientMessage | null {
  if (!isRecord(value)) return null;
  if (value.type === 'command') {
    if (typeof value.action !== 'string') return null;
    return { ...value, type: 'command', action: value.action };
  }
  if (isOneOf(['pose', 'controls', 'checkpoint', 'ping', 'say'] as const, value.type))
    return { ...value, type: value.type };
  return null;
}
export interface ClientHello {
  protocol?: unknown;
  token?: unknown;
  privateState?: unknown;
}
