import {pose} from './geometry.js';
import {drawFacadeWindow} from './windows.js';
import {drawPlaque} from './southern-district.js';
import {GPU_FACTORY} from './gpu-layout.js';

export const GPU_FACTORY_SIGNS=Object.freeze(['GPU FACTORY','OCEAN BEACH SAND']);
export function oceanBeachSandSite(navigation,{scale=1.5,from}){
    const region=navigation.regionAt(from.x,from.y),entry=navigation.nearest(8.9*scale-.5,36*scale-.5,6,(x,y)=>navigation.regionAt(x,y)===region&&navigation.describe(x,y).type==='sand');
    if(!entry)throw new Error('Ocean Beach needs a connected sand collection spot');
    return {id:'ocean-beach-sand',kind:'sand',label:'Ocean Beach sand',entry,x:entry.x+.1,z:entry.y+.35,description:'Sand, shovels, and empty sacks. Collect sand here, then sell each sack to the GPU Factory buyer in the South Bay for 20 coins.'};
}
export function drawSandSack(m,x,y,z){pose(m,x,y,z,0,()=>{
    m.sphere(0,.19,0,.16,.21,.14,'#b69b70',12,7,'wood');m.cylinder(0,.34,0,.08,.09,'#cbb48a',10,.065);m.rod([-.075,.36,-.015],[.075,.36,.015],.014,'#756246',7);
});}
export function drawBeachSand(m,site,base,signs){
    pose(m,site.x,base,site.z,0,()=>{
        m.sphere(-.08,.035,0,.42,.1,.27,'#d7c395',16,7,'sand');drawSandSack(m,.24,.02,.09);drawSandSack(m,-.38,.015,.08);
        m.rod([-.16,.06,-.19],[-.02,.9,-.18],.017,'#a58b5e',10);m.box(-.07,.09,-.22,.16,.21,.045,'#9eafaa',{metal:.4});m.rod([-.08,.91,-.18],[.05,.91,-.18],.018,'#7c694b',9);
        for(const x of [-.36,.36])m.rod([x,0,-.4],[x,.82,-.4],.023,'#8c7959',8);
        m.box(-.5,.57,-.43,1,.23,.06,'#586d5c','wood');drawPlaque(m,signs,'OCEAN BEACH SAND',0,.6,-.365,.94,.16);
    });
}
export function drawGPUFactory(m,signs,ground){
    const f=GPU_FACTORY,start=m.data.length;
    pose(m,f.x,f.base,f.z,0,()=>{
        m.box(-f.w/2,-.08,-f.d/2,f.w,.1,f.d,'#929f99','stone');m.box(-f.w/2,0,-f.d/2,f.w,2.85,f.d,'#c9d4cd','stucco');
        for(const x of [-2.15,-.85,.45,1.75])m.box(x-.035,.08,-2.32,.07,2.8,4.64,'#889e95',{metal:.2});
        // Three north-light roof bays, with glazed slopes and raised ridges.
        for(let i=0;i<3;i++){
            const a=-f.d/2+i*f.d/3,b=a+f.d/3;
            m.quad([-2.46,2.87,a],[-2.46,3.35,b-.35],[2.46,3.35,b-.35],[2.46,2.87,a],'#637d76','roof');
            m.quad([-2.46,3.35,b-.35],[-2.46,2.87,b],[2.46,2.87,b],[2.46,3.35,b-.35],'#9ac5bd','glass');
            for(const x of [-2.45,0,2.45])m.rod([x,3.36,b-.35],[x,2.88,b],.018,'#b8cbc4',8);
        }
        for(const side of [-1,1])for(let i=0;i<4;i++)drawFacadeWindow(m,{isX:true,plane:side*(f.w/2+.012),along:-1.95+i*.92,y:.85,w:.6,h:1.1,far:side<0,trim:'#8aa299',seed:side+i,glow:.18});
        // Recessed loading shutter, personnel entrance, and an actual sign.
        m.box(-1.95,.08,2.305,1.65,1.8,.045,'#617d75');for(let i=0;i<11;i++)m.box(-1.91,.13+i*.15,2.355,1.57,.02,.018,'#90a49a');
        m.box(.55,.04,2.31,.76,1.8,.035,'#4b6d68','glass');m.box(.59,.1,2.35,.68,.7,.018,'#738a7a');m.rod([1.15,.75,2.39],[1.15,1.04,2.39],.014,'#c7c5a3',8);
        m.box(-1.8,2.12,2.32,3.6,.42,.055,'#344e46');drawPlaque(m,signs,'GPU FACTORY',0,2.17,2.39,3.4,.27);
        for(const x of [-1.65,-.75,.15]){
            m.box(x-.28,2.9,-1.95,.56,.45,.6,'#a9bab2',{metal:.3});m.cylinder(x,3.36,-1.65,.17,.025,'#566d66',16,.17);for(let j=0;j<5;j++)m.box(x-.22+j*.1,3.39,-1.87,.03,.015,.44,'#617a70');
        }
        for(const z of [-1.4,-.55]){m.cylinder(2.12,.15,z,.21,1.45,'#9fb4ad',16,.21,{metal:.4});m.sphere(2.12,1.61,z,.21,.1,.21,'#bfcec6',16,7,{metal:.3});m.rod([2.12,1.25,z],[2.48,1.25,z],.035,'#6a948c',10);}
    });
    // The collection counter and sand pallets sit on the open forecourt.
    for(const dx of [-1.5,-1])drawSandSack(m,f.x+dx,ground(f.x+dx,173.8)+.025,173.8);
    const x=f.x+1.2,z=174.1,h=ground(x,z);m.box(x-.42,h,z-.3,.84,.6,.6,'#84958a','wood');m.box(x-.46,h+.6,z-.34,.92,.07,.68,'#bbc6b3');
    const box=(x,z,w,d)=>[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]],footprint=box(f.x,f.z,f.w+.08,f.d+.18),navigationPolygons=[footprint,box(x,z,.94,.7),...[-1.5,-1].map(dx=>box(f.x+dx,173.8,.34,.32))];
    return {navigationPolygons,id:'gpu-factory',kind:'gpu-factory',label:'GPU Factory',entry:{...f.entry},description:'A South Bay chip factory with north-light roof bays, clean-room windows, cooling pipes, and a surprisingly enthusiastic raw-materials department. Talk to the buyer outside: Ocean Beach sand pays 20 coins per sack.',start,count:m.data.length-start,lo:[f.x-f.w/2-.1,f.base-.1,f.z-f.d/2-.1],hi:[f.x+f.w/2+.12,f.base+3.5,174.5],footprint:[[f.x-f.w/2-.04,f.z-f.d/2-.04],[f.x+f.w/2+.04,f.z-f.d/2-.04],[f.x+f.w/2+.04,f.z+f.d/2+.09],[f.x-f.w/2-.04,f.z+f.d/2+.09]]};
}
