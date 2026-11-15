import {pose} from './geometry.js';
import {drawFacadeWindow} from './windows.js';
import {drawPlaque} from './southern-district.js';

// Authored world coordinates: west of Lake Merced, and between Second/Third.
export const SF_ZOO=Object.freeze({x:18.3,z:90,w:5.6,d:8.4,cage:{x:18.8,z:90.5,w:3.6,d:4.2},entry:{x:15.5,y:90},exit:{x:15.9,y:90},wardens:[{x:15.6,y:86},{x:15.3,y:86.9}]});
export const UCSF_HOSPITAL=Object.freeze({x:78,z:90,w:4.5,d:5.6,entry:{x:74.7,y:89.5}});
export const ZOO_PATHS=Object.freeze([
    {name:'Zoo entrance',points:[[14.46,86.5],[16.2,86.5],[16.2,90.5],[16.2,93.4]],w:.32},
    {name:'Hospital approach',points:[[74.60240963855422,90],[75.6,90]],w:.36}
]);

function zooBounds(m,start){
    const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
    for(let i=start;i<m.data.length;i+=11)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],m.data[i+k]);hi[k]=Math.max(hi[k],m.data[i+k]);}
    return {start,count:m.data.length-start,lo,hi};
}
function zooFence(m,x,z,w,d,base,{gate=false}={}){
    const west=x-w/2,east=x+w/2,north=z-d/2,south=z+d/2;
    for(const [a,b] of [[[west,north],[east,north]],[[east,north],[east,south]],[[east,south],[west,south]],[[west,south],[west,north]]]){
        const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.22);
        for(let i=0;i<=n;i++){const xx=a[0]+(b[0]-a[0])*i/n,zz=a[1]+(b[1]-a[1])*i/n;if(gate&&xx===west&&Math.abs(zz-z)<.65)continue;
            m.rod([xx,base+.12,zz],[xx,base+2.4,zz],.017,'#63746a',8);
        }
        for(const y of [.15,1.25,2.4]){
            if(gate&&a[0]===west&&b[0]===west){for(const sign of [-1,1])m.rod([west,base+y,z+sign*.65],[west,base+y,z+sign*d/2],.035,'#63746a',8);}
            else m.rod([a[0],base+y,a[1]],[b[0],base+y,b[1]],.035,'#63746a',8);
        }
    }
}

