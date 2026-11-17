import {multiplayerEndpoint,interpolateNetworkPose} from './multiplayer-client.js';
import {characterAppearance,normalizeCharacter} from './character-config.js';
import {drawKrakenCape,drawBeam} from './jurassic-models.js';
import {drawAirshipRope} from './airship-rope.js';
import {createPlayerFollower} from './player-follow.js';
import {createMultiplayerInventory} from './multiplayer-inventory.js';
import {collapseCharacterMesh} from './capture-animation.js';
import {drawStealthBomber,drawParachute} from './illuminati-models.js';
import {drawDrinkingCoffee} from './bank-models.js';

export function setupMultiplayerSettings(client,{showCharacter,announce}){
    const $=id=>document.getElementById(id),nameForm=$('sf-username-form'),field=$('sf-username'),save=$('sf-save-username'),hint=$('sf-username-status'),endpoint=$('sf-server-endpoint');let submitting=false,lastSeconds=-1,messageUntil=0;
    endpoint.value=localStorage.getItem('sf-multiplayer-endpoint')||new URL(location.href).searchParams.get('server')||'';
    $('sf-multiplayer-button').addEventListener('click',()=>{showCharacter();field.focus();});
    $('sf-connection-form').addEventListener('submit',event=>{event.preventDefault();const value=multiplayerEndpoint(endpoint.value);if(!value){$('sf-connection-status').textContent='Use a ws:// or wss:// server address. HTTPS pages require wss://.';return;}client?.checkpoint(true);localStorage.setItem('sf-multiplayer-endpoint',value);const url=new URL(location.href);url.searchParams.delete('offline');url.searchParams.delete('server');location.href=url.href;});
    $('sf-play-offline').addEventListener('click',()=>{client?.checkpoint(true);client?.stop();const url=new URL(location.href);url.searchParams.delete('server');url.searchParams.set('offline','1');location.href=url.href;});
    field.addEventListener('input',()=>{messageUntil=0;lastSeconds=-1;});
    nameForm.addEventListener('submit',async event=>{event.preventDefault();if(!client?.state.connected||submitting)return;submitting=true;save.disabled=true;hint.textContent='Saving…';const result=await client.command('rename',{name:field.value});submitting=false;lastSeconds=-1;messageUntil=Date.now()+(result.ok?1200:6000);hint.textContent=result.ok?'Username saved.':result.message;if(result.ok)field.value=result.name;update(true);});
    let changingPvP=false;
    $('sf-pvp-enabled').addEventListener('change',async event=>{if(!client?.state.connected||changingPvP)return;changingPvP=true;event.target.disabled=true;const result=await client.command('pvp',{enabled:event.target.checked});changingPvP=false;if(!result.ok)announce(result.message,'PvP');update();});
    function update(preserveMessage=false){
        const state=client?.state,seconds=Math.max(0,Math.ceil(((state?.renameAt||0)-(Date.now()+(state?.serverOffset||0)))/1000));save.disabled=submitting||!state?.connected||seconds>0;field.disabled=!state?.connected;
        if(state?.name&&document.activeElement!==field&&field.dataset.current!==state.name){field.value=state.name;field.dataset.current=state.name;}
        if(!preserveMessage&&Date.now()>messageUntil&&seconds!==lastSeconds){hint.textContent=!state?.connected?'Connect to the common world to reserve a username.':seconds?'You can change your name again in '+seconds+'s.':'Up to 12 letters, numbers, or underscores. Names are unique.';lastSeconds=seconds;}
        $('sf-multiplayer-status').textContent=state?.status||'Single player · Connect';$('sf-grapple-button').hidden=!state?.grapplingHook;
        const pvp=state?.pvp||{enabled:false,disableAt:0},pvpSeconds=Math.max(0,Math.ceil((pvp.disableAt-(Date.now()+(state?.serverOffset||0)))/1000));
        $('sf-pvp-enabled').checked=pvp.enabled;$('sf-pvp-enabled').disabled=changingPvP||!state?.connected||pvp.enabled&&pvpSeconds>0;
        $('sf-pvp-status').textContent=!state?.connected?'Connect to the common world to enable PvP.':pvp.enabled?pvpSeconds?'PvP enabled · Can disable in '+pvpSeconds+'s.':'PvP enabled · You can disable it now.':'PvP disabled · Both players must opt in.';
    }
    update();return {update};
}

/** Adapt the existing renderer/personal adventures to server-owned entities.
 * Personal quests, disguises, vehicles and rockets never enter shared state. */
