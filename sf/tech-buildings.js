import {APPLE_CAMPUS,ROBOTAXI_DEALER,appleRingSections} from './tech-layout.js';
import {drawPlaque} from './southern-district.js';
import {pose} from './geometry.js';

export const TECH_SIGNS=Object.freeze(['TIM APPLE','iPHONE · 100 COINS','TESLA ROBOTAXI','100 COINS · 20 / MINUTE']);
const techRectangle=(x,z,w,d)=>[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]];
export function drawAppleCampus(m,signs){
    const c=APPLE_CAMPUS,start=m.data.length,top=c.base+c.height,sections=appleRingSections(),at=(r,a,y)=>[c.x+Math.sin(a)*r,y,c.z+Math.cos(a)*r];
    for(const {a,b,polygon} of sections){
        m.quad(...polygon.map(([x,z])=>[x,c.base+.035,z]),'#b6c3bc','concrete');
        // Curved glass faces and three continuous white aluminum ribbons.
        for(const r of [c.outer,c.inner]){
            const p=[at(r,a,c.base+.10),at(r,b,c.base+.10),at(r,b,top-.10),at(r,a,top-.10)];if(r===c.inner)p.reverse();
            m.quad(...p,'#8ba9a9',{window:.12});
            for(const y of [c.base+.04,c.base+1.01,top-.08]){
                const band=[at(r+(r===c.outer?.018:-.018),a,y),at(r+(r===c.outer?.018:-.018),b,y),at(r+(r===c.outer?.018:-.018),b,y+.075),at(r+(r===c.outer?.018:-.018),a,y+.075)];if(r===c.inner)band.reverse();m.quad(...band,'#e0e6dc',{metal:.18});
            }
            m.rod(at(r,a,c.base+.10),at(r,a,top-.10),.012,'#c8d4cf',6);
        }
        m.quad(...polygon.map(([x,z])=>[x,top,z]),'#e6e7dc','concrete');
        m.quad(at(c.outer-.15,a,top+.025),at(c.outer-.15,b,top+.025),at(c.inner+.15,b,top+.025),at(c.inner+.15,a,top+.025),'#738b90','glass');
    }
    // Seal the two ends of the ring at its real walk-through northern gateway.
    const gateSides=[Math.max(...sections.filter(s=>s.b<Math.PI).map(s=>s.b)),Math.min(...sections.filter(s=>s.a>Math.PI).map(s=>s.a))];for(const a of gateSides)m.quad(at(c.inner,a,c.base+.035),at(c.outer,a,c.base+.035),at(c.outer,a,top),at(c.inner,a,top),'#dce3da','concrete');
    // An overhead bridge shades the gate without a collision wall below it.
    m.box(c.x-.77,top-.02,c.z-c.outer+.12,1.54,.12,.74,'#e6e8de','concrete');
    for(let i=0;i<64;i++){
        const a=i*Math.PI/32,b=(i+1)*Math.PI/32;
        m.tri([c.x,c.base+.014,c.z],at(c.inner-.13,b,c.base+.014),at(c.inner-.13,a,c.base+.014),'#8da66e','grass');
        m.quad(at(c.inner-.32,a,c.base+.027),at(c.inner-.32,b,c.base+.027),at(c.inner-.04,b,c.base+.027),at(c.inner-.04,a,c.base+.027),'#d2d8c7','sidewalk');
    }
    const tx=c.x+.3,tz=c.z+.7;m.cylinder(tx,c.base,tz,.055,.85,'#8d7d62',12,.04,'wood');
    for(const [dx,dy,dz,r] of [[0,1.12,0,.44],[-.3,1.03,.06,.31],[.25,1.22,-.1,.33]])m.sphere(tx+dx,c.base+dy,tz+dz,r,.38,r,'#74945b',14,8);
    const bx=c.x+1.05,bz=c.z+.6;m.box(bx-.4,c.base+.37,bz-.15,.8,.05,.3,'#9cae9f','wood');for(const dx of [-.31,.31])m.box(bx+dx,c.base,bz-.12,.035,.37,.24,'#7b8b80');m.box(bx-.4,c.base+.42,bz+.12,.8,.34,.035,'#9cae9f','wood');
    const sx=c.x-1.3,sz=c.z-c.outer-.47;m.box(sx-.58,c.base,sz-.11,1.16,.68,.22,'#dfe4d8','concrete');drawPlaque(m,signs,'TIM APPLE',sx,c.base+.35,sz-.125,1.04,.19,false);drawPlaque(m,signs,'iPHONE · 100 COINS',sx,c.base+.15,sz-.125,1.04,.12,false);
    const navigationPolygons=[...sections.map(p=>p.polygon),techRectangle(tx,tz,.6,.6),techRectangle(bx,bz,.85,.35),techRectangle(sx,sz,1.2,.25)];
    return {id:'tim-apple-campus',kind:'apple-campus',label:'Tim Apple campus',entry:{...c.entry},description:'A gleaming donut of curved glass and white aluminum, with a real open courtyard and northern gateway. Tim Apple sells iPhones inside for 100 coins. Equip one for 25% extra earnings; doomscrolling costs 5 HP every two minutes. The phone is lost on death or arrest.',start,count:m.data.length-start,lo:[c.x-c.outer-.1,c.base-.02,c.z-c.outer-.7],hi:[c.x+c.outer+.1,top+.2,c.z+c.outer+.1],footprint:techRectangle(c.x,c.z,c.outer*2,c.outer*2),navigationPolygons};
}

