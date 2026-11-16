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
            state.payElapsed=Math.max(0,state.payElapsed-AI_LAB_PAY_INTERVAL);earned++;
        }
        return earned;
    }};
}

/** Native computer desks, GPU racks and a very optimistic whiteboard. The
 * central aisle and doorway remain clear in the shared navigation model. */
export function drawAILabInterior(m,b,base){
    const {x,y:z,w}=b;
    m.box(x+.12,base-.01,z+.12,w-.24,.035,b.d-.24,'#a7b6ae','wood');
    for(const xx of [x+.22,x+w-.78]){
        m.box(xx,base,z+.18,.55,1.58,.48,'#354852',{metal:.2});
        for(let row=0;row<7;row++){
            m.box(xx+.035,base+.1+row*.2,z+.671,.48,.14,.015,'#536a72');
            for(let vent=0;vent<6;vent++)m.box(xx+.065+vent*.067,base+.14+row*.2,z+.69,.04,.018,.006,'#263c45');
            m.sphere(xx+.45,base+.2+row*.2,z+.696,.012,.012,.008,row%3?'#7eb5b0':'#d5b878',8,4,{emissive:.35});
        }
    }
    const deskX=x+.2,deskZ=z+1.15;
    for(const dx of [0,.56])for(const dz of [0,.68])m.box(deskX+dx,base,deskZ+dz,.035,.73,.035,'#65828a',{metal:.2});
    m.box(deskX-.025,base+.73,deskZ-.025,.66,.055,.8,'#c3b58d','wood');
    m.box(deskX+.05,base+.84,deskZ+.1,.045,.39,.48,'#293e49');m.box(deskX+.099,base+.865,deskZ+.125,.008,.33,.43,'#85b8b6',{emissive:.22});
    for(let line=0;line<5;line++)m.box(deskX+.109,base+.91+line*.045,deskZ+.17,.005,.012,.18+(line%3)*.05,'#d3e4ca');
    m.box(deskX+.25,base+.788,deskZ+.2,.22,.022,.36,'#62777e');
    m.box(deskX+.8,base+.43,deskZ+.25,.34,.055,.34,'#627b7d');m.box(deskX+1.11,base+.45,deskZ+.25,.04,.4,.34,'#627b7d');
    m.box(x+w-1.28,base+.85,z+.115,.85,.55,.02,'#e3e8d9');
    for(const [u,v] of [[.1,.1],[.1,.3],[.4,.2],[.7,.1],[.7,.3]])m.sphere(x+w-1.28+u,base+.9+v,z+.145,.025,.025,.008,'#5b8e95',8,4);
    for(const [a,c] of [[[.1,.1],[.4,.2]],[[.1,.3],[.4,.2]],[[.4,.2],[.7,.1]],[[.4,.2],[.7,.3]]])m.rod([x+w-1.28+a[0],base+.9+a[1],z+.145],[x+w-1.28+c[0],base+.9+c[1],z+.145],.006,'#7e9a96',5);
    b.interiorObstacles=[[[x+.2,z+.16],[x+.79,z+.16],[x+.79,z+.72],[x+.2,z+.72]],[[x+w-.8,z+.16],[x+w-.2,z+.16],[x+w-.2,z+.72],[x+w-.8,z+.72]],[[deskX-.025,deskZ-.025],[deskX+.64,deskZ-.025],[deskX+.64,deskZ+.78],[deskX-.025,deskZ+.78]]];
}
