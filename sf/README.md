# Explore SF

The editable world uses ES modules. The build produces a self-contained `explore.html` with classic JavaScript and an embedded SVG texture atlas, so opening `index.html` directly with `file://` works. Production needs only static hosting, or the local files.

`index.html` is the homepage and HTML template. Its Explore SF button navigates to `explore.html`; Classic page returns to `index.html`. Edit the source files below and rebuild the generated experience:

```sh
node sf/build.mjs
```

Green Bank's friendly banker offers deposits, withdrawals and a complimentary
coffee. Deposits earn 5% per elapsed hour, compounded continuously, including
offline time: 100 coins becomes 105 after one hour and 110.25 after two. Banked
coins are separate from spendable inventory; whole coins can be withdrawn while
fractional interest stays in the account. `banking.js` contains the shared
account rules, `bank-ui.js` the account window and offline adapter, and
`bank-models.js` the counter, coffee and rooftop billboard. Multiplayer uses
the authoritative account in `server/banking.mjs`.

The haberdasher's upper tiers are Stone of Jordan (50,000 coins), Santa Hat
(75,000), and Blue Partyhat (100,000). The partyhat preserves the previous
top-tier `crown` inventory ID so existing ownership and outfit selections carry
over. Their original geometry lives in `hat-models.js`.

The build validates navigation before writing the generated page. To run just
the complete-map navigation audit, without starting a browser or a server:

```sh
node --experimental-default-type=module sf/audit-navigation.mjs
```

This builds the actual production layout, including procedural housing and shop
walls, through `createWorldModel()` in `world.js`. It skips DOM, WebGL, texture
loading and ground rasterization; geometry is used to establish the same placed
bounds, then its vertex buffers are released. Tests do not use screenshots,
recorded map snapshots, or substitute city routes.

`navigation.js` compiles the rendered tile materials and placed collision
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

`navigation-audit.js` checks every graph edge for reciprocal connectivity and
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

For development, run:

```sh
node sf/dev.mjs
```

Open `http://127.0.0.1:8742/`. The Explore page loads source modules directly; the development server assembles the material atlas and reference page on request, so refreshing shows SVG edits without a build. Restart the server after changing the material catalog. `explore.html?built` previews the generated version over HTTP. Rebuild before testing through `file://` or publishing.

