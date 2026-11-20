# Interaction audit

The audit exercises authored menus, their server actions, and the navigation
between them. It does not equate a successful command receipt with a completed
journey: travel tests advance the simulation through arrival and return.

## Coverage

- All 58 fixed dialogue templates: 202 successful/refused leaf paths through
  the actual dialogue UI, including nested branches, async receipts, exits,
  repeatable options, cancellation and keyboard navigation.
- Context-menu eligibility for all 312 placed actors, plus player Follow,
  PvP and coin-duel variants. Protected NPCs cannot offer Attack; players
  cannot offer Examine. Context actions use the same interaction dispatcher
  as ordinary clicks.
- All 24 neighborhood shop/offer combinations, all 11 purchasable hats, and
  all 20 bench menus and exits on production geometry.
- They Live evidence/permit/bayonet/reward/battleaxe branches; Monkey Business
  acceptance, theft, pursuit and turn-in; Jurassic railgun issuance, shared
  remains collection and completion; salt-letter collection and delivery;
  guild promotions, Illuminati initiation, cave entry and bomber access.
  Quest-stage fixtures supply completed kills where the test concerns a
  conversation handoff; combat mechanics have separate tests.
- Ahab boarding, personal instance creation, outbound sailing, actual boss
  auto-attacks, one-time cape/coin collection, inbound sailing and disembarkation.
- Both SpaceX flights from their actual attendants, plus gondola ascent,
  summit ski rental and skiing back down without client movement packets.
- Rehabilitation consent, authoritative completion at UCSF, appearance changes
  and inebriation; banking, fuel cans, wizard tablets, equity, food, interviews,
  shared loot and other services retain their dedicated server tests.
- All eight searchable homes retain their one-time reward, ownership and
  physical doorway/storage tests.
- Build-time navigation: 496 destinations, 996 routes, and 653 NPC approaches,
  including patrol positions. Approaches are checked against server range
  and intervening scenery.

The Ahab sequence is additionally checked in a real browser against an isolated
server: boarding, boss auto-attacks, reward pickup and return all passed without
runtime exceptions. Automated menu traversal uses a small DOM double for deterministic
button events; it is not a claim that every menu was manually clicked in every
camera orientation.

## Repairs

- Pending purchases no longer announce completed salt-mail or fuel-can actions.
  Using a can waits for its receipt and does not submit another refuel action.
- The scientist waits for actual railgun/quest authorization. Motorcycle rental,
  sand gathering, duck feeding and monkey theft defer success effects until the
  server accepts the action.
- Stationary merchant approaches are revalidated after final scenery placement,
  fixing obstructed approaches for the bartender, Ray and an outdoor farmer.
- Rehabilitation uses the shared appearance scrambler, keeping hairstyle and
  gender compatible.
- Restored positions always have a finite facing angle. Legacy records and
  death-recovery records without one previously invalidated binary movement
  frames, leaving the player's camera behind during travel.
- Kraken spoils appear in a visible chest on open deck, within pickup range,
  rather than behind the mast. A geometry/ray test checks reward selection.
- A failed PvP toggle uses the supplied announcement callback and restores its
  checkbox instead of throwing a ReferenceError.
- The Berkeley dialogue describes the current green spectres.

## Repeatable checks

```sh
node --test sf/tests/interaction-menus.test.mjs sf/tests/dialogue.test.mjs sf/tests/jurassic.test.mjs
node --test --test-concurrency=2 sf/server/tests/*.test.mjs
node sf/build.mjs
node --test sf/tests/build.test.mjs
```

Final backend results: 205 passed, 3 skipped, 0 failed. The final focused client
and build checks passed all 36 tests. The static experience was rebuilt with
world generation `27f3e21fa7c908e27ee6`.

The broad client-suite run also exposed four pre-existing scenery assertions:
the airport terminal's triangle budget, an old mansion-count minimum, a central
street-lamp layout expectation, and trees overlapping Lincoln Way's frontage.
These are recorded separately from the interaction checks; this audit does not
silently weaken those assertions or redesign unrelated scenery to make them pass.
Some older tests were updated to exercise the current dialogue format, discovered
enterable-house collisions, the 50-level skill curve and Akibo's equal-railgun DPS.
