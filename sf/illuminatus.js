import { GUILD_RESETS_REQUIRED } from './guild.js';
import { ILLUMINATI_PRICE } from './map-instances.js';

/** The journal derives progress from membership and aircraft ownership, so
 * existing initiates receive credit without repeating their purchases. */
export function illuminatusQuestEntry({
  guild = {},
  initiated = false,
  bomberOwned = false,
  inHangar = false,
} = {}) {
  const visits = Math.max(0, Math.min(GUILD_RESETS_REQUIRED, Number(guild.visits) || 0));
  const member = guild.member === true || initiated || bomberOwned;
  const joined = initiated || bomberOwned;
  const started = member || visits > 0 || guild.lastVisitAt != null;
  const stage = bomberOwned ? 'completed' : started ? 'accepted' : 'not-started';
  const description = bomberOwned
    ? 'You earned admission to the Freemasons’ Guild, joined the Illuminati, and took your personal B-2 out of its underground hangar. The aircraft and replacement privileges are yours to keep.'
    : !member
      ? 'Speak to Ray, the man in the red suit outside the Freemasons’ Guild on Nob Hill. Earn 24 promotions to reach Rank 25: return after a full hour or donate one peptide per promotion. You have ' +
        visits +
        '/24 promotions.'
      : !joined
        ? 'Your guild membership is confirmed. Go inside the lodge and speak to the Old Man. Donate ' +
          ILLUMINATI_PRICE.toLocaleString('en-US') +
          ' coins to join the Illuminati and unlock the hidden stairway.'
        : inHangar
          ? 'You have found the underground hangar. Follow the passage to the B-2 stealth bomber and board it to complete Illuminatus.'
          : 'You are an Illuminati initiate. Take the hidden stairway inside the Freemasons’ Guild, find the B-2 in the underground hangar, and board it.';
  return {
    id: 'illuminatus',
    title: 'Illuminatus',
    stage,
    status: bomberOwned ? 'Complete' : started ? 'In progress' : 'Not started',
    description,
    rewardLabel: 'Personal B-2 stealth bomber · replacement aircraft',
    targets: [
      {
        area: 'Earn guild admission through 24 promotions' + (member ? '' : ' (' + visits + '/24)'),
        done: member,
      },
      {
        area:
          'Join the Illuminati with the Old Man · ' +
          ILLUMINATI_PRICE.toLocaleString('en-US') +
          ' coins',
        done: joined,
      },
      { area: 'Descend into the hangar and board your B-2', done: bomberOwned },
    ],
  };
}
