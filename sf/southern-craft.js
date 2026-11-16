import {pose,tint} from './geometry.js';
import {drawFacadeWindow} from './windows.js';
import {drawPlaque} from './southern-district.js';
import {intersectTilePolygons,tileArea} from './tiles.js';
import {SOUTHERN_CRAFT,craftPoint,craftFootprint} from './southern-craft-layout.js';

export const CRAFT_SHOPS=Object.freeze([
    {label:'Seabreeze Bakery',sign:'SEABREEZE BAKERY',kind:'market',line:'The fog is an excellent proving drawer. The sourdough has lived here longer than I have.'},
    {label:'Palmetto Pottery',sign:'PALMETTO POTTERY',kind:'studio',line:'Every mug is a little different. The one with the wobble is about the nature of certainty.'},
    {label:'Juniper Books',sign:'JUNIPER BOOKS',kind:'arcade',line:'We organize by the sort of afternoon you would like to have.'},
    {label:'Garden Market',sign:'GARDEN MARKET',kind:'market',line:'The citrus is local. The optimistic handwritten prices are a form of public art.'},
    {label:'Ocean Workshop',sign:'OCEAN WORKSHOP',kind:'studio',line:'We mend chairs, bicycles, and occasionally the mood of the neighborhood.'},
    {label:'The Terrace',sign:'THE TERRACE',kind:'arcade',line:'A coffee, a sunny chair, and absolutely no plans to pivot.'},
    {label:'Cypress Flowers',sign:'CYPRESS FLOWERS',kind:'market',line:'These are for somebody, even if that somebody turns out to be you.'}
]);
export const SOUTHERN_CRAFT_SIGNS=Object.freeze(CRAFT_SHOPS.map(s=>s.sign));
export function drawCraftGround(m,terrain,polygon,color='#c0ae8d',material='herringbone'){
    const xs=polygon.map(p=>p[0]),zs=polygon.map(p=>p[1]);
    for(let z=Math.floor(Math.min(...zs)*2)/2;z<Math.max(...zs);z+=.5)for(let x=Math.floor(Math.min(...xs)*2)/2;x<Math.max(...xs);x+=.5)for(const triangle of [[[x,z],[x+.5,z+.5],[x+.5,z]],[[x,z],[x,z+.5],[x+.5,z+.5]]]){
        const p=intersectTilePolygons(polygon,triangle);if(tileArea(p)<1e-9)continue;for(let i=1;i<p.length-1;i++)m.tri(...[p[0],p[i],p[i+1]].map(([x,z])=>[x,terrain.height(x,z)+.012,z]),color,material);
    }
}
function craftFlowerPot(m,x,y,z,color='#d5a27f',small=false){
    const r=small?.06:.10;m.cylinder(x,y,z,r,.16,color,10,r*1.35,'limewash');m.cylinder(x,y+.145,z,r*1.45,.025,tint(color,12),12);
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3,xx=x+Math.cos(a)*r*.6,zz=z+Math.sin(a)*r*.6;m.sphere(xx,y+.25,zz,r*.85,.11,r*.8,['#779b64','#90aa70','#668d61'][i],8,4);m.sphere(xx,y+.33,zz,.028,.024,.028,['#d9a089','#e1c576','#bfa3c8'][i],6,3);}
}
function craftSeat(m,x,y,z,width=.7){
    for(const xx of [x-width*.4,x+width*.4])m.box(xx,y,z-.09,.035,.43,.18,'#637f79',{metal:.2});
    for(let i=0;i<3;i++)m.box(x-width/2,y+.43,z-.13+i*.09,width,.04,.065,'#b99c72','cedar');
    m.box(x-width/2,y+.47,z-.16,width,.25,.035,'#b99c72','cedar');
}
function craftMural(m,plane,back,depth,base,seed){
    // A mosaic sun over rolling ocean bands, painted on a complete side wall.
    const z=back+.18,w=depth-.36;m.box(plane-.014,base+.55,z,.012,1.35,w,'#d5bf93','limewash');
    for(let i=0;i<7;i++){const zz=z+i*w/7;m.box(plane-.022,base+.55+Math.sin(i*.85+seed)*.09,zz,.008,.3,w/7+.001,['#658e94','#83aa9e','#99b4a8'][i%3],'glazedTile');}
    m.sphere(plane-.029,base+1.47,z+w*.65,.008,.23,.23,'#d8a45f',20,10);
    for(let i=0;i<6;i++)m.rod([plane-.035,base+1.47+Math.sin(i*Math.PI/3)*.29,z+w*.65+Math.cos(i*Math.PI/3)*.29],[plane-.035,base+1.47+Math.sin(i*Math.PI/3)*.36,z+w*.65+Math.cos(i*Math.PI/3)*.36],.012,'#c38b58',4);
}
function craftShopBody(m,p,base,shop,signs){
    const w=p.w-.24,back=-p.d/2+.12,front=p.d/2-.57,d=front-back,H=shop.kind==='arcade'?3.45:shop.kind==='studio'?2.5:2.85,color=p.palette[(p.index||0)%p.palette.length],trim='#e6d9be';
    const point=(x,z)=>craftPoint(p,x,z),foot=[[-w/2,back],[w/2,back],[w/2,front],[-w/2,front]];
    const start=m.data.length;
    pose(m,p.x,0,p.z,p.rotation,()=>{
        m.box(-w/2,base,back,w,H,d,color,shop.kind==='studio'?'brick':'limewash');
        for(let side=0;side<4;side++){
            const a=foot[side],b=foot[(side+1)%4],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.3);for(let i=0;i<n;i++){
                const at=t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],u=at(i/n),v=at((i+1)/n),bottom=q=>Math.min(base-.04,p.terrain.height(...point(...q))-.04);
                m.quad([u[0],bottom(u),u[1]],[v[0],bottom(v),v[1]],[v[0],base,v[1]],[u[0],base,u[1]],tint(color,-8),'limewash');
            }
        }
        m.box(-w/2-.025,base+H-.17,back-.015,w+.05,.12,d+.03,trim,'stone');
        const bays=Math.max(2,Math.floor(w/.8)),gap=w/bays;
        for(let i=0;i<bays;i++){
            const x=-w/2+.12+i*gap;
            drawFacadeWindow(m,{plane:front+.012,along:x,y:base+.3,w:gap-.24,h:1.13,style:'storefront',seed:i+p.index,trim});
            if(shop.kind==='arcade')drawFacadeWindow(m,{plane:front+.014,along:x+.05,y:base+2.18,w:gap-.34,h:.65,style:'sash',seed:i+4,trim});
        }
        m.box(-.18,base+.03,front+.09,.36,1.46,.035,'#4c7870','wood');m.box(-.125,base+.78,front+.128,.25,.58,.01,'#87a6a7',{window:.08});
        drawPlaque(m,signs,shop.sign,0,base+1.68,front+.045,w-.2,.29);
        if(shop.kind==='studio'){
            const teeth=3,step=d/teeth;for(let i=0;i<teeth;i++){
                const z=back+i*step;m.quad([-w/2-.04,base+H,z],[w/2+.04,base+H,z],[w/2+.04,base+H+.38,z+step],[-w/2-.04,base+H+.38,z+step],'#6c8587','roof');m.quad([-w/2,base+H,z+step],[w/2,base+H,z+step],[w/2,base+H+.38,z+step],[-w/2,base+H+.38,z+step],'#9bb5b5',{window:.07});
                for(const x of [-w/2,w/2])m.tri([x,base+H,z],[x,base+H,z+step],[x,base+H+.38,z+step],trim,'stone');
            }
            craftMural(m,-w/2,back,d,base,p.index);
        }else if(shop.kind==='arcade'){
            m.box(-w/2+.03,base+H,back+.04,w-.06,.055,d-.08,'#8a9c89','roof');
            for(let i=0;i<3;i++)m.box(-w/2+.04+i*.15,base+H+.055+i*.12,front-.08,w-.08-i*.3,.12,.15,i%2?color:trim,'stucco');
            for(const x of [-w*.35,w*.35]){m.cylinder(x,base+1.98,front+.14,.035,.77,'#688177',10);craftFlowerPot(m,x,base+H+.06,back+.35,'#b68b67',true);}
            m.rod([-w*.4,base+2.1,front+.17],[w*.4,base+2.1,front+.17],.018,'#688177',6);for(let x=-w*.38;x<w*.4;x+=.16)m.rod([x,base+2.1,front+.17],[x,base+2.43,front+.17],.009,'#688177',4);
        }else{
            const a=[-w/2-.04,base+H,back-.04],b=[w/2+.04,base+H,back-.04],c=[w/2+.04,base+H,front+.04],d0=[-w/2-.04,base+H,front+.04],top=[0,base+H+.5,(back+front)/2];
            m.tri(a,top,b,'#ad745b','roofTile');m.tri(b,top,c,'#b87e61','roofTile');m.tri(c,top,d0,'#bf8a6a','roofTile');m.tri(d0,top,a,'#ad745b','roofTile');
        }
        if(shop.kind!=='studio')for(let i=0;i<12;i++){
            const x=-w/2+i*w/12;m.quad([x,base+1.61,front+.03],[x+w/12,base+1.61,front+.03],[x+w/12,base+1.42,front+.42],[x,base+1.42,front+.42],i%2?'#e7d9bb':['#6c9b8b','#ac7872','#7b92ac'][p.index%3],'canvasWeave');m.box(x,base+1.34,front+.40,w/12,.08,.018,i%2?'#e7d9bb':'#6c9b8b','canvasWeave');
        }
        for(const side of [-1,1])craftFlowerPot(m,side*(w/2-.14),base,front+.27,'#bd8c6d');
        if(shop.kind==='market')for(const side of [-1,1]){
            const x=side*(w*.30);m.box(x-.2,base+.03,front+.26,.4,.28,.24,'#a2865e','cedar');for(let j=0;j<5;j++)m.sphere(x-.14+j*.07,base+.34,front+.38,.046,.05,.044,side<0?'#b1b975':'#ce916f',8,4);
        }
    });
    return {start,count:m.data.length-start,height:H+.65,body:{x:-w/2,z:back,w,d}};
}
export function drawSouthernCraftSite(m,p,terrain,signs,shop=CRAFT_SHOPS[p.index%CRAFT_SHOPS.length]){
    const start=m.data.length,garden=p.kind==='garden',front=craftPoint(p,0,p.d/2-.18),base=terrain.height(...front)+.04,navigationPolygons=[];
    drawCraftGround(m,terrain,craftFootprint(p),garden?'#c6bca0':'#c2aa8d');
    if(garden){
        pose(m,p.x,0,p.z,p.rotation,()=>{
            const at=craftPoint(p,-p.w*.3,-p.d*.22),h=terrain.height(...at);craftSeat(m,-p.w*.28,h,-p.d*.22,.62);
            for(const [u,v] of [[p.w*.30,-p.d*.23],[p.w*.29,p.d*.23]]){const pt=craftPoint(p,u,v),height=terrain.height(...pt);craftFlowerPot(m,u,height,v,p.index%2?'#b78970':'#849c96');navigationPolygons.push(craftFootprint({...p,x:pt[0],z:pt[1]},.3,.3));}
            navigationPolygons.push(craftFootprint({...p,x:at[0],z:at[1]},.7,.35));
            if(p.index%2===0){for(const u of [-p.w*.4,p.w*.4]){const pos=craftPoint(p,u,-p.d*.39),height=terrain.height(...pos);m.cylinder(u,height,-p.d*.39,.025,1.6,'#8b9a7d',8);}
                m.quad([-p.w*.42,base+1.66,-p.d*.41],[p.w*.42,base+1.66,-p.d*.41],[p.w*.34,base+1.86,p.d*.12],[-p.w*.34,base+1.86,p.d*.12],'#d5b18d','canvasWeave');
            }
        });
    }else{
        const body=craftShopBody(m,{...p,terrain},base,shop,signs),r=body.body,mid=craftPoint(p,r.x+r.w/2,r.z+r.d/2);navigationPolygons.push(craftFootprint({...p,x:mid[0],z:mid[1]},r.w+.05,r.d+.08));
        // The same small fixtures visible on the terrace enter the native
        // collision graph; the central front door and public walk stay open.
        const front=r.z+r.d;
        for(const side of [-1,1]){
            const pot=craftPoint(p,side*(r.w/2-.14),front+.27);navigationPolygons.push(craftFootprint({...p,x:pot[0],z:pot[1]},.3,.3));
            if(shop.kind==='market'){const crate=craftPoint(p,side*r.w*.30,front+.38);navigationPolygons.push(craftFootprint({...p,x:crate[0],z:crate[1]},.42,.26));}
        }
    }
    const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=start;i<m.data.length;i+=11)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],m.data[i+k]);hi[k]=Math.max(hi[k],m.data[i+k]);}
    return {...p,label:garden?'Neighborhood garden':shop.label,kind:garden?'neighborhood-garden':'neighborhood-shop',neighborLine:garden?'We planted this little garden together. It has done wonders for the block.':shop.line,description:garden?'Herringbone paving, flowering pots, a cedar bench, and shade stitched together by the neighbors. A small but very good place to pause.':shop.line+' The carefully kept storefront has a little terrace and a lived-in upper floor.',base,start,count:m.data.length-start,lo,hi,footprint:craftFootprint(p),navigationPolygons};
}
export function drawSouthernPocketGardens(m,terrain,signs){return SOUTHERN_CRAFT.map(p=>drawSouthernCraftSite(m,p,terrain,signs));}
