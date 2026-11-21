// Normal billboard ads. Replace a file, or change its filename below to use
// your own SVG or PNG in this directory. Keep the IDs: they select map panels.
// `color` is the background behind transparent pixels and while loading.
// Rebuild the standalone game afterwards: node sf/build.mjs
export const BILLBOARD_ADS = Object.freeze(
  [
    // Times Square
    { id: 'ts-cola', file: 'goose-corp.svg', color: '#f3b92d' },
    { id: 'ts-broadway', file: 'recursive-picnic.svg', color: '#ed8268' },
    { id: 'ts-market', file: 'anser-analytics.svg', color: '#193e7b' },
    { id: 'ts-think', file: 'velvet-gradient.svg', color: '#302247' },
    { id: 'ts-moonshot', file: 'dead-reckoning.svg', color: '#122f3d' },
    { id: 'ts-night', file: 'tomorrow-probably.svg', color: '#f1df57' },
    // Airport roads and fields
    { id: 'ai-openai', file: 'soft-launch.svg', color: '#ece5d6' },
    { id: 'ai-anthropic', file: 'pondwater-research.svg', color: '#174f50' },
    { id: 'ai-xai', file: 'borrowed-neuron.svg', color: '#d4eaeb' },
    // Pacifica beach and Green Bank rooftop
    { id: 'beach-getaway', file: 'local-minimum.svg', color: '#b9dcd0' },
    { id: 'green-bank-roof', file: 'green.svg', color: '#4be61c' },
  ].map((ad) => Object.freeze(ad)),
);
