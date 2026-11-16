import {pose} from './geometry.js';

export const SKATE_TRICKS=Object.freeze([
    {id:'ollie',label:'Ollie',key:'1',duration:.95},
    {id:'kickflip',label:'Kickflip',key:'2',duration:1.15},
    {id:'shove-it',label:'360 shove-it',key:'3',duration:1.2}
].map(Object.freeze));
export function sampleSkateTrick(id,progress){
    const t=Math.max(0,Math.min(1,progress)),air=Math.max(0,Math.min(1,(t-.18)/.64)),arc=Math.sin(Math.PI*air),turn=air*air*(3-2*air);
    return {progress:t,height:arc*(id==='kickflip'?.78:.63),drop:arc*.1,pitch:-.32*Math.sin(Math.PI*2*air)*arc,roll:id==='kickflip'?turn*Math.PI*2:0,yaw:id==='shove-it'?turn*Math.PI*2:0};
}
export function createSkateTricks(){
    const state={active:false,id:null,elapsed:0};
    function start(id){if(state.active||!SKATE_TRICKS.some(t=>t.id===id))return false;Object.assign(state,{active:true,id,elapsed:0});return true;}
    function cancel(){Object.assign(state,{active:false,id:null,elapsed:0});}
    function update(dt){if(!state.active)return null;state.elapsed+=Math.max(0,dt);const trick=SKATE_TRICKS.find(t=>t.id===state.id);if(state.elapsed<trick.duration)return null;const id=state.id;cancel();return id;}
    return {state,start,cancel,update,get pose(){if(!state.active)return null;return sampleSkateTrick(state.id,state.elapsed/SKATE_TRICKS.find(t=>t.id===state.id).duration);}};
}

/** One small native mesh; the board and rider share the sampled street slope. */
export function drawPlayerSkateboard(m,x,z,base,angle,travel=0,ground=()=>base,trick=null){
    const heading=angle+(trick?.yaw||0),co=Math.cos(heading),si=Math.sin(heading),slope=Math.atan2(ground(x+co*.42,z+si*.42)-ground(x-co*.42,z-si*.42),.84)+(trick?.pitch||0);
    pose(m,x,base,z,heading,()=>{
        const start=m.data.length;
        m.box(-.43,.16,-.15,.86,.045,.3,'#758e87','wood');
        for(const side of [-1,1])m.sphere(side*.43,.191,0,.14,.027,.15,'#90a79a',16,8);
        m.box(-.42,.207,-.133,.84,.009,.266,'#3f4c49');
        for(const axle of [-.32,.32]){
            m.rod([axle,.078,-.21],[axle,.078,.21],.019,'#b6c1b8',10);m.box(axle-.04,.1,-.07,.08,.055,.14,'#a0aca3',{metal:.25});
            for(const side of [-1,1]){m.rod([axle,.075,side*.16],[axle,.075,side*.23],.067,'#d5c9a4',14);const a=travel/.067;m.rod([axle,.075,side*.234],[axle+Math.cos(a)*.044,.075+Math.sin(a)*.044,side*.234],.009,'#96927b',6);}
        }
        const c=Math.cos(slope),s=Math.sin(slope),cr=Math.cos(trick?.roll||0),sr=Math.sin(trick?.roll||0);
        for(let i=start;i<m.data.length;i+=11){
            const x=m.data[i],y=.18+(m.data[i+1]-.18)*cr-m.data[i+2]*sr,z=(m.data[i+1]-.18)*sr+m.data[i+2]*cr,nx=m.data[i+3],ny=m.data[i+4]*cr-m.data[i+5]*sr,nz=m.data[i+4]*sr+m.data[i+5]*cr;
            m.data[i]=x*c-y*s;m.data[i+1]=x*s+y*c-(trick?.drop||0);m.data[i+2]=z;m.data[i+3]=nx*c-ny*s;m.data[i+4]=nx*s+ny*c;m.data[i+5]=nz;
        }
    });
}
