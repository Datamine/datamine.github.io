import type { NetworkPosition } from './server.ts';
export interface TabletFlight {
  from: NetworkPosition;
  to: NetworkPosition & { label?: string };
  startedAt: number;
  destination: string;
}