- `wayfinding.js`: shared vector symbols for homepage destinations, minimap projection and inverse click coordinates, icon spacing, destination flags and navigation regions. The minimap follows the player, including beyond the city boundaries, with the player indicator fixed at its exact center. It stays flat, rotates with the camera, and uses the same live origin for click coordinates and destination flags. Content icons stay clear of the center; only visible icons are selectable. The minimap routes directly into the world; there is no larger map. Matching glowing symbols above content buildings are clickable, with a legend in the ? guide.
- `world.js`: scene state, street and parcel planning, navigation, rendering, maps and controls. Zoom, vehicle actions, Say and Help share a compact bottom-right card; flight and climbing keep their relevant action beside Say and Help. S or Say displays a short-lived “yo” above the moving player, including while cycling, climbing or flying. Click feedback uses a shrinking yellow X for accepted actions and a red X for rejected ones; NPC selection adds five pixels around projected geometry while respecting occlusion.
- `geography.js`: 96 × 96 world dimensions, shared park boundaries, smoother named hills and valleys, Marin ridges and small building pads. Elevations are a stylized geographic model rather than surveyed data.
- `transamerica.js`: the original Transamerica Pyramid mesh: individually recessed window bays, pale cladding, an exposed braced lobby, closed upper service wings and a separate metal lattice spire. It fits the existing two-tile parcel and joins the static scene batch. Architectural references: [official tower history](https://transamericapyramid.com/transamerica-pyramid) and [Foster + Partners restoration notes](https://www.fosterandpartners.com/news/the-column-transamerica-pyramid-center).
- `downtown.js`: shared downtown coordinates, the Market/Ferry alignment, Salesforce south of Market, a connected First Street bridge ramp and higher-detail waterfront landmarks. Runtime diagnostics reject broken connections.
- `environment.js`: one sea surface with shared shallow-water depths, coastal bluffs and Marin landscape details. Deep-water spans retain neighboring edge vertices to prevent cracks; offshore pieces meet the static sea without coplanar overlap and follow the player without a sailing limit. Sea reflections, ripples and surf use the existing procedural shader and rendering pass.
- `airship.js`: the private jet terminal south of the city, parked jet models, cached airship mesh and rental controller. A walks along a connected southern approach to the rental stand; choose Rent airship to ascend above the highest structure. Ground/minimap clicks set flight destinations, and A returns to the same mooring before descending. The camera and minimap remain centered throughout; a small envelope cutaway keeps the centered rider visible; arrows rotate/tilt the camera. Terminal routes avoid parked jets and connect back into city navigation.
- `shipping.js`: two cached tanker models on one continuous bay channel loop, sampled by distance for steady movement, opposite phases and a closed seam. Hull extents are checked against the sailing coastline during browser verification.
- `soma-pyramid.js`: detailed asymmetric glass spire on the existing one-tile SoMa parcel, with separate glazing bays, floor bands, metal mullions, structural diagonals, an entrance canopy and a small crown.
- `restaurants.js`: Cotogna near Coit Tower and a signed Rich Table house on Oak Street in Hayes Valley. Their private parcels are reserved before surrounding buildings; patio furniture preserves the paving beneath it. Rich Table has a clear aisle and two seated diners sharing a meal, with a distance-culled eating gesture on the existing character rig. Signs retain their requested lettering and use the existing sign atlas. Reference identities: [Cotogna](https://www.cotognasf.com/) and [Rich Table](https://www.richtablesf.com/location/rich-table/).
- `life.js`: checked pavement routes for pedestrians and cyclists, ferries, tangent-facing gull flight and the streetcar model. Gulls fly wider continuous loops with wingbeats, or glide gently under reduced motion; distant actors are culled before mesh construction.
- `characters.js`: original indexed character meshes, 16 joint groups, two-weight skinning, cached clothing/hair variants and palette recoloring. Walking/running phases follow distance traveled; foot targets and two-bone IK maintain contacts on terrain. Idle, seated, cycling, windsurfing and ladder-climbing poses share the rig, with upper-body talk, reach and attack gestures. Transformed vertices join the existing dynamic batch without another rendering pass.
- `windsurfing.js`: the Crissy Field launch, unrestricted open-water sailing, board, sail and rider meshes. Exact coastline intersections and a cached visibility graph route around SF, Marin and Yerba Buena Island. A camera-centered sea surface follows the rider beyond the city map. F launches or returns to shore.
- `encounters.js`: constant-speed police pursuit, capture, and the barred Carceral Urbanist Facility in the Marin Headlands. Talking is peaceful; attacking or stealing starts pursuit. Officers continue through menus and follow the player onto the bay. Detention permits walking inside the cell, with routes around the bunk and no passage through the bars. Camera, zoom and help remain available; travel and interactions outside the cell remain disabled. The Classic page switch remains available.
- `models.js`: building, landmark, furniture, character and bicycle mesh factories. The world supplies placement and GPU services through `createModels`. Trees and park benches retain their underlying surface textures and terrain; their collision footprints do not paint building foundations or flatten a square into the ground.
- `housing.js`: curb-height entrances, fitted hillside plots, four roof profiles, façades, garden stairs, balconies and animated private funiculars. Townhomes keep their street orientation and a maximum of two main storeys; downhill sides can expose a walk-out basement.
- `sutro.js`: shared ridge-site coordinates, ladder radii and the original 3D Sutro Tower mesh, including its three legs, grated upper platform, antenna masts and guy wires. Click or right-click the tower to choose Climb Sutro Tower, or press E nearby. The reversible traversal follows the visible ladder, keeps the character centered as the camera rises, and returns to the same navigable trail point. Climb down or E descends; it also works partway up. The climbing rig follows vertical distance, keeping planted hands and feet on their rungs. Travel and vehicle actions are unavailable until back on the ground; camera and zoom controls remain available.
- `lighting.js`: detailed curbside lamps and one depth-tested additive pass for warm halos and terrain-following light pools. Salesforce Tower’s crown uses a small procedural metaball shader for subtle, slowly merging pale-blue light behind the top-floor glazing; it shares the main time uniform and freezes with reduced motion. Emissive glass and metal use reserved GPU style values; the glow buffers rebuild after WebGL context restoration.
- `geometry.js`: mesh primitives, transforms, picking math and the shared camera-facing cutaway mask.
- `tiles.js`: configurable surface types, polygon partitioning, connectivity checks and tile regressions. Water-edge intervals and heights are checked alongside road and curb connections; an aligned land/water transition requires a shoreline authored on both neighbors.
- `water-tiles.js`: shared, precomputed land/ocean/lake partitions. Boundary cells split the two terrain triangles against the actual coastline and lake outlines, preserving concave coves and narrow inlets. Rendering uses these same typed fragments; waterfront footprints preserve water beneath piers, and connected Lake Merced lobes share one level.
- `material-catalog.mjs`: the shared list of material names, stable GPU slots, source filenames, labels and intended uses, plus atlas dimensions. `MATERIAL_IDS` is derived from this catalog.
- `materials.js`: texture loading, context restoration, stable room appearances and the separate lettering atlas. Residential glazing uses a dedicated ambient shader style with restrained warm light in roughly one fifth of rooms; it does not blend the atlas’s pane pattern into the glass. Bay and shop windows sit clear of their backing panels to avoid depth fighting. The glass SVG provides faint reflection detail for glazed towers.
- `../textures/materials/*.svg`: the editable material sources. Each standalone 256 × 256 SVG has a title, usage description, and named background/detail groups. For example, edit `grass.svg` for grass, or `roof-tile.svg` for clay roof tiles.
- `../textures/materials/preview.html`: generated visual reference with swatches, names, slot numbers, intended uses and links to each source. Open it directly with `file://` or through the development server.
- `../textures/sf-materials.svg`: the generated 1024 × 1024 atlas. The build arranges all 16 named materials into the catalog’s 4 × 4 grid. Do not edit this generated file.
- `build-materials.mjs`: validates the catalog and SVG references, then assembles the atlas and visual reference. `build.mjs` runs this automatically.
- `build.mjs`: validates and combines the module graph and graphics into `../explore.html`. Do not edit the generated HTML directly.
- `dev.mjs`: serves the modular development view and public assets with caching disabled.

Material lookup follows the geometry, rather than SVG element IDs. A model asks for a named material, such as `m.box(..., "brick")`. `Mesh.tri` looks up `MATERIAL_IDS.brick` (slot 6), storing that selection in the mesh’s UV data. The fragment shader converts slot 6 to column 2, row 1 (zero-based), repeats that region using world coordinates, and multiplies the sampled detail by the model color. SVG IDs are local artwork references; the renderer uploads the entire sheet once and samples pixels from it. Atlas dimensions and the special glass slot come from the catalog too.

To change artwork, find the material in `textures/materials/preview.html`, edit its linked SVG, and run `node sf/build.mjs`. This rebuilds the atlas, reference and standalone experience. The production build embeds a compact copy of the atlas, preserving the single texture upload and `file://` support.

Run the dependency-free checks with Node 22 or later:

```sh
node --experimental-default-type=module --test sf/tests/*.test.mjs
```

Ordinary NPC names remain in interaction menus; overhead labels are limited to police and active speech. House paints vary saturation and brightness independently within the existing neighborhood palettes. Foundation skirts meet each body’s lower edge without overlapping wall or retaining faces; they extend into the sampled ground to close the terrain seam. The foundation regression checks competing coplanar materials on flat and sloped townhomes, urban blocks and shops at multiple rotations.

The checks also reject an outdated generated experience, material atlas or visual reference. After entering Explore SF, `SFMapDiagnostics.report` contains the full-map surface and street-frontage checks, including `water.edges` and `water.shorelineTiles`. The sea regression also checks every interior mesh edge for an exact neighbor, including transitions between fine shallows and merged deep-water spans.

Cutaway wall indices are north, south, west, east in each building's local coordinates. Rendering, shadows and picking use `cutawayWallMask`; keep these paths on the same visibility rule.

Character rendering research:

- [Lost City Model.ts](https://github.com/LostCityRS/Client-TS/blob/274/src/dash3d/Model.ts) stores indexed triangles, face colors and vertex labels; its animation path groups labeled vertices and transforms them around pivots.
- [Lost City AnimFrame.ts](https://github.com/LostCityRS/Client-TS/blob/274/src/dash3d/AnimFrame.ts) separates frame timing and joint transformations from the model.
- [Rune-Server's animation-system explanation](https://rune-server.org/threads/runescapes-animation-system.700768/) describes grouped vertices and hierarchical joint transforms.

This implementation uses that separation of geometry and animation with original geometry and poses. Foot placement, interpolation and action overlays are authored for this world. It does not load RuneScape model caches or require a server, WASM, a rendering library, or external character downloads.
