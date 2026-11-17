import {MP_PROTOCOL,MP_PRIVATE_KEYS,decodePlayerFrame,unpackNetworkNPC} from './multiplayer-protocol.js';

export function readMultiplayerPrivate(storage=localStorage){const result={};for(const key of MP_PRIVATE_KEYS){const value=storage.getItem(key);if(value!==null)result[key]=value;}return result;}
export function multiplayerEndpoint(value,base=location.href){
    if(!value)return null;try{const url=new URL(value,base);if(url.protocol==='http:')url.protocol='ws:';if(url.protocol==='https:')url.protocol='wss:';if(!['ws:','wss:'].includes(url.protocol)||url.username||url.password||url.hash)return null;if(new URL(base).protocol==='https:'&&url.protocol!=='wss:')return null;return url.href;}catch{return null;}
}
export function interpolateNetworkPose(a,b,t){
    if(!a)return {...b};if(!b)return {...a};t=Math.max(0,Math.min(1,t));
    if(Math.hypot(b.x-a.x,b.z-a.z)>12||a.mode==='hidden'||b.mode==='hidden')return {...b};
    const result={...b};for(const key of ['x','y','z','motion'])result[key]=a[key]+(b[key]-a[key])*t;
    result.angle=a.angle+Math.atan2(Math.sin(b.angle-a.angle),Math.cos(b.angle-a.angle))*t;
    result.phase=a.phase+(b.phase-a.phase)*t;return result;
}

/** Native browser WebSocket, bounded interpolation history and reconnects.
 * The render loop never waits for network or storage. */
