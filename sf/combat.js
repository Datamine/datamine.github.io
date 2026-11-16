export const MAX_HITPOINTS=30;
export const ALIEN_HITPOINTS=36;
export const SANDWICH_HEALING=18;

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
export function createAlienBattle({health,level=()=>1,bayonet=false,hp=ALIEN_HITPOINTS}){
    const state={hp,max:ALIEN_HITPOINTS,elapsed:0,nextPlayer:.25,nextAlien:.85,ended:false};
    return {state,update(dt){
        const events=[];if(state.ended||!Number.isFinite(dt)||dt<=0)return events;
        state.elapsed+=dt;
        while(!state.ended&&Math.min(state.nextPlayer,state.nextAlien)<=state.elapsed){
            const stats=combatStats(level(),bayonet);
            if(state.nextPlayer<=state.nextAlien){
                const damage=Math.min(state.hp,stats.damage);state.hp-=damage;state.nextPlayer+=1.05;events.push({type:'player-hit',damage,hp:state.hp});
                if(state.hp===0){state.ended=true;events.push({type:'victory'});}
            }else{
                const damage=health.damage(stats.alienDamage);state.nextAlien+=1.25;events.push({type:'alien-hit',damage,hp:health.state.hp});
                if(health.state.hp===0){state.ended=true;events.push({type:'death'});}
            }
        }
        return events;
    }};
}
