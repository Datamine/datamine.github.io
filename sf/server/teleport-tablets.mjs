import {TABLET_PLACES,TABLET_TELEPORT_SECONDS,tabletTeleportPose} from '../teleport-tablets.js';
import {ITEM_STATS} from '../item-stats.js';

export function createServerTablets({geometry,players,send,dirty,shared,pvp,now=Date.now}){
    const travellers=new Set();
    const available=p=>p.hp>0&&!p.respawnAllowed&&!p.personalJailed&&!p.bomberActive&&!p.airship&&!p.grappling&&!p.tabletTeleport&&(p.instance?.kind||'world')==='world'&&['walk','dance','roll','train'].includes(p.mode);
    function command(p,action,args){
        const id=args.destination;if(!TABLET_PLACES.includes(id))return {ok:false,message:'That tablet is unavailable.'};
        if(!available(p))return {ok:false,message:'Stand on solid ground, outside custody, before using the wizard’s tablets.'};
        const meta=p.inventory.meta;
        if(action==='buyTablet'){
            const wizard=geometry.merchants.find(n=>n.id==='tablet-wizard');if(!wizard||Math.hypot(p.x-wizard.x,p.z-wizard.z)>2.6||Math.abs(p.y-wizard.base)>2.5)return {ok:false,message:'Visit Orin the Wizard in his Nob Hill house.'};
            const purse=p.inventory.economy.state,price=ITEM_STATS[id+'-tablet'].price;if(purse.coins<price)return {ok:false,message:'A tablet costs '+price+' coins.'};if(!Number.isSafeInteger(meta.tablets[id]+1))return {ok:false,message:'Your tablet pouch is full.'};
            purse.coins-=price;meta.tablets[id]++;p.inventory.save();dirty(p);return {ok:true,inventory:p.inventory.snapshot(),message:'You buy a '+ITEM_STATS[id+'-tablet'].name.toLowerCase()+' for '+price+' coins.'};
        }
        const target=geometry.tabletDestinations?.[id];if(!target||!geometry.landClearAt(target.x-.5,target.z-.5))return {ok:false,message:'That destination is temporarily unavailable.'};
        if(!meta.tablets[id])return {ok:false,message:'You do not have that tablet. Visit Orin the Wizard.'};
        meta.tablets[id]--;p.inventory.save();shared.leave(p);pvp.stop(p);p.attack=null;
        p.tabletTeleport={from:{x:p.x,y:p.y,z:p.z},to:{...target},startedAt:now(),destination:id};p.mode='teleport';p.moving=false;p.motion=0;travellers.add(p);dirty(p);send(p,{type:'tabletTeleport',flight:p.tabletTeleport});
        return {ok:true,inventory:p.inventory.snapshot(),message:'You break a '+ITEM_STATS[id+'-tablet'].name.toLowerCase()+'.'};
    }
    function tick(){for(const p of travellers){if(players.get(p.id)!==p||!p.tabletTeleport){travellers.delete(p);continue;}const flight=p.tabletTeleport,seconds=(now()-flight.startedAt)/1000;Object.assign(p,tabletTeleportPose(flight,seconds).position);dirty(p);if(seconds>=TABLET_TELEPORT_SECONDS){p.tabletTeleport=null;p.mode='walk';p.lastPoseAt=now();travellers.delete(p);send(p,{type:'tabletArrived',position:{...flight.to},message:'You arrive '+(flight.to.label||'at your destination')+'.'});}}}
    return {command,tick};
}
