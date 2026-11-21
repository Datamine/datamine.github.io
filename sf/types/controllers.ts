import type { EconomyState } from './content.ts';
import type { ActionReceipt } from './world.ts';
import type { Point } from './geometry.ts';
export interface EconomyReceipt extends ActionReceipt {
  earned?: number;
}
export interface Economy {
  state: EconomyState;
  trade(kind: string): EconomyReceipt;
  credit(amount: unknown): EconomyReceipt;
  buyHat(id: string): EconomyReceipt;
  buyEquipment(id: string): EconomyReceipt;
  buyPhone(): EconomyReceipt;
  equipPhone(on: boolean): EconomyReceipt;
  losePhone(): EconomyReceipt;
  buyRobotaxi(): EconomyReceipt;
}
export interface Health {
  state: { hp: number; max: number };
  damage(amount: number): number;
  heal(amount?: number): number;
}
export type RouteTo = (x: number, y: number, from?: Point) => Point[] | null;
export type NearestPoint = (
  x: number,
  y: number,
  radius?: number,
  predicate?: (x: number, y: number) => boolean,
) => Point | null;
export type Strength = ReturnType<typeof import('../strength.ts').createStrength>;
export type QuestLog = ReturnType<typeof import('../quests.ts').createQuestLog>;
export type AlienQuest = ReturnType<typeof import('../they-live.ts').createTheyLiveQuest>;
export type Hitpoints = ReturnType<typeof import('../combat.ts').createHitpoints>;
export type Interview = ReturnType<typeof import('../ai-lab.ts').createArithmeticInterview>;
export type InterviewResult = ReturnType<Interview['result']>;
export type AILabJob = ReturnType<typeof import('../ai-lab.ts').createAILabJob>;
