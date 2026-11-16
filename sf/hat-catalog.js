/** Permanent, cosmetic purchases. Prices, prestige and model palettes live in
 * one catalog shared by the shop, purse, wardrobe and articulated human rig. */
export const HAT_CATALOG=Object.freeze([
    {id:'paper',name:'Folded paper hat',price:1,prestige:'Resourceful',colors:['#e6dfc7','#aaa38e','#5a6359']},
    {id:'beanie',name:'Dockside beanie',price:10,prestige:'Respectable',colors:['#657d7c','#9eae9b','#c9b783']},
    {id:'panama',name:'Panama',price:50,prestige:'Distinguished',colors:['#dfcda0','#526c60','#ccb16e']},
    {id:'beret',name:'Velvet beret',price:250,prestige:'Cultivated',colors:['#823f57','#b77b82','#d3b476']},
    {id:'top-hat',name:'Silk top hat',price:1000,prestige:'Imposing',colors:['#363e43','#9b737c','#d5b878']},
    {id:'cavalier',name:'Plumed cavalier',price:5000,prestige:'Extravagant',colors:['#4f5b65','#c3a367','#e4d8b8'],trimMetal:true},
    {id:'wizard',name:'Astronomer’s hat',price:10000,prestige:'Arcane',colors:['#545179','#c8ae65','#c8d6df'],trimMetal:true},
    {id:'laurel',name:'Golden laurel',price:25000,prestige:'Illustrious',colors:['#d9ba63','#e6d194','#8fb9a3'],metal:true,trimMetal:true},
    {id:'crown',name:'Crown of Excess',price:100000,prestige:'Preposterous',colors:['#d5b15c','#e9d19a','#83aebd'],metal:true,trimMetal:true}
].map(h=>Object.freeze({...h,colors:Object.freeze(h.colors)})));
export const hatById=id=>HAT_CATALOG.find(h=>h.id===id)||null;
export const ownedHat=(owned,id)=>id==='none'||!!hatById(id)&&owned.includes(id);
