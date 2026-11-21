import type { GuildProgress } from './types/content.ts';
import { GUILD_RESETS_REQUIRED } from './guild.ts';

/** The journal derives progress from membership and aircraft ownership, so
 * existing initiates receive credit without repeating their purchases. */
export function illuminatusQuestEntry({
  guild = {},
  initiated = false,
  bomberOwned = false,
  inHangar = false,
}: {
  guild?: Partial<GuildProgress>;
  initiated?: boolean;
  bomberOwned?: boolean;
  inHangar?: boolean;
} = {}) {
  const visits = Math.max(0, Math.min(GUILD_RESETS_REQUIRED, Number(guild.visits) || 0));
  const member = guild.member === true || initiated || bomberOwned;
  const joined = initiated || bomberOwned;
  const started = member || visits > 0 || guild.lastVisitAt != null;
  const stage = bomberOwned ? 'completed' : started ? 'accepted' : 'not-started';
  const description = bomberOwned
    ? 'You earned admission to the Freemasons’ Guild, joined the Illuminati, and took your personal B-2 out of its underground hangar. The aircraft and replacement privileges are yours to keep.'
    : !member
      ? 'You have begun the guild’s admissions process. Current rank: ' + (visits + 1) + '.'
      : !joined
        ? 'Your guild membership is confirmed.'
        : inHangar
          ? 'You have discovered an underground hangar.'
          : 'You have joined the Illuminati.';
  return {
    id: 'illuminatus',
    title: 'Illuminatus',
    stage,
    status: bomberOwned ? 'Complete' : started ? 'In progress' : 'Not started',
    description,
    rewardLabel: 'Personal B-2 stealth bomber · replacement aircraft',
    targets: [
      {
        area: 'Guild membership confirmed',
        done: member,
      },
      {
        area: 'Joined the Illuminati',
        done: joined,
      },
      { area: 'Boarded your B-2', done: bomberOwned },
    ],
  };
}
