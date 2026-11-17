import {ITEM_STATS} from './item-stats.js';
import {MONSTER_STATS,rollMonsterDrops} from './monster-drops.js';
import {rollWeaponDamage} from './combat.js';

export function wildernessSpawns({marin,tahoe}){
    return [{id:'marin-bear',combatKind:'bear',x:marin.x+.5,z:marin.y+.5},
        ...[[-5,-2,'snow-giant'],[-8,1,'ice-giant'],[-3,-6,'snow-giant'],[1,-7,'ice-giant']].map(([dx,dz,combatKind],i)=>({id:'tahoe-giant-'+i,combatKind,x:tahoe.x+dx,z:tahoe.z+dz}))];
}
/** Shared simulation, also used unchanged in single player. No DOM, meshes,
 * sockets or inventory ownership live in this controller. */
export function createWilderness({spawns=[],ground=()=>0,canTravel=()=>true,route=(a,b)=>canTravel(a,b)?[b]:null,random=Math.random,onHit=()=>{},onDrop=()=>{},onDamage=()=>{}}={}){
    let clock=0;const actors=spawns.map((p,i)=>{const s=MONSTER_STATS[p.combatKind];return {...p,wilderness:true,label:s.name,level:s.level,height:s.friendly?1.6:3.5,hp:s.hp,max:s.hp,base:ground(p.x,p.z),home:{x:p.x,z:p.z},angle:i,phase:0,motion:0,respawn:0,enemy:null,path:[],repath:0,attackAt:0,affection:0,description:p.combatKind==='bear'?'A nice, friendly bear. Excellent ears, impeccable manners, and a suspicious interest in molecular wellness.':p.combatKind==='snow-giant'?'An ancient snowdrift with fists. Its scarf is a small avalanche.':'A glacier has stood up, and it is not pleased about your carbon footprint.'};});
    function strike(id,attacker){
        const actor=actors.find(n=>n.id===id),weapon=ITEM_STATS[attacker.weapon]||ITEM_STATS.unarmed;
        if(!actor?.hp)return {ok:false,message:'That creature is resting. Come back after it respawns.'};
        if(Math.hypot(actor.x-attacker.x,actor.z-attacker.z)>weapon.range+.01)return {ok:false,message:'Move closer to the '+actor.label.toLowerCase()+'.'};
        const damage=Math.min(actor.hp,rollWeaponDamage(attacker.level,attacker.weapon,random));actor.hp-=damage;actor.enemy=attacker.id;actor.affection=0;actor.repath=0;actor.attackAt=Math.max(actor.attackAt,clock+.6);
        onHit({actor,attacker,damage});if(!actor.hp){actor.enemy=null;actor.path=[];actor.motion=0;actor.respawn=MONSTER_STATS[actor.combatKind].respawn;for(const drop of rollMonsterDrops(actor.combatKind,random))onDrop({...drop,x:actor.x,z:actor.z,base:actor.base+.025},attacker);}
        return {ok:true,damage,hp:actor.hp,max:actor.max};
    }
    function pet(id,person){const actor=actors.find(n=>n.id===id);if(actor?.combatKind!=='bear'||!actor.hp||Math.hypot(actor.x-person.x,actor.z-person.z)>1.9)return {ok:false,message:'Walk closer to the friendly bear.'};actor.enemy=null;actor.path=[];actor.affection=3;return {ok:true,message:'You pet the bear. It leans into your hand and makes a very contented huff. What a nice bear.'};}
    function update(dt,people=[]){
        if(!Number.isFinite(dt)||dt<=0)return;clock+=dt;const byId=new Map(people.map(p=>[p.id,p]));
        for(const [i,actor] of actors.entries()){
            const stats=MONSTER_STATS[actor.combatKind];actor.affection=Math.max(0,actor.affection-dt);
            if(!actor.hp){actor.respawn=Math.max(0,actor.respawn-dt);if(!actor.respawn)Object.assign(actor,{hp:actor.max,x:actor.home.x,z:actor.home.z,base:ground(actor.home.x,actor.home.z),enemy:null,path:[]});continue;}
            let enemy=byId.get(actor.enemy);if(enemy&&Math.hypot(enemy.x-actor.home.x,enemy.z-actor.home.z)>stats.leash){actor.enemy=null;enemy=null;}
            if(!enemy)actor.enemy=null;
            if(actor.affection&&!enemy){actor.path=[];actor.motion=0;continue;}
            actor.repath-=dt;
            if(actor.repath<=0){actor.repath=enemy?.6:1.5;const goal=enemy?{x:enemy.x,z:enemy.z}:Math.hypot(actor.x-actor.home.x,actor.z-actor.home.z)>(stats.roamRadius||1)+.25?actor.home:{x:actor.home.x+Math.sin(clock*.17+i)*(stats.roamRadius||.24),z:actor.home.z+Math.cos(clock*.2+i)*(stats.roamRadius?stats.roamRadius*.7:.65)};actor.path=route(actor,goal)||[];}
            const distance=enemy?Math.hypot(enemy.x-actor.x,enemy.z-actor.z):Infinity;let budget=enemy&&distance<1.35?0:dt*(enemy?stats.speed:stats.roamSpeed||.45);actor.motion=0;
            while(budget>0&&actor.path.length){const next=actor.path[0],dx=next.x-actor.x,dz=next.z-actor.z,d=Math.hypot(dx,dz),step=Math.min(budget,d);if(!canTravel(actor,next)){actor.path=[];break;}if(d>1e-8){actor.x+=dx/d*step;actor.z+=dz/d*step;actor.angle=Math.atan2(dz,dx);actor.motion=1;actor.phase+=step*4;}budget-=step;if(d<=step+1e-8)actor.path.shift();}
            actor.base=ground(actor.x,actor.z);
            if(enemy&&Math.hypot(enemy.x-actor.x,enemy.z-actor.z)<1.6&&clock>=actor.attackAt&&canTravel(actor,enemy)){actor.attackAt=clock+stats.interval;onDamage(enemy,stats.damage,actor);}
        }
    }
    function sync(records=[]){for(const p of records){const actor=actors.find(n=>n.id===p.id);if(actor)Object.assign(actor,p,{path:[]});}}
    return {actors,strike,pet,update,sync,snapshot:()=>actors.map(({path,home,...actor})=>({...actor,home:{...home}}))};
}
