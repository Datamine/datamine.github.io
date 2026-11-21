import type { JSONValue, JSONObject, ContentBundle } from '../types/content.ts';
import { readFile, writeFile } from 'node:fs/promises';
const read = async <T,>(path: string | URL): Promise<T> =>
  JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const services = await read<{ conversations: JSONObject }>('../dialogues/services.json'),
  goose = await read<{ conversations: JSONObject }>('../dialogues/goose-corp.json');
const data = await read<{ services: Record<string, JSONValue> }>('dialogues.json'),
  texts = await read<ContentBundle['texts']>('texts.json');
const fields = new Set(['intro', 'question', 'choice', 'label', 'receipt', 'decline'] satisfies [
  string,
  string,
  string,
  string,
  string,
  string,
]);
function convert(value: JSONValue, id: string, path = 'root'): JSONValue {
  if (Array.isArray(value)) return value.map((v, i) => convert(v, id, path + '.' + i));
  if (!value || typeof value !== 'object') return value;
  const result: JSONObject = { ...value };
  const nodeId = value.id || 'service.' + id + '.' + path;
  if (
    Object.keys(value).some((k) =>
      (
        ['intro', 'choice', 'choices', 'label', 'receipt', 'next'] satisfies [
          string,
          string,
          string,
          string,
          string,
          string,
        ]
      ).includes(k),
    )
  )
    result.id = nodeId;
  for (const [k, v] of Object.entries(value)) {
    if (fields.has(k) && typeof v === 'string') {
      const textId = nodeId + '.' + k;
      texts.texts[textId] = { template: v };
      result[k] = { text: textId };
    } else result[k] = convert(v, id, path + '.' + k);
  }
  return result;
}
for (const [id, tree] of Object.entries({ ...services.conversations, ...goose.conversations }))
  data.services[id] = convert(tree, id);
await writeFile(new URL('dialogues.json', import.meta.url), JSON.stringify(data, null, 2) + '\n');
await writeFile(new URL('texts.json', import.meta.url), JSON.stringify(texts, null, 2) + '\n');
