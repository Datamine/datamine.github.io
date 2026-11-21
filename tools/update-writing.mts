import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SaxesParser } from 'saxes';

const feedURL = 'https://loeber.substack.com/feed';
interface WritingEntry {
  link: string;
  title: string;
}
export interface FeedItem extends WritingEntry {
  date: Date;
  year: number;
}
export function parseFeedItems(xml: string): FeedItem[] {
  const parser = new SaxesParser({ xmlns: false }),
    stack: string[] = [],
    items: FeedItem[] = [];
  let item: Record<string, string> | null = null,
    depth = 0;
  parser.on('opentag', (tag) => {
    stack.push(tag.name);
    if (tag.name === 'item' && !item) {
      item = {};
      depth = stack.length;
    }
  });
  const append = (text: string) => {
    const name = stack.at(-1);
    if (item && stack.length === depth + 1 && name && ['title', 'link', 'pubDate'].includes(name))
      item[name] = (item[name] ?? '') + text;
  };
  parser.on('text', append);
  parser.on('cdata', append);
  parser.on('closetag', () => {
    if (item && stack.length === depth) {
      const { title, link, pubDate } = item;
      if (title && link && pubDate) {
        const date = new Date(pubDate),
          year = /\b\d{1,2}\s+[A-Za-z]{3}\s+(\d{4})\b/.exec(pubDate)?.[1];
        if (Number.isFinite(date.getTime()))
          items.push({
            title: title.trim(),
            link: link.trim(),
            date,
            year: year ? Number(year) : date.getUTCFullYear(),
          });
      }
      item = null;
    }
    stack.pop();
  });
  parser.write(xml).close();
  return items;
}
function writingBounds(html: string): { summaryEnd: number; detailsEnd: number } {
  const summary = /<span class="subheader">\s*Writing\s*<\/span>/.exec(html);
  if (!summary) throw new Error('Could not find Writing section summary.');
  if (html.lastIndexOf('<details', summary.index) === -1)
    throw new Error('Could not find Writing section <details> start.');
  const close = html.indexOf('</summary>', summary.index + summary[0].length);
  if (close === -1) throw new Error('Could not find Writing section </summary>.');
  const detailsEnd = html.indexOf('</details>', close);
  if (detailsEnd === -1) throw new Error('Could not find Writing section </details>.');
  return { summaryEnd: close + '</summary>'.length, detailsEnd };
}
/** Pure transformation; fetching and writing happen only in the explicit CLI entry. */
export function updateWritingHTML(
  html: string,
  feed: readonly FeedItem[],
): { html: string; added: number } {
  const { summaryEnd, detailsEnd } = writingBounds(html),
    content = html.slice(summaryEnd, detailsEnd),
    years = new Map<number, WritingEntry[]>();
  for (const block of content.matchAll(
    /<div class="yspace">(\d{4})<\/div>\s*<ul>([\s\S]*?)<\/ul>/g,
  ))
    years.set(
      Number(block[1]),
      [...block[2].matchAll(/<li>\s*<a href="([^"]+)">([\s\S]*?)<\/a>\s*<\/li>/g)].map((entry) => ({
        link: entry[1].trim(),
        title: entry[2].trim(),
      })),
    );
  if (!years.size) throw new Error('No year blocks found in Writing section.');
  const existingLinks = new Set([...years.values()].flat().map((entry) => entry.link)),
    newEntries = new Map<number, WritingEntry[]>();
  let added = 0;
  for (const item of [...feed].sort((a, b) => b.date.getTime() - a.date.getTime())) {
    if (existingLinks.has(item.link)) continue;
    const entries = newEntries.get(item.year) ?? [];
    entries.push({
      link: item.link,
      title: item.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
    });
    newEntries.set(item.year, entries);
    added++;
  }
  if (!added) return { html, added };
  for (const [year, entries] of newEntries)
    years.set(year, [...entries, ...(years.get(year) ?? [])]);
  const indentDiv = /\n([ \t]*)<div class="yspace">/.exec(content)?.[1] ?? '        ',
    indentLI = indentDiv + '    ';
  const rendered = [...years.keys()]
    .sort((a, b) => b - a)
    .map((year) =>
      [
        `${indentDiv}<div class="yspace">${year}</div>`,
        `${indentDiv}<ul>`,
        ...(years.get(year) ?? []).map(
          (entry) => `${indentLI}<li><a href="${entry.link}">${entry.title}</a></li>`,
        ),
        `${indentDiv}</ul>`,
      ].join('\n'),
    )
    .join('\n\n');
  const closingIndent = html.slice(html.lastIndexOf('\n', detailsEnd - 1) + 1, detailsEnd);
  return {
    html:
      html.slice(0, summaryEnd) +
      '\n\n' +
      rendered +
      '\n\n' +
      closingIndent +
      html.slice(detailsEnd),
    added,
  };
}
export async function updateWriting(): Promise<void> {
  const html = await readFile('index.html', 'utf8'),
    response = await fetch(feedURL, {
      headers: { 'User-Agent': 'writing-sync/1.0 (+https://johnloeber.com)' },
    });
  if (!response.ok) throw new Error(`Writing feed returned HTTP ${response.status}.`);
  const result = updateWritingHTML(html, parseFeedItems(await response.text()));
  if (!result.added) {
    console.log('No new essays found.');
    return;
  }
  await writeFile('index.html', result.html, 'utf8');
  console.log(`Added ${result.added} new essay(s) to Writing section.`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await updateWriting();
