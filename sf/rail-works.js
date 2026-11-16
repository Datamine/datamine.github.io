import {RAIL_PIT} from './southern-district.js';
import {AIRSHIP_TERMINAL} from './airship.js';
import {pose} from './geometry.js';
export const RAIL_WORKER=Object.freeze({id:'rail-lunch-worker',kind:'rail-worker',label:'Rail worker',name:'Gus, excavation specialist',x:RAIL_PIT.east+1,z:RAIL_PIT.north+1,base:AIRSHIP_TERMINAL.base+.04,skin:'#aa7d5b',shirt:'#d58c36',hair:'#726451',cap:true,seated:true,regional:true,angle:Math.PI/2,height:1.75,approach:{x:RAIL_PIT.east+.5,y:RAIL_PIT.north+2},description:'An excavator operator protecting a sandwich of considerable historical significance.'});
export function railWorkerDialogue(){
    return {...RAIL_WORKER,repeat:true,intro:'Afternoon. Mind the digger. Mind the hole. Most of all, mind the lunch break.',question:'What would you like to ask?',decline:'Enjoy your lunch.',choices:[
        {label:'How long is your lunch break?',next:{intro:'How long? Well, I remember when this sandwich was just two fields of wheat and a promising pig. The bread was warmer then. We all were.',question:'Go on…',choices:[
            {label:'But when did the break start?',receipt:'There are stories of a time before lunch. My grandfather heard them from a man who claimed to have seen a moving excavator. We keep his photograph in the union hall.'},
            {label:'When will you get back to work?',receipt:'Once I finish my tea. Trouble is, whenever I get near the bottom, someone tops it up. The kettle was here when they surveyed the route. It may be older than the route.'},
            {label:'Do you remember working?',receipt:'I remember remembering it. Big yellow machine, terrible racket. Or perhaps that was the mustard bottle. The years tend to run together around the second course.'}]}},
        {label:'How is the high-speed rail going?',receipt:'Fastest lunch break in the state. We have already completed the feasibility study for the napkin. Construction of the actual napkin is pending a second environmental review.'}
    ]};
}
export function drawRailWorks(m,ground){
    const p=RAIL_PIT,x=p.west+1.1,z=p.north+1.7;
    drawExcavator(m,{x,y:p.floor+.07,z,angle:-.35});
    // The lunch bench and open sandwich tin sit safely beyond the pit fence.
    const n=RAIL_WORKER,h=ground(n.x,n.z);
    for(const dx of [-.37,.37])m.box(n.x+dx,h,n.z-.17,.06,.48,.34,'#69766c');
    m.box(n.x-.49,h+.47,n.z-.23,.98,.08,.46,'#ac8a5a','wood');
    m.box(n.x+.42,h+.55,n.z+.13,.25,.06,.23,'#a2aba3',{metal:.2});m.box(n.x+.45,h+.62,n.z+.15,.18,.04,.18,'#e2c98e');
}

/** Shared tracked excavator, used by both construction sites. */
export function drawExcavator(m,{x,y,z,angle=0}){
    pose(m,x,y,z,angle,()=>{
        // Tracked undercarriage, rotating cab, articulated boom, and open bucket.
        for(const side of [-1,1]){
            m.box(side*.39-.12,0,-.53,.24,.21,1.02,'#3e4844',{metal:.2});
            for(let j=0;j<7;j++)m.box(side*.39-.13,.025,-.52+j*.145,.26,.035,.08,'#69736b');
            for(const zz of [-.35,.32])m.cylinder(side*.39,.04,zz,.1,.16,'#7b8171',12);
        }
        m.cylinder(0,.21,0,.26,.1,'#6b7161',20);m.box(-.43,.31,-.41,.86,.32,.78,'#dbac3e',{metal:.2});
        m.box(-.35,.63,-.39,.45,.66,.52,'#e2b748');m.box(-.3,.75,-.415,.36,.43,.02,'#6f9c9c','glass');
        m.box(-.37,1.29,-.42,.5,.06,.59,'#e2bc5c');m.box(.14,.62,-.35,.23,.1,.51,'#b19743');
        m.rod([.17,.62,.12],[.24,1.54,.7],.085,'#e1b243',12,{metal:.2});
        m.rod([.24,1.54,.7],[.24,.81,1.26],.067,'#cba33e',12,{metal:.2});
        m.rod([.24,.78,.24],[.24,1.43,.67],.027,'#bdc6bd',10,{metal:.5});
        m.rod([.24,1.34,.81],[.24,.9,1.2],.023,'#c0c6bb',10,{metal:.5});
        m.box(.02,.58,1.17,.46,.22,.39,'#60665a',{metal:.3});
        for(let j=0;j<4;j++)m.box(.04+j*.12,.53,1.43,.045,.08,.16,'#8f927b');
    });
}
