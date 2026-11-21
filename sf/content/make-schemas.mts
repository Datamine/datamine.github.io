import type { JSONObject } from '../types/content.ts';
import { requiredValue } from '../types/assert.ts';
type SchemaNode = JSONObject & { properties?: Record<string, SchemaNode> };
const properties = (schema: SchemaNode) =>
  requiredValue(schema.properties, 'Object schema properties');
import { readFile, writeFile } from 'node:fs/promises';
const id = 'https://loeber.land/schemas/';
const str = { type: 'string' },
  bool = { type: 'boolean' },
  strings = { type: 'array', items: str };
const object = (
  properties: Record<string, SchemaNode>,
  required: string[] | undefined = [],
  extra = false,
) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: extra,
});
const scalar = {
  type: ['string', 'number', 'boolean', 'null'] satisfies [string, string, string, string],
};
const comparisons = [];
for (const [op, type] of Object.entries({
  eq: scalar,
  ne: scalar,
  in: { type: 'array', items: scalar },
  contains: scalar,
  exists: bool,
  gte: { type: 'number' },
  gt: { type: 'number' },
  lte: { type: 'number' },
  lt: { type: 'number' },
}))
  comparisons.push(
    object(
      {
        path: {
          type: 'string',
          pattern: '^(?!.*(?:__proto__|constructor|prototype))[A-Za-z][A-Za-z0-9_.-]*$',
        },
        [op]: type,
      },
      ['path', op] satisfies [string, string],
    ),
  );
