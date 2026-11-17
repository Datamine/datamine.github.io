import {ITEM_STATS} from './item-stats.js';
export const TABLET_PLACES=Object.freeze(['downtown','tahoe']),TABLET_TELEPORT_SECONDS=2.8;
const teleportEase=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function tabletCounts(saved={}){return Object.fromEntries(TABLET_PLACES.map(id=>[id,Number.isSafeInteger(saved[id])&&saved[id]>=0?saved[id]:0]));}
export function tabletTeleportPose(flight,seconds){
    const t=Math.max(0,Math.min(TABLET_TELEPORT_SECONDS,seconds)),incoming=t>=1.4,point=incoming?flight.to:flight.from,lift=incoming?3.3*(1-teleportEase((t-1.4)/1.4)):3.3*teleportEase((t-.55)/.85);
    return {position:{x:point.x,y:point.y+lift,z:point.z},base:point.y,arms:teleportEase(t/.55),progress:t/TABLET_TELEPORT_SECONDS,incoming};
}
export function createTeleportTablets({client=null,economy,storage=null,destinations,getPlayer,canUse=()=>true,onPurse=()=>{},onStart=()=>{},onArrive=()=>{},onMessage=()=>{},now=Date.now}={}){
    let saved={};try{saved=JSON.parse(storage?.getItem('sf-tablets-v1')||'{}')||{};}catch{}
    const counts=tabletCounts(saved),state={active:false,flight:null,pose:null};
    const save=()=>{try{storage?.setItem('sf-tablets-v1',JSON.stringify(counts));}catch{}};
    const inventory=()=>client?tabletCounts(client.state.inventory?.tablets):{...counts};
    function start(flight){state.active=true;state.flight=flight;state.pose=tabletTeleportPose(flight,Math.max(0,(now()+(client?.state.serverOffset||0)-flight.startedAt)/1000));onStart();}
    function finish(position){state.active=false;state.pose=null;state.flight=null;onArrive(position);}
    if(client)client.subscribe(message=>{if(message.type==='tabletTeleport')start(message.flight);if(message.type==='tabletArrived'){finish(message.position);onMessage(message.message,'Teleport');}if((message.type==='welcome'||message.type==='position'&&['teleport','jail','respawn'].includes(message.reason))&&state.active){state.active=false;state.pose=null;state.flight=null;}});
    async function buy(id){
        if(!TABLET_PLACES.includes(id))return {ok:false,message:'That tablet is unavailable.'};
        if(client)return client.command('buyTablet',{destination:id});
        const price=ITEM_STATS[id+'-tablet'].price;if(economy.state.coins<price)return {ok:false,message:'A tablet costs '+price+' coins.'};if(!Number.isSafeInteger(counts[id]+1))return {ok:false,message:'Your tablet pouch is full.'};
        economy.state.coins-=price;counts[id]++;onPurse(economy.state);save();return {ok:true,message:'One '+ITEM_STATS[id+'-tablet'].name+', yours for '+price+' coins. Break it from your inventory whenever you need a change of scenery.'};
    }
    async function use(id){
        if(!TABLET_PLACES.includes(id)||!inventory()[id])return {ok:false,message:'Buy a tablet from the wizard first.'};
        if(state.active||!canUse())return {ok:false,message:'Stand on solid ground, outside custody, before breaking a tablet.'};
        if(client)return client.command('useTablet',{destination:id});
        counts[id]--;save();const flight={from:getPlayer(),to:{...destinations[id]},startedAt:now(),destination:id};start(flight);return {ok:true,message:'You break a '+ITEM_STATS[id+'-tablet'].name.toLowerCase()+'.'};
    }
    function update(){if(!state.active)return;const seconds=Math.max(0,(now()+(client?.state.serverOffset||0)-state.flight.startedAt)/1000);state.pose=tabletTeleportPose(state.flight,seconds);if(seconds>=TABLET_TELEPORT_SECONDS&&!client){const to=state.flight.to;finish(to);onMessage('You arrive '+(to.label||'at your destination')+'.','Teleport');}}
    return {state,inventory,buy,use,update,start};
}
