import {SALT_FLATS,SALT_PONDS} from './salt-layout.js';
import {drawPlaque} from './southern-district.js';
import {rand} from './geometry.js';

export const SALT_FLATS_SIGNS=Object.freeze(['BAY AREA SALT FLATS','SAVE THE SALT PONDS']);
const saltRect=(x,z,w,d)=>[[x,z],[x+w,z],[x+w,z+d],[x,z+d]];
/** The colored pond surfaces are part of the terrain itself. This batch only
 * adds crystalline banks, sluices, reeds and the activist's letter-writing desk. */
export function drawSaltFlats(m,signs,terrain){
    const s=SALT_FLATS,start=m.data.length,base=s.base;
    for(const p of SALT_PONDS){
        for(const z of [p.z-.055,p.z+p.d])m.box(p.x-.055,base+.005,z,p.w+.11,.055,.055,'#dedbc7','saltCrust');
        for(const x of [p.x-.055,p.x+p.w])m.box(x,base+.005,p.z,.055,.055,p.d,'#d9d8bf','saltCrust');
        // Tiny tide gates and weathered walkover planks connect the cells.
        const x=p.x+p.w*.6,z=p.z+(p.z<178?p.d+.05:-.13);
        for(const dx of [-.075,.075])m.box(x+dx-.015,base,z,.03,.25,.05,'#7e887b','wood');
        m.box(x-.12,base+.20,z-.03,.24,.045,.11,'#b0ad8c','wood');m.rod([x,base+.15,z+.025],[x,base+.38,z+.025],.012,'#7e8e85',8,{metal:.2});
    }
    // Salt blooms and low pickleweed fringe the bay-facing boundary.
    for(let i=0;i<32;i++){
        const x=83.67+rand(i,2)*.16,z=176.1+rand(i,5)*3.7,y=terrain.height(x,z);
        if(i%3===0)m.sphere(x,y+.035,z,.08,.045,.12,'#e7e4d4',8,4,'saltCrust');
        else for(let j=0;j<3;j++)m.rod([x,y,z],[x+(j-1)*.04,y+.11+rand(i,j)*.08,z+.02],.013,i%2?'#9c8879':'#8b9c6e',6);
    }
    const x=74.85,z=176.65,y=terrain.height(x,z);
    m.box(x-.26,y+.66,z-.18,.52,.055,.36,'#b5a480','wood');
    for(const dx of [-.2,.2])for(const dz of [-.12,.12])m.box(x+dx-.015,y,z+dz-.015,.03,.66,.03,'#766f59','wood');
    for(let i=0;i<4;i++)m.box(x-.17+i*.045,y+.72+i*.007,z-.08,.16,.008,.13,'#e5ddc4');
    m.box(x+.1,y+.725,z+.06,.11,.025,.07,'#7c9c92');m.rod([x-.19,y+.74,z+.09],[x-.04,y+.74,z+.12],.007,'#6b6956',6);
    for(const [cx,cz,title,w] of [[75.15,176.12,'BAY AREA SALT FLATS',1.1],[74.87,177.13,'SAVE THE SALT PONDS',.62]]){
        const h=terrain.height(cx,cz);for(const dx of [-w*.4,w*.4])m.box(cx+dx-.018,h,cz-.02,.036,.95,.04,'#8b8064','wood');
        m.box(cx-w/2,h+.71,cz-.04,w,.29,.06,'#597868','wood');drawPlaque(m,signs,title,cx,h+.75,cz+.027,w-.06,.19);
    }
    const fixtures=[saltRect(x-.27,z-.2,.54,.4),saltRect(74.6,177.08,.56,.13),saltRect(74.58,176.06,1.14,.12)];
    return {id:'salt-flats',kind:'salt-flats',label:'Bay Area Salt Flats',entry:{...s.entry},description:'A patchwork of pink, green, and silver evaporation ponds beside the South Bay. Salt crust rims the water; dirt levees keep your feet dry. The conservationist beside the letter-writing desk pays 50 coins for each letter you deliver to the City Hall clerk.',start,count:m.data.length-start,lo:[s.west,base-.05,s.north],hi:[s.east,base+1.15,s.south],footprint:saltRect(s.west,s.north,s.east-s.west,s.south-s.north),navigationPolygons:[...SALT_PONDS.map(p=>saltRect(p.x,p.z,p.w,p.d)),...fixtures]};
}
