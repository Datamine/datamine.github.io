import type {
  ContentFile,
  EditorPath,
  BoundRecord,
  EditorRecord,
  EditorMenu,
  EditorVariant,
  EditorChoice,
  EditorDialogueNode,
  SharedEditorRecord,
  EditorCatalog,
} from '../types/editor.ts';
import type { TextSpec, TextValues, DialogueVariant, ContentBundle } from '../types/content.ts';
import { isRecord } from '../types/json.ts';
import { validatePlayerDocument } from '../content/validate.js';
import { renderContentText } from '../content-runtime.ts';
import defaults from '../content/player-state-defaults.json' with { type: 'json' };

/** IDs in source paths address maps or array members, never display text or array offsets. */
export function sourceValue(
  bundle: ContentBundle,
  file: ContentFile,
  path: readonly string[],
): unknown {
  let node: unknown = bundle[file];
  for (const key of path)
    node = Array.isArray(node)
      ? node.find((v: unknown) => isRecord(v) && v.id === key)
      : isRecord(node)
        ? node[key]
        : undefined;
  return node;
}
export function setSourceValue(
  bundle: ContentBundle,
  file: ContentFile,
  path: readonly string[],
  value: unknown,
): void {
  const parent = sourceValue(bundle, file, path.slice(0, -1)),
    key = path.at(-1);
  if (
    !isRecord(parent) ||
    key === undefined ||
    ['__proto__', 'prototype', 'constructor'].includes(key)
  )
    throw new Error('Invalid content field path.');
  if (value === undefined) delete parent[key];
  else parent[key] = value;
}

