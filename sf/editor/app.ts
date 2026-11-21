import { isFiniteNumber, errorMessage } from '../types/json.ts';

import type {
  BoundRecord,
  EditorCatalog,
  EditorRecord,
  EditorPath,
  Drafts,
  EditorSaveJob,
  WriterStatus,
  EditorDialogueNode,
} from '../types/editor.ts';

import { editorElement } from '../types/ui.ts';
import { conditionMatches } from '../content-conditions.ts';
import { previewField } from './project.mts';
import { setActionText } from '../context-menu.ts';
import { drawChatHead } from '../character-config.ts';
import { groupEditorRecords } from './groups.ts';
import {
  valueAt,
  draftKey,
  applicableDraft,
  readDraft,
  identityDraftChanges,
  renamedActionLabel,
} from './drafts.ts';

const catalog = JSON.parse(editorElement('editor-catalog').textContent || '{}') as EditorCatalog;
const $ = editorElement;
const records = new Map(catalog.records.map((r) => [r.key, r]));
const groups = groupEditorRecords(catalog.records);
const recordGroups = new Map(groups.flatMap((g) => g.members.map((r) => [r.key, g])));
const shared = catalog.sharedDialogue.map((r) => ({
  ...r,
  key: 'shared:' + r.id,
  name: r.title,
  group: 'shared',
}));
const roots = new Map<string, BoundRecord & { key: string; name: string }>([
  ...records,
  ...shared.map((r): [string, typeof r] => [r.key, r]),
]);
const storageKey = 'sf-world-editor-drafts-v2';
let drafts: Drafts = {},
  undo: Drafts | null = null;
try {
  drafts = JSON.parse(
    localStorage.getItem(storageKey) ?? localStorage.getItem('sf-world-editor-drafts-v1') ?? '{}',
  );
} catch {
  drafts = {};
}
if (!drafts || Array.isArray(drafts) || typeof drafts !== 'object') drafts = {};
const state = {
  group: 'all',
  query: '',
  kind: 'all',
  key: decodeHash(),
  tab: 'actions',
  action: 0,
  dialogue: 0,
  view: 'tree',
  edit: false,
  preview: [] as EditorPath[],
  receipt: null as string | 'Conversation ended.' | null,
};
let writer: WriterStatus = { available: false, busy: false, token: null, job: null };
let visible: ReturnType<typeof groupEditorRecords<EditorRecord>> = [],
  fieldSerial = 0;
