#!/usr/bin/env python3
import html
import re
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime

FEED_URL = "https://loeber.substack.com/feed"
INDEX_HTML = "index.html"
WRITING_LABEL = "Writing"


def fetch_feed_items():
    request = urllib.request.Request(
        FEED_URL,
        headers={"User-Agent": "writing-sync/1.0 (+https://johnloeber.com)"},
    )
    with urllib.request.urlopen(request) as response:
        data = response.read()

    root = ET.fromstring(data)
    channel = root.find("channel") if root.tag == "rss" else root
    if channel is None:
        return []

    items = []
    for item in channel.findall("item"):
        title = item.findtext("title")
        link = item.findtext("link")
        pub_date = item.findtext("pubDate")
        if not (title and link and pub_date):
            continue
        try:
            date = parsedate_to_datetime(pub_date)
        except (TypeError, ValueError):
            continue
        items.append(
            {
                "title": title.strip(),
                "link": link.strip(),
                "date": date,
            }
        )
    return items


def find_writing_bounds(html_text):
    summary_match = re.search(
        r'<span class="subheader">\s*' + re.escape(WRITING_LABEL) + r"\s*</span>",
        html_text,
    )
    if not summary_match:
        raise ValueError("Could not find Writing section summary.")

    details_start = html_text.rfind("<details", 0, summary_match.start())
    if details_start == -1:
        raise ValueError("Could not find Writing section <details> start.")

    summary_close = html_text.find("</summary>", summary_match.end())
    if summary_close == -1:
        raise ValueError("Could not find Writing section </summary>.")

    details_close = html_text.find("</details>", summary_close)
    if details_close == -1:
        raise ValueError("Could not find Writing section </details>.")

    return details_start, summary_close + len("</summary>"), details_close


def parse_year_blocks(content):
    blocks = []
    for match in re.finditer(
        r'<div class="yspace">(\d{4})</div>\s*<ul>(.*?)</ul>',
        content,
        re.S,
    ):
        year = int(match.group(1))
        list_html = match.group(2)
        entries = []
        for li_match in re.finditer(
            r'<li>\s*<a href="([^"]+)">(.*?)</a>\s*</li>',
            list_html,
            re.S,
        ):
            link = li_match.group(1).strip()
            title = li_match.group(2).strip()
            entries.append({"link": link, "title": title})
        blocks.append((year, entries))
    return blocks


def guess_indents(content):
    match = re.search(r"\n(\s*)<div class=\"yspace\">", content)
    indent_div = match.group(1) if match else "        "
    indent_li = indent_div + "    "
    return indent_div, indent_li


def render_blocks(year_entries, indent_div, indent_li):
    rendered = []
    for year in sorted(year_entries.keys(), reverse=True):
        entries = year_entries[year]
        lines = [
            f"{indent_div}<div class=\"yspace\">{year}</div>",
            f"{indent_div}<ul>",
        ]
        for entry in entries:
            lines.append(
                f"{indent_li}<li><a href=\"{entry['link']}\">{entry['title']}</a></li>"
            )
        lines.append(f"{indent_div}</ul>")
        rendered.append("\n".join(lines))
    return "\n\n".join(rendered)


def main():
    with open(INDEX_HTML, "r", encoding="utf-8") as handle:
        html_text = handle.read()

    _, summary_end, details_end = find_writing_bounds(html_text)
    section_content = html_text[summary_end:details_end]

    year_blocks = parse_year_blocks(section_content)
    if not year_blocks:
        raise ValueError("No year blocks found in Writing section.")

    existing_by_year = {year: entries for year, entries in year_blocks}
    existing_links = {
        entry["link"] for entries in existing_by_year.values() for entry in entries
    }

    feed_items = fetch_feed_items()
    feed_items.sort(key=lambda item: item["date"], reverse=True)

    new_by_year = {}
    for item in feed_items:
        if item["link"] in existing_links:
            continue
        year = item["date"].year
        new_by_year.setdefault(year, []).append(
            {
                "link": item["link"],
                "title": html.escape(item["title"], quote=False),
            }
        )

    added_count = sum(len(items) for items in new_by_year.values())
    if added_count == 0:
        print("No new essays found.")
        return

    for year, new_entries in new_by_year.items():
        existing_by_year[year] = new_entries + existing_by_year.get(year, [])

    indent_div, indent_li = guess_indents(section_content)
    new_content = render_blocks(existing_by_year, indent_div, indent_li)

    line_start = html_text.rfind("\n", 0, details_end) + 1
    closing_indent = html_text[line_start:details_end]
    replacement = "\n\n" + new_content + "\n\n" + closing_indent

    updated_html = html_text[:summary_end] + replacement + html_text[details_end:]
    with open(INDEX_HTML, "w", encoding="utf-8") as handle:
        handle.write(updated_html)

    print(f"Added {added_count} new essay(s) to Writing section.")


if __name__ == "__main__":
    main()
