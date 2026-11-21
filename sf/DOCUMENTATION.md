# Explore SF documentation

Gameplay, world content and detailed implementation references live here.
For setup and day-to-day development, start with [README.md](README.md).
For deployments, persistence, backups and recovery, use the [server operations guide](server/README.md).
For current server measurements and tuning, see [capacity and performance](server/CAPACITY.md).

Balance values are defined in [config/](config/README.md); consult those tables
when changing gameplay. Source filenames without an `sf/` prefix are relative
to this directory. Shell examples that start with `node sf/` run from the repository root.

- [City activities, shops and rewards](#city-activities-shops-and-rewards)
- [Players, levels and PvP](#players-levels-and-pvp)
- [Shared versus personal state](#shared-versus-personal)
- [Underground maps and the B-2](#underground-maps-and-the-personal-b-2)
- [Airship](#airship-and-close-inspection)
- [Growth equity and duels](#growth-equity-and-the-duel-arena)
- [Implementation reference](#implementation-reference)

## City activities, shops and rewards

Green Bank's friendly banker offers deposits, withdrawals and a complimentary
coffee. Deposits earn 5% per elapsed hour, compounded continuously, including
offline time: 100 coins becomes 105 after one hour and 110.25 after two. Banked
coins are separate from spendable inventory; whole coins can be withdrawn while
fractional interest stays in the account. `banking.ts` contains the shared
account rules, `bank-ui.ts` the account window and server-only adapter, and
`bank-models.ts` the counter, coffee and rooftop billboard. Multiplayer uses
the authoritative account in `server/banking.mts`.

The haberdasher's upper tiers are Stone of Jordan (50,000 coins), Santa Hat
(75,000), and Blue Partyhat (100,000). The partyhat preserves the previous
top-tier `crown` inventory ID so existing ownership and outfit selections carry
over. Their original geometry lives in `hat-models.ts`.

Gameplay balancing lives in the `config/` catalogs:

- `config/item-stats.ts`: weapon damage, strength scaling, accuracy, reach and attack
  interval; the battleaxe's price; food prices/healing; ice equipment colors
  and defense. Hat definitions are in `config/hats.ts`; `hat-catalog.ts` provides runtime lookup helpers.
- `config/monster-drops.ts`: monster HP, level, attacks and respawn times, plus every
  creature's drop table. `oneIn: 20` means a 1/20 roll. `choose` selects one
  item after a successful roll; the giants' 1/50 roll is shared between the
  top and pants, making each individual piece 1/100.

The friendly level-10 bear waits at the Marin end of the Golden Gate Bridge.
Left-click to pet it; right-click to attack or examine. It has 20 HP and a
1/20 peptide drop. Two snow giants (140 HP, level 18) and two ice giants
(180 HP, level 20) patrol the foot of Tahoe's mountain. Collect their rare
ice top/pants and equip them in Character settings for crystalline armor;
each piece reduces incoming shared-monster/PvP damage by two.
`wilderness.ts` supplies the server’s native navigation/combat simulation; `wilderness-models.ts` contains their original meshes.

In-N-Out's associate sells sandwiches for two
coins, versus three at Lucinda's, with the same healing. Completing They Live
unlocks the industrial armorer's full stock, including the 50-coin battleaxe.
Character → Weapon selects it independently of the railgun. The Armory,
at (68, 111.5), is a separate, examinable South SF landmark.

**Illuminatus** appears in the Quest Menu from the beginning. Its objectives
track Ray's 24 guild promotions, the Old Man's 250,000-coin initiation, and
boarding the B-2 in the underground hangar. First boarding completes the quest;
landing, crashing or reconnecting never resets it. Existing guild members and
aircraft owners receive credit for their progress. `illuminatus.ts` derives
the journal entry, and `secret-adventures.ts` presents authoritative aircraft ownership and instance events.

The **Bus** runs from the street behind Nightlife to Market Street. Traffic
lights exist only at junctions on that route, selected from the same road
graph. It stops for two seconds at every signal, including green, and waits
for a green phase before crossing. Phases still change every ten seconds;
terminus stops last six seconds. `slow-bus.ts` defines its route and dwell
times, while `traffic-signals.ts` advances vehicles through stops and signals
using simulation time.

## Players, levels and PvP

Character settings contain username, PvP and connection settings. Names are
unique without regard to case, have 1–12 ASCII letters/digits/underscores, and
can be changed once every 60 seconds. Validation, profanity/leet substitutions,
name reservations and the cooldown run on the backend. Names remain reserved
while their owners are offline; renaming releases the previous name.

Left-click another player to inspect their Strength Level. Right-click for
**Follow**; following uses the native tile graph, replans as the target moves,
and stops when you click a new walking destination. NPC interaction menus and
examinations also show their level. Type `:debug` to see coordinates and live
rendering FPS. FPS is independent of the server's 20 Hz simulation.

Both players must enable PvP in Character settings before either can attack
the other. Enabling it starts a server-enforced 30-second cooldown before it
can be disabled; reconnecting does not clear the timer. Right-click an eligible
player for **Attack**. The server checks consent, range and line of sight,
then rolls damage from Strength Level and weapon at the weapon's attack rate.
Combat displays hitpoint bars and damage splats.

Only a death caused by another player drops all of the victim's coins,
sandwiches, iPhone and owned hats, including unequipped hats. Animal and other
personal deaths do not trigger these PvP drops. Other progression and unlocks
are retained. The killer has first claim for 15 seconds, after which anyone
can collect the drops; uncollected PvP drops expire after five minutes. Coins
are transferred without applying the iPhone earnings bonus. The victim
respawns at UCSF with a short protection period.

## Shared versus personal

The Nob Hill **Freemasons' Guild** is run by **Ray**, in a red suit. The first
check-in starts Rank 1. Each qualifying return must be at least one full hour
after the previous qualifying visit and raises the rank by one. Admission
requires 24 promotions (Rank 25); the hourly-return route takes at least
24 elapsed hours. Missing
several hours still earns only one promotion on returning. Rank, timestamps
and membership belong to the server and survive reconnects and restarts.

Alternatively, donate one **peptide vial** to Ray for one immediate promotion.
Admission therefore costs 24 vials if earned entirely through donations.
Hourly returns and donations count toward the same 24 promotions and can be
mixed. Donations do not extend an existing hourly return timer.
A vial spawns every ten minutes at a randomly selected reachable point on
the **Technologist’s Farmers Market** forecourt. The spawn and its timer are shared and
persisted. Everyone nearby sees the same vial; its first collector receives
it exactly once in the server inventory. Vials expire after twenty minutes,
and a restart never creates a backlog of missed spawns. Donation atomically
consumes one vial and saves the new rank, granting membership at Rank 25.
Character settings show guild rank
and carried peptides. Ground-item hover/default actions say **Take {name}**;
their context menus offer Take followed by Examine.

| Shared server state                                        | Private server state per anonymous identity                |
| ---------------------------------------------------------- | ---------------------------------------------------------- |
| Player presence, usernames, levels, PvP consent and combat | Quest state and alien/spectre visibility                   |
| Inventory ledger, PvP deaths and dropped inventory         | Sunglasses, billboard appearances and outfit configuration |
| Roaming pedestrians, researchers and service NPCs          | Local dialogue and personal interactions                   |
| Cow HP, kills, respawn timers and loot                     | Ferrari, bicycle, motorcycle and skateboard progression    |
| Released tiger, animal control and raptor encounters       | Police pursuit, detention and rehabilitation               |
| Raptor attacks on pedestrians and dropped coins            | The kraken hunt and its rewards                            |
| The airship, pilot, basket passengers, rope and grappling  | Rocket animations, Tahoe activities and private travel     |

Only the server rolls combat damage, kills/respawns cows, releases
animals, awards shared loot, or decides airship ownership. A loot drop has a
15-second first-claim window for its hunter, then becomes available to others.
Loot collection is serialized and awarded once. Pending rewards survive a
disconnect; client acknowledgement and the server inventory ledger prevent a
lost reply from duplicating or discarding a reward. Restart recovery uses the
latest successful checkpoint; see [persistence](server/README.md#persistence).

Coins, food, phones and hats use an owner-private server inventory ledger.
Inventory operations are ordered, shared pickups are serialized, and a death
advances an inventory epoch. Delayed checkpoints or pre-death operations
cannot restore dropped items. The inventory change and shared death drops
are committed together in RAM before the death is reported to clients, and
are captured together in the next checkpoint.

Green Bank keeps deposits in a separate, owner-private account, outside the
carried inventory and PvP drops. The authoritative clock accrues 5% compound
interest per elapsed hour, including offline time; interest is settled lazily
on account access rather than on every game tick. Transfers move whole coins
directly between the purse and account, without the iPhone income bonus.
Fractional interest remains deposited. Balances and transfer timestamps survive
checkpoint recovery, and deposits, withdrawals and complimentary coffee use ordered,
inventory-epoch-checked commands. Transfers and coffee collection require a
visit to the banker; a carried coffee can be drunk elsewhere.

The Marin bear and Tahoe snow/ice giants are shared creatures. The server
owns retaliation, HP, respawns and death rolls. Drops have the normal hunter's
first-claim window and commit
to the inventory ledger exactly once. Ice equipment and battleaxe ownership
persist in that ledger; checkpoints cannot forge ownership. Battleaxe purchases
require a completed They Live record, a live player beside the armorer and
50 coins. In-N-Out pickups require its NPC counter and cost two coins.
Only nearby wilderness creatures are broadcast, using the same 5 Hz entity
cadence; distant players receive no stream of their movements.

## Underground maps and the personal B-2

The Quest Menu calls this journey **Illuminatus**. Its progress derives from
guild membership, Illuminati initiation and persisted B-2 ownership; the first
successful boarding completes it. Existing members and aircraft owners retain
their progress, with no extra fee or duplicate reward on reconnect.

Inside the guild, speak to the **Old Man** to donate **250,000 coins** and
join the Illuminati. This is a separate, one-time server inventory transaction;
guild membership and physical proximity are required. The stairway then opens
into an underground hangar at elevation −7.5. Its minimap replaces the surface
map with the cave's actual floor tiles, parked aircraft and exit stairs. It
keeps the player centered and rotates with the camera without tilting.

The B-2 is personal. Boarding from the cave launches it over the Pacific,
three tiles below the airship's cruise height, rising above local terrain as
needed. Click the main map or minimap to fly at eight tiles per second;
hold **Shift** to match the SpaceX rocket's peak cruise speed. Both rates
are checked by the server. **Land · Parachute out** ejects the pilot, gliding
to a server-selected walkable landing. The abandoned aircraft flies onward,
crashes and makes a small cosmetic explosion. Nearby players see the parachute
and crash; the chat confirms that the Illuminati will pay for a replacement.
The server drives the descent, and reconnecting restores the safe landing
instead of stranding the pilot in midair. A fresh aircraft awaits in the cave.
**Space** or **Drop bomb** releases a bomb while flying.
The server allows one bomb per 20 seconds, persists that deadline, and applies
the blast after a short fall. Damage is **100** in the aligned **3×3 tile**
impact area. Cows, bears and snow/ice giants are vulnerable. Players,
townspeople, passive animals, service/quest NPCs, spectres, the raptor and the
private kraken are protected. Creature deaths, normal drops and respawns
remain shared; giants can survive one blast. Other surface players can see
each pilot's aircraft.

The kraken has **600 HP**, hits with base damage 14 every three seconds and
enrages at half health: base damage 18 every two seconds. Its 100-coin reward
and cape remain personal. Each owned, equipped ice armor piece reduces incoming
combat damage by **2** (4 together), including kraken, spectre, shared-monster and
PvP attacks. This does not reduce environmental damage such as doomscrolling.
Balance values live in `sf/config/monster-drops.ts` and `sf/config/item-stats.ts`.

Map templates and their tile rules live in `sf/map-instances.ts`. A private
instance has its own ID, tile bounds and layer; the same coordinates in two
instances do not imply visibility or interaction. The server filters player
interests, chat, PvP and shared-world commands by instance. Cave movement uses
the same authored adjacency graph on client and server. The fixed Illuminati
passage leads to one shared underground hangar, where initiates can see each
other and chat. Aircraft ownership remains personal. **Ahab's kraken-hunting
waters** use a separate private instance per player. Boarding the Pequod enters
those waters; sailing back restores the public map. The
existing kraken encounter remains personal, including its HP, loot and cape.

Disconnecting in a cave, on the hunt or in the bomber saves a safe surface
return point; initiation, aircraft ownership and the bomb cooldown persist.
Reconnects start on the surface. Deploy matching server and static-client builds; see [deployment](server/README.md#deployment).

## Airship and close inspection

Rent the common airship at the private jet terminal. Its first passenger is
the pilot. Other passengers can walk in the basket but cannot steer. If the
pilot leaves, control passes to the next passenger. An unattended ship returns
to its mooring; after a server restart, a saved in-flight ship returns safely.

The **Airship attendant** reports the current price and the next hourly reset.
Rentals start at **5 coins**, and each new rental or forced takeover costs
**5 more coins** than the last: **5 → 10 → 15 → 20…**. A takeover returns
everyone aboard or grappling safely to the mooring. The payer has **60 seconds**
to board without paying again, but another player can immediately outbid that
reservation. Boarding as a passenger is free. Returning the ship, disconnecting,
or letting a reservation expire does not reduce the next price. Prices and the
hourly timetable survive restarts; only the hourly reset returns the price to
5 coins. The server rejects stale quotes without charging the player. Timing,
prices and reservation duration live in `sf/config/airship.ts`.

Buy a **5-coin grappling hook** from the terminal's airship menu. The inventory
button **Grapple airship** works within six tiles horizontally beneath an
occupied aircraft. The hook and ascent are visible to other players. The
pilot's lowered rope is shared too; it can be used to climb up or down.

Zoom now reaches **650%** using the slider, wheel or pinch, allowing close
inspection of the kraken cape's lettering. Camera settings are entirely local.

## Growth equity and the Duel Arena

Sand Hill Road Capital Partners sells private growth-equity batches for 1,000,
5,000 or 10,000 coins. The stockbroker in Times Square lists a holding for 5%
of its purchase value. Its server-owned quote follows geometric Brownian motion
once per second for three minutes, starting at purchase value. The ticker shows
net return after the listing fee. Sell through the broker, or let the window
close automatically. Holdings and quote clocks survive reconnects/restarts;
listed holdings settle on the next visit if their window ended while the owner was disconnected.
Returned investment principal receives no iPhone income multiplier.
`sf/config/finance.ts` contains the fee, batches, volatility and duration.

The small southern garden arena offers consensual coin wagers. Both players
must be present, out of combat, and able to afford the identical stake. An offer
expires after 60 seconds. The recipient must accept that exact amount; no coins
are reserved or transferred before acceptance. The server uses a cryptographic
50–50 coin flip and commits both balances in RAM before announcing the result;
the next checkpoint saves them together.
Declining, walking away or disconnecting before acceptance cancels without loss.
Wagers transfer existing coins, with no income bonuses or inventory drops.

All shared street pedestrians, researchers and service NPCs use server poses.
The client interpolates those poses and does not advance a second local route
clock. They freeze consistently on connection loss. Nearby NPC interest is refreshed by distance,
so walking into a district brings its vendors into view even in a busy world.

## Implementation reference

### Server authority and module boundaries

`server-connection.ts` blocks world input and simulation until the backend has
authenticated the browser. Missing configuration and legacy `?offline=1` URLs
show the connection form. Disconnects cancel conversations, pending receipts
and deferred actions, freeze gameplay, and reconnect automatically. A successful
reconnection reloads the page to restore server-owned progress and travel state.
The client also detects a silent server after six seconds without updates.
Native headless geometry and shared rules remain available for simulation and tests.

Online authority is divided into small domain modules:

- `server/game.mts`: identity, command dispatch, persistence and lifecycle.
- `server/movement.mts`: native routes, movement budgets, vehicles, flight and travel.
- `server/player-state.mts`: private quests, combat, training, fishing, deliveries,
  robotaxi income, phone damage, drinking, interviews and wages.
- `server/shared-world.mts`: common NPCs, animals, loot and the airship.
- `server/replication.mts`: player interest, binary movement and shared/private deltas.

Clients send destinations, buttons, dialogue choices and arithmetic answers.
They cannot upload positions, HP, XP, balances, quest completion, weapon unlocks,
interview scores or elapsed time. Checkpoints now accept cosmetic preferences
only; ownership gates are checked before applying equipment. New identities
start with server defaults, not imported local-storage progression. Existing
server profiles retain their progress. Private does not mean client-authoritative: personal gameplay is
simulated and persisted on the server too.

Protocol **4** requires deploying the rebuilt `sf/index.html` and restarting the
backend together. Old clients must reload.

The server builds the authored map without DOM or GPU resources. Clients send
movement destinations; the server advances routes and returns authoritative
poses, which the browser interpolates. Debug teleporting requires `ALLOW_DEBUG=1`.

### Following and replication

Following is server-owned. `followPlayer` starts an intent (optionally `attack: true` for PvP approach); `stopFollowing` cancels it. `server/following.mts` advances routes at 20 Hz and replans at most twice per second when the target changes quarter-tile cells. Replans are staggered across followers. All online movement ignores incoming client position claims; followers receive their own position/animation in the 10 Hz binary movement frame, in addition to nearby players. Clients interpolate those samples; browser focus and render cadence never drive pursuit. Following stops on blocked routes, unsupported transport, map changes, death or disconnect, and respects guild access. Immutable route edges are checked once when entered; changing `geometry.navigationRevision` forces revalidation. Ordinary follow does not run weapon line-of-sight tests.

Protocol 4 replication sends only changed players in the existing 32-byte
binary record format. A stationary interest gets no redundant movement frames;
new/re-entering interests receive a complete baseline. Shared entities update
at up to 5 Hz using field-table IDs, bit masks and quantized values, with explicit
interest removals. `world-deltas.ts` defines the shared field tables. Static NPC
artwork and descriptions are already on the client. Private fields and inventory
revisions update only when changed; action requests no longer attach a complete
local-storage checkpoint. WebSocket compression remains disabled to avoid
compression work per connection. These savings do not require Redis Pub/Sub or
another service.

### Teleport tablets

Teleport tablets use `server/teleport-tablets.mts`: purchases require proximity to Orin and charge 20 coins; travel consumes one durable, server-owned tablet and uses fixed native-validated destinations. The server drives the 2.8-second teleport and ignores client movement during it. Jail, private instances and vehicles prevent tablet use. Disconnecting mid-flight saves the safe destination rather than an airborne position. Tablet counts are included in inventory snapshots and are excluded from client checkpoints.

### Map streaming and browser cache

`npm --prefix sf run build` bakes terrain, buildings, cutaway section ranges, collision
adjacency, NPC routes and minimap road outlines. `build-world.mts` divides meshes
into 12 × 12 world-unit chunks. `world-codec.ts` packs the immutable metadata and
binary vertex ranges; `world-tile-codec.ts` keeps detailed tile polygons compact.

Startup reads the authenticated server position and loads its tile and a small
surrounding area first. It does not run procedural world construction in the
browser. The complete collision/minimap manifest remains available independently
of which visual chunks are resident. Background work caches distant compressed
chunks; only nearby geometry is decoded and uploaded. Moving or zooming changes
priorities, and distant GPU buffers are released. Underground/private scenes do
not load unrelated surface geometry. Original vertex ranges preserve building
picking, transparent windows and camera-facing roof cutaways.

`world-stream.ts` uses IndexedDB (`sf-static-world`) and content-versioned static
URLs. The backend serves hashed chunk URLs with immutable cache headers. A build
hash covers map code, configuration, the HTML template and authored graphics;
new builds use a separate cache generation and prune old browser entries. The
build keeps the previous disk generation for already-open clients. If storage
is unavailable, streaming still works without persistent caching.

**Help → Refresh map data** clears only the static-world database and reloads
with a cache-busting URL. The loading error screen offers the same recovery.
Character identity, inventory and server progress are unaffected. Inspect
`SFMapDiagnostics.streaming` for the active version, cache hits, downloads and
resident chunk/triangle counts.

Rebuild after editing map layouts or model code, including when using the
module-based development view. Billboard images still load directly in that
view; rebuilding embeds them in the production texture atlas.
To run the complete-map navigation audit without a browser or server:

```sh
node --import ./sf/node_modules/tsx/dist/loader.mjs sf/audit-navigation.mts
```

This builds the actual production layout, including procedural housing and shop
walls, through `createWorldModel()` in `world/model.ts` (also re-exported by `world.ts`). It skips DOM, WebGL, texture
loading and ground rasterization; geometry is used to establish the same placed
bounds, then its vertex buffers are released. Tests do not use screenshots,
recorded map snapshots, or substitute city routes.

`navigation.ts` compiles the rendered tile materials and placed collision
footprints into one graph. Every material has an explicit `walkable` rule in
`TILE_TYPES`; building floors remain walkable while their walls and door gaps
provide collision. Shoreline cells use their actual typed polygons. A cell has
at most eight adjacency bits, with blocked-corner clearance for diagonals. This
is a sparse adjacency representation, rather than a quadratic matrix.

Connected components, direct travel checks, A* and waypoint smoothing share
that graph. Disconnected queries reject before searching, and A* reuses stamped
working buffers instead of allocating map-sized arrays for every click or NPC.
The minimap imports the same component-labeling rule. Nearest-position searches
use an actual circular radius and the same logical/world coordinate conversion.

`navigation-audit.ts` checks every graph edge for reciprocal connectivity and
corner clearance. It checks routes in both directions to named destinations,
shop interiors, actual conversation/petting/ladder approaches, animal-control
dispatch points, regional junctions and southern trails, including full journeys
from the zoo to Tahoe. Airport and Tahoe/highway paths retain their own pure
regional geometry adapters; the audit uses their real city graph connection.
The offshore Prometheus statue and the rail pit declare `navigationAccess:
'observe-only'` in their source data. Other sights require walking access by
default. Isolated background courtyards are reported, but a required
destination in one fails validation. The full-world tests also seal a real shop
door deliberately and verify that its interior becomes unreachable.

Use these deterministic checks for reachability and collision. Browser checks
cover the integration that the graph cannot prove: pointer projection, minimap
click dispatch, rendered geometry, camera motion, and UI layout. For diagnosis
in the running game, `SFMapDiagnostics.navigation` exposes `audit()`,
`position(x, y)`, `connected(from, to)` (city grid), and `route(from, to)` (regional
walking routes). `position` explains whether a cell is blocked by terrain or a
named footprint. Coordinates here match `player.x` / `player.y`.

### Source modules, models and materials

- `wayfinding.ts`: shared vector symbols for homepage destinations, minimap projection and inverse click coordinates, icon spacing, destination flags and navigation regions. The minimap follows the player, including beyond the city boundaries, with the player indicator fixed at its exact center. It stays flat, rotates with the camera, and uses the same live origin for click coordinates and destination flags. Content icons stay clear of the center; only visible icons are selectable. The minimap routes directly into the world; there is no larger map. Matching glowing symbols above content buildings are clickable, with a legend in the ? guide.
- `world.ts`: browser entry and headless-model export. `world/scene.ts` composes `generation`, `navigation`, `rendering`, `minimap`, `hud`, `interactions`, `network` and `runtime` services. Zoom, vehicle actions, Say and Help share a compact bottom-right card; flight and climbing keep their relevant action beside Say and Help. S or Say displays a short-lived “yo” above the moving player, including while cycling, climbing or flying. Click feedback uses a shrinking yellow X for accepted actions and a red X for rejected ones; NPC selection adds five pixels around projected geometry while respecting occlusion.
- `geography.ts`: 96 × 96 world dimensions, shared park boundaries, smoother named hills and valleys, Marin ridges and small building pads. Elevations are a stylized geographic model rather than surveyed data.
- `transamerica.ts`: the original Transamerica Pyramid mesh: individually recessed window bays, pale cladding, an exposed braced lobby, closed upper service wings and a separate metal lattice spire. It fits the existing two-tile parcel and joins the static scene batch. Architectural references: [official tower history](https://transamericapyramid.com/transamerica-pyramid) and [Foster + Partners restoration notes](https://www.fosterandpartners.com/news/the-column-transamerica-pyramid-center).
- `downtown.ts`: shared downtown coordinates, the Market/Ferry alignment, Salesforce south of Market, a connected First Street bridge ramp and higher-detail waterfront landmarks. Runtime diagnostics reject broken connections.
- `environment.ts`: one sea surface with shared shallow-water depths, coastal bluffs and Marin landscape details. Deep-water spans retain neighboring edge vertices to prevent cracks; offshore pieces meet the static sea without coplanar overlap and follow the player without a sailing limit. Sea reflections, ripples and surf use the existing procedural shader and rendering pass.
- `airship.ts`: the private jet terminal south of the city, parked jet models, cached airship mesh and rental controller. A walks along a connected southern approach to the rental stand; choose Rent airship to ascend above the highest structure. Ground/minimap clicks set flight destinations, and A returns to the same mooring before descending. The camera and minimap remain centered throughout; a small envelope cutaway keeps the centered rider visible; arrows rotate/tilt the camera. Terminal routes avoid parked jets and connect back into city navigation.
- `shipping.ts`: two cached tanker models on one continuous bay channel loop, sampled by distance for steady movement, opposite phases and a closed seam. Hull extents are checked against the sailing coastline during browser verification.
- `soma-pyramid.ts`: detailed asymmetric glass spire on the existing one-tile SoMa parcel, with separate glazing bays, floor bands, metal mullions, structural diagonals, an entrance canopy and a small crown.
- `restaurants.ts`: Cotogna near Coit Tower and a signed Rich Table house on Oak Street in Hayes Valley. Their private parcels are reserved before surrounding buildings; patio furniture preserves the paving beneath it. Rich Table has a clear aisle and two seated diners sharing a meal, with a distance-culled eating gesture on the existing character rig. Signs retain their requested lettering and use the existing sign atlas. Reference identities: [Cotogna](https://www.cotognasf.com/) and [Rich Table](https://www.richtablesf.com/location/rich-table/).
- `life.ts`: checked pavement routes for pedestrians and cyclists, ferries, tangent-facing gull flight and the streetcar model. Gulls fly wider continuous loops with wingbeats, or glide gently under reduced motion; distant actors are culled before mesh construction.
- `characters.ts`: original indexed character meshes, 16 joint groups, two-weight skinning, cached clothing/hair variants and palette recoloring. Walking/running phases follow distance traveled; foot targets and two-bone IK maintain contacts on terrain. Idle, seated, cycling, windsurfing and ladder-climbing poses share the rig, with upper-body talk, reach and attack gestures. Transformed vertices join the existing dynamic batch without another rendering pass.
- `windsurfing.ts`: the Crissy Field launch, unrestricted open-water sailing, board, sail and rider meshes. Exact coastline intersections and a cached visibility graph route around SF, Marin and Yerba Buena Island. A camera-centered sea surface follows the rider beyond the city map. F launches or returns to shore.
- `encounters.ts`: constant-speed police pursuit, capture, and the barred Carceral Urbanist Facility in the Marin Headlands. Talking is peaceful; attacking or stealing starts pursuit. Officers continue through menus and follow the player onto the bay. Detention permits walking inside the cell, with routes around the bunk and no passage through the bars. Camera, zoom and help remain available; travel and interactions outside the cell remain disabled. The Classic page switch remains available.
- `models.ts`: building, landmark, furniture, character and bicycle mesh factories. The world supplies placement and GPU services through `createModels`. Trees and park benches retain their underlying surface textures and terrain; their collision footprints do not paint building foundations or flatten a square into the ground.
- `housing.ts`: curb-height entrances, fitted hillside plots, four roof profiles, façades, garden stairs, balconies and animated private funiculars. Townhomes keep their street orientation and a maximum of two main storeys; downhill sides can expose a walk-out basement.
- `sutro.ts`: shared ridge-site coordinates, ladder radii and the original 3D Sutro Tower mesh, including its three legs, grated upper platform, antenna masts and guy wires. Click or right-click the tower to choose Climb Sutro Tower, or press E nearby. The reversible traversal follows the visible ladder, keeps the character centered as the camera rises, and returns to the same navigable trail point. Climb down or E descends; it also works partway up. The climbing rig follows vertical distance, keeping planted hands and feet on their rungs. Travel and vehicle actions are unavailable until back on the ground; camera and zoom controls remain available.
- `lighting.ts`: detailed curbside lamps and one depth-tested additive pass for warm halos and terrain-following light pools. Salesforce Tower’s crown uses a small procedural metaball shader for subtle, slowly merging pale-blue light behind the top-floor glazing; it shares the main time uniform and freezes with reduced motion. Emissive glass and metal use reserved GPU style values; the glow buffers rebuild after WebGL context restoration.
- `geometry.ts`: mesh primitives, transforms, picking math and the shared camera-facing cutaway mask.
- `tiles.ts`: configurable surface types, polygon partitioning, connectivity checks and tile regressions. Water-edge intervals and heights are checked alongside road and curb connections; an aligned land/water transition requires a shoreline authored on both neighbors.
- `water-tiles.ts`: shared, precomputed land/ocean/lake partitions. Boundary cells split the two terrain triangles against the actual coastline and lake outlines, preserving concave coves and narrow inlets. Rendering uses these same typed fragments; waterfront footprints preserve water beneath piers, and connected Lake Merced lobes share one level.
- `material-catalog.mts`: the shared list of material names, stable GPU slots, source filenames, labels and intended uses, plus atlas dimensions. `MATERIAL_IDS` is derived from this catalog.
- `materials.ts`: texture loading, context restoration, stable room appearances and the separate lettering atlas. Residential glazing uses a dedicated ambient shader style with restrained warm light in roughly one fifth of rooms; it does not blend the atlas’s pane pattern into the glass. Bay and shop windows sit clear of their backing panels to avoid depth fighting. The glass SVG provides faint reflection detail for glazed towers.
- `textures/materials/*.svg`: the editable material sources. Each standalone 256 × 256 SVG has a title, usage description, and named background/detail groups. For example, edit `grass.svg` for grass, or `roof-tile.svg` for clay roof tiles.
- `textures/materials/preview.html`: generated visual reference with swatches, names, slot numbers, intended uses and links to each source. Open it directly with `file://` or through the development server.
- `textures/sf-materials.svg`: the generated 1024 × 1024 atlas. The build arranges all 16 named materials into the catalog’s 4 × 4 grid. Do not edit this generated file.
- `build-materials.mts`: validates the catalog and SVG references, then assembles the atlas and visual reference. `build.mts` runs this automatically.
- `build.mts`: validates map inputs and combines the module graph and graphics into `index.html`. `build-bundle.mts` uses esbuild with scoped native modules and source maps; `build-world-inputs.mts` isolates semantic map dependencies from UI/runtime changes. Do not edit the generated HTML directly.
- `dev.mts`: serves the modular development view and public assets with caching disabled.

Material lookup follows the geometry, rather than SVG element IDs. A model asks for a named material, such as `m.box(..., "brick")`. `Mesh.tri` looks up `MATERIAL_IDS.brick` (slot 6), storing that selection in the mesh’s UV data. The fragment shader converts slot 6 to column 2, row 1 (zero-based), repeats that region using world coordinates, and multiplies the sampled detail by the model color. SVG IDs are local artwork references; the renderer uploads the entire sheet once and samples pixels from it. Atlas dimensions and the special glass slot come from the catalog too.

To change artwork, find the material in `sf/textures/materials/preview.html`, edit its linked SVG, and run `npm --prefix sf run build`. This rebuilds the atlas, reference and standalone experience. The production build embeds a compact copy of the atlas, preserving the single texture upload and `file://` support.

### Rendering and additional systems

Ordinary NPC names remain in interaction menus; overhead labels are limited to police and active speech. House paints vary saturation and brightness independently within the existing neighborhood palettes. Foundation skirts meet each body’s lower edge without overlapping wall or retaining faces; they extend into the sampled ground to close the terrain seam. The foundation regression checks competing coplanar materials on flat and sloped townhomes, urban blocks and shops at multiple rotations.

The checks also reject an outdated generated experience, material atlas or visual reference. After entering Explore SF, `SFMapDiagnostics.report` contains the full-map surface and street-frontage checks, including `water.edges` and `water.shorelineTiles`. The sea regression also checks every interior mesh edge for an exact neighbor, including transitions between fine shallows and merged deep-water spans.

Cutaway wall indices are north, south, west, east in each building's local coordinates. Rendering, shadows and picking use `cutawayWallMask`; keep these paths on the same visibility rule.

Character rendering research:

- [Lost City Model.ts](https://github.com/LostCityRS/Client-TS/blob/274/src/dash3d/Model.ts) stores indexed triangles, face colors and vertex labels; its animation path groups labeled vertices and transforms them around pivots.
- [Lost City AnimFrame.ts](https://github.com/LostCityRS/Client-TS/blob/274/src/dash3d/AnimFrame.ts) separates frame timing and joint transformations from the model.
- [Rune-Server's animation-system explanation](https://rune-server.org/threads/runescapes-animation-system.700768/) describes grouped vertices and hierarchical joint transforms.

This implementation uses that separation of geometry and animation with original geometry and poses. Foot placement, interpolation and action overlays are authored for this world. The character renderer does not load RuneScape model caches or require WASM, a rendering library, or external character downloads.

Marin uses `marin-land.ts` for its terrain mesh, bounded terrain picking and a half-tile native walking graph. Its polygon shoreline and the detention footprint are collision boundaries. The navigation audit checks routes into the headland ridges and back across the Golden Gate; walking does not require staying on the bridge road.

`loading-screen.ts` displays completed initialization stages and waits for the material atlases, signs and first rendered frame before showing 100% and dismissing the overlay. `teleport-tablets.ts` owns the tablet inventory and 2.8-second travel pose; `teleport-models.ts` draws its purple lightning. Orin the Wizard sells both tablets for 20 coins inside the Nob Hill home. Inventory buttons break a tablet and land the player by the Tahoe gondola or Mazarine in downtown SF. Purchases, consumption and arrival are server-authoritative; local storage cannot supply tablets or complete travel. Other players have Follow, optional PvP Attack and Walk here actions, without Examine.

The Sunset peptide site is the Technologist’s Farmers Market (its stable internal site ID remains `sunset-whole-foods`). Four farmers wear dark coats and sunglasses; their dialogue reads the same spawn deadline used by the shared world. `peptideSpawnAt` is sent at login and whenever the deadline changes, so countdowns need no polling or per-second network messages. There is no local spawn clock.

`countryside.ts` makes the regional grass between Berkeley and Tahoe walkable. A small visibility graph routes around the campus and roadside buildings without storing a giant empty tile grid; water and the detailed Tahoe collision map retain their own boundaries. Grass picking and foot placement use the same clipped 16-tile triangles as the regional backdrop. Native route checks cover journeys over grass from Berkeley to the gondola and back. Hold Shift while flying the B-2 for rocket-speed boost; releasing Shift returns to cruise speed.

Combat accuracy falls linearly with inebriation: 50% inebriation reduces hit chance by 25%, and 100% halves it. Successful-hit damage and strength bonuses remain unchanged. `combat.ts` supplies the shared rule to spectre battles, expeditions, wilderness encounters and server-authoritative PvP/shared monsters. Each swing reads the current percentage, so sobering restores accuracy during a fight. The inebriation indicator explains the current penalty on hover.

Multiplayer following now sends a follow intent to the server rather than pathfinding or advancing the follower in requestAnimationFrame. The server advances the route and walk phase even while that browser is backgrounded or its render loop is paused; the client interpolates its own authoritative samples and reuses the same character rig as other players. Clicking away cancels follow and rebases the new walk route onto the server’s final position.

Movement retains continuous positions over the quarter-tile navigation graph, including narrow doorways and diagonal streets. Whole-tile snapping is not an FPS optimization here. Dynamic model generation was the measured frame bottleneck: procedural triangle emission now avoids temporary vector arrays, off-screen zoo animals/lift cars/parked vehicles are culled before generation, and GPU uploads reuse a typed staging buffer. A local Chrome check of the same 30-frame scenes (with GPU completion included) reduced mean city frame time from 33.8 to 19.5 ms and southern frame time from 48.0 to 18.8 ms. These are local measurements, not a cross-device frame-rate guarantee.

### Historical performance measurements

These older measurements preserve implementation context. For current workloads,
metrics and production sizing, use [server/CAPACITY.md](server/CAPACITY.md).

The earlier protocol-3 [local capacity result](server/benchmarks/local-2000.json) used an
Apple M4 Max, Node 22.16, the production map, SQLite, shared roaming NPCs and
three-second progress checkpoints. This historical result predates protocol 4 and is not a measurement of the current implementation. Over 30 measured seconds, 2,000 moving
connections received 9.70 movement frames/player/second, with a 125.14 ms
99th-percentile frame gap and no unexpected disconnects. Aggregate received
traffic was 36.05 MB/s on loopback. This used the instance/PvP/inventory-capable server
with crowded-spawn interest management; it does not model simultaneous mass
combat, WAN loss or a production TLS proxy.

A focused local stress check using the production city navigation and 1,999 followers chasing one moving leader (2,000 players total) measured 6.8 ms mean follow tick time, 17.8 ms at the 99th percentile and 23.3 ms maximum across 160 ticks. This isolates the follow controller; it excludes WebSocket broadcast, storage and shared-NPC work and supplements the full networking workload described in [CAPACITY.md](server/CAPACITY.md).

The protocol-4 [SQLite capacity check](server/benchmarks/authority-2000.json) exercised
2,000 independent connections for 15 measured seconds, with one destination
request per client every 500 ms, using the production map and crowded spawn.
It completed with no unexpected disconnects and 14.91 MB/s received on loopback.
The health sample at the end reported a 5.02 ms simulation tick and a 64.77 ms
replication pass (individual samples, not percentiles). Delivered movement
frames averaged 5.43/player/second because short routes finish and unchanged
interests are intentionally suppressed. Frame gaps therefore include idle time.
This workload differs from the older continuous-pose benchmark, so its bandwidth
is not a controlled before/after comparison. Repeat on the intended host.
