export const MAX_HITPOINTS=30;
export const ALIEN_HITPOINTS=36;
export const SANDWICH_HEALING=18;

const combatLevel=value=>Math.max(1,Math.min(10,Math.floor(value)||1));
const combatRandom=random=>Math.max(0,Math.min(1-Number.EPSILON,Number(random())||0));
export function weaponDamageRange(level=1,weapon='unarmed'){
    const bonus=combatLevel(level)-1;
    if(weapon==='railgun')return {min:8+Math.floor(bonus*.3),max:12+Math.floor(bonus*.7),accuracy:Math.min(.99,.95+bonus*.004)};
    if(weapon==='bayonet')return {min:4+Math.floor(bonus*.4),max:11+bonus,accuracy:Math.min(.98,.92+bonus*.006)};
    return {min:1,max:2+Math.floor(bonus*.8),accuracy:Math.min(.9,.65+bonus*.02)};
}
export function rollWeaponDamage(level,weapon,random=Math.random){
    const range=weaponDamageRange(level,weapon);
    return combatRandom(random)>=range.accuracy?0:range.min+Math.floor(combatRandom(random)*(range.max-range.min+1));
}
export function rollEnemyDamage(base,level=1,random=Math.random){
    const max=Math.max(2,base-Math.floor((combatLevel(level)-1)/3)),min=Math.ceil(max*.5);
    return combatRandom(random)>=.9?0:min+Math.floor(combatRandom(random)*(max-min+1));
}

/** Combat runs on elapsed simulation time, independently of rendering speed. */
export function combatStats(level=1,bayonet=false){
    level=Math.max(1,Math.min(10,Math.floor(level)||1));
    return {damage:2+Math.floor((level-1)*.8)+(bayonet?7:0),alienDamage:Math.max(3,7-Math.floor((level-1)/3))};
}
export function createHitpoints(saved={},onChange=()=>{}){
    const state={hp:Number.isFinite(saved.hp)?Math.max(1,Math.min(MAX_HITPOINTS,Math.floor(saved.hp))):MAX_HITPOINTS,max:MAX_HITPOINTS};
    const save=()=>onChange({...state});
    return {state,damage(amount){const hit=Math.min(state.hp,Math.max(0,Math.floor(amount)));state.hp-=hit;save();return hit;},heal(amount=SANDWICH_HEALING){const healed=Math.min(state.max-state.hp,Math.max(0,Math.floor(amount)));state.hp+=healed;save();return healed;},restore(){state.hp=state.max;save();}};
}
export function createAlienBattle({health,level=()=>1,bayonet=false,hp=ALIEN_HITPOINTS,random=Math.random}){
    const state={hp,max:ALIEN_HITPOINTS,elapsed:0,nextPlayer:.25,nextAlien:.85,ended:false};
    return {state,update(dt){
        const events=[];if(state.ended||!Number.isFinite(dt)||dt<=0)return events;
        state.elapsed+=dt;
        while(!state.ended&&Math.min(state.nextPlayer,state.nextAlien)<=state.elapsed){
            if(state.nextPlayer<=state.nextAlien){
                const damage=bayonet?Math.min(state.hp,rollWeaponDamage(level(),'bayonet',random)):0;state.hp-=damage;state.nextPlayer+=1.05;events.push({type:'player-hit',damage,hp:state.hp});
                if(state.hp===0){state.ended=true;events.push({type:'victory'});}
            }else{
                const damage=health.damage(rollEnemyDamage(7,level(),random));state.nextAlien+=1.25;events.push({type:'alien-hit',damage,hp:health.state.hp});
                if(health.state.hp===0){state.ended=true;events.push({type:'death'});}
            }
        }
        return events;
    }};
}
