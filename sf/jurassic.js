import {JURASSIC,COW_PEN,PEQUOD,KRAKEN_CAPE_TEXT} from './jurassic-layout.js';
import {rollWeaponDamage,rollEnemyDamage} from './combat.js';

export const RAILGUN_RANGE=5,RAILGUN_DAMAGE=10,RAILGUN_INTERVAL=.8;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
/** Combat, drops and journeys use simulation time, not draw calls. Routes are
 * supplied by the production adjacency graph and refreshed at most twice/s. */
export function createExpeditions({saved={},onSave=()=>{},health,economy,food=()=>{},level=()=>1,player=()=>({x:0,z:0,base:0,eligible:true}),pedestrians=()=>[],routeTo=()=>null,canTravel=()=>false,lineClear=()=>true,random=Math.random,onEvent=()=>{}}={}){
    const stages=['not-started','escaped','carrying','completed'];
    const state={raptor:stages.includes(saved.raptor)?saved.raptor:'not-started',railgun:saved.railgun===true,armed:false,cape:saved.cape===true,krakenDefeated:saved.krakenDefeated===true,krakenReward:saved.krakenReward===true,equipped:saved.equipped!==false,target:null,clock:0,cooldown:0,beams:[],splats:[],loot:[],victims:[]};
    if(state.raptor!=='not-started')state.railgun=true;if(state.krakenReward){state.cape=true;state.krakenDefeated=true;}
    const raptor={id:'jurassic-raptor',combatKind:'raptor',label:'Velociraptor',description:'A feathered liability with excellent acceleration and no respect for informed consent.',x:JURASSIC.cage.x,z:JURASSIC.cage.z,hp:50,max:50,angle:Math.PI/2,path:[],replan:0,attackIn:1,prey:null,phase:state.raptor==='escaped'?'loose':state.raptor==='not-started'?'caged':'recovered',release:0};
    if(raptor.phase==='loose')Object.assign(raptor,JURASSIC.exit);
    const cows=Array.from({length:3},(_,i)=>({id:'south-cow-'+i,combatKind:'cow',label:'Cow',description:'A placid cow. Somehow its emergency provisions include a sandwich.',x:COW_PEN.x-1.7+i*1.55,z:COW_PEN.z+(i%2?.65:-.55),homeX:COW_PEN.x-1.7+i*1.55,hp:20,max:20,respawn:0,angle:.3+i*1.7}));
    const ship={phase:'moored',home:null,x:0,z:PEQUOD.z,progress:0,attackIn:3.5,aboard:false};
    const kraken={id:'pacific-kraken',combatKind:'kraken',label:'Kraken',description:'A volley of railgun hits stands between this many-armed calamity and a deeply regrettable commemorative cape.',x:0,z:PEQUOD.z,hp:100,max:100,visible:false};
    let serial=0;
    const save=()=>onSave({raptor:state.raptor,railgun:state.railgun,equipped:state.equipped,cape:state.cape,krakenDefeated:state.krakenDefeated,krakenReward:state.krakenReward});
    const event=(type,message,extra={})=>onEvent({type,message,...extra});
    const drop=(kind,x,z,amount=1)=>{const item={id:'expedition-loot-'+(++serial),kind:'loot',lootKind:kind,label:kind==='coins'?amount+' coins':kind==='sandwich'?'Sandwich':kind==='raptor'?'Velociraptor remains':'Kraken spoils',x,z,amount,expires:kind==='raptor'||kind==='kraken'?Infinity:state.clock+120,description:kind==='raptor'?'The emergency recovery protocol is now considerably less mobile.':kind==='sandwich'?'A sandwich. Store it in your food bag and eat it to recover hitpoints.':kind==='kraken'?KRAKEN_CAPE_TEXT:'Loose coins, awaiting a less theoretical owner.'};state.loot.push(item);return item;};
    function killRaptor(by='player'){
        if(raptor.phase!=='loose')return;raptor.hp=0;raptor.phase='dead';raptor.path=[];state.target=null;drop('raptor',raptor.x,raptor.z);
        event('raptor-dead',by==='player'?'The velociraptor falls. Pick up its remains and bring them back to Jurassic Biosciences.':'A citizen defeats the velociraptor! Recover its remains and bring them to Jurassic Biosciences.');
    }
    function startQuest(){
        if(state.raptor!=='not-started')return {ok:false,message:'Your recovery assignment is already in the Quest Menu.'};
        state.raptor='escaped';state.railgun=true;state.equipped=true;raptor.phase='releasing';raptor.release=0;save();event('released','The scientist hands you a railgun and opens the cage. The velociraptor is loose! Click it to fire from up to five tiles away.');return {ok:true,message:'Railgun issued. Emergency recovery protocol initiated.'};
    }
    function recover(){if(state.raptor!=='escaped'||raptor.phase!=='dead')return {ok:false};state.raptor='carrying';raptor.phase='recovered';state.loot=state.loot.filter(l=>l.lootKind!=='raptor');save();return {ok:true,message:'You recover the velociraptor remains. Ask the scientist why he released it.'};}
    function finishQuest(){if(state.raptor!=='carrying')return {ok:false,message:'Recover the velociraptor first.'};state.raptor='completed';save();return {ok:true,message:'“This was a good test of the raptor escape and emergency recovery protocol.” Quest complete. You keep the railgun.'};}
    function setHarbor(home){ship.home={...home};ship.x=home.x;ship.z=home.z;}
    function board(){if(!state.railgun)return {ok:false,message:'Ahab refuses to board you without a sufficiently powerful weapon. Obtain a railgun at Jurassic Biosciences.'};if(ship.aboard)return {ok:false};if(state.krakenReward)return {ok:false,message:'Ahab is still writing the incident report. You already claimed the kraken’s reward.'};ship.aboard=true;ship.phase='outbound';ship.progress=0;ship.attackIn=3.5;kraken.hp=100;state.target=null;event('boarded','You board the Pequod. Ahab sets sail into the western Pacific.');return {ok:true,message:'All aboard the Pequod.'};}
    function returnShip(){if(!ship.aboard)return false;state.target=null;ship.phase='inbound';ship.progress=0;ship.returnX=ship.x;kraken.visible=false;return true;}
    function abandonShip(){ship.aboard=false;ship.phase='moored';if(ship.home){ship.x=ship.home.x;ship.z=ship.home.z;}kraken.visible=false;state.target=null;}
    function collect(item){
        if(!state.loot.includes(item))return {ok:false,message:'That loot has already been collected.'};
        if(item.lootKind==='raptor')return recover();
        if(item.lootKind==='coins')economy.credit(item.amount);
        if(item.lootKind==='sandwich')food(1);
        if(item.lootKind==='kraken'){
            if(state.krakenReward)return {ok:false};economy.credit(100);state.krakenReward=true;state.cape=true;save();event('cape','You collect 100 coins and a commemorative cape. Equip it in Character settings.');
        }
        state.loot.splice(state.loot.indexOf(item),1);return {ok:true,message:item.lootKind==='sandwich'?'You store a sandwich in your food bag.':item.lootKind==='kraken'?'100 coins and one lousy cape.':'You pick up '+item.amount+' coins.'};
    }
    function shoot(target,origin=player()){
        if(!state.railgun||!state.equipped)return {ok:false,message:'Equip your railgun with G. Jurassic Biosciences issues one with its recovery quest.'};
        if(state.cooldown>1e-8)return {ok:false,cooldown:true};
        if(!target||target.hp===0||target.expeditionDead||distance(origin,target)>RAILGUN_RANGE+.001||!lineClear(origin,target))return {ok:false,message:'The railgun needs a clear shot from within five tiles.'};
        if(target.combatKind==='raptor'&&raptor.phase!=='loose'||target.combatKind==='kraken'&&(!ship.aboard||ship.phase!=='fighting'))return {ok:false,message:'There is no active target.'};
        state.cooldown=RAILGUN_INTERVAL;const kind=target.combatKind||'pedestrian',damage=['spectre','pedestrian'].includes(kind)?0:Math.min(target.hp,rollWeaponDamage(level(),'railgun',random));
        state.beams.push({from:{x:origin.x,y:(origin.base||0)+1.14,z:origin.z},to:{x:target.x,y:(target.base||0)+(target.combatKind==='kraken'?1.35:.9),z:target.z},ttl:.22});
        state.splats.push({target,damage,ttl:.8});event('shot',null,{target,damage,hp:Number.isFinite(target.hp)?target.hp-damage:1,max:target.max||target.hp||1});
        if(kind==='pedestrian'){state.target=null;event('illegal','You fire at a pedestrian. The police are on their way!',{target});return {ok:true,damage:0};}
        if(kind==='spectre')return {ok:true,damage:0,message:'0 — the blue beam passes through the green spectre. A bayonet can cut its slime apart.'};
        target.hp-=damage;
        if(!target.hp){
            if(target===raptor)killRaptor();
            else if(target.combatKind==='cow'){target.respawn=10;state.target=null;drop('sandwich',target.x,target.z);event('cow-down','The cow drops a sandwich. It will respawn in ten seconds.');}
            else if(target===kraken){state.target=null;ship.phase='victory';state.krakenDefeated=true;save();drop('kraken',ship.x,ship.z);event('kraken-dead','The kraken sinks beneath the waves. Collect its spoils from the deck, then speak to Ahab to return.');}
        }
        return {ok:true,damage};
    }
    function attack(target){state.target=target;return shoot(target);}
    function damagePlayer(amount,source,target){const damage=health.damage(rollEnemyDamage(amount,level(),random));event('damage',source+' hits you for '+damage+'. '+health.state.hp+'/'+health.state.max+' hitpoints.',{damage,target,hp:health.state.hp,max:health.state.max});if(!health.state.hp){state.target=null;event('death','You have died and respawned at UCSF Hospital');}}
    function advance(dt){
        state.clock+=dt;state.cooldown=Math.max(0,state.cooldown-dt);
        for(const b of state.beams)b.ttl-=dt;state.beams=state.beams.filter(b=>b.ttl>0);
        for(const s of state.splats)s.ttl-=dt;state.splats=state.splats.filter(s=>s.ttl>0);
        state.loot=state.loot.filter(l=>l.expires>state.clock);
        for(const v of state.victims)if(v.until<=state.clock){v.npc.expeditionDead=false;v.npc.hold=0;}state.victims=state.victims.filter(v=>v.until>state.clock);
        for(const c of cows)if(!c.hp){c.respawn=Math.max(0,c.respawn-dt);if(c.respawn<=1e-8){c.hp=c.max;event('cow-respawn',null);}}
        const p=player();p.isPlayer=true;
        if(ship.aboard){
            if(ship.phase==='outbound'){ship.progress=Math.min(1,ship.progress+dt/6);const t=ship.progress*ship.progress*(3-2*ship.progress);ship.x=ship.home.x-PEQUOD.travel*t;if(ship.progress>=1-1e-8){ship.progress=1;ship.phase=state.krakenDefeated?'victory':'fighting';kraken.visible=!state.krakenDefeated;kraken.x=ship.x-4.4;kraken.z=ship.z;if(state.krakenDefeated&&!state.krakenReward&&!state.loot.some(l=>l.lootKind==='kraken'))drop('kraken',ship.x,ship.z);event('kraken-arrived','Ahab: “Moby Dick was too hard. We’ll just hunt the kraken instead.” Click the kraken to fire. Stronger hunters hit harder.');}}
            else if(ship.phase==='inbound'){ship.progress=Math.min(1,ship.progress+dt/5);ship.x=ship.returnX+(ship.home.x-ship.returnX)*ship.progress;if(ship.progress>=1-1e-8){ship.progress=1;abandonShip();event('disembarked','The Pequod returns you to the beach.');}}
            else if(ship.phase==='fighting'&&p.eligible){ship.attackIn-=dt;if(ship.attackIn<=1e-8){ship.attackIn+=4;damagePlayer(10,'The kraken',kraken);}}
        }
        if(state.target&&p.eligible&&state.cooldown<=1e-8){if(distance(p,state.target)<=RAILGUN_RANGE+.001){const result=shoot(state.target,p);if(!result.ok&&!result.cooldown)state.target=null;}else state.target=null;}
        if(state.target?.combatKind==='spectre'&&p.eligible&&distance(p,state.target)<1.8){state.spectreAttack=(state.spectreAttack||0)+dt;if(state.spectreAttack>=1.25){state.spectreAttack=0;damagePlayer(7,'The spectre',state.target);}}
        if(raptor.phase==='releasing'){raptor.release=Math.min(1,raptor.release+dt);raptor.z=JURASSIC.cage.z+(JURASSIC.exit.z-JURASSIC.cage.z)*raptor.release;if(raptor.release>=1-1e-8){raptor.phase='loose';raptor.replan=0;}return;}
        if(raptor.phase!=='loose')return;
        raptor.replan-=dt;raptor.attackIn=Math.max(0,raptor.attackIn-dt);
        if(raptor.replan<=0){
            raptor.replan=.6;const citizens=pedestrians().filter(n=>!n.expeditionDead&&!n.child&&!n.baby&&!n.dogWalker&&!n.stroller&&!n.alienId&&['Man','Woman'].includes(n.label)&&distance(n,raptor)<22);
            citizens.sort((a,b)=>distance(a,raptor)-distance(b,raptor));
            const candidates=(p.eligible&&!ship.aboard&&distance(p,raptor)<8?[p,...citizens.slice(0,4)]:[...citizens.slice(0,4),p.eligible&&!ship.aboard?p:null]).filter(Boolean);
            raptor.prey=null;raptor.path=[];
            for(const candidate of candidates){const path=routeTo(raptor,candidate);if(path){raptor.prey=candidate;raptor.path=path;break;}}
        }
        let budget=dt*5.1;
        while(budget>0&&raptor.path.length){const q=raptor.path[0],d=distance(raptor,q),step=Math.min(d,budget),next={x:raptor.x+(q.x-raptor.x)*(d?step/d:0),z:raptor.z+(q.z-raptor.z)*(d?step/d:0)};if(!canTravel(raptor,next)){raptor.path=[];raptor.replan=0;break;}raptor.angle=Math.atan2(q.z-raptor.z,q.x-raptor.x);raptor.x=next.x;raptor.z=next.z;budget-=step;if(d<=step+1e-8)raptor.path.shift();}
        const prey=raptor.prey;if(!prey||distance(raptor,prey)>1.15||raptor.attackIn>0||prey.expeditionDead)return;
        raptor.attackIn=1.5;
        if(prey===p||prey.isPlayer){if(p.eligible&&!ship.aboard&&distance(raptor,p)<1.3)damagePlayer(6,'The velociraptor',raptor);}
        else{
            const victimDies=random()<.5,raptorDies=random()<.5;
            if(victimDies){prey.expeditionDead=true;prey.hold=35;state.victims.push({npc:prey,until:state.clock+35});drop('coins',prey.x,prey.z,3+Math.floor(random()*5));event('citizen-down','The velociraptor attacks a '+prey.label.toLowerCase()+'. Coins fall to the ground.');}
            if(raptorDies)killRaptor('citizen');
            if(!victimDies&&!raptorDies)event('standoff','A citizen fends off the velociraptor. Neither looks pleased.');
            raptor.replan=0;
        }
    }
    function update(dt){if(!Number.isFinite(dt)||dt<=0)return;let remaining=Math.min(dt,60);while(remaining>1e-8){const step=Math.min(.05,remaining);advance(step);remaining-=step;}}
    function entries(){const result=[{id:'jurassic-recovery',title:'Jurassic Biosciences: Emergency Recovery',stage:state.raptor==='escaped'?'accepted':state.raptor,status:state.raptor==='not-started'?'Not started':state.raptor==='carrying'?'Ready to turn in':state.raptor==='completed'?'Complete':'In progress',description:state.raptor==='not-started'?'Ask the scientist at Jurassic Biosciences, in the green belt between northern and southern San Francisco, for a quest.':state.raptor==='escaped'?'Recover the escaped velociraptor. Equip your railgun with G; click the raptor to shoot from up to five tiles away. Pick up its remains, even if a citizen defeats it first.':state.raptor==='carrying'?'Bring the remains back to the scientist. Ask why he released the velociraptor.':'The raptor escape and emergency recovery protocol has been tested. You keep the railgun.',rewardLabel:'Railgun'}];if(state.railgun)result.push({id:'pequod-kraken',title:'Ahab’s Rather Easier Hunt',stage:state.krakenReward?'completed':'accepted',status:state.krakenReward?'Complete':'In progress',description:state.krakenReward?KRAKEN_CAPE_TEXT:'Find Captain Ahab aboard the Pequod off the western coast. Bring your railgun and sandwiches. Your strength improves railgun damage; bring food for the kraken’s heavy blows. Collect the spoils on deck, then sail home.',rewardLabel:'100 coins · commemorative cape'});return result;}
    return {state,raptor,cows,ship,kraken,startQuest,recover,finishQuest,setHarbor,board,returnShip,abandonShip,collect,shoot,attack,update,entries,stop(){state.target=null;},toggleWeapon(){if(!state.railgun)return false;state.equipped=!state.equipped;state.target=null;save();return true;}};
}

