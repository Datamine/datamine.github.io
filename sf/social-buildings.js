import {drawPiercedWall} from './wall-openings.js';
import {drawFacadeWindow} from './windows.js';
import {pose} from './geometry.js';
import {TWITTER_HQ,SALES_CONFERENCE,socialFixtures,socialRect} from './social-layout.js';
import {instituteWallRects,recordInstitutePart,detachInstituteMesh} from './institute-interiors.js';
import {drawPlaque} from './southern-district.js';
import {drawPostBottle,drawEnvelope,BOTTLE_POST_EXAMINE} from './bottle-post.js';

export const SOCIAL_SIGNS=['TWITTER HQ','BOTTLE POST','SOFTWARE SALES CONFERENCE','SELL MORE SALES SOFTWARE'];
export function socialNavigationPolygons(room){
    return [...[0,1,2,3].flatMap(side=>instituteWallRects(room,side).map(r=>socialRect(room,{...r,x:r.x+r.w/2,z:r.z+r.d/2}))),...socialFixtures(room).map(r=>socialRect(room,r))];
}
function socialRoomWall(m,room,side,signs){
    const twitter=room.id==='twitter-hq',color=twitter?'#a5b9b7':'#c7b496',trim=twitter?'#587a81':'#796b69',height=2.65;
    const openings=side===0?[-1.45,0,1.45].map(x=>({x:x-.29,y:1.08,w:.58,h:.54})):twitter&&side===2?[{x:-1.1,y:.575,w:.7,h:.575}]:[];
    for(const r of instituteWallRects(room,side)){
        drawPiercedWall(m,{isX:side>=2,plane:side>=2?(side===2?-room.w/2:room.w/2):side===0?-room.d/2:room.d/2,along:side>=2?r.z:r.x,y:.015,w:side>=2?r.d:r.w,h:height,depth:.12,far:side%2===0,color,material:twitter?'concrete':'stucco',openings});
        m.box(r.x,.015,r.z,r.w,.13,r.d,trim,'stone');
    }
    const front=side===1;
    if(front){m.box(-.75,2.16,room.d/2-.12,1.5,.5,.12,color,'stucco');drawPlaque(m,signs,twitter?'TWITTER HQ':'SOFTWARE SALES CONFERENCE',0,2.35,room.d/2+.016,twitter?1.85:3.65,.24,true);}
    if(side===0){
        drawPlaque(m,signs,twitter?'BOTTLE POST':'SELL MORE SALES SOFTWARE',twitter?-.5:0,1.98,-room.d/2+.135,twitter?2.2:3.4,.25,true);
        for(const x of [-1.45,0,1.45]){
            drawFacadeWindow(m,{plane:-room.d/2,along:x-.29,y:1.08,w:.58,h:.54,far:true,trim,style:'storefront',transparent:true,wallDepth:.12});
        }
    }
}
function socialRoomFloor(m,room){
    const twitter=room.id==='twitter-hq';m.box(-room.w/2,-.025,-room.d/2,room.w,.04,room.d,twitter?'#8caaa7':'#b3a293',twitter?'concrete':'wood');
    if(!twitter){
        m.box(-1.3,.016,-1.5,2.6,.004,2.9,'#667e80','roof');
        for(let i=0;i<5;i++)m.box(-.08,.021,-1.35+i*.58,.16,.002,.21,'#c1bca3');
    }
}
function socialMachinery(m){
    const metal='#879c9b',dark='#3f555b';
    for(const x of [-2.05,-.2])for(const z of [-.97,-.53])m.box(x,.015,z,.065,.71,.065,metal,{metal:.3});
    m.box(-2.3,.71,-1.035,2.5,.09,.57,dark,{metal:.25});
    for(const z of [-1.055,-.48])m.box(-2.3,.755,z,2.5,.085,.045,metal,{metal:.25});
    for(const x of [-2.24,.1])m.rod([x,.75,-1.01],[x,.75,-.5],.065,'#afbab0',12,{metal:.35});
    // At the wall hatch the conveyor becomes a chute feeding the runoff.
    m.quad([-2.3,.79,-1.02],[-2.3,.79,-.49],[-2.45,.08,-.49],[-2.45,.08,-1.02],'#819b9b',{metal:.25});
    for(const z of [-1.03,-.49])m.rod([-2.3,.82,z],[-2.45,.1,z],.025,metal,8);
    for(const x of [.42,1.6])for(const z of [-1.4,-1.13])m.box(x,.015,z,.04,.73,.04,metal,{metal:.25});
    m.box(.3,.75,-1.465,1.45,.055,.39,dark,{metal:.25});
    for(let i=0;i<5;i++)drawEnvelope(m,1.4,.81+i*.009,-1.27,.03*i);
    m.box(.15,.015,-1.48,.36,.48,.35,'#718787',{metal:.25});
    m.cylinder(.33,.5,-1.3,.075,.05,'#b7ba9f',12);
}
function socialFurniture(m,room){
    if(room.id==='twitter-hq'){
        for(const x of [1.06,1.57])for(const z of [-.1,.42])m.box(x,.015,z,.04,.72,.04,'#89948e',{metal:.25});
        m.box(1.04,.735,-.16,.62,.065,.68,'#c3af8d','wood');
        m.box(1.18,.82,-.07,.32,.27,.04,'#445c63',{metal:.25});m.box(1.195,.84,-.018,.29,.22,.005,'#92afb1',{emissive:.12});
        m.box(1.18,.807,.18,.32,.018,.18,'#617b7b');
        for(const x of [1.18,1.49])for(const z of [.7,1.01])m.box(x,.015,z,.028,.43,.028,'#6d8282',{metal:.25});
        m.box(1.14,.445,.65,.42,.05,.42,'#547681','roof');m.box(1.14,.495,1.03,.42,.39,.05,'#547681','roof');
        drawPostBottle(m,1.61,.81,.43,{scale:.8});
    }else{
        m.box(-1.78,.015,-1.45,.7,.84,1,'#76686a','wood');m.box(-1.82,.855,-1.49,.78,.06,1.08,'#c6ac83','wood');
        for(let i=0;i<5;i++)m.box(-1.68+i*.105,.918,-1.25,.077,.21,.16,['#ad755d','#657c8e','#a38b62'][i%3],'wood');
        m.box(.79,.015,-1.45,1.08,.52,.24,'#7f7772','wood');m.box(.75,.86,-1.44,1.16,.65,.07,'#384e56',{metal:.25});m.box(.79,.90,-1.36,1.08,.55,.006,'#708a89',{emissive:.1});
        // A tiny conversion funnel, hand-drawn on the presentation monitor.
        for(let i=0;i<3;i++)m.box(.87+i*.10,1.31-i*.13,-1.348,.88-i*.20,.055,.003,['#dcc093','#aebcab','#a3c5c0'][i]);
        m.box(1.27,.015,.91,.52,.78,.42,'#a18c72','wood');m.cylinder(1.44,.795,1.09,.105,.29,'#4f6265',16);m.cylinder(1.44,1.085,1.09,.1,.035,'#b4c2b1',16);
        for(const x of [1.65,1.75])m.cylinder(x,.795,1.12,.035,.08,'#dfd9bc',10);
    }
}
export function drawSocialBuildings(m,signs){
    return [TWITTER_HQ,SALES_CONFERENCE].map(room=>{
        // Keep the outside forecourt in the regional mesh; detach the room so
        // the standard camera-facing roof/wall cutaway works at every angle.
        const start=m.data.length;
        m.box(room.x-.9,room.base-.025,room.z+room.d/2,1.8,.04,.8,'#b7b8a2','cobble');
        const roomStart=m.data.length,parts=[];
        pose(m,room.x,room.base,room.z,room.rotation||0,()=>{
            recordInstitutePart(m,parts,'floor',null,()=>socialRoomFloor(m,room));
            if(room.id==='twitter-hq')recordInstitutePart(m,parts,'machine',null,()=>socialMachinery(m));
            recordInstitutePart(m,parts,'furniture',null,()=>socialFurniture(m,room));
            for(let side=0;side<4;side++)recordInstitutePart(m,parts,'wall',side,()=>socialRoomWall(m,room,side,signs));
            recordInstitutePart(m,parts,'roof',null,()=>{
                m.box(-room.w/2-.1,2.68,-room.d/2-.1,room.w+.2,.14,room.d+.2,room.id==='twitter-hq'?'#637e83':'#87786d','roof');
                m.box(.65,2.82,-.65,.7,.38,.65,'#a5afab',{metal:.25});for(let i=0;i<5;i++)m.box(.7+i*.12,3.205,-.6,.035,.008,.55,'#637d7f');
            });
        });
        const interior=detachInstituteMesh(m,{start:roomStart,end:m.data.length,parts,spec:{...room}}),lo=[room.x-room.w/2-.1,room.base-.03,room.z-room.d/2-.1],hi=[room.x+room.w/2+.1,room.base+3.22,room.z+room.d/2+.8];
        return {...room,kind:room.id,enterableInstitute:true,interior,start,count:m.data.length-start,lo,hi,navigationPolygons:socialNavigationPolygons(room),description:room.id==='twitter-hq'?'Messages travel down a conveyor, into bottles and out to sea. The backend is surprisingly wet.':'A conference dedicated to selling sales software to people who sell sales software.',details:room.id==='twitter-hq'?[{id:'bottle-post-machine',kind:'bottle-machine',label:'Bottle-post conveyor',section:'machine',entry:room.inside,navigationAccess:'observe-only',description:BOTTLE_POST_EXAMINE}]:[]};
    });
}
