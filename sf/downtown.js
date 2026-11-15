import {pose,unit} from './geometry.js';

const drawingUnit=64/83,marketEnd=[69.5*drawingUnit,29.5*drawingUnit],marketWest=[46.5*drawingUnit,52.5*drawingUnit],diagonal=Math.SQRT1_2;
const entrance=[marketEnd[0]+diagonal*2.25,marketEnd[1]-diagonal*2.25];
/** One authored coordinate system for streets, models and map symbols. */
export const DOWNTOWN=Object.freeze({
    market:[marketEnd,marketWest],
    ferry:{entrance,center:[entrance[0]+diagonal*.65,entrance[1]-diagonal*.65],width:5.5,depth:1.95,angle:Math.PI/4},
    salesforce:{center:[50,30],width:2.5,depth:2.5},
    firstStreet:[[52,marketEnd[0]+marketEnd[1]-52],[53.6,25.3],[53.6,26.3]],
    bridge:{rampStart:[53.6,26.3],abutment:[55.3,28.3],end:[63.5,23.5]}
});
export function marketSide(x,z){return x+z-marketEnd[0]-marketEnd[1];}

function arch(m,x,y,z,w,h,color){
    const r=w/2,shoulder=y+h-r;
    m.quad([x,y,z],[x+w,y,z],[x+w,shoulder,z],[x,shoulder,z],color);
    for(let i=0;i<16;i++){const a=i*Math.PI/16,b=(i+1)*Math.PI/16;m.tri([x+r,shoulder,z],[x+r+Math.cos(a)*r,shoulder+Math.sin(a)*r,z],[x+r+Math.cos(b)*r,shoulder+Math.sin(b)*r,z],color);}
}
export function drawFerryBuilding(m,cx,base,cz,sign){
    const w=5.5,d=1.95;
    pose(m,cx,base,cz,Math.PI/4,()=>{
        m.box(-w/2-.25,-.25,-d/2-.25,w+.5,.25,d+.8,'#b3b7ac','stone');
        m.box(-w/2,0,-d/2,w,1.15,d,'#c4b7a1','stone');
        m.box(-w/2-.06,1.13,-d/2-.04,w+.12,.11,d+.08,'#d8d1bf');
        const ridge=[[-w/2,1.6,0],[w/2,1.6,0]];
        for(const side of [-1,1])m.quad([-w/2,1.24,side*d*.54],[w/2,1.24,side*d*.54],ridge[1],ridge[0],'#74867e','roof');
        for(let i=0;i<11;i++){
            const x=-w/2+.15+i*.48;arch(m,x,.16,d/2+.015,.31,.75,'#526f72');
            m.box(x-.04,.04,d/2+.025,.045,1.05,.065,'#d8cfb9');
        }
        m.box(-.43,.15,-.38,.86,3.8,.76,'#cec2a7','stone');
        for(const y of [1.34,2.15,3.05,3.74])m.box(-.49,y,-.44,.98,.1,.88,'#e0d5bc');
        for(const side of [-1,1])for(const x of [-.25,.1])arch(m,x,2.25,side*.395,.15,.47,'#657e78');
        for(let face=0;face<4;face++)pose(m,0,0,0,face*Math.PI/2,()=>{
            m.sphere(0,3.4,.405,.235,.235,.017,'#f1e7cd',32,10);
            for(let i=0;i<12;i++){const a=i*Math.PI/6;m.rod([Math.sin(a)*.18,3.4+Math.cos(a)*.18,.428],[Math.sin(a)*.205,3.4+Math.cos(a)*.205,.428],.01,'#5f665b',4);}
            m.rod([0,3.4,.435],[-.09,3.52,.435],.014,'#4b574e',5);m.rod([0,3.4,.436],[.145,3.44,.436],.01,'#4b574e',5);
        });
        m.cylinder(0,3.85,0,.6,.16,'#a7b2a0',8,.56);m.cylinder(0,4.01,0,.55,.7,'#6d847b',8,.09);m.cylinder(0,4.71,0,.045,.32,'#c0b699',12,.012);
        if(sign)sign(m,0,.88,d/2+.08,2.7,.24,'FERRY BUILDING');
        for(let x=-2.8;x<=2.8;x+=.55)for(const z of [-1.1,1.35])m.cylinder(x,-.55,z,.045,.55,'#7b8073',10);
    });
}
export function drawSalesforce(m,cx,base,cz){
    m.box(cx-1.25,base,cz-1.25,2.5,.25,2.5,'#b6bcb3','concrete');
    const rings=42,H=10.1,crownStart=36/rings,rotation=Math.PI/4,co=Math.cos(rotation),si=Math.sin(rotation),outline=[];
    // A rounded rectangle gives the tower broad, street-aligned façades.
    // The shoulders taper gently to a full-width roof rather than a dome.
    for(const [corner,center] of [[.73,.57],[-.73,.57],[-.73,-.57],[.73,-.57]].entries())for(let step=0;step<10;step++){
        const angle=corner*Math.PI/2+step*Math.PI/18,nx=Math.cos(angle),nz=Math.sin(angle);
        outline.push({x:center[0]+nx*.3,z:center[1]+nz*.3,nx,nz});
    }
    const sides=outline.length,perimeter=[0];
    for(let i=0;i<sides;i++){const a=outline[i],b=outline[(i+1)%sides];perimeter.push(perimeter[i]+Math.hypot(b.x-a.x,b.z-a.z));}
    const shoulder=t=>Math.max(0,Math.min(1,(t-.78)/.22));
    const profile=t=>{const u=shoulder(t);return 1-.07*t-.17*u*u*(3-2*u);};
    const point=(t,i,outset=0)=>{const p=outline[i%sides],x=p.x*profile(t)+p.nx*outset,z=p.z*profile(t)+p.nz*outset;return [cx+x*co-z*si,base+.25+t*H,cz+x*si+z*co];};
    const normal=(t,i)=>{const p=outline[i%sides],u=shoulder(t),slope=-.07-.17*6*u*(1-u)/.22;return unit([p.nx*co-p.nz*si,-slope*(p.nx*p.x+p.nz*p.z)/H,p.nx*si+p.nz*co]);};
    // The horizontal coordinate follows the real perimeter, so the blue light
    // flows across the flat façades as well as the curved corners.
    const crownUV=(t,i)=>[-.58+perimeter[i]/perimeter[sides]*.16,(t-crownStart)/(1-crownStart)];
    for(let j=0;j<rings;j++)for(let i=0;i<sides;i++){
        const t=j/rings,u=(j+1)/rings,start=m.data.length;
        m.quad(point(t,i),point(t,i+1),point(u,i+1),point(u,i),i%10===9?'#7c9da5':'#72949d',t>=crownStart?[crownUV(t,i),crownUV(t,i+1),crownUV(u,i+1),crownUV(u,i)]:'glass');
        for(const [vertex,[height,index]] of [[t,i],[t,i+1],[u,i+1],[t,i],[u,i+1],[u,i]].entries()){
            const n=normal(height,index);for(let k=0;k<3;k++)m.data[start+vertex*11+3+k]=n[k];
        }
        if(j%3===0)m.rod(point(t,i,.007),point(t,i+1,.007),.008,'#b2c2bd',4);
    }
    const roof=base+.25+H;
    for(let i=0;i<sides;i++){
        m.tri([cx,roof,cz],point(1,i+1),point(1,i),'#819699','roof');
        m.rod(point(1,i,.006),point(1,i+1,.006),.014,'#b5c6c5',4,{metal:.18});
    }
    // Slim vertical mullions give the straight walls an office-building rhythm.
    for(let face=0;face<4;face++)for(let k=1;k<=5;k++){
        const a=outline[face*10+9],b=outline[(face*10+10)%sides],f=k/6,x=a.x+(b.x-a.x)*f,z=a.z+(b.z-a.z)*f;
        const at=t=>{const s=profile(t);return [cx+x*s*co-z*s*si,base+.25+t*H,cz+x*s*si+z*s*co];};
        for(const [t,u] of [[0,.78],[.78,.86],[.86,.93],[.93,1]])m.rod(at(t),at(u),.006,'#a3babe',4,{metal:.16});
    }
    pose(m,cx,base,cz,rotation,()=>{
        m.box(-.5,.25,.87,1,.62,.025,'#587a85','glass');
        m.box(-.65,.9,.8,1.3,.045,.27,'#afbec0',{metal:.2});
        m.box(-.015,.25,.9,.03,.62,.025,'#b5c6c5',{metal:.2});
        m.box(-.32,.25+H+.012,-.2,.64,.09,.4,'#7b8e90','roof');
        for(let i=0;i<5;i++)m.box(-.28+i*.12,.25+H+.102,-.17,.045,.012,.34,'#52686e');
    });
}
export function drawCoitTower(m,cx,base,cz){
    for(const [r,y,h] of [[.93,0,.09],[.85,.09,.09],[.75,.18,.12]])m.cylinder(cx,base+y,cz,r,h,'#c5c5b3',48);
    const sides=64;
    for(let j=0;j<6;j++)for(let i=0;i<sides;i++){
        const a=i*Math.PI*2/sides,b=(i+1)*Math.PI*2/sides,r=t=>.5+.018*Math.cos(t*16),low=base+.3+j*.65,high=low+.65;
        m.quad([cx+Math.cos(a)*r(a),low,cz+Math.sin(a)*r(a)],[cx+Math.cos(b)*r(b),low,cz+Math.sin(b)*r(b)],[cx+Math.cos(b)*r(b),high,cz+Math.sin(b)*r(b)],[cx+Math.cos(a)*r(a),high,cz+Math.sin(a)*r(a)],i%4<2?'#d2d0bd':'#c3c5b4','stone');
    }
    m.cylinder(cx,base+4.13,cz,.56,.12,'#d9d5c0',48);
    m.cylinder(cx,base+4.25,cz,.405,.68,'#63766e',40);
    for(let i=0;i<12;i++){
        const a=i*Math.PI/6;m.cylinder(cx+Math.cos(a)*.48,base+4.23,cz+Math.sin(a)*.48,.046,.73,'#ddd8c3',12);
        for(let j=0;j<12;j++){const t=j*Math.PI/12,u=(j+1)*Math.PI/12,at=v=>[cx+Math.cos(a)*.49-Math.sin(a)*Math.cos(v)*.09,base+4.7+Math.sin(v)*.12,cz+Math.sin(a)*.49+Math.cos(a)*Math.cos(v)*.09];m.rod(at(t),at(u),.018,'#d7d3be',5);}
    }
    m.cylinder(cx,base+4.94,cz,.61,.13,'#d7d3be',48);m.cylinder(cx,base+5.07,cz,.55,.12,'#b8c0ae',48,.52);
    pose(m,cx,base,cz,0,()=>arch(m,-.14,.3,.52,.28,.7,'#5f7269'));
}