export function drawZooAndHospital(m,ground,signs){
    const sites=[],c=SF_ZOO.cage,base=ground(c.x,c.z);let start=m.data.length;
    m.box(c.x-c.w/2-.08,base-.08,c.z-c.d/2-.08,c.w+.16,.13,c.d+.16,'#839266','grass');
    zooFence(m,c.x,c.z,c.w,c.d,base,{gate:true});
    m.sphere(c.x+.6,base+.23,c.z+1.1,.6,.32,.47,'#91937b',18,10,'stone');m.rod([c.x-.5,base+.2,c.z+.8],[c.x+.6,base+.27,c.z+.4],.14,'#836d4a',12,'wood');
    m.box(c.x+.55,base+.05,c.z-1.25,.65,.12,.52,'#898e7b','stone');m.box(c.x+.6,base+.177,c.z-1.2,.55,.008,.42,'#699a9d',{water:.5});
    sites.push({id:'zoo',kind:'zoo',label:'San Francisco Zoo',entry:{...SF_ZOO.entry},description:'A leafy zoo west of Lake Merced. The tiger has excellent stripes and a troubling interest in the gate latch.',base,...zooBounds(m,start),footprint:[[c.x-c.w/2,c.z-c.d/2],[c.x+c.w/2,c.z-c.d/2],[c.x+c.w/2,c.z+c.d/2],[c.x-c.w/2,c.z+c.d/2]]});
    start=m.data.length;const hut={x:18.7,z:86.8,w:2.3,d:1.45},h=ground(hut.x,hut.z);
    m.box(hut.x-hut.w/2,h,hut.z-hut.d/2,hut.w,1.55,hut.d,'#c4a778','stucco');
    m.quad([hut.x-1.3,h+1.55,hut.z-.85],[hut.x+1.3,h+1.55,hut.z-.85],[hut.x+1.3,h+2.05,hut.z],[hut.x-1.3,h+2.05,hut.z],'#667c60','shingles');
    m.quad([hut.x-1.3,h+2.05,hut.z],[hut.x+1.3,h+2.05,hut.z],[hut.x+1.3,h+1.55,hut.z+.85],[hut.x-1.3,h+1.55,hut.z+.85],'#74896a','shingles');
    drawFacadeWindow(m,{isX:true,far:true,plane:hut.x-hut.w/2-.01,along:hut.z-.35,y:h+.5,w:.7,h:.65,style:'storefront',trim:'#efe2bb'});
    sites.push({id:'zoo-office',kind:'scenery',label:'Zoo keeper’s office',entry:{x:16.4,y:86.3},description:'Several nets, one kettle, and an employee handbook with a heavily underlined chapter on tigers.',base:h,...zooBounds(m,start)});
    // The visitor gate, bamboo beds and signs sit outside the tiger enclosure.
    for(const z of [85.8,87.2])m.cylinder(16.15,ground(16.15,z),z,.085,2.2,'#8b7855',12,.085,'wood');
    pose(m,16.15,ground(16.15,86.5)+1.65,86.5,Math.PI/2,()=>drawPlaque(m,signs,'SF ZOO',0,0,.02,1.4,.45));
    pose(m,c.x-c.w/2-.08,base+.8,c.z-1.25,Math.PI/2,()=>drawPlaque(m,signs,'TIGER',0,0,.02,.85,.3));
    for(const [x,z] of [[20.7,87.7],[20.8,93.2],[17.4,93.5]])for(let i=0;i<4;i++){
        const xx=x+i*.07,zz=z+(i%2)*.15,b=ground(xx,zz);m.cylinder(xx,b,zz,.023,.8+i*.13,'#78965b',8);m.sphere(xx+.08,b+.85,zz,.2,.12,.07,'#78965b',8,5);
    }
    start=m.data.length;const s=UCSF_HOSPITAL,hospitalBase=ground(s.x,s.z);
    pose(m,s.x,hospitalBase,s.z,Math.PI/2,()=>{
        m.box(-2.8,0,-2.25,5.6,3.5,4.5,'#d0d4c6','concrete');m.box(-1.2,3.5,-1.8,2.4,1.0,3.4,'#a6b4b0','concrete');
        m.box(-2.9,3.45,-2.35,5.8,.13,4.7,'#85979a','stone');m.box(-1.28,4.48,-1.88,2.56,.12,3.56,'#748c91','stone');
        for(const side of [-1,1])for(let floor=0;floor<3;floor++)for(let i=0;i<5;i++){
            if(side===1&&(floor===0&&i===2||floor===1&&i>=1&&i<=3))continue;
            drawFacadeWindow(m,{plane:side*2.26,far:side<0,along:-2.45+i*1.05,y:.35+floor*1.02,w:.68,h:.66,style:'office',trim:'#dce3df',seed:floor*9+i});
        }
        for(const side of [-1,1])for(let floor=0;floor<3;floor++)for(let i=0;i<4;i++)drawFacadeWindow(m,{isX:true,plane:side*2.81,far:side<0,along:-1.9+i*.95,y:.35+floor*1.02,w:.6,h:.66,style:'office',trim:'#dce3df',seed:i+5});
        m.box(-.52,.02,2.26,1.04,1.45,.035,'#668b99','glass');m.box(-.035,.04,2.3,.07,1.4,.025,'#dce4dc');
        m.box(-1.3,1.55,2.2,2.6,.12,.65,'#547a92',{metal:.1});
        m.box(-1.3,1.7,2.275,2.6,.45,.04,'#496f8b');drawPlaque(m,signs,'UCSF HOSPITAL',0,1.75,2.32,2.45,.34);
        m.box(-.13,3.83,1.62,.26,.5,.035,'#f0ede0');m.box(-.3,4,1.625,.6,.16,.04,'#f0ede0');
        for(const x of [-2.3,1.7]){m.box(x,3.62,-1.65,.65,.35,.8,'#7c8c8e',{metal:.15});for(let i=0;i<5;i++)m.box(x+.04,3.99,-1.6+i*.14,.57,.015,.025,'#b4c1bb');}
    });
    sites.push({id:'ucsf',kind:'hospital',label:'UCSF Hospital',entry:{...s.entry},description:'UCSF Hospital. Excellent emergency care, including the surprisingly common diagnosis “opened the tiger gate.”',base:hospitalBase,...zooBounds(m,start),footprint:[[s.x-s.w/2,s.z-s.d/2],[s.x+s.w/2,s.z-s.d/2],[s.x+s.w/2,s.z+s.d/2],[s.x-s.w/2,s.z+s.d/2]]});
    return sites;
}

export function drawTigerGate(m,base,open){
    m.box(16.45,base,89.32,.13,.8,.16,'#6b7f70',{metal:.1});m.sphere(16.45,base+.85,89.4,.1,.1,.1,'#bd6951',10,6);
    const c=SF_ZOO.cage;pose(m,c.x-c.w/2,base,c.z-.65,open*Math.PI*.55,()=>{
        for(const y of [.15,1.25,2.4])m.rod([0,y,0],[0,y,1.3],.035,'#63746a',8);
        for(let z=0;z<=1.301;z+=.216)m.rod([0,.15,z],[0,2.4,z],.017,'#63746a',8);
        m.box(-.05,1.15,1.05,.1,.16,.16,'#be9955',{metal:.2});
    });
}

