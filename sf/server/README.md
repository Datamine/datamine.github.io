# Loeberland multiplayer

The browser remains a static WebGL client. One Node process owns the common
world and communicates over WebSockets. The server simulates at 20 Hz and
sends nearby-player movement at approximately 10 Hz. Rendering interpolates
between snapshots and never waits for a database.

## Run locally

Use Node 24 LTS (Node 22.16+ also works).

```sh
npm ci --prefix sf/server
node sf/build.mjs
npm --prefix sf/server start
```

Open **http://127.0.0.1:8787/explore.html**. The local server supplies its own
connection configuration. Use an incognito window or a different browser
profile for a second player. Two tabs with the same anonymous identity control
one character; the newer tab replaces the older connection.

Character settings contain username, PvP and connection settings. Names are unique
without regard to case, have 1–12 ASCII letters/digits/underscores, and can be
changed once every 60 seconds. Validation, common profanity/leet substitutions,
name reservations, and the cooldown run on the backend. Names remain reserved
when their owners are offline. An old name becomes available after a rename.

The browser keeps a random 256-bit anonymous credential. Only its SHA-256 hash
is stored as the account key. Clearing browser storage loses access to that
character; this initial version has no account recovery or password sign-in.

## Players, levels and PvP

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

| Shared, owned by the server | Personal, stored privately per anonymous identity |
| --- | --- |
| Player presence, usernames, levels, PvP consent and combat | Quest state and alien/spectre visibility |
| Inventory ledger, PvP deaths and dropped inventory | Sunglasses, billboard appearances and outfit configuration |
| Roaming pedestrians, researchers and service NPCs | Local dialogue and personal interactions |
| Cow HP, kills, respawn timers and loot | Ferrari, bicycle, motorcycle and skateboard progression |
| Released tiger, animal control and raptor encounters | Police pursuit, detention and rehabilitation |
| Raptor attacks on pedestrians and dropped coins | The kraken hunt and its rewards |
| The airship, pilot, basket passengers, rope and grappling | Rocket animations, Tahoe activities and private travel |

Only the server rolls shared/PvP combat damage, kills/respawns cows, releases
animals, awards shared loot, or decides airship ownership. A loot drop has a
15-second first-claim window for its hunter, then becomes available to others.
Loot collection is serialized and awarded once. Pending rewards survive a
disconnect; client acknowledgement and an atomic local checkpoint prevent a
lost reply from duplicating or discarding a reward.

Coins, food, phones and hats use an owner-private server inventory ledger.
Inventory operations are ordered, shared pickups are serialized, and a death
advances an inventory epoch. Delayed checkpoints or pre-death operations
cannot restore dropped items. The inventory change and shared death drops
are persisted together before the death is reported to clients.

Green Bank keeps deposits in a separate, owner-private account, outside the
carried inventory and PvP drops. The authoritative clock accrues 5% compound
interest per elapsed hour, including offline time; interest is settled lazily
on account access rather than on every game tick. Transfers move whole coins
directly between the purse and account, without the iPhone income bonus.
Fractional interest remains deposited. Balances and transfer timestamps survive
restarts, and deposits, withdrawals and complimentary coffee use durable,
inventory-epoch-checked commands. Transfers and coffee collection require a
visit to the banker; a carried coffee can be drunk elsewhere.

The existing personal adventure controllers still run in the browser and
checkpoint their private progression every three seconds. These checkpoints
are bounded and restricted to a fixed list of game keys; they are never sent
to other players. These checkpoints cannot overwrite the inventory ledger.
This is not a complete anti-cheat migration of every personal quest or reward:
personal reward eligibility, strength XP and weapon unlocks still originate
in the personal controllers. Server-owned shared outcomes, inventory revisions,
PvP consent and username ownership cannot be overwritten with a checkpoint.

The Marin bear and Tahoe snow/ice giants are shared creatures. The server
owns retaliation, HP, respawns and death rolls, with the same simulation used
by single player. Drops have the normal hunter's first-claim window and commit
to the inventory ledger exactly once. Ice equipment and battleaxe ownership
persist in that ledger; checkpoints cannot forge ownership. Battleaxe purchases
require a completed They Live record, a live player beside the armorer and
50 coins. In-N-Out pickups require its NPC counter and cost two coins.
Only nearby wilderness creatures are broadcast, using the same 5 Hz entity
cadence; distant players receive no stream of their movements.