function decodeHash() {
  try {
    return decodeURIComponent(location.hash.slice(1));
  } catch {
    return '';
  }
}
function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string | number | null,
) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = String(text);
  return el;
}
function button(text: string, action: (event: MouseEvent) => void, className = '') {
  const el = element('button', className, text);
  el.type = 'button';
  el.addEventListener('click', action);
  return el;
}
function applicable(change: unknown) {
  return applicableDraft(roots, change);
}
function rawRead(root: string, path: EditorPath) {
  return readDraft(roots, drafts, root, path);
}
function read(root: string, path: EditorPath) {
  return previewField(roots.get(root)!, path, rawRead(root, path), { name: roots.get(root)?.name });
}
let previewState = structuredClone(catalog.playerState);
function shown(root: string, path: EditorPath) {
  try {
    return conditionMatches(JSON.parse(rawRead(root, path) || 'true'), previewState);
  } catch {
    return false;
  }
}
function conditionField(parent: HTMLElement, root: string, path: EditorPath) {
  if (!state.edit || !roots.get(root)?.bindings?.[JSON.stringify(path)]) return;
  const detail = element('details', 'state-details');
  detail.append(
    element('summary', '', 'Condition (JSON)'),
    field('Show when', root, path, { rows: 4 }),
  );
  parent.append(detail);
}
function renderStatePreview(parent: HTMLElement) {
  const details = element('details', 'state-details');
  details.append(element('summary', '', 'Player state for preview (JSON)'));
  const input = element('textarea', 'edit-field');
  input.rows = 10;
  input.value = JSON.stringify(previewState, null, 2);
  input.setAttribute('aria-label', 'Preview player state JSON');
  const message = element(
    'p',
    'muted',
    'Preview only. This does not change a player’s saved progress.',
  );
  details.append(
    input,
    button('Apply preview state', () => {
      try {
        previewState = JSON.parse(input.value);
        if (!previewState || typeof previewState !== 'object' || Array.isArray(previewState))
          throw Error('Use a JSON object.');
        for (const [field, index] of [
          ['actions', 'action'] as const,
          ['dialogues', 'dialogue'] as const,
        ]) {
          const variants = current()![field];
          let chosen = variants.findIndex(
            (v, i) =>
              rawRead(state.key, [field, i, 'condition'] satisfies [string, number, string]) !==
                'true' &&
              shown(state.key, [field, i, 'condition'] satisfies [string, number, string]),
          );
          if (chosen < 0)
            chosen = variants.findIndex((v, i) =>
              shown(state.key, [field, i, 'condition'] satisfies [string, number, string]),
            );
          if (chosen >= 0) state[index] = chosen;
        }
        resetPreview();
        renderDetail();
      } catch (error) {
        message.textContent = errorMessage(error);
      }
    }),
    message,
  );
  parent.append(details);
}
function identity(record: EditorRecord) {
  return { name: read(record.key, ['name']), group: read(record.key, ['group']) };
}
function announce(text: string | null) {
  $('status').textContent = text;
}
function saveDraft(root: string, path: EditorPath, after: string) {
  const before = valueAt(roots.get(root), path),
    key = draftKey(root, path);
  if (typeof before !== 'string') throw new Error('The selected field is not editable text.');
  if (after === before) delete drafts[key];
  else drafts[key] = { record: root, name: roots.get(root)?.name, path: [...path], before, after };
  persistDrafts();
}
function persistDrafts() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(drafts));
    announce('Draft saved in this browser. Choose Save to game to write the source files.');
  } catch {
    announce('Draft kept for this session. Browser storage is unavailable; export to keep it.');
  }
  updateDraftStatus();
}
function saveIdentity(field: string, value: string, input: HTMLInputElement | HTMLSelectElement) {
  const selection =
    field === 'name' && input instanceof HTMLInputElement
      ? ([input.selectionStart, input.selectionEnd] as const)
      : null;
  let changes;
  try {
    changes = identityDraftChanges(recordGroups.get(state.key)!.members, field, value);
  } catch (error) {
    input.setCustomValidity(errorMessage(error));
    return;
  }
  input.setCustomValidity('');
  for (const change of changes) {
    const key = draftKey(change.record, change.path);
    if (change.before === change.after) delete drafts[key];
    else drafts[key] = change;
  }
  persistDrafts();
  if (field === 'group' && state.group !== 'all') state.group = value;
  syncGroupFilters();
  counts();
  updateKinds();
  const scroll = $('detail').scrollTop;
  renderList();
  renderDetail();
  const replacement = $(field === 'name' ? 'identity-name' : 'identity-group');
  replacement.focus({ preventScroll: true });
  if (selection && replacement instanceof HTMLInputElement)
    replacement.setSelectionRange(...selection);
  $('detail').scrollTop = scroll;
}
function updateDraftStatus() {
  const changes = Object.values(drafts),
    conflicts = changes.filter((c) => !applicable(c)).length;
  $('draft-count').textContent = String(changes.length);
  $('export').disabled = !changes.length;
  $('save-source').disabled = !writer.available || writer.busy || !changes.length || conflicts > 0;
  $('save-source').textContent = writer.busy ? 'Saving…' : 'Save to game';
  $('save-source').title = writer.available
    ? 'Validate and write canonical JSON content'
    : 'Start the local server with npm run dev';
  $('edit-mode').disabled = writer.busy;
  $('detail').inert = writer.busy;
  $('reset-drafts').disabled = writer.busy || (!changes.length && !undo);
  $('reset-drafts').textContent = changes.length || !undo ? 'Discard drafts' : 'Undo discard';
  for (const row of $('entity-list').querySelectorAll<HTMLElement>(':scope > *')) {
    const group = recordGroups.get(row.dataset.key || '');
    const count = changes.filter((c) => recordGroups.get(c.record) === group).length;
    const dot = row.querySelector('.draft-dot');
    if (dot) {
      dot.textContent = count ? '●' : '';
      dot.setAttribute('aria-label', count ? count + ' local draft edits' : '');
    }
  }
  if (conflicts)
    announce(
      conflicts +
        ' saved draft edits need review because their source text changed. Export includes them marked as conflicts.',
    );
}
function field(
  label: string,
  root: string,
  path: EditorPath,
  {
    rows = 2,
    className = '',
    hideLabel = false,
    target = null,
  }: { rows?: number; className?: string; hideLabel?: boolean; target?: EditorRecord | null } = {},
) {
  const box = element('div', className),
    sourceText = state.edit ? rawRead(root, path) : read(root, path),
    text = target ? renamedActionLabel(sourceText, target.name, identity(target).name) : sourceText;
  const caption = element('label', 'field-label', label);
  if (
    state.edit &&
    roots.get(root)?.bindings?.[JSON.stringify(path)] &&
    typeof valueAt(roots.get(root), path) === 'string'
  ) {
    const input = element('textarea', 'edit-field');
    input.rows = rows;
    input.value = text;
    input.id = 'editor-field-' + fieldSerial++;
    caption.htmlFor = input.id;
    input.setAttribute('aria-label', label);
    input.spellcheck = true;
    if (text !== valueAt(roots.get(root), path)) input.classList.add('changed');
    input.addEventListener('input', () => {
      saveDraft(root, path, input.value);
      input.classList.toggle('changed', input.value !== valueAt(roots.get(root), path));
    });
    box.append(caption, input);
  } else {
    if (!hideLabel) box.append(caption);
    const value = element('p', 'field-value', text || '—');
    if (target) {
      const display = identity(target);
      setActionText(value, text, [{ label: display.name, kind: display.group }]);
    }
    box.append(value);
  }
  return box;
}
function counts() {
  $('object-count').textContent = String(
    groups.filter((r) => identity(r).group === 'object').length,
  );
  $('npc-count').textContent = String(groups.filter((r) => identity(r).group === 'npc').length);
}
function updateKinds() {
  const kinds = [
    ...new Set(
      catalog.records
        .filter((r) => state.group === 'all' || identity(r).group === state.group)
        .map((r) => r.kind),
    ),
  ].sort();
  $('kind').replaceChildren(new Option('All types', 'all'), ...kinds.map((k) => new Option(k, k)));
  if (!kinds.includes(state.kind)) state.kind = 'all';
  $('kind').value = state.kind;
}
const searchText = new Map(
  catalog.records.map((r) => [
    r.key,
    [r.name, r.id, r.kind, r.description, JSON.stringify(r.dialogues)].join(' ').toLowerCase(),
  ]),
);
function matches(record: EditorRecord) {
  return (
    !state.query ||
    [identity(record).name, read(record.key, ['description']), searchText.get(record.key)]
      .join(' ')
      .toLowerCase()
      .includes(state.query)
  );
}
function renderList({ chooseFirst = false } = {}) {
  visible = groups.filter(
    (r) =>
      (state.group === 'all' || identity(r).group === state.group) &&
      (state.kind === 'all' || r.kind === state.kind) &&
      r.members.some(matches),
  );
  $('entity-list').replaceChildren();
  if (!visible.length)
    $('entity-list').append(
      element('p', 'no-results', 'No matches. Try another name, ID, or line of dialogue.'),
    );
  for (const record of visible) {
    const row = button('', () => select(matchingMember(record).key), 'entity');
    row.dataset.key = record.key;
    row.dataset.group = identity(record).group;
    row.setAttribute('aria-current', String(recordGroups.get(state.key) === record));
    row.append(
      element('span', 'draft-dot'),
      element('span', 'entity-name', identity(record).name),
      element(
        'small',
        '',
        record.kind +
          ' · ' +
          (record.members.length > 1 ? record.members.length + ' placements' : record.id),
      ),
    );
    $('entity-list').append(row);
  }
  $('result-count').textContent = visible.length + ' of ' + groups.length + ' unique entries';
  if (
    chooseFirst &&
    visible.length &&
    (!visible.some((g) => g === recordGroups.get(state.key)) || !current() || !matches(current()!))
  )
    select(
      matchingMember(visible.find((g) => g === recordGroups.get(state.key)) || visible[0]).key,
    );
  else if (chooseFirst && !visible.length)
    $('detail').replaceChildren(
      element('div', 'empty-panel', 'No matching entries. Clear the search or change the filters.'),
    );
  else if (chooseFirst && visible.length && !$('detail').querySelector('.entity-header'))
    renderDetail();
  updateDraftStatus();
}
function matchingMember(group: ReturnType<typeof groupEditorRecords<EditorRecord>>[number]) {
  return group.members.find(matches) || group.members[0];
}
function select(key: string, setHash = true) {
  if (!records.has(key)) return;
  state.key = key;
  state.action = 0;
  state.dialogue = 0;
  state.preview = [];
  state.receipt = null;
  if (setHash) history.replaceState(null, '', '#' + encodeURIComponent(key));
  for (const row of $('entity-list').querySelectorAll<HTMLElement>(':scope > *'))
    row.setAttribute('aria-current', String(row.dataset.key === recordGroups.get(key)!.key));
  renderDetail();
  $('detail').scrollTop = 0;
}
function current() {
  return records.get(state.key);
}
function resetPreview() {
  state.preview = [];
  state.receipt = null;
}
function selector(
  label: string,
  variants: readonly { states: readonly string[] }[],
  selected: number,
  callback: (index: number) => void,
) {
  const wrapper = element('label', '', label),
    select = element('select');
  select.setAttribute('aria-label', label);
  variants.forEach((v, i) =>
    select.append(
      new Option(
        v.states[0] + (v.states.length > 1 ? ' · +' + (v.states.length - 1) + ' states' : ''),
        String(i),
      ),
    ),
  );
  select.value = String(selected);
  select.addEventListener('change', () => callback(Number(select.value)));
  wrapper.append(select);
  return wrapper;
}
function stateNote(variant: { states: readonly string[] }) {
  const details = element('details', 'state-details');
  details.append(element('summary', '', 'States covered (' + variant.states.length + ')'));
  const list = element('ul');
  variant.states.forEach((s) => list.append(element('li', '', s)));
  details.append(list);
  return details;
}
function renderDetail() {
  const r = current();
  if (!r) return;
  const display = identity(r);
  fieldSerial = 0;
  const main = $('detail');
  main.replaceChildren();
  if (state.edit) {
    const banner = element('div', 'draft-banner');
    banner.append(
      element('p', '', 'Unsaved edits · Save to game validates and writes the JSON files.'),
    );
    main.append(banner);
  }
  const header = element('header', 'entity-header');
  if (r.appearance && display.group === 'npc') {
    const canvas = element('canvas', 'entity-avatar');
    canvas.width = 140;
    canvas.height = 156;
    canvas.setAttribute('aria-label', display.name + ' portrait');
    drawChatHead(canvas, r.appearance);
    header.append(canvas);
  }
  const copy = element('div', 'header-copy');
  copy.append(
    element('div', 'eyebrow', display.group === 'object' ? 'World object' : 'Non-player character'),
    element('h2', display.group === 'object' ? 'object-text' : 'npc-text', display.name),
  );
  const meta = element('div', 'entity-meta');
  const group = recordGroups.get(r.key)!;
  meta.append(
    element('span', '', r.kind),
    element(
      'code',
      '',
      group.members.length > 1 ? group.members.length + ' world placements' : r.id,
    ),
  );
  copy.append(meta);
  const coords = element('div', 'coordinates');
  if (isFiniteNumber(r.position.x) && isFiniteNumber(r.position.z)) {
    coords.append(
      element('span', 'muted', 'x ' + r.position.x.toFixed(2) + ' / y ' + r.position.z.toFixed(2)),
      button('Copy teleport command', async () => {
        const command = ':tp ' + r.position.x + ',' + r.position.z;
        try {
          await navigator.clipboard.writeText(command);
          announce('Copied ' + command);
        } catch {
          announce(command);
        }
      }),
    );
  } else coords.append(element('span', 'muted', 'Position varies during play'));
  copy.append(coords);
  header.append(copy);
  main.append(header);
  if (state.edit) renderIdentityEditor(main, r);
  main.append(field('Examine text', r.key, ['description'], { className: 'description' }));
  const tabs = element('div', 'tabs');
  tabs.setAttribute('role', 'tablist');
  for (const [id, label, count] of [
    ['actions', 'Action menus', r.actions.length],
    ['dialogue', 'Dialogue menus', r.dialogues.length],
  ] satisfies [string, string, number][]) {
    const b = button(label, () => {
      state.tab = id;
      resetPreview();
      renderDetail();
    });
    b.append(element('span', '', count));
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(state.tab === id));
    tabs.append(b);
  }
  main.append(tabs);
  renderStatePreview(main);
  if (state.tab === 'actions') renderActions(main, r);
  else renderDialogues(main, r);
  const source = element('details', 'source-info');
  source.append(element('summary', '', 'Definition details'));
  if (group.members.length > 1) {
    const label = element('label', 'placement-selector', 'World placement'),
      placement = element('select');
    placement.setAttribute('aria-label', 'World placement');
    for (const member of group.members) {
      const p = member.position;
      const coords =
        isFiniteNumber(p.x) && isFiniteNumber(p.z)
          ? ' · x ' + p.x.toFixed(2) + ' / y ' + p.z.toFixed(2)
          : '';
      placement.append(new Option(member.id + coords, member.key));
    }
    placement.value = r.key;
    placement.addEventListener('change', () => select(placement.value));
    label.append(placement);
    source.append(
      element(
        'p',
        'muted',
        'Repeated placements share one catalog entry. Choose a placement to inspect any location-specific text or menus.',
      ),
      label,
    );
  }
  const dl = element('dl');
  for (const [label, value] of [
    ['Entry key', r.key],
    ['Placement group', r.source],
    ['Content definition', 'sf/content/entities.json · ' + r.definitionId] satisfies [
      string,
      string,
    ],
    ['Catalog snapshot', catalog.fingerprint],
  ])
    dl.append(element('dt', '', label), element('dd', '', value));
  source.append(dl);
  main.append(source);
}
function renderIdentityEditor(main: HTMLElement, r: EditorRecord) {
  const panel = element('section', 'identity-editor');
  panel.setAttribute('aria-label', 'Edit identity');
  const nameLabel = element('label', 'field-label', 'Name'),
    name = element('input', 'edit-field');
  name.id = 'identity-name';
  name.type = 'text';
  name.maxLength = 80;
  name.required = true;
  name.value = identity(r).name;
  nameLabel.htmlFor = name.id;
  name.addEventListener('input', () => saveIdentity('name', name.value, name));
  const categoryLabel = element('label', 'field-label', 'Entity category'),
    category = element('select');
  category.id = 'identity-group';
  category.append(new Option('NPC · yellow', 'npc'), new Option('Object · teal', 'object'));
  category.value = identity(r).group;
  categoryLabel.htmlFor = category.id;
  category.addEventListener('change', () => saveIdentity('group', category.value, category));
  const fields = element('div', 'identity-fields');
  for (const [label, input] of [
    [nameLabel, name],
    [categoryLabel, category],
  ]) {
    const wrapper = element('div');
    wrapper.append(label, input);
    fields.append(wrapper);
  }
  const count = recordGroups.get(r.key)!.members.length;
  panel.append(
    fields,
    element(
      'p',
      'muted',
      (count > 1 ? 'Applies to all ' + count + ' placements in this entry. ' : '') +
        'Save to game writes names and NPC/Object categories to the game’s source configuration. Existing menus remain available to edit below.',
    ),
  );
  main.append(panel);
}
function renderActions(main: HTMLElement, r: EditorRecord) {
  const variant = r.actions[state.action];
  if (!variant) {
    main.append(element('div', 'empty-panel', 'This entry has no context menu.'));
    return;
  }
  const toolbar = element('div', 'section-toolbar');
  toolbar.append(
    selector('Menu state', r.actions, state.action, (i) => {
      state.action = i;
      renderDetail();
    }),
    element('small', '', 'Exact game order · preview only'),
  );
  main.append(toolbar);
  conditionField(main, r.key, ['actions', state.action, 'condition'] satisfies [
    string,
    number,
    string,
  ]);
  const layout = element('div', 'menu-layout'),
    menu = element('div', 'game-menu');
  menu.setAttribute('aria-label', 'Action menu preview');
  menu.append(element('div', 'menu-heading', 'Choose an option'));
  variant.actions.forEach((action, i) => {
    if (
      !state.edit &&
      !shown(r.key, ['actions', state.action, 'actions', i, 'condition'] satisfies [
        string,
        number,
        string,
        number,
        string,
      ])
    )
      return;
    menu.append(
      field(
        'Action ' + (i + 1),
        r.key,
        ['actions', state.action, 'actions', i, 'label'] satisfies [
          string,
          number,
          string,
          number,
          string,
        ],
        {
          hideLabel: true,
          className: 'menu-row',
          rows: 1,
          target: r,
        },
      ),
    );
    conditionField(menu, r.key, ['actions', state.action, 'actions', i, 'condition'] satisfies [
      string,
      number,
      string,
      number,
      string,
    ]);
  });
  const note = element('div', 'menu-note');
  note.append(
    element(
      'p',
      '',
      'These are the options the game builds for this target. Change the menu state to inspect conditional actions.',
    ),
  );
  if (identity(r).group === 'npc')
    note.append(element('p', '', 'Combat, movement, trades, and purchases are not executed here.'));
  note.append(stateNote(variant));
  layout.append(menu, note);
  main.append(layout);
}
function renderDialogues(main: HTMLElement, r: EditorRecord) {
  const display = identity(r);
  if (!r.dialogues.length) {
    const empty = element('div', 'empty-panel');
    empty.append(
      element(
        'strong',
        '',
        display.group === 'object' ? 'No NPC dialogue on this object' : 'No conversation menu',
      ),
      element(
        'span',
        '',
        display.group === 'object'
          ? 'Inspect the person providing the service in the NPC list.'
          : 'This character uses its action menu or activity interactions.',
      ),
    );
    main.append(empty);
    return;
  }
  const variant = r.dialogues[state.dialogue],
    toolbar = element('div', 'section-toolbar');
  toolbar.append(
    selector('Dialogue state', r.dialogues, state.dialogue, (i) => {
      state.dialogue = i;
      resetPreview();
      renderDetail();
    }),
    element('small', '', 'Actions are never executed'),
  );
  main.append(toolbar);
  const views = element('div', 'view-options');
  for (const [id, label] of [
    ['tree', 'All branches'] satisfies [string, string],
    ['preview', 'Play through'] satisfies [string, string],
  ]) {
    const b = button(label, () => {
      state.view = id;
      resetPreview();
      renderDetail();
    });
    b.setAttribute('aria-pressed', String(state.view === id));
    views.append(b);
  }
  main.append(views);
  conditionField(main, r.key, ['dialogues', state.dialogue, 'condition'] satisfies [
    string,
    number,
    string,
  ]);
  if (variant.dialogue) {
    const path = ['dialogues', state.dialogue, 'dialogue'] satisfies [string, number, string];
    if (state.view === 'preview') renderPreview(main, r.key, path, display.name);
    else renderTree(main, r.key, path, display.name, 0);
  } else {
    if (variant.speech)
      main.append(
        field(
          'Spoken line',
          r.key,
          ['dialogues', state.dialogue, 'speech'] satisfies [string, number, string],
          {
            className: 'npc-line',
          },
        ),
      );
    if (variant.panel)
      main.append(element('div', 'shared-box', 'Opens the ' + variant.panel + ' interface.'));
  }
  main.append(stateNote(variant));
}
function sharedChooser(parent: HTMLElement) {
  const box = element('div', 'shared-box');
  box.append(
    element('div', 'field-label', 'Shared casual conversation pool'),
    element('p', 'muted', 'This NPC can use any of these ' + shared.length + ' conversations.'),
  );
  const select = element('select');
  select.setAttribute('aria-label', 'Shared conversation');
  shared.forEach((r) => select.append(new Option(r.name || r.id, r.key)));
  const tree = element('div');
  const refresh = () => {
    tree.replaceChildren();
    renderTree(tree, select.value, ['dialogue'], identity(current()!).name, 0);
  };
  select.addEventListener('change', refresh);
  box.append(select, tree);
  parent.append(box);
  refresh();
}
function renderTree(
  parent: HTMLElement,
  root: string,
  path: EditorPath,
  speaker: string,
  depth: number,
) {
  const node = valueAt(roots.get(root), path) as EditorDialogueNode | undefined;
  if (!node) return;
  if (node.sharedPool) {
    sharedChooser(parent);
    return;
  }
  const section = element('div', 'dialogue-node dialogue-tree');
  if (!node.skipIntro || node.intro)
    section.append(field(speaker, root, [...path, 'intro'], { rows: 3, className: 'npc-line' }));
  if (node.question) {
    const q = element('details', 'prompt-note');
    q.append(
      element('summary', '', 'Authored prompt field'),
      field('Prompt (not shown in the current dialogue UI)', root, [...path, 'question']),
    );
    section.append(q);
  }
  (node.choices || []).forEach((choice, i) => {
    const cp = [...path, 'choices', i],
      detail = element('details', 'choice-node');
    detail.open = depth < 1;
    detail.append(element('summary', '', 'You · ' + read(root, [...cp, 'label'])));
    const body = element('div', 'choice-body');
    if (state.edit) body.append(field('Player response', root, [...cp, 'label'], { rows: 1 }));
    conditionField(body, root, [...cp, 'condition']);
    if (choice.sharedPool) sharedChooser(body);
    else if (choice.next) renderTree(body, root, [...cp, 'next'], speaker, depth + 1);
    else {
      if (choice.receipt)
        body.append(
          field(speaker + ' · reply', root, [...cp, 'receipt'], { className: 'reply', rows: 3 }),
        );
      else
        body.append(
          element(
            'p',
            'receipt-note',
            choice.binding || choice.trade
              ? 'Response comes from the game action’s server receipt.'
              : 'This response has no authored reply.',
          ),
        );
      if (choice.serverReceipt)
        body.append(
          element(
            'p',
            'receipt-note',
            'The game uses the server receipt when this action completes.',
          ),
        );
      if (choice.binding || choice.trade) {
        const binding = element('details', 'binding');
        binding.append(
          element(
            'summary',
            '',
            choice.trade ? 'Trade binding · ' + choice.trade : 'Action binding',
          ),
          element('pre', '', choice.binding || choice.trade),
        );
        body.append(binding);
      }
    }
    detail.append(body);
    section.append(detail);
  });
  section.append(
    field('Exit option', root, [...path, 'decline'], { rows: 1, className: 'dialogue-end' }),
  );
  parent.append(section);
}
function renderPreview(
  parent: HTMLElement,
  root: string,
  basePath: (string | number)[],
  speaker: string | null | undefined,
) {
  const nodePath = state.preview.length ? state.preview.at(-1)! : basePath;
  const node = valueAt(roots.get(root), nodePath) as EditorDialogueNode;
  if (node.sharedPool) {
    sharedChooser(parent);
    return;
  }
  const box = element('section', 'preview');
  box.append(element('h3', '', speaker));
  const options = element('div', 'preview-choices');
  if (state.receipt) {
    box.append(element('p', 'preview-line', state.receipt));
    options.append(
      button('Return to choices', () => {
        state.receipt = null;
        renderDetail();
      }),
    );
  } else {
    box.append(
      element(
        'p',
        'preview-line',
        node.skipIntro ? 'Choose a response.' : read(root, [...nodePath, 'intro']),
      ),
    );
    (node.choices || []).forEach((choice, i) => {
      if (!shown(root, [...nodePath, 'choices', i, 'condition'])) return;
      options.append(
        button(read(root, [...nodePath, 'choices', i, 'label']), () => {
          if (choice.sharedPool) {
            box.replaceChildren();
            sharedChooser(box);
            return;
          }
          if (choice.next) state.preview.push([...nodePath, 'choices', i, 'next']);
          else
            state.receipt = choice.receipt
              ? read(root, [...nodePath, 'choices', i, 'receipt'])
              : 'This choice calls a game action. Its response is supplied by the server. Nothing was executed.';
          renderDetail();
        }),
      );
    });
    options.append(
      button(
        read(root, [...nodePath, 'decline']),
        () => {
          state.receipt = 'Conversation ended.';
          renderDetail();
        },
        'quiet',
      ),
    );
  }
  box.append(options);
  const nav = element('div', 'preview-nav');
  if (state.preview.length)
    nav.append(
      button(
        'Previous menu',
        () => {
          state.preview.pop();
          state.receipt = null;
          renderDetail();
        },
        'quiet',
      ),
    );
  nav.append(
    button(
      'Restart conversation',
      () => {
        resetPreview();
        renderDetail();
      },
      'quiet',
    ),
  );
  box.append(nav);
  parent.append(box);
}
function syncGroupFilters() {
  for (const tab of document.querySelectorAll<HTMLButtonElement>('.filters button'))
    tab.setAttribute('aria-pressed', String(tab.dataset.group === state.group));
}
for (const b of document.querySelectorAll<HTMLButtonElement>('.filters [data-group]'))
  b.addEventListener('click', () => {
    state.group = b.dataset.group || 'all';
    syncGroupFilters();
    updateKinds();
    renderList({ chooseFirst: true });
  });
