import {ITEM_STATS} from './item-stats.js';
export const ALIEN_TARGETS=Object.freeze([
    {id:'alien-civic',area:'City Hall forecourt'},
    {id:'alien-ferry',area:'Ferry Building promenade'},
    {id:'alien-venture',area:'Venture Exchange'},
    {id:'alien-industrial',area:'American Industrial Center'},
    {id:'alien-square',area:'Times Square'},
    {id:'alien-sand-hill',area:'Sand Hill Road'}
].map(Object.freeze));
const alienIDs=new Set(ALIEN_TARGETS.map(a=>a.id));

/** Quest permission, equipment and defeated IDs are persisted independently
 * of sprites. Repeated clicks and reloads cannot duplicate kills or rewards. */
export function createTheyLiveQuest(saved={},onChange=()=>{}){
    const started=saved?.started===true,evidence=started&&saved.evidence===true,permitted=evidence&&saved.permit===true,armed=permitted&&saved.bayonet===true;
    const state={started,evidence,permit:permitted,bayonet:armed,defeated:permitted&&Array.isArray(saved.defeated)?[...new Set(saved.defeated.filter(id=>alienIDs.has(id)))]:[],completed:false,skateboard:false};
    state.completed=state.permit&&state.defeated.length===ALIEN_TARGETS.length&&saved.completed===true;state.skateboard=state.completed;
    const save=()=>onChange({...state,defeated:[...state.defeated]});
    const clear=()=>state.defeated.length===ALIEN_TARGETS.length;
    function start(){if(state.started)return {ok:false};state.started=true;save();return {ok:true,message:'Quest started: They Live. Wear the sunglasses, and speak to the City Hall clerk about what you see.'};}
    function certificate(){if(!state.started)return {ok:false,message:'You have no unusual observations to report.'};if(state.evidence)return {ok:false,message:'Your Alien Evidence Certificate is already on file.'};state.evidence=true;save();return {ok:true,message:'You receive an Alien Evidence Certificate from the Berkeley Institute for Esoteric Studies. Bring it to the City Hall clerk.'};}
    function permit(){if(!state.started||!state.evidence)return {ok:false,message:'The clerk requires an Alien Evidence Certificate from the Berkeley Institute for Esoteric Studies.'};if(state.permit)return {ok:false,message:'Your alien-removal permit is already valid.'};state.permit=true;save();return {ok:true,message:'The clerk stamps your alien-removal permit. Get a bayonet at the American Industrial Center, two blocks northeast of UCSF Hospital. The permit covers revealed aliens only.'};}
    function weapon(){if(!state.permit)return {ok:false,message:'The armorer needs to see your alien-removal permit first.'};if(state.bayonet)return {ok:false,message:'You already have your bayonet.'};state.bayonet=true;save();return {ok:true,message:'The armorer gives you a bayonet. Keep your sunglasses on to identify the six disguised aliens before attacking.'};}
    function attack(id,{revealed=false}={}){
        if(!alienIDs.has(id)||!revealed||!state.started||!state.permit)return {ok:false,illegal:true,message:'You attack a citizen without valid authorization. The police are on their way!'};
        if(state.defeated.includes(id))return {ok:false,message:'This alien has already been defeated.'};
        return {ok:true};
    }
    function defeat(id,options){const result=attack(id,options);if(!result.ok)return result;state.defeated.push(id);save();return {ok:true,message:'Alien defeated ('+state.defeated.length+'/'+ALIEN_TARGETS.length+'). '+(clear()?'Return to the City Hall clerk for your reward.':'Your permit is in order. The police leave you alone.')};}
    function reward(){if(state.completed)return {ok:false,message:'You already received your skateboard.'};if(!state.permit||!clear())return {ok:false,message:'The clerk is waiting for you to defeat all six aliens.'};state.completed=true;state.skateboard=true;save();return {ok:true,message:'Quest complete: They Live! The clerk thanks you and gives you a skateboard. Ride it with K or the Skateboard button. You keep the sunglasses. The American Industrial Center’s full stock is now unlocked.'};}
    function entry(){
        const stage=state.completed?'completed':clear()?'carrying':state.started?'accepted':'not-started';
        const description=state.completed?'The invasion is over. Your skateboard and sunglasses are yours to keep.':!state.started?'Pick up the sunglasses on Ocean Beach.':!state.evidence?'Talk to the City Hall clerk, then report the disguised aliens to the Berkeley Institute for Esoteric Studies, across the Bay Bridge.':!state.permit?'Bring your Alien Evidence Certificate to the City Hall clerk.':clear()?'All six aliens are defeated. Return to the City Hall clerk for your skateboard.':!state.bayonet?'Get a bayonet from the American Industrial Center, two blocks northeast of UCSF Hospital. A bayonet is required to cut the green spectres apart; training strength improves your damage.':'Wear the sunglasses and cut the six green spectres apart with your bayonet. Your permit protects you from arrest for these attacks.';
        return {id:'they-live',title:'They Live',stage,status:state.completed?'Complete':clear()?'Ready for reward':'In progress',description,rewardLabel:'Skateboard · keep the sunglasses',targets:state.permit?ALIEN_TARGETS.map(a=>({...a,done:state.defeated.includes(a.id)})):[]};
    }
    return {state,start,certificate,permit,weapon,attack,defeat,reward,entry,isTarget:id=>alienIDs.has(id),isDefeated:id=>state.defeated.includes(id)};
}

