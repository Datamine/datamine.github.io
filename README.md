# Personal website

The personal website lives in `index.html`, `new.css`, `main.ts`, and `images/`.

```sh
npm ci
npm run build
npm run typecheck
npm test
```

`npm run check:selectors` audits the website CSS. `npm run update:writing` explicitly refreshes the Writing section from its RSS feed.

The game, editor, artwork, server, and all game tooling live in **[sf/](sf/README.md)**. They have their own packages and build output:

```sh
cd sf
npm run setup
npm run build
npm run dev
```

The game preview runs on port 8080; open `/editor.html` for the filesystem-writing editor. See [sf/TYPESCRIPT.md](sf/TYPESCRIPT.md) for backend and production commands.