Ground movement is predicted by the existing client and validated against
speed limits and the map's native adjacency graph. Illegal moves receive a
correction. The server builds the same authored map once, without DOM or GPU
resources; it does not download assets or use browser-based navigation tests.
Private scripted travel has separate handling. Debug teleporting is disabled
unless the operator sets `ALLOW_DEBUG=1`.

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
The server allows one bomb per 30 seconds, persists that deadline, and applies
the blast after a short fall. Damage is **100**, restricted to live cows in
the aligned **3×3 tile** impact area. Players, spectres, pedestrians, the
raptor and the kraken are excluded from the damage query. Cow deaths, loot and
respawns remain shared. Other surface players can see each pilot's aircraft.

Map templates and their tile rules live in `sf/map-instances.js`. A private
instance has its own ID, tile bounds and layer; the same coordinates in two
instances do not imply visibility or interaction. The server filters player
interests, chat, PvP and shared-world commands by instance. Cave movement uses
the same authored adjacency graph on client and server. Each player's cave
and **Ahab's kraken-hunting waters** are separate private instances. Boarding
the Pequod enters the latter; sailing back restores the public map. The
existing kraken encounter remains personal, including its HP, loot and cape.

Disconnecting in a cave, on the hunt or in the bomber saves a safe surface
return point; initiation, aircraft ownership and the bomb cooldown persist.
Reconnects start on the surface. Protocol version 3 requires deploying matching
server and static-client builds together.

## Airship and close inspection

Rent the common airship at the private jet terminal. Its first passenger is
the pilot. Other passengers can walk in the basket but cannot steer. If the
pilot leaves, control passes to the next passenger. An unattended ship returns
to its mooring; after a server restart, a saved in-flight ship returns safely.

Buy a **5-coin grappling hook** from the terminal's airship menu. The inventory
button **Grapple airship** works within six tiles horizontally beneath an
occupied aircraft. The hook and ascent are visible to other players. The
pilot's lowered rope is shared too; it can be used to climb up or down.

Zoom now reaches **650%** using the slider, wheel or pinch, allowing close
inspection of the kraken cape's lettering. Camera settings are entirely local.

## Persistence

SQLite is the default. Its WAL database lives at `sf/server/data/world.sqlite`,
which is ignored by Git. All database operations run in a separate worker;
normal movement never performs synchronous filesystem I/O. Dirty profiles and
world snapshots are batched every five seconds. Shared rewards, PvP deaths,
PvP consent, names and major inventory purchases are persisted before success
is reported. Graceful shutdown drains writes.
Back up the database with SQLite's backup tooling rather than copying only
the main file while the server is running.

Set `REDIS_URL` to use Redis instead. Enable Redis AOF/persistence and a durable
volume on the Redis host. Redis stores snapshots and profiles; it is not a
per-frame message bus. A renewable ownership lease prevents two server
processes from simulating the same Redis world. Lease loss stops writes and
closes clients instead of allowing two conflicting world owners.

### Simple database editor

Stop the game server, then run from `sf/`:

```sh
npm --prefix server run admin
```

Open **http://127.0.0.1:8788**. Search by username or player ID, select a player,
world snapshot or username, edit its JSON, and click **Save changes**. Restart
the game server afterward; it loads these records into memory at startup.
Do not edit while the game server is running: its periodic saves can overwrite
your changes. Take a database backup before changing important state.

The editor uses the same `STATE_FILE` / `REDIS_URL` settings as the game server:

```sh
STATE_FILE=/path/to/world.sqlite npm --prefix server run admin
REDIS_URL=redis://127.0.0.1:6379 npm --prefix server run admin
```

The default is `server/data/world.sqlite`. The SQLite file must already exist.
Set `ADMIN_PORT` to change port 8788. The editor only listens on loopback;
for a remote database, run it on the database host and use an SSH tunnel
(`ssh -L 8788:127.0.0.1:8788 your-host`). With Docker, use the same data volume
as the game container and publish the editor's loopback port through a tunnel
or run the script on the host with access to the database file.

Saves reject stale records instead of overwriting changes made since loading.
Redis saves also refuse to run while the simulation ownership lease is active
(it may take 15 seconds to expire after an ungraceful stop). Username edits
preserve owner IDs, validate the name, and enforce unique lowercase names.
This is a direct JSON editor: keep the existing profile/world structure and
value types intact. It does not run game commands or migrate malformed state.

## Deploy alongside GitHub Pages

GitHub Pages cannot run the backend. It can continue serving the homepage and
`explore.html`; run the backend on a host with long-lived WebSocket connections.

