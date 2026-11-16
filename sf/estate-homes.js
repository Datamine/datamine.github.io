import {drawFacadeWindow} from './windows.js';

const estateIvory='#e9dfc7',estateBronze='#584e3e',estateGlass='#758f8d';
const estateVariant=p=>Math.abs(Math.floor((p.seed+p.w*.17+p.d*.13)*9))%3;
function estatePane(m,x,y,z,w,h,side=false,far=false){
    const p=side?[[x,y,z],[x,y+h,z],[x,y+h,z+w],[x,y,z+w]]:[[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z]];
    if(far)p.reverse();m.quad(...p,estateGlass,{window:.12});
    const frame='#494b40';
    if(side){for(const zz of [z,z+w])m.box(x-.015,y,zz-.012,.03,h,.024,frame);for(const yy of [y,y+h])m.box(x-.015,yy-.012,z,.03,.024,w,frame);}
    else{for(const xx of [x,x+w])m.box(xx-.012,y,z-.015,.024,h,.03,frame);for(const yy of [y,y+h])m.box(x,yy-.012,z-.015,w,.024,.03,frame);}
}
function estateTileRoof(m,x,z,w,d,y,rise,color='#b57958'){
    const ridge=z+d*.5,e=.055;
    m.quad([x-e,y,z-e],[x-e,y+rise,ridge],[x+w+e,y+rise,ridge],[x+w+e,y,z-e],color,'roofTile');
    m.quad([x-e,y+rise,ridge],[x-e,y,z+d+e],[x+w+e,y,z+d+e],[x+w+e,y+rise,ridge],color,'roofTile');
    for(const xx of [x-e,x+w+e])m.tri([xx,y,z-e],[xx,y+rise,ridge],[xx,y,z+d+e],estateIvory,'stucco');
    m.rod([x-e,y+rise+.015,ridge],[x+w+e,y+rise+.015,ridge],.035,'#bf8763',10,'roofTile');
}
function estateRail(m,x,z,w,y,color=estateIvory,classic=false){
    m.box(x,y+.36,z,w,.045,.055,color,classic?'travertine':null);
    const n=Math.max(2,Math.round(w/.23));
    for(let i=0;i<=n;i++){const xx=x+w*i/n;m.cylinder(xx,y,z+.025,classic?.025:.012,.36,color,classic?10:6,classic?.019:.012,classic?'travertine':null);if(classic){m.cylinder(xx,y+.11,z+.025,.04,.1,color,10,.025,'travertine');m.cylinder(xx,y+.21,z+.025,.025,.06,color,10,.04,'travertine');}}
}
function estatePergola(m,x,z,w,d,y){
    for(const xx of [x+.05,x+w-.05])for(const zz of [z+.04,z+d-.04])m.box(xx-.025,.1,zz-.025,.05,y-.1,.05,'#8c805e','cedar');
    for(const zz of [z,z+d])m.box(x-.03,y,zz-.035,w+.06,.07,.07,'#948362','cedar');
    const n=Math.ceil(w/.15);for(let i=0;i<=n;i++)m.box(x+w*i/n-.018,y+.07,z-.05,.036,.055,d+.1,'#b2a080','cedar');
}
function estateArcade(m,x,z,w,y,height,n){
    const bay=w/n,r=bay*.39,spring=y+height-r;
    for(let i=0;i<=n;i++){
        const xx=x+w*i/n;m.cylinder(xx,y,z,.045,height-r,estateIvory,16,.04,'travertine');m.cylinder(xx,spring-.04,z,.075,.065,estateIvory,16,.075,'travertine');
    }
    for(let i=0;i<n;i++){
        const cx=x+bay*(i+.5),outer=bay*.5;
        for(let j=0;j<12;j++){
            const a=j*Math.PI/12,b=(j+1)*Math.PI/12;
            const P=t=>[cx+Math.cos(t)*r,spring+Math.sin(t)*r,z+.05],Q=t=>[cx+Math.cos(t)*outer,spring+Math.sin(t)*outer,z+.05];
            m.quad(P(a),Q(a),Q(b),P(b),estateIvory,'travertine');
            const p=P(a),q=P(b);m.quad([p[0],p[1],z-.05],p,q,[q[0],q[1],z-.05],'#c3b69a','travertine');
            m.quad(Q(a),[Q(a)[0],y+height+.04,z+.05],[Q(b)[0],y+height+.04,z+.05],Q(b),estateIvory,'travertine');
        }
    }
}
function drawCaliforniaEstate(m,p){
    const {x,z,w,d}=p.house,h=1.58,wing=Math.max(.62,w*.26),front=z+d,v=estateVariant(p),plaster=['#e9d5b7','#efdfca','#dcc7aa'][v],tile=['#b57958','#a5684e','#b38b64'][v];
    m.box(x,.08,z,w,h,d*.61,plaster,'stucco');
    for(const xx of [x,x+w-wing]){m.box(xx,.08,z,wing,h,d,plaster,'stucco');estateTileRoof(m,xx,z,wing,d,h+.08,.32,tile);}
    estateTileRoof(m,x+wing,z,w-wing*2,d*.61,h+.08,.26,'#a66e51');
    m.box(x+wing,.09,z+d*.61,w-wing*2,.018,d*.39,'#ddd5b7','glazedTile');
    for(let i=0;i<3;i++){const xx=x+wing+(w-2*wing)*(i+.5)/3;estatePane(m,xx-.13,.35,z+d*.61+.012,.26,.96);}
    for(const xx of [x+.12,x+w-wing+.1])drawFacadeWindow(m,{plane:front+.012,along:xx,y:.48,w:wing-.22,h:.72,trim:estateIvory,seed:xx});
    for(let i=0;i<3;i++)drawFacadeWindow(m,{plane:z-.014,far:true,along:x+.15+i*(w-.2)/3,y:.46,w:Math.min(.55,w/3-.25),h:.72,trim:estateIvory,seed:i+p.seed});
    for(const side of [-1,1])drawFacadeWindow(m,{isX:true,plane:side<0?x-.014:x+w+.014,far:side<0,along:z+d*.32,y:.48,w:d*.34,h:.70,trim:estateIvory,seed:side+p.seed});
    estateArcade(m,x+wing,front-.04,w-wing*2,.1,1.16,Math.max(2,Math.round((w-wing*2)/.55)));
    m.box(x+w-wing*.45,h,z+d*.25,.19,.66,.26,'#d8b996','stucco');m.box(x+w-wing*.45-.035,h+.62,z+d*.25-.03,.26,.07,.32,estateIvory,'travertine');
    for(const xx of [x+.1,x+w-.1]){m.cylinder(xx,.09,front+.10,.09,.15,'#b87e5a',12,.12,'glazedTile');m.sphere(xx,.37,front+.1,.12,.21,.12,'#637b48',12,6);}
}
function drawEichlerEstate(m,p){
    const {x,z,w,d}=p.house,h=1.25,front=z+d,v=estateVariant(p),wall=['#b3a185','#b29b77','#bdb49b'][v],atrium=Math.min(.65,w*.23);
    // Low post-and-beam volumes flank an open-to-sky central garden.
    m.box(x,.08,z,w,h,.12,wall,'cedar');m.box(x,.08,z,.12,h,d,wall,'cedar');m.box(x+w-.12,.08,z,.12,h,d,'#d5d0bb','stucco');
    for(let i=0;i<4;i++){const ww=(w-.22)/4;estatePane(m,x+.11+i*ww,.13,front-.015,ww-.025,h-.12);}
    m.box(x+w*.48,.12,front+.01,.34,1.06,.05,['#a36e43','#5e8580','#b7774b'][v],'cedar');m.rod([x+w*.75,.67,front+.07],[x+w*.75,.81,front+.07],.01,'#c7b285',8,{metal:.5});
    for(const xx of [x+.08,x+w*.5,x+w-.08])m.box(xx-.025,.09,z-.04,.05,h+.05,d+.08,estateBronze,'cedar');
    const mid=x+w*.5,ay=z+d*.35,roof=['#68746f','#7d8172','#696f75'][v];
    // Separate roof planes and a real atrium opening; no generic flat slab.
    for(const [a,b] of [[x-.05,mid-atrium/2],[mid+atrium/2,x+w+.05]]){
        m.quad([a,h+.13,z-.06],[a,h+.13,front+.06],[b,h+.32,front+.06],[b,h+.32,z-.06],roof,'roof');
        m.box(a,h+.08,front+.035,b-a,.10,.045,'#d9d1b9','cedar');
    }
    m.box(mid-atrium/2,h+.25,z-.06,atrium,.07,d*.18,estateBronze,'cedar');m.box(mid-atrium/2,h+.25,z+d*.68,atrium,.07,d*.35,estateBronze,'cedar');
    m.box(mid-atrium/2,.09,ay,atrium,.035,d*.3,'#6d8051','grass');m.cylinder(mid,.12,ay+d*.13,.026,.72,'#88775a',8);m.sphere(mid,.91,ay+d*.13,.23,.25,.24,'#78945e',14,8);
    // Clerestory glazing and honest structural beams under the roof edge.
    for(const zz of [z+.02,front-.1])m.box(x,h-.02,zz,w,.07,.06,estateBronze,'cedar');
    estatePane(m,x+w+.012,.34,z+.18,d-.36,.69,true);
    for(let i=0;i<3;i++)estatePane(m,x+.14+i*(w-.2)/3,.91,z-.014,(w-.2)/3-.07,.22,false,true);
}
function drawFallingwaterEstate(m,p){
    const {x,z,w,d}=p.house,v=estateVariant(p),stone=['#b1ac8d','#a8a99b','#b9af95'][v],concrete=['#e1d3ad','#dfd9bf','#ddd2b6'][v];
    m.box(x+w*.35,.04,z+.08,w*.3,2.55,d*.57,stone,'travertine');
    for(const [level,shift,ww,dd] of [[0,0,w,d],[1,.18,w*.83,d*.76]]){
        const y=.19+level*1.02,xx=x+shift,zz=z+level*.06;
        m.box(xx,y,zz,ww,.14,dd,concrete,'boardConcrete');
        m.box(xx+.1,y+.14,zz+.08,ww-.2,.66,dd*.55,'#898c77','travertine');
        for(let i=0;i<4;i++){const paneW=(ww-.24)/4;estatePane(m,xx+.12+i*paneW,y+.21,zz+dd*.55+.095,paneW-.022,.58);}
        estatePane(m,xx+ww-.085,y+.22,zz+.14,dd*.42,.55,true);
        estatePane(m,xx+.085,y+.22,zz+.14,dd*.42,.55,true,true);
        for(const end of [0,1])estatePane(m,xx+.13+end*ww*.66,y+.22,zz+.065,ww*.20,.53,false,true);
        m.box(xx-.035,y+.85,zz-.025,ww+.07,.105,dd*.69,concrete,'boardConcrete');
        estateRail(m,xx+.025,zz+dd-.045,ww-.05,y+.14,'#9a8763');
        m.box(xx+.015,y+.14,zz+dd-.08,ww-.03,.12,.1,concrete,'boardConcrete');
    }
    m.box(x+w*.35-.03,2.55,z+.05,w*.3+.06,.10,d*.6,concrete,'boardConcrete');
    // A water stair spills from a stone scupper into a small reflecting basin.
    const xx=x+w-.28,zz=z+d*.82;m.box(xx,.06,zz,.23,.10,.26,'#829c91','poolMosaic');
    for(let i=0;i<4;i++){m.box(xx,.13+i*.11,zz-.08-i*.04,.20,.06,.11,stone,'travertine');m.quad([xx+.04,.19+i*.11,zz+.03-i*.04],[xx+.16,.19+i*.11,zz+.03-i*.04],[xx+.16,.08+i*.11,zz+.075-i*.04],[xx+.04,.08+i*.11,zz+.075-i*.04],'#a4d4cd',{window:.3});}
}
function drawHearstEstate(m,p){
    const {x,z,w,d}=p.house,tower=Math.min(.74,w*.25),h=1.75,front=z+d,body=['#e4d5b4','#e8dbc4','#daceb6'][estateVariant(p)];
    m.box(x,.08,z,w,h,d*.72,body,'travertine');
    estateArcade(m,x+.1,front-.08,w-.2,.14,1.23,Math.max(3,Math.floor(w/.55)));
    m.box(x-.02,1.46,front-.25,w+.04,.12,.32,estateIvory,'travertine');estateRail(m,x+.02,front-.05,w-.04,1.58,estateIvory,true);
    estateTileRoof(m,x+tower*.6,z,w-tower*1.2,d*.72,h+.08,.44,'#b67c58');
    for(const xx of [x,x+w-tower]){
        m.box(xx,.08,z,tower,2.5,d*.62,body,'travertine');
        for(const y of [.6,1.57,2.18])drawFacadeWindow(m,{plane:z+d*.62+.013,along:xx+.16,y,w:tower-.32,h:y>2?.27:.46,trim:estateIvory,seed:xx+y});
        for(const y of [.6,1.63])drawFacadeWindow(m,{plane:z-.013,far:true,along:xx+.16,y,w:tower-.32,h:.46,trim:estateIvory,seed:xx+y});
        m.box(xx-.035,2.49,z-.035,tower+.07,.12,d*.62+.07,estateIvory,'travertine');
        // Belvedere caps, finials and a layered cornice break the silhouette.
        estateTileRoof(m,xx-.035,z-.025,tower+.07,d*.62+.05,2.61,.34,'#af7955');
        m.cylinder(xx+tower/2,2.95,z+d*.31,.025,.16,'#baa77c',10);m.sphere(xx+tower/2,3.12,z+d*.31,.055,.07,.055,estateIvory,12,6,'travertine');
    }
    // Ornamental glazed frieze, carved medallion and cypress-lined forecourt.
    m.box(x+tower,1.17,front-.12,w-tower*2,.16,.025,'#e0d4ae','glazedTile');
    for(const side of [-1,1])drawFacadeWindow(m,{isX:true,plane:side<0?x-.013:x+w+.013,far:side<0,along:z+d*.18,y:.67,w:d*.24,h:.63,trim:estateIvory,seed:side});
    m.cylinder(x+w/2,.10,front-.38,.18,.06,estateIvory,24,.18,'travertine');m.cylinder(x+w/2,.16,front-.38,.035,.36,estateIvory,12);m.cylinder(x+w/2,.51,front-.38,.13,.045,'#b3c6b5',24,.13,'poolMosaic');
}
export function drawEstateHome(m,p){({california:drawCaliforniaEstate,eichler:drawEichlerEstate,fallingwater:drawFallingwaterEstate,hearst:drawHearstEstate}[p.style])(m,p);}

