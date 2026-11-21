import { requiredElement } from '../types/ui.ts';
import { errorMessage, isRecord } from '../types/json.ts';
interface AdminRow {
  kind: string;
  key: string;
  label: string | null;
}
interface AdminList {
  records: AdminRow[];
  backend: string;
  location: string;
}
interface AdminRecord {
  raw: string;
}
interface AdminElements {
  status: HTMLDivElement;
  editor: HTMLTextAreaElement;
  save: HTMLButtonElement;
  format: HTMLButtonElement;
  reload: HTMLButtonElement;
  refresh: HTMLButtonElement;
  search: HTMLInputElement;
  dirty: HTMLSpanElement;
  count: HTMLParagraphElement;
  records: HTMLElement;
  source: HTMLParagraphElement;
  title: HTMLHeadingElement;
  key: HTMLParagraphElement;
}
declare const __ADMIN_READ_ONLY__: boolean;
const token = '__ADMIN_TOKEN__';
const readOnly = __ADMIN_READ_ONLY__;
const $ = <K extends keyof AdminElements>(id: K) => requiredElement<AdminElements[K]>(id);
let records: AdminRow[] = [],
  selected: AdminRow | null = null,
  original = '',
  baseline = '',
  busy = false;
function status(message: string | null, type = '') {
  $('status').textContent = message;
  $('status').className = type;
}
function changed() {
  return !readOnly && !!selected && $('editor').value !== baseline;
}
function controls() {
  $('save').disabled = readOnly || busy || !changed();
  $('save').hidden = readOnly;
  $('editor').readOnly = readOnly;
  for (const id of ['format', 'reload'] as const) $(id).disabled = busy || !selected;
  $('editor').disabled = busy || !selected;
  $('refresh').disabled = busy;
  $('dirty').textContent = changed() ? 'Unsaved changes' : '';
}
function api(path: 'records', options?: RequestInit): Promise<AdminList>;
function api(path: string, options?: RequestInit): Promise<AdminRecord>;
async function api(path: string, options: RequestInit = {}): Promise<AdminList | AdminRecord> {
  const response = await fetch('/api/' + path, {
    ...options,
    headers: { 'X-Admin-Token': token, 'Content-Type': 'application/json' },
  });
  const result: unknown = await response.json();
  if (!response.ok)
    throw Error(
      isRecord(result) && typeof result.error === 'string' ? result.error : 'Request failed.',
    );
  return result as AdminList | AdminRecord;
}
function draw() {
  const query = $('search').value.toLowerCase();
  const visible = records.filter((row) =>
    (row.label + ' ' + row.key + ' ' + row.kind).toLowerCase().includes(query),
  );
  $('count').textContent = visible.length + ' of ' + records.length + ' records';
  $('records').replaceChildren();
  for (const row of visible) {
    const button = document.createElement('button');
    button.type = 'button';
    button.disabled = busy;
    button.className =
      selected && row.kind === selected.kind && row.key === selected.key ? 'active' : '';
    button.textContent = row.label;
    const detail = document.createElement('small');
    detail.textContent = row.kind + ' · ' + row.key;
    button.append(detail);
    button.onclick = () => load(row);
    $('records').append(button);
  }
}
async function refresh() {
  const data = await api('records');
  records = data.records;
  $('source').textContent = data.backend.toUpperCase() + ' · ' + data.location;
  draw();
}
async function load(row: AdminRow) {
  if (busy || (changed() && !confirm('Discard unsaved changes?'))) return;
  busy = true;
  controls();
  draw();
  try {
    const data = await api('record?' + new URLSearchParams({ kind: row.kind, key: row.key }));
    const formatted = JSON.stringify(JSON.parse(data.raw), null, 2);
    selected = row;
    original = data.raw;
    baseline = formatted;
    $('editor').value = baseline;
    $('title').textContent = row.label;
    $('key').textContent = row.kind + ' · ' + row.key;
    status(
      readOnly
        ? 'Read-only inspection. Refresh or reload to see the latest saved checkpoint.'
        : row.kind === 'usernames'
          ? 'For a rename, update name and canonical (lowercase). Keep owner unchanged. changed is a timestamp in milliseconds.'
          : 'Edit the JSON, then save. Changes are written directly to the database.',
    );
  } catch (error) {
    status(errorMessage(error), 'error');
  } finally {
    busy = false;
    controls();
    draw();
  }
}
$('save').onclick = async () => {
  busy = true;
  controls();
  draw();
  try {
    const value = JSON.parse($('editor').value);
    const data = await api('record', {
      method: 'PUT',
      body: JSON.stringify({ ...selected, original, value }),
    });
    original = data.raw;
    baseline = JSON.stringify(value, null, 2);
    $('editor').value = baseline;
    status('Saved. Restart the game server to load this change.', 'success');
    try {
      await refresh();
    } catch (error) {
      status('Saved, but refreshing the list failed: ' + errorMessage(error), 'error');
    }
  } catch (error) {
    status(errorMessage(error), 'error');
  } finally {
    busy = false;
    controls();
    draw();
  }
};
$('format').onclick = () => {
  try {
    $('editor').value = JSON.stringify(JSON.parse($('editor').value), null, 2);
    controls();
    status('JSON formatted.');
  } catch (error) {
    status(errorMessage(error), 'error');
  }
};
$('reload').onclick = () => {
  if (selected) void load(selected);
};
$('refresh').onclick = () => refresh().catch((error) => status(errorMessage(error), 'error'));
$('search').oninput = draw;
$('editor').oninput = controls;
window.addEventListener('beforeunload', (event) => {
  if (changed()) {
    event.preventDefault();
    event.returnValue = '';
  }
});
controls();
refresh().catch((error) => status(errorMessage(error), 'error'));

export {};
