import {rollWeaponDamage} from '../combat.js';
import {sameMapInstance} from '../map-instances.js';

export const PVP_DISABLE_COOLDOWN=30000;
const pvpJson=value=>{try{return JSON.parse(value||'{}');}catch{return {};}};
export function createPvpCombat({players,now=Date.now,random=Math.random,geometry,send,dirty,onDeath}){
    const combatants=new Set();
    function status(p){return {enabled:!!p.profile.pvp?.enabled,disableAt:p.profile.pvp?.disableAt||0};}
    const available=p=>p&&p.hp>0&&!p.respawnAllowed&&!p.personalJailed&&!p.grappling&&(p.instance?.kind||'world')==='world'&&!['hidden','rocket','climb','bomber','parachute'].includes(p.mode);
    function setMode(p,enabled){
        if(typeof enabled!=='boolean')return {ok:false,message:'Choose whether PvP is enabled.'};
        const current=status(p);if(enabled===current.enabled)return {ok:true,pvp:current};
        if(!enabled&&now()<current.disableAt)return {ok:false,pvp:current,message:'Wait '+Math.ceil((current.disableAt-now())/1000)+' seconds before disabling PvP.'};
        p.profile.pvp={enabled,disableAt:enabled?now()+PVP_DISABLE_COOLDOWN:0};p.revision++;if(!enabled)stop(p);dirty(p);return {ok:true,pvp:status(p),message:enabled?'PvP enabled. You can disable it in 30 seconds.':'PvP disabled.'};
    }
    function weaponFor(p){const gear=pvpJson(p.profile.privateState['sf-expeditions-v1']),quest=pvpJson(p.profile.privateState['sf-quests-v1']);return gear.railgun&&gear.equipped?'railgun':quest.theyLive?.bayonet?'bayonet':'unarmed';}
    function validate(p,target){
        if(!target||target===p||players.get(target.id)!==target)return {ok:false,message:'That player is no longer nearby.'};
        if(!sameMapInstance(p,target))return {ok:false,message:'That player is in another map instance.'};
        if(!status(p).enabled||!status(target).enabled)return {ok:false,message:'Both players must enable PvP.'};
        if(!available(p)||!available(target))return {ok:false,message:'That player cannot fight right now.'};
        if((target.pvpProtectedUntil||0)>now())return {ok:false,message:'That player has just respawned.'};
        return {ok:true};
    }
    function attack(p,id){const target=players.get(id),allowed=validate(p,target);if(!allowed.ok)return allowed;const weapon=weaponFor(p),range=weapon==='railgun'?5:1.6;
        if(Math.hypot(p.x-target.x,p.z-target.z)>range+.05||Math.abs(p.y-target.y)>2.5)return {ok:false,code:'range',message:'Move closer to attack.'};
        if(geometry.lineClear&&!geometry.lineClear({...p,base:p.y},{...target,base:target.y}))return {ok:false,message:'There is no clear line of attack.'};
        p.attack=null;p.pvpTarget=id;p.pvpNextHit=Math.max(now(),p.pvpNextHit||0);combatants.add(p);return {ok:true,target:id,weapon};
    }
    function stop(p){p.pvpTarget=null;combatants.delete(p);}
    function tick(){
        for(const p of combatants){
            const target=players.get(p.pvpTarget),allowed=validate(p,target);
            if(players.get(p.id)!==p||!allowed.ok){stop(p);continue;}
            const weapon=weaponFor(p),range=weapon==='railgun'?5:1.6;
            if(Math.hypot(p.x-target.x,p.z-target.z)>38){stop(p);continue;}
            if(Math.hypot(p.x-target.x,p.z-target.z)>range+.05||Math.abs(p.y-target.y)>2.5||now()<(p.pvpNextHit||0))continue;
            if(geometry.lineClear&&!geometry.lineClear({...p,base:p.y},{...target,base:target.y}))continue;
            p.pvpNextHit=now()+(weapon==='railgun'?800:1050);p.gesture='attack';p.gestureUntil=now()+450;
            const damage=Math.min(target.hp,rollWeaponDamage(p.level||1,weapon,random));target.hp-=damage;target.damagePending=true;
            const event={type:'pvpHit',attacker:p.id,target:target.id,damage,hp:target.hp,max:30,weapon,from:{x:p.x,y:p.y+1.14,z:p.z},to:{x:target.x,y:target.y+1,z:target.z}};
            send(p,event);send(target,event);dirty(target);
            if(target.hp===0){stop(target);stop(p);target.respawnAllowed=true;target.pvpDying=true;onDeath(target,p);}
        }
    }
    return {status,setMode,attack,stop,tick,weaponFor,combatants};
}
