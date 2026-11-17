import {PUBLIC_INSTANCE,privateMapInstance,ILLUMINATI_CAVE,ILLUMINATI_PRICE,guildSecretSites} from './map-instances.js';
import {insideGuild} from './guild.js';
import {createStealthBomber,BOMBER_LAUNCH,BOMBER_REPLACEMENT_MESSAGE,BOMB_COOLDOWN_MS,BOMB_FALL_MS,bombTileArea,bomberLanding,createBomberDescent} from './stealth-bomber.js';

/** The browser owns presentation and personal travel. The backend owns paid
 * initiation, instance permissions, bomb cooldowns and shared cow damage. */
export function createSecretAdventures({client=null,saved={},save=()=>{},economy,guildMember,guildSite,getPlayer,ground,landingFree=()=>false,landingFallback,cruiseHeight,boostSpeed,transition,onPurse=()=>{},onMessage=()=>{},onCowHit=()=>{},onOfflineBomb=()=>{},now=Date.now,frameTime=()=>performance.now()}){
    let instance=PUBLIC_INSTANCE,initiated=saved.initiated===true,returnPoint=null,boardPending=false;
    const bomber=createStealthBomber({ground,now,cruiseHeight,boostSpeed}),bombs=[],crashes=[];bomber.state.bombReadyAt=Number(saved.bombReadyAt)||0;
    const persist=()=>save({initiated,bombReadyAt:bomber.state.bombReadyAt});
    const sites=guildSecretSites(guildSite);
    function change(next,position,aircraft=null){instance=next;if(aircraft?.active)bomber.board(position);else bomber.stop();transition({instance,position,bomber:aircraft});}
    function accept(message){
        if(message.illuminati!==undefined)initiated=message.illuminati;
        if(message.bomber)bomber.state.bombReadyAt=message.bomber.readyAt-(client?.state.serverOffset||0);
        if(message.type==='instance')change(message.instance,message.position,message.bomber);
        if(message.type==='welcome'){instance=message.instance||PUBLIC_INSTANCE;bomber.stop();}
        if(message.type==='bombLaunched')bombs.push({...message.bomb,started:frameTime(),impacted:true});
        if(message.type==='cowBombed')onCowHit(message);
        if(message.type==='bomberLanded')onMessage(message.message,'Illuminati');
        if(message.type==='bomberEjected'){
            crashes.push({...message.crash,started:frameTime()});
            if(message.player===client?.state.id){bomber.eject(message.flight);transition({instance:PUBLIC_INSTANCE,position:message.flight.from,bomber:{active:true,phase:'parachuting'}});}
        }
    }
    if(client){initiated=client.state.illuminati===true;if(client.state.bomber)bomber.state.bombReadyAt=client.state.bomber.readyAt-(client.state.serverOffset||0);client.subscribe(accept);}
    async function remote(action,args={}){const r=await client.command(action,args);if(r.message)onMessage(r.message,r.ok?'Illuminati':'Server');return r;}
    function join(){
        if(client)return remote('joinIlluminati');
        const p=getPlayer();if(!guildMember()||!insideGuild(guildSite,p.x,p.z))return {ok:false,message:'Speak to the Old Man inside the guild.'};
        if(initiated)return {ok:true,message:'You are already initiated. The underground stairway is open.'};
        if(economy.state.coins<ILLUMINATI_PRICE)return {ok:false,message:'Initiation costs 250,000 coins.'};
        economy.state.coins-=ILLUMINATI_PRICE;initiated=true;onPurse(economy.state);persist();return {ok:true,message:'You donate 250,000 coins and join the Illuminati. The passage to the underground hangar is open.'};
    }
    function enterCave(){
        if(client)return remote('instanceEnter',{kind:'illuminati'});
        if(!initiated)return {ok:false,message:'Speak to the Old Man about joining the Illuminati first.'};
        returnPoint=getPlayer();change(privateMapInstance('illuminati','local'),{...ILLUMINATI_CAVE.entrance,y:ILLUMINATI_CAVE.floor+.025});return {ok:true,message:'You descend into the underground hangar.'};
    }
    function leave(){
        if(client)return remote('instanceLeave');
        change(PUBLIC_INSTANCE,returnPoint||getPlayer());returnPoint=null;return {ok:true,message:'You return to the city.'};
    }
    function boardBomber(){
        if(client)return remote('bomberBoard');
        if(!initiated||instance.kind!=='illuminati')return {ok:false,message:'Your B-2 is in the underground hangar.'};
        change(PUBLIC_INSTANCE,BOMBER_LAUNCH,{active:true});return {ok:true,message:'You take the B-2 out over the Pacific. Click to fly; hold Control for rocket speed. Space drops a bomb. Land by parachuting out.'};
    }
    function returnBomber(){if(client)return remote('bomberReturn');change(privateMapInstance('illuminati','local'),{...ILLUMINATI_CAVE.boarding,y:ILLUMINATI_CAVE.floor+.025});return {ok:true,message:'You return to the underground hangar.'};}
    function ejectBomber(){
        if(client)return remote('bomberEject');
        if(!bomber.state.active||bomber.state.phase!=='flying')return {ok:false,message:'You are not flying your B-2.'};
        const from=bomber.state.position,to=bomberLanding(from.x,from.z,{free:landingFree,ground,fallback:landingFallback});
        if(!to)return {ok:false,message:'Fly closer to land before parachuting out.'};
        const flight=createBomberDescent(from,to,bomber.state.heading),impact={x:from.x+Math.cos(flight.heading)*30,z:from.z+Math.sin(flight.heading)*30};
        crashes.push({from:{...from},heading:flight.heading,to:{...impact,y:ground(impact.x,impact.z)},started:frameTime()});bomber.eject(flight);
        transition({instance:PUBLIC_INSTANCE,position:flight.from,bomber:{active:true,phase:'parachuting'}});return {ok:true,message:'You parachute out as the B-2 flies on to a spectacularly small crash. '+BOMBER_REPLACEMENT_MESSAGE};
    }
    function dropBomb(){
        if(client)return remote('bomberBomb');
        if(!bomber.state.active||bomber.state.phase!=='flying')return {ok:false,message:'Board your B-2 first.'};
        if(bomber.bombSeconds)return {ok:false,message:'Bomb bay reloading: '+bomber.bombSeconds+' seconds.'};
        const p=bomber.state.position;for(const b of bombs)if(!b.impacted&&frameTime()-b.started>=BOMB_FALL_MS){b.impacted=true;onOfflineBomb(b);}
        bombs.push({...bombTileArea(p.x,p.z),from:{...p},started:frameTime(),impacted:false});bomber.state.bombReadyAt=now()+BOMB_COOLDOWN_MS;persist();return {ok:true,message:'Bomb released. Cows only; 100 damage in a 3×3 area.'};
    }
    function update(dt,controls){if(bomber.update(dt,controls)==='landed'&&!client){const position={...bomber.state.position};change(PUBLIC_INSTANCE,position);onMessage('You land gently. '+BOMBER_REPLACEMENT_MESSAGE,'Illuminati');}
        for(let i=crashes.length-1;i>=0;i--)if(frameTime()-crashes[i].started>6200)crashes.splice(i,1);
        for(let i=bombs.length-1;i>=0;i--){const b=bombs[i],age=frameTime()-b.started;if(!b.impacted&&age>=BOMB_FALL_MS){b.impacted=true;onOfflineBomb(b);}if(age>2200)bombs.splice(i,1);}}
    function boardKraken(game){
        if(boardPending||game.ship.aboard||!game.state.railgun||game.state.krakenReward)return {ok:false,message:'The Pequod is not ready to sail.'};
        if(client){boardPending=true;remote('instanceEnter',{kind:'kraken'}).then(r=>{boardPending=false;if(r.ok)game.board();});return {ok:true};}
        returnPoint=getPlayer();change(privateMapInstance('kraken','local',game.ship.home),getPlayer());return game.board();
    }
    return {bomber,bombs,crashes,sites,join,enterCave,leave,boardBomber,returnBomber,ejectBomber,dropBomb,update,boardKraken,get instance(){return instance;},get kind(){return instance.kind;},get initiated(){return initiated;},reset(){instance=PUBLIC_INSTANCE;bomber.stop();bombs.length=0;crashes.length=0;returnPoint=null;},accept};
}
