import test from 'node:test';
import assert from 'node:assert/strict';
import {arithmeticProblem,createArithmeticInterview,createAILabJob,drawAILabInterior,AI_INTERVIEW_SECONDS} from '../ai-lab.js';
import {createEconomy} from '../economy.js';
import {Mesh} from '../geometry.js';

test('the normal interview uses all four operations, default operand ranges and exact inverse problems',()=>{
    for(let operation=0;operation<4;operation++)for(const [u,v] of [[0,0],[.999999,.999999],[.4,.7]]){
        const values=[(operation+.1)/4,u,v];const p=arithmeticProblem(()=>values.shift()),[left,,right]=p.text.split(' '),a=Number(left),b=Number(right);
        assert.equal(p.operation,['add','subtract','multiply','divide'][operation]);
        if(operation===0){assert.ok(a>=2&&a<=100&&b>=2&&b<=100);assert.equal(p.answer,a+b);}
        if(operation===1){assert.ok(b>=2&&b<=100&&p.answer>=2&&p.answer<=100);assert.equal(a-b,p.answer);}
        if(operation===2){assert.ok(a>=2&&a<=12&&b>=2&&b<=100);assert.equal(p.answer,a*b);}
        if(operation===3){assert.ok(b>=2&&b<=12&&p.answer>=2&&p.answer<=100);assert.equal(a/b,p.answer);}
    }
});

function interview(score){
    let now=0;const game=createArithmeticInterview({clock:()=>now,random:()=>.5});game.start();
    for(let i=0;i<score;i++)assert.ok(game.submit(String(game.state.problem.answer)));
    return {game,advance:milliseconds=>{now+=milliseconds;game.update();}};
}
test('only completed interviews with 40 or more correct answers award a job',()=>{
    for(const score of [0,39,40,41]){
        const {game,advance}=interview(score),job=createAILabJob({economy:createEconomy()});
        assert.equal(game.state.remaining,120);assert.equal(game.result().passed,false);assert.equal(job.recordInterview(game.result()).ok,false);assert.equal(job.state.hired,false);
        advance(119999);assert.equal(game.state.phase,'running');advance(1);assert.equal(game.state.phase,'finished');assert.equal(game.result().elapsed,AI_INTERVIEW_SECONDS);
        assert.ok(job.recordInterview(game.result()).ok);assert.equal(job.state.hired,score>=40);assert.equal(job.state.bestScore,score);
    }
});

test('wrong and late answers cannot score; cancellation and retry do not retain progress',()=>{
    let now=0;const game=createArithmeticInterview({clock:()=>now,random:()=>0});assert.equal(game.submit('4'),false);assert.ok(game.start());assert.equal(game.start(),false);
    for(const input of ['',' ',null,'4x','2+2','4.0','Infinity','5'])assert.equal(game.submit(input),false);
    assert.equal(game.state.score,0);assert.ok(game.submit('4'));assert.equal(game.state.score,1);
    now=120000;assert.equal(game.submit('4'),false);assert.equal(game.state.score,1);assert.equal(game.result().finished,true);
    game.start();assert.equal(game.state.score,0);game.cancel();now+=120000;assert.equal(game.result().finished,false);assert.equal(game.submit('4'),false);
    assert.ok(game.start());assert.equal(game.state.remaining,120);assert.equal(game.state.score,0);
});

test('deadline expiry catches background time even without any rendering updates',()=>{
    let now=100;const game=createArithmeticInterview({clock:()=>now});game.start();now+=123456;
    assert.equal(game.submit(game.state.problem.answer),false);assert.equal(game.state.phase,'finished');assert.equal(game.state.remaining,0);
});

test('wages pay once every two seconds inside, stop outside, and never pay an unemployed player',()=>{
    const economy=createEconomy(),job=createAILabJob({economy});job.update(60,{inside:true});assert.equal(economy.state.coins,25);
    const {game,advance}=interview(40);advance(120000);job.recordInterview(game.result());
    assert.equal(job.update(1.99,{inside:true}),0);assert.equal(economy.state.coins,25);assert.equal(job.update(.01,{inside:true}),1);assert.equal(economy.state.coins,26);
    assert.equal(job.update(8,{inside:true}),4);assert.equal(economy.state.coins,30);
    job.update(1.5,{inside:true});job.update(60,{inside:false});assert.equal(job.state.payElapsed,0);assert.equal(economy.state.coins,30);
    assert.equal(job.update(.5,{inside:true}),0);job.update(20,{inside:true,eligible:false});assert.equal(job.state.payElapsed,0);
    for(const value of [NaN,Infinity,-2,0])assert.equal(job.update(value,{inside:true}),0);assert.equal(economy.state.coins,30);
    for(let i=0;i<120;i++)job.update(1/60,{inside:true});assert.equal(economy.state.coins,31);
});

test('employment and best score survive reload without banking offline wages or duplicating a hiring award',()=>{
    let saved;const economy=createEconomy(),job=createAILabJob({economy,onSave:s=>saved=s}),{game,advance}=interview(40);advance(120000);
    assert.equal(job.recordInterview(game.result()).hiredNow,true);assert.equal(job.recordInterview(game.result()).hiredNow,false);assert.equal(economy.state.coins,25);
    job.update(1.5,{inside:true});const loaded=createAILabJob({saved,economy});assert.equal(loaded.state.hired,true);assert.equal(loaded.state.bestScore,40);assert.equal(loaded.state.payElapsed,0);
    assert.equal(loaded.update(.5,{inside:true}),0);assert.equal(economy.state.coins,25);
    assert.equal(createAILabJob({saved:{hired:true,bestScore:39},economy}).state.hired,false);
    assert.equal(createAILabJob({saved:null,economy}).state.hired,false);
});

test('the lab furniture is a finite native mesh with a clear central aisle and doorway',()=>{
    const mesh=new Mesh(),lab={x:10,y:20,w:3.5,d:3};drawAILabInterior(mesh,lab,1);
    assert.ok(mesh.data.length>0&&mesh.data.every(Number.isFinite));assert.ok(mesh.data.length/33<6000);assert.ok(lab.interiorObstacles.length>=3);
    for(const polygon of lab.interiorObstacles)assert.ok(polygon.every(p=>p[0]<lab.x+lab.w/2-.3)||polygon.every(p=>p[1]<lab.y+1));
});
