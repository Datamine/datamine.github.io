Editable game definitions live here:

- `item-stats.ts`: weapon damage, range, timing, equipment and food.
- `monster-drops.ts`: monster attributes and independent loot probabilities.
- `hats.ts`: hat names, prices and appearance palettes.
- `economy.ts`: NPC trade prices.
- `npcs.ts`: NPC names and appearance palettes.
- `dialogue.ts`: compatibility exports; conversation content lives in
  [`../dialogues/`](../dialogues/README.md).
- `hairstyles.ts`: player hairstyle choices for each gender; IDs must match the character meshes.
- `finance.ts`: growth-equity batches, listing fee, volatility, trading duration and duel limits.
- `gameplay.ts`: progression, combat and network cadence defaults.

Keep item, monster and hat IDs stable: saved inventories refer to them. Runtime
helpers remain in the parent directory. These tables are shared by the server,
offline simulation and renderer; online clients cannot change server balance by
editing their copies.

After editing, run `npm --prefix sf run build` and restart the backend. The build produces
the standalone `sf/index.html` and verifies the native navigation graph.

## Editing conversations

Use [`../dialogues/`](../dialogues/README.md): `chains.json` contains the 100
ambient conversation graphs, `goose-corp.json` preserves Goose Corp rumors and
books, and `services.json` contains shop/travel copy and action bindings.
The original tweet archive is retained in `dialogues/sources/tweets/`.

Ambient conversations are selected for ordinary NPCs and are also available
through **Let’s just talk.** on service and quest menus. Keep them free of
purchases, rewards, quest mutations and progress changes.

Service entries use `intro` and player `choices`. Each choice has a `label`
and a `receipt`, `next` branch, existing `trade`, or named `action`. `{tokens}`
insert live prices/status; `args` supplies action arguments. Keep those IDs
stable. `dialogue-config.ts` binds the handlers; `dialogue.ts` in the parent
directory presents the portraits and branches.

Quest-dependent choices remain in their domain modules. Neighborhood prices
and effects stay in `neighborhood-services.ts`; the spoken copy is drawn from
the service catalog. A deferred follow-up runs only when the player confirms
its successful receipt with OK. Leave, replacement, or disconnection discards
pending presentation actions without undoing an already committed purchase.

Run the ambient, dialogue, interaction-menu and world-lore tests before
rebuilding. The [dialogue guide](../dialogues/README.md) documents the graph
format and file layout.