export function theyLiveDialogue(npc,quest,{buyBattleaxe}={}){
    const s=quest.state,p={...npc,decline:'Leave'};
    if(npc.questRole==='clerk'){
        if(!s.started)return {...p,intro:'City Hall issues a permit for nearly everything. Sometimes the category has to be invented first.',question:'What do you do here?',choice:'Ask about the office',receipt:'Permits, certificates, authorizations. Come back when you have an activity that needs permitting.'};
        if(s.completed)return {...p,intro:'Thank you again. Six fewer extraterrestrial influence operations, one more skateboard. A fine day for municipal government.',question:'How is the city doing?',choice:'Check in',receipt:'Your sunglasses remain yours. Please observe the usual rules of the road on that skateboard.'};
        if(s.defeated.length===ALIEN_TARGETS.length)return {...p,intro:'All six? Excellent work. On behalf of the city: thank you. We had a surplus skateboard in the evidence locker. It is yours now.',question:'Collect your reward?',choice:'Accept skateboard',accept:quest.reward};
        if(!s.evidence)return {...p,intro:'Aliens? You cannot simply go around attacking people on the strength of a pair of sunglasses. We need documentary evidence.',question:'Ask about an alien-removal permit?',choice:'How do I get evidence?',receipt:'The Berkeley Institute for Esoteric Studies, across the Bay Bridge, certifies this sort of thing. Bring me an Alien Evidence Certificate.'};
        if(!s.permit)return {...p,intro:'An Alien Evidence Certificate! Properly embossed, too. We can authorize removal of the six revealed aliens.',question:'File the certificate and issue a permit?',choice:'Receive alien-removal permit',accept:quest.permit};
        return {...p,intro:'Your alien-removal permit is valid. It does not authorize attacks on ordinary people.',question:'What next?',choice:'Review the assignment',receipt:!s.bayonet?'Pick up a bayonet at the American Industrial Center, northeast of UCSF Hospital.':s.defeated.length+' of six aliens defeated. Your Quest Menu lists their neighborhoods. Wear the sunglasses to identify them.'};
    }
    if(npc.questRole==='esoteric'){
        if(!s.started)return {...p,intro:'We investigate phenomena that ordinary institutes put in the footnotes. Have you noticed anything unusual?',question:'What do you study?',choice:'Ask about esoteric studies',receipt:'Apparitions, impossible coincidences, and suspiciously persuasive advertising. Return if you see something peculiar.'};
        if(!s.evidence)return {...p,intro:'Skull-faced beings hiding behind ordinary faces? Subliminal commands in the advertisements? Yes, that is a fairly conclusive Tuesday.',question:'Tell the institute about the aliens?',choice:'Report the aliens',accept:quest.certificate};
        return {...p,intro:'Your Alien Evidence Certificate is authentic. We used the good paper.',question:'Where do I take it?',choice:'Ask about the certificate',receipt:'Take it to the City Hall clerk in San Francisco. The city insists on issuing its own permit. Naturally.'};
    }
    if(npc.questRole==='armorer'&&s.completed)return {...p,intro:'Your civic service has unlocked the American Industrial Center’s full stock. Welcome back! Our battleaxe sits between a bayonet and a railgun in damage, with a very satisfying heft.',question:'Browse the unlocked stock?',choices:[{label:'Buy battleaxe · '+ITEM_STATS.battleaxe.price+' coins',accept:buyBattleaxe||(()=>({ok:false,message:'Speak to the armorer at the American Industrial Center.'}))},{label:'Ask about the workshop',receipt:'Precision instruments, impractical ambitions, and fifty-coin battleaxes. Please keep the bayonet for spectres.'}]};
    if(npc.questRole==='armorer')return {...p,intro:!s.started?'Welcome to the American Industrial Center. Workshops, machine tools, and objects with very specific uses.':!s.permit?'A bayonet? Show me a municipal alien-removal permit, then we can talk.':s.bayonet?'A bayonet is a tool. Your permit is the paperwork. Please keep track of both.':'Valid permit. Here is a well-made bayonet for a deeply unusual civic assignment.',question:s.permit&&!s.bayonet?'Take the bayonet?':'Ask about the workshop?',choice:s.permit&&!s.bayonet?'Collect bayonet':'Ask about industrial supplies',accept:s.permit&&!s.bayonet?quest.weapon:undefined,receipt:'We manufacture precision instruments. For this job, precision begins with identifying your target through the sunglasses.'};
    throw new Error('Unknown They Live quest role');
}
