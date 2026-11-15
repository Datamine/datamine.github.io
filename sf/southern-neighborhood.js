import {pose,rand} from './geometry.js';
import {drawFacadeWindow} from './windows.js';
import {drawPlaque} from './southern-district.js';
import {SOUTHERN_HOUSING,inSouthernHousePlot,southernTrailDistance} from './southern-layout.js';

export function populateSouthernNeighborhood({mesh,terrain,makeTownhomeRow,tree,bench,roadDistance,signs}){
    const houses=[];
    for(const [i,p] of SOUTHERN_HOUSING.entries())houses.push(makeTownhomeRow(p.x-p.w/2,p.z-p.d/2,p.w,p.d,2,.17+i*.083,p.rotation,i%3===2?'victorian':'west'));
    // Coastal pines and broadleaf trees frame the streets and hill contours.
    // Every tree inherits the terrain below it; none brings a square of turf.
    const trees=[];
    for(let i=0;i<135;i++){
        const x=21+rand(i,11,2)*50,z=99+rand(i,13,7)*70;
        if(roadDistance(x,z)<1.3||southernTrailDistance(x,z)<.95||inSouthernHousePlot(x,z,1)||x>60&&z<107||x>64&&z>128||x>74)continue;
        if(terrain.height(x,z)<2.5&&i%3)continue;
        tree(x-.5,z-.5,i%3===0?true:i%7===0?3:false);trees.push({x,z});
    }
    for(const [x,z] of [[44.3,112.1],[47.6,113.6],[52.2,109.4]])bench(x,z);
    for(let i=0;i<22;i++){
        const x=31+rand(i,7,5)*21,z=107+rand(i,5,4)*42;
        if(roadDistance(x,z)<1.3||southernTrailDistance(x,z)<.9)continue;
        const h=terrain.height(x,z),r=.18+rand(i,8,9)*.23;mesh.sphere(x,h+.07,z,r,.17+r*.2,r*.8,i%2?'#a7ab93':'#919b85',14,8,'dirt');
        for(let j=0;j<3;j++)mesh.sphere(x+.32+j*.1,h+.1,z+.18,.12,.13,.11,'#7a9252',8,5);
    }
    const cafe=drawSouthernCafe(mesh,terrain,signs);
    const lamps=[{x:63.34,z:102,angle:Math.PI/2},{x:61.66,z:109,angle:-Math.PI/2},{x:63.34,z:114,angle:Math.PI/2},{x:61.66,z:122,angle:-Math.PI/2},{x:57.34,z:108,angle:Math.PI/2},{x:57.34,z:115,angle:Math.PI/2},{x:73.76,z:102,angle:-Math.PI/2},{x:73.76,z:115,angle:-Math.PI/2},{x:75.44,z:123,angle:Math.PI/2}];
    return {houses,trees,lamps,sights:[cafe.sight],diners:cafe.diners};
}

function drawSouthernCafe(m,terrain,signs){
    const x=59.4,z=102.5,w=3.4,d=2.4,base=terrain.naturalHeight(x,z+d/2+.3)+.12,start=m.data.length;
    terrain.cutPlot({cx:x,cz:z,w,d,height:base-.035,onlyLower:true});
    const corners=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]];let low=base-.12;
    for(let side=0;side<4;side++){
        const a=corners[side],b=corners[(side+1)%4],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.5);
        for(let i=0;i<steps;i++){const point=t=>{const xx=x+a[0]+(b[0]-a[0])*t,zz=z+a[1]+(b[1]-a[1])*t,h=Math.min(terrain.height(xx,zz),terrain.naturalHeight(xx,zz),base-.12)-.04;low=Math.min(low,h);return [xx,h,zz];},p=point(i/steps),q=point((i+1)/steps);m.quad(p,q,[q[0],base-.06,q[2]],[p[0],base-.06,p[2]],'#a7a58c','stucco');}
    }
    const rear=terrain.naturalHeight(x,z-d/2)+.08,rearHeight=Math.min(1.2,base-rear-.15);
    if(rearHeight>.6){m.box(x-.24,rear,z-d/2-.035,.48,rearHeight,.035,'#587d6d','wood');for(const dx of [-1.1,.72])drawFacadeWindow(m,{plane:z-d/2-.01,along:x+dx,y:rear+.35,w:.4,h:.48,far:true,trim:'#d5cfb6',seed:dx+5});}
    pose(m,x,base,z,0,()=>{
        m.box(-w/2,-.12,-d/2,w,1.95,d,'#b98b6c','brick');
        m.box(-w/2-.07,1.83,-d/2-.06,w+.14,.14,d+.12,'#dfd4b5','stone');
        m.quad([-w/2-.06,1.97,-d/2-.06],[w/2+.06,1.97,-d/2-.06],[w/2+.06,2.43,0],[-w/2-.06,2.43,0],'#637d72','shingles');
        m.quad([-w/2-.06,2.43,0],[w/2+.06,2.43,0],[w/2+.06,1.97,d/2+.06],[-w/2-.06,1.97,d/2+.06],'#718d7f','shingles');
        for(const xx of [-.3,.75])drawFacadeWindow(m,{plane:d/2+.01,along:xx,y:.2,w:.78,h:1.05,trim:'#e3d8bb',seed:xx+3,style:'storefront'});
        m.box(-1.35,0,d/2+.025,.6,1.46,.045,'#477b70','wood');m.box(-1.27,.76,d/2+.075,.44,.55,.014,'#799e9e',{window:.2});
        for(let i=0;i<12;i++){const a=-.48+i*.19,b=a+.19;m.quad([a,1.55,d/2],[b,1.55,d/2],[b,1.28,d/2+.43],[a,1.28,d/2+.43],i%2?'#d9d4b7':'#609887','wood');}
        drawPlaque(m,signs,'PENINSULA CAFE',0,1.61,d/2+.03,2.7,.26);
        for(const xx of [-1.3,1.38]){m.box(xx-.12,0,d/2+.1,.24,.24,.3,'#a87652','wood');m.sphere(xx,.4,d/2+.25,.18,.23,.16,'#71984e',12,8);}
    });
    const table={x:60,z:104.2,base:terrain.height(60,104.2)};m.cylinder(table.x,table.base,table.z,.045,.55,'#627b6b',12);m.cylinder(table.x,table.base+.55,table.z,.36,.065,'#b8a17b',32);m.cylinder(table.x,table.base+.62,table.z,.065,.095,'#e2ddbd',16);
    const diners=[];
    for(const [i,dx] of [[0,-.5],[1,.5]]){
        const xx=table.x+dx,zz=table.z,ground=terrain.height(xx,zz),angle=dx<0?0:Math.PI;
        m.box(xx-.17,ground+.32,zz-.17,.34,.06,.34,'#9c8660','wood');for(const a of [-.13,.13])for(const q of [-.13,.13])m.rod([xx+a,ground,zz+q],[xx+a,ground+.34,zz+q],.017,'#526b60',6);
        diners.push({id:'peninsula-cafe-diner-'+i,label:i?'Woman':'Man',x:xx,z:zz,base:ground+.025,height:1.55,angle,index:i,hold:0,seed:.27+i*.33});
    }
    return {sight:{id:'peninsula-cafe',kind:'cafe',label:'Peninsula Café',entry:{x:59.4-.5,y:104.5},description:'A little corner café above the airport road. The espresso is strong; the debate over whose turn it is to pay is stronger.',start,count:m.data.length-start,lo:[x-w/2,low,z-d/2-.04],hi:[x+w/2,base+2.43,104.7]},diners};
}