export function createWorldMultiplayer(api){
    const {client,player,airship,basket,rope,expeditions,zoo,merchants,health,economy,combatFeedback,characterGround,announce,onPosition,onCaught,onPrivateAward}=api;
    let snapshot=client.state.world,previousShip=null,currentShip=null,shipAt=performance.now(),previousSelf=null,currentSelf=null,selfAt=0,lastWorld=null,grapplingGround=null;
    const originals={board:airship.board,flyTo:airship.flyTo,returnHome:airship.returnHome,stop:airship.stop,cancel:airship.cancel,update:airship.update,basketWalk:basket.walkTo,quest:expeditions.startQuest,collect:expeditions.collect,attack:expeditions.attack,stopAttack:expeditions.stop};
    const remoteActors=new Map(),inventoryBridge=createMultiplayerInventory({client,economy,deli:api.deli,health,apply:api.applyInventory,announce});
    const follower=createPlayerFollower({getSelf:()=>({x:player.x+.5,z:player.y+.5,y:api.playerGround()}),getTarget:id=>client.remotePlayers().find(p=>p.id===id),routeTo:api.routeFollower,setPath:api.setFollowRoute,stopMoving:api.stopFollowMotion,canFollow:api.canFollow,onStop:text=>announce(text,'Follow')});
    async function command(action,args={}){const result=await client.command(action,args);if(result.message)announce(result.message,result.ok?'World':'Server');if(result.purse){Object.assign(economy.state,result.purse);api.onPurse(economy.state);try{localStorage.setItem('sf-purse-v1',JSON.stringify(economy.state));}catch{}}if(result.award)award(result.award);return result;}
    function award(item){client.claimAward(item,value=>inventoryBridge.suppress(()=>onPrivateAward(value)));}
    function worldUpdate(state,self){
        if(!state)return;snapshot=state;
        const time=performance.now(),ship=state.airship;
        if(ship){previousShip=currentShip||{...ship.position,angle:ship.heading,phase:0,motion:0,mode:'airship'};currentShip={...ship.position,angle:ship.heading,phase:0,motion:0,mode:'airship'};shipAt=time;}
        if(self){previousSelf=currentSelf||{...self,phase:0,motion:0};currentSelf={...self};selfAt=time;}else {currentSelf=null;grapplingGround=null;}
        for(const incoming of state.cows||[]){const cow=expeditions.cows.find(c=>c.id===incoming.id);if(cow)Object.assign(cow,incoming);}
        if(state.raptor)Object.assign(expeditions.raptor,state.raptor,{prey:{isPlayer:state.raptor.preyId===client.state.id}});
        if(expeditions.state.target?.hp===0)expeditions.state.target=null;
        if(state.tiger&&zoo){Object.assign(zoo.state,state.tiger);zoo.state.tiger={...state.tiger.tiger,path:[]};}
        const npcById=new Map(merchants.map(n=>[n.id,n]));for(const incoming of state.npcs||[]){const npc=npcById.get(incoming.id);if(npc)Object.assign(npc,incoming,{networked:true});}
        expeditions.state.loot=[...expeditions.state.loot.filter(l=>!l.network),...(state.loot||[])];
        if(ship){const aboard=ship.passengers.includes(client.state.id),wasAboard=airship.state.active;
            if(aboard){if(self?.deck&&(!wasAboard||!basket.state.target&&Math.hypot(basket.state.x-self.deck.x,basket.state.z-self.deck.z)>.6))basket.reset(self.deck.x,self.deck.z);airship.state.active=true;airship.state.phase=ship.phase;airship.state.heading=ship.heading;airship.state.position={...ship.position};airship.state.speed=ship.speed;airship.state.target=null;}
            else if(airship.state.active){originals.cancel();basket.reset();}
            if(ship.rope?.deployed){Object.assign(rope.state,{deployed:true,top:ship.rope.top,bottom:ship.rope.bottom,phase:aboard?'hanging':Math.hypot(player.x+.5-ship.rope.bottom.x,player.y+.5-ship.rope.bottom.z)<1.5?'ground':'hanging'});}
            else rope.reset();
        }
        api.refreshUI();
    }
    client.subscribe(message=>{
        if(message.type==='world')worldUpdate(message.state,message.self);
        else if(message.type==='instance'){follower.stop();client.state.pvpTarget=null;remoteActors.clear();previousShip=currentShip=null;currentSelf=null;grapplingGround=null;worldUpdate(client.state.world,null);}
        else if(message.type==='welcome'){worldUpdate(message.shared,null);onPosition({...message.position,reason:'reconnect'});for(const item of message.pendingAwards||[])award(item);}
        else if(message.type==='result'&&message.award)award(message.award);
        else if(message.type==='position')onPosition(message);
        else if(message.type==='damage'){
            const damage=health.damage(Math.max(0,health.state.hp-message.hp));combatFeedback.hit(player,message.damage,message.hp,30);announce('The '+message.source+' hits you for '+damage+'.','Combat');api.refreshUI();
        }else if(message.type==='caught'){follower.stop();client.state.pvpTarget=null;onCaught(message.source);}
        else if(message.type==='pvpHit'){
            const actor=message.target===client.state.id?player:remoteActors.get(message.target);
            if(actor){if(actor!==player)actor.hp=message.hp;combatFeedback.hit(actor,message.damage,message.hp,30);}
            if(message.target===client.state.id){health.state.hp=message.hp;try{localStorage.setItem('sf-hitpoints-v1',JSON.stringify(health.state));}catch{}}
            if(message.weapon==='railgun')expeditions.state.beams.push({from:message.from,to:message.to,ttl:.22});
            if(message.attacker===client.state.id){player.gesture={name:'attack',started:performance.now(),duration:450};combatFeedback.show(player,health.state.hp,30);}
            if(message.hp===0){const peer=client.peers.get(message.target);if(peer)peer.deathAt=performance.now();}
            api.refreshUI();
        }else if(message.type==='pvpKill'){client.state.pvpTarget=null;follower.stop();announce('You defeated '+message.name+'. Their possessions dropped where they fell.','PvP');}
        else if(message.type==='sharedHit'){
            const target=[...expeditions.cows,expeditions.raptor,...merchants].find(n=>n.id===message.target);if(!target)return;target.hp=message.hp;combatFeedback.hit(target,message.damage,message.hp,message.max);
            const t=performance.now();expeditions.state.beams.push({from:message.from,to:message.to,ttl:.22});if(message.attacker===client.state.id){player.gesture={name:'attack',started:t,duration:450};combatFeedback.show(player,health.state.hp,30);}api.refreshUI();
        }else if(message.type==='say'){
            const peer=client.peers.get(message.id);if(peer){peer.speech=message.text;peer.speechUntil=performance.now()+3000;}
        }
    });
    worldUpdate(snapshot,client.state.self);if(client.state.position)onPosition({...client.state.position,reason:'connect'});
    for(const item of client.state.pendingAwards||[])award(item);
    airship.board=()=>{command('airshipBoard');return true;};
    airship.flyTo=(x,z)=>{command('airshipTarget',{x,z});return snapshot?.airship?.captain===client.state.id;};
    airship.stop=()=>{command('airshipStop');return true;};
    airship.returnHome=()=>{command('airshipHome');return true;};
    airship.update=()=>null;
    airship.cancel=()=>{if(airship.state.active||client.state.self?.grappling)command('airshipLeave');return originals.cancel();};
    basket.walkTo=(x,z)=>{const accepted=originals.basketWalk(x,z);if(accepted)command('airshipDeck',{x,z});return accepted;};
    rope.retract=()=>{command('airshipRope',{retract:true});return true;};
    expeditions.startQuest=()=>{const result=originals.quest();if(result.ok){client.checkpoint(true);command('releaseRaptor');}return result;};
    expeditions.attack=npc=>{if(!['cow','raptor'].includes(npc.combatKind))return originals.attack(npc);expeditions.state.target=npc;client.checkpoint(true);command('attack',{id:npc.id});return {ok:client.state.connected};};
    expeditions.stop=()=>{originals.stopAttack();client.state.pvpTarget=null;command('stopAttack');};
    expeditions.collect=item=>{if(!item.network)return originals.collect(item);command('collect',{id:item.id});return {ok:client.state.connected};};
    function beforeUpdate(dt=0){
        const time=performance.now();
        if(currentShip&&airship.state.active){const p=interpolateNetworkPose(previousShip,currentShip,(time-shipAt)/120);airship.state.position={x:p.x,y:p.y,z:p.z};airship.state.heading=p.angle;}
        if(currentSelf?.grappling){const p=interpolateNetworkPose(previousSelf,currentSelf,(time-selfAt)/120);player.x=p.x-.5;player.y=p.z-.5;player.angle=p.angle||0;player.phase=p.phase||time*.007;player.motion=1;grapplingGround=p.y;}else grapplingGround=null;
        if(follower.state.attack&&!client.state.pvp?.enabled){follower.stop();command('stopAttack');}
        follower.update(dt,target=>{if(follower.state.attack)beginAttack(target);});
    }
    function inspect(target){announce(target.label+' - Level '+target.level,'Player');return true;}
    function beginAttack(target){return command('pvpAttack',{id:target.id}).then(result=>{if(result.ok)client.state.pvpTarget=target.id;else if(result.code==='range'&&api.canFollow())follower.start(target.id,{range:.8,attack:true});else follower.stop();return result;});}
    function attackPlayer(target){
        if(!client.state.pvp?.enabled||!target.pvp){announce('Both players must enable PvP in Character settings.','PvP');return false;}
        originals.stopAttack();api.preparePlayerAction();const range=api.playerWeapon()==='railgun'?4.7:1.25;
        if(!api.canFollow()){if(Math.hypot(target.x-player.x-.5,target.z-player.y-.5)<=range){beginAttack(target);return true;}announce('Move closer to that player.','PvP');return false;}
        follower.start(target.id,{range,attack:true});return true;
    }
    function followPlayer(target){api.preparePlayerAction();command('stopAttack');follower.start(target.id);announce('Following '+target.label+'. Click the ground to stop.','Follow');return true;}
    function draw(m,t,addTarget,actorTags){
        const ship=snapshot?.airship;
        if(ship?.active){const p=airship.state.active?airship.state.position:currentShip;for(const g of ship.grapplers||[]){const from=g.id===client.state.id?{x:player.x+.5,y:(grapplingGround??g.y)+1.4,z:player.y+.5}:g;m.rod([from.x,from.y,from.z],[p.x,p.y+.7,p.z],.018,'#c8bba2',6);for(const sign of [-1,1])m.rod([p.x,p.y+.65,p.z],[p.x+sign*.18,p.y+.45,p.z+.12],.024,'#d3dce0',6);}}
        for(const remote of client.remotePlayers()){
            if(remote.mode==='hidden'||remote.mode==='rocket'||!api.actorInView(remote.x,remote.z,remote.y))continue;
            const look=characterAppearance(normalizeCharacter(remote.appearance)),peer=client.peers.get(remote.id),mode=remote.mode==='climb'?'climb':remote.moving?'move':'idle';
            let actor=remoteActors.get(remote.id);if(!actor){actor={networkPlayer:true,height:1.95,combatKind:'player',max:30};remoteActors.set(remote.id,actor);}Object.assign(actor,remote,{label:remote.name,base:remote.y});
            const start=m.data.length,dead=remote.hp===0,death=Math.min(1,(t-(peer?.deathAt||t))/700);
            if(remote.mode==='bomber')drawStealthBomber(m,{x:remote.x,y:remote.y,z:remote.z},remote.angle,{time:t});
            else api.human(m,remote.x,remote.z,remote.y+.07,remote.angle,remote.phase,false,look.skin,look.shirt,{...look,mode:dead?'idle':mode,motion:dead?0:remote.motion,run:remote.moving?1:0,action:dead?'caught':remote.mode==='parachute'?'parachute':remote.mode==='dance'?'dance':remote.gesture||null,actionT:dead?1:.5,time:t*.001});
            if(remote.mode==='parachute')drawParachute(m,{x:remote.x,y:remote.y,z:remote.z},remote.angle,t);
            if(look.cape&&remote.mode!=='bomber')drawKrakenCape(m,remote.x,remote.z,remote.y+.07,remote.angle,t,api.signs);
            if(remote.gesture==='drink'&&remote.mode!=='bomber')drawDrinkingCoffee(m,{x:remote.x-.5,y:remote.z-.5,angle:remote.angle},remote.y+.07,t,t-800);
            if(dead)collapseCharacterMesh(m,start,remote.x,remote.y+.07,remote.z,remote.angle,death);else addTarget(start,{npc:actor});
            actorTags.push({x:remote.x,z:remote.z,base:remote.y,height:2.2,player:true,pvp:remote.pvp,label:remote.name,speech:peer?.speech,speechUntil:peer?.speechUntil||0});
        }
        for(const id of remoteActors.keys())if(!client.peers.has(id))remoteActors.delete(id);
    }
    return {command,beforeUpdate,draw,inspect,followPlayer,attackPlayer,stopFollowing:move=>follower.stop(move),get following(){return follower.state.target;},get combatTarget(){return client.state.pvpTarget?remoteActors.get(client.state.pvpTarget):null;},get active(){return true;},get traversing(){return grapplingGround!==null;},get ground(){return grapplingGround;},get sharedAirship(){return snapshot?.airship;},get airshipPosition(){if(!currentShip)return null;const p=interpolateNetworkPose(previousShip,currentShip,(performance.now()-shipAt)/120);return {x:p.x,y:p.y,z:p.z};},get captain(){return snapshot?.airship?.captain===client.state.id;},buyGrapple:()=>{client.checkpoint(true);return command('buyGrapple');},grapple:()=>command('grapple'),releaseTiger:()=>command('releaseTiger'),teleport:(x,z)=>command('teleport',{x,z}),update(pose){client.update(pose);},say:text=>client.say(text),checkpoint:()=>client.checkpoint(true)};
}
