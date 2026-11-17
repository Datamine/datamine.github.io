export const GUILD_RESET_MS=3600000,GUILD_RESETS_REQUIRED=24,PEPTIDE_SPAWN_MS=600000;
export const GUILD_BUILDINGS=Object.freeze([
    {id:'freemasons-guild',name:"Freemasons' Guild",label:"Freemasons' Guild",category:'Nob Hill · members club',x:38,y:24,w:4.4,d:3.8,h:100,worldHeight:3.15,color:'#b8a58a',trim:'#ddd0aa',style:'civic',roof:'gable',roofColor:'#5b7779',activityBuilding:true,description:'A sandstone lodge with a checkerboard floor, brass compasses and an unusually well-funded refreshments committee. Ray, in the red suit, handles admission.'},
    {id:'sunset-whole-foods',name:'WHOLE FOODS',label:'Sunset Whole Foods',category:'Sunset · groceries & unusual supplements',x:17,y:40,w:4,d:3,h:62,color:'#91a182',trim:'#e0d9bd',style:'shop',roof:'flat',roofColor:'#5a7061',activityBuilding:true,description:'Organic produce, immaculate shelving and an unpredictable supplement supply chain. A shared vial of peptides appears at a random spot on the forecourt every ten minutes.'}
]);

/** Each return requires a full server-clock hour since the last qualifying
 * visit. Missed hours never turn into automatic promotions. */
export function createGuildMembership(saved={},now=Date.now,onSave=()=>{}){
    // Keep the existing progress field so saved hourly ranks remain intact.
    // A prior one-vial admission becomes one paid promotion under this rule.
    const state={version:2,visits:Math.max(0,Math.min(GUILD_RESETS_REQUIRED,Number.isInteger(saved.visits)?saved.visits:0)),lastVisitAt:Number.isSafeInteger(saved.lastVisitAt)&&saved.lastVisitAt>=0?saved.lastVisitAt:null,member:false};
    if(saved.version!==2&&saved.member===true&&state.visits<GUILD_RESETS_REQUIRED)state.visits++;
    state.member=state.visits===GUILD_RESETS_REQUIRED;
    const status=()=>({...state,rank:state.visits+1,required:GUILD_RESETS_REQUIRED,nextVisitAt:state.lastVisitAt===null?0:state.lastVisitAt+GUILD_RESET_MS});
    function checkIn(){
        if(state.member)return {ok:true,message:'Welcome back. The lodge is open to you.',guild:status()};
        const time=now();
        if(state.lastVisitAt!==null&&time<state.lastVisitAt+GUILD_RESET_MS)return {ok:false,message:'You are Rank '+(state.visits+1)+'. Return in '+Math.ceil((state.lastVisitAt+GUILD_RESET_MS-time)/60000)+' minutes; a full hour must pass between qualifying visits.',guild:status()};
        if(state.lastVisitAt!==null)state.visits++;
        state.lastVisitAt=time;if(state.visits>=GUILD_RESETS_REQUIRED)state.member=true;onSave({...state});
        return {ok:true,message:state.member?'Rank 25. Twenty-four promotions. Welcome to the Freemasons’ Guild!':'You are now Rank '+(state.visits+1)+'. '+state.visits+'/24 promotions completed. Return after at least one full hour for your next promotion, or donate one vial of peptides to gain one rank immediately.',guild:status()};
    }
    function donate(consume){
        if(state.member)return {ok:true,message:'You are already a member. Keep your peptides; the refreshments committee is quite lively enough.',guild:status()};
        if(!consume())return {ok:false,message:'Bring me one vial of peptides. Try the Whole Foods in the Sunset; a shared vial appears every ten minutes.',guild:status()};
        state.visits++;state.lastVisitAt??=now();state.member=state.visits===GUILD_RESETS_REQUIRED;onSave({...state});
        return {ok:true,message:state.member?'Your twenty-fourth promotion. Rank 25! Welcome to the Freemasons’ Guild!':'One vial, one promotion. You are now Rank '+(state.visits+1)+' ('+state.visits+'/24 promotions).',guild:status()};
    }
    return {state,status,checkIn,donate};
}

export function insideGuild(site,x,z){
    if(!site)return false;const a=site.rotation||0,c=Math.cos(a),s=Math.sin(a),dx=x-site.x-site.w/2,dz=z-site.y-site.d/2;
    return Math.abs(dx*c+dz*s)<site.w/2-.12&&Math.abs(-dx*s+dz*c)<site.d/2-.12;
}
export function guildDialogue(ray,{status,act}){
    const info=status();
    return {...ray,intro:info.member?'Welcome back. The lodge, the library, and the geometrically arranged biscuits are yours.':'Ray, admissions. You start at Rank 1. Each hourly return or donated vial of peptides earns one rank. Reach Rank 25 to enter: 24 returns, 24 peptides, or a mixture of both.',question:()=>{const current=status();return current.member?'Your membership is confirmed. Welcome to the lodge.':'Rank '+current.rank+' · '+current.visits+'/24 promotions. Peptides carried: '+(current.peptides||0)+'.';},decline:'Leave',repeat:true,
        choices:[{label:info.member?'Review membership':'Check in · request promotion',accept:()=>act('checkIn')},{label:'Donate 1 peptide · gain 1 rank',accept:()=>act('donate')}]};
}

/** Every point is selected from authored, reachable pavement, never a
 * random tile anywhere in the city or a point inside shelving. */
export function peptideSpawnPoints(site,walkable){
    const angle=site.rotation||0,c=Math.cos(angle),s=Math.sin(angle),cx=site.x+site.w/2,cz=site.y+site.d/2,points=[];
    for(const u of [-1.2,-.6,0,.6,1.2])for(const v of [.55,.95]){
        const x=cx+u*c-(site.d/2+v)*s,z=cz+u*s+(site.d/2+v)*c;
        if(walkable(x-.5,z-.5))points.push({x,z});
    }
    if(!points.length)throw Error('Sunset Whole Foods needs a reachable peptide forecourt');return points;
}
