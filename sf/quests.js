import { createTheyLiveQuest } from './they-live.js';
export const MONKEY_QUEST = Object.freeze({
  id: 'monkey-business',
  title: 'Monkey Business',
  professor: 'Professor Ada Meridian',
  reward: 25,
});
const questStages = ['not-started', 'accepted', 'carrying', 'completed'];
/** A small persistent state machine. Quest rewards commit exactly once. */
export function createQuestLog(saved = {}, onChange = () => {}) {
  const state = { monkey: questStages.includes(saved.monkey) ? saved.monkey : 'not-started' };
  const changed = () =>
    onChange({ ...state, theyLive: { ...theyLive.state, defeated: [...theyLive.state.defeated] } });
  const theyLive = createTheyLiveQuest(saved?.theyLive, changed);
  state.theyLive = theyLive.state;
  const change = (stage) => {
    state.monkey = stage;
    changed();
  };
  function accept() {
    if (state.monkey !== 'not-started')
      return { ok: false, message: 'This quest is already in your journal.' };
    change('accepted');
    return {
      ok: true,
      message:
        'Quest started: Monkey Business. Find the monkey habitat at San Francisco Zoo, south of the deer enclosure.',
    };
  }
  function steal() {
    if (state.monkey === 'not-started')
      return {
        ok: false,
        message:
          'The monkey eyes you suspiciously. Perhaps a professor at the California Institute for Consciousness Research could explain its academic ambitions.',
      };
    if (state.monkey !== 'accepted')
      return { ok: false, message: 'You already have your research assistant.' };
    change('carrying');
    return {
      ok: true,
      message:
        'The monkey steals your hat, then climbs onto your shoulder. Bring your new research assistant to Professor Ada Meridian.',
    };
  }
  function recover() {
    if (state.monkey !== 'carrying') return { ok: false };
    change('accepted');
    return {
      ok: true,
      message:
        'The zookeeper catches you and returns the monkey to its enclosure. The quest is still active. Rent the conveniently parked motorcycle before your next attempt.',
    };
  }
  function complete(economy) {
    if (state.monkey !== 'carrying')
      return { ok: false, message: 'First bring a monkey from the zoo.' };
    const result = economy.trade('monkey-quest');
    if (!result.ok) return result;
    change('completed');
    return {
      ok: true,
      message:
        'Quest complete: Monkey Business! You receive 25 coins. The monkey has been appointed Visiting Professor of Banana Studies.',
    };
  }
  function entry() {
    const stage = state.monkey,
      descriptions = {
        'not-started':
          'Speak to Professor Ada Meridian at the California Institute for Consciousness Research, south of Times Square.',
        accepted:
          'Steal a monkey from the zoo habitat south of the deer enclosure, then return to Professor Ada Meridian. A zookeeper will pursue you at tiger speed; rent the conveniently parked motorcycle for 5 coins before taking the monkey.',
        carrying:
          'The monkey is riding on your shoulder and the zookeeper is in pursuit! Return to Professor Ada Meridian at the institute’s main courtyard. Your rented motorcycle can outrun him.',
        completed:
          'Professor Meridian has her new colleague. The monkey negotiated tenure before opening its first banana.',
      };
    return {
      ...MONKEY_QUEST,
      stage,
      status: {
        'not-started': 'Not started',
        accepted: 'In progress',
        carrying: 'Ready to turn in',
        completed: 'Complete',
      }[stage],
      description: descriptions[stage],
    };
  }
  return {
    state,
    theyLive,
    accept,
    steal,
    recover,
    complete,
    entry,
    entries: () => [...(theyLive.state.started ? [theyLive.entry()] : []), entry()],
    get carrying() {
      return state.monkey === 'carrying';
    },
    get taken() {
      return ['carrying', 'completed'].includes(state.monkey);
    },
  };
}
export function monkeyQuestDialogue(npc, quests, economy) {
  const p = { ...npc, name: MONKEY_QUEST.professor, repeat: false, decline: 'Another time' };
  if (quests.state.monkey === 'completed')
    return {
      ...p,
      intro:
        'Our new colleague has submitted a paper titled “Banana.” It is devastatingly concise. The reviewers are furious.',
      question: 'How is the visiting professor settling in?',
      choice: 'Ask about the monkey',
      receipt:
        'He has tenure, a sunny climbing frame, and his own fruit budget. We have never had a more productive faculty member.',
    };
  if (quests.carrying)
    return {
      ...p,
      intro: 'Ah! A volunteer! And he has already stolen my pen. Clearly a natural academic.',
      question: 'Introduce your research assistant?',
      choice: 'Hand over the monkey · 25 coins',
      accept: () => quests.complete(economy),
    };
  if (quests.state.monkey === 'accepted')
    return {
      ...p,
      intro:
        'The zoo monkey habitat is just south of the deer enclosure. A left click or Steal monkey will do, but the zookeeper will give chase. Rent the conveniently parked motorcycle beforehand. We have tried advertising on academic job boards, but the benefits package was too vague.',
      question: 'Remind me of the plan?',
      choice: 'Where should I go?',
      receipt:
        'San Francisco Zoo, southwest of the city. Find the monkeys below the deer pen, then bring one back to this courtyard. Rent the conveniently parked motorcycle for five coins before taking the monkey. The zookeeper is as fast as the tiger and will chase you. Your Quest Menu keeps the instructions.',
    };
  return {
    ...p,
    intro:
      'We need a research assistant with an unprejudiced view of consciousness. Also a prehensile tail. Would you steal a monkey from the zoo? I have a very small relocation budget and a very large supply of bananas. The zookeeper runs at tiger speed, so rent the conveniently parked motorcycle before collecting our colleague.',
    question: 'Accept Monkey Business? Reward: 25 coins.',
    choice: 'Accept quest',
    accept: quests.accept,
  };
}
