# TypeScript sources and builds

The game is self-contained in this directory. Run these commands from `sf/`:

```sh
npm run setup
npm run build
npm run dev
```

Setup installs both the game tools and server dependencies. The preview runs on port **8080**: `/` opens the game and `/editor.html` opens the filesystem-writing editor. `/explore.html` remains an alias on the preview and game server. Static hosting uses `sf/index.html`, so the website links to `/sf/`.

The main website has its own package, TypeScript configuration, maintenance tools, and tests at the repository root.

## Source and output

- `game.template.html` and `game.css`: game markup and styles.
- `index.html`: generated browser game, bundled by esbuild.
- `editor.html`: generated editor; source lives in `editor/`.
- `textures/` and `billboards/`: game artwork and source catalogs.
- `content/`: JSON definitions, dialogue, conditional options, schemas, and player-state defaults. Editor saves write these source files directly without rebuilding geometry.
- `types/`: shared TypeScript contracts.
- `.build/`: emitted JavaScript server, source maps, and runtime assets.

The compiler strictly checks the client, editor, server, build tools, and tests. Generated JavaScript files, maps, and compiled map chunks are build artifacts.

## Checks

```sh
npm run typecheck
npm test
npm run lint
npm run format:check
```

`npm test` runs both the client and server suites. Use `npm run test:client` for only client/tooling tests, or `npm --prefix server test` for only server tests.

## Server

```sh
npm --prefix server run dev
```

Development uses the TypeScript loader and Node watch mode. To build and run the compiled server:

```sh
npm --prefix server start
```

This launcher builds `.build/`, then starts ordinary Node with source maps. Saves stay in `server/data/world.sqlite` unless `STATE_FILE` or `REDIS_URL` selects another store. To launch an already-built runtime directly:

```sh
STATE_FILE="$PWD/server/data/world.sqlite" node --enable-source-maps .build/server/index.mjs
```

`npm run build` builds both browser assets and the server runtime. `npm run build:client`, `npm run build:editor`, and `npm run build:runtime` build individual outputs.

Admin and backup commands use the same compiled launcher:

```sh
npm --prefix server run admin -- --check-auth
npm --prefix server run backup
```

The Docker build context is this game directory. From `sf/`, run `docker compose -f server/compose.yaml up --build -d game`. The production image contains the emitted runtime and does not require a TypeScript loader.
