/** Editable gameplay items. Damage bonuses are per strength level above 1.
 * Hats retain their price/geometry catalog in hat-catalog.js. */
export const ITEM_STATS=Object.freeze({
    unarmed:{name:'Unarmed',slot:'weapon',range:1.35,interval:1.05,min:1,max:2,minPerLevel:0,maxPerLevel:.8,accuracy:.65,accuracyPerLevel:.02,accuracyCap:.9},
    bayonet:{name:'Bayonet',slot:'weapon',range:1.35,interval:1.05,min:4,max:11,minPerLevel:.4,maxPerLevel:1,accuracy:.92,accuracyPerLevel:.006,accuracyCap:.98},
    battleaxe:{name:'Battleaxe',slot:'weapon',price:50,range:1.5,interval:1.05,min:6,max:11.5,minPerLevel:.35,maxPerLevel:.85,accuracy:.935,accuracyPerLevel:.005,accuracyCap:.985},
    railgun:{name:'Railgun',slot:'weapon',range:5,interval:.8,min:8,max:12,minPerLevel:.3,maxPerLevel:.7,accuracy:.95,accuracyPerLevel:.004,accuracyCap:.99},
    'downtown-tablet':{name:'Downtown teleportation tablet',price:20,description:'A small purple tablet. Break it to return to downtown San Francisco.'},
    'tahoe-tablet':{name:'Tahoe teleportation tablet',price:20,description:'A snowy sigil in purple stone. Break it to appear beside the Tahoe gondola.'},
    'ice-top':{name:'Ice top',slot:'top',defense:2,color:'#92d9ed',trim:'#e1faff',description:'A crystalline cuirass, cold to the touch and surprisingly flattering.'},
    'ice-pants':{name:'Ice pants',slot:'legs',defense:2,color:'#78bde5',trim:'#d1f4ff',description:'Frosted greaves. Every step sounds faintly like a glacier thinking.'},
    sandwich:{name:'Sandwich',healing:18,pickupPrice:3,deliveryPrice:4,inNOutPrice:2,description:'A sandwich. Store it in your food bag and eat it to recover hitpoints.'},
    peptides:{name:'Peptides',description:'A tiny vial with a very large social network. Ray accepts these at the Freemasons’ Guild.'},
    coins:{name:'Coins',description:'Loose coins, awaiting a less theoretical owner.'},
    raptor:{name:'Velociraptor remains',description:'The emergency recovery protocol is now considerably less mobile.'},
    kraken:{name:'Kraken spoils',coins:100,description:'The spoils of an extremely unwise maritime expedition.'}
});
export const EQUIPMENT_IDS=Object.freeze(['battleaxe','ice-top','ice-pants']);
export function itemById(id){return Object.hasOwn(ITEM_STATS,id)?ITEM_STATS[id]:null;}
export function equipmentOwned(purse,id){return !!purse?.ownedEquipment?.includes(id);}
export function selectedWeapon(preference='auto',{bayonet=false,railgun=false,battleaxe=false}={}){const owned={unarmed:true,bayonet,railgun,battleaxe};return preference!=='auto'?(owned[preference]?preference:'unarmed'):railgun?'railgun':battleaxe?'battleaxe':bayonet?'bayonet':'unarmed';}
export function equipmentDefense(look={}){return (look.iceTop?ITEM_STATS['ice-top'].defense:0)+(look.icePants?ITEM_STATS['ice-pants'].defense:0);}
export function itemLoot(id,amount=1){const item=itemById(id);return {lootKind:EQUIPMENT_IDS.includes(id)?'equipment':id,...(EQUIPMENT_IDS.includes(id)?{itemId:id}:{}),amount,label:id==='coins'?amount+' coins':item?.name||id,description:item?.description||'A well-made piece of equipment.'};}
