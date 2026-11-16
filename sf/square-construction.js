import {pose} from './geometry.js';
import {drawExcavator} from './rail-works.js';
import {drawPlaque} from './southern-district.js';
import {SQUARE_DIGSITE,SQUARE_CRANES,SQUARE_SITE_FENCES,squareConstructionPolygons} from './square-construction-layout.js';

export function drawTowerCrane(m,c,base){
    const yellow='#cfac4b',dark='#647579',H=c.height;
    pose(m,c.x,base,c.z,c.angle,()=>{
        m.box(-.52,-.04,-.52,1.04,.2,1.04,'#a5aaa0','stone');
        for(const x of [-.18,.18])for(const z of [-.18,.18])m.rod([x,.16,z],[x,H,z],.027,yellow,8,{metal:.2});
        for(let y=.2;y<H-.3;y+=.55)for(const side of [-1,1]){
            m.rod([-.18,y,side*.18],[.18,y,side*.18],.018,yellow,6);m.rod([side*.18,y,-.18],[side*.18,y,.18],.018,yellow,6);
            m.rod([-.18,y,side*.18],[.18,Math.min(H,y+.55),side*.18],.012,yellow,6);m.rod([side*.18,y,-.18],[side*.18,Math.min(H,y+.55),.18],.012,yellow,6);
        }
        for(let y=.3;y<H-.6;y+=.28)m.rod([-.09,y,-.205],[.09,y,-.205],.009,dark,5);
        m.cylinder(0,H-.12,0,.35,.18,dark,20);m.box(-.4,H-.16,-.38,.8,.1,.76,yellow,{metal:.2});
        m.box(.2,H-.66,-.44,.55,.46,.5,yellow);m.box(.25,H-.57,-.455,.4,.29,.018,'#638e98','glass');m.box(.755,H-.57,-.37,.018,.29,.35,'#729ba1','glass');
        const tail=-2.1,end=c.jib;
        for(const z of [-.17,.17]){m.rod([tail,H,z],[end,H,z],.025,yellow,8);m.rod([tail,H+.37,z],[end,H+.37,z],.02,yellow,8);}
        for(let x=tail;x<end-.1;x+=.5){const next=Math.min(end,x+.5);for(const side of [-1,1])m.rod([x,H,side*.17],[next,H+.37,side*.17],.012,yellow,6);m.rod([x,H,-.17],[x,H,.17],.015,yellow,6);}
        m.rod([0,H+.38,0],[0,H+1.12,0],.025,yellow,8);m.rod([0,H+1.1,0],[end-.4,H+.37,0],.009,dark,5);m.rod([0,H+1.1,0],[tail,H+.37,0],.009,dark,5);
        for(let i=0;i<3;i++)m.box(tail+.15+i*.31,H-.43,-.3,.29,.41,.6,'#989f98','stone');
        const hoist=end*.72,drop=2.5;m.box(hoist-.13,H-.03,-.23,.26,.1,.46,dark);m.rod([hoist,H,0],[hoist,H-drop,0],.008,'#414d4d',5);
        m.sphere(hoist,H-drop,0,.06,.09,.05,yellow,12,6);m.rod([hoist,H-drop-.04,0],[hoist,H-drop-.22,.03],.015,dark,6);
        for(const side of [-1,1])m.rod([hoist,H-drop-.16,0],[hoist+side*.46,H-drop-.65,0],.007,dark,5);
        for(const z of [-.1,.1])m.box(hoist-.6,H-drop-.79,z-.045,1.2,.16,.09,'#7c8886',{metal:.3});
        m.sphere(0,H+1.16,0,.055,.055,.055,'#e28b64',12,6,{emissive:.55});
    });
}

export function drawSquareConstruction(m,signs,terrain){
    const s=SQUARE_DIGSITE,p=s.pit,start=m.data.length,floor=terrain.height(p.x,p.z)-p.depth;
    terrain.cutPlot({cx:p.x,cz:p.z,w:p.w,d:p.d,height:floor,onlyLower:true});
    // Cover the actual lowered height-field triangles with soil. There is no
    // open hole, second flat floor, or sea visible beneath the excavation.
    for(let z=s.north;z<s.south-1e-8;z+=.25)for(let x=s.west;x<s.east-1e-8;x+=.25){
        const at=(u,v)=>[u,terrain.height(u,v)+.014,v];m.quad(at(x,z),at(x,z+.25),at(x+.25,z+.25),at(x+.25,z),'#ad9570','dirt');
    }
    for(const f of SQUARE_SITE_FENCES){
        const along=f.w>f.d,length=along?f.w:f.d,n=Math.ceil(length/.5);
        for(let i=0;i<=n;i++){const x=f.x+(along?(i/n-.5)*length:0),z=f.z+(along?0:(i/n-.5)*length),h=terrain.height(x,z);m.rod([x,h,z],[x,h+.85,z],.018,'#7e9293',6);}
        const a=[f.x-(along?length/2:0),f.z-(along?0:length/2)],b=[f.x+(along?length/2:0),f.z+(along?0:length/2)];
        for(const y of [.3,.75])m.rod([a[0],terrain.height(...a)+y,a[1]],[b[0],terrain.height(...b)+y,b[1]],.012,'#819797',6);
    }
    const e=s.excavator;drawExcavator(m,{...e,y:terrain.height(e.x,e.z)+.02});
    for(const c of SQUARE_CRANES)drawTowerCrane(m,c,terrain.height(c.x,c.z)+.02);
    // Spoil, stacked concrete pipes and a small unfinished frame describe the
    // work beneath the jibs without filling the pedestrian plaza with props.
    for(let i=0;i<5;i++)m.sphere(53.2+i*.14,terrain.height(53.2+i*.14,154.1)+.09,154.1,.19,.13+(i%2)*.04,.16,'#9e8664',12,6,'dirt');
    for(const z of [156.9,157.14]){const y=terrain.height(53.3,z);m.rod([53.04,y+.1,z],[53.58,y+.1,z],.09,'#a8afa4',16);m.sphere(53.59,y+.1,z,.008,.06,.06,'#626d65',12,6);}
    const h=terrain.height(71.1,160.3);m.box(70.7,h,159.6,.8,.1,1.4,'#b4b8ab','stone');
    for(const x of [70.76,71.44])for(const z of [159.66,160.94]){m.box(x-.035,h+.1,z-.035,.07,2.6,.07,'#9e7860',{metal:.2});for(let y=.65;y<2.5;y+=.6)m.rod([70.76,h+y,z],[71.44,h+y,z],.016,'#708c8d',6);}
    for(const x of [70.76,71.44])for(const y of [1.2,2.7])m.rod([x,h+y,159.66],[x,h+y,160.94],.027,'#9e7860',8);
    const signBase=terrain.height(55.45,155.55);m.box(55.41,signBase+.4,155.15,.08,.32,.8,'#466367');
    pose(m,55.46,signBase+.44,155.55,-Math.PI/2,()=>drawPlaque(m,signs,'HILLSBOROUGH WORKS',0,0,.045,.72,.2));
    const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=start;i<m.data.length;i+=11)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],m.data[i+k]);hi[k]=Math.max(hi[k],m.data[i+k]);}
    return {id:'times-square-works',label:'Hillsborough Works',kind:'construction',entry:{...s.entry},description:'Two lattice cranes lift the next chapter of the neighborhood. A small fenced digsite, a patient excavator, and Vic’s clipboard keep the main square free for pedestrians.',base:terrain.height(s.foreman.x,s.foreman.z),start,count:m.data.length-start,lo,hi,navigationPolygons:squareConstructionPolygons()};
}
