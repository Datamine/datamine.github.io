export interface GrowthPosition {
  phase: 'private' | 'listed';
  cost: number;
  value: number;
  fee: number;
  listedAt?: number;
  lastAt?: number;
  history?: number[];
}
export interface GrowthSnapshot extends GrowthPosition {
  seconds: number | null;
  net: number;
}
export interface DuelOffer {
  id: string;
  from: number;
  to: number;
  fromName: string;
  toName: string;
  stake: number;
  expires: number;
}
export interface AirshipRentalStatus {
  resetAt: number;
  lastPrice: number;
  rentalPrice: number;
  recallPrice: number;
  reservedFor: number | null;
  reservedName: string | null;
  reservedUntil: number;
  active: boolean;
  pilot: string | null;
  reservedForYou: boolean;
  canRecall: boolean;
  serverTime: number;
}
