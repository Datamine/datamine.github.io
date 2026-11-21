// Original architectural artwork, shared by both institutes. These are mural
// panels in the existing sign atlas, not extra textures or per-frame drawings.
const researchAssetURL = (name: string) =>
  new URL('./textures/research/' + name, import.meta.url).href;
export const RESEARCH_ART = Object.freeze(
  [
    { id: 'research-mosaic', file: 'celestial-mosaic.svg', color: '#739496' },
    { id: 'research-etching', file: 'copper-diagrams.svg', color: '#839a8c' },
    { id: 'research-stars', file: 'star-chart.svg', color: '#424f75' },
  ].map((a) => Object.freeze({ ...a, src: researchAssetURL(a.file) })),
);