```sh
docker compose -f sf/server/compose.yaml up --build -d game
```

This exposes the backend on host loopback port 8787 and persists SQLite in a
named volume. For public HTTPS/WSS using the included Caddy proxy, point a
backend hostname at the host, set `GAME_DOMAIN` and `ALLOWED_ORIGINS`, and run:

```sh
GAME_DOMAIN=game.example.com \
ALLOWED_ORIGINS=https://johnloeber.com,https://www.johnloeber.com \
docker compose -f sf/server/compose.yaml --profile production up --build -d
```

Create a root `multiplayer-config.json` in the static site's deployment:

```json
{"endpoint":"wss://game.example.com/ws"}
```

Alternatively enter that address in Character → Multiplayer connection. A
local `file://` page can use `?server=ws://127.0.0.1:8787/ws`. Production HTTPS
pages require `wss://`. File origins are accepted only by the default loopback
server, unless explicitly enabled. Without a configured backend, the static
single-player game continues to work and is clearly marked as single player.

Environment variables:

| Variable | Default |
| --- | --- |
| `HOST` / `PORT` | `127.0.0.1` / `8787` |
| `STATE_FILE` | `sf/server/data/world.sqlite` |
| `REDIS_URL` | Unset; SQLite is used |
| `MAX_PLAYERS` | `2000` |
| `ALLOWED_ORIGINS` | Loopback origins; add the static site's exact origins |
| `ALLOW_DEBUG` | `0` |
| `ALLOW_FILE_ORIGIN` | Off for non-loopback deployments |

Run **one simulation process/replica** for this common world. Do not put
independent world processes behind a round-robin load balancer. The service
has `/healthz`, WebSocket heartbeats, payload/rate limits, bounded queues, and
slow-client disconnect/resynchronization. Keep port 8787 behind a TLS reverse
proxy for public use. No deployment is performed by these source changes.

## Capacity and checks

Interest management limits each client to 32 stable nearby player interests
and 32 nearby NPC updates, plus at most 64 nearby loot drops. A dense crowd
cannot make every client render or
receive 2,000 full character meshes. Player movement uses 32-byte records in
binary packets; entity updates are quantized deltas. Texture/model assets
are loaded from static hosting, never broadcast by the server.

```sh
npm --prefix sf/server test
node --test sf/tests/*.test.mjs
node sf/server/load-test.mjs --players 2000 --seconds 30 \
  --url ws://127.0.0.1:8787/ws --output /tmp/loeberland-capacity.json
```

The load test creates real independent WebSocket connections, sends movement,
receives snapshots, and reports delivered update rate, packet latency,
disconnects, event-loop delay and bandwidth. Run it against a disposable
database: it creates 2,000 anonymous profiles. A local result is evidence for
the implementation, not a production SLA; repeat it on the intended host,
network and proxy before opening the world to 2,000 visitors.

The checked-in [local capacity result](benchmarks/local-2000.json) used an
Apple M4 Max, Node 22.16, the production map, SQLite, shared roaming NPCs and
three-second progress checkpoints. Over 30 measured seconds, 2,000 moving
connections received 9.70 movement frames/player/second, with a 125.14 ms
99th-percentile frame gap and no unexpected disconnects. Aggregate received
traffic was 36.05 MB/s on loopback. This used the instance/PvP/inventory-capable server
with crowded-spawn interest management; it does not model simultaneous mass
combat, WAN loss or a production TLS proxy.

Protocol/library references: [ws](https://github.com/websockets/ws),
[SQLite WAL](https://sqlite.org/wal.html), and
[Redis Pub/Sub delivery semantics](https://redis.io/docs/latest/develop/pubsub/).
The simulation broadcasts current state directly over WebSockets; Redis
Pub/Sub is not used as a durable world-state transport.

To exercise the optional Redis adapter as well, install `redis-server` on the
local test machine and run `RUN_REDIS_TESTS=1 npm --prefix sf/server test`.
That check starts its own disposable Redis instance on a free loopback port.

Teleport tablets use `teleport-tablets.mjs`: purchases require proximity to Orin and charge 20 coins; travel consumes one durable, server-owned tablet and uses fixed native-validated destinations. The server drives the 2.8-second teleport and ignores client movement during it. Jail, private instances and vehicles prevent tablet use. Disconnecting mid-flight saves the safe destination rather than an airborne position. Tablet counts are included in inventory snapshots and are excluded from client checkpoints.
