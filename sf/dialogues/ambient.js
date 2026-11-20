import archive from './chains.json' with { type: 'json' };
import goose from './goose-corp.json' with { type: 'json' };

export const AMBIENT_CHAINS = Object.freeze(archive.dialogues);
export const GOOSE_CHAINS = Object.freeze(goose.ambient);
export const CONVERSATION_POOL = Object.freeze([...AMBIENT_CHAINS, ...GOOSE_CHAINS]);

/** Draw without replacement so a walk through town does not repeat one topic. */
export function createConversationPicker({ pool = CONVERSATION_POOL, random = Math.random } = {}) {
  if (!pool.length) throw new Error('The NPC conversation pool is empty.');
  let bag = [];
  return () => {
    if (!bag.length) {
      bag = [...pool];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return bag.pop();
  };
}

const pickConversation = createConversationPicker();

/** Translate authored graph edges into the existing portrait/choice UI.
 * Copy appearance only: a conversation must never inherit an NPC's trade,
 * purchase callback, repeat flag, or deferred quest action. */
export function createAmbientDialogue(npc = {}, { chain = pickConversation() } = {}) {
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
  ])
    delete person[key];
  function node(id, path = new Set()) {
    const source = chain.nodes[id];
    if (!source || path.has(id))
      throw new Error('Invalid conversation edge in ' + chain.id + ': ' + id);
    const nextPath = new Set([...path, id]);
    return {
      intro: source.text,
      repeat: false,
      choices: (source.choices || []).map((choice) => {
        const target = chain.nodes[choice.next];
        if (!target)
          throw new Error('Missing conversation node in ' + chain.id + ': ' + choice.next);
        return target.end
          ? { label: choice.text, receipt: target.text, repeat: false }
          : { label: choice.text, next: node(choice.next, nextPath) };
      }),
    };
  }
  return {
    ...person,
    name: npc.name || npc.named || npc.label || (npc.female ? 'Woman' : 'Man'),
    decline: 'Leave',
    ambientConversation: true,
    conversationId: chain.id,
    ...node(chain.start),
  };
}

/** Preserve useful service/quest choices while offering the same casual pool. */
export function withAmbientConversation(person) {
  if (person.ambientConversation || person.parrot || person.dog === true || person.baby)
    return person;
  const choices =
    person.choices ||
    (person.choice
      ? [
          {
            label: person.choice,
            accept: person.accept,
            trade: person.trade,
            receipt: person.receipt,
          },
        ]
      : []);
  if (choices.some((choice) => choice.ambientConversation)) return person;
  return {
    ...person,
    choices: [
      ...choices,
      {
        label: 'Let’s just talk.',
        ambientConversation: true,
        next: createAmbientDialogue(person),
      },
    ],
  };
}
