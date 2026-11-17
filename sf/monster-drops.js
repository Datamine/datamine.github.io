import {itemLoot} from './item-stats.js';
/** Each entry is an independent roll. `oneIn` is the denominator; a choice
 * splits that ONE successful roll equally, rather than rolling each item. */
export const MONSTER_DROPS=Object.freeze({
    cow:[{item:'sandwich',oneIn:1}],
    raptor:[{item:'raptor',oneIn:1}],
    kraken:[{item:'kraken',oneIn:1}],
    bear:[{item:'peptides',oneIn:20}],
    'snow-giant':[{choose:['ice-top','ice-pants'],oneIn:50}],
    'ice-giant':[{choose:['ice-top','ice-pants'],oneIn:50}]
});
export const MONSTER_STATS=Object.freeze({
    cow:{name:'Cow',level:2,hp:20,damage:0,respawn:10},
    raptor:{name:'Velociraptor',level:8,hp:50,damage:6,interval:1.5,respawn:45},
    kraken:{name:'Kraken',level:20,hp:300,damage:10,interval:4},
    bear:{name:'Friendly bear',level:10,hp:20,damage:7,interval:1.7,respawn:25,speed:1.8,leash:7,friendly:true,roamRadius:3,roamSpeed:.55},
    'snow-giant':{name:'Snow giant',level:18,hp:140,damage:12,interval:1.8,respawn:35,speed:2.1,leash:12},
    'ice-giant':{name:'Ice giant',level:20,hp:180,damage:14,interval:1.9,respawn:40,speed:2,leash:12}
});
const dropRandom=random=>Math.max(0,Math.min(1-Number.EPSILON,Number(random())||0));
export function rollMonsterDrops(kind,random=Math.random){
    const drops=[];for(const rule of MONSTER_DROPS[kind]||[]){if(rule.oneIn>1&&dropRandom(random)>=1/rule.oneIn)continue;
        const id=rule.item||rule.choose[Math.floor(dropRandom(random)*rule.choose.length)];drops.push(itemLoot(id,rule.amount||1));
    }return drops;
}
