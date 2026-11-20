# NPC conversations

All authored conversation catalogs live here:

| File              | Content                                                                            |
| ----------------- | ---------------------------------------------------------------------------------- |
| `chains.json`     | The 100 tweet-inspired branching conversations                                     |
| `goose-corp.json` | Powerful and Evil Goose Corporation rumors, named conversations and readable books |
| `services.json`   | Shop, travel and other functional dialogue with named action bindings              |
| `sources/tweets/` | The 87 original posts and their reply chains                                       |
| `ambient.js`      | Random selection and conversion to the game's dialogue UI                          |
| `catalog.js`      | Shared service and lore exports                                                    |

Ordinary adult NPCs, dog walkers, rail workers and casual researchers draw from
the shared pool of 100 conversations plus the two Goose Corp rumors. A shuffled
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
valid and every node reachable. `source_files` resolve under `source_directory`.

Service entries use `intro`, `choices`, `label`, `receipt`, `next`, and named
`action`/`trade` bindings. Keep action IDs, argument IDs and `{tokens}` intact.
`dialogue-config.js` binds them to domain handlers; `dialogue.js` presents the
portrait and choices. The old `config/dialogue.js` and `config/world-lore.js`
paths are compatibility exports only.

Run from `sf/`:

```sh
node --test tests/ambient-dialogue.test.mjs tests/dialogue.test.mjs tests/world-lore.test.mjs
npm run build
```

JSON is embedded in the generated client, so production and `file://` play do
not fetch dialogue catalogs. The source preview serves the same JSON modules
over HTTP. Reload the client after rebuilding; restart the backend when shared
service text or definitions change.
