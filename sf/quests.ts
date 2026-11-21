import type { QuestJournalEntry } from './quest-menu.ts';
import type { AlienProgress, MonkeyStage } from './types/content.ts';
import type { Economy, QuestLog } from './types/controllers.ts';
import { isRecord } from './types/json.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { createTheyLiveQuest } from './they-live.ts';
import type { ActionReceipt, Actor } from './types/world.ts';
export const MONKEY_QUEST = Object.freeze({
  id: 'monkey-business',
  title: 'Monkey Business',
  professor: 'Professor Ada Meridian',
  reward: 25,
});
const questStages: readonly string[] = [
  'not-started',
  'accepted',
  'carrying',
  'completed',
] satisfies [string, string, string, string];
/** A small persistent state machine. Quest rewards commit exactly once. */
export function createQuestLog(
  savedInput: unknown = {},
  onChange: (value: { monkey: MonkeyStage; theyLive: AlienProgress }) => void = () => {},
) {
  const saved = isRecord(savedInput) ? savedInput : {};

  function changed() {
    onChange({ ...state, theyLive: { ...theyLive.state, defeated: [...theyLive.state.defeated] } });
  }
  const theyLive = createTheyLiveQuest(saved?.theyLive, changed);
  const state: { monkey: MonkeyStage; theyLive: AlienProgress } = {
    monkey:
      typeof saved.monkey === 'string' && questStages.includes(saved.monkey)
        ? (saved.monkey as MonkeyStage)
        : 'not-started',
    theyLive: theyLive.state,
  };
  const change = (stage: MonkeyStage) => {
    state.monkey = stage;
    changed();
  };
  function accept() {
    if (state.monkey !== 'not-started')
      return { ok: false, message: 'This quest is already in your journal.' };
    change('accepted');
    return {
      ok: true,
      message: 'Quest started: Monkey Business.',
    };
  }
  function steal() {
    if (state.monkey === 'not-started')
      return {
        ok: false,
        message: 'The monkey eyes you suspiciously.',
      };
    if (state.monkey !== 'accepted')
      return { ok: false, message: 'You already have your research assistant.' };
    change('carrying');
    return {
      ok: true,
      message: 'The monkey steals your hat, then climbs onto your shoulder.',
    };
  }
  function recover() {
    if (state.monkey !== 'carrying') return { ok: false };
    change('accepted');
    return {
      ok: true,
      message: 'The zookeeper catches you and returns the monkey to its enclosure.',
    };
  }
  function complete(economy: Economy) {
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
        'not-started': 'You have not begun this adventure.',
        accepted: 'Professor Meridian has asked for a rather unconventional research assistant.',
        carrying: 'The monkey is riding on your shoulder.',
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
    entries: (): QuestJournalEntry[] => [
      ...(theyLive.state.started ? [theyLive.entry()] : []),
      entry(),
    ],
    get carrying() {
      return state.monkey === 'carrying';
    },
    get taken() {
      return (['carrying', 'completed'] satisfies [string, string]).includes(state.monkey);
    },
    contentNodeId: 'quests.createQuestLog.node-2',
  };
}
export function monkeyQuestDialogue(
  npc: Partial<Actor> | undefined,
  quests: Pick<QuestLog, 'state' | 'carrying'> & {
    accept: () => ActionReceipt | Promise<ActionReceipt>;
    complete: (economy: Economy) => ActionReceipt | Promise<ActionReceipt>;
  },
  economy: Economy,
) {
  const p = {
    ...npc,
    name: MONKEY_QUEST.professor,
    repeat: false,
    decline: contentText('quests.monkeyQuestDialogue.decline-4', {}),
  };
  if (quests.state.monkey === 'completed')
    return {
      ...p,
      intro: contentText('quests.monkeyQuestDialogue.intro-6', {}),
      question: contentText('quests.monkeyQuestDialogue.question-7', {}),
      choice: contentText('quests.monkeyQuestDialogue.choice-8', {}),
      receipt: contentText('quests.monkeyQuestDialogue.receipt-9', {}),
      contentNodeId: 'quests.monkeyQuestDialogue.node-5',
      introTextId: 'quests.monkeyQuestDialogue.intro-6',
      introTextValues: {},
      questionTextId: 'quests.monkeyQuestDialogue.question-7',
      questionTextValues: {},
      choiceTextId: 'quests.monkeyQuestDialogue.choice-8',
      choiceTextValues: {},
      receiptTextId: 'quests.monkeyQuestDialogue.receipt-9',
      receiptTextValues: {},
    };
  if (quests.carrying)
    return {
      ...p,
      intro: contentText('quests.monkeyQuestDialogue.intro-11', {}),
      question: contentText('quests.monkeyQuestDialogue.question-12', {}),
      choice: contentText('quests.monkeyQuestDialogue.choice-13', {}),
      accept: () => quests.complete(economy),
      contentNodeId: 'quests.monkeyQuestDialogue.node-10',
      introTextId: 'quests.monkeyQuestDialogue.intro-11',
      introTextValues: {},
      questionTextId: 'quests.monkeyQuestDialogue.question-12',
      questionTextValues: {},
      choiceTextId: 'quests.monkeyQuestDialogue.choice-13',
      choiceTextValues: {},
      actionId: 'quests.monkeyQuestDialogue.action-14',
    };
  if (quests.state.monkey === 'accepted')
    return {
      ...p,
      intro: contentText('quests.monkeyQuestDialogue.intro-16', {}),
      question: contentText('quests.monkeyQuestDialogue.question-17', {}),
      choice: contentText('quests.monkeyQuestDialogue.choice-18', {}),
      receipt: contentText('quests.monkeyQuestDialogue.receipt-19', {}),
      contentNodeId: 'quests.monkeyQuestDialogue.node-15',
      introTextId: 'quests.monkeyQuestDialogue.intro-16',
      introTextValues: {},
      questionTextId: 'quests.monkeyQuestDialogue.question-17',
      questionTextValues: {},
      choiceTextId: 'quests.monkeyQuestDialogue.choice-18',
      choiceTextValues: {},
      receiptTextId: 'quests.monkeyQuestDialogue.receipt-19',
      receiptTextValues: {},
    };
  return {
    ...p,
    intro: contentText('quests.monkeyQuestDialogue.intro-21', {}),
    question: contentText('quests.monkeyQuestDialogue.question-22', {}),
    choice: contentText('quests.monkeyQuestDialogue.choice-23', {}),
    accept: quests.accept,
    contentNodeId: 'quests.monkeyQuestDialogue.node-20',
    introTextId: 'quests.monkeyQuestDialogue.intro-21',
    introTextValues: {},
    questionTextId: 'quests.monkeyQuestDialogue.question-22',
    questionTextValues: {},
    choiceTextId: 'quests.monkeyQuestDialogue.choice-23',
    choiceTextValues: {},
    actionId: 'quests.monkeyQuestDialogue.action-24',
  };
}
