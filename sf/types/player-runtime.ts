import type { Actor } from './world.ts';
import type { Health } from './controllers.ts';
export interface PlayerRuntime {
  strength: ReturnType<typeof import('../strength.ts').createStrength>;
  quests: ReturnType<typeof import('../quests.ts').createQuestLog>;
  sunglasses: ReturnType<typeof import('../sunglasses.ts').createSunglasses>;
  inebriation: ReturnType<typeof import('../inebriation.ts').createInebriation>;
  tech: ReturnType<typeof import('../tech-ventures.ts').createTechVentures>;
  social: ReturnType<typeof import('../sales-conference.ts').createSocialBusiness>;
  job: ReturnType<typeof import('../ai-lab.ts').createAILabJob>;
  interview: ReturnType<typeof import('../ai-lab.ts').createArithmeticInterview>;
  fishing: ReturnType<typeof import('../fishing.ts').createFishing>;
  deli: ReturnType<typeof import('../deli.ts').createDeli>;
  expeditions: ReturnType<typeof import('../jurassic.ts').createExpeditions>;
  keeper: ReturnType<typeof import('../monkey-escape.ts').createMonkeyPursuit>;
  police: ReturnType<typeof import('../encounters.ts').createPoliceChase>;
  health: Health;
  lastInterview: boolean;
  battle: {
    target: Actor;
    weapon?: string;
    battle: ReturnType<typeof import('../combat.ts').createAlienBattle>;
  } | null;
  battles: Map<string, ReturnType<typeof import('../combat.ts').createAlienBattle>>;
  save: (key: string) => (value: unknown) => void;
  inventoryRevision: number;
}
