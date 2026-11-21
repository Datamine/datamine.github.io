import type { Point } from './geometry.ts';
import type { NetworkPosition } from './server.ts';
export interface MovementRuntime {
  route: Point[];
  mode: string;
  speed: number;
  boost: boolean;
  bomber: ReturnType<typeof import('../stealth-bomber.ts').createStealthBomber>;
  ferrari: ReturnType<typeof import('../ferrari.ts').createFerrari> | null;
  rocket: ReturnType<typeof import('../rocket.ts').createRocketTravel>;
  tahoeValue: ReturnType<typeof import('../tahoe.ts').createTahoe> | null;
  readonly tahoe: ReturnType<typeof import('../tahoe.ts').createTahoe>;
  sutro: ReturnType<typeof import('../sutro.ts').createSutroClimb>;
  checked: Point | null;
  wave: ReturnType<typeof import('../surfing.ts').createSurfing>;
  windsurf: ReturnType<typeof import('../windsurfing.ts').createWindsurfing>;
  whales: ReturnType<typeof import('../wildlife.ts').createWhales>;
  routeRevision?: number;
  rollUntil?: number;
  rollStartedAt?: number;
  surfKind?: string;
  travelReturn?: NetworkPosition;
}
