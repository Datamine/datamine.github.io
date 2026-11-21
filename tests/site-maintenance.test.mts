import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractCSSSelectors,
  extractHTMLSelectors,
  selectorMayBeUsed,
} from '../tools/check-selectors.mts';
import { parseFeedItems, updateWritingHTML } from '../tools/update-writing.mts';

test('selector auditing retains the original conservative handling of complex selectors', () => {
  const css =
      '/* .unused-comment {} */ .title, #contents {color:blue} h1:hover {color:red} aside {}',
    html = extractHTMLSelectors('<main id="contents"><h1 class="title big">Hello</h1></main>');
  assert.deepEqual(extractCSSSelectors(css), ['.title', '#contents', 'h1:hover', 'aside']);
  assert.equal(selectorMayBeUsed('.title:hover', html), true);
  assert.equal(selectorMayBeUsed('#contents', html), true);
  assert.equal(selectorMayBeUsed('.absent', html), false);
  assert.equal(selectorMayBeUsed('aside', html), false);
  assert.equal(selectorMayBeUsed('main > .dynamic', html), true);
});
test('RSS parsing handles XML entities and CDATA, rejects invalid XML and skips incomplete entries', () => {
  const items = parseFeedItems(
    '<rss><channel><item><title><![CDATA[A <new> essay & news]]></title><link>https://example.com/new?a=1&amp;b=2</link><pubDate>Wed, 01 Jan 2025 00:10:00 +1400</pubDate></item><item><title>Missing fields</title></item><item><title>Bad date</title><link>x</link><pubDate>not a date</pubDate></item></channel></rss>',
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'A <new> essay & news');
  assert.equal(items[0].link, 'https://example.com/new?a=1&b=2');
  assert.equal(items[0].year, 2025);
  assert.throws(() => parseFeedItems('<rss><channel></rss>'));
});
test('writing updates preserve surrounding HTML, year ordering, old links and escaped titles', () => {
  const html =
      '<header>Keep</header><details><summary><span class="subheader">Writing</span></summary>\n\n  <div class="yspace">2024</div>\n  <ul>\n      <li><a href="https://example.com/old">Old &amp; good</a></li>\n  </ul>\n\n</details><footer>Keep</footer>',
    feed = parseFeedItems(
      '<rss><channel><item><title>A &amp; B</title><link>https://example.com/new</link><pubDate>Wed, 01 Jan 2025 12:00:00 GMT</pubDate></item><item><title>Renamed</title><link>https://example.com/old</link><pubDate>Wed, 01 Jan 2025 10:00:00 GMT</pubDate></item></channel></rss>',
    ),
    result = updateWritingHTML(html, feed);
  assert.equal(result.added, 1);
  assert.ok(result.html.startsWith('<header>Keep</header>'));
  assert.ok(result.html.endsWith('</details><footer>Keep</footer>'));
  assert.ok(result.html.indexOf('2025') < result.html.indexOf('2024'));
  assert.match(result.html, /A &amp; B/);
  assert.match(result.html, /Old &amp; good/);
  assert.doesNotMatch(result.html, /Renamed/);
  assert.deepEqual(updateWritingHTML(result.html, feed), { html: result.html, added: 0 });
  assert.throws(() => updateWritingHTML('<div>No Writing section</div>', feed), /Writing section/);
});
