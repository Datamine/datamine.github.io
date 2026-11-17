import {ARMORY} from './armory-layout.js';
import {drawPlaque} from './southern-district.js';
import {drawFacadeWindow} from './windows.js';
export function drawArmory(m,signs,ground){
    const {x,z,w,d}=ARMORY,base=ground(x,z),start=m.data.length,left=x-w/2,face=z+d/2;
    m.box(left,base-.08,z-d/2,w,.13,d,'#a6a38c','flagstone');m.box(left+.12,base,z-d/2+.12,w-.24,2.7,d-.24,'#916750','brick');
    m.box(left,base+2.65,z-d/2,w,.23,d,'#baa88c','travertine');m.box(left+.25,base+2.88,z-d/2+.25,w-.5,.10,d-.5,'#61746d','roof');
    for(const side of [-1,1]){const xx=x+side*(w/2-.4);m.cylinder(xx,base,z+d/2-.35,.46,3.7,'#9d7659',14,.46,'brick');m.cylinder(xx,base+3.54,z+d/2-.35,.5,.15,'#c8b294',14,.5,'travertine');for(let i=0;i<8;i++){const a=i*Math.PI/4;m.box(xx+Math.cos(a)*.42-.10,base+3.69,z+d/2-.35+Math.sin(a)*.42-.10,.2,.25,.2,'#c8b294','stone');}}
    m.box(x-.46,base+.02,face-.1,.92,1.55,.08,'#4b625b','wood');for(const xx of [-.16,.16])m.box(x+xx-.01,base+.72,face-.008,.02,.22,.025,'#c5b276');
    for(const xx of [-.65,.65])for(const yy of [1.8,2.25])drawFacadeWindow(m,{plane:face-.1,along:x+xx,y:base+yy,w:.25,h:.33,style:'office',trim:'#c8bfa6',seed:xx+yy});
    drawPlaque(m,signs,'THE ARMORY',x,base+1.67,face+.015,1.7,.3);
    const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=start;i<m.data.length;i+=11)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],m.data[i+k]);hi[k]=Math.max(hi[k],m.data[i+k]);}
    return {id:'the-armory',kind:'armory',label:'The Armory',entry:{...ARMORY.entry},description:'Strangely, this is not where you buy armor.',base,start,count:m.data.length-start,lo,hi,footprint:[[left,z-d/2],[left+w,z-d/2],[left+w,face],[left,face]]};
}
