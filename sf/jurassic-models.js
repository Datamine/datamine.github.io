import {pose} from './geometry.js';
import {drawHatModel} from './hat-models.js';
import {drawPeptideVial} from './guild-models.js';
import {drawFacadeWindow} from './windows.js';
import {drawPlaque} from './southern-district.js';
import {JURASSIC,COW_PEN,KRAKEN_CAPE_LINES} from './jurassic-layout.js';

export const JURASSIC_SIGNS=Object.freeze(['JURASSIC BIOSCIENCES','AUTHORIZED PERSONNEL ONLY','THE PEQUOD',...KRAKEN_CAPE_LINES]);
export function drawJurassicCampus(m,signs){
    const b=JURASSIC.base,l=JURASSIC.lab,c=JURASSIC.cage,start=m.data.length;
    m.box(JURASSIC.x-JURASSIC.w/2,b-.08,JURASSIC.z-JURASSIC.d/2,JURASSIC.w,.08,JURASSIC.d,'#b9c1af','cobble');
    m.box(l.x-l.w/2,b,l.z-l.d/2,l.w,2.3,l.d,'#d7ddd1','stucco');
    for(const side of [-1,1])for(let i=0;i<3;i++)drawFacadeWindow(m,{isX:true,plane:l.x+side*(l.w/2+.012),along:l.z-l.d/2+.3+i*.95,y:b+.7,w:.62,h:.9,far:side<0,trim:'#789489',seed:i+side});
    m.box(l.x-l.w/2-.1,b+2.3,l.z-l.d/2-.1,l.w+.2,.16,l.d+.2,'#476f68','roof');
    for(const x of [-.55,.55]){m.box(l.x+x-.25,b+2.46,l.z-.5,.5,.32,.7,'#9caaa5',{metal:.3});for(let j=0;j<4;j++)m.box(l.x+x-.21+j*.11,b+2.78,l.z-.43,.04,.025,.54,'#667d78');}
    m.box(l.x-.36,b,l.z+l.d/2+.01,.72,1.65,.05,'#537a78','glass');
    m.box(l.x-l.w/2,b+1.82,l.z+l.d/2+.04,l.w,.34,.05,'#344f49');drawPlaque(m,signs,'JURASSIC BIOSCIENCES',l.x,b+1.86,l.z+l.d/2+.1,l.w-.1,.24);
    m.box(c.x-c.w/2,b,c.z-c.d/2,c.w,.045,c.d,'#9c977c','dirt');
    const corners=[[c.x-c.w/2,c.z-c.d/2],[c.x+c.w/2,c.z-c.d/2],[c.x+c.w/2,c.z+c.d/2],[c.x-c.w/2,c.z+c.d/2]];
    for(let i=0;i<3;i++){const a=corners[i],q=corners[i+1],steps=Math.ceil(Math.hypot(q[0]-a[0],q[1]-a[1])/.25);for(let j=0;j<=steps;j++){const x=a[0]+(q[0]-a[0])*j/steps,z=a[1]+(q[1]-a[1])*j/steps;m.rod([x,b,z],[x,b+2.3,z],.021,'#637970',8,{metal:.35});}for(const y of [.35,1.3,2.3])m.rod([a[0],b+y,a[1]],[q[0],b+y,q[1]],.033,'#87948b',10,{metal:.3});}
    // A service doorway divides the two front panels. The center gate animates.
    for(const side of [-1,1])for(let i=0;i<5;i++){const x=c.x+side*(.65+i*.24);m.rod([x,b,c.z+c.d/2],[x,b+2.3,c.z+c.d/2],.021,'#637970',8,{metal:.3});}
    for(const side of [-1,1])m.rod([c.x+side*.65,b,c.z+c.d/2],[c.x+side*.65,b+2.45,c.z+c.d/2],.045,'#82978a',10);
    drawPlaque(m,signs,'AUTHORIZED PERSONNEL ONLY',c.x,b+2.22,c.z+c.d/2+.03,2.1,.22);
    return {start,count:m.data.length-start,lo:[JURASSIC.x-JURASSIC.w/2,b-.08,JURASSIC.z-JURASSIC.d/2],hi:[JURASSIC.x+JURASSIC.w/2,b+2.9,JURASSIC.z+JURASSIC.d/2]};
}
export function drawRaptorGate(m,game){const c=JURASSIC.cage,b=JURASSIC.base,open=game.raptor.phase==='caged'?0:Math.min(1,game.raptor.release||1);pose(m,c.x-.65,b,c.z+c.d/2,-open*Math.PI*.48,()=>{for(let i=0;i<6;i++)m.rod([i*.26,0,0],[i*.26,2.2,0],.021,'#81918a',8);for(const y of [.25,1.15,2.2])m.rod([0,y,0],[1.3,y,0],.032,'#87948b',8);});}
export function drawVelociraptor(m,n,time){
    pose(m,n.x,n.base||0,n.z,n.angle,()=>{
        const first=m.data.length,dead=n.phase==='dead',bounce=dead?-.2:Math.sin(time*.009)*.025;
        m.sphere(0,.85+bounce,0,.57,.31,.25,'#7b8860',16,9);m.sphere(.48,1.02+bounce,0,.24,.22,.19,'#9aa375',14,8);
        m.sphere(.74,1.16+bounce,0,.26,.17,.14,'#7c8d64',16,8);m.sphere(.92,1.1+bounce,0,.22,.075,.13,'#a0aa7c',12,6);
        for(const side of [-1,1]){m.sphere(.78,1.21+bounce,side*.128,.035,.041,.012,'#e9ba5d',10,6);m.sphere(.79,1.21+bounce,side*.139,.012,.028,.005,'#27392a',8,5);for(let i=0;i<4;i++)m.tri([.8+i*.075,1.075,side*.08],[.83+i*.075,1.075,side*.08],[.82+i*.075,1.03,side*.08],'#eee6be');}
        let last=[-.45,.87,0];for(let i=1;i<=8;i++){const next=[-.45-i*.18,.87+i*.035,Math.sin(time*.005-i*.35)*i*.013];m.rod(last,next,.17*(1-i/9),'#7e8e62',10);last=next;}
        for(const side of [-1,1]){const stride=dead?0:Math.sin(time*.012+side)*.2,knee=[-.1,.43,side*.22],foot=[.12+stride,.1,side*.27];m.rod([-.22,.83,side*.14],knee,.1,'#8a9668',12);m.rod(knee,foot,.058,'#a3a679',10);for(let toe=0;toe<3;toe++)m.rod(foot,[foot[0]+.22,.055,foot[2]+(toe-1)*.055],.018,'#d9c9a2',7);m.rod([.36,.92,side*.15],[.53,.65,side*.31],.04,'#9fa779',9);m.rod([.53,.65,side*.31],[.73,.69,side*.32],.025,'#d0c297',8);}
        for(let i=0;i<9;i++)m.tri([-.4+i*.14,1.1,0],[-.33+i*.14,1.1,0],[-.43+i*.14,1.26,.015],'#566c50');
        if(dead)for(let i=first;i<m.data.length;i+=11){const y=m.data[i+1],z=m.data[i+2],ny=m.data[i+4],nz=m.data[i+5];m.data[i+1]=.35-z;m.data[i+2]=y-.7;m.data[i+4]=-nz;m.data[i+5]=ny;}
    });
}
export function drawCattlePen(m,ground){const p=COW_PEN;for(const side of [-1,1]){
    for(let i=0;i<=6;i++){const x=p.x-p.w/2+i*p.w/6,z=p.z+side*p.d/2,h=ground(x,z);if(side>0&&Math.abs(x-p.x)<.7)continue;m.box(x-.045,h,z-.045,.09,.9,.09,'#9b805b','wood');}
    for(const y of [.35,.7]){for(const [a,b] of side<0?[[p.x-p.w/2,p.x+p.w/2]]:[[p.x-p.w/2,p.x-.7],[p.x+.7,p.x+p.w/2]])m.rod([a,ground(a,p.z+side*p.d/2)+y,p.z+side*p.d/2],[b,ground(b,p.z+side*p.d/2)+y,p.z+side*p.d/2],.035,'#a18b65',8);m.rod([p.x+side*p.w/2,ground(p.x+side*p.w/2,p.z-p.d/2)+y,p.z-p.d/2],[p.x+side*p.w/2,ground(p.x+side*p.w/2,p.z+p.d/2)+y,p.z+p.d/2],.035,'#a18b65',8);}}
}
export function drawCow(m,c,time){pose(m,c.x,c.base||0,c.z,c.angle,()=>{
    m.sphere(0,.7,0,.58,.35,.28,'#e7e3cc',16,9);m.sphere(-.2,.77,.16,.25,.27,.13,'#4a5045',12,7);m.sphere(.44,.92,0,.22,.26,.2,'#dedcc9',14,8);m.sphere(.61,.78,0,.16,.095,.2,'#b99487',12,7);
    for(const side of [-1,1]){m.sphere(.48,1.04,side*.17,.025,.035,.012,'#273b31',9,5);m.rod([.36,1.1,side*.13],[.36,1.3,side*.24],.035,'#d5c79d',10);m.sphere(.35,1.03,side*.28,.12,.05,.07,'#b1ac94',10,6);}
    for(const x of [-.33,.32])for(const z of [-.18,.18]){const shift=Math.sin(time*.002+x+z)*.02;m.rod([x,.64,z],[x+shift,.1,z],.062,'#d5d6bd',10);m.box(x-.065+shift,.025,z-.06,.13,.1,.12,'#52594a');}m.rod([-.52,.7,0],[-.73,.35,Math.sin(time*.003)*.1],.022,'#b4b69d',8);
});}
export function drawSpectre(m,n,time){pose(m,n.x,(n.base||0)+.16+Math.sin(time*.002+n.x)*.1,n.z,n.angle||0,()=>{
    m.sphere(0,1.05,0,.34,.48,.27,'#5eab69',20,12,{emissive:.12});m.sphere(.13,1.4,0,.22,.24,.19,'#8ac67c',18,10);m.sphere(.25,1.31,0,.16,.11,.17,'#609958',14,8);
    for(const side of [-1,1]){m.sphere(.22,1.45,side*.16,.05,.043,.018,'#173d30',10,6);m.sphere(.235,1.45,side*.177,.018,.022,.006,'#d2ed84',9,6,{emissive:.6});let last=[.02,1.1,side*.23];for(let i=1;i<=5;i++){const q=[.08+i*.09,1.12-i*.1+Math.sin(time*.004+i)*.05,side*(.24+i*.045)];m.rod(last,q,.1*(1-i/7),'#74b676',12);last=q;}}
    for(let i=0;i<7;i++){const a=i*Math.PI*2/7;let last=[Math.cos(a)*.2,.8,Math.sin(a)*.18];for(let j=1;j<=4;j++){const q=[Math.cos(a)*(.2+j*.03)+Math.sin(time*.003+i+j)*.05,.8-j*.15,Math.sin(a)*(.18+j*.03)];m.rod(last,q,.09*(1-j/5),'#539c68',10);last=q;}}
});}
export function drawPequod(m,ship,time,signs){pose(m,ship.x,.04+Math.sin(time*.0014)*.035,ship.z,0,()=>{
    for(let i=0;i<20;i++){const x=-3+i*.3,q=x+.3,width=t=>Math.max(.12,Math.sin((t+3)/6*Math.PI)*1.2),a=width(x),b=width(q);for(const side of [-1,1]){m.quad([x,.12,side*a*.55],[q,.12,side*b*.55],[q,.85,side*b],[x,.85,side*a],'#72533d','wood');m.rod([x,.85,side*a],[q,.85,side*b],.035,'#c0a578',8);m.quad([x,.84,0],[q,.84,0],[q,.84,side*b],[x,.84,side*a],'#baa47b','wood');}}
    m.box(.8,.85,-.65,1.3,.65,1.3,'#8b7458','wood');m.box(.72,1.5,-.73,1.46,.08,1.46,'#554d3e','roof');
    for(const x of [-1.1,.4]){m.rod([x,.8,0],[x,5.1,0],.055,'#8e7958',12);m.rod([x-1.3,4.4,0],[x+1.3,4.4,0],.04,'#a18c65',10);if(ship.aboard)m.rod([x-1.2,4.25,0],[x+1.2,4.25,0],.11,'#d2d0b4',16);else m.quad([x-1.2,4.35,-.02],[x+1.2,4.35,-.02],[x+1.05,2.9,.12],[x-1.05,2.9,.12],'#d2d0b4');for(const side of [-1,1])m.rod([x,4.95,0],[x+side*.5,.87,side*.85],.009,'#baaf90',5);}
    drawPlaque(m,signs,'THE PEQUOD',1.45,1.05,-.665,.9,.22,false);
});}
export function drawKraken(m,n,time){pose(m,n.x,.08,n.z,0,()=>{
    m.sphere(0,.75,0,1.05,.75,.85,'#657b7a',24,14);m.sphere(0,1.15,0,.72,.85,.62,'#81908a',24,14);
    for(const side of [-1,1]){m.sphere(.55,1.37,side*.46,.16,.17,.09,'#dcc284',16,9);m.sphere(.64,1.37,side*.48,.045,.12,.04,'#263c3e',12,8);}
    for(let arm=0;arm<8;arm++){const a=arm*Math.PI/4;let last=[Math.cos(a)*.55,.35,Math.sin(a)*.55];for(let i=1;i<=11;i++){const r=.55+i*.23,b=a+Math.sin(time*.0018+arm)*i*.025,q=[Math.cos(b)*r,.22+Math.sin(i*.38+time*.002+arm)*.32+Math.sin(i/11*Math.PI)*.55,Math.sin(b)*r];m.rod(last,q,.21*(1-i/13),'#6f8681',12);if(i%2===0)m.sphere(q[0],q[1]+.09,q[2],.075,.035,.075,'#b8ad8e',9,6);last=q;}}
});}
export function drawRailgun(m,x,y,z,angle){pose(m,x,y,z,angle,()=>{m.box(-.13,-.07,-.08,.65,.14,.16,'#4c626b',{metal:.45});for(const side of [-1,1])m.box(.05,-.04,side*.1,.72,.045,.035,'#9cbabd',{metal:.5});m.box(.24,-.025,-.04,.56,.05,.08,'#85ddeb',{emissive:.65});m.box(-.08,-.24,-.045,.1,.2,.09,'#45535c');});}
export function drawBeam(m,beam){const a=beam.from,b=beam.to;m.rod([a.x,a.y,a.z],[b.x,b.y,b.z],.045,'#2e9dff',12,{emissive:.9});m.rod([a.x,a.y,a.z],[b.x,b.y,b.z],.018,'#c4f3ff',10,{emissive:1});m.sphere(b.x,b.y,b.z,.1,.1,.1,'#7fe4ff',12,7,{emissive:.85});}
export function drawExpeditionLoot(m,item,base,time){const x=item.x,z=item.z;if(item.lootKind==='peptides'){drawPeptideVial(m,x,base,z,time);}else if(item.lootKind==='equipment'){const top=item.itemId==='ice-top';m.box(x-.17,base+.05,z-.13,.34,top?.23:.12,.26,'#80c9e6');for(const side of [-1,1]){if(top)m.sphere(x+side*.2,base+.19,z,.10,.08,.10,'#e1faff',6,4);else m.box(x+side*.09-.07,base+.05,z+.08,.14,.1,.22,'#b3e7f4');m.sphere(x+side*.09,base+.23,z,.05,.12,.05,'#d2f7ff',5,4,{emissive:.12});}}else if(item.lootKind==='hat'){drawHatModel(m,item.hatId,x,base+.035,z,.3,1.1);}else if(item.lootKind==='iphone'){m.box(x-.11,base+.035,z-.18,.22,.035,.36,'#b4bdc3',{metal:.4});m.box(x-.095,base+.071,z-.16,.19,.008,.32,'#273e55');for(let i=0;i<6;i++)m.box(x-.07+(i%2)*.08,base+.081,z-.11+Math.floor(i/2)*.075,.045,.003,.045,['#80bfc4','#d9b368','#8ca6cd'][i%3],{emissive:.15});m.sphere(x,base+.082,z-.14,.014,.006,.014,'#1d242b',8,4);}else if(item.lootKind==='sandwich'){m.box(x-.18,base+.03,z-.12,.36,.07,.24,'#d8b56c');m.box(x-.17,base+.10,z-.12,.34,.04,.24,'#719852');m.box(x-.18,base+.14,z-.12,.36,.07,.24,'#e3c48a');}else if(item.lootKind==='raptor'){m.sphere(x,base+.1,z,.32,.14,.19,'#788964',14,8);m.rod([x-.3,base+.1,z],[x-.8,base+.08,z+.15],.04,'#adba8f',10);}else for(let i=0;i<7;i++)m.cylinder(x+Math.cos(i*2.4)*.15,base+.04+Math.floor(i/3)*.035,z+Math.sin(i*2.4)*.12,.075,.025,'#e7bd5b',12,.075,{metal:.7});}
export function drawKrakenCape(m,x,z,base,angle,time,signs){pose(m,x,base,z,angle-Math.PI/2,()=>{
    const top=[-.21,1.34,-.16],right=[.21,1.34,-.16],bottomY=.36,wave=Math.sin(time*.004)*.035;
    m.quad(top,[-.29,bottomY,-.25+wave],[.29,bottomY,-.25+wave],right,'#54647d');
    m.quad(right,[.29,bottomY,-.245+wave],[-.29,bottomY,-.245+wave],top,'#657b97');
    for(const [i,line] of KRAKEN_CAPE_LINES.entries()){const uv=signs.get(line),y=1.13-i*.115,zz=-.16-(1.34-y)/.98*(.09-wave)-.006;if(uv)m.quad([.235,y,zz],[-.235,y,zz],[-.235,y+.085,zz+.007],[.235,y+.085,zz+.007],'#ece2c4',uv);}
});}
