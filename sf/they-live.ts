import type { ActionReceipt, Actor } from './types/world.ts';
import type { AlienProgress } from './types/content.ts';
import { isRecord } from './types/json.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { ITEM_STATS } from './item-stats.ts';

export const ALIEN_TARGETS = Object.freeze(
  [
    { id: 'alien-civic', area: 'City Hall forecourt' },
    { id: 'alien-ferry', area: 'Ferry Building promenade' },
    { id: 'alien-venture', area: 'Venture Exchange' },
    { id: 'alien-industrial', area: 'American Industrial Center' },
    { id: 'alien-square', area: 'Times Square' },
    { id: 'alien-sand-hill', area: 'Sand Hill Road' },
  ].map((value) => Object.freeze(value)),
);
const alienIDs = new Set(ALIEN_TARGETS.map((a) => a.id));

/** Quest permission, equipment and defeated IDs are persisted independently
 * of sprites. Repeated clicks and reloads cannot duplicate kills or rewards. */
export function createTheyLiveQuest(
  savedInput: unknown = {},
  onChange: (state: AlienProgress) => void = () => {},
) {
  const saved = isRecord(savedInput) ? savedInput : {};

  const started = saved?.started === true,
    evidence = started && saved.evidence === true,
    permitted = evidence && saved.permit === true,
    armed = permitted && saved.bayonet === true;
  const state: AlienProgress = {
    started,
    evidence,
    permit: permitted,
    bayonet: armed,
    defeated:
      permitted && Array.isArray(saved.defeated)
        ? [
            ...new Set(
              saved.defeated.filter(
                (id: string): id is string => typeof id === 'string' && alienIDs.has(id),
              ),
            ),
          ]
        : [],
    completed: false,
    skateboard: false,
  };
  state.completed =
    state.permit && state.defeated.length === ALIEN_TARGETS.length && saved.completed === true;
  state.skateboard = state.completed;
  const save = () => onChange({ ...state, defeated: [...state.defeated] });
  const clear = () => state.defeated.length === ALIEN_TARGETS.length;
  function start() {
    if (state.started) return { ok: false };
    state.started = true;
    save();
    return {
      ok: true,
      message: 'Quest started: They Live.',
    };
  }
  function certificate() {
    if (!state.started)
      return { ok: false, message: 'You have no unusual observations to report.' };
    if (state.evidence)
      return { ok: false, message: 'Your Alien Evidence Certificate is already on file.' };
    state.evidence = true;
    save();
    return {
      ok: true,
      message: 'You receive an Alien Evidence Certificate.',
    };
  }
  function permit() {
    if (!state.started || !state.evidence)
      return {
        ok: false,
        message: 'The clerk requires documentary evidence.',
      };
    if (state.permit) return { ok: false, message: 'Your alien-removal permit is already valid.' };
    state.permit = true;
    save();
    return {
      ok: true,
      message: 'The clerk stamps your alien-removal permit. It covers revealed aliens only.',
    };
  }
  function weapon() {
    if (!state.permit)
      return { ok: false, message: 'The armorer needs to see your alien-removal permit first.' };
    if (state.bayonet) return { ok: false, message: 'You already have your bayonet.' };
    state.bayonet = true;
    save();
    return {
      ok: true,
      message: 'The armorer gives you a bayonet.',
    };
  }
  function attack(id: unknown, { revealed = false } = {}) {
    if (typeof id !== 'string' || !alienIDs.has(id) || !revealed || !state.started || !state.permit)
      return {
        ok: false,
        illegal: true,
        message: 'You attack a citizen without valid authorization. The police are on their way!',
      };
    if (typeof id === 'string' && state.defeated.includes(id))
      return { ok: false, message: 'This alien has already been defeated.' };
    return { ok: true };
  }
  function defeat(id: unknown, options: { revealed?: boolean | undefined }) {
    const result = attack(id, options);
    if (!result.ok) return result;
    if (typeof id === 'string') state.defeated.push(id);
    save();
    return {
      ok: true,
      message:
        'Alien defeated (' +
        state.defeated.length +
        '/' +
        ALIEN_TARGETS.length +
        '). ' +
        (clear()
          ? 'Return to the City Hall clerk for your reward.'
          : 'Your permit is in order. The police leave you alone.'),
    };
  }
  function reward() {
    if (state.completed) return { ok: false, message: 'You already received your skateboard.' };
    if (!state.permit || !clear())
      return { ok: false, message: 'The clerk is waiting for you to defeat all six aliens.' };
    state.completed = true;
    state.skateboard = true;
    save();
    return {
      ok: true,
      message:
        'Quest complete: They Live! The clerk thanks you and gives you a skateboard. Ride it with K or the Skateboard button. You keep the sunglasses. The American Industrial Center’s full stock is now unlocked.',
    };
  }
  function entry() {
    const stage = state.completed
      ? 'completed'
      : clear()
        ? 'carrying'
        : state.started
          ? 'accepted'
          : 'not-started';
    const description = state.completed
      ? 'The invasion is over. Your skateboard and sunglasses are yours to keep.'
      : !state.started
        ? 'You have not begun this adventure.'
        : !state.evidence
          ? 'You found a pair of unusual sunglasses.'
          : !state.permit
            ? 'Your observations have been certified.'
            : clear()
              ? 'All six aliens have been defeated.'
              : !state.bayonet
                ? 'Your alien-removal permit has been issued.'
                : 'You have received a bayonet for the assignment.';
    return {
      id: 'they-live',
      title: 'They Live',
      stage,
      status: state.completed ? 'Complete' : clear() ? 'Ready for reward' : 'In progress',
      description,
      rewardLabel: 'Skateboard · keep the sunglasses',
      targets: state.permit
        ? ALIEN_TARGETS.map((a) => ({ ...a, done: state.defeated.includes(a.id) }))
        : [],
    };
  }
  return {
    state,
    start,
    certificate,
    permit,
    weapon,
    attack,
    defeat,
    reward,
    entry,
    isTarget: (id: string) => alienIDs.has(id),
    isDefeated: (id: unknown) => typeof id === 'string' && state.defeated.includes(id),
  };
}

