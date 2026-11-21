import type { PlayerDocument } from './content.ts';

/** Live legacy accessors are backed by the canonical player document. */
export interface PlayerProfile {
  playerState: PlayerDocument;
  stateRevision: number;
  privateState: Record<string, string>;
  position: PlayerDocument['position'];
  inventory: PlayerDocument['inventory']['ledger'];
  collection: PlayerDocument['inventory']['collection'];
  grapplingHook: PlayerDocument['inventory']['grapplingHook'];
  guild: PlayerDocument['quests']['illuminatus']['guild'];
  illuminati: PlayerDocument['quests']['illuminatus']['initiated'];
  bomber: PlayerDocument['quests']['illuminatus']['bomberOwned'];
  bombReadyAt: PlayerDocument['vehicles']['bomber']['bombReadyAt'];
  bicycle: PlayerDocument['vehicles']['bicycle'];
  bank: PlayerDocument['finance']['bank'];
  growth: PlayerDocument['finance']['growth'];
  pvp: PlayerDocument['social']['pvp'];
  houseSearches: PlayerDocument['progress']['houseSearches'];
  personalJailed: PlayerDocument['conditions']['jailed'];
  police: PlayerDocument['conditions']['police'];
  deathPending: PlayerDocument['conditions']['deathPending'];
  awards: PlayerDocument['rewards']['pending'];
  awardSerial: PlayerDocument['rewards']['serial'];
  laborReadyAt: PlayerDocument['activities']['laborReadyAt'];
  decorativeRocketReadyAt: PlayerDocument['equipment']['decorativeRocket']['readyAt'];
  decorativeRocketBurnUntil: PlayerDocument['equipment']['decorativeRocket']['burnUntil'];
  decorativeRocketHopAt: PlayerDocument['equipment']['decorativeRocket']['hopAt'];
}
export type StoredPlayerProfile = Pick<PlayerProfile, 'playerState'>;
