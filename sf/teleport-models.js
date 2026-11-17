import {pose} from './geometry.js';
export function drawTabletTeleport(m,teleport,time){
    const {position:p,base,progress}=teleport,charge=Math.min(1,progress*5),turn=time*.006;
    pose(m,p.x,base+.04,p.z,0,()=>{
        const radius=.5+Math.sin(progress*Math.PI)*.25;
        for(let i=0;i<24;i++){const a=i*Math.PI/12,b=(i+1)*Math.PI/12;m.rod([Math.cos(a)*radius,.02,Math.sin(a)*radius],[Math.cos(b)*radius,.02,Math.sin(b)*radius],.015,'#af75e9',5,{emissive:.7});}
        for(let k=0;k<5;k++){let previous=null;for(let i=0;i<9;i++){const t=i/8,angle=turn+k*Math.PI*2/5+t*2.6,wide=(.4+.16*Math.sin(i*4+k))*(1-t*.5),point=[Math.cos(angle)*wide,(p.y-base+2.3)*t*charge,Math.sin(angle)*wide];if(previous)m.rod(previous,point,.016,'#b16bff',5,{emissive:.9});previous=point;}}
        for(let i=0;i<8;i++){const a=i*Math.PI/4+turn*.4,y=((time*.001+i*.21)%1)*(p.y-base+2.2),r=.2+charge*.35;m.sphere(Math.cos(a)*r,y,Math.sin(a)*r,.026,.06,.026,'#e6b5ff',6,4,{emissive:.7});}
    });
}
