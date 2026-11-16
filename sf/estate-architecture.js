import {pose} from './geometry.js';
import {drawFacadeWindow} from './windows.js';

function estateHipRoof(m,w,d,y,rise,color){
    const a=[-w/2,y,-d/2],b=[w/2,y,-d/2],c=[w/2,y,d/2],e=[-w/2,y,d/2],left=[-w*.24,y+rise,0],right=[w*.24,y+rise,0];
    m.quad(a,left,right,b,color,'shingles');m.quad(c,right,left,e,color,'shingles');m.tri(e,left,a,color,'shingles');m.tri(b,right,c,color,'shingles');
}

/** Restrained country-house architecture: limestone, slate, bronze, recessed
 * glazing and a shallow colonnade. All details stay inside the authored lot. */
export function drawEstateArchitecture(m,{w,d,seed=0,capital=false},signs=null,title=null){
    const width=w-.18,depth=d-.45,h=capital?3.25:2.35+seed*.45,wall=capital?'#ded4bb':['#c7c3af','#d8ccb5','#b8c5bc'][Math.floor(seed*3)%3],trim='#e9e0cb',roof=seed>.65?'#586565':'#3e5057',front=depth/2;
    m.box(-width/2,0,-depth/2,width,h,depth,wall,capital||seed<.45?'stone':'stucco');
    for(const y of [.12,h-.18])m.box(-width/2-.025,y,-depth/2-.025,width+.05,.11,depth+.05,trim,'stone');
    for(const x of [-width/2,width/2-.13])for(const z of [-depth/2,front-.13])for(let i=0;i<6;i++)m.box(x-.02,.24+i*(h-.5)/6,z-.02,.17,.12,.17,trim,'stone');
    const bays=Math.max(2,Math.floor(width/1.05));
    for(const side of [-1,1])for(let i=0;i<bays;i++){
        const x=-width/2+.23+i*(width-.35)/bays;if(side>0&&Math.abs(x+.24)<.68)continue;
        drawFacadeWindow(m,{plane:side*(depth/2+.012),far:side<0,along:x,y:.45,w:Math.min(.65,(width-.8)/bays),h:capital?1.75:1.3,style:'sash',trim,seed:i+seed*13});
    }
    const sideBays=Math.max(1,Math.floor(depth/.95));
    for(const side of [-1,1])for(let i=0;i<sideBays;i++)drawFacadeWindow(m,{isX:true,plane:side*(width/2+.012),far:side<0,along:-depth/2+.2+i*(depth-.3)/sideBays,y:.48,w:Math.min(.6,(depth-.5)/sideBays),h:capital?1.6:1.25,style:'sash',trim,seed:i+seed*17});
    m.box(-.32,.05,front+.015,.64,capital?2:1.65,.035,'#3d514d','wood');
    m.rod([.18,.8,front+.07],[.18,1.03,front+.07],.014,'#c8ae73',8,{metal:.5});
    for(const x of [-.65,.65]){
        m.cylinder(x,.12,front+.13,.055,capital?2.25:1.85,trim,20,.048,'stone');m.cylinder(x,.08,front+.13,.1,.1,trim,20);m.cylinder(x,capital?2.28:1.88,front+.13,.105,.1,trim,20);
    }
    const top=capital?2.4:2;
    m.box(-.85,top,front-.02,1.7,.12,.35,trim,'stone');m.tri([-.85,top+.12,front+.34],[.85,top+.12,front+.34],[0,top+.55,front+.34],trim,'stone');
    m.box(-.84,.01,front+.025,1.68,.1,.3,'#b6b2a0','stone');
    estateHipRoof(m,width+.12,depth+.15,h,.65+seed*.3,roof);
    for(const x of [-width*.33,width*.3]){
        m.box(x-.12,h+.2,-depth*.21,.24,.73,.3,capital?'#bdac91':'#9d8b76','brick');m.box(x-.15,h+.91,-depth*.21-.035,.3,.07,.37,trim,'stone');
    }
    if(capital){
        for(const x of [-width*.3,width*.3]){m.box(x-.28,h+.08,front*.4,.56,.44,.45,wall,'stone');drawFacadeWindow(m,{plane:front*.4+.46,along:x-.18,y:h+.15,w:.36,h:.3,trim,seed:x});pose(m,x,0,front*.4+.225,0,()=>estateHipRoof(m,.68,.65,h+.53,.25,roof));}
        const uv=signs?.get(title);m.box(-width*.46,2.55,front+.02,width*.92,.39,.025,'#34483e');
        if(uv)m.quad([-width*.44,2.6,front+.055],[width*.44,2.6,front+.055],[width*.44,2.9,front+.055],[-width*.44,2.9,front+.055],'#eee1ba',uv);
        for(const x of [-1.17,1.17]){m.rod([x,1.4,front+.04],[x,1.6,front+.16],.018,'#8c815d',8);m.sphere(x,1.69,front+.16,.055,.1,.055,'#e8dcb3',12,8,{emissive:.28});}
    }
}

export function makeEstateHouse(m,plot,terrain){
    const start=m.data.length,base=terrain.height(plot.x,plot.z)+.04;
    terrain.cutPlot({cx:plot.x,cz:plot.z,w:plot.w-.05,d:plot.d-.05,angle:plot.rotation,height:base-.04,onlyLower:true});
    pose(m,plot.x,base,plot.z,plot.rotation,()=>drawEstateArchitecture(m,{w:plot.w,d:plot.d,seed:plot.seed??.4}));
    const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=start;i<m.data.length;i+=11)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],m.data[i+k]);hi[k]=Math.max(hi[k],m.data[i+k]);}
    return {mesh:m,start:start/11,count:(m.data.length-start)/11,lo,hi,x:plot.x-plot.w/2,y:plot.z-plot.d/2,w:plot.w,d:plot.d,rotation:plot.rotation,base,arch:'mansion',solid:true,preserveGround:true,homes:1,storeys:2,houses:[{door:-.32,dw:.64,entry:plot.d/2}]};
}
