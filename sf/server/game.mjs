import {createHash} from 'node:crypto';
import {normalizeUsername,renameDecision} from './usernames.mjs';
import {createSharedWorld} from './shared-world.mjs';
import {SpatialIndex} from './spatial-index.mjs';
import {MP_PROTOCOL,MP_VIEW_RADIUS,MP_MAX_NEIGHBORS,encodePlayerFrame,validNetworkPose,sanitizePrivateState} from '../multiplayer-protocol.js';
import {createDetentionSite} from '../encounters.js';
import {createInventoryAccount,INVENTORY_KEYS} from './inventory.mjs';
import {createPvpCombat} from './pvp.mjs';
import {strengthStatus} from '../strength.js';
import {guildStatusFor,guildAction,guildMayEnter} from './guild.mjs';
import {createServerInstances} from './instances.mjs';
import {PUBLIC_INSTANCE,sameMapInstance} from '../map-instances.js';
import {bankSnapshotFor,bankAction} from './banking.mjs';

const clone=value=>structuredClone(value);
const parse=(value,fallback={})=>{try{return JSON.parse(value);}catch{return fallback;}};
function appearance(value={}){const result={gender:value.gender==='woman'?'woman':'man',cape:value.cape===true,sunglasses:value.sunglasses===true,hat:typeof value.hat==='string'?value.hat.slice(0,48):'none'};for(const key of ['skin','shirt','pants','hair','shoes'])if(/^#[0-9a-f]{6}$/i.test(value[key]))result[key]=value[key];return result;}
const speedLimits={walk:4.6,bike:8.2,ferrari:100,motorcycle:14,skateboard:7.6,surf:12,ski:100,climb:8,rocket:3000,hidden:3000,airship:10,roll:6.3,dance:0,train:0};

/** One authoritative owner for the common world. HTTP/WebSocket and storage
 * adapters are deliberately outside the fixed-step simulation. */
export async function createGame({geometry,store,now=Date.now,random=Math.random,maxPlayers=2000,allowDebug=false}={}){
    const players=new Map(),profiles=new Map(),identities=new Map(),names=new Map(),nameOwners=new Map(),authenticating=new Map(),dirtyProfiles=new Set(),revisions=new Map(),persistedRevisions=new Map(),cleanupTasks=new Set(),playerIndex=new SpatialIndex(),worldNPCIndex=new SpatialIndex(),lootIndex=new SpatialIndex(8);
    for(const row of await store.names()){names.set(row.canonical,row.owner);nameOwners.set(row.owner,row);}
    const saved=await store.get('world')||{},jail=createDetentionSite(1.5);let serial=saved.serial||0,tickNumber=0,flushing=null,clockMs=now(),nextEntitySnapshot=0,closing=false;
    const metrics={connected:0,frames:0,bytes:0,corrections:0,rejected:0,slowClients:0,tickMs:0,broadcastMs:0};
    const send=(p,message)=>{if(!p.transport.open)return;const data=typeof message==='string'||message instanceof ArrayBuffer?message:JSON.stringify(message);p.transport.send(data);metrics.bytes+=typeof data==='string'?Buffer.byteLength(data):data.byteLength;};
    const dirty=p=>{if(p){dirtyProfiles.add(p.owner);revisions.set(p.owner,(revisions.get(p.owner)||0)+1);}};
    const shared=createSharedWorld({geometry,players,send,dirty,random,now,saved:saved.shared});
    const pvp=createPvpCombat({players,now,random,geometry,send,dirty,onDeath:pvpDeath});
    const instances=createServerInstances({geometry,shared,pvp,players,send,dirty,now});
    function mergePrivate(p,input){
        const incoming=sanitizePrivateState(input);for(const [key,value] of Object.entries(incoming))if(!INVENTORY_KEYS.has(key))p.profile.privateState[key]=value;
        const level=strengthStatus(parse(p.profile.privateState['sf-strength-v1']).xp).level;if(level!==p.level){p.level=level;p.revision++;}
        const look=appearance(parse(p.profile.privateState['sf-character-v1']||'{}'));if(!p.inventory.economy.state.ownedHats.includes(look.hat))look.hat='none';
        if(JSON.stringify(look)!==JSON.stringify(p.appearance)){p.appearance=look;p.revision++;}dirty(p);
    }
    function pvpDeath(victim,killer){
        const dropped=victim.inventory.deathDrops(),ids=shared.dropInventory(victim,killer,dropped);victim.profile.deathPending=true;victim.appearance.hat='none';victim.revision++;shared.leave(victim);dirty(victim);
        const inventory={...victim.inventory.snapshot(),hp:0};
        const task=durable(victim).then(()=>{send(victim,{type:'inventory',inventory});send(victim,{type:'caught',source:'pvp'});send(killer,{type:'pvpKill',target:victim.id,name:victim.name,drops:ids});}).catch(error=>console.error('PvP death persistence:',error.message));
        victim.deathTask=task;cleanupTasks.add(task);task.finally(()=>cleanupTasks.delete(task));
    }
    function privatePosition(p){return {x:p.x,z:p.z,y:p.y,angle:p.angle,hp:p.hp};}
    function publicPlayer(p){return {id:p.id,name:p.name,appearance:p.appearance,revision:p.revision,level:p.level,pvp:pvp.status(p).enabled};}
    function profileForSave(p){const profile=profiles.get(p.owner);return {...profile,position:instances.savePosition(p)};}
    async function flush(){
        if(flushing){await flushing;return;}
        const owners=[...dirtyProfiles],savedRevisions=new Map(owners.map(owner=>[owner,revisions.get(owner)||0]));for(const owner of owners)dirtyProfiles.delete(owner);
        const entries=[['world',{serial,shared:shared.persist()}]];
        for(const owner of owners){const p=identities.get(owner),profile=p?profileForSave(p):profiles.get(owner);if(profile)entries.push(['player:'+owner,clone(profile)]);}
        flushing=store.batch(entries);
        try{await flushing;for(const owner of owners)persistedRevisions.set(owner,Math.max(persistedRevisions.get(owner)||0,savedRevisions.get(owner)));}catch(e){for(const owner of owners)dirtyProfiles.add(owner);throw e;}finally{flushing=null;}
    }
    async function durable(p){const revision=revisions.get(p.owner)||0;while((persistedRevisions.get(p.owner)||0)<revision)await flush();}
    async function connect(hello,transport){
        if(closing)throw Error('Server restarting');
        if(hello?.protocol!==MP_PROTOCOL||typeof hello.token!=='string'||!/^[a-f0-9]{64}$/.test(hello.token))throw Error('Invalid session credentials or protocol.');
        const owner=createHash('sha256').update(hello.token).digest('hex');
        if(players.size>=maxPlayers&&!identities.has(owner))throw Error('The world is full. Please try again soon.');
        if(authenticating.has(owner))await authenticating.get(owner);
        let complete;authenticating.set(owner,new Promise(resolve=>complete=resolve));
        try{
            let profile=profiles.get(owner)||await store.get('player:'+owner);
            if(!profile){profile={privateState:sanitizePrivateState(hello.privateState),position:null,grapplingHook:false,awards:[],awardSerial:0};await store.batch([['player:'+owner,profile]]);}
            const previous=identities.get(owner);if(previous){profile.position=instances.savePosition(previous);shared.leave(previous);players.delete(previous.id);previous.transport.close(4001,'This character connected in another tab.');await previous.queue;}
            if(players.size>=maxPlayers)throw Error('The world is full. Please try again soon.');
            profiles.set(owner,profile);const inventory=createInventoryAccount(profile);
            if(profile.deathPending){const h=geometry.hospital||{x:74.7,y:89.5};profile.position={x:h.x+.5,z:h.y+.5,y:geometry.characterGround(h.x+.5,h.y+.5),hp:30};profile.privateState['sf-hitpoints-v1']='{"hp":30,"max":30}';profile.deathPending=false;}
            const persisted=nameOwners.get(owner),id=++serial,spawn=geometry.spawn,position=profile.position;
            const fallback={x:spawn.x+.5,z:spawn.y+.5,y:geometry.characterGround(spawn.x+.5,spawn.y+.5),angle:Math.PI/2};
            const safe=position&&geometry.landClearAt(position.x-.5,position.z-.5)?position:fallback;
            const p={owner,id,profile,inventory,level:strengthStatus(parse(profile.privateState['sf-strength-v1']).xp).level,transport,name:persisted?.name||'Guest'+id,nameChanged:persisted?.changed||0,appearance:appearance(parse(profile.privateState['sf-character-v1']||'{}')),revision:1,...safe,hp:Math.max(1,Math.min(30,position?.hp||30)),max:30,mode:'walk',phase:0,motion:0,moving:false,gesture:'',seen:new Map(),sharedVersions:new Map(),npcVersions:new Map(),lastPoseAt:now(),shotAt:0,attack:null,airship:false,deck:null,grappling:null,queue:Promise.resolve(),messages:0,rateAt:now(),lastCheckpoint:0,lastSeen:now()};
            p.instance=PUBLIC_INSTANCE;
            players.set(id,p);identities.set(owner,p);dirty(p);metrics.connected=players.size;
            send(p,{type:'welcome',protocol:MP_PROTOCOL,id,name:p.name,renameAt:p.nameChanged+60_000,privateState:profile.privateState,position:privatePosition(p),instance:p.instance,illuminati:profile.illuminati===true,bomber:instances.bomberStatus(p),grapplingHook:profile.grapplingHook,inventory:inventory.snapshot(),bank:bankSnapshotFor(p,now),guild:guildStatusFor(p,now),pvp:pvp.status(p),level:p.level,pendingAwards:profile.awards,debug:allowDebug,time:now(),shared:shared.snapshot(p)});
            return p;
        }finally{authenticating.delete(owner);complete();}
    }
    function disconnect(p){
        if(players.get(p.id)!==p)return;shared.leave(p);players.delete(p.id);identities.delete(p.owner);p.profile.position=instances.savePosition(p);metrics.connected=players.size;if(closing)return;dirty(p);
        // Keep the profile alive until any in-flight loot/purchase receipt and
        // its durable write finish, then evict the disconnected session cache.
        const task=p.queue.then(async()=>{await p.deathTask;await durable(p);}).then(()=>{if(!identities.has(p.owner)&&!authenticating.has(p.owner)){profiles.delete(p.owner);revisions.delete(p.owner);persistedRevisions.delete(p.owner);}}).catch(error=>console.error('Disconnect persistence:',error.message));
        cleanupTasks.add(task);task.finally(()=>cleanupTasks.delete(task));
    }
    function correction(p,reason){metrics.corrections++;send(p,{type:'position',...privatePosition(p),reason});}
    function pose(p,input){
        if(!validNetworkPose(input)){metrics.rejected++;return;}
        p.lastSeen=now();
        if(typeof input.talkingTo==='string'){const npc=shared.npcById.get(input.talkingTo);if(npc&&Math.hypot(npc.x-p.x,npc.z-p.z)<3.5)npc.hold=1.2;}
        if(p.airship||p.grappling||p.parachute)return;
        if(p.respawnAllowed&&input.mode!=='hidden'){if(Math.hypot(input.x-p.x,input.z-p.z)<.15){p.gesture='caught';p.motion=0;}else correction(p,'Respawn pending');return;}
        if(!instances.validPose(p,input)){correction(p,'That movement is outside your current map layer.');return;}
        if(instances.kind(p)==='world'&&!p.bomberActive&&!guildMayEnter(p,geometry,input.x,input.y,input.z)){correction(p,'The guild admits members only. Speak to Ray.');return;}
        const elapsed=Math.max(.025,Math.min(.6,(now()-p.lastPoseAt)/1000)),distance=Math.hypot(input.x-p.x,input.z-p.z),speed=input.mode==='bomber'?instances.bomberSpeed(p,input):speedLimits[input.mode];
        if(distance>speed*elapsed+.65){correction(p,'Movement exceeded the allowed speed');p.lastPoseAt=now();return;}
        if(instances.kind(p)==='world'&&['walk','bike','skateboard','roll','dance','train'].includes(input.mode)&&distance>.01&&!(p.personalJailed?jail.walkable(input.x,input.z):geometry.canTravel(p.x-.5,p.z-.5,input.x-.5,input.z-.5,true))){correction(p,'Blocked tile');p.lastPoseAt=now();return;}
        Object.assign(p,{x:input.x,z:input.z,y:input.y,angle:input.angle,phase:input.phase,motion:input.motion,mode:input.mode,moving:!!input.moving,gesture:['attack','flinch','talk','caught','roll','drink'].includes(input.gesture)?input.gesture:'',lastPoseAt:now()});
        if(Number.isInteger(input.hp)&&input.hp>=0&&input.hp<=30){if((!pvp.status(p).enabled&&!p.damagePending)||input.hp<=p.hp){p.hp=input.hp;p.damagePending=false;}}
        dirty(p);
    }
    async function checkpoint(p,message){
        if(now()-p.lastCheckpoint<1000)return;p.lastCheckpoint=now();
        mergePrivate(p,message.privateState);
        const acknowledged=new Set(Array.isArray(message.awardsAck)?message.awardsAck.filter(Number.isSafeInteger):[]);
        p.profile.awards=p.profile.awards.filter(a=>!acknowledged.has(a.id));
        dirty(p);
    }
    async function rename(p,name){
        const normalized=normalizeUsername(name),decision=renameDecision({name,owner:p.owner,now:now(),lastChanged:p.nameChanged,current:p.name,takenBy:normalized.ok?names.get(normalized.canonical):null});
        if(!decision.ok||decision.unchanged)return decision;
        // Reserve synchronously before awaiting I/O; simultaneous requests for
        // the same name cannot both pass. Roll back on a failed durable write.
        const old=p.name.toLowerCase();names.set(normalized.canonical,p.owner);
        try{const changed=now();await store.rename(p.owner,normalized.canonical,decision.name,changed);if(names.get(old)===p.owner&&old!==normalized.canonical)names.delete(old);p.name=decision.name;p.nameChanged=changed;p.revision++;nameOwners.set(p.owner,{owner:p.owner,canonical:normalized.canonical,name:p.name,changed});return {ok:true,name:p.name,retryAt:changed+60_000};}
        catch(error){if(normalized.canonical!==old)names.delete(normalized.canonical);return {ok:false,message:'Unable to save that username. Please try again.'};}
    }
    async function command(p,message){
        const {action,args={}}=message;let result;
        if(message.privateState&&['buyGrapple','attack','releaseRaptor','pvpAttack','instanceEnter'].includes(action)){mergePrivate(p,message.privateState);}
        if(['bankStatus','bankDeposit','bankWithdraw','bankCoffee','bankCoffeeDrink'].includes(action)){
            if(action!=='bankStatus'&&message.inventoryEpoch!==p.inventory.meta.epoch)result={ok:false,message:'Your inventory changed. Please try again.',inventory:p.inventory.snapshot()};
            else {result=bankAction(p,action,args,{geometry,now,dirty});if(result.ok&&action!=='bankStatus')await durable(p);}
        }else if(['joinIlluminati','instanceEnter','instanceLeave','bomberBoard','bomberReturn','bomberEject','bomberBomb'].includes(action)){
            result=instances.command(p,action,args);if(result.ok){dirty(p);await durable(p);}
        }else if(action==='inventory'){
            if(message.inventoryEpoch!==p.inventory.meta.epoch)result={ok:false,message:'Your inventory changed. Please try again.',inventory:p.inventory.snapshot()};
            else {result=p.inventory.operation(args.op,args,p);if(result.ok){dirty(p);if(['buyHat','buyPhone','buyRobotaxi'].includes(args.op))await durable(p);}result={...result,inventory:{...p.inventory.snapshot(),...(args.op==='eat'?{hp:p.hp}:{})}};}
        }else if(action==='guildCheckIn'||action==='guildDonate'){
            if(action==='guildDonate'&&message.inventoryEpoch!==p.inventory.meta.epoch)result={ok:false,message:'Your inventory changed. Please try again.',inventory:p.inventory.snapshot()};
            else {result=guildAction(p,action,{geometry,now,dirty});if(result.ok){dirty(p);await durable(p);}}
        }else if(action==='pvp'){
            result=pvp.setMode(p,args.enabled);if(result.ok){await durable(p);result.pvp=pvp.status(p);}
        }else if(action==='pvpAttack')result=pvp.attack(p,args.id);
        else if(action==='rename')result=await rename(p,args.name);
        else if(action==='buyGrapple'){
            if(p.profile.grapplingHook)result={ok:false,message:'You already own a grappling hook.'};
            else if(Math.hypot(p.x-AIRSHIP_SHOP.x,p.z-AIRSHIP_SHOP.z)>7)result={ok:false,message:'Visit the airship outfitter at the private jet terminal.'};
            else {const purse=p.inventory.economy.state;if(!Number.isSafeInteger(purse.coins)||purse.coins<5)result={ok:false,message:'A grappling hook costs 5 coins.'};else{purse.coins-=5;p.inventory.save();p.profile.grapplingHook=true;dirty(p);await durable(p);result={ok:true,grapplingHook:true,purse,inventory:p.inventory.snapshot(),message:'You buy a grappling hook. Use it within six tiles beneath the airship.'};}}
        }else if(action==='teleport'){
            if(!allowDebug)result={ok:false,message:'Debug teleporting is disabled on this server.'};
            else if(!Number.isFinite(args.x)||!Number.isFinite(args.z)||!geometry.landClearAt(args.x-.5,args.z-.5))result={ok:false,message:'That point is blocked.'};
            else {if(instances.kind(p)!=='world'||p.bomberActive)instances.reset(p);shared.leave(p);Object.assign(p,{x:args.x,z:args.z,y:geometry.characterGround(args.x,args.z),mode:'walk',lastPoseAt:now()});correction(p,'teleport');result={ok:true};}
        }else if(action==='personalTransit'){
            if(instances.kind(p)!=='world'||p.bomberActive)instances.reset(p);
            if(args.kind==='jail'){
                const cell=createDetentionSite(1.5);shared.leave(p);Object.assign(p,{x:cell.x,z:cell.z,y:cell.base+.18,mode:'walk',personalJailed:true,lastPoseAt:now()});correction(p,'jail');result={ok:true};
            }else if(args.kind==='rehabilitation'&&p.personalJailed){
                const entry=geometry.hospital||{x:74.7,y:89.5};Object.assign(p,{x:entry.x+.5,z:entry.y+.5,y:geometry.characterGround(entry.x+.5,entry.y+.5),hp:30,personalJailed:false,mode:'walk',lastPoseAt:now()});correction(p,'respawn');result={ok:true};
            }else result={ok:false,message:'That personal journey is unavailable.'};
        }else if(action==='respawn'){
            if(!p.respawnAllowed&&p.hp>0)result={ok:false,message:'No respawn is pending.'};else {const entry=geometry.hospital||{x:74.7,y:89.5};if(instances.kind(p)!=='world'||p.bomberActive)instances.reset(p);shared.leave(p);p.profile.deathPending=false;p.pvpDying=false;p.pvpProtectedUntil=now()+5000;pvp.stop(p);Object.assign(p,{x:entry.x+.5,z:entry.y+.5,y:geometry.characterGround(entry.x+.5,entry.y+.5),hp:30,respawnAllowed:false,damagePending:false,mode:'walk',lastPoseAt:now()});correction(p,'respawn');result={ok:true};}
        }else {
            if(action==='stopAttack')pvp.stop(p);else if(action==='attack')pvp.stop(p);
            result=shared.command(p,action,args);
            if(result.award){const award={id:++p.profile.awardSerial,...result.award,inventory:p.inventory.snapshot()};p.profile.awards.push(award);dirty(p);await durable(p);result={...result,award};}
            else if(result.ok&&['releaseRaptor','releaseTiger'].includes(action)){dirty(p);await durable(p);}
        }
        send(p,{type:'result',request:message.request,action,...result});
    }
    function receive(p,message){
        if(closing||players.get(p.id)!==p||!message||typeof message!=='object')return;
        if(now()-p.rateAt>=1000){p.rateAt=now();p.messages=0;}
        if(++p.messages>80){p.transport.close(4008,'Too many messages');return;}
        if(message.type==='pose'){pose(p,message.pose);return;}
        if(message.type==='ping'){send(p,{type:'pong',clientTime:message.time,time:now()});return;}
        if(message.type==='say'){if(now()-(p.spokeAt||0)<700)return;p.spokeAt=now();if(!['yo','ok','no'].includes(message.text))return;for(const other of playerIndex.near(p.x,p.z,25))if(sameMapInstance(p,other))send(other,{type:'say',id:p.id,text:message.text});return;}
        p.queue=p.queue.then(()=>message.type==='checkpoint'?checkpoint(p,message):message.type==='command'?command(p,message):undefined).catch(error=>{console.error('Player command:',error.message);send(p,{type:'result',request:message.request,ok:false,message:'Unable to complete this action. Try again.'});});
    }
    function tick(dt=1/20){const start=performance.now();tickNumber++;clockMs+=dt*1000;shared.tick(dt);instances.tick();pvp.tick();for(const p of players.values())if(p.gestureUntil&&now()>p.gestureUntil){p.gesture='';p.gestureUntil=0;}metrics.tickMs=performance.now()-start;}
    function broadcast(){
        const start=performance.now();playerIndex.rebuild([...players.values()].filter(p=>instances.kind(p)==='world'));
        const entityFrame=shared.clock>=nextEntitySnapshot;if(entityFrame)nextEntitySnapshot=shared.clock+.2;
        // Quantize and encode each shared entity once, then send only changed
        // records. A crowd must not multiply identical NPC JSON work by 2,000.
        const compact=value=>JSON.stringify(value,(_key,v)=>typeof v==='number'?Math.round(v*1000)/1000:v);
        const world=entityFrame?shared.snapshot():null,encoded=new Map(),npcEncoded=new Map();
        if(world){worldNPCIndex.rebuild(world.npcs);lootIndex.rebuild(world.loot);for(const key of ['cows','raptor','tiger','airship'])encoded.set(key,compact(world[key]));for(const n of world.npcs)npcEncoded.set(n.id,compact([n.id,n.x,n.z,n.base??null,n.angle,n.motion,n.phase,n.elapsed??null,n.expeditionDead?1:0,n.hold||0,n.level||1]));}
        for(const p of players.values()){
            if(p.transport.bufferedAmount>262144){metrics.slowClients++;continue;}
            // Keep valid nearby interests stable. Re-ranking a packed spawn
            // every 100 ms otherwise re-sends whole wardrobes continuously.
            const visible=[];for(const id of p.seen.keys()){const peer=players.get(id);if(peer&&sameMapInstance(p,peer)&&peer.mode!=='hidden'&&Math.hypot(peer.x-p.x,peer.z-p.z)<=MP_VIEW_RADIUS)visible.push(peer);}
            const retained=new Set(visible.map(n=>n.id));for(const peer of instances.kind(p)==='world'?playerIndex.near(p.x,p.z,MP_VIEW_RADIUS,MP_MAX_NEIGHBORS,p):[]){if(visible.length>=MP_MAX_NEIGHBORS)break;if(!retained.has(peer.id)){visible.push(peer);retained.add(peer.id);}}
            const seen=new Map(visible.map(n=>[n.id,n.revision])),enter=visible.filter(n=>p.seen.get(n.id)!==n.revision).map(publicPlayer),remove=[...p.seen.keys()].filter(id=>!seen.has(id));
            if(enter.length||remove.length)send(p,{type:'interest',enter,remove});p.seen=seen;
            send(p,encodePlayerFrame(visible,tickNumber,now()));metrics.frames++;
            if(entityFrame){
                if(instances.kind(p)!=='world'){send(p,{type:'world',state:{clock:shared.clock,cows:[],raptor:null,tiger:null,airship:null,loot:[],npcs:[]},population:players.size,self:null});continue;}
                const parts=['"clock":'+Math.round(world.clock*1000)/1000];
                for(const [key,value] of encoded)if(p.sharedVersions.get(key)!==value){parts.push(JSON.stringify(key)+':'+value);p.sharedVersions.set(key,value);}
                const loot=lootIndex.near(p.x,p.z,45,64),lootJSON=compact(loot);if(p.sharedVersions.get('loot')!==lootJSON){parts.push('"loot":'+lootJSON);p.sharedVersions.set('loot',lootJSON);}
                const npcDelta=[],seenNPC=new Map();for(const npc of worldNPCIndex.near(p.x,p.z,38,32)){const value=npcEncoded.get(npc.id);seenNPC.set(npc.id,value);if(p.npcVersions.get(npc.id)!==value)npcDelta.push(value);}p.npcVersions=seenNPC;parts.push('"npcs":['+npcDelta.join(',')+']');
                const self=p.airship||p.grappling?{...privatePosition(p),airship:p.airship,grappling:!!p.grappling,deck:p.deck,mode:p.mode,angle:p.angle,phase:p.phase,moving:p.moving,motion:p.motion}:null;
                send(p,'{"type":"world","state":{'+parts.join(',')+'},"population":'+players.size+',"self":'+compact(self)+'}');
            }
        }
        metrics.broadcastMs=performance.now()-start;
    }
    return {connect,disconnect,receive,tick,broadcast,flush,players,shared,pvp,metrics,store,get serial(){return serial;},close:async()=>{closing=true;await Promise.all([...players.values()].map(p=>p.queue));await Promise.all([...cleanupTasks]);for(const p of players.values()){p.profile.position=instances.savePosition(p);dirty(p);}await flush();}};
}

const AIRSHIP_SHOP={x:92.2,z:123.4};
