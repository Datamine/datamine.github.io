/** Cosmetic hat prices and model palettes. Keep IDs stable for saved inventories. */
export const HAT_CATALOG = Object.freeze(
  [
    { id: 'paper', name: 'Folded paper hat', price: 1, colors: ['#e6dfc7', '#aaa38e', '#5a6359'] },
    { id: 'beanie', name: 'Dockside beanie', price: 10, colors: ['#657d7c', '#9eae9b', '#c9b783'] },
    { id: 'panama', name: 'Panama', price: 50, colors: ['#dfcda0', '#526c60', '#ccb16e'] },
    { id: 'beret', name: 'Velvet beret', price: 250, colors: ['#823f57', '#b77b82', '#d3b476'] },
    { id: 'top-hat', name: 'Silk top hat', price: 1000, colors: ['#363e43', '#9b737c', '#d5b878'] },
    {
      id: 'cavalier',
      name: 'Plumed cavalier',
      price: 5000,
      colors: ['#4f5b65', '#c3a367', '#e4d8b8'],
      trimMetal: true,
    },
    {
      id: 'wizard',
      name: 'Astronomer’s hat',
      price: 10000,
      colors: ['#545179', '#c8ae65', '#c8d6df'],
      trimMetal: true,
    },
    {
      id: 'laurel',
      name: 'Golden laurel',
      price: 25000,
      colors: ['#d9ba63', '#e6d194', '#8fb9a3'],
      metal: true,
      trimMetal: true,
    },
    {
      id: 'stone-of-jordan',
      name: 'Stone of Jordan',
      price: 50000,
      colors: ['#777e82', '#b2b6b3', '#7b77a4'],
    },
    { id: 'santa', name: 'Santa Hat', price: 75000, colors: ['#ba3c49', '#eee8d6', '#84323b'] },
    // Keep the old top-tier inventory ID so owners retain their purchase.
    {
      id: 'crown',
      name: 'Blue Partyhat',
      price: 100000,
      colors: ['#3568d1', '#78a3ef', '#23478f'],
    },
    { id: 'stetson', name: 'Stetson', dropOnly: true, colors: ['#b68a57', '#614431', '#dfbd82'] },
    {
      id: 'pirate',
      name: "Pirate's hat",
      dropOnly: true,
      colors: ['#30383d', '#c6a76b', '#e7e0c9'],
    },
  ].map((h) => Object.freeze({ ...h, colors: Object.freeze(h.colors) })),
);
