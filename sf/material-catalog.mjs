/** The single map from model material names to artwork and GPU atlas slots.
 * Keep existing slots stable: meshes encode them in their vertex data.
 * Sources are standalone SVGs in textures/materials/; the atlas is generated. */
export const MATERIAL_ATLAS=Object.freeze({columns:4,rows:4,cellSize:256});

export const MATERIAL_CATALOG=Object.freeze([
    {name:'grass',slot:0,source:'grass.svg',label:'Grass',usage:'Park lawns and planted courtyards; mottled ground cover with fine blades.'},
    {name:'dirt',slot:1,source:'dirt.svg',label:'Dirt',usage:'Walking paths, dry scrub and exposed soil; pebbles and fine grain.'},
    {name:'cobble',slot:2,source:'cobble.svg',label:'Cobblestone',usage:'Plazas and building footprints; irregular paving stones and joints.'},
    {name:'asphalt',slot:3,source:'asphalt.svg',label:'Asphalt',usage:'Street surfaces; aggregate flecks and hairline wear.'},
    {name:'sidewalk',slot:4,source:'sidewalk.svg',label:'Sidewalk',usage:'Pavements and curbs; concrete slabs and expansion joints.'},
    {name:'sand',slot:5,source:'sand.svg',label:'Sand',usage:'Ocean Beach and sandy ground; light grains and soft surface variation.'},
    {name:'brick',slot:6,source:'brick.svg',label:'Brick',usage:'Masonry walls and architectural details; staggered courses with mortar.'},
    {name:'clapboard',slot:7,source:'clapboard.svg',label:'Clapboard',usage:'Painted townhome siding; horizontal timber boards.'},
    {name:'roof',slot:8,source:'roof.svg',label:'Roof',usage:'Dark roofing and flat roof surfaces; weathered roofing grain.'},
    {name:'stone',slot:9,source:'stone.svg',label:'Stone',usage:'Civic masonry, foundations and monuments; cut stone blocks.'},
    {name:'shingles',slot:10,source:'shingles.svg',label:'Shingles',usage:'Pitched residential roofs; overlapping shingle courses.'},
    {name:'stucco',slot:11,source:'stucco.svg',label:'Stucco',usage:'Plastered façades; fine, uneven mineral grain.'},
    {name:'wood',slot:12,source:'wood.svg',label:'Timber',usage:'Wooden stairs, balconies and fixtures; long timber grain.'},
    {name:'roofTile',slot:13,source:'roof-tile.svg',label:'Clay roof tiles',usage:'Tiled roofs; curved tile courses with recessed seams.'},
    {name:'glass',slot:14,source:'glass.svg',label:'Glass',usage:'Windows and glazed towers; subtle reflections and pane detail.'},
    {name:'concrete',slot:15,source:'concrete.svg',label:'Concrete',usage:'Structural pads and infrastructure; restrained mineral texture.'}
].map(material=>Object.freeze(material)));

export const MATERIAL_IDS=Object.freeze(Object.fromEntries(MATERIAL_CATALOG.map(({name,slot})=>[name,slot])));