export function drawTiger(m,actor,ground,{reduced=false}={}){
    const x=actor.x+.5,z=actor.y+.5,base=ground(x,z),phase=reduced||!actor.moving?0:actor.travel*Math.PI*2/1.3;
    const bob=actor.moving&&!reduced?Math.sin(phase*2)*.025:0,co=Math.cos(actor.angle),si=Math.sin(actor.angle);
    pose(m,x,base,z,actor.angle,()=>{
        const fur='#d38b3d',stripe='#3e3d32',cream='#e8d9b6';
        m.sphere(-.02,.85+bob,0,.7,.34,.29,fur,24,12);m.sphere(.1,.68+bob,0,.5,.17,.265,cream,20,8);
        for(let i=0;i<8;i++)for(let j=0;j<16;j++){
            const a=j*Math.PI/8,b=(j+1)*Math.PI/8,cx=-.52+i*.145,w=.022+(i%3)*.006;
            const p=(xx,t)=>{const r=Math.sqrt(Math.max(0,1-(xx/.705)**2));return [xx+Math.sin(t*3+i)*.015,.85+bob+Math.cos(t)*r*.344,Math.sin(t)*r*.294];};
            m.quad(p(cx-w,a),p(cx+w,a),p(cx+w,b),p(cx-w,b),stripe);
        }
        for(const front of [-1,1])for(const side of [-1,1]){
            const swing=Math.sin(phase+(front===side?0:Math.PI)),px=front*.45,zz=side*.21,lift=Math.max(0,swing)*.11;
            const footX=px+swing*.16,footZ=zz,groundY=ground(x+footX*co-footZ*si,z+footX*si+footZ*co)-base;
            const hip=[px,.79+bob,zz],knee=[px-swing*.06,.43+bob,zz],paw=[footX,.10+groundY+lift,zz];
            m.rod(hip,knee,.10,fur,12);m.rod(knee,paw,.07,fur,10);m.sphere(paw[0],paw[1],paw[2],.14,.095,.10,cream,12,7);
            for(const f of [.35,.65]){const p=knee.map((v,i)=>v+(paw[i]-v)*f),q=knee.map((v,i)=>v+(paw[i]-v)*(f+.1));m.rod(p,q,.073,stripe,10);}
        }
        pose(m,.65,1.0+bob,0,Math.sin(phase*.5)*.035,()=>{
            m.sphere(0,0,0,.30,.27,.28,fur,22,12);for(const side of [-1,1]){
                m.sphere(-.10,.23,side*.20,.115,.13,.065,stripe,12,8);m.sphere(-.085,.235,side*.205,.067,.08,.066,fur,10,6);
                m.sphere(.19,-.07,side*.13,.16,.12,.13,cream,16,8);m.sphere(.19,.08,side*.206,.035,.035,.025,'#bcb566',10,6);m.sphere(.205,.082,side*.22,.012,.027,.013,stripe,8,6);
                for(let i=0;i<3;i++)m.rod([-.02+i*.07,.18-i*.045,side*.205],[.02+i*.07,.07-i*.065,side*.266],.026,stripe,6);
                for(let i=0;i<3;i++)m.rod([.24,-.09,side*.14],[.29+i*.025,-.08-i*.035,side*.35],.005,cream,4);
            }
            m.sphere(.31,-.04,0,.06,.045,.075,'#866157',12,7);m.rod([.31,-.07,0],[.28,-.13,0],.012,stripe,6);
        });
        let prev=[-.63,.87+bob,0];for(let i=1;i<=9;i++){const f=i/9,p=[-.63-f*.83,.87+bob+Math.sin(f*Math.PI)*.18,Math.sin(f*2.2+phase*.35)*.17*f];m.rod(prev,p,.055-f*.024,i%2?fur:stripe,10);prev=p;}
    });
}

export function drawAnimalControlNet(m,x,base,z,angle,time){
    pose(m,x,base,z,angle-Math.PI/2,()=>{
        const lift=Math.sin(time*3)*.03;m.rod([.23,.8,.18],[.30,1.9+lift,.5],.024,'#a49165',10,'wood');
        for(let i=0;i<24;i++){const a=i*Math.PI/12,b=(i+1)*Math.PI/12;m.rod([.30+Math.cos(a)*.34,1.9+lift+Math.sin(a)*.34,.5],[.30+Math.cos(b)*.34,1.9+lift+Math.sin(b)*.34,.5],.015,'#b7bcb0',6);}
        for(let i=-2;i<=2;i++){const q=i*.1,half=Math.sqrt(.34**2-q*q);m.rod([.3-half,1.9+lift+q,.5],[.3+half,1.9+lift+q,.5],.005,'#d3cdb1',4);m.rod([.3+q,1.9+lift-half,.5],[.3+q,1.9+lift+half,.5],.005,'#d3cdb1',4);}
    });
}
