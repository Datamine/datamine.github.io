import {TAHOE_VILLAGE,tahoeHeight} from './tahoe.js';
import {drawEstateArchitecture} from './estate-architecture.js';
import {pose} from './geometry.js';
import {drawFacadeWindow} from './windows.js';
import {drawPlaque} from './southern-district.js';
import {drawCharacter} from './characters.js';
import {SF_FITNESS,SAND_HILL_CAPITAL} from './southern-layout.js';

export const ADVENTURE_SIGNS=Object.freeze(['IN-N-OUT','FERRARI','EXTORTIONATE GAS','FREE GAS','SF FITNESS','Sand Hill Road Capital Partners','STRENGTH TRAINING']);
function adventureSite(m,start,site){
    const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
    for(let i=start;i<m.data.length;i+=11)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],m.data[i+k]);hi[k]=Math.max(hi[k],m.data[i+k]);}
    return {...site,start,count:m.data.length-start,lo,hi};
}
export function drawFitness(m,signs){
    const start=m.data.length,g=SF_FITNESS;
    pose(m,g.x,g.base,g.z,0,()=>{
        m.box(-2.2,-.06,-1.7,4.4,.1,3.4,'#657778','concrete');m.box(-2.1,.04,-1.6,4.2,.025,3.2,'#48565d');
        m.box(-2.2,.04,-1.7,4.4,2.35,.12,'#81979c','brick');
        for(const x of [-2.2,2.08])m.box(x,.04,-1.7,.12,1,3.4,'#9fb5af','stucco');
        for(const x of [-2.1,2.1])m.rod([x,0,-1.5],[x,2.5,-1.5],.055,'#b9bfc0',10);
        m.box(-2.2,2.4,-1.6,4.4,.12,.15,'#bcc4c5');drawPlaque(m,signs,'SF FITNESS',0,1.88,-1.55,3.8,.34);
        for(const x of [-1.65,1.6]){
            for(const z of [-1.25,-.6])m.rod([x,.05,z],[x,1.1,z],.025,'#a6adb3',8);
            for(const y of [.35,.8]){m.rod([x-.22,y,-1.1],[x+.22,y,-1.1],.028,'#b2b9bf',8);for(const side of [-1,1])m.sphere(x+side*.19,y,-1.1,.065,.12,.12,'#3b454d',14,8);}
        }
        // Bench is aligned with the lying avatar and has its own weight rack.
        m.box(-1,.53,-.23,2,.12,.46,'#9a6374','wood');
        for(const x of [-.7,.7])m.box(x,.05,-.18,.08,.48,.36,'#a2b0b2',{metal:.25});
        for(const z of [-.68,.68])m.rod([-.5,.05,z],[-.5,1.25,z],.035,'#a7b7bc',10);
        m.box(-.65,.066,.58,1.3,.014,1.05,'#677f8c');
        for(const x of [-.55,.55])m.box(x,.082,.67,.025,.003,.86,'#9cafad');
        drawPlaque(m,signs,'STRENGTH TRAINING',0,.13,1.73,2.8,.3);
    });
    const sx=g.w/4.4,sz=g.d/3.4;for(let i=start;i<m.data.length;i+=11){m.data[i]=g.x+(m.data[i]-g.x)*sx;m.data[i+2]=g.z+(m.data[i+2]-g.z)*sz;const nx=m.data[i+3]/sx,ny=m.data[i+4],nz=m.data[i+5]/sz,length=Math.hypot(nx,ny,nz)||1;m.data[i+3]=nx/length;m.data[i+4]=ny/length;m.data[i+5]=nz/length;}
    return adventureSite(m,start,{id:'sf-fitness',kind:'gym',label:'SF Fitness',entry:{...g.entry},inside:{x:g.x-.5,y:g.z+.5},base:g.base,description:'SF Fitness, just east of the zoo. Bench presses, dumbbell curls, barbell squats, and overhead presses all earn strength XP at the same rate. Level 10 takes about twenty minutes of active training.'});
}
export function drawTrainingSites(m,signs,{includeGym=true}={}){
    const sites=includeGym?[drawFitness(m,signs)]:[],start=m.data.length,c=SAND_HILL_CAPITAL;
    pose(m,c.x,c.base,c.z,0,()=>drawEstateArchitecture(m,{w:c.w,d:c.d,capital:true,seed:.32},signs,'Sand Hill Road Capital Partners'));
    sites.push(adventureSite(m,start,{id:'sand-hill-capital',kind:'capital',label:'Sand Hill Road Capital Partners',entry:{...c.entry},description:'Sand Hill Road Capital Partners. One thousand coins of funding for founders who can demonstrate strength level 10. The due diligence is mostly bench presses.'}));
    return sites;
}
export function drawBenchPress(m,time,appearance,{reduced=false,training=true}={}){
    const g=SF_FITNESS,start=m.data.length,beat=reduced?0:time*.0026;
    if(training)drawCharacter(m,0,0,0,0,0,false,appearance.skin,appearance.shirt,{...appearance,mode:'idle',action:'bench',time:beat,backpack:false});
    for(let i=start;i<m.data.length;i+=11){const x=m.data[i],y=m.data[i+1],nx=m.data[i+3],ny=m.data[i+4];m.data[i]=g.bench.x-y+.9;m.data[i+1]=g.base+.8+x;m.data[i+2]+=g.bench.z;m.data[i+3]=-ny;m.data[i+4]=nx;}
    const h=g.base+(training?1.08+Math.sin(beat)*.12:1.25);
    m.rod([g.bench.x-.4,h,g.bench.z-.72],[g.bench.x-.4,h,g.bench.z+.72],.025,'#bfc7cb',10);
    for(const side of [-1,1])m.sphere(g.bench.x-.4,h,g.bench.z+side*.6,.17,.17,.045,'#343e46',18,10);
}

