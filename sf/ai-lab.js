import {drawNeuralLabInterior} from './ai-lab-interior.js';
export const AI_INTERVIEW_SECONDS=120;
export const AI_INTERVIEW_PASS_SCORE=40;
export const AI_LAB_PAY_INTERVAL=2;

// Matches arithmetic.zetamac.com's normal settings: uniformly mixed operations,
// 2–100 addends, 2–12 × 2–100 factors, and their inverse problems.
export function arithmeticProblem(random=Math.random){
    const integer=(min,max)=>min+Math.min(max-min,Math.floor(Math.max(0,random())*(max-min+1)));
    const operation=integer(0,3),a=integer(2,operation>=2?12:100),b=integer(2,100);
    return operation===0?{text:a+' + '+b,answer:a+b,operation:'add'}:
        operation===1?{text:(a+b)+' − '+a,answer:b,operation:'subtract'}:
        operation===2?{text:a+' × '+b,answer:a*b,operation:'multiply'}:
        {text:(a*b)+' ÷ '+a,answer:b,operation:'divide'};
}

/** A deadline, rather than frame counting, gives every interview two real
 * minutes, including slow frames, tab switching and sleep. */
export function createArithmeticInterview({clock=()=>performance.now(),random=Math.random}={}){
    const state={phase:'ready',score:0,deadline:0,remaining:AI_INTERVIEW_SECONDS,problem:null};
    function update(){
        if(state.phase!=='running')return;
        state.remaining=Math.max(0,(state.deadline-clock())/1000);
        if(state.remaining===0)state.phase='finished';
    }
    return {state,start(){
        if(state.phase==='running')return false;
        Object.assign(state,{phase:'running',score:0,deadline:clock()+AI_INTERVIEW_SECONDS*1000,remaining:AI_INTERVIEW_SECONDS,problem:arithmeticProblem(random)});return true;
    },submit(value){
        update();if(state.phase!=='running'||!/^\d+$/.test(String(value).trim())||Number(value)!==state.problem.answer)return false;
        state.score++;state.problem=arithmeticProblem(random);return true;
    },update,cancel(){if(state.phase==='running'){state.phase='cancelled';state.remaining=Math.max(0,(state.deadline-clock())/1000);}},
    result(){update();const finished=state.phase==='finished';return {finished,score:state.score,elapsed:finished?AI_INTERVIEW_SECONDS:AI_INTERVIEW_SECONDS-state.remaining,passed:finished&&state.score>=AI_INTERVIEW_PASS_SCORE};}};
}

export function createAILabJob({saved={},economy,onSave=()=>{}}){
    const bestScore=Number.isSafeInteger(saved?.bestScore)&&saved.bestScore>=0?saved.bestScore:0;
    const state={hired:saved?.hired===true&&bestScore>=AI_INTERVIEW_PASS_SCORE,bestScore,payElapsed:0};
    return {state,recordInterview(result){
        if(!result?.finished||result.elapsed<AI_INTERVIEW_SECONDS||!Number.isSafeInteger(result.score)||result.score<0)return {ok:false,message:'Finish the full two-minute interview first.'};
        state.bestScore=Math.max(state.bestScore,result.score);
        const hiredNow=!state.hired&&result.score>=AI_INTERVIEW_PASS_SCORE;
        if(hiredNow)state.hired=true;
        onSave({hired:state.hired,bestScore:state.bestScore});
        return {ok:true,hiredNow,message:result.score>=AI_INTERVIEW_PASS_SCORE?'You got the job! Work inside the AI Lab to earn 1 coin every 2 seconds.':'Score: '+result.score+'. You need 40 or more for the job. You can interview again whenever you like.'};
    },update(seconds,{inside,eligible=true}){
        if(!state.hired||!inside||!eligible){state.payElapsed=0;return 0;}
        if(!Number.isFinite(seconds)||seconds<=0)return 0;
        state.payElapsed+=seconds;let earned=0;
        while(state.payElapsed>=AI_LAB_PAY_INTERVAL-1e-9){
            const result=economy.trade('ai-lab-wage');if(!result.ok){state.payElapsed=0;break;}
            state.payElapsed=Math.max(0,state.payElapsed-AI_LAB_PAY_INTERVAL);earned+=result.earned;
        }
        return earned;
    }};
}

/** Public furniture entry point; the visual assets live in their own module. */
export function drawAILabInterior(m,b,base){return drawNeuralLabInterior(m,b,base);}
