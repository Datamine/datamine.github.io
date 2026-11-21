# Authored content and player state

Run `npm --prefix sf run dev`, then open **http://localhost:8080/editor.html**.
The editor writes these source files directly; a text/menu edit does not rebuild map geometry.

- `entities.json`: shared entity definitions, names, NPC/object categories, descriptions, placement references, ordered action menus and registered capabilities. There are 238 definitions and 316 placements. Repeated cows/houses share definitions. Changing a name keeps its ID.
- `dialogues.json`: 107 state variants with explicitly identified nodes, choices, links and action IDs; service templates and 102 shared casual conversations.
- `texts.json`: reusable text templates. `{name}` or `{v0}` placeholders are substituted with values supplied by registered code or declarative state bindings. They are never evaluated as JavaScript.
- `player-state-defaults.json`: the version-2 JSON player document, including quest progress, inventory, skills, vehicles, employment, finance and activities.
- `player-state-bindings.json`: legacy save mappings and the quest marker index. Existing saves migrate on connection and retain progress; subsequent saves store one `playerState` document. Live compatibility accessors allow existing gameplay controllers to use the migrated document without persisting duplicate legacy fields. Unknown old module data is preserved under `migration`.
- `schemas/`: JSON Schemas. Validation also checks references, registered actions, duplicate IDs and dialogue cycles.

The server owns player progress. Changing a dialogue visibility condition does not grant items or bypass a quest requirement. Transactions, movement, combat and action callbacks remain ordinary code, bound by explicit IDs. Geometry/model generation remains code; this content layer controls authored identity and interaction data.

## Conditional options

A menu, action, dialogue variant or choice can have a `when` condition:

```json
{
  "id": "offer-reward",
  "label": "Introduce the monkey",
  "when": { "path": "quests.monkey.stage", "eq": "carrying" }
}
```

This illustrates visibility; a working reward choice also needs an existing registered `action` ID. Conditions support `all`, `any`, `not`, and path comparisons `eq`, `ne`, `in`, `contains`, `exists`, `gt`, `gte`, `lt`, `lte`, and array `count`. Omitted conditions and `true` mean visible; `false` hides an option. A conditional variant takes precedence over a variant without a condition. Keep one unconditional fallback. Placement-specific variants retain their `placements` list.

For example, an option requiring an owned chair and a completed quest:

```json
{
  "all": [
    { "path": "inventory.economy.ownedEquipment", "contains": "ball-chair" },
    { "path": "quests.monkey.stage", "eq": "completed" }
  ]
}
```

In the editor, enable **Draft edits**, expand **Condition (JSON)** under an option, edit, and choose **Save to game**. **Player state for preview (JSON)** lets you simulate progress without editing any actual player's save. Apply a preview state to select the matching variant; **Play through** filters its choices using that state.

Text records can bind a placeholder to state:

```json
{
  "template": "You have delivered {letters} letters.",
  "bindings": {
    "letters": { "path": "inventory.economy.saltLettersDelivered", "default": 0 }
  }
}
```

## Publishing and development

Editor saves validate the complete candidate content, reject stale revisions, and write fields using stable source IDs. Repeated placements and shared text references update together. If publication fails, the writer restores the previous source files. Browser drafts are retained when a save fails.

`npm --prefix sf run build:editor` validates JSON and publishes the runtime document, revision manifest and standalone editor. Use this after editing JSON in a text editor. HTTP game clients check for published revisions every three seconds; the server watches publication and refreshes entity metadata. Reopen an existing menu/conversation to see its new options. The production build embeds defaults for `file://` and also reads published JSON when served over HTTP. Rebuild for changes to geometry, action implementations, schemas or the player document shape.

`node --import ./sf/node_modules/tsx/dist/loader.mjs sf/content/build-validator.mts` regenerates browser-compatible `validate.js` after schema/validator changes. The main game build does this automatically. `runtime.json`, `manifest.json`, `validate.js` and `sf/editor.html` are derived artifacts; edit the source JSON instead.

The `instrument-bindings.mts`, `finish-bindings.mts`, `prepare-services.mts` and `seed.mts` scripts were one-time migration tools. Do not rerun them against edited content. `legacy-world-edits.json` archives the previous override file; its Tiger NPC edit is included in the canonical definitions. The old `config/world-edits.json` is no longer an active content source.
