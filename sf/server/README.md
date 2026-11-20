# Server operations

Run, configure, deploy and recover the Explore SF backend. For the local
client workflow, builds, tests and source layout, start with [sf/README.md](../README.md).
Gameplay is documented in [sf/DOCUMENTATION.md](../DOCUMENTATION.md).
Performance tuning and measured workloads are in [CAPACITY.md](CAPACITY.md).

Commands run from the **repository root** unless a block explicitly changes
directory or runs inside an EC2 session.

- [Run locally](#run-locally)
- [Deployment](#deployment)
- [Persistence](#persistence)
- [Hourly SQLite backups](#hourly-sqlite-backups)
- [State editor](#simple-database-editor)
- [Configuration](#configuration)
- [Health and diagnostics](#health-and-diagnostics)

## Run locally

Use Node.js >=22.16 (the image uses Node 24):

```sh
npm ci --prefix sf
npm ci --prefix sf/server
node sf/build.mjs
npm --prefix sf/server start
```

Open **http://127.0.0.1:8787/explore.html**. The server serves the static site,
`/multiplayer-config.json`, `/healthz`, and WebSockets at `/ws`. Without
`REDIS_URL`, saves go to `sf/server/data/world.sqlite`.

For Docker Compose with Redis:

```sh
npm ci --prefix sf
node sf/build.mjs
docker compose -f sf/server/compose.yaml up --build -d game
docker compose -f sf/server/compose.yaml logs -f game
```

Stop with Ctrl+C for Node, or `docker compose -f sf/server/compose.yaml down`.
Both allow a graceful final checkpoint. Keep Docker volumes; `down -v` removes
persisted state. Run **one simulation process per world**; do not scale game
replicas or put independent world processes behind a load balancer.

## Deployment

### Docker Compose and static hosting

GitHub Pages cannot run the backend. It can continue serving the homepage and
`explore.html`; run the backend on a host with long-lived WebSocket connections.

```sh
docker compose -f sf/server/compose.yaml up --build -d game
```

This exposes the backend on host loopback port 8787 and stores checkpoints in
the included Redis service's named volume. For public HTTPS/WSS using Caddy,
point a backend hostname at the host, set `GAME_DOMAIN` and `ALLOWED_ORIGINS`, and run:

```sh
GAME_DOMAIN=game.example.com \
ALLOWED_ORIGINS=https://johnloeber.com,https://www.johnloeber.com \
docker compose -f sf/server/compose.yaml --profile production up --build -d
```

Create a root `multiplayer-config.json` in the static site's deployment:

```json
{ "endpoint": "wss://game.example.com/ws" }
```

Alternatively enter that address in Character → Multiplayer connection. A
local `file://` page can use `?server=ws://127.0.0.1:8787/ws`. Production HTTPS
pages require `wss://`. File origins are accepted only by the default loopback
server, unless explicitly enabled. Without a configured backend, the client
shows the connection form and waits for authentication.

### Single EC2 instance with Terraform

`sf/server/deploy/` provisions one Ubuntu 24.04 x86_64 instance in **us-west-1**,
an Elastic IP, security group, instance role, and private S3 bucket. It uses
the region's existing default VPC/public subnets. Only HTTP/HTTPS are open;
administration uses AWS Systems Manager Session Manager, without SSH keys.
The default instance is `t3.large` with an encrypted 40 GiB gp3 root disk.
Instance sizing has not been load-tested on EC2. EC2, EBS, public IPv4 and S3
incur AWS charges.

Install Terraform >=1.6 and authenticate the AWS CLI to your deployment
account. From the repository root, build and package the **current working tree**,
including uncommitted changes, then configure the backend hostname you control:

```sh
node sf/build.mjs
bash sf/server/deploy/package.sh
cd sf/server/deploy
cp terraform.tfvars.example terraform.tfvars
# Edit game_domain in terraform.tfvars. Region defaults to us-west-1.
terraform init
terraform plan
terraform apply
```

Packaging excludes local databases/backups, dependencies, environment files,
Terraform state and AWS/Codex credential directories. The archive includes
the static site, game modules, world cache, textures and billboard assets.
Terraform uploads it to S3. First boot installs Docker, Compose, the AWS CLI
and cron, builds the game image, and starts game + Redis + Caddy. Caddy manages
HTTPS for `game_domain`. Point that hostname's DNS **A record** to the
`elastic_ip` output and remove any stale AAAA record pointing elsewhere.
Bootstrap may take several minutes after Terraform finishes. Check:

```sh
terraform output -raw connect
# Run the printed aws ssm start-session command (requires the session-manager plugin).
# Inside the session:
sudo tail -n 100 /var/log/cloud-init-output.log
sudo docker compose --env-file /etc/loeberland/compose.env \
  -f /opt/loeberland/current/sf/server/compose.yaml --profile production ps
```

Visit the `game_url` output. For a separately hosted GitHub Pages frontend,
put the `websocket_url` output in its root `multiplayer-config.json`, as shown
above. Add that frontend's exact origin to `allowed_origins`. The backend's
own HTTPS origin is always included.

The hourly cron is installed automatically, with seven days of local SQLite
backups and 30-day expiration in the versioned S3 bucket (noncurrent versions
are removed 30 days later). Redis also keeps its normal AOF
in a Docker volume. To list/download off-host backups from an authenticated
operator machine:

```sh
aws s3 ls "s3://$(terraform output -raw backup_bucket)/backups/"
aws s3 cp "s3://$(terraform output -raw backup_bucket)/backups/CHOSEN.sqlite" ./restore.sqlite
```

To update code, run `package.sh` again and `terraform apply` to upload the
new archive, then run the command printed by `terraform output -raw deploy_update`.
It builds before replacing the game container, whose graceful shutdown saves
the final checkpoint. Reconnects recover from Redis. Check the returned SSM
command's status and `/healthz`; deploying is not a zero-downtime operation.
Only successful deployments update the `current` link and cron script.
Failed builds preserve the running game; a failed game startup needs operator
intervention using the retained previous release under `/opt/loeberland/releases`.

Terraform deliberately ignores AMI/bootstrap changes on an existing instance
to avoid replacing a live world during an ordinary code update. Changes to
domain/origins require editing `/etc/loeberland/compose.env` on that host and
running `/usr/local/sbin/loeberland-deploy`; revised bootstrap/AMI settings need
an intentional instance replacement and recovery from backup. Root disk/Docker
volumes do not survive replacement. Preserve the Terraform state and download
a backup before rebuilding an instance. Initial deployment starts an empty
world; moving an existing world requires the [restore procedure](#hourly-sqlite-backups).

The S3 bucket refuses automatic deletion while it contains objects; retain or
explicitly empty it when dismantling the stack. Source archives are versioned
and old versions expire after 30 days. Old unpacked releases/images on the
instance remain available for rollback and need occasional pruning.

References: [Ubuntu AMI discovery](https://ubuntu.com/aws/docs/aws-how-to/instances/find-ubuntu-images/),
[Terraform EC2 resource](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance),
[Redis atomic read scripts](https://redis.io/docs/latest/develop/interact/programmability/).

## Persistence

The active world, player profiles and username reservations live in ordinary
in-process objects/maps. Gameplay reads and mutations use RAM; commands share
an ordered queue in the world's owning Node process. Sockets, timers, queued
promises and simulation controllers stay outside the serializable state.

Set `REDIS_URL` to enable Redis checkpoints. Docker Compose configures Redis
automatically. Every `CHECKPOINT_INTERVAL_MS` (default **1000 ms**), changed games
capture a detached snapshot inside their action queue before asynchronous I/O.
Each document has a monotonically increasing version and an `active` or
`completed` status. Only one write per game can run at a time. Busy cycles are
coalesced; a successful write acknowledges only its captured version. A failed
write is logged and remains pending for the next cycle.

Redis atomically saves the document and its discovery registry at
`loeberland:v1:checkpoint:game:<id>` and `loeberland:v1:checkpoint:games`.
Startup restores all registered documents **before listening for gameplay**.
Reconnects receive fresh authoritative snapshots. Completed games remain
registered and cannot be reopened. Old world/player/name records in the same
backend are imported once, when no checkpoint registry exists; after that,
legacy records are ignored. The state editor transparently edits the checkpoint.

SIGTERM and SIGINT stop new actions and checkpoint scheduling, drain accepted
mutations, coordinate in-flight writes, and attempt the latest changed-game
checkpoints before closing Redis. Shutdown is idempotent and bounded by
`SHUTDOWN_TIMEOUT_MS` (default **10000 ms**, including storage close). Failure or
timeout is logged and shutdown finishes; no async `exit` handler is used.
Recovery restores the **latest successful checkpoint**. Changes since then can
be lost, including acknowledged purchases/rewards; outages can make that window
longer than one second. Personal travel resumes using the existing safe-position
rules rather than restoring sockets, animations or pending input commands.

Run **one owning Node process for the common world**, without cluster workers
or overlapping replicas. Redis's renewable ownership lease rejects a second
owner and fences checkpoint writes. Lease loss closes clients and suspends the
simulation. This handles application restarts and graceful deployments;
distributed simulation/failover is outside scope. Use the backups below for
host disaster recovery.

Without `REDIS_URL`, local development retains the SQLite fallback at
`sf/server/data/world.sqlite`, using the same RAM/checkpoint lifecycle and a
worker for disk I/O. Switching from SQLite to Redis does not copy data between
backends: use the existing backend for an existing world until its data has
been migrated. Redis in Compose uses a named volume and AOF.

### Hourly SQLite backups

`backup.mjs` exports every registered Redis game checkpoint into one standalone
SQLite database compatible with the existing SQLite store and state editor.
This includes world records, all saved player profiles/inventories, username
reservations, versions and completed games. Usernames are embedded in the game
checkpoint documents; the legacy `usernames` table is intentionally empty.
It excludes the transient simulation ownership lease and obsolete legacy keys.
The export reads the registry and all documents atomically with a read-only
Redis script. It does not acquire ownership or stop the running game.

Backups contain the latest **successful Redis checkpoint**, not unsaved RAM,
connections or pending actions. Reading the full snapshot briefly occupies
Redis. SQLite output is integrity-checked and published by atomic rename;
failed exports leave any previous output intact. Files have mode 0600 and
contain private player identity data.

On a Linux Docker Compose host, rebuild the image once, then run from the
repository root:

```sh
docker compose -f sf/server/compose.yaml build game
bash sf/server/backup.sh
```

The wrapper takes a nonblocking lock, writes UTC timestamped files under
`sf/server/backups/` (override with Compose's `BACKUP_DIR`), and removes files
older than seven days after a successful run. It requires Bash, Docker Compose,
Python 3 and `flock`. Set `COMPOSE_ENV_FILE` if your Compose settings live
outside `sf/server/.env`. Set `S3_BACKUP_URI=s3://your-bucket/backups` to upload
each completed file using the AWS CLI before pruning local backups.

For Node without Docker:

```sh
REDIS_URL=redis://127.0.0.1:6379 node sf/server/backup.mjs --output /safe/path/world.sqlite
```

The EC2 bootstrap installs `deploy/loeberland-backup.cron` at
`/etc/cron.d/loeberland-backup`. It runs at minute zero every hour, with a
50-minute timeout and rotated logs at `/var/log/loeberland-backup.log`.
Local backups live at `/var/lib/loeberland/backups`; S3 expires them after 30
days (noncurrent versions are removed 30 days later).
To trigger it manually on EC2:

```sh
sudo bash -ec '. /etc/loeberland/backup.env; bash /opt/loeberland/current/sf/server/backup.sh'
```

To recover into Redis, stop the game and use `--restore` instead of `--output`.
Restore requires an **empty Redis database** and refuses to overwrite existing
data or a live ownership lease. For example, on EC2, use an unused Redis
database (here DB 1), preserving the previous DB 0:

```sh
sudo -i
cd /opt/loeberland/current
compose=(docker compose --env-file /etc/loeberland/compose.env -f sf/server/compose.yaml)
"${compose[@]}" stop game
# Copy the chosen SQLite file to /var/lib/loeberland/backups/restore.sqlite first.
"${compose[@]}" run --rm --no-deps -T --user 0:0 --entrypoint node \
  --env REDIS_URL=redis://redis:6379/1 game backup.mjs --restore /backups/restore.sqlite
# Only after restore succeeds, set REDIS_URL=redis://redis:6379/1 in
# /etc/loeberland/compose.env, then restart using the same env file:
"${compose[@]}" up -d --wait game
```

For SQLite recovery instead, stop the server and run it with `REDIS_URL` unset
and `STATE_FILE` pointing at the backup. Keep the original backup unchanged;
use a working copy when resuming gameplay or editing it.

### Simple database editor

The admin panel lists world records, per-player state and username reservations
from the latest saved Redis checkpoint (or the selected SQLite file). Search by
username or player ID, select a record and inspect its JSON. Refresh the list
or reload a record to read a newer checkpoint.

The page and every API endpoint require **HTTP Basic Auth**. The Node entry
point automatically loads `sf/server/.env`; the Docker launcher reads that file
on the host and passes it to the temporary admin container. The file is
Git-ignored and excluded from Docker images and deployment archives.

For initial setup, copy `sf/server/.env.example` to `sf/server/.env` if a file
is not already present, and set:

```dotenv
ADMIN_USERNAME=admin
ADMIN_PASSWORD="your-long-random-password"
```

Run `chmod 600 sf/server/.env`. Both values are required; the username cannot
contain a colon. Quote passwords containing `#` or spaces. Generate a password
with a password manager or `openssl rand -hex 32`. The panel refuses to start
with missing credentials and never prints the password.

From the repository root on a Docker Compose host:

```sh
docker compose -f sf/server/compose.yaml build game
# Read-only inspection while the game keeps running:
bash sf/server/edit-state.sh --view
```

Open **http://127.0.0.1:8788** and enter the `.env` credentials in the browser's
login prompt. `--view` disables writes in both the UI and API and does not
stop or restart the game. For an editing session, exit inspection and run:

```sh
bash sf/server/edit-state.sh
```

The launcher validates authentication before interrupting gameplay, starts
Redis if necessary, stops the game to flush its final checkpoint, and opens
the editor. Change a record's JSON and click **Save changes**. Press Ctrl+C in
the terminal to close the editor; the launcher restarts the game if it was
running before the session, including when the editor exits with an error.
If it was already off, it stays off.

**Only edit usefully while the game is stopped.** The simulation holds its state
in RAM and can overwrite database edits. Redis saves also reject an active
simulation ownership lease; after an ungraceful stop, allow up to 15 seconds
for that lease to expire. Restart after saving to load the changed state.
Take a backup first. Saves reject stale records; reload them before retrying.
Username edits preserve the owner ID and enforce name validation/uniqueness.
This is a JSON editor, so keep existing record structure and value types intact.

For a Redis server reachable directly from Node:

```sh
REDIS_URL=redis://127.0.0.1:6379 ADMIN_READ_ONLY=1 npm --prefix sf/server run admin
```

Stop the game and remove `ADMIN_READ_ONLY=1` for an editing session. For SQLite,
leave `REDIS_URL` unset and set `STATE_FILE` to the existing database. The default
is `sf/server/data/world.sqlite`; a missing file is an error. For example:

```sh
STATE_FILE=/path/to/world.sqlite npm --prefix sf/server run admin
```

Use `ADMIN_PORT` to change port 8788. The Node panel binds to loopback by
default; the Docker launcher binds inside the container and publishes only
host loopback. Keep it behind an SSH/SSM tunnel for remote use. Basic Auth
should not be sent over an unencrypted public HTTP connection.

For custom credential/settings files:

```sh
ADMIN_ENV_FILE=/secure/path/.env \
COMPOSE_ENV_FILE=/path/to/compose.env \
bash sf/server/edit-state.sh --view
```

`ADMIN_ENV_FILE` also works with `npm --prefix sf/server run admin`. Explicit
process environment variables take precedence over values loaded by Node.
The wrapper uses `COMPOSE_ENV_FILE` for the same project and Redis settings
as the game; credentials are passed as a file, without appearing in command
arguments. Rebuild the game image after changing admin code.

On Terraform-managed EC2, keep the password outside the unpacked release
so deployments preserve it. Create `/etc/loeberland/.env` with the two credential
lines above and mode 0600, then launch:

```sh
sudo env ADMIN_ENV_FILE=/etc/loeberland/.env \
  COMPOSE_ENV_FILE=/etc/loeberland/compose.env \
  bash /opt/loeberland/current/sf/server/edit-state.sh --view
```

Remove `--view` for an editing session. Use SSM port forwarding to local port 8788. On a host configured for SSH, `ssh -L 8788:127.0.0.1:8788 your-host`
provides the equivalent tunnel. Keep the tunnel open while using the panel.

## Configuration

These are the defaults when running Node directly. Compose sets `HOST=0.0.0.0`
inside the container, selects its Redis service and supplies the configured
allowed origins. It publishes game port 8787 on host loopback only.

| Variable                            | Default / purpose                                                          |
| ----------------------------------- | -------------------------------------------------------------------------- |
| `HOST` / `PORT`                     | `127.0.0.1` / `8787`                                                       |
| `STATE_FILE`                        | `sf/server/data/world.sqlite`; used when Redis is unset                    |
| `REDIS_URL`                         | Unset for Node; Compose defaults to `redis://redis:6379`                   |
| `CHECKPOINT_INTERVAL_MS`            | `1000`                                                                     |
| `SHUTDOWN_TIMEOUT_MS`               | `10000`                                                                    |
| `MAX_PLAYERS`                       | `2000`; admission limit, not a capacity guarantee                          |
| `ALLOWED_ORIGINS`                   | Comma-separated exact frontend origins; loopback is accepted locally       |
| `ALLOW_DEBUG`                       | `0`; set to `1` only for local/debug server actions                        |
| `ALLOW_FILE_ORIGIN`                 | Off for non-loopback servers; explicitly allows `file://` clients          |
| `ADMIN_HOST` / `ADMIN_PORT`         | Editor bind address/port: `127.0.0.1` / `8788`                             |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Required HTTP Basic Auth credentials; no default                           |
| `ADMIN_ENV_FILE`                    | Admin credentials/settings file; defaults to `sf/server/.env`              |
| `ADMIN_READ_ONLY`                   | `0`; set `1` for inspection with writes disabled (`--view` sets it)        |
| `GAME_DOMAIN`                       | Compose/Caddy hostname; default `localhost`, set a real hostname for HTTPS |
| `BACKUP_DIR`                        | Compose backup bind directory; default `sf/server/backups/`                |
| `COMPOSE_ENV_FILE`                  | Backup/admin launchers' Compose env file; default `sf/server/.env`         |
| `S3_BACKUP_URI`                     | Optional backup-wrapper upload destination, such as `s3://bucket/backups`  |

For a non-Terraform Compose deployment, keep `GAME_DOMAIN`, `ALLOWED_ORIGINS`
and other persistent settings in `sf/server/.env` and use that file for every
Compose command. Terraform stores its host settings at
`/etc/loeberland/compose.env`; pass it with `--env-file` to avoid selecting a
different Compose project or Redis database.

## Health and diagnostics

```sh
curl -fsS http://127.0.0.1:8787/healthz
docker compose -f sf/server/compose.yaml ps
docker compose -f sf/server/compose.yaml logs --tail 100 game redis
```

On EC2, add `--env-file /etc/loeberland/compose.env` and use the Compose file
at `/opt/loeberland/current/sf/server/compose.yaml`.

`/healthz` reports player counts/capacity, the active storage backend,
checkpoint versions and interval, event-loop delay, tick/broadcast timings,
CPU/memory/bandwidth, action backlog and route-cache statistics. Failed
ownership or shutdown makes it return 503. Watch checkpoint versions advance
when the world changes; repeated checkpoint errors mean recovery will use an
older save. See [CAPACITY.md](CAPACITY.md) for metric definitions and load tests.

Gameplay commands operate on RAM inside one ordered mutation queue. Clients
send intents and cosmetic preferences; the server owns positions, health,
inventory, XP and quest progress. The browser interpolates server movement.
Simulation runs at 20 Hz, player replication at 10 Hz and world/private
replication at 5 Hz (`sf/config/gameplay.js`). World and private messages carry
their server sample time. The renderer uses a bounded snapshot buffer for NPC
movement and gait, including personal police and shared animal chases, rather
than running client-side paths or increasing the simulation/broadcast rates.
The current protocol version is defined in `sf/multiplayer-protocol.js`;
deploy matching static-client and server builds together when changing it.
Server-only code is excluded from the client build.

For anonymous accounts, the browser holds the credential and the server stores
its hash. Losing browser storage loses access to the identity. Backing up server
state does not recover a credential deleted from the browser.