export function createMultiplayerClient({endpoint,storage=localStorage,WebSocketClass=WebSocket,now=()=>performance.now(),onStatus=()=>{}}){
    let token=storage.getItem('sf-mp-identity');if(!/^[a-f0-9]{64}$/.test(token||'')){token=[...crypto.getRandomValues(new Uint8Array(32))].map(v=>v.toString(16).padStart(2,'0')).join('');storage.setItem('sf-mp-identity',token);}
    const peers=new Map(),listeners=new Set(),requests=new Map(),appliedAwards=new Set(),npcState=new Map();
    let socket=null,reconnect=null,stopped=false,serial=0,failures=0,lastPose=0,lastCheckpoint=0,lastAppearance='',welcomed=false,firstResolve;
    const state={connected:false,configured:true,id:null,name:'',renameAt:0,grapplingHook:false,population:0,world:null,self:null,debug:false,status:'Connecting…',latency:0};
    const first=new Promise(resolve=>firstResolve=resolve),settleTimer=setTimeout(()=>firstResolve(null),5000);
    function status(text){state.status=text;onStatus(state);}
    function emit(message){for(const listener of listeners)listener(message);}
    function acceptInventory(inventory,notify=true){
        if(!inventory||!Number.isInteger(inventory.epoch)||!Number.isInteger(inventory.revision))return false;
        const previous=state.inventory;if(previous&&(inventory.epoch<previous.epoch||inventory.epoch===previous.epoch&&inventory.revision<previous.revision))return false;
        state.inventory=inventory;storage.setItem('sf-purse-v1',JSON.stringify(inventory.purse));storage.setItem('sf-deli-v1',JSON.stringify({sandwiches:inventory.sandwiches,pending:inventory.deliveryPending}));
        if(notify)emit({type:'inventory',inventory});return true;
    }
    function send(message){if(socket?.readyState!==1||socket.bufferedAmount>65536)return false;socket.send(JSON.stringify(message));return true;}
    function checkpoint(force=false){if(!state.connected||!force&&now()-lastCheckpoint<3000)return;lastCheckpoint=now();send({type:'checkpoint',privateState:readMultiplayerPrivate(storage),inventoryEpoch:state.inventory?.epoch,awardsAck:[...appliedAwards]});}
    function saveAwardSnapshot(){storage.setItem('sf-mp-awards',JSON.stringify({endpoint,awards:[...appliedAwards],privateState:readMultiplayerPrivate(storage)}));}
    function connect(){
        if(stopped)return;status(failures?'Reconnecting…':'Connecting…');
        try{socket=new WebSocketClass(endpoint);socket.binaryType='arraybuffer';}catch{schedule();return;}
        socket.addEventListener('open',()=>send({type:'hello',protocol:MP_PROTOCOL,token,privateState:readMultiplayerPrivate(storage)}));
        socket.addEventListener('message',event=>{
            if(typeof event.data!=='string'){
                const frame=decodePlayerFrame(event.data);if(!frame)return;const time=now();
                for(const pose of frame.players){const peer=peers.get(pose.id);if(!peer)continue;peer.hp=pose.hp;peer.level=pose.level;peer.pvp=pose.pvp;peer.samples.push({time,pose});if(peer.samples.length>6)peer.samples.shift();}return;
            }
            let message;try{message=JSON.parse(event.data);}catch{return;}
            if(message.pvp)state.pvp=message.pvp;
            if(message.guild)state.guild=message.guild;
            if(message.illuminati!==undefined)state.illuminati=message.illuminati;
            if(message.bomber)state.bomber=message.bomber;
            if(message.bank)state.bank=message.bank;
            if(message.type==='instance'){state.instance=message.instance;state.position=message.position;peers.clear();npcState.clear();state.world={clock:0,cows:[],raptor:null,tiger:null,airship:null,loot:[],npcs:[]};}
            if(message.type!=='welcome')acceptInventory(message.inventory||message.award?.inventory);
            if(message.type==='pvpHit'){const peer=peers.get(message.target);if(peer)peer.hp=message.hp;}
            if(message.type==='welcome'){
                state.connected=true;state.id=message.id;state.name=message.name;state.renameAt=message.renameAt;state.serverOffset=message.time-Date.now();state.grapplingHook=message.grapplingHook;state.debug=message.debug;state.world=message.shared;state.position=message.position;state.pendingAwards=message.pendingAwards;state.self=null;failures=0;npcState.clear();for(const npc of message.shared?.npcs||[])npcState.set(npc.id,npc);
                if(!welcomed){
                    // Cloud progress wins on a fresh session. An atomic local
                    // award checkpoint repairs a reload before its server ack.
                    let recovery;try{recovery=JSON.parse(storage.getItem('sf-mp-awards')||'null');}catch{}
                    const pending=new Set((message.pendingAwards||[]).map(a=>a.id)),recover=recovery?.endpoint===endpoint&&recovery.awards?.some(id=>pending.has(id));
                    const privateState=recover?recovery.privateState:message.privateState;
                    for(const key of MP_PRIVATE_KEYS){if(typeof privateState?.[key]==='string')storage.setItem(key,privateState[key]);}
                    if(recover)for(const id of recovery.awards)appliedAwards.add(id);
                    welcomed=true;
                }
                state.instance=message.instance||{id:'world',kind:'world',layer:0};state.level=message.level||1;acceptInventory(message.inventory,false);clearTimeout(settleTimer);firstResolve(message);status('Online · '+message.name);if(state.reloadOnWelcome){location.reload();return;}emit(message);
            }else if(message.type==='interest'){
                for(const id of message.remove)peers.delete(id);
                for(const p of message.enter){const old=peers.get(p.id);peers.set(p.id,{...old,...p,samples:old?.samples||[]});}
            }else if(message.type==='world'){
                for(const record of message.state.npcs||[]){const npc=unpackNetworkNPC(record);npcState.set(npc.id,npc);}state.world={...state.world,...message.state,npcs:[...npcState.values()]};state.population=message.population;state.self=message.self;status('Online · '+message.population+' player'+(message.population===1?'':'s'));emit({...message,state:state.world});
            }else if(message.type==='result'){
                if(message.ok&&message.action==='rename'){state.name=message.name;state.renameAt=message.retryAt;onStatus(state);}
                if(message.grapplingHook)state.grapplingHook=true;
                const request=requests.get(message.request);if(request){clearTimeout(request.timeout);requests.delete(message.request);request.resolve(message);}emit(message);
            }else if(message.type==='pong'){state.latency=Math.max(0,now()-message.clientTime);}
            else emit(message);
        });
        socket.addEventListener('error',()=>{});
        socket.addEventListener('close',event=>{
            state.connected=false;peers.clear();state.self=null;
            for(const request of requests.values()){clearTimeout(request.timeout);request.resolve({ok:false,message:'Connection lost. Please try again once reconnected.'});}requests.clear();
            if(event.code===4001){stopped=true;status('Character open in another tab');return;}
            schedule();
        });
    }
    function schedule(){if(stopped)return;state.connected=false;status('Reconnecting…');const delay=Math.min(15000,750*2**Math.min(failures++,5))+Math.random()*250;clearTimeout(reconnect);reconnect=setTimeout(connect,delay);}
    function command(action,args={}){
        if(!state.connected)return Promise.resolve({ok:false,message:'Connect to the common world first.'});
        const request=++serial,privateState=['buyGrapple','attack','releaseRaptor','pvpAttack','instanceEnter'].includes(action)?readMultiplayerPrivate(storage):undefined;return new Promise(resolve=>{const timeout=setTimeout(()=>{requests.delete(request);resolve({ok:false,message:'The server did not respond. Reconnect before retrying.'});},8000);requests.set(request,{resolve,timeout});if(!send({type:'command',action,args,request,privateState,inventoryEpoch:state.inventory?.epoch})){clearTimeout(timeout);requests.delete(request);resolve({ok:false,message:'Connection is busy. Try again in a moment.'});}});
    }
    function remotePlayers(time=now()){
        const result=[],targetTime=time-120;
        for(const peer of peers.values()){
            const samples=peer.samples;if(!samples.length)continue;let a=samples[0],b=samples.at(-1);
            for(let i=1;i<samples.length;i++)if(samples[i].time>=targetTime){a=samples[i-1];b=samples[i];break;}
            const pose=interpolateNetworkPose(a.pose,b.pose,(targetTime-a.time)/(b.time-a.time||1));result.push({...pose,hp:peer.hp??pose.hp,name:peer.name,appearance:peer.appearance,level:peer.level||pose.level||1,pvp:peer.pvp??pose.pvp??false});
        }return result;
    }
    function claimAward(award,apply){if(!award||appliedAwards.has(award.id))return false;apply(award);appliedAwards.add(award.id);if(appliedAwards.size>256)appliedAwards.delete(appliedAwards.values().next().value);saveAwardSnapshot();checkpoint(true);return true;}
    connect();
    return {state,first,peers,command,checkpoint,claimAward,remotePlayers,acceptInventory,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},update(pose){if(!state.connected)return;if(now()-lastPose>=90){lastPose=now();send({type:'pose',pose});}checkpoint();},say:text=>send({type:'say',text}),stop(){stopped=true;checkpoint(true);clearTimeout(reconnect);clearTimeout(settleTimer);socket?.close(1000,'Leaving world');},ping(){send({type:'ping',time:now()});}};
}

export async function bootMultiplayer(){
    let endpoint;try{
        const query=new URL(location.href).searchParams;
        if(query.get('offline')==='1')return null;
        endpoint=query.get('server')||localStorage.getItem('sf-multiplayer-endpoint');
        if(!endpoint&&location.protocol!=='file:'){
            const response=await fetch(new URL('./multiplayer-config.json',location.href),{signal:AbortSignal.timeout(1200),cache:'no-store'});if(response.ok)endpoint=(await response.json()).endpoint;
        }
    }catch{}
    endpoint=multiplayerEndpoint(endpoint);if(!endpoint)return null;
    const client=createMultiplayerClient({endpoint,onStatus:state=>{const label=document.getElementById('sf-multiplayer-status');if(label)label.textContent=state.status;}});const result=await client.first;if(!result)client.state.reloadOnWelcome=true;return client;
}