export function theyLiveDialogue(
  npc: Partial<Actor>,
  quest: {
    state: AlienProgress;
    reward: () => ActionReceipt | Promise<ActionReceipt>;
    permit: () => ActionReceipt | Promise<ActionReceipt>;
    certificate: () => ActionReceipt | Promise<ActionReceipt>;
    weapon: () => ActionReceipt | Promise<ActionReceipt>;
  },
  { buyBattleaxe }: { buyBattleaxe?: () => ActionReceipt | Promise<ActionReceipt> } = {},
) {
  const s = quest.state,
    p = { ...npc, decline: contentText('they-live.theyLiveDialogue.decline-1', {}) };
  if (npc.questRole === 'clerk') {
    if (!s.started)
      return {
        ...p,
        intro: contentText('they-live.theyLiveDialogue.intro-3', {}),
        question: contentText('they-live.theyLiveDialogue.question-4', {}),
        choice: contentText('they-live.theyLiveDialogue.choice-5', {}),
        receipt: contentText('they-live.theyLiveDialogue.receipt-6', {}),
        contentNodeId: 'they-live.theyLiveDialogue.node-2',
        introTextId: 'they-live.theyLiveDialogue.intro-3',
        introTextValues: {},
        questionTextId: 'they-live.theyLiveDialogue.question-4',
        questionTextValues: {},
        choiceTextId: 'they-live.theyLiveDialogue.choice-5',
        choiceTextValues: {},
        receiptTextId: 'they-live.theyLiveDialogue.receipt-6',
        receiptTextValues: {},
      };
    if (s.completed)
      return {
        ...p,
        intro: contentText('they-live.theyLiveDialogue.intro-8', {}),
        question: contentText('they-live.theyLiveDialogue.question-9', {}),
        choice: contentText('they-live.theyLiveDialogue.choice-10', {}),
        receipt: contentText('they-live.theyLiveDialogue.receipt-11', {}),
        contentNodeId: 'they-live.theyLiveDialogue.node-7',
        introTextId: 'they-live.theyLiveDialogue.intro-8',
        introTextValues: {},
        questionTextId: 'they-live.theyLiveDialogue.question-9',
        questionTextValues: {},
        choiceTextId: 'they-live.theyLiveDialogue.choice-10',
        choiceTextValues: {},
        receiptTextId: 'they-live.theyLiveDialogue.receipt-11',
        receiptTextValues: {},
      };
    if (s.defeated.length === ALIEN_TARGETS.length)
      return {
        ...p,
        intro: contentText('they-live.theyLiveDialogue.intro-13', {}),
        question: contentText('they-live.theyLiveDialogue.question-14', {}),
        choice: contentText('they-live.theyLiveDialogue.choice-15', {}),
        accept: quest.reward,
        contentNodeId: 'they-live.theyLiveDialogue.node-12',
        introTextId: 'they-live.theyLiveDialogue.intro-13',
        introTextValues: {},
        questionTextId: 'they-live.theyLiveDialogue.question-14',
        questionTextValues: {},
        choiceTextId: 'they-live.theyLiveDialogue.choice-15',
        choiceTextValues: {},
        actionId: 'they-live.theyLiveDialogue.action-16',
      };
    if (!s.evidence)
      return {
        ...p,
        intro: contentText('they-live.theyLiveDialogue.intro-18', {}),
        question: contentText('they-live.theyLiveDialogue.question-19', {}),
        choice: contentText('they-live.theyLiveDialogue.choice-20', {}),
        receipt: contentText('they-live.theyLiveDialogue.receipt-21', {}),
        contentNodeId: 'they-live.theyLiveDialogue.node-17',
        introTextId: 'they-live.theyLiveDialogue.intro-18',
        introTextValues: {},
        questionTextId: 'they-live.theyLiveDialogue.question-19',
        questionTextValues: {},
        choiceTextId: 'they-live.theyLiveDialogue.choice-20',
        choiceTextValues: {},
        receiptTextId: 'they-live.theyLiveDialogue.receipt-21',
        receiptTextValues: {},
      };
    if (!s.permit)
      return {
        ...p,
        intro: contentText('they-live.theyLiveDialogue.intro-23', {}),
        question: contentText('they-live.theyLiveDialogue.question-24', {}),
        choice: contentText('they-live.theyLiveDialogue.choice-25', {}),
        accept: quest.permit,
        contentNodeId: 'they-live.theyLiveDialogue.node-22',
        introTextId: 'they-live.theyLiveDialogue.intro-23',
        introTextValues: {},
        questionTextId: 'they-live.theyLiveDialogue.question-24',
        questionTextValues: {},
        choiceTextId: 'they-live.theyLiveDialogue.choice-25',
        choiceTextValues: {},
        actionId: 'they-live.theyLiveDialogue.action-26',
      };
    return {
      ...p,
      intro: contentText('they-live.theyLiveDialogue.intro-28', {}),
      question: contentText('they-live.theyLiveDialogue.question-29', {}),
      choice: contentText('they-live.theyLiveDialogue.choice-30', {}),
      receipt: !s.bayonet
        ? contentText('they-live.theyLiveDialogue.receipt-31.yes', {})
        : contentText('they-live.theyLiveDialogue.receipt-31.no', { v0: s.defeated.length }),
      contentNodeId: 'they-live.theyLiveDialogue.node-27',
      introTextId: 'they-live.theyLiveDialogue.intro-28',
      introTextValues: {},
      questionTextId: 'they-live.theyLiveDialogue.question-29',
      questionTextValues: {},
      choiceTextId: 'they-live.theyLiveDialogue.choice-30',
      choiceTextValues: {},
      receiptTextId: !s.bayonet
        ? 'they-live.theyLiveDialogue.receipt-31.yes'
        : 'they-live.theyLiveDialogue.receipt-31.no',
      receiptTextValues: !s.bayonet ? {} : { v0: s.defeated.length },
    };
  }
  if (npc.questRole === 'esoteric') {
    if (!s.started)
      return {
        ...p,
        intro: contentText('they-live.theyLiveDialogue.intro-33', {}),
        question: contentText('they-live.theyLiveDialogue.question-34', {}),
        choice: contentText('they-live.theyLiveDialogue.choice-35', {}),
        receipt: contentText('they-live.theyLiveDialogue.receipt-36', {}),
        contentNodeId: 'they-live.theyLiveDialogue.node-32',
        introTextId: 'they-live.theyLiveDialogue.intro-33',
        introTextValues: {},
        questionTextId: 'they-live.theyLiveDialogue.question-34',
        questionTextValues: {},
        choiceTextId: 'they-live.theyLiveDialogue.choice-35',
        choiceTextValues: {},
        receiptTextId: 'they-live.theyLiveDialogue.receipt-36',
        receiptTextValues: {},
      };
    if (!s.evidence)
      return {
        ...p,
        intro: contentText('they-live.theyLiveDialogue.intro-38', {}),
        question: contentText('they-live.theyLiveDialogue.question-39', {}),
        choice: contentText('they-live.theyLiveDialogue.choice-40', {}),
        accept: quest.certificate,
        contentNodeId: 'they-live.theyLiveDialogue.node-37',
        introTextId: 'they-live.theyLiveDialogue.intro-38',
        introTextValues: {},
        questionTextId: 'they-live.theyLiveDialogue.question-39',
        questionTextValues: {},
        choiceTextId: 'they-live.theyLiveDialogue.choice-40',
        choiceTextValues: {},
        actionId: 'they-live.theyLiveDialogue.action-41',
      };
    return {
      ...p,
      intro: contentText('they-live.theyLiveDialogue.intro-43', {}),
      question: contentText('they-live.theyLiveDialogue.question-44', {}),
      choice: contentText('they-live.theyLiveDialogue.choice-45', {}),
      receipt: contentText('they-live.theyLiveDialogue.receipt-46', {}),
      contentNodeId: 'they-live.theyLiveDialogue.node-42',
      introTextId: 'they-live.theyLiveDialogue.intro-43',
      introTextValues: {},
      questionTextId: 'they-live.theyLiveDialogue.question-44',
      questionTextValues: {},
      choiceTextId: 'they-live.theyLiveDialogue.choice-45',
      choiceTextValues: {},
      receiptTextId: 'they-live.theyLiveDialogue.receipt-46',
      receiptTextValues: {},
    };
  }
  if (npc.questRole === 'armorer' && s.completed)
    return {
      ...p,
      intro: contentText('they-live.theyLiveDialogue.intro-48', {}),
      question: contentText('they-live.theyLiveDialogue.question-49', {}),
      choices: [
        {
          label: contentText('they-live.theyLiveDialogue.label-51', {
            v0: ITEM_STATS.battleaxe.price,
          }),
          accept:
            buyBattleaxe ||
            (() => ({
              ok: false,
              message: 'Speak to the armorer at the American Industrial Center.',
            })),
          contentNodeId: 'they-live.theyLiveDialogue.node-50',
          labelTextId: 'they-live.theyLiveDialogue.label-51',
          labelTextValues: { v0: ITEM_STATS.battleaxe.price },
          actionId: 'they-live.theyLiveDialogue.action-52',
        },
        {
          label: contentText('they-live.theyLiveDialogue.label-54', {}),
          receipt: contentText('they-live.theyLiveDialogue.receipt-55', {}),
          contentNodeId: 'they-live.theyLiveDialogue.node-53',
          labelTextId: 'they-live.theyLiveDialogue.label-54',
          labelTextValues: {},
          receiptTextId: 'they-live.theyLiveDialogue.receipt-55',
          receiptTextValues: {},
        },
      ],
      contentNodeId: 'they-live.theyLiveDialogue.node-47',
      introTextId: 'they-live.theyLiveDialogue.intro-48',
      introTextValues: {},
      questionTextId: 'they-live.theyLiveDialogue.question-49',
      questionTextValues: {},
    };
  if (npc.questRole === 'armorer')
    return {
      ...p,
      intro: !s.started
        ? contentText('they-live.theyLiveDialogue.intro-57.yes', {})
        : !s.permit
          ? contentText('they-live.theyLiveDialogue.intro-57.no.yes', {})
          : s.bayonet
            ? contentText('they-live.theyLiveDialogue.intro-57.no.no.yes', {})
            : contentText('they-live.theyLiveDialogue.intro-57.no.no.no', {}),
      question:
        s.permit && !s.bayonet
          ? contentText('they-live.theyLiveDialogue.question-58.yes', {})
          : contentText('they-live.theyLiveDialogue.question-58.no', {}),
      choice:
        s.permit && !s.bayonet
          ? contentText('they-live.theyLiveDialogue.choice-59.yes', {})
          : contentText('they-live.theyLiveDialogue.choice-59.no', {}),
      accept: s.permit && !s.bayonet ? quest.weapon : undefined,
      receipt: contentText('they-live.theyLiveDialogue.receipt-61', {}),
      contentNodeId: 'they-live.theyLiveDialogue.node-56',
      introTextId: !s.started
        ? 'they-live.theyLiveDialogue.intro-57.yes'
        : !s.permit
          ? 'they-live.theyLiveDialogue.intro-57.no.yes'
          : s.bayonet
            ? 'they-live.theyLiveDialogue.intro-57.no.no.yes'
            : 'they-live.theyLiveDialogue.intro-57.no.no.no',
      introTextValues: !s.started ? {} : !s.permit ? {} : s.bayonet ? {} : {},
      questionTextId:
        s.permit && !s.bayonet
          ? 'they-live.theyLiveDialogue.question-58.yes'
          : 'they-live.theyLiveDialogue.question-58.no',
      questionTextValues: s.permit && !s.bayonet ? {} : {},
      choiceTextId:
        s.permit && !s.bayonet
          ? 'they-live.theyLiveDialogue.choice-59.yes'
          : 'they-live.theyLiveDialogue.choice-59.no',
      choiceTextValues: s.permit && !s.bayonet ? {} : {},
      actionId: 'they-live.theyLiveDialogue.action-60',
      receiptTextId: 'they-live.theyLiveDialogue.receipt-61',
      receiptTextValues: {},
    };
  throw new Error('Unknown They Live quest role');
}
