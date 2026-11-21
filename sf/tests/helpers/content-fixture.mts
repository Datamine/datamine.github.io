import type { ContentBundle } from '../../types/content.ts';
export function contentFixture(): ContentBundle & {
  dialogues: {
    variants: Record<
      'conversation',
      import('../../types/content.ts').DialogueVariant & {
        nodes: Record<'greeting' | 'reply', import('../../types/content.ts').DialogueNode>;
      }
    >;
  };
} {
  return {
    entities: {
      schema: 1,
      definitions: {
        goblin: {
          id: 'goblin',
          name: 'Goblin',
          category: 'npc',
          kind: 'goblin',
          description: 'A local.',
          capabilities: ['talk', 'buy'] satisfies [string, string],
          menus: [
            {
              id: 'menu',
              states: ['Visitor'],
              placements: ['actor:goblin', 'actor:goblin-2'] satisfies [string, string],
              actions: [{ id: 'talk', action: 'talk', label: 'Talk to {name}' }],
            },
          ],
          dialogues: ['conversation'],
        },
      },
      placements: Object.fromEntries(
        (['actor:goblin', 'actor:goblin-2'] satisfies [string, string]).map((id) => [
          id,
          { id, definition: 'goblin', actor: true, source: 'merchants', position: { x: 1, z: 2 } },
        ]),
      ),
    },
    dialogues: {
      schema: 1,
      services: {},
      shared: {},
      variants: {
        conversation: {
          id: 'conversation',
          states: ['Visitor'],
          placements: ['actor:goblin', 'actor:goblin-2'] satisfies [string, string],
          root: 'greeting',
          nodes: {
            greeting: {
              id: 'greeting',
              intro: { text: 'hello' },
              question: '',
              decline: 'Leave',
              repeat: true,
              skipIntro: false,
              choices: [
                {
                  id: 'purchase',
                  label: 'Buy',
                  receipt: 'Thanks.',
                  action: 'buy',
                  when: { path: 'quests.monkey.stage', eq: 'completed' },
                },
                { id: 'chat', label: 'Ask', next: 'reply' },
              ],
            },
            reply: {
              id: 'reply',
              intro: 'Yes?',
              question: '',
              decline: 'Leave',
              repeat: false,
              skipIntro: false,
              choices: [],
            },
          },
        },
      },
    },
    texts: { schema: 1, texts: { hello: { template: 'Welcome, {v0}.' } } },
  } satisfies ContentBundle;
}
