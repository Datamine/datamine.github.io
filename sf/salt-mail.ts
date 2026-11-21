import type { RuntimeDialogue, Actor } from './types/world.ts';
import { dialogueChoices } from './dialogue-choices.ts';
import type { Economy } from './types/controllers.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { mapInteractionResult } from './interaction-results.ts';

export const SALT_LETTER_PAY = 50;
/** Letter and payment are committed together by the purse, so neither reloads
 * nor repeated dialogue clicks can pay twice for the same envelope. */
export function createSaltMail(economy: Economy) {
  const carrying = () => economy.state.saltLetters === 1;
  function collect() {
    return mapInteractionResult(economy.trade('salt-letter-collect'), (result) => ({
      ...result,
      message: result.ok
        ? 'You receive a sealed salt-conservation letter. Deliver it to the City Hall clerk for 50 coins.'
        : result.message,
    }));
  }
  function deliver() {
    return mapInteractionResult(economy.trade('salt-letter-deliver'), (result) => ({
      ...result,
      message: result.ok
        ? 'The clerk stamps your salt-conservation letter RECEIVED and pays you 50 coins from the activist’s campaign fund.'
        : result.message,
    }));
  }
  function entries() {
    if (!carrying() && !economy.state.saltLettersDelivered) return [];
    return [
      {
        id: 'salt-conservation-mail',
        title: 'Letters for the Salt Flats',
        stage: carrying() ? 'carrying' : 'accepted',
        status: carrying() ? 'Letter ready to deliver' : 'Repeatable work',
        rewardLabel: '50 coins per letter',
        description: contentText('salt-mail.entries.description-1', {
          v0: carrying()
            ? 'Deliver your sealed letter to the City Hall clerk in San Francisco. Payment is 50 coins on delivery.'
            : 'You have delivered the conservation campaign’s letter.',
          v1: economy.state.saltLettersDelivered,
        }),
      },
    ];
  }
  return {
    collect,
    deliver,
    entries,
    get carrying() {
      return carrying();
    },
  };
}
export function saltActivistDialogue(
  npc: Partial<Actor> | undefined,
  mail: ReturnType<typeof createSaltMail>,
  economy: Economy,
) {
  const p = { ...npc, decline: contentText('salt-mail.saltActivistDialogue.decline-2', {}) };
  if (mail.carrying)
    return {
      ...p,
      intro: contentText('salt-mail.saltActivistDialogue.intro-4', {}),
      question: contentText('salt-mail.saltActivistDialogue.question-5', {}),
      choice: contentText('salt-mail.saltActivistDialogue.choice-6', {}),
      receipt: contentText('salt-mail.saltActivistDialogue.receipt-7', {}),
      contentNodeId: 'salt-mail.saltActivistDialogue.node-3',
      introTextId: 'salt-mail.saltActivistDialogue.intro-4',
      introTextValues: {},
      questionTextId: 'salt-mail.saltActivistDialogue.question-5',
      questionTextValues: {},
      choiceTextId: 'salt-mail.saltActivistDialogue.choice-6',
      choiceTextValues: {},
      receiptTextId: 'salt-mail.saltActivistDialogue.receipt-7',
      receiptTextValues: {},
    };
  return {
    ...p,
    intro: economy.state.saltLettersDelivered
      ? contentText('salt-mail.saltActivistDialogue.intro-9.yes', {})
      : contentText('salt-mail.saltActivistDialogue.intro-9.no', {}),
    question: contentText('salt-mail.saltActivistDialogue.question-10', {}),
    choice: contentText('salt-mail.saltActivistDialogue.choice-11', {}),
    accept: mail.collect,
    contentNodeId: 'salt-mail.saltActivistDialogue.node-8',
    introTextId: economy.state.saltLettersDelivered
      ? 'salt-mail.saltActivistDialogue.intro-9.yes'
      : 'salt-mail.saltActivistDialogue.intro-9.no',
    introTextValues: economy.state.saltLettersDelivered ? {} : {},
    questionTextId: 'salt-mail.saltActivistDialogue.question-10',
    questionTextValues: {},
    choiceTextId: 'salt-mail.saltActivistDialogue.choice-11',
    choiceTextValues: {},
    actionId: 'salt-mail.saltActivistDialogue.action-12',
  };
}
export function saltClerkDialogue(
  base: RuntimeDialogue,
  mail: ReturnType<typeof createSaltMail>,
): RuntimeDialogue {
  if (!mail.carrying) return base;
  return {
    ...base,
    intro: contentText('salt-mail.saltClerkDialogue.intro-14', {
      v0: typeof base.intro === 'function' ? base.intro() : base.intro,
    }),
    question: contentText('salt-mail.saltClerkDialogue.question-15', {}),
    choices: [
      {
        label: contentText('salt-mail.saltClerkDialogue.label-17', {}),
        accept: mail.deliver,
        contentNodeId: 'salt-mail.saltClerkDialogue.node-16',
        labelTextId: 'salt-mail.saltClerkDialogue.label-17',
        labelTextValues: {},
        actionId: 'salt-mail.saltClerkDialogue.action-18',
      },
      ...dialogueChoices(base),
    ],
    contentNodeId: 'salt-mail.saltClerkDialogue.node-13',
    introTextId: 'salt-mail.saltClerkDialogue.intro-14',
    introTextValues: { v0: typeof base.intro === 'function' ? base.intro() : base.intro },
    questionTextId: 'salt-mail.saltClerkDialogue.question-15',
    questionTextValues: {},
  };
}