const condition = {
  oneOf: [
    bool,
    object({ all: { type: 'array', minItems: 1, items: { $ref: '#/definitions/condition' } } }, [
      'all',
    ]),
    object({ any: { type: 'array', minItems: 1, items: { $ref: '#/definitions/condition' } } }, [
      'any',
    ]),
    object({ not: { $ref: '#/definitions/condition' } }, ['not']),
    ...comparisons,
    object(
      {
        path: str,
        count: {
          type: 'object',
          minProperties: 1,
          maxProperties: 1,
          properties: {
            eq: { type: 'integer' },
            gte: { type: 'integer' },
            gt: { type: 'integer' },
            lte: { type: 'integer' },
            lt: { type: 'integer' },
          },
          additionalProperties: false,
        },
      },
      ['path', 'count'] satisfies [string, string],
    ),
  ],
};
const text = {
  oneOf: [
    str,
    object({ text: { type: 'string', minLength: 1 } }, ['text']),
    object(
      {
        select: {
          type: 'array',
          minItems: 1,
          items: object(
            { when: { $ref: '#/definitions/condition' }, text: { $ref: '#/definitions/text' } },
            ['when', 'text'] satisfies [string, string],
          ),
        },
        default: { $ref: '#/definitions/text' },
      },
      ['select', 'default'] satisfies [string, string],
    ),
  ],
};
const base = (
  name: string,
  properties: Record<string, SchemaNode>,
  required: string[] | undefined,
) => ({
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: id + name + '.schema.json',
  ...object(properties, required),
  definitions: { condition, text },
});
const action = object(
  {
    id: str,
    action: str,
    label: { $ref: '#/definitions/text' },
    when: { $ref: '#/definitions/condition' },
    disabled: bool,
  },
  ['id', 'action', 'label'] satisfies [string, string, string],
);
const menu = object(
  {
    id: str,
    states: strings,
    placements: strings,
    when: { $ref: '#/definitions/condition' },
    actions: { type: 'array', items: action },
  },
  ['id', 'states', 'placements', 'actions'] satisfies [string, string, string, string],
);
const entity = object(
  {
    id: str,
    name: { type: 'string', minLength: 1, maxLength: 80 },
    category: { enum: ['npc', 'object'] satisfies [string, string] },
    kind: str,
    description: { $ref: '#/definitions/text' },
    menus: { type: 'array', minItems: 1, items: menu },
    dialogues: strings,
    capabilities: strings,
  },
  [
    'id',
    'name',
    'category',
    'kind',
    'description',
    'menus',
    'dialogues',
    'capabilities',
  ] satisfies [string, string, string, string, string, string, string, string],
);
const placement = object(
  {
    id: str,
    definition: str,
    actor: bool,
    source: str,
    position: object({ x: { type: 'number' }, z: { type: 'number' } }, []),
    description: { $ref: '#/definitions/text' },
    appearance: { type: 'object' },
    level: { type: 'number' },
  },
  ['id', 'definition', 'actor', 'source', 'position'] satisfies [
    string,
    string,
    string,
    string,
    string,
  ],
);
const entities = base(
  'entities',
  {
    schema: { const: 1 },
    definitions: { type: 'object', additionalProperties: entity },
    placements: { type: 'object', additionalProperties: placement },
  },
  ['schema', 'definitions', 'placements'] satisfies [string, string, string],
);
const choice = object(
  {
    id: str,
    label: { $ref: '#/definitions/text' },
    receipt: { $ref: '#/definitions/text' },
    action: str,
    trade: str,
    next: str,
    shared: bool,
    serverReceipt: bool,
    when: { $ref: '#/definitions/condition' },
  },
  ['id', 'label'] satisfies [string, string],
);
const node = object(
  {
    id: str,
    intro: { $ref: '#/definitions/text' },
    question: { $ref: '#/definitions/text' },
    decline: { $ref: '#/definitions/text' },
    repeat: bool,
    skipIntro: bool,
    choices: { type: 'array', items: choice },
  },
  ['id', 'intro', 'question', 'decline', 'repeat', 'skipIntro', 'choices'] satisfies [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ],
);
const variant = object(
  {
    id: str,
    states: strings,
    placements: strings,
    when: { $ref: '#/definitions/condition' },
    root: str,
    nodes: { type: 'object', additionalProperties: node },
    sampleValues: { type: 'object' },
    shared: bool,
    speech: str,
    panel: { type: ['string', 'null'] satisfies [string, string] },
  },
  ['id', 'states', 'placements'] satisfies [string, string, string],
);
const sharedNode = object(
  {
    id: str,
    speaker: str,
    text: str,
    end: bool,
    choices: {
      type: 'array',
      items: object({ id: str, text: str, next: str, when: { $ref: '#/definitions/condition' } }, [
        'id',
        'text',
        'next',
      ] satisfies [string, string, string]),
    },
  },
  ['id', 'text'] satisfies [string, string],
);
const shared = object(
  { id: str, title: str, start: str, nodes: { type: 'object', additionalProperties: sharedNode } },
  ['id', 'start', 'nodes'] satisfies [string, string, string],
  true,
);
const dialogues = base(
  'dialogues',
  {
    schema: { const: 1 },
    services: { type: 'object', additionalProperties: { type: 'object' } },
    variants: { type: 'object', additionalProperties: variant },
    shared: { type: 'object', additionalProperties: shared },
  },
  ['schema', 'services', 'variants', 'shared'] satisfies [string, string, string, string],
);
const texts = base(
  'texts',
  {
    schema: { const: 1 },
    texts: {
      type: 'object',
      additionalProperties: object({ template: str, bindings: { type: 'object' } }, ['template']),
    },
  },
  ['schema', 'texts'] satisfies [string, string],
);
const defaults: unknown = JSON.parse(
  await readFile(new URL('player-state-defaults.json', import.meta.url), 'utf8'),
);
function stateSchema(value: unknown, depth = 0): SchemaNode {
  if (value === null) return { type: ['object', 'null'] satisfies [string, string] };
  if (Array.isArray(value)) return { type: 'array' };
  if (typeof value === 'object') {
    const p = Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, stateSchema(v, depth + 1)]),
    );
    return object(p, Object.keys(p), depth > 0);
  }
  return { type: typeof value === 'number' ? 'number' : typeof value };
}
const player = stateSchema(defaults);
player.$schema = 'http://json-schema.org/draft-07/schema#';
player.$id = id + 'player-state.schema.json';
properties(player).schema = { const: 2 };
properties(
  requiredValue(
    properties(requiredValue(properties(player).quests, 'Quest schema')).monkey,
    'Monkey schema',
  ),
).stage = {
  enum: ['not-started', 'accepted', 'carrying', 'completed'] satisfies [
    string,
    string,
    string,
    string,
  ],
};
properties(
  requiredValue(
    properties(requiredValue(properties(player).quests, 'Quest schema')).expeditions,
    'Expedition schema',
  ),
).raptor = {
  enum: ['not-started', 'escaped', 'carrying', 'completed'] satisfies [
    string,
    string,
    string,
    string,
  ],
};
properties(
  requiredValue(
    properties(requiredValue(properties(player).quests, 'Quest schema')).theyLive,
    'Alien quest schema',
  ),
).defeated = {
  type: 'array',
  uniqueItems: true,
  items: str,
};
for (const [name, schema] of Object.entries({ entities, dialogues, texts, 'player-state': player }))
  await writeFile(
    new URL('schemas/' + name + '.schema.json', import.meta.url),
    JSON.stringify(schema, null, 2) + '\n',
  );
