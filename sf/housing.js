import {SOUTHERN_PALETTES} from './neighborhood-palette.js';
import {drawSouthernHouseDetails} from './southern-house-details.js';
import {rand,tint,pose} from './geometry.js';
import {marketSide} from './downtown.js';
import {windowAppearance} from './materials.js';
import {drawFacadeWindow} from './windows.js';
import {drawCommercialRoof} from './rooftops.js';

export const HOUSE_COLORS=Object.freeze(['#69ac9a','#db8b7a','#e7c46d','#73a9c8','#b099c7','#9ab878','#dda378','#82bcae','#8198c5','#d38fa5','#ead5a2','#c79170']);
export function varyHousePaint(hex,seed){
    const values=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),gray=values[0]*.2126+values[1]*.7152+values[2]*.0722;
    const saturation=.55+rand(seed,17,36)*1.05,light=(rand(seed,31,9)-.5)*.055;
    return '#'+values.map(v=>Math.round(Math.max(0,Math.min(1,gray+(v-gray)*saturation+light))*255).toString(16).padStart(2,'0')).join('');
}
export const ROOF_STYLES=Object.freeze(['gable','hip','mansard','flat']);

/** Door height follows the public street, rather than the uphill back corner. */
export function planHouse({left,width,depth,point,naturalHeight,groundHeight=naturalHeight,seed}){
    const face=depth/2-Math.min(.55,depth*.25),entry=depth/2-.28,door=left+width*.1,dw=Math.min(.35,width*.25);
    const entryHeight=groundHeight(...point(door+dw/2,entry)),floor=entryHeight+.24;
    const fullBack=-depth/2+.08,available=face-fullBack;
    const grade=(naturalHeight(...point(left+width/2,fullBack))-naturalHeight(...point(left+width/2,face)))/Math.max(.5,available);
    let back=Math.max(fullBack,face-Math.max(.95,1.25/(Math.abs(grade)+.2)));
    // Shorten the downhill body before resorting to a tall retaining skirt.
    while(face-back>1&&floor-Math.min(...[left+.05,left+width-.05].map(u=>naturalHeight(...point(u,back))))>1.35)back+=.1;
    const foundationExposure=floor-Math.min(...[left+.05,left+width-.05].flatMap(u=>[face,back].map(v=>naturalHeight(...point(u,v)))));
    const oneStorey=seed<.09,storeys=oneStorey?1:2,H=(oneStorey?1.48:2.42)+(seed% .17);
    return {left,width,face,entry,door,dw,entryHeight,floor,fullBack,back,grade,foundationExposure,H,storeys,roof:ROOF_STYLES[Math.min(3,Math.floor(seed*4))]};
}

/** Sunset rowhouses have two lived-in floors, broad bays and distinct roofs. */
export function sunsetHouseProfile(seed){
    return {storeys:2,H:3.08+seed*.35,roof:seed<.26?'flat':seed<.56?'gable':seed<.82?'hip':'mansard'};
}

/** Housing meshes and private hillside details. All geometry stays in the
 * curb-aligned plot; terrain and public navigation remain owned by the world. */
