export const STRENGTH_XP_RATE=10;
const strengthWeights=Array.from({length:9},(_,i)=>(i+1)**1.7),strengthWeightSum=strengthWeights.reduce((a,b)=>a+b,0);
export const STRENGTH_THRESHOLDS=Object.freeze([0,...strengthWeights.map((_,i)=>Math.round(12000*strengthWeights.slice(0,i+1).reduce((a,b)=>a+b,0)/strengthWeightSum))]);
export function strengthStatus(xp){
    xp=Number.isFinite(Number(xp))?Math.max(0,Math.min(12000,Number(xp))):0;let level=1;
    while(level<10&&xp>=STRENGTH_THRESHOLDS[level])level++;
    const low=STRENGTH_THRESHOLDS[level-1],high=STRENGTH_THRESHOLDS[level]??low;
    return {level,xp,percent:level===10?100:100*(xp-low)/(high-low),next:level===10?null:level+1};
}
export function createStrength(saved={},onSave=()=>{}){
    const state={xp:strengthStatus(saved?.xp).xp,funded:!!saved?.funded};let dirtyTime=0;
    const save=()=>{dirtyTime=0;onSave({...state});};
    return {state,get status(){return strengthStatus(state.xp);},train(seconds){
        if(!Number.isFinite(seconds)||seconds<=0||state.xp>=12000)return null;
        const before=strengthStatus(state.xp).level;state.xp=Math.min(12000,state.xp+seconds*STRENGTH_XP_RATE);dirtyTime+=seconds;
        const after=strengthStatus(state.xp).level;if(dirtyTime>=2||after!==before)save();
        return after!==before?after:null;
    },claim(economy){
        if(strengthStatus(state.xp).level<10)return {ok:false,message:'Reach strength level 10 at SF Fitness before we invest.'};
        if(state.funded)return {ok:false,message:'We have already funded you. Make those 1,000 coins count.'};
        const result=economy.trade('capital');if(result.ok){state.funded=true;save();}return result;
    },save};
}
