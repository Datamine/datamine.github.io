import type { RuntimeDialogue } from '../types/world.ts';
// CONTENT-BINDINGS-MIGRATED
import { CONTENT, contentText } from '../content-runtime.ts';
import archive from './chains.json' with { type: 'json' };
import goose from './goose-corp.json' with { type: 'json' };
import { applyDialogueEdits } from '../world-edits.ts';
import { dialogueChoices } from '../dialogue-choices.ts';
import type { SharedConversation } from '../types/content.ts';

export const AMBIENT_CHAINS = Object.freeze(
  archive.dialogues.map((c) => CONTENT.dialogues.shared[c.id] || c),
);
export const GOOSE_CHAINS = Object.freeze(
  goose.ambient.map((c) => CONTENT.dialogues.shared[c.id] || c),
);
export const CONVERSATION_POOL = Object.freeze([...AMBIENT_CHAINS, ...GOOSE_CHAINS]);

/** Draw without replacement so a walk through town does not repeat one topic. */
export function createConversationPicker({ pool = CONVERSATION_POOL, random = Math.random } = {}) {
  if (!pool.length) throw new Error('The NPC conversation pool is empty.');
  let bag: SharedConversation[] = [];
  return () => {
    if (!bag.length) {
      bag = [...pool];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return bag.pop()!;
  };
}

const pickConversation = createConversationPicker();

/** Translate authored graph edges into the existing portrait/choice UI.
 * Copy appearance only: a conversation must never inherit an NPC's trade,
 * purchase callback, repeat flag, or deferred quest action. */
export function createAmbientDialogue<T extends RuntimeDialogue>(
  npc: T = {} as T,
  { chain = pickConversation() }: { chain?: SharedConversation } = {},
): T & RuntimeDialogue {
  const person = { ...npc };
  for (const key of [
    'intro',
    'question',
    'choices',
    'choice',
    'accept',
    'trade',
    'receipt',
    'repeat',
    'decline',
    'skipIntro',
    'after',
    'ambientConversation',
  ] as const)
    delete person[key];
  function node(id: string, path = new Set<string>()): RuntimeDialogue {
    const source = chain.nodes[id];
    if (!source || path.has(id))
      throw new Error('Invalid conversation edge in ' + chain.id + ': ' + id);
    const nextPath = new Set([...path, id]);
    return {
      intro: source.text,
      repeat: false,
      choices: (source.choices || [])
        .filter(
          (choice) =>
            !/^(?:i should get going[.!]?|leave[.!]?|goodbye[.!]?)$/i.test(choice.text.trim()),
        )
        .map((choice) => {
          const target = chain.nodes[choice.next];
          if (!target)
            throw new Error('Missing conversation node in ' + chain.id + ': ' + choice.next);
          return target.end
            ? {
                label: choice.text,
                receipt: target.text,
                repeat: false,
                contentNodeId: 'dialogues.ambient.node.node-3',
              }
            : {
                label: choice.text,
                next: node(choice.next, nextPath),
                contentNodeId: 'dialogues.ambient.node.node-6',
              };
        }),
      contentNodeId: 'dialogues.ambient.node.node-1',
    };
  }
  return applyDialogueEdits(
    {
      ...person,
      name: npc.name || npc.named || npc.label || (npc.female ? 'Woman' : 'Man'),
      decline: contentText('dialogues.ambient.createAmbientDialogue.decline-9', {}),
      ambientConversation: true,
      conversationId: chain.id,
      ...node(chain.start),
    },
    'shared:' + chain.id,
  );
}

/** Preserve useful service/quest choices while offering the same casual pool. */
export function withAmbientConversation<T extends RuntimeDialogue>(person: T): T & RuntimeDialogue {
  if (person.ambientConversation || person.parrot || person.dog === true || person.baby)
    return person;
  const choices = dialogueChoices(person);
  if (choices.some((choice) => choice.ambientConversation)) return person;
  return {
    ...person,
    choices: [
      ...choices,
      {
        label: contentText('dialogues.ambient.withAmbientConversation.label-16', {}),
        ambientConversation: true,
        actionId: 'ambient.chat',
        next: createAmbientDialogue(person),
        contentNodeId: 'dialogues.ambient.withAmbientConversation.node-15',
        labelTextId: 'dialogues.ambient.withAmbientConversation.label-16',
        labelTextValues: {},
      },
    ],
    contentNodeId: person.contentNodeId || 'dialogues.ambient.withAmbientConversation.node-14',
  };
}