$('search').addEventListener('input', (e) => {
  state.query = $('search').value.trim().toLowerCase();
  renderList({ chooseFirst: true });
});
$('kind').addEventListener('change', (e) => {
  state.kind = $('kind').value;
  renderList({ chooseFirst: true });
});
$('edit-mode').addEventListener('change', (e) => {
  state.edit = $('edit-mode').checked;
  renderDetail();
});
$('reset-drafts').addEventListener('click', () => {
  if (Object.keys(drafts).length) {
    undo = drafts;
    drafts = {};
    announce('Drafts discarded. Choose Undo discard to restore them.');
  } else if (undo) {
    drafts = undo;
    undo = null;
    announce('Drafts restored.');
  }
  try {
    localStorage.setItem(storageKey, JSON.stringify(drafts));
  } catch {}
  if (state.group !== 'all') state.group = identity(current()!).group;
  syncGroupFilters();
  counts();
  updateKinds();
  renderList();
  renderDetail();
});
$('export').addEventListener('click', () => {
  const data = {
    schema: 1,
    catalogFingerprint: catalog.fingerprint,
    changes: Object.values(drafts).map((c) => ({ ...c, conflict: !applicable(c) })),
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' }),
  );
  const link = element('a');
  link.href = url;
  link.download = 'world-editor-changes.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce('Exported ' + data.changes.length + ' proposed changes. Game files were not modified.');
});
async function writerRequest(
  path: URL | RequestInfo,
  body: object | null = null,
): Promise<WriterStatus> {
  const response = await fetch(path, {
    method: body ? 'POST' : 'GET',
    cache: 'no-store',
    headers: body
      ? { 'Content-Type': 'application/json', 'X-Editor-Token': writer.token || '' }
      : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Unable to contact the editor server.');
  return result;
}
function finishSavedJob(job: EditorSaveJob) {
  for (const change of job.changes || []) {
    const key = draftKey(change.record, change.path);
    if (JSON.stringify(drafts[key]) === JSON.stringify(change)) delete drafts[key];
  }
  undo = null;
  try {
    localStorage.setItem(storageKey, JSON.stringify(drafts));
  } catch {}
  if (catalog.fingerprint !== job.catalogFingerprint) {
    location.reload();
    return;
  }
  counts();
  updateKinds();
  renderList();
  renderDetail();
  announce(job.message);
  updateDraftStatus();
}
async function watchSave() {
  while (writer.busy) {
    announce(writer.job?.message || 'Saving JSON content…');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    writer = await writerRequest('/__editor/status');
    updateDraftStatus();
  }
  if (writer.job?.phase === 'done') finishSavedJob(writer.job);
  else if (writer.job?.phase === 'error')
    announce(writer.job.message + ' Choose Retry save. Your edits are retained.');
}
$('save-source').addEventListener('click', async () => {
  writer.busy = true;
  updateDraftStatus();
  announce('Writing changes to the game’s JSON files…');
  try {
    writer = await writerRequest('/__editor/save', {
      catalogFingerprint: catalog.fingerprint,
      changes: Object.values(drafts),
    });
    await watchSave();
  } catch (error) {
    writer.busy = false;
    updateDraftStatus();
    announce(errorMessage(error) + ' Your edits are retained in this browser.');
  }
});
async function connectWriter() {
  if (!(['http:', 'https:'] satisfies [string, string]).includes(location.protocol)) {
    announce('For direct saving, run npm run dev and open http://localhost:8080/editor.html.');
    updateDraftStatus();
    return;
  }
  try {
    writer = await writerRequest('/__editor/status');
    updateDraftStatus();
    if (writer.busy) await watchSave();
    else if (writer.job?.phase === 'done') finishSavedJob(writer.job);
    else if (writer.job?.phase === 'error') announce(writer.job.message + ' Choose Retry save.');
    else announce('Connected. Save to game validates and writes JSON content directly.');
  } catch {
    announce('For direct saving, use the local server: npm run dev.');
  }
}
window.addEventListener('hashchange', () => {
  const key = decodeHash();
  if (records.has(key)) select(key, false);
});
document.addEventListener('keydown', (e) => {
  if (!(e.target instanceof HTMLElement)) return;
  if (
    (['INPUT', 'TEXTAREA', 'SELECT'] satisfies [string, string, string]).includes(e.target.tagName)
  )
    return;
  if (e.key === '/') {
    e.preventDefault();
    $('search').focus();
  }
  if (
    e.target.closest('#entity-list') &&
    (['ArrowDown', 'ArrowUp'] satisfies [string, string]).includes(e.key)
  ) {
    e.preventDefault();
    const i = visible.indexOf(recordGroups.get(state.key)!),
      next = visible[(i + (e.key === 'ArrowDown' ? 1 : -1) + visible.length) % visible.length];
    if (next) {
      select(matchingMember(next).key);
      for (const b of $('entity-list').querySelectorAll<HTMLElement>(':scope > *'))
        if (b.dataset.key === next.key) {
          b.focus();
          b.scrollIntoView({ block: 'nearest' });
        }
    }
  }
});
counts();
updateKinds();
renderList();
select(records.has(state.key) ? state.key : catalog.records[0].key);
$('catalog-version').textContent =
  'Catalog ' +
  catalog.fingerprint +
  ' · ' +
  groups.length +
  ' entries · ' +
  catalog.records.length +
  ' world placements';
connectWriter();