export function createHighwaySites(car){
    const make=(id,label,kind,distance,extra={})=>{const p=car.sample(distance);return {id,label,kind,distance,entry:id==='fuel-tahoe'?{...TAHOE_VILLAGE.fuel.entry}:{x:p.x-.5,y:p.z-.5},...extra};};
    return [make('in-n-out','In-N-Out','burger',car.dealer-10,{description:'A double-double beacon beyond the Bay Bridge. The palm trees have excellent taste in roadside stops.'}),...car.stations.map(s=>make(s.id,s.label,s.id==='ferrari-dealer'?'dealership':'fuel',s.distance,{paid:s.paid,description:s.paid?'The pump accepts every coin you have. The attendant calls this “market pricing.”':s.id==='ferrari-dealer'?'A red Ferrari waits beyond the Bay Bridge. Borrow it for free, drive at twenty times walking speed, and refuel here for free.':'Free fuel beside the Tahoe gondola. Fill the tank before driving back to San Francisco.'}))];
}
export function drawHighwaySites(m,car,sites,signs){
    return sites.map(site=>{
        const start=m.data.length,p=car.sample(site.distance),side=site.id==='fuel-return'?-1:1,angle=site.id==='fuel-tahoe'?0:p.angle+(side>0?Math.PI:0);
        const x=site.id==='fuel-tahoe'?TAHOE_VILLAGE.fuel.x:p.x-Math.sin(p.angle)*side*4.2,z=site.id==='fuel-tahoe'?TAHOE_VILLAGE.fuel.z:p.z+Math.cos(p.angle)*side*4.2;
        const base=site.id==='fuel-tahoe'?tahoeHeight(x,z):p.y;
        pose(m,x,base,z,angle,()=>{
            m.box(-2.4,-.1,-1.9,4.8,.12,3.8,'#9ca6a3','concrete');
            if(site.kind==='burger'||site.kind==='dealership'){
                m.box(-2,.02,-1.4,4,1.7,2.8,site.kind==='burger'?'#e3d9bd':'#a3acb2','stucco');
                m.box(-2.1,1.72,-1.5,4.2,.15,3,site.kind==='burger'?'#bc4c43':'#596c79');
                for(let i=0;i<4;i++)drawFacadeWindow(m,{plane:1.41,along:-1.8+i*.95,y:.3,w:.7,h:.9,style:'storefront',trim:'#e5dfd0',seed:i+2});
                drawPlaque(m,signs,site.kind==='burger'?'IN-N-OUT':'FERRARI',0,1.18,1.46,3.7,.32);
                if(site.kind==='burger'){
                    m.rod([2.2,0,0],[2.2,3.5,0],.045,'#b2b9ae',10);m.box(1.6,2.7,-.04,1.2,.55,.08,'#c4483e');m.tri([1.65,2.7,.05],[2.5,2.94,.05],[1.65,3.2,.05],'#ebc85b');
                    for(const x of [-2.2,2.2]){m.rod([x,0,-1.6],[x+.12,2.7,-1.6],.055,'#917957',10);for(let i=0;i<7;i++){const a=i*Math.PI*2/7,end=[x+.12+Math.cos(a)*.65,2.48,-1.6+Math.sin(a)*.65];m.rod([x+.12,2.7,-1.6],end,.03,'#6d9257',7);m.tri([x+.12,2.72,-1.6],end,[end[0]+Math.sin(a)*.15,end[1]-.1,end[2]-Math.cos(a)*.15],'#7a9f62');}}
                }
            }else{
                for(const x of [-1.8,1.8])m.box(x-.04,0,-.5,.08,2,.08,'#b7bfc2');
                m.box(-2.2,2,-1,4.4,.16,2.2,site.paid?'#a66068':'#6b9d8a');
                drawPlaque(m,signs,site.paid?'EXTORTIONATE GAS':'FREE GAS',0,2.04,1.22,4.1,.3);
                for(const x of [-.8,.8]){m.box(x-.19,0,-.1,.38,1,.35,'#dddacb');m.box(x-.16,.65,.265,.32,.2,.025,'#335256',{emissive:.15});m.rod([x+.2,.75,.08],[x+.32,.25,.1],.025,'#353b3e',8);}
            }
        });
        return adventureSite(m,start,{...site,base});
    });
}