export function createHousing({MAP_SCALE=1.5,terrainHeight,naturalHeight,cutHousePlot,getSceneMesh,registerObject,rectangle,sashWindow}){
    const lifts=[],housingDetails=[];
    const trim='#dcd9ca';
    function bay(m,cx,y,z,w,h,panel,seed=0,projection=.16){
        const glazing=windowAppearance(cx,y,z,seed);
        const outline=[[cx-w/2,z],[cx-w*.32,z+projection],[cx+w*.32,z+projection],[cx+w/2,z]];
        for(let i=0;i<3;i++){
            const a=outline[i],b=outline[i+1],len=Math.hypot(b[0]-a[0],b[1]-a[1]),at=(t,yy,offset=0)=>[a[0]+(b[0]-a[0])*t-(b[1]-a[1])/len*offset,yy,a[1]+(b[1]-a[1])*t+(b[0]-a[0])/len*offset];
            m.quad(at(0,y-.07),at(1,y-.07),at(1,y+h+.07),at(0,y+h+.07),panel,'clapboard');
            m.quad(at(.1,y,.022),at(.9,y,.022),at(.9,y+h,.022),at(.1,y+h,.022),glazing.color,glazing.material);
            for(const t of [.04,.96])m.rod(at(t,y-.02,.045),at(t,y+h+.02,.045),.016,trim,4);
            for(const yy of [y-.03,y+h*.5,y+h+.03])m.rod(at(.03,yy,.045),at(.97,yy,.045),.016,trim,4);
            m.rod(at(0,y-.08),at(1,y-.08),.025,trim,4);
        }
    }
    function roof(m,style,x,y,z,w,d,seed,color,kind=null,roofPlans=null){
        const rise=.32+seed*.14,material=style==='hip'&&seed>.55?'roofTile':'shingles',glazing=windowAppearance(x+w*.5,y+.2,z+d,seed);
        const roofColor=varyHousePaint(style==='hip'&&seed>.55?'#ba7252':['#637e84','#7e6a7e','#5f7b68','#96765f'][Math.floor(seed*4)%4],seed*173+x*7+z*.13);
        m.box(x-.025,y-.035,z-.025,w+.05,.04,d+.05,trim);
        let detailedRoof=null;
        if(style==='flat'&&kind==='deco'){
            detailedRoof=drawCommercialRoof(m,{x:x+.025,y:y+.035,z:z+.025,w:w-.05,d:d-.05,seed:seed*31+x*.73+z*.27});roofPlans?.push(detailedRoof);
        }else if(style==='flat'){
            m.box(x+.035,y+.035,z+.035,w-.07,.035,d-.07,varyHousePaint('#828777',seed*131+x*9+z),'roof');
            for(const xx of [x,x+w-.035])m.box(xx,y+.055,z,.035,.13,d,trim);
            m.box(x-.02,y+.04,z+d-.02,w+.04,.16,.075,trim);
            m.box(x+w*.27,y+.08,z+d*.34,w*.42,.12,.35,'#d5cdb3');
            m.box(x+w*.3,y+.205,z+d*.36,w*.36,.025,.3,glazing.color,glazing.material);
            if(seed>.8){m.box(x+.11,y+.08,z+.15,w*.45,.15,.24,'#b16e48','wood');for(let i=0;i<3;i++)m.sphere(x+.18+i*.12,y+.27,z+.25,.1,.1,.08,'#75944a',6,3);}
        }else if(style==='gable'){
            const a=[x-.025,y,z-.025],b=[x+w+.025,y,z-.025],c=[x+w+.025,y,z+d+.025],e=[x-.025,y,z+d+.025],p=[x+w/2,y+rise,z-.025],q=[x+w/2,y+rise,z+d+.025];
            m.quad(a,e,q,p,roofColor,material);m.quad(p,q,c,b,tint(roofColor,-8),material);
            m.tri(e,c,q,tint(color,8),kind==='coastal'||kind==='craftsman'?'fishscale':'clapboard');m.tri(b,a,p,color,'clapboard');
            for(const edge of [e,c])m.rod(edge,q,.028,trim,4);m.rod(p,q,.025,tint(roofColor,15),4);
            m.sphere(x+w/2,y+rise*.42,z+d+.035,.085,.09,.018,glazing.color,8,4,glazing.material);
            for(const dx of [-.09,.09])m.rod([x+w/2+dx,y+rise*.42,z+d+.055],[x+w/2,y+rise*.72,z+d+.055],.012,trim,4);
        }else if(style==='hip'){
            const a=[x-.025,y,z-.025],b=[x+w+.025,y,z-.025],c=[x+w+.025,y,z+d+.025],e=[x-.025,y,z+d+.025],p=[x+w/2,y+rise,z+d*.27],q=[x+w/2,y+rise,z+d*.73];
            m.tri(a,p,b,roofColor,material);m.tri(e,c,q,tint(roofColor,8),material);m.quad(a,e,q,p,roofColor,material);m.quad(p,q,c,b,tint(roofColor,-8),material);m.rod(p,q,.026,tint(roofColor,15),4);
            if(d>1.3){m.box(x+w*.32,y+.05,z+d-.26,w*.36,.27,.22,color,'stucco');m.box(x+w*.38,y+.12,z+d-.025,w*.24,.16,.018,glazing.color,glazing.material);}
        }else{
            const inset=Math.min(.19,w*.17),top=y+.57;
            const bottom=[[x,y,z],[x+w,y,z],[x+w,y,z+d],[x,y,z+d]],upper=[[x+inset,top,z+inset],[x+w-inset,top,z+inset],[x+w-inset,top,z+d-inset],[x+inset,top,z+d-inset]];
            for(let i=0;i<4;i++)m.quad(bottom[i],bottom[(i+1)%4],upper[(i+1)%4],upper[i],roofColor,'shingles');
            m.box(x+inset-.02,top,z+inset-.02,w-inset*2+.04,.035,d-inset*2+.04,trim);
            m.box(x+inset+.025,top+.036,z+inset+.025,w-inset*2-.05,.015,d-inset*2-.05,roofColor,'roof');
            m.box(x+w*.31,y+.15,z+d-.16,w*.38,.3,.17,tint(color,6),'clapboard');m.box(x+w*.37,y+.2,z+d+.015,w*.26,.19,.018,glazing.color,glazing.material);
            m.box(x+w*.28,y+.45,z+d-.18,w*.44,.045,.24,trim);
        }
        // Gutters, a downpipe and a capped chimney finish the roof silhouette.
        m.rod([x,y-.03,z+d+.035],[x+w,y-.03,z+d+.035],.018,'#c5c6b3',5);
        m.rod([x+w-.035,y-.05,z+d+.035],[x+w-.035,y-1.4,z+d+.035],.013,'#929f91',5);
        const chimneyY=y+(style==='flat'?.1:.25);m.box(x+w*.16,chimneyY,z+.16,.14,.28,.19,'#bd8166','brick');m.box(x+w*.15,chimneyY+.28,z+.15,.16,.05,.21,'#ddd0b3','stone');
        return detailedRoof?detailedRoof.height+.08:style==='flat'?.3:rise+.22;
    }
    // One skirt ends exactly at the body's lower edge. A foundation box and
    // retaining overlays used to duplicate these planes with other materials.
    function groundSkirt(m,left,back,w,d,top,point,colors){
        const right=left+w,face=back+d,edges=[[[left,face],[right,face]],[[left,back],[left,face]],[[right,face],[right,back]],[[right,back],[left,back]]];
        for(const [side,[a,b]] of edges.entries()){
            const steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.3));
            for(let i=0;i<steps;i++){
                const at=t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],p=at(i/steps),q=at((i+1)/steps);
                const bottom=p=>Math.min(naturalHeight(...point(...p)),terrainHeight(...point(...p)),top-.08)-.08;
                m.quad([p[0],bottom(p),p[1]],[q[0],bottom(q),q[1]],[q[0],top,q[1]],[p[0],top,p[1]],Array.isArray(colors)?colors[side]:colors,'stucco');
            }
        }
    }
    function basementGarage(m,left,width,plane,floor,point,far=false){
        const w=width*.55,x=left+(far?.2:.41)*width,center=x+w/2,ground=Math.max(naturalHeight(...point(center,plane)),terrainHeight(...point(center,plane)))+.04,top=floor-.08,h=Math.min(1.35,top-ground);
        if(h<.62)return;const bottom=top-h,z=plane+(far?-.058:.058),trim='#b7b6a4';
        const panel=(xx,yy,ww,hh,col)=>{const points=[[xx,yy,z],[xx+ww,yy,z],[xx+ww,yy+hh,z],[xx,yy+hh,z]];m.quad(...(far?points.reverse():points),col);};
        panel(x-.025,bottom-.02,w+.05,h+.045,trim);
        // Recessed horizontal garage panels sit in front of the single skirt.
        for(let j=0;j<6;j++){const yy=bottom+.025+j*(h-.05)/6,zz=z+(far?-.008:.008),points=[[x+.02,yy,zz],[x+w-.02,yy,zz],[x+w-.02,yy+(h-.05)/6-.012,zz],[x+.02,yy+(h-.05)/6-.012,zz]];m.quad(...(far?points.reverse():points),j%2?'#697e7d':'#718684');}
    }
    function gardenStair(m,u,from,to,w,point,angle,startHeight){
        const h0=startHeight,h1=naturalHeight(...point(u,to)),steps=Math.max(4,Math.ceil(Math.abs(h1-h0)/.13)),run=(to-from)/steps;
        let previous=null;
        for(let i=0;i<steps;i++){
            const z=from+run*(i+.5),h=h0+(h1-h0)*(i+.5)/steps+.045,center=point(u,z),bottom=Math.min(h-.14,naturalHeight(...center)-.04);
            cutHousePlot({cx:center[0],cz:center[1],w,d:Math.abs(run)+.01,angle,height:h-.14,onlyLower:true});
            m.box(u-w/2,bottom,Math.min(z-run/2,z+run/2),w,h-bottom,Math.abs(run)+.012,'#d4c9a8','stone');
            const rail=[u+w*.48,h+.58,z];if(previous)m.rod(previous,rail,.014,'#476b60',4);if(i%3===0)m.rod([rail[0],h,z],rail,.013,'#476b60',4);previous=rail;
        }
    }
    function gardenLift(m,u,from,to,point,angle,seed,startHeight){
        const points=[],h0=startHeight+.13,h1=naturalHeight(...point(u,to))+.13;
        for(let i=0;i<=12;i++){
            const z=from+(to-from)*i/12,h=h0+(h1-h0)*i/12,position=point(u,z);points.push([position[0],h,position[1]]);
            cutHousePlot({cx:position[0],cz:position[1],w:.48,d:Math.abs(to-from)/12+.02,angle,height:h-.12,onlyLower:true});
            m.box(u-.25,h-.055,z-.035,.5,.045,.07,'#967552','wood');
            if(i%3===0){const ground=naturalHeight(...position);for(const side of [-.18,.18])m.rod([u+side,Math.min(ground,h)-.04,z],[u+side,h,z],.023,'#8b7656',5);}
            if(i){const last=from+(to-from)*(i-1)/12,previous=h0+(h1-h0)*(i-1)/12;for(const side of [-.19,.19])m.rod([u+side,previous,last],[u+side,h,z],.022,'#7a8e8b',5);m.rod([u,previous+.015,last],[u,h+.015,z],.008,'#4f6965',4);}
        }
        for(const [z,h] of [[from,h0-.13],[to,h1-.13]]){m.box(u-.29,h,z-.08,.58,.16,.16,'#a68461','stone');m.rod([u-.28,h+.2,z],[u+.28,h+.2,z],.025,'#d8bb7b',5);}
        lifts.push({points,angle,seed,color:seed>.5?'#d48942':'#4eaa98'});
    }
    function district(x,z){
        // Telegraph Hill keeps narrow Victorian frontages around Coit Tower.
        if(x>41.5&&x<53&&z>8&&z<17.3)return 'telegraph';
        if(x>46&&z<29)return 'downtown';
        if(x>42&&z<43&&marketSide(x,z)>1)return 'soma';
        if(x>46&&z>=35&&z<55)return 'warehouse';
        if(x<31.5)return 'west';
        if(x>33&&z>40)return 'mission';
        return 'victorian';
    }
    function urbanBlock(x,z,w,d,front,seed,angle,kind){
        const m=getSceneMesh(),start=m.data.length,cx=x+w/2,cz=z+d/2,point=(u,v)=>[cx+u*Math.cos(angle)-v*Math.sin(angle),cz+u*Math.sin(angle)+v*Math.cos(angle)];
        const floor=naturalHeight(...point(0,d/2-.15))+.13,storeys=kind==='downtown'?4+Math.floor(seed*2):kind==='mission'?(seed>.87?1:2):2+Math.floor(seed*2),H=1.5+(storeys-1)*1.05;
        const back=-d/2+.08,face=d/2-.28,ww=w-.08,dd=face-back,material=kind==='soma'&&seed>.55?'concrete':'brick',color=(material==='brick'?['#a0826c','#a78e75','#907a6b','#b39c7d']:['#b3b9b0','#a3ada7','#bdbbb0','#9eaaa7'])[Math.floor(seed*4)];
        const center=point(0,(face+back)/2);cutHousePlot({cx:center[0],cz:center[1],w:ww,d:dd,angle,height:floor-.03,onlyLower:true});
        let roofDetails;
        pose(m,cx,0,cz,angle,()=>{
            m.box(-ww/2,floor-.08,back,ww,H+.08,dd,color,material);
            groundSkirt(m,-ww/2,back,ww,dd,floor-.08,point,color);
            const columns=Math.max(3,Math.round(ww/.68)),gap=ww/columns;
            for(let level=0;level<storeys;level++)for(let column=0;column<columns;column++){
                const u=-ww/2+(column+.5)*gap,yy=floor+(level?1.5+(level-1)*1.05:.15),windowW=gap*.61,windowH=level?.72:1.12;
                for(const side of [-1,1]){
                    const plane=side<0?back:face;
                    drawFacadeWindow(m,{plane,along:u-windowW/2,y:yy,w:windowW,h:windowH,far:side<0,trim:material==='brick'?'#c6c5b6':'#c5ccc1',seed:seed*97+column+level*13+side*5,style:level?(kind==='warehouse'?'industrial':'office'):'storefront'});
                }
            }
            for(let level=1;level<storeys;level++)for(const side of [-1,1])m.box(-ww/2,floor+1.34+(level-1)*1.05,side<0?back-.045:face,ww,.055,.045,'#bdbfae','stone');
            if(kind==='soma'||kind==='mission'){
                const awning=['#548e83','#a86c61','#687ca0','#b38c4c'][Math.floor(seed*4)%4];
                for(let stripe=0;stripe<10;stripe++){
                    const x=-ww*.43+stripe*ww*.086;
                    m.quad([x,floor+1.32,face+.015],[x+ww*.086,floor+1.32,face+.015],[x+ww*.086,floor+1.17,face+.255],[x,floor+1.17,face+.255],stripe%2?awning:'#e2d8b7');
                    m.box(x,floor+1.09,face+.252,ww*.086,.08,.02,stripe%2?awning:'#e2d8b7');
                }
                m.box(-.19,floor+.03,face+.035,.38,1.03,.03,'#3c6665','glass');
                m.rod([.13,floor+.42,face+.08],[.13,floor+.65,face+.08],.012,'#d4b67b',6);
            }
            // Piers and corner masonry establish complete bays on every face.
            for(const side of [-1,1])for(let column=0;column<=columns;column+=2){
                const u=Math.min(ww/2-.045,-ww/2+column*gap);
                m.box(u,floor+1.42,side<0?back-.035:face,.045,H-1.47,.035,tint(color,12),material);
            }
            const sideCount=Math.max(2,Math.floor(dd/.72)),sideGap=dd/sideCount;
            for(const side of [-1,1])for(let level=0;level<storeys;level++)for(let j=0;j<sideCount;j++){
                const width=Math.min(.42,sideGap*.57);
                drawFacadeWindow(m,{isX:true,plane:side*ww/2,along:back+(j+.5)*sideGap-width/2,y:floor+(level?1.5+(level-1)*1.05:.15),w:width,h:level?.72:1.12,far:side<0,trim:'#c5c6b7',seed:seed*113+j+level*13+side*5,style:level?(kind==='warehouse'?'industrial':'office'):'storefront'});
            }
            m.box(-ww/2-.015,floor+H,back-.015,ww+.03,.07,dd+.03,'#bfc1b1');
            roofDetails=drawCommercialRoof(m,{x:-ww/2+.03,y:floor+H+.07,z:back+.03,w:ww-.06,d:dd-.06,seed:seed+cx*.271+cz*.137});
            if(seed>.6){m.box(-ww*.28,floor+1.35,face+.025,ww*.56,.06,.28,'#7c8875','wood');for(const u of [-ww*.26,ww*.26])m.rod([u,floor+.03,face+.22],[u,floor+1.35,face+.22],.018,'#5d7169',6);}
        });
        return registerObject(m,start,{x,y:z,w,d,h:H+.1+roofDetails.height,base:floor-.08,arch:'urbanBlock',rotation:angle,footprint:rectangle(cx,cz,w,d,angle),homes:0,storeys,district:kind,roofDetails});
    }
    function makeTownhomeRow(x,z,w,d,front,seed,rotation=null,districtOverride=null){
        const m=getSceneMesh(),start=m.data.length,angle=rotation??[Math.PI,-Math.PI/2,0,Math.PI/2][front],cx=x+w/2,cz=z+d/2;
        const kind=districtOverride||district(cx/MAP_SCALE,cz/MAP_SCALE);
        if(w>=2.9&&(['downtown','soma','warehouse'].includes(kind)||kind==='mission'&&w>4.2&&seed>.6))return urbanBlock(x,z,w,d,front,seed,angle,kind);
        const frontage=front%2?d:w,depth=front%2?w:d,homes=Math.max(1,Math.round((frontage-.08)/(kind==='telegraph'?1.05:1.45))),unit=(frontage-.08)/homes;
        const point=(u,v)=>[cx+u*Math.cos(angle)-v*Math.sin(angle),cz+u*Math.sin(angle)+v*Math.cos(angle)];
        const plans=[],roofPlans=[];let high=-Infinity,low=Infinity;
        pose(m,cx,0,cz,angle,()=>{
            for(let home=0;home<homes;home++){
                const shape=rand(x+home*.73,z,71),p=planHouse({left:-frontage/2+.04+home*unit,width:unit-.025,depth,point,naturalHeight,groundHeight:terrainHeight,seed:shape});
                if(kind==='west')Object.assign(p,sunsetHouseProfile(shape));
                if(kind==='mission'&&p.storeys===2)p.H=2.27+shape*.1;
                if(SOUTHERN_PALETTES[kind])Object.assign(p,{H:kind==='deco'?2.85+shape*.18:kind==='craftsman'?2.3+shape*.2:2.5+shape*.25,storeys:2,roof:kind==='deco'?'flat':kind==='mediterranean'?'hip':kind==='craftsman'?'gable':shape<.5?'gable':shape<.8?'hip':'mansard'});
                if(kind==='bayview')Object.assign(p,{H:3.75+shape*.25,storeys:3,roof:shape>.55?'mansard':'gable'});
                if(kind==='telegraph')Object.assign(p,{H:1.65+shape*.14,storeys:1,roof:shape<.6?'gable':'hip'});
                if(p.foundationExposure>1.45&&kind!=='telegraph')Object.assign(p,{H:1.65+shape*.15,storeys:1});
                if(kind==='mission'||kind==='soma'||kind==='downtown')p.roof=shape<.8?'flat':'hip';
                const {left,width:ww,face,entry,door,dw,floor,H,storeys}=p;
                const hasLift=home===homes-1&&depth>2.8&&Math.abs(p.grade)>.32&&shape>.48&&lifts.length<6;
                if(hasLift)p.back=Math.max(p.fullBack+1.25,face-1.05);
                const back=p.back,dd=face-back,palette=SOUTHERN_PALETTES[kind]|| (kind==='telegraph'?['#9bbfaf','#dca6b3','#b4acd1','#e7c78f','#91b7d0']:kind==='west'?['#8cbcc1','#d2a18a','#b6bc88','#d8ba7d','#a6b6cf','#c5a6bd','#89b7a6','#d5b69b']:kind==='mission'?['#bda58e','#a9b6a0','#c0ad91','#ad9d8f','#9eada8']:HOUSE_COLORS),color=varyHousePaint(tint(palette[(Math.floor(seed*palette.length)+(kind==='west'||kind==='telegraph'?home:Math.floor(home/2)))%palette.length],Math.floor(shape*12)-6),shape*107+seed),panel=SOUTHERN_PALETTES[kind]?(kind==='craftsman'?'cedar':kind==='coastal'?'clapboard':'limewash'):kind==='west'||kind==='mission'?'stucco':shape>.5?'clapboard':'stucco',roofStyle=p.roof;
                const center=point(left+ww/2,(back+face)/2);cutHousePlot({cx:center[0],cz:center[1],w:ww,d:dd,angle,height:floor-.025,onlyLower:true});
                const stairCenter=point(door+dw/2,(face+entry)/2);cutHousePlot({cx:stairCenter[0],cz:stairCenter[1],w:dw+.1,d:entry-face,angle,height:p.entryHeight});
                m.box(left,floor+.125,back,ww,H-.125,dd,color,panel);
                groundSkirt(m,left,back,ww,dd,floor+.125,point,[-14,-10,-10,-8].map(shade=>tint(color,shade)));
                m.box(left-.006,floor+.15,face-.015,.028,H-.15,.04,trim);
                for(let storey=1;storey<storeys;storey++)m.box(left,floor+(kind==='west'?1.66:1.45+(storey-1)*1.12),face+.008,ww,.05,.04,tint(color,22));
                const doorColor=['#306f6c','#925d69','#435d91','#9c613a'][home%4];m.box(door-.028,floor+.09,face+.02,dw+.056,1.45,.055,trim);m.box(door,floor+.11,face+.078,dw,1.4,.026,doorColor);
                m.box(door+.035,floor+1.03,face+.108,dw-.07,.31,.014,'#85b9ba');m.box(door+.03,floor+.29,face+.11,dw-.06,.48,.014,tint(doorColor,12));m.sphere(door+dw-.04,floor+.8,face+.13,.016,.016,.016,'#d8b45e',5,3);
                for(let step=0;step<4;step++){const zz=entry-(step+1)*(entry-face)/4,top=p.entryHeight+.055+(step+1)*.06;m.box(door-.045,p.entryHeight-.03,zz,dw+.09,top-p.entryHeight+.03,(entry-face)/4+.012,'#d0bd99','stone');}
                for(const u of [door-.055,door+dw+.055]){m.rod([u,p.entryHeight+.08,entry],[u,floor+.65,face+.06],.014,'#41685f',4);m.rod([u,p.entryHeight+.08,entry],[u,p.entryHeight+.52,entry],.014,'#41685f',4);}
                if(kind==='west'){
                    m.box(door-.055,floor+1.58,face-.01,dw+.11,.075,.27,tint(color,24),'stucco');
                    m.box(door+.025,floor+1.42,face+.11,dw-.05,.12,.015,'#87a5a5',{window:.12});
                    m.sphere(door-.07,floor+1.2,face+.15,.032,.055,.035,'#ebd2a0',10,6,{emissive:.22});
                    for(const u of [left+.035,left+ww-.065])m.box(u,floor+1.75,face+.018,.03,H-1.8,.045,tint(color,21));
                }
                const bx=left+ww*.7,bw=ww*.47;
                for(let storey=0;storey<storeys;storey++){
                    const yy=floor+(kind==='west'?.66:.57)+storey*(kind==='west'?1.38:kind==='mission'?1:1.12),windowH=kind==='west'?.73:.55;
                    if((kind==='victorian'||kind==='bayview')&&shape>.25||kind==='west'&&(storey||shape>.38)){
                        bay(m,bx,yy,face+.018,bw,windowH,tint(color,storey?8:-5),seed*997+home);
                        if(kind==='west')m.box(bx-bw/2-.025,yy+windowH+.07,face-.005,bw+.05,.055,.22,trim);
                    }else sashWindow(m,false,face+.02,bx-bw/2,yy,bw,windowH,false,false,trim,seed*997+home);
                    if(storey)sashWindow(m,false,face,door+.01,yy+.02,dw-.02,kind==='west'?.65:.48,false,false,trim,home);
                    for(const f of [.26,.73])sashWindow(m,false,back,left+ww*f-(kind==='west'?.17:.11),yy,kind==='west'?.34:.22,kind==='west'?.64:.47,true,false,trim,home+storey);
                    if(home===0||home===homes-1)for(const f of [.32,.72]){
                        const at=back+dd*f-.11;if(home===0)sashWindow(m,true,left,at,yy,kind==='west'?.32:.22,kind==='west'?.62:.45,true,false,trim,home);
                        if(home===homes-1)sashWindow(m,true,left+ww,at,yy,kind==='west'?.32:.22,kind==='west'?.62:.45,false,false,trim,home);
                    }
                }
                basementGarage(m,left,ww,face,floor,point);basementGarage(m,left,ww,back,floor,point,true);
                // Downhill façades become walk-out basements, with doors and
                // windows, rather than a featureless block of retaining brick.
                const rearGround=Math.max(naturalHeight(...point(left+.08,back)),naturalHeight(...point(left+ww-.08,back))),basement=floor-rearGround;
                if(basement>.8){
                    const bottom=Math.max(rearGround+.06,floor-1.65),hh=Math.min(1.22,floor-bottom-.12);
                    m.box(left+ww*.12,bottom,back-.035,.28,hh,.035,'#567f70','wood');
                    sashWindow(m,false,back,left+ww*.63,bottom+hh*.36,.25,Math.min(.45,hh*.55),true,false,trim,home);
                    m.box(left+.018,bottom+hh+.05,back-.04,ww-.036,.045,.055,trim);
                    if(back-p.fullBack>.3){
                        m.box(left+.06,floor-.035,back-.28,ww-.12,.08,.29,'#b5a17b','wood');
                        m.rod([left+.08,floor+.55,back-.27],[left+ww-.08,floor+.55,back-.27],.018,'#466e61',4);
                        for(let u=left+.1;u<left+ww-.08;u+=.2)m.rod([u,floor+.05,back-.27],[u,floor+.55,back-.27],.012,'#466e61',4);
                    }
                }
                // Front gardens, carved brackets and contrasting window boxes.
                if(kind==='victorian'&&shape>.6||kind==='west'&&shape>.2){m.box(bx-bw*.4,floor+.44,face+.16,bw*.8,.1,.13,'#a66d48','wood');for(let i=0;i<4;i++){m.sphere(bx-bw*.3+i*bw*.2,floor+.57,face+.22,.07,.065,.06,'#6e944e',6,3);m.sphere(bx-bw*.3+i*bw*.2,floor+.63,face+.22,.035,.035,.03,['#df907d','#dec25e','#b18cbd'][home%3],5,3);}}
                m.box(left-.01,floor+H-.12,face+.02,ww+.02,.075,.09,trim);
                if(kind==='victorian')for(let j=.1;j<ww-.05;j+=.24)m.box(left+j,floor+H-.23,face+.025,.045,.12,.07,trim);
                const rise=roof(m,roofStyle,left,floor+H,back,ww,dd,shape,color,kind,roofPlans);
                if(SOUTHERN_PALETTES[kind])drawSouthernHouseDetails(m,kind,{...p,width:ww,shape,color,bx,bw});
                if(back-p.fullBack>.25){
                    const gardenZ=(back+p.fullBack)/2,gh=naturalHeight(...point(left+ww/2,gardenZ));
                    m.box(left+.04,gh-.04,gardenZ-.16,ww-.08,.1,.32,'#8c9d58','grass');
                    for(const u of [left+.14,left+ww-.14]){m.cylinder(u,gh+.05,gardenZ,.09,.14,'#c18359',7);m.sphere(u,gh+.26,gardenZ,.14,.15,.13,'#739a55',7,3);}
                    gardenStair(m,left+ww*.72,back-.07,p.fullBack+.12,ww*.3,point,angle,floor);
                    if(hasLift)gardenLift(m,left+ww*.26,back-.34,p.fullBack+.32,point,angle,shape,floor);
                }
                const frontRise=floor-p.entryHeight;plans.push({...p,color,roof:roofStyle,hasLift,frontRise});housingDetails.push(plans[plans.length-1]);
                low=Math.min(low,p.entryHeight-.08,floor-.08);high=Math.max(high,floor+H+rise,naturalHeight(...point(left+ww/2,p.fullBack))+1.05);
            }
        });
        return registerObject(m,start,{x,y:z,w,d,h:high-low,base:low,arch:'townhomes',roofDetails:roofPlans[0],district:kind,orientation:front,rotation:angle,footprint:rectangle(cx,cz,frontage,depth,angle),homes,storeys:Math.max(...plans.map(p=>p.storeys)),houses:plans});
    }
    /** Lincoln Way has shallow lots beside the park. Give them residential
     * proportions and details while keeping bays and steps within the parcel. */
    function makeParksideTownhome(cx,cz,w,d,angle,seed){
        const m=getSceneMesh(),start=m.data.length,point=(u,v)=>[cx+u*Math.cos(angle)-v*Math.sin(angle),cz+u*Math.sin(angle)+v*Math.cos(angle)];
        const left=-w/2+.04,ww=w-.08,back=-d/2+.04,face=d/2-.14,dd=face-back,entry=d/2-.015;
        const entryHeight=naturalHeight(...point(left+.26,entry)),floor=entryHeight+.18,H=3.15+seed*.25;
        const color=varyHousePaint(['#87b9b2','#d9a5b5','#e2c181','#a5b2d4','#b7c894','#c8a5ce'][Math.floor(seed*6)],seed*197),doorColor=['#4b6f87','#8d5266','#436d59'][Math.floor(seed*3)];
        const roofStyle=seed<.36?'gable':seed<.7?'hip':'mansard';
        cutHousePlot({cx,cz,w:w-.08,d:d-.1,angle,height:floor-.025,onlyLower:true});
        pose(m,cx,0,cz,angle,()=>{
            m.box(left,floor+.12,back,ww,H-.12,dd,color,'clapboard');
            groundSkirt(m,left,back,ww,dd,floor+.12,point,tint(color,-12));
            for(const y of [.2,1.66,H-.12])m.box(left,floor+y,face+.003,ww,.065,.055,trim);
            for(const x of [left+.015,left+ww-.045])m.box(x,floor+.267,face+.01,.03,H-.367,.035,tint(color,20));
            const door=left+.075,dw=Math.min(.36,ww*.28),bx=left+ww*.71,bw=ww*.46;
            m.box(door-.025,floor+.06,face+.02,dw+.05,1.47,.04,trim);
            m.box(door,floor+.08,face+.061,dw,1.41,.018,doorColor);
            m.box(door+.035,floor+1.03,face+.081,dw-.07,.31,.009,'#a1c6c5',{window:.22});
            m.sphere(door+dw-.045,floor+.76,face+.092,.014,.014,.012,'#d9ba73',8,5);
            for(let i=0;i<3;i++){const z=entry-(i+1)*(entry-face)/3;m.box(door-.025,entryHeight-.015,z,dw+.05,.075+i*.055,(entry-face)/3+.003,'#c7bba6','stone');}
            m.box(door-.04,floor+1.59,face-.015,dw+.08,.065,.12,trim);
            for(const y of [.62,2.03]){
                bay(m,bx,floor+y,face+.005,bw,.72,color,seed*401+y,.055);
                sashWindow(m,false,back,bx-bw/2,floor+y,bw,.67,true,false,trim,seed+y);
            }
            sashWindow(m,false,face+.015,door+.015,floor+2.06,dw-.03,.65,false,false,trim,seed);
            for(let x=left+.09;x<left+ww-.05;x+=.2)m.box(x,floor+H-.24,face+.025,.04,.13,.065,trim);
            m.box(bx-bw*.42,floor+.44,face+.06,bw*.84,.1,.07,'#9c775e','wood');
            for(let i=0;i<3;i++){
                const x=bx-bw*.28+i*bw*.28;m.sphere(x,floor+.57,face+.09,.045,.045,.035,'#71984f',8,5);
                m.sphere(x,floor+.61,face+.09,.025,.025,.022,seed>.5?'#e1b96c':'#cf8ba6',8,5);
            }
            roof(m,roofStyle,left,floor+H,back,ww,dd,seed,color);
        });
        return registerObject(m,start,{x:cx-w/2,y:cz-d/2,w,d,h:H+.8,base:floor-.08,arch:'townhomes',district:'parkside',rotation:angle,footprint:rectangle(cx,cz,w,d,angle),homes:1,storeys:2,houses:[{width:ww,H,storeys:2,roof:roofStyle,color,entryHeight,floor,frontRise:.18}]});
    }
    function makeCurbShop(cx,cz,w,d,angle,seed){
        const m=getSceneMesh(),start=m.data.length,poly=rectangle(cx,cz,w,d,angle),point=(u,v)=>[cx+u*Math.cos(angle)-v*Math.sin(angle),cz+u*Math.sin(angle)+v*Math.cos(angle)];
        const floor=naturalHeight(...point(0,d/2-.1))+.1,H=w<.75?.78:1.18;
        cutHousePlot({cx,cz,w:w-.05,d:d-.2,angle,height:floor-.025});
        pose(m,cx,0,cz,angle,()=>{
            const color=['#c89171','#8eaf9b','#c3a16f','#9a95b0'][Math.floor(seed*4)];
            m.box(-w/2+.025,floor-.05,-d/2+.025,w-.05,H+.05,d-.05,color,'stucco');
            groundSkirt(m,-w/2+.025,-d/2+.025,w-.05,d-.05,floor-.05,point,tint(color,-20));
            const z=d/2-.02;m.quad([-w*.39,floor+.1,z],[w*.39,floor+.1,z],[w*.39,floor+H*.8,z],[-w*.39,floor+H*.8,z],seed>.5?'#6e9892':'#787f9d','wood');
            for(const xx of [-w*.41,w*.39])m.box(xx,floor+.08,z,.025,H*.74,.025,trim);
            m.box(-w*.43,floor+H*.86,z-.005,w*.86,.055,.04,trim);
            roof(m,seed>.5?'gable':'flat',-w/2+.01,floor+H,-d/2+.01,w-.02,d-.02,seed,color);
        });
        return registerObject(m,start,{x:cx-w/2,y:cz-d/2,w,d,h:H+.8,base:floor-.1,arch:'shopfront',storeys:1,rotation:angle,footprint:poly});
    }
    function drawHillsideLifts(m,time,reduced){
        for(const lift of lifts){
            const t=reduced?.35:(1-Math.cos(time*.00024+lift.seed*6.28))/2,index=Math.min(11,Math.floor(t*12)),u=t*12-index,a=lift.points[index],b=lift.points[index+1],position=a.map((v,i)=>v+(b[i]-v)*u);
            pose(m,position[0],position[1],position[2],lift.angle,()=>{
                m.box(-.22,.02,-.25,.44,.08,.5,'#536b69');m.box(-.2,.1,-.23,.4,.25,.46,lift.color,'wood');
                for(const xx of [-.18,.16])for(const zz of [-.21,.19])m.box(xx,.35,zz,.025,.38,.025,'#e3d6af');
                for(const zz of [-.22,.21])m.quad([-.15,.39,zz],[.15,.39,zz],[.15,.65,zz],[-.15,.65,zz],'#84bbc0');
                m.box(-.24,.73,-.28,.48,.07,.56,'#e4cf9f');m.box(-.13,.35,-.13,.26,.09,.25,'#b8875a');
            });
        }
    }
    return {makeTownhomeRow,makeParksideTownhome,makeCurbShop,drawHillsideLifts,housingDetails};
}