export function scientistDialogue(npc,game){
    const p={...npc,decline:'Leave'};
    if(game.state.raptor==='not-started')return {...p,intro:'Jurassic Biosciences. We make yesterday’s problems tomorrow’s growth market.',question:'Ask for a quest?',choice:'Do you have a quest for me?',accept:()=>({ok:true,message:'“Sure.” He gives you a railgun and reaches for the cage latch.',after:()=>game.startQuest()})};
    if(game.state.raptor==='carrying')return {...p,intro:'Excellent! Our field test appears to have concluded.',question:'Why did you release the raptor?',choice:'Hand over the remains and demand an explanation',accept:game.finishQuest};
    if(game.state.raptor==='completed')return {...p,intro:'This was a good test of the raptor escape and emergency recovery protocol.',question:'May I keep the railgun?',choice:'Confirm equipment ownership',receipt:'Certainly. We have classified it as a customer-success expense.'};
    return {...p,intro:'The emergency is proceeding within our confidence interval. The velociraptor is somewhere outside the cage.',question:'What am I supposed to do?',choice:'Review recovery protocol',receipt:'Equip the railgun with G. Click the raptor to shoot from five tiles away. Citizens have a fifty-fifty chance of defeating it, and a fifty-fifty chance of dying themselves. Pick up its remains and return them here.'};
}
export function ahabDialogue(npc,game){
    if(game.ship.aboard)return {...npc,intro:game.ship.phase==='victory'?'A fine hunt. Fine shooting! Collect the spoils from the deck. The cape is, regrettably, mandatory.':'Keep your railgun trained on the kraken. Your strength improves each shot. Watch your hitpoints and eat between the kraken’s blows.',question:'Return to the city?',choice:'Sail back to shore',decline:'Stay aboard',accept:()=>({ok:true,message:'Ahab turns the Pequod toward the coast.',after:()=>game.returnShip()})};
    if(!game.state.railgun)return {...npc,intro:'I refuse to board a hunter without a sufficiently powerful weapon. Come back with a railgun.',question:'Where might I find one?',choice:'Ask about a railgun',receipt:'Jurassic Biosciences, in the green belt between northern and southern San Francisco. Their safety department seems unusually generous.'};
    return {...npc,intro:'A railgun! Now there is a weapon fit for the Pequod.',question:'What happened to Moby Dick?',choice:'Ask about Moby Dick',decline:'Leave',choices:[{label:'What happened to Moby Dick?',next:{intro:'Too hard. We’ll just hunt the kraken instead.',question:'Board the Pequod for the kraken hunt?',choice:'Board the Pequod',choices:null,decline:'Stay ashore',accept:()=>({ok:true,message:'Ahab unfurls the sails.',after:()=>game.board()})}}]};
}
