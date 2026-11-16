import {pose} from './geometry.js';

export const BUS_SIGNS=Object.freeze(['MARKET ST','NIGHTLIFE']);
function signalDisk(m,y,color,material=null){for(let i=0;i<12;i++){const a=i*Math.PI/6,b=(i+1)*Math.PI/6;m.tri([.111,y,0],[.111,y+Math.cos(a)*.065,Math.sin(a)*.065],[.111,y+Math.cos(b)*.065,Math.sin(b)*.065],color,material);}}
export function drawTrafficSignalPosts(m,signals,ground){
    for(const p of signals.fixtures){p.base=ground(p.x,p.z)+(p.overhead?.8:0);pose(m,p.x,p.base,p.z,p.angle,()=>{
        if(p.overhead){const span=p.width+1;m.rod([0,2.45,-span],[0,2.45,span],.008,'#78877e',4);m.rod([0,2.45,0],[0,2.37,0],.018,'#849182',6);}
        else{m.cylinder(0,0,0,.055,.11,'#7b806e',8,.04);m.cylinder(0,.1,0,.028,2.27,'#9a9166',8,.028,{metal:.25});}
        m.box(-.13,1.65,-.12,.24,.76,.24,'#b29a51');m.box(.098,1.68,-.096,.012,.7,.192,'#303a34');
        for(const [y,color] of [[2.22,'#563932'],[2.02,'#595234'],[1.82,'#334c3b']]){signalDisk(m,y,color);m.box(.10,y+.072,-.09,.085,.023,.18,'#5e654c');}
    });}
}
export function drawTrafficSignalLights(m,signals,time,viewer){
    for(const p of signals.fixtures)if(Math.hypot(p.x-viewer.x,p.z-viewer.z)<35){const green=signals.phase(p.node,time)===p.phase;pose(m,p.x+.004*Math.cos(p.angle),p.base,p.z+.004*Math.sin(p.angle),p.angle,()=>signalDisk(m,green?1.82:2.22,green?'#67de84':'#f26b4b',{emissive:.95}));}
}
export function drawSlowBus(m,bus,time,signs){pose(m,bus.x,bus.base,bus.z,bus.angle,()=>{
    m.box(-.98,.14,-.305,1.96,.48,.61,'#c75e4c',{metal:.15});m.box(-.97,.62,-.3,1.94,.36,.6,'#e6e2c8');m.box(-.99,.98,-.31,1.98,.055,.62,'#dadccb');
    for(const side of [-1,1]){
        for(let i=0;i<6;i++){const x=-.89+i*.29;m.box(x,.66,side*.304,.235,.26,.012,i%4===0?'#486766':'#6d8d8a','glass');m.box(x+.242,.64,side*.311,.026,.34,.015,'#c5c8b2');}
        m.box(-.94,.57,side*.309,1.86,.06,.015,'#dcdcc2');
        for(const x of [-.62,.58]){m.sphere(x,.18,side*.315,.17,.17,.04,'#333e3d',14,7);m.sphere(x,.18,side*.35,.09,.09,.009,'#acb9b4',12,6);for(let spoke=0;spoke<3;spoke++){const a=bus.travel/.17+spoke*Math.PI*2/3;m.rod([x,.18,side*.36],[x+Math.cos(a)*.075,.18+Math.sin(a)*.075,side*.36],.008,'#71857f',5);}}
        // A pair of glazed folding doors near the front axle.
        for(const x of [.33,.49]){m.box(x,.28,side*.322,.145,.57,.014,'#465b59');m.box(x+.025,.45,side*.332,.095,.35,.008,'#829c96','glass');}
    }
    m.box(.982,.65,-.26,.015,.24,.52,'#5e7d7b','glass');m.box(-.995,.65,-.25,.015,.23,.5,'#6d8a83','glass');
    m.box(.993,.91,-.26,.015,.075,.52,'#263d33');const uv=signs.get(bus.destination==='Market Street'?'MARKET ST':'NIGHTLIFE');if(uv)m.quad([1.012,.92,.25],[1.012,.92,-.25],[1.012,.98,-.25],[1.012,.98,.25],'#f2dda0',uv);
    for(const side of [-1,1]){m.box(.995,.35,side*.21-.04,.014,.075,.08,'#f0e9b6',{emissive:.45});m.box(-1.005,.36,side*.21-.03,.012,.06,.06,'#cf5f4b');m.rod([.83,.83,side*.3],[1.0,.83,side*.4],.015,'#83918b',7);m.box(.96,.76,side*.4-.015,.08,.12,.03,'#425b59');}
    m.box(-.4,1.035,-.2,.65,.08,.4,'#9cae9f');for(let i=0;i<6;i++)m.box(-.36+i*.1,1.12,-.16,.035,.012,.32,'#6b8078');m.box(.99,.19,-.27,.045,.055,.54,'#919f91');
});}