export function projectCatalog(bundle: ContentBundle, revision = bundle.revision): EditorCatalog {
  const { entities, dialogues, texts } = bundle;
  function bind<T extends string>(
    root: BoundRecord,
    dto: EditorPath,
    file: ContentFile,
    path: readonly string[],
    value: T,
    kind?: 'text' | 'scalar',
    values?: TextValues,
  ): T;
  function bind(
    root: BoundRecord,
    dto: EditorPath,
    file: ContentFile,
    path: readonly string[],
    value: unknown,
    kind: 'condition',
    values?: TextValues,
  ): string;
  function bind(
    root: BoundRecord,
    dto: EditorPath,
    file: ContentFile,
    path: readonly string[],
    value: unknown,
    kind = 'text',
    values: TextValues = {},
  ) {
    root.bindings[JSON.stringify(dto)] = {
      file,
      path,
      kind,
      values,
      ...(value === undefined ? {} : { value }),
    };
    return kind === 'condition'
      ? JSON.stringify(value ?? true, null, 2)
      : typeof value === 'string'
        ? value
        : '';
  }

  function text(
    root: BoundRecord,
    dto: EditorPath,
    file: ContentFile,
    path: readonly string[],
    spec: TextSpec | undefined,
    values: TextValues = {},
  ): string {
    if (typeof spec === 'object' && spec && 'text' in spec)
      return bind(
        root,
        dto,
        'texts',
        ['texts', spec.text, 'template'],
        texts.texts[spec.text].template,
        'text',
        values,
      );
    if (typeof spec === 'string') return bind(root, dto, file, path, spec, 'text', values);
    // Conditional text selections remain editable in JSON; the UI shows their default.
    return typeof spec === 'object' && spec && 'select' in spec
      ? text(root, dto, file, [...path, 'default'], spec.default, values)
      : '';
  }
  function graph(root: BoundRecord, variant: DialogueVariant, base: EditorPath) {
    const vp = ['variants', variant.id];
    function node(id: string, dto: EditorPath): EditorDialogueNode {
      const n = variant.nodes![id],
        np = [...vp, 'nodes', id];
      const out: EditorDialogueNode = { id, repeat: n.repeat, skipIntro: n.skipIntro, choices: [] };
      for (const f of ['intro', 'question', 'decline'] as const)
        out[f] = text(
          root,
          [...dto, f],
          'dialogues',
          [...np, f],
          n[f],
          variant.sampleValues?.[id + ':' + f],
        );
      out.choices = n.choices.map((c, i) => {
        const cp = [...np, 'choices', c.id],
          dp = [...dto, 'choices', i];
        const choice: EditorChoice = {
          label: '',
          condition: '',
          id: c.id,
          binding: c.action,
          trade: c.trade,
          serverReceipt: c.serverReceipt,
        };
        choice.label = text(
          root,
          [...dp, 'label'],
          'dialogues',
          [...cp, 'label'],
          c.label,
          variant.sampleValues?.[c.id + ':label'],
        );
        choice.condition = bind(
          root,
          [...dp, 'condition'],
          'dialogues',
          [...cp, 'when'],
          c.when,
          'condition',
        );
        if (c.receipt !== undefined)
          choice.receipt = text(
            root,
            [...dp, 'receipt'],
            'dialogues',
            [...cp, 'receipt'],
            c.receipt,
            variant.sampleValues?.[c.id + ':receipt'],
          );
        if (c.next) choice.next = node(c.next, [...dp, 'next']);
        if (c.shared) choice.sharedPool = true;
        return choice;
      });
      return out;
    }
    return node(variant.root!, base);
  }
  const records = Object.values(entities.placements).map((p) => {
    const d = entities.definitions[p.definition],
      ep = ['definitions', d.id];
    const r: EditorRecord = {
      name: '',
      group: d.category,
      description: '',
      key: p.id,
      id: p.id.split(':').slice(1).join(':'),
      definitionId: d.id,
      kind: d.kind,
      source: p.source,
      position: p.position,
      appearance: p.appearance,
      bindings: {},
      actions: [],
      dialogues: [],
    };
    r.name = bind(r, ['name'], 'entities', [...ep, 'name'], d.name);
    r.group = bind(r, ['group'], 'entities', [...ep, 'category'], d.category, 'scalar');
    r.description = text(
      r,
      ['description'],
      'entities',
      Object.hasOwn(p, 'description')
        ? ['placements', p.id, 'description']
        : [...ep, 'description'],
      p.description ?? d.description,
    );
    for (const m of d.menus.filter((v) => v.placements.includes(p.id))) {
      const i = r.actions.length,
        mp = [...ep, 'menus', m.id];
      const menu: EditorMenu = {
        id: m.id,
        states: m.states,
        actions: [],
        condition: bind(
          r,
          ['actions', i, 'condition'] satisfies [string, number, string],
          'entities',
          [...mp, 'when'],
          m.when,
          'condition',
        ),
      };
      menu.actions = m.actions.map((a, j) => ({
        id: a.id,
        binding: a.action,
        disabled: a.disabled,
        label: text(
          r,
          ['actions', i, 'actions', j, 'label'],
          'entities',
          [...mp, 'actions', a.id, 'label'],
          a.label,
          { name: d.name, level: p.level || 1 },
        ),
        condition: bind(
          r,
          ['actions', i, 'actions', j, 'condition'],
          'entities',
          [...mp, 'actions', a.id, 'when'],
          a.when,
          'condition',
        ),
      }));
      r.actions.push(menu);
    }
    for (const v of d.dialogues
      .map((id) => dialogues.variants[id])
      .filter((v) => v.placements.includes(p.id))) {
      const i = r.dialogues.length,
        dto = ['dialogues', i] satisfies [string, number];
      const variant: EditorVariant = {
        id: v.id,
        states: v.states,
        condition: bind(
          r,
          [...dto, 'condition'],
          'dialogues',
          ['variants', v.id, 'when'],
          v.when,
          'condition',
        ),
      };
      if (v.shared) variant.dialogue = { sharedPool: true };
      else if (v.nodes) variant.dialogue = graph(r, v, [...dto, 'dialogue']);
      else {
        variant.speech = text(
          r,
          [...dto, 'speech'],
          'dialogues',
          ['variants', v.id, 'speech'],
          v.speech || '',
        );
        variant.panel = v.panel;
      }
      r.dialogues.push(variant);
    }
    return r;
  });
  const sharedDialogue = Object.values(dialogues.shared).map((chain) => {
    const r: SharedEditorRecord = {
      id: chain.id,
      title: chain.title || chain.id,
      bindings: {},
      dialogue: {},
    };
    function node(id: string, dto: EditorPath): EditorDialogueNode {
      const n = chain.nodes[id],
        np = ['shared', chain.id, 'nodes', id];
      return {
        id,
        intro: text(r, [...dto, 'intro'], 'dialogues', [...np, 'text'], n.text),
        decline: 'Leave',
        choices: (n.choices || []).map((c, i) => {
          const dp = [...dto, 'choices', i],
            cp = [...np, 'choices', c.id],
            target = chain.nodes[c.next];
          return {
            id: c.id,
            label: text(r, [...dp, 'label'], 'dialogues', [...cp, 'text'], c.text),
            condition: bind(
              r,
              [...dp, 'condition'],
              'dialogues',
              [...cp, 'when'],
              c.when,
              'condition',
            ),
            ...(target.end
              ? {
                  receipt: text(
                    r,
                    [...dp, 'receipt'],
                    'dialogues',
                    ['shared', chain.id, 'nodes', c.next, 'text'],
                    target.text,
                  ),
                }
              : { next: node(c.next, [...dp, 'next']) }),
          };
        }),
      };
    }
    r.dialogue = node(chain.start, ['dialogue']);
    return r;
  });
  return {
    schema: 2,
    fingerprint: revision,
    records,
    sharedDialogue,
    playerState: structuredClone(validatePlayerDocument(defaults)),
  };
}

export function previewField(
  root: BoundRecord,
  path: EditorPath,
  template: string,
  state: { name?: string } = {},
) {
  const binding = root.bindings?.[JSON.stringify(path)];
  return renderContentText(template, { ...binding?.values, name: state.name ?? root.name });
}
