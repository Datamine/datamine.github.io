import {pose} from './geometry.js';

export const REHABILITATION_DURATION=4.8;
export function createRehabilitation(onComplete){
    const state={active:false,elapsed:0};return {state,start(){if(state.active)return false;state.active=true;state.elapsed=0;return true;},update(dt){if(!state.active)return;state.elapsed+=Math.max(0,dt);if(state.elapsed>=REHABILITATION_DURATION){state.active=false;onComplete();}},cancel(){state.active=false;state.elapsed=0;},get beam(){return state.active&&state.elapsed>=1.35&&state.elapsed<3.65;}};
}
export function detentionStaff(site){return [
    {id:'rehabilitation-specialist',label:'Rehabilitation specialist',name:'Rehabilitation specialist',rehabilitation:true,x:site.x+3.05,z:site.z+.4,skin:'#bf9777',shirt:'#f3f2e9',hair:'#5b4c41',coat:true,medical:true,height:1.95,angle:Math.PI},
    {id:'rehabilitation-judge',label:'Judge',name:'Judge',rehabilitation:true,x:site.x+.7,z:site.z+3.05,skin:'#ac8063',shirt:'#343640',hair:'#e0d9c8',coat:true,height:1.95,angle:-Math.PI/2}
];}
export function rehabilitationDialogue(npc,start){return {...npc,decline:'Decline',intro:'The court offers complimentary rehabilitation and transport back to San Francisco. Our specialist can begin immediately.',question:'Accept rehabilitation and return to the city?',choices:[{label:'Accept rehabilitation',next:{skipIntro:true,question:'Are there any side effects of rehabilitation?',decline:'Decline rehabilitation',choices:[{label:'Ask about side effects',accept:()=>({ok:true,message:'“Not at all.” The specialist reaches for a rather large overhead apparatus.',after:start})}]}}]};}

export function scrambleAppearance(current,random=Math.random){
    const palettes={skin:['#bd9369','#9d7254','#d1ae8b','#79563f'],shirt:['#a44c7b','#498c9b','#e1b45a','#567c58','#8462ac'],pants:['#4a5478','#916a48','#b8afa0','#476b67'],hair:['#352e2b','#bd9568','#7a4f38','#b4b3ad'],shoes:['#4d3d3a','#b1a98e','#455d6b']},result={...current,gender:current.gender==='woman'?'man':'woman',hairstyle:current.gender==='woman'?'short':'long'};
    for(const [key,colors] of Object.entries(palettes)){const available=colors.filter(c=>c!==current[key]);result[key]=available[Math.min(available.length-1,Math.floor(random()*available.length))];}return result;
}

export function drawRehabilitationLaser(m,player,base,rehab,time){
    if(!rehab.state.active)return;
    const t=rehab.state.elapsed,lower=Math.min(1,t/1.2),y=base+8-lower*2.2;
    pose(m,player.x+.5,y,player.y+.5,0,()=>{
        m.cylinder(0,0,0,.4,.25,'#e3e8e8',24,.48,{metal:.3});m.cylinder(0,-.2,0,.22,.22,'#758a96',20,.34,{metal:.35});
        m.sphere(0,-.22,0,.12,.06,.12,'#bca5f1',20,8,{emissive:.65});
        m.rod([0,.2,0],[1.3,.8,0],.12,'#82939b',12);m.rod([1.3,.8,0],[1.3,5,0],.1,'#b7c3c9',12);
    });
    if(rehab.beam){
        const head=[player.x+.5,base+1.65,player.y+.5],tip=[player.x+.5,y-.22,player.y+.5],pulse=.04+Math.sin(time*.06)**2*.025;
        m.rod(head,tip,pulse,'#bb9cf4',12,{emissive:.85});m.rod(head,tip,pulse*.38,'#f1e8ff',8,{emissive:1});m.sphere(...head,.16,.16,.16,'#d1b6fc',16,8,{emissive:.8});
        for(let i=0;i<7;i++){const a=time*.003+i*Math.PI*2/7;m.rod(head,[head[0]+Math.cos(a)*.45,head[1]+Math.sin(a*2)*.18,head[2]+Math.sin(a)*.45],.01,'#bbd9fa',4,{emissive:.8});}
    }
}