function drawCybercab(m,x,base,z,angle=0){pose(m,x,base,z,angle,()=>{
    // A low, faceted two-seat cab with a swept canopy, full-width light bars
    // and enclosed wheel faces. Local +X is the direction of travel.
    m.box(-.55,.11,-.28,1.1,.14,.56,'#b9ab78',{metal:.28});
    m.quad([-.56,.25,-.28],[.57,.25,-.28],[.42,.38,-.24],[-.41,.40,-.24],'#c4b484',{metal:.32});
    m.quad([-.56,.25,.28],[-.41,.40,.24],[.42,.38,.24],[.57,.25,.28],'#c4b484',{metal:.32});
    m.quad([-.41,.40,-.24],[.42,.38,-.24],[.42,.38,.24],[-.41,.40,.24],'#c5b585',{metal:.28});
    m.quad([-.40,.40,-.235],[-.20,.62,-.21],[.12,.62,-.21],[.39,.39,-.235],'#53676d','glass');
    m.quad([-.40,.40,.235],[.39,.39,.235],[.12,.62,.21],[-.20,.62,.21],'#53676d','glass');
    m.quad([-.20,.62,-.21],[-.20,.62,.21],[.12,.62,.21],[.12,.62,-.21],'#b9c5c0','glass');
    m.quad([.12,.62,-.21],[.12,.62,.21],[.39,.39,.235],[.39,.39,-.235],'#4d6269','glass');
    m.quad([-.4,.40,-.235],[-.4,.40,.235],[-.20,.62,.21],[-.20,.62,-.21],'#667980','glass');
    for(const xx of [-.36,.36])for(const side of [-1,1]){
        const zz=side*.27;pose(m,xx,.14,zz,0,()=>{m.rod([0,0,-.045],[0,0,.045],.12,'#3c4646',18);m.rod([0,0,side*.045],[0,0,side*.051],.089,'#afa986',18,{metal:.3});});
    }
    m.box(.555,.27,-.23,.018,.025,.46,'#d4e5d8',{emissive:.35});m.box(-.565,.25,-.23,.018,.022,.46,'#b98379',{emissive:.22});
});}
export function drawRobotaxiDealer(m,signs){
    const r=ROBOTAXI_DEALER,start=m.data.length,x=r.x,z=r.z,base=r.base;
    m.box(x-r.w/2,base-.025,z-r.d/2,r.w,.06,r.d,'#bbc3b7','concrete');
    m.box(x-1.4,base+.035,z-.3,2.8,1.65,1.9,'#cbd3cd','stucco');
    m.box(x-1.49,base+1.68,z-.4,2.98,.13,2.1,'#e2e6dd','concrete');
    m.quad([x-1.25,base+.23,z-.315],[x-1.25,base+1.47,z-.315],[x+1.25,base+1.47,z-.315],[x+1.25,base+.23,z-.315],'#7e9d9f',{window:.12});
    for(const xx of [-1.25,0,1.25])m.box(x+xx-.015,base+.17,z-.34,.03,1.4,.035,'#e3e7dc');
    m.box(x-1.4,base+1.27,z-.365,2.8,.26,.055,'#465d61');drawPlaque(m,signs,'TESLA ROBOTAXI',x,base+1.32,z-.43,2.55,.14,false);
    drawPlaque(m,signs,'100 COINS · 20 / MINUTE',x,base+.10,z-.37,2.5,.11,false);
    drawCybercab(m,x-.72,base+.04,z-1.02,0);drawCybercab(m,x+.7,base+.04,z-.95,Math.PI);
    // Charging posts and a showroom roof fan stay off the public approach.
    for(const xx of [-1.34,1.34]){m.box(x+xx-.06,base+.06,z-.83,.12,.60,.14,'#e6e8df','concrete');m.box(x+xx-.04,base+.43,z-.91,.08,.14,.018,'#6b9295',{emissive:.16});m.rod([x+xx,base+.3,z-.83],[x+xx*.85,base+.2,z-.93],.012,'#566968',7);}
    m.box(x+.65,base+1.82,z+.3,.55,.23,.55,'#a4b6ae',{metal:.2});m.cylinder(x+.925,base+2.05,z+.575,.17,.02,'#6e837d',18,.17);
    const navigationPolygons=[techRectangle(x,z+.65,2.85,1.95),techRectangle(x-.72,z-1.02,1.18,.6),techRectangle(x+.7,z-.95,1.18,.6)];
    return {id:'tesla-robotaxi',kind:'robotaxi-dealer',label:'Tesla robotaxi dealership',entry:{...r.entry},description:'A small South Bay showroom of gold autonomous cabs. Talk to the dealer outside: 100 coins buys a robotaxi business that pays 20 coins per active minute. An equipped iPhone boosts fares to 25. There are no offline payouts, and ownership survives death or arrest.',start,count:m.data.length-start,lo:[x-r.w/2-.05,base-.05,z-r.d/2-.05],hi:[x+r.w/2+.05,base+2.15,z+r.d/2+.1],footprint:techRectangle(x,z,r.w,r.d),navigationPolygons};
}