export function drawEstateGarden(m,p){
    const {w,d,house:h,pool}=p;
    m.box(-w/2+.04,-.03,-d/2+.04,w-.08,.10,d-.08,'#bcbaa0','flagstone');
    // A planted strip and low hedges soften the footprint without a huge plinth.
    for(const x of [-w/2+.13,w/2-.13]){
        m.box(x-.065,.07,-d/2+.13,.13,.055,d-.26,'#607d4a','dirt');
        const profile=[[-.065,.11],[-.065,.23],[-.035,.29],[.035,.29],[.065,.23],[.065,.11]],back=-d/2+.15,front=d/2-.15;
        for(let i=0;i<profile.length-1;i++){const a=profile[i],b=profile[i+1];m.quad([x+a[0],a[1],back],[x+a[0],a[1],front],[x+b[0],b[1],front],[x+b[0],b[1],back],'#69834d','grass');}
        for(const z of [back,front])m.sphere(x,.20,z,.065,.10,.075,'#69834d',8,4);
    }
    if(pool){
        const {x,z,w:pw,d:pd,water}=pool,lip=.09;
        for(const zz of [z-lip,z+pd])m.box(x-lip,.075,zz,pw+2*lip,.04,lip,estateIvory,'travertine');
        for(const xx of [x-lip,x+pw])m.box(xx,.075,z,lip,.04,pd,estateIvory,'travertine');
        m.box(x,.08,z,pw,.025,pd,'#64acb1','poolMosaic');
        // Pool surface has a dedicated shallow-water shader over visible mosaic.
        m.quad([x,water,z],[x,water,z+pd],[x+pw,water,z+pd],[x+pw,water,z],'#8bc7c1',{water:4});
        for(const xx of [x+pw-.27,x+pw-.12]){m.rod([xx,.12,z+pd-.12],[xx,.42,z+pd-.12],.014,'#bdc6bf',10,{metal:.5});m.rod([xx,.42,z+pd-.12],[xx,.42,z+pd+.08],.014,'#bdc6bf',10,{metal:.5});}
        for(const zz of [z+pd-.17,z+pd-.08])m.rod([x+pw-.27,.22,zz],[x+pw-.12,.22,zz],.012,'#bbc3b8',8);
        // Two teak chaises, striped upholstery, rolled towels and a drinks table.
        for(const xx of [x+.22,x+.82]){
            const zz=z+pd+.18;m.box(xx,.13,zz,.38,.08,.52,'#ac9067','cedar');m.box(xx+.025,.22,zz+.02,.33,.045,.34,'#dfdcc2','wood');
            m.quad([xx+.025,.26,zz+.36],[xx+.355,.26,zz+.36],[xx+.355,.45,zz+.51],[xx+.025,.45,zz+.51],'#e7e1cb','wood');
            for(let i=0;i<3;i++)m.box(xx+.045+i*.105,.267,zz+.02,.025,.006,.32,'#788d89');
            for(const dx of [.04,.31])m.box(xx+dx,.07,zz+.1,.025,.07,.36,'#7a7257','cedar');
            m.cylinder(xx+.16,.285,zz+.09,.035,.22,'#eee9d4',10,.035,'wood');
        }
        m.cylinder(x+1.36,.12,z+pd+.4,.025,.27,estateBronze,10);m.cylinder(x+1.36,.39,z+pd+.4,.115,.035,estateIvory,20,.115,'travertine');
        m.cylinder(x+1.36,.425,z+pd+.4,.025,.07,'#c7a375',10,.03,{window:.3});
        // Small shade structure behind the water, clear of the open swimming area.
        if(p.style==='california'||p.style==='hearst')estatePergola(m,x-.03,z-.12,pw+.06,.35,1.42);
    }else{
        const x=h.x+h.w*.5,z=d/2-.19;
        for(const side of [-1,1]){
            m.cylinder(x+side*.44,.08,z,.075,.13,'#b79370',12,.10,'glazedTile');m.sphere(x+side*.44,.34,z,.11,.22,.11,'#658052',12,6);
        }
    }
}
