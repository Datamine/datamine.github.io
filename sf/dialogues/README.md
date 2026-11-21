# NPC conversations

Canonical authored content lives in [`../content/`](../content/README.md). This directory contains compatibility modules and the original JSON migration inputs:

| File              | Content                                                                                |
| ----------------- | -------------------------------------------------------------------------------------- |
| `chains.json`     | The 100 tweet-inspired branching conversations                                         |
| `goose-corp.json` | The Powerful and Evil Goose Corporation rumors, named conversations and readable books |
| `services.json`   | Shop, travel and other functional dialogue with named action bindings                  |
| `ambient.ts`      | Random selection and conversion to the game's dialogue UI                              |
| `catalog.ts`      | Shared service and lore exports                                                        |

Ordinary adult pedestrians draw from the shared pool of 100 conversations plus
the two Goose Corp rumors. Gus, Vic, the six named researchers, the dog walker,
and the square visitor retain their original topics alongside casual chat. A shuffled
bag avoids repeating a selected conversation until the pool has been drawn.
Names and portraits come from the actual NPC. Children use the pond rumor;
animals keep their animal interactions.

Service and quest NPCs retain their functional choices and also offer
**Let’s just talk.** This opens a conversation with no purchase callbacks,
quest rewards or server mutations. Ray and Leo retain their Goose Corp topics.
Quest-state-dependent actions still live in their domain modules.

In `chains.json`, each conversation has a `start` node ID and a `nodes` map.
Nodes contain NPC `text`; player `choices` have `text` and a `next` node ID.
An `end: true` node closes after its line is acknowledged. Keep every edge
valid and every node reachable. `source_files` and `source_directory` are historical provenance labels; the original tweet text files were intentionally removed and are not runtime or test dependencies.

Service entries use `intro`, `choices`, `label`, `receipt`, `next`, and named
`action`/`trade` bindings. Keep action IDs, argument IDs and `{tokens}` intact.
`dialogue-config.ts` binds them to domain handlers; `dialogue.ts` presents the
portrait and choices. The old `config/dialogue.ts` and `config/world-lore.ts`
paths are compatibility exports only.

Run from `sf/`:

```sh
node --test tests/ambient-dialogue.test.mjs tests/dialogue.test.mjs tests/world-lore.test.mjs
npm run build
```

JSON defaults are embedded in the generated client for `file://` play. HTTP clients also load published content revisions. The source preview serves the same JSON modules
over HTTP. Rebuild for changes to action code; restart the backend when shared
service text or definitions change.

Named and service NPCs should speak as characters, without giving a walkthrough.
Keep their requests, prices, consent choices, and receipts for completed actions
clear. Do not reveal hidden odds, optimization strategies, exact quest routes,
undiscovered rewards, or future unlocks. Guide messages and examine descriptions
follow the same rule. Journals record discoveries and completed milestones;
collection entries reveal names after discovery. Help explains controls only.

## Canonical content

Authored runtime content now lives in [`../content/`](../content/README.md). The original catalogs here remain migration/provenance inputs and compatibility exports. Edit canonical JSON or use the editor for current game changes. HTTP clients and the server reload published content; file:// uses embedded defaults.
