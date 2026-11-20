# Billboard ads

All normal billboard artwork lives here. Both **SVG and PNG** work in the
development view and in the standalone `explore.html` build.

## Replace an ad

1. Put your image in this directory.
2. Open [`catalog.js`](catalog.js) and change the corresponding `file` value.
   Keep its `id` unchanged: that selects the existing billboard locations.
3. Run `node sf/build.mjs` from the repository root and refresh the game.

For example, put `my-ad.png` here and change the Soft Launch Intelligence entry to:

```js
{id:'ai-openai',file:'my-ad.png',color:'#42746b'},
```

You can also overwrite an existing SVG without changing the catalog. If you
switch formats, change the filename and extension in the catalog as well.
The build reports missing files and format mismatches.

| File | Where it appears |
| --- | --- |
| `goose-corp.svg` | Times Square: Goose Corp and a goose in pursuit |
| `recursive-picnic.svg` | Times Square: Recursive Picnic AI |
| `anser-analytics.svg` | Times Square: Anser Analytics, a Goose Corp subsidiary |
| `velvet-gradient.svg` | Times Square: Velvet Gradient |
| `dead-reckoning.svg` | Times Square: Dead Reckoning AI |
| `tomorrow-probably.svg` | Times Square: Tomorrow, Probably |
| `soft-launch.svg` | Airport roads and fields: Soft Launch Intelligence |
| `pondwater-research.svg` | Airport roads and fields: Pondwater Research |
| `borrowed-neuron.svg` | Airport roads and fields: Borrowed Neuron |
| `local-minimum.svg` | Beach billboard near the sunglasses: Local Minimum AI |
| `green.svg` | Green Bank rooftop: the supplied Green artwork |

These companies are fictional worldbuilding. The catalog keeps its old IDs
(such as `ai-openai` and `ts-cola`) for map/cache compatibility; those IDs do
not control the displayed company names. Only files selected in `catalog.js`
are displayed. Older, unselected artwork is not loaded or embedded.

The Goose Corp books are in `sf/config/world-lore.js`. NPC references live in
`sf/config/dialogue.js`; the guild's membership mechanics stay separate.

## Image preparation

- Artwork is sampled into a **256 × 256 atlas cell**. Design on a square
  canvas; the existing panels stretch it to their physical proportions.
  A 256–512 pixel PNG is plenty; larger files increase download size without
  increasing the atlas resolution.
- SVGs should be self-contained, with a `viewBox` and no external image/font
  dependencies. Turn lettering into paths if its exact font matters.
- Transparency shows the catalog's `color` behind the image.
- Several panels can share one catalog entry. Extra files are ignored until
  referenced by an entry; adding an image does not add new map geometry.

The standalone build embeds the selected artwork, including PNG bytes, so it
also loads from `file://`. The development server reads these files directly;
refreshing shows edits without rebuilding.

The sunglasses/They Live messages remain in `sf/billboards.js`, separate from
this directory. Replacing normal artwork preserves those messages and the quest.