export const BAY_BRIDGE_WIDTH=1;

/** The walkable highway and bridge renderer share the exact ramp centerline. */
export function bayBridgeRoute(scale,groundHeight){
    const {rampStart:a,abutment:b,end:c}=DOWNTOWN.bridge,A=a.map(v=>v*scale),B=b.map(v=>v*scale),C=c.map(v=>v*scale),low=groundHeight(...A)+.025;
    const dx=C[0]-B[0],dz=C[1]-B[1],length=Math.hypot(dx,dz),controlA=[A[0],A[1]+1.3*scale],controlB=[B[0]-dx/length*scale,B[1]-dz/length*scale],points=[];
    for(let i=0;i<=24;i++){const t=i/24,u=1-t,s=t*t*(3-2*t);points.push([u*u*u*A[0]+3*u*u*t*controlA[0]+3*u*t*t*controlB[0]+t*t*t*B[0],low+(2.5-low)*s,u*u*u*A[1]+3*u*u*t*controlA[1]+3*u*t*t*controlB[1]+t*t*t*B[1]]);}
    points.push([C[0],2.5,C[1]]);return points;
}
export function drawBayBridge(m,scale,groundHeight){
    const {rampStart:a,abutment:b,end:c}=DOWNTOWN.bridge,deck=2.5,width=BAY_BRIDGE_WIDTH/2;
    const A=a.map(v=>v*scale),B=b.map(v=>v*scale),C=c.map(v=>v*scale);
    const low=groundHeight(...A)+.025,dx=C[0]-B[0],dz=C[1]-B[1],length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length;
    const at=(t,side,y=deck)=>[B[0]+dx*t+nx*side,y,B[1]+dz*t+nz*side];
    const ramp=bayBridgeRoute(scale,groundHeight).slice(0,-1);
    for(let i=1;i<ramp.length;i++){
        const p=ramp[i-1],q=ramp[i],len=Math.hypot(q[0]-p[0],q[2]-p[2]),x=-(q[2]-p[2])/len*width,z=(q[0]-p[0])/len*width;
        m.quad([p[0]-x,p[1],p[2]-z],[p[0]+x,p[1],p[2]+z],[q[0]+x,q[1],q[2]+z],[q[0]-x,q[1],q[2]-z],'#747e7a','asphalt');
        for(const side of [-1,1])m.rod([p[0]+x*side,p[1]+.12,p[2]+z*side],[q[0]+x*side,q[1]+.12,q[2]+z*side],.026,'#b6c4bd',6);
    }
    for(const index of [8,16]){const p=ramp[index],ground=Math.max(.02,groundHeight(p[0],p[2]));if(p[1]>ground+.16)m.cylinder(p[0],ground,p[2],.075,p[1]-ground-.05,'#a5b3aa',16);}
    m.quad(at(0,-width),at(0,width),at(1,width),at(1,-width),'#7d8985','asphalt');
    m.quad(at(0,-width,deck-.35),at(0,width,deck-.35),at(1,width,deck-.35),at(1,-width,deck-.35),'#71817b');
    for(const side of [-width,width]){
        for(const t of [.25,.75]){m.rod(at(t,side,-.1),at(t,side,6.3),.075,'#9daea5',10);for(const y of [3.1,4.25,5.4,6.05])m.rod(at(t,-width*1.1,y),at(t,width*1.1,y),.045,'#b9c7be',8);}
        let previous=null;for(let i=0;i<=56;i++){const t=i/56,h=deck+3.7*(t<.25?t*4:t>.75?(1-t)*4:.18+.82*((t-.5)/.25)**2),point=at(t,side,h);if(previous)m.rod(previous,point,.025,'#aabeb3',6);if(i%2===0)m.rod(at(t,side),point,.012,'#b0c3b8',4);previous=point;}
        for(let i=0;i<30;i++){m.rod(at(i/30,side,deck-.32),at((i+1)/30,side,deck),.018,'#9eafa6',4);m.rod(at(i/30,side,deck+.12),at((i+1)/30,side,deck+.12),.015,'#bfcfc4',4);}
    }
    // The island has an open road cutting so the eastern highway continues
    // visibly through the portal instead of disappearing into an opaque hill.
    const fx=dx/length,fz=dz/length,ix=C[0]+fx*2,iz=C[1]+fz*2;
    const islandHeight=(x,z)=>{const r=((x-ix)/3.25)**2+((z-iz)/2.8)**2,s=((x-ix-1.1)/2.1)**2+((z-iz+.8)/2.1)**2,h=Math.max(r<1?1.35+1.85*Math.sqrt(1-r):.02,s<1?.85+1.35*Math.sqrt(1-s):.02);return Math.abs((x-C[0])*nx+(z-C[1])*nz)<1.2?Math.min(2.15,h):h;};
    for(let z=iz-3;z<iz+3;z+=.5)for(let x=ix-3.5;x<ix+3.5;x+=.5){const p=[[x,z],[x,z+.5],[x+.5,z+.5],[x+.5,z]].map(([xx,zz])=>[xx,islandHeight(xx,zz),zz]);if(p.some(q=>q[1]>.03))m.quad(...p,'#7e9473','grass');}
    const portalAngle=Math.atan2(fz,fx);
    pose(m,C[0]-.25*fx,0,C[1]-.25*fz,portalAngle,()=>{
        m.box(-.06,2.25,-.67,.14,.95,.13,'#b6b8a2','concrete');m.box(-.06,2.25,.54,.14,.95,.13,'#b6b8a2','concrete');m.box(-.06,3.1,-.67,.14,.12,1.34,'#b6b8a2','concrete');
    });
    for(const [ox,oz] of [[-.2,1.4],[.8,-1.6],[1.3,1.3]]){const h=islandHeight(ix+ox,iz+oz);m.cylinder(ix+ox,h,iz+oz,.035,.7,'#6d7356',10);m.sphere(ix+ox,h+.68,iz+oz,.29,.37,.26,'#607d5d',12,6);}

}
