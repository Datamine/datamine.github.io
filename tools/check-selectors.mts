import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface HTMLSelectors {
  classes: Set<string>;
  tags: Set<string>;
  ids: Set<string>;
}
export function extractCSSSelectors(css: string): string[] {
  return [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{]+?)\s*{[^}]*}/g)]
    .flatMap((match) => match[1].split(',').map((selector) => selector.trim()))
    .filter((selector) => selector !== '' && !selector.startsWith('@'));
}
export function extractHTMLSelectors(html: string): HTMLSelectors {
  return {
    classes: new Set(
      [...html.matchAll(/class=["'](.*?)["']/g)].flatMap((match) =>
        match[1].split(/\s+/).filter(Boolean),
      ),
    ),
    tags: new Set([...html.matchAll(/<([a-zA-Z][a-zA-Z0-9]*)/g)].map((match) => match[1])),
    ids: new Set([...html.matchAll(/id=["'](.*?)["']/g)].map((match) => match[1])),
  };
}
/** Like the original audit, complex selectors are conservatively retained. */
export function selectorMayBeUsed(selector: string, html: HTMLSelectors): boolean {
  if (selector.startsWith('.')) return html.classes.has(selector.slice(1).split(':')[0]);
  if (selector.startsWith('#')) return html.ids.has(selector.slice(1).split(':')[0]);
  if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(selector))
    return html.tags.has(selector) || selector === 'body' || selector === 'html';
  return true;
}
export async function checkSelectors(): Promise<void> {
  const [css, html] = await Promise.all([
      readFile('new.css', 'utf8'),
      readFile('index.html', 'utf8'),
    ]),
    selectors = extractCSSSelectors(css),
    data = extractHTMLSelectors(html);
  console.log(`Found ${selectors.length} CSS selectors in new.css:`);
  for (const selector of selectors)
    console.log(`- ${selector} (${selectorMayBeUsed(selector, data) ? 'used' : 'UNUSED'})`);
  const unused = selectors.filter((selector) => !selectorMayBeUsed(selector, data)).length;
  console.log(
    `\nFound ${data.classes.size} unique class names in index.html\nFound ${data.tags.size} unique HTML element types in index.html\nFound ${data.ids.size} unique IDs in index.html`,
  );
  console.log(
    unused
      ? `\n${unused} CSS selectors might not be used in the HTML file.`
      : '\nAll CSS selectors appear to be used in the HTML file!',
  );
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await checkSelectors();
