import {pose} from './geometry.js';

export function drawShipyardCargo(m,x,base,z,seed=0,crane=false){
    const start=m.data.length;
    pose(m,x,base,z,0,()=>{
        m.box(-.8,0,-.95,1.6,.045,1.9,'#8f9992','concrete');
        if(crane){
            for(const s of [-1,1])m.rod([s*.6,.05,-.6],[s*.36,2.8,-.6],.055,'#b19865',10,{metal:.2});
            m.rod([-.36,2.8,-.6],[.36,2.8,-.6],.07,'#c3aa76',10);m.rod([0,2.8,-.6],[0,4.2,.95],.065,'#b19865',10);m.rod([0,4.2,.95],[0,1.5,.95],.012,'#546268',6);
            m.rod([0,1.5,.95],[.12,1.37,.95],.025,'#65777b',8);m.rod([.12,1.37,.95],[.2,1.48,.95],.025,'#65777b',8);
            for(let y=.4;y<2.6;y+=.35)m.rod([-.31,y,-.6],[.31,y+.22,-.6],.015,'#d0b985',4);
            m.box(-.6,.06,-.8,1.2,.3,.55,'#617c83','concrete');
        }else{
            for(let level=0;level<(seed>.5?2:1);level++){
                const c=['#747e72','#8d6654','#566b79'][Math.floor(seed*7+level)%3],y=.05+level*.66;m.box(-.67,y,-.85,1.34,.64,1.7,c,{metal:.15});
                for(let i=0;i<9;i++)for(const side of [-1,1])m.box(side*.675,y+.04,-.78+i*.18,.018,.55,.028,'#a7aaa0',{metal:.1});
                for(const xx of [-.4,.4])m.rod([xx,y+.07,.87],[xx,y+.57,.87],.014,'#b9bbb0',6);
            }
        }
    });
    return {start,count:m.data.length-start,footprint:[[x-.8,z-.95],[x+.8,z-.95],[x+.8,z+.95],[x-.8,z+.95]]};
}

export const NAVY_SHIP=Object.freeze({x:101,z:79,angle:-Math.PI/2});
export function drawNavyShip(m,time,reduced=false){
    const t=reduced?0:time*.001;
    pose(m,NAVY_SHIP.x,.13+Math.sin(t*.55)*.025,NAVY_SHIP.z,NAVY_SHIP.angle,()=>{
        // A tapered displacement hull, raised forecastle and faceted bridge.
        const hull=[[-4.8,0],[-3.6,-.77],[2.7,-.83],[4.9,-.27],[5.3,0],[4.9,.27],[2.7,.83],[-3.6,.77]];
        for(let i=0;i<hull.length;i++){const a=hull[i],b=hull[(i+1)%hull.length];m.quad([a[0],.03,a[1]*.7],[b[0],.03,b[1]*.7],[b[0],.63,b[1]],[a[0],.63,a[1]],'#687d85',{metal:.15});m.tri([0,.65,0],[a[0],.65,a[1]],[b[0],.65,b[1]],'#909d9e','concrete');}
        m.box(-2,.65,-.55,3.2,.65,1.1,'#899d9e',{metal:.12});m.box(-.7,1.3,-.45,1.65,.7,.9,'#a1b0ad',{metal:.15});
        for(const side of [-1,1])for(let i=0;i<5;i++)m.box(-.55+i*.29,1.64,side*.455,.22,.22,.018,'#3e626e','glass');
        m.box(-.84,2,-.55,1.93,.1,1.1,'#6d858c');m.cylinder(-1.6,1.3,0,.18,.8,'#52656d',20,.14);m.cylinder(-1.6,2.08,0,.23,.07,'#394e58',20);
        m.rod([.05,2.1,0],[.05,4.1,0],.04,'#a0b0ae',12);m.rod([-.7,3,0],[.8,3,0],.025,'#91a7a7',8);
        pose(m,.05,3.7,0,reduced?0:t*.3,()=>{m.box(-.5,0,-.025,1,.29,.05,'#6b818a',{metal:.2});for(let i=0;i<6;i++)m.rod([-.45+i*.18,0,-.04],[-.45+i*.18,.29,-.04],.009,'#b6c3bb',4);});
        m.cylinder(2.8,.66,0,.36,.4,'#788c92',24,.28,{metal:.2});m.rod([2.95,1,0],[4.15,1.11,0],.055,'#6b8088',12);
        for(const side of [-1,1])for(let i=0;i<16;i++){const x=-3.6+i*.45,z=side*.72;m.rod([x,.66,z],[x,.94,z],.01,'#c3cfca',4);if(i<15)m.rod([x,.92,z],[x+.45,.92,z],.01,'#c3cfca',4);}
        m.cylinder(-3.3,.68,0,.42,.045,'#5e777c',32);m.box(-3.56,.73,-.025,.52,.006,.05,'#c9d2c4');
        for(const side of [-1,1])for(let i=0;i<4;i++)m.rod([-4-i*.6,.025,side*(.3+i*.2)],[-4.5-i*.6,.025,side*(.4+i*.2)],.025,'#a4c7c1',4);
    });
}
