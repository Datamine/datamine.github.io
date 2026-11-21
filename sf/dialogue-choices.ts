import type { RuntimeDialogue, RuntimeChoice } from './types/world.ts';
/** Presentation uses stable action/node IDs even for older single-choice domain handlers. */
export function dialogueChoices(person: RuntimeDialogue): RuntimeChoice[] {
  if (person.choices) return person.choices;
  if (!person.choice) return [];
  return [
    {
      id: person.contentNodeId ? person.contentNodeId + '.choice' : undefined,
      contentNodeId: person.contentNodeId ? person.contentNodeId + '.choice' : undefined,
      label: person.choice,
      labelTextId: person.choiceTextId,
      labelTextValues: person.choiceTextValues,
      accept: person.accept,
      actionId: person.actionId,
      receipt: person.receipt,
      receiptTextId: person.receiptTextId,
      receiptTextValues: person.receiptTextValues,
      trade: person.trade,
    },
  ];
}
