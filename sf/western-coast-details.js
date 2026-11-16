import {rand,pose} from './geometry.js';
import {westernCoastX,westernBeachWidth} from './coastline.js';
import {drawSeagull} from './life.js';

export const COASTAL_GULL_COUNT=15;
export function coastalSeagullFlight(time,index,reduced=false){
    const centerZ=[55,81,112,143,170][Math.floor(index/3)],centerX=westernCoastX(centerZ)-1.6,rate=(.18+index*.006)*(reduced?.5:1),seconds=time*.001,a=seconds*rate+index*1.7,rx=2.3+(index%3)*.55,rz=2.7+(index%2)*.7;
    return {x:centerX+Math.cos(a)*rx,z:centerZ+Math.sin(a)*rz,y:2.8+(index%3)*.4+Math.sin(a*1.4)*.2,angle:Math.atan2(Math.cos(a)*rz,-Math.sin(a)*rx),bank:Math.sin(a)*.035,flap:reduced?.015:Math.sin(seconds*5.1+index)*.15};
}
export function drawCoastalSeagulls(m,time,viewer,reduced=false){
    for(let i=0;i<COASTAL_GULL_COUNT;i++){const bird=coastalSeagullFlight(time,i,reduced);if(Math.hypot(bird.x-viewer[0],bird.z-viewer[1])<32)drawSeagull(m,bird);}
}

/** Small groups of fractured basalt replace a regular row of identical props.
 * The rocks are static native meshes; the shoreline owns their positions. */
export function createCoastalRocks(){
    const rocks=[];
    for(let group=0;group<18;group++){
        const centerZ=46+group*7.35+rand(group,1,4)*2,rocky=westernBeachWidth(centerZ)<.8,count=rocky?4:2;
        for(let j=0;j<count;j++){
            const z=centerZ+(j-.8)*.65,x=westernCoastX(z)+(j===0?.22:-.35-rand(group,j,12)*.85),rx=Math.min(.25+rand(group,j,8)*(rocky?.5:.27),(13.4-x)/1.2);
            rocks.push({x,z,rx,rz:rx*(.65+rand(group,j,18)*.55),height:.25+rand(group,j,21)*(rocky?1.05:.5),angle:rand(group,j,25)*Math.PI,seed:group*7+j});
        }
    }return rocks;
}
export function drawCoastalRocks(m,rocks,ground,land){
    for(const r of rocks){
        const base=land(r.x,r.z)?ground(r.x,r.z)-.12:-.1;
        pose(m,r.x,base,r.z,r.angle,()=>{
            const sides=10,at=(ring,i)=>{const a=i*Math.PI*2/sides,radius=[1,.95,.65,.2][ring]*(.85+rand(r.seed,i%sides,ring+8)*.24);return [Math.cos(a)*r.rx*radius,[0,.22,.76,1][ring]*r.height,Math.sin(a)*r.rz*radius];};
            for(let ring=1;ring<4;ring++)for(let i=0;i<sides;i++)m.quad(at(ring-1,(i+1)%sides),at(ring-1,i),at(ring,i),at(ring,(i+1)%sides),ring===3?'#a1a492':r.seed%2?'#737e79':'#858d80','stone');
            for(let i=0;i<sides;i++)m.tri([0,r.height,0],at(3,(i+1)%sides),at(3,i),'#a8aa95','stone');
        });
    }
}
