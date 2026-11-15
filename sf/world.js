import {buildTileNavigation,navigationObstacles,auditNavigationGrid} from './navigation.js';
import {PLACE_ICONS,placeIcon,iconSVG,drawPlaceIcon,drawDestinationFlag,createMinimapProjection,canvasPixelPoint,layoutMinimapIcons,nearestMinimapIcon} from './wayfinding.js';
import {createMaterialTexture,createSignTexture,MATERIAL_ATLAS,MATERIAL_IDS} from './materials.js';
import {createAlpineTexture,ALPINE_TEXTURE_GLSL} from './alpine-materials.js';
import {Mesh,rand,rgb,tint,sub,dot,cross,unit,matrixMultiply,rayBox,rayTriangle,pose,cutawayWallMask} from './geometry.js';
import {TILE_CONFIG,TILE_TYPES,TILE_PRESETS,TILE_EDGES,tileArea,clipTilePolygon,tilePolygonOverlap,surfaceTileFromPatches,buildSurfaceTile,validateTileMap,runTileRuleTests} from './tiles.js';
import {createWaterTiles,applyWaterTile,WATER_LEVEL} from './water-tiles.js';
import {createSFCoast,shorelineSegments} from './coastline.js';
import {createModels} from './models.js';
import {SUTRO_SITE,createSutroClimb} from './sutro.js';
import {drawStreetLamp,createLampGlow,SALESFORCE_CROWN_GLSL} from './lighting.js';
import {DOWNTOWN,marketSide} from './downtown.js';
import {createSeaSurface,drawOffshoreSea,decorateHeadlands} from './environment.js';
import {AIRSHIP_TERMINAL,AIRSHIP_ACCESS,SOUTHERN_ROADS,AIRPORT_RUNWAY,SPACEPORT_PIER,STARTUP_HQ,airportGate,airportRoadDistance,airportSurfaceTypeAt,onAirportApron,createAirship,drawAirship,drawAirshipTerminal} from './airship.js';
import {TAX_HQ,SF_SPACEPORT,SPACEPORT_HOUSES,RAIL_PIT,inRailPit,drawSouthernDistrict,taxDialogue,moveTaxAuthorities} from './southern-district.js';
import {SOUTHERN_BOUNDS,SOUTHERN_TRAILS,SOUTHERN_LEVEL_PADS} from './southern-layout.js';
import {createSouthernTerrain} from './southern-terrain.js';
import {populateSouthernNeighborhood} from './southern-neighborhood.js';
import {createRocketTravel,drawReusableRocket} from './rocket.js';
import {createRegionalRoad,drawHighwayMinimap} from './regional-road.js';
import {TAHOE,TAHOE_BOUNDS,createTahoe,nearTahoe,tahoeHeight,regionalGroundHeight,drawTahoeTerrain,drawTahoeStructures,drawGondolaCabin,drawSkiRider,drawRegionalBackdrop,drawTahoeMinimap,raycastTahoe,fitTahoeCamera,SNOW_SURFACE_GLSL} from './tahoe.js';
import {createAirshipRope,drawAirshipRope} from './airship-rope.js';
import {createEconomy,MERCHANTS} from './economy.js';
import {createDialogue} from './dialogue.js';
import {describeCharacter,sightPrimaryVerb} from './descriptions.js';
import {drawStartupHQ,drawGrainStand,merchant} from './commerce-world.js';
import {createWhales} from './wildlife.js';
import {createPaintedBunny} from './bunny.js';
import {createSkateDog} from './skate-dog.js';
import {PROMETHEUS,drawPrometheus,drawPrometheusFlame,prometheusTorchLight} from './prometheus.js';
import {createBayShipping} from './shipping.js';
import {RESTAURANTS,restaurantPoint,drawRestaurantDiners} from './restaurants.js';
import {createCityLife,drawStreetcar} from './life.js';
import {CHARACTER_CLIPS} from './characters.js';
import {createTigerEncounter} from './zoo-encounter.js';
import {SF_ZOO,UCSF_HOSPITAL,ZOO_PATHS,drawZooAndHospital,drawTigerGate,drawTiger,drawAnimalControlNet} from './zoo.js';
import {WINDSURF_LAUNCH,createWindsurfing,drawWindsurfer} from './windsurfing.js';
import {createPoliceChase,createDetentionSite,drawDetentionFacility} from './encounters.js';
import {WORLD_SIZE,REFERENCE_SIZE,STREET_LAYOUT_SIZE,PARK_BOUNDS,PANHANDLE,inBounds,boundsPolygon,SF_HILLS,sfElevation,sfHillCover,woodedHillPark,levelHeightField,cutBuildingPlot,MARIN_OUTLINE,marinElevation} from './geography.js';

/* Static WebGL world entry point. Terrain and models are actual 3D triangle
   meshes; the 2D canvases below are only maps and interface labels. No game assets
   or renderer code are copied from RuneScape or private-server clients. */
function createSFWorld({headless=false}={}){
    const $=id=>document.getElementById(id),world=headless?null:$('sf-world'),canvas=headless?null:$('sf-canvas'),map=headless?null:$('sf-minimap');
    const gl=headless?null:canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'low-power'});
    const mc=headless?null:map.getContext('2d');
    if(!headless&&(!gl||!mc))return;
    const classic=headless?null:document.querySelector('.maintable');
    const sections=headless?new Map():new Map([...classic.querySelectorAll('details')].map(el=>[el.querySelector('summary').textContent.trim(),el]));
    // Share one geographic transform across coast, park shapes and landmarks.
    // The street drawing has its own authored reference size; widths stay fixed.
    const N=WORLD_SIZE,MAP_SCALE=N/REFERENCE_SIZE,LAYOUT_SCALE=N/STREET_LAYOUT_SIZE;
    const mapTile=v=>Math.round(v*MAP_SCALE),mapPosition=v=>v*MAP_SCALE;
    const layoutPosition=v=>v*LAYOUT_SCALE;
    const mapPolygon=points=>points.map(p=>p.map(mapPosition));
    const TERRAIN_RES=4,TERRAIN_GRID=N*TERRAIN_RES,WALK_SPEED=4.6,ACCELERATION=24,CLEARANCE=.16;
    const occupied=new Uint8Array(N*N),landMask=new Uint8Array(N*N),reserved=new Uint8Array(N*N),roadIndex=new Int16Array(N*N),roadDistance=new Float32Array(N*N);
    const objects=[],places=[],visited=new Set();
    const player={x:mapTile(45),y:mapTile(29),path:[],moving:false,angle:Math.PI/2,speed:0,vx:0,vy:0,phase:0,motion:0,runBlend:0};
    const bike={x:mapTile(44),y:mapTile(30),riding:false};
    const camera={yaw:0,pitch:Math.PI/5,cos:1,sin:0,version:0};
    let active=false,built=false,raf=0,last=0,width=1,height=1,dpr=1,zoom=1,hovered=null,destination=null,action=null;
    let keys=new Set(),scrollBefore=0,currentInterior=null,readerPlace=null,ducksFedUntil=0,miniLast=0,playerSpeechUntil=0;
    const reduced=headless||matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointers=new Map();let pressTimer=0,longPressed=false,pinchDistance=0,gesture=false;
    let savedEconomy={};if(!headless)try{savedEconomy=JSON.parse(localStorage.getItem('sf-purse-v1')||'{}')||{};}catch{}
    function updatePurse(state){if(headless)return;$('sf-coins').textContent=state.coins;$('sf-inventory').textContent=state.equity+' equity · '+state.grain+' grain';try{localStorage.setItem('sf-purse-v1',JSON.stringify(state));}catch{}}
    const economy=createEconomy(savedEconomy,updatePurse);updatePurse(economy.state);
    const dialogue=headless?null:createDialogue({element:$('sf-dialogue'),journal:world.querySelector('.sf-journal'),log:$('sf-log'),economy,announce,onClose:()=>canvas.focus({preventScroll:true})});
    function poly(c,points,fill,stroke){c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
    function line(c,pts,color,size=1){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=size;c.stroke();}
    function ellipse(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
    // A hand-drawn geographic schematic. x runs west to east; y runs north to south.
    // The southern land continues past the city boundary, rather than forming an island.
    // Compressed, hand-traced shoreline: Lands End, the northern waterfront,
    // Rincon Point, Mission Bay, India Basin, and the Hunters Point peninsula.
    const COAST=createSFCoast(MAP_SCALE);
    const PRESIDIO = [[14,10],[19,8],[29,11],[33,17],[30,20],[27,22],[17,20],[11,16]].map(p=>p.map(mapPosition));
    const MARIN=mapPolygon(MARIN_OUTLINE);
    const sailingCoast=COAST.map(([x,z],i)=>[x,i===0||i===COAST.length-1?mapPosition(120):z]);
    const bridgeDirection=unit([DOWNTOWN.bridge.end[0]-DOWNTOWN.bridge.abutment[0],0,DOWNTOWN.bridge.end[1]-DOWNTOWN.bridge.abutment[1]]);
    const islandCenter=[mapPosition(DOWNTOWN.bridge.end[0])+bridgeDirection[0]*2,mapPosition(DOWNTOWN.bridge.end[1])+bridgeDirection[2]*2];
    const islandOutline=(x,z,rx,rz)=>Array.from({length:32},(_,i)=>[x+Math.cos(i*Math.PI/16)*rx,z+Math.sin(i*Math.PI/16)*rz]);
    const surf=createWindsurfing({scale:MAP_SCALE,obstacles:[sailingCoast,MARIN,islandOutline(...islandCenter,3.25,2.8),islandOutline(islandCenter[0]+1.1,islandCenter[1]-.8,2.1,2.1),islandOutline(PROMETHEUS.x,PROMETHEUS.z,3.15,3.15)]}),detention=createDetentionSite(MAP_SCALE);
    let chase=null,zoo=null,zooBase=0,bunny=null,skateDog=null;
    const sutroClimb=createSutroClimb(),airship=createAirship({worldSize:N,groundHeight:(x,z)=>terrainHeight(x,z)}),rope=createAirshipRope(),bayShipping=createBayShipping(MAP_SCALE),whales=createWhales(),merchants=[],tahoe=createTahoe();
    let ropeReturnHome=false,whalesSeen=false;
    const rocket=createRocketTravel({groundHeight:(x,z)=>terrainHeight(x,z)});
    let regionalRoad=null,highwayMesh=null,highwayGPU=null,southernTerrain=null,southernNeighborhood=null;
    const flying=()=>airship.state.active&&!rope.onGround;
    const labelPool=[],niaCitizen={id:'nia',label:'Woman',named:'Nia'};
    const HILLS=SF_HILLS.map(h=>({...h,x:mapPosition(h.x),y:mapPosition(h.y),r:mapPosition(h.r)}));
    // Planned city blocks. Regular streets use the same half-tile center lines;
    // SoMa has a separate 45-degree grid meeting Market Street.
    const streets=[];
    const street=(name,points,w=.5,kind='road')=>streets.push({name,points,w,kind,planned:true});
    street('Market Street',[[69.5,29.5],[46.5,52.5]],.75,'market');
    street('Embarcadero',[[60.5,14.5],[64.5,18.5],[68.5,23.5],[71.5,29.5],[71.5,35.5],[73.5,42.5],[74.5,48.5]],.65);
    const west=[12.5,18.5,23.5,29.5,34.5,40.5];
    for(let i=0;i<west.length;i++){
        street(['Great Highway','Sunset Boulevard','19th Avenue','24th Avenue','30th Avenue','Stanyan Street'][i],[[west[i],45.5],[west[i],80.5]]);
        if(i)street('Richmond avenue',[[west[i],28.5],[west[i],36.5]]);
    }
    for(const [name,z] of [['Lincoln Way',45.5],['Irving Street',51.5],['Noriega Street',56.5],['Taraval Street',61.5],['Vicente Street',66.5],['Sloat Boulevard',71.5],['Ocean Avenue',77.5]])street(name,[[12.5,z],[40.5,z]]);
    for(const [name,z] of [['Clement Street',28.5],['Geary Boulevard',32.5],['Fulton Street',36.5]])street(name,[[12.5,z],[z===28.5||z===36.5?40.5:Math.min(60.5,99-z),z]]);
    for(const [name,x] of [['Divisadero Street',42.5],['Van Ness Avenue',49.5],['Powell Street',54.5],['Grant Avenue',60.5]])street(name,[[x,x<46?22.5:x===54.5?13.5:17.5],[x,Math.min(43.5,99-x)]]);
    for(const [name,z] of [['Lombard Street',17.5],['Broadway',22.5],['California Street',27.5]])street(name,[[z<23?45.5:40.5,z],[Math.min(z>=27?60.5:68.5,99-z),z]]);
    street('Marina Boulevard',[[32.5,16.5],[38.5,17.5],[45.5,17.5]]);
    street('Fell Street',[[40.5,39.5],[49.5,39.5]]);street('Oak Street',[[40.5,42.5],[55.5,42.5]]);
    street('Haight Street',[[40.5,48.5],[49.5,48.5]]);
    for(const [name,x] of [['Divisadero south',44.5],['Castro Street',49.5],['Valencia Street',54.5],['Mission Street',59.5],['South Van Ness',64.5],['Third Street',70.5]])street(name,[[x,x<50?43.5:x-3],[x,x<50?64.5:77.5]]);
    for(const [name,z] of [['Sixteenth Street',54.5],['Twentieth Street',59.5],['Twenty-fourth Street',64.5],['Cesar Chavez Street',69.5],['Alemany Boulevard',74.5]])street(name,[[44.5,z],[Math.min(74.5,z+3),z]]);
    for(const [name,sum] of [['Mission Street north',108],['Folsom Street',117],['Harrison Street',126]])street(name,[[(sum+3)/2,(sum-3)/2],[74.5,sum-74.5]]);
    for(const [name,diff] of [['Second Street',30],['Fourth Street',21],['Sixth Street',12],['Eighth Street',3]])street(name,[[(99+diff)/2,(99-diff)/2],[(126+diff)/2,(126-diff)/2]]);
    for(const r of streets)r.points=r.points.map(p=>p.map(layoutPosition));
    streets[0].points=mapPolygon(DOWNTOWN.market);
    streets.find(r=>r.name==='Embarcadero').points[3]=DOWNTOWN.market[0].map(mapPosition);
    street('First Street',mapPolygon(DOWNTOWN.firstStreet),.5);
    for(const r of SOUTHERN_ROADS){street(r.name,r.points,AIRSHIP_ACCESS.halfWidth);streets.at(-1).regional=true;}
    for(const r of ZOO_PATHS)street(r.name,r.points,r.w,'path');
    // These two streets hug the park's actual edges, on the same coordinates.
    streets.find(r=>r.name==='Fell Street').points.forEach(p=>p[1]=mapPosition(PANHANDLE.north)-.8);
    streets.find(r=>r.name==='Oak Street').points.forEach(p=>p[1]=mapPosition(PANHANDLE.south)+.8);
    street('Stanyan park edge',[[mapPosition(32)-.85,layoutPosition(36.5)],[mapPosition(32)-.85,layoutPosition(45.5)]]);
    street('Masonic Avenue',mapPolygon([[35.8,30.95],[35.8,32.2]]),.38);
    street('Portola Drive',mapPolygon([[35,39],[32,41],[31,46],[34,50],[40,55]]),.5);
    for(const [name,points] of [
        ['Presidio Boulevard',[[19,9],[20,13],[24,16],[27,20],[32,22]]],
        ['JFK Promenade',[[10,30.5],[15,30.1],[19,30.5],[24,30.3],[29,31],[32,31.5],[37.1,31.5]]],
        ['Main Post walk',[[22,17.5],[29,17.5]]],['Lovers Lane',[[25,17.5],[27,19.5],[29,21]]],
        ['Crissy Field promenade',[[25,11.5],[29,12],[32,12]]],
        ['Martin Luther King Jr Drive',[[10,33],[18,33.2],[25,33.3],[31,33]]],
        ['Twin Peaks trail',[[32,41],[30,41.5],[29,43],[28,44.5],[31,46]]]
    ])street(name,mapPolygon(points),.24,'path');
    const market = streets[0], POND = {x:23.3,y:32,rx:1.9,ry:.8}, PALACE_LAGOON={x:34.6,y:13.1,rx:1.4,ry:.8};
    for(const p of [POND,PALACE_LAGOON])for(const key of ['x','y','rx','ry'])p[key]*=MAP_SCALE;
    // Keep the private cartography north of the city too, so following the
    // player into Marin does not turn the headlands into blank water.
    const MAP_ART={x:220,y:640,width:900,height:1540};
    const cityMap=headless?null:document.createElement('canvas');if(cityMap){cityMap.width=MAP_ART.width;cityMap.height=MAP_ART.height;}
    function insidePolygon(x,y,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const [ax,ay]=points[i],[bx,by]=points[j];if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;}return inside;}
    function distanceToSegment(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);}
    function nearestStreet(x,y){let distance=Infinity,index=0;streets.forEach((r,i)=>{for(let j=1;j<r.points.length;j++){const d=distanceToSegment(x,y,r.points[j-1],r.points[j]);if(d<distance){distance=d;index=i;}}});return {distance,index};}
    function alongStreet(r,f){r={...r,points:r.route||r.points};const lengths=r.points.slice(1).map((p,i)=>Math.hypot(p[0]-r.points[i][0],p[1]-r.points[i][1]));let d=f*lengths.reduce((a,b)=>a+b,0);for(let i=0;i<lengths.length;i++){if(d<=lengths[i]||i===lengths.length-1){const a=r.points[i],b=r.points[i+1],t=d/lengths[i];return {x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t};}d-=lengths[i];}}
    const inPanhandle=(x,y)=>inBounds(x/MAP_SCALE,y/MAP_SCALE,PANHANDLE);
    const inPark=(x,y)=>inBounds(x/MAP_SCALE,y/MAP_SCALE,PARK_BOUNDS)||inPanhandle(x,y);
    const pondValue = (x,y) => ((x-POND.x)/POND.rx)**2+((y-POND.y)/POND.ry)**2;
    const mercedValue = (wx,wy) => {const x=wx/MAP_SCALE,y=wy/MAP_SCALE;return Math.min(((x-16)/1.7)**2+((y-56)/2.7)**2,((x-18.5)/1.7)**2+((y-58.3)/2.2)**2);};
    const palaceWater = (x,y) => ((x-PALACE_LAGOON.x)/PALACE_LAGOON.rx)**2+((y-PALACE_LAGOON.y)/PALACE_LAGOON.ry)**2;
    const greenArea = (wx,wy) => {const x=wx/MAP_SCALE,y=wy/MAP_SCALE;return wx<layoutPosition(12.5)+3.5&&wy>=layoutPosition(45.5)||inPark(wx,wy)||woodedHillPark(x,y)||insidePolygon(wx,wy,PRESIDIO)||x>=31.5&&x<=36&&y>=11&&y<=15||x<13&&y>18&&y<26||x>=33&&x<=36&&y>=27&&y<=30||x>=35.7&&x<=36.8&&y>=43&&y<=46||((x-29)/4)**2+((y-43)/5)**2<1||((x-28)/3)**2+((y-52)/3)**2<1||((x-17)/6)**2+((y-57)/5)**2<1||x<23&&y>54;};
    function water(x,y){return !insidePolygon(x+.5,y+.5,COAST);}
    function isWalkable(x,y){return cityNavigation?navFree(x+.5,y+.5):Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<N&&y<N&&landMask[y*N+x]&&!occupied[y*N+x];}
    function placeAt(x,y){return places.find(p=>{const [u,v]=buildingPoint(p,x+.5,y+.5,true);return u>p.x&&u<p.x+p.w&&v>p.y&&v<p.y+p.d;})||null;}
    function landClearAt(x,y){return regionalRoad?.contains(x+.5,y+.5)?true:tahoe.contains(x+.5,y+.5)?tahoe.walkable(x+.5,y+.5):airship.contains(x+.5,y+.5)?true:cityNavigation?navFree(x+.5,y+.5):isWalkable(Math.floor(x),Math.floor(y));}
    function clearAt(x,y){return chase?.state.jailed?detention.walkable(x+.5,y+.5):landClearAt(x,y);}
    function canTravel(ax,ay,bx,by,ignoreCustody=false){
        const endpointFree=ignoreCustody?landClearAt:clearAt;if(!endpointFree(ax,ay)||!endpointFree(bx,by))return false;
        if(regionalRoad?.segment({x:ax,y:ay},{x:bx,y:by}))return true;
        if(tahoe.contains(ax+.5,ay+.5)||tahoe.contains(bx+.5,by+.5))return tahoe.segment({x:ax,y:ay},{x:bx,y:by});
        if((ignoreCustody||!chase?.state.jailed)&&airship.segment({x:ax,y:ay},{x:bx,y:by}))return true;
        return cityNavigation?.segment({x:ax,y:ay},{x:bx,y:by})||false;
    }

    function occupy(x,y,w=1,d=1){for(let j=Math.max(0,Math.floor(y));j<Math.min(N,Math.ceil(y+d));j++)for(let i=Math.max(0,Math.floor(x));i<Math.min(N,Math.ceil(x+w));i++)occupied[j*N+i]=1;}
    const configs = [
        {id:'home',name:"John's place",label:"John's place",category:'Bio & contact',source:'Bio',x:34,y:16,w:3,d:3,h:106,color:'#d3bc88',style:'victorian',description:'A San Francisco resident, builder, and incurable optimist. Ring the bell and say hello.'},
        {id:'links',name:'Mazarine Coffee',label:'Mazarine Coffee',category:'Links · Market Street',source:'Links',x:44,y:24,w:3,d:3,h:73,color:'#c99a79',style:'cafe',description:'Coffee on Market Street. Nia is enjoying a table inside Mazarine; browse a few connections to the rest of the internet over coffee.'},
        {id:'writing',name:'City Lights',label:'City Lights · Essays',category:'Writing',source:'Writing',x:44,y:15,w:3,d:3,h:88,color:'#d3c29e',style:'library',description:"Pull up a chair. Essays on technology, markets, and the ideas that won't leave you alone."},
        {id:'books',name:'Main Library',label:'Main Library · Bookshelf',category:'Bookshelf',source:'Bookshelf',x:40,y:27,w:3,d:3,h:88,color:'#cbc6b4',style:'civic',description:'Fiction and non-fiction that stay with you, long after the last page.'},
        {id:'press',name:'The Chronicle',label:'The newsstand',category:'Press & podcasts',source:'Press',x:44,y:34,w:3,d:2,h:48,color:'#bb7e60',style:'kiosk',description:'Extra, extra. News, conversations, and dispatches from the world of building companies.'},
        {id:'green',name:'Green',label:'Green',category:'Founding',source:'Founding',match:'green.com',x:49,y:38,w:3,d:3,h:102,color:'#789788',style:'bank',description:'A global financial institution for the people and agents of the future.'},
        {id:'limit',name:'Limit',label:'Limit',category:'Founding',source:'Founding',match:'limit.com',x:52,y:43,w:3,d:3,h:87,color:'#91a6ab',style:'shop',description:'Tools that changed the daily lives of thousands of insurance professionals.'},
        {id:'rose',name:'Rose',label:'Rose',category:'Founding',source:'Founding',match:'rosehome.com',x:25,y:25,w:3,d:2,h:70,color:'#c29790',style:'shop',description:'A healthier home, starting with the environment around you.'},
        {id:'venture',name:'Venture exchange',label:'Venture exchange',category:'Venture',source:'Venture',x:48,y:15,w:3,d:3,h:115,color:'#b0a18c',style:'bank',description:'An arcade of ambitious companies. Meet the builders working on what comes next.'},
        {id:'etc',name:'Curiosity shop',label:'Curiosity shop',category:'Etc. · Haight-Ashbury',source:'Etc.',x:31,y:36,w:3,d:3,h:78,color:'#aca0b3',style:'shop',description:'Other corners of the internet, a past life on the web, and a few digital curiosities.'}
    ];
    configs.forEach(b => {b.x=mapTile(b.x);b.y=mapTile(b.y);const door=Math.floor(b.x+b.w/2);b.entry={x:door,y:b.y+b.d};b.inside={x:door,y:b.y+b.d-2};places.push(b);});
    const sights = [
        {id:'park',label:'Golden Gate Park',category:'Park · ducks & cycling',kind:'park',x:30,y:32,entry:{x:30,y:31},description:'A long green escape on the western side of the city. Winding paths, cypress trees, and a pond full of very opinionated ducks.'},
        {id:'panhandle',label:'The Panhandle',category:'Fell & Oak · tree-lined cycle path',kind:'park',x:34,y:30,entry:{x:35,y:31},description:'The narrow green strip continuing east from Golden Gate Park between Fell and Oak. Cycle beneath the trees, pass the park monument, and continue toward Alamo Square.'},
        {id:'presidio',label:'Presidio · Main Post',category:'Parade ground · red-roof barracks',kind:'park',x:22,y:13,entry:{x:25,y:17},description:'Wooded hills give way to a broad parade ground, a flagpole, and rows of red-roof barracks. Trails lead toward Crissy Field, Lovers Lane, and the Golden Gate.'},
        {id:'crissy',label:'Crissy Field',category:'Presidio · bayfront meadow',kind:'park',x:28,y:11,entry:{x:29,y:12},description:'A low, open meadow beside the bay, below the wooded Presidio. Borrow the windsurf board by the promenade to sail off the beach.'},
        {id:'windsurf',label:'Windsurfing',category:'Crissy Field · board launch',kind:'windsurf',x:WINDSURF_LAUNCH.shore[0],y:WINDSURF_LAUNCH.shore[1],entry:{x:29,y:12},description:'A windsurf board and rig wait beside Crissy Field. Click the bay to sail; use Return to shore when you are ready to land.'},
        {id:'palace',label:'Palace of Fine Arts',category:'Marina · rotunda & lagoon',kind:'palace',x:32,y:12,entry:{x:32,y:15},description:'A sandstone-colored rotunda rises beside a little lagoon. Its dome and colonnade mark the eastern edge of the Presidio and the Marina.'},
        {id:'deyoung',label:'de Young Museum',category:'Golden Gate Park · copper tower',kind:'museum',x:26,y:29,entry:{x:26,y:31},description:'A dark copper museum and a twisted observation tower overlook the Music Concourse. The Academy sits across the plaza.'},
        {id:'academy',label:'California Academy of Sciences',category:'Golden Gate Park · living roof',kind:'museum',x:27,y:32,entry:{x:28,y:33},description:'Rounded green hills form the living roof of the Academy. Skylights, gardens, and the Music Concourse make a small cultural center within the park.'},
        {id:'conservatory',label:'Conservatory of Flowers',category:'Golden Gate Park · white glasshouse',kind:'garden',x:30,y:29,entry:{x:30,y:30},description:'A white glasshouse with a central dome, long glazed wings, and bright flower beds. The Panhandle begins a short ride to the east.'},
        {id:'windmill',label:'Park windmill',category:'Golden Gate Park · western gardens',kind:'windmill',x:11,y:29,entry:{x:12,y:31},description:'A timber windmill and flower beds stand near the park’s western end. Beyond the Great Highway, Ocean Beach opens onto the Pacific.'},
        {id:'ferry',label:'Ferry Building',category:'Embarcadero · waterfront',kind:'ferry',x:52,y:17,entry:{x:53,y:23},description:'The clock tower at the bay end of Market Street. Watch a streetcar roll past, then follow the waterfront north.'},
        {id:'coit',label:'Coit Tower',category:'Telegraph Hill',kind:'coit',x:46,y:12,entry:{x:47,y:15},description:'A pale tower above the steep streets of Telegraph Hill. North Beach sits just down the slope.'},
        {id:'pyramid',label:'Transamerica Pyramid',category:'Financial District · redwood plaza',kind:'pyramid',x:48,y:19,entry:{x:51,y:22},description:'A pale, tapering pyramid with a gridded façade and projecting side wings. A small redwood plaza softens the base of the Financial District landmark.'},
        {id:'painted',label:'Painted Ladies',category:'Alamo Square',kind:'painted',x:34,y:28,entry:{x:35,y:30},description:'A row of colorful Victorian houses overlooking Alamo Square. A good place to pause before riding west to the park.'},
        {id:'chinatown',label:'Chinatown',category:'Grant Avenue',kind:'gate',x:45,y:22,entry:{x:47,y:23},description:'Red pillars, green roof tiles, and Grant Avenue leading into Chinatown. Keep heading north for City Lights.'},
        {id:'bicycle',label:'Bicycle',category:'Ride around the city · B',kind:'bike',get entry(){return {x:Math.round(bike.x),y:Math.round(bike.y)};},description:'A red city bicycle. Ride it along Market Street and through the park. Press B to ride or park it; dismount automatically at shop doors.'},
        {id:'golden',label:'Golden Gate Bridge',category:'Presidio · northern strait',kind:'bridge',x:18,y:0,entry:{x:20,y:10},description:'The orange towers span the Golden Gate between the Presidio and Marin. The Pacific opens to the west; the bay opens to the east.'},
        {id:'beach',label:'Ocean Beach',category:'Pacific coast · western shore',kind:'beach',x:9,y:42,entry:{x:10,y:42},description:'The long Pacific shoreline beside the Great Highway. Golden Gate Park reaches the beach to the north, and the Sunset stretches inland.'},
        {id:'baybridge',label:'Bay Bridge',category:'Rincon Point · eastern waterfront',kind:'bridge',x:55,y:23,entry:{x:54,y:28},description:'The bridge leaves the eastern waterfront for Yerba Buena Island and the East Bay.'},
        {id:'peaks',label:'Twin Peaks',category:'Central hills · Portola Drive',kind:'hill',x:29,y:43,entry:{x:30,y:43},description:'The central ridgeline rises between the Sunset and the Castro. Follow the winding trail for a different view of the city.'},
        {id:'sutro',label:'Sutro Tower',category:'Central ridge · Clarendon Heights',kind:'tower',x:SUTRO_SITE.x,y:SUTRO_SITE.y,entry:{...SUTRO_SITE.entry},mapPoint:{x:SUTRO_SITE.x,y:SUTRO_SITE.y},description:'The red-and-white broadcasting tower rises between Mount Sutro and Twin Peaks. Three splayed legs, triangular crossbeams and slender antenna masts make its unmistakable silhouette above the trees.'},
        {id:'merced',label:'Lake Merced',category:'Southwestern San Francisco',kind:'lake',x:17,y:57,entry:{x:20,y:57},description:'A freshwater lake near the southwestern edge of the city, south of the Sunset and close to the Pacific.'},
        {id:'nia',label:'Nia · café regular',category:'Mazarine Coffee',kind:'guest',x:44,y:28,entry:{x:45,y:29},hiddenFromDirectory:true,description:'A friendly woman with warm brown skin and dark curls, enjoying her coffee at a table inside Mazarine.'},
        {id:'ducks',label:'Mallards & ducklings',category:'Golden Gate Park',kind:'ducks',entry:{x:26,y:32},hiddenFromDirectory:true,description:'Mallards and little ducklings paddle around the pond. They seem certain you brought something for them.'}
    ];
    sights.push(...RESTAURANTS.map(r=>({id:r.id,label:r.label,kind:'restaurant',x:r.target[0],y:r.target[1],entry:{x:r.target[0],y:r.target[1]},category:r.category,description:r.description})));
    sights.push(
        {id:'cityhall',label:'City Hall',category:'Civic Center · gilded dome',kind:'civic',x:38,y:30,entry:{x:39,y:33},description:'The granite wings and gilded dome of City Hall anchor Civic Center, just west of Market Street.'},
        {id:'salesforce',label:'Salesforce Tower',category:'South of Market · skyline',kind:'tower',x:50,y:25,entry:{x:51,y:28},description:'Broad glass façades taper toward a flat rooftop and a softly illuminated crown over the dense towers south of Market. The Transamerica Pyramid stands farther north.'},
        {id:'oracle',label:'Oracle Park',category:'South Beach · ballpark & cove',kind:'stadium',x:52,y:34,entry:{x:51,y:36},description:'A brick ballpark opens toward McCovey Cove, with green grass, tiered stands, and tall floodlights above the waterfront.'},
        {id:'dolores',label:'Dolores Park',category:'Mission · hillside lawns',kind:'park',x:36,y:44,entry:{x:36,y:46},description:'Palm trees and sloping lawns sit between the Mission and the Castro, with the downtown skyline beyond.'}
    );
    const ferrySite=sights.find(s=>s.id==='ferry'),salesforceSite=sights.find(s=>s.id==='salesforce'),bridgeSite=sights.find(s=>s.id==='baybridge');
    ferrySite.x=DOWNTOWN.ferry.center[0];ferrySite.y=DOWNTOWN.ferry.center[1];
    ferrySite.entry={x:DOWNTOWN.ferry.entrance[0]-.35*Math.SQRT1_2,y:DOWNTOWN.ferry.entrance[1]+.35*Math.SQRT1_2};
    ferrySite.mapPoint={x:DOWNTOWN.ferry.center[0],y:DOWNTOWN.ferry.center[1]};
    salesforceSite.x=DOWNTOWN.salesforce.center[0];salesforceSite.y=DOWNTOWN.salesforce.center[1];salesforceSite.entry={x:50,y:31.6};salesforceSite.mapPoint={x:50,y:30};
    bridgeSite.entry={x:DOWNTOWN.bridge.rampStart[0],y:DOWNTOWN.bridge.rampStart[1]};bridgeSite.mapPoint={x:DOWNTOWN.bridge.abutment[0],y:DOWNTOWN.bridge.abutment[1]};
    for(const [id,x,y] of [['panhandle',35,31.5],['presidio',25,15],['crissy',29,11.5],['palace',33,13],['deyoung',27,29.5],['academy',28,32.5],['conservatory',31,29.5],['windmill',11.5,29.5],['pyramid',49,20],['coit',47,13],['golden',18.8,5]])sights.find(s=>s.id===id).mapPoint={x,y};
    for(const [id,label] of [['deyoung','de Young'],['academy','Academy · living roof'],['conservatory','Conservatory']])sights.find(s=>s.id===id).worldLabel=label;
    for(const s of sights){if(s.x!==undefined)s.x=mapTile(s.x);if(s.y!==undefined)s.y=mapTile(s.y);if(s.kind!=='bike')s.entry={x:mapTile(s.entry.x),y:mapTile(s.entry.y)};if(s.mapPoint)s.mapPoint={x:mapPosition(s.mapPoint.x),y:mapPosition(s.mapPoint.y)};}
    function sightById(id){return sights.find(s=>s.id===id);}
    function setupZoo(){
        const c=SF_ZOO.cage,h=UCSF_HOSPITAL;
        zooBase=levelTerrainPad(c.x,c.z,c.w+.2,c.d+.2);
        levelTerrainPad(18.7,86.8,2.6,1.7);levelTerrainPad(h.x,h.z,h.w,h.d);
        for(const poly of [rectangle(SF_ZOO.x,SF_ZOO.z,SF_ZOO.w,SF_ZOO.d),rectangle(h.x,h.z,5.4,8.4)]){claimParcel({polygon:poly,kind:'public garden'});publicSpaces.push(poly);}
        for(const site of drawZooAndHospital(sceneMesh,terrainHeight,signs)){
            const sight={id:site.id,kind:site.kind,label:site.label,entry:site.entry,description:site.description,mapPoint:{x:site.lo[0]+(site.hi[0]-site.lo[0])/2,y:site.lo[2]+(site.hi[2]-site.lo[2])/2}};
            const object={mesh:sceneMesh,start:site.start/11,count:site.count/11,x:site.lo[0],y:site.lo[2],w:site.hi[0]-site.lo[0],d:site.hi[2]-site.lo[2],lo:site.lo,hi:site.hi,base:site.base,footprint:site.footprint,solid:true,pinned:true,preserveGround:true,arch:site.kind==='zoo'?'enclosure':'civic',sight};
            sight.object=object;objects.push(object);sights.push(sight);
        }
    }
    function setupTigerEncounter(){
        zoo=createTigerEncounter({player,home:{x:SF_ZOO.cage.x-.5,y:SF_ZOO.cage.z-.5},exit:SF_ZOO.exit,wardenStarts:SF_ZOO.wardens,
            routeTo:(x,y,from)=>pathTo(x,y,from,true),speed:WALK_SPEED,
            canPursue:()=>!chase.state.jailed&&!rocket.state.active&&!flying()&&!rope.climbing&&!sutroClimb.state.active&&!surf.state.riding&&tahoe.state.mode==='ground'&&!(zoo?.state.deaths&&Math.hypot(player.x-sightById('ucsf').entry.x,player.y-sightById('ucsf').entry.y)<2.5),
            canCapture:(a,b)=>canTravel(a.x,a.y,b.x,b.y,true),onDeath:respawnAtHospital,
            onEvent:(event,warden)=>{
                if(event==='released')announce('You open the tiger’s gate. The tiger has interpreted this as a dinner invitation. Run!','Zoo');
                if(event==='dispatched')announce('Animal control is on its way. “Nobody said there would be cardio.”','Animal Control');
                if(event==='captured')announce('“Got you! Back to your rent-controlled enclosure.” Animal control escorts the tiger home.','Animal Control');
                if(event==='caged')announce('The tiger is safely back in its cage. The latch has learned absolutely nothing.','Zoo');
                if(event==='missed'&&warden){warden.speech='That was a practice net!';warden.speechFor=2.4;}
                sightById('zoo').tigerLoose=event!=='caged';
            }
        });
    }
    function releaseTiger(){
        if(!zoo||chase?.state.jailed||rocket.state.active||sutroClimb.state.active||rope.climbing||surf.state.riding||tahoe.state.mode!=='ground')return false;
        if(flying())return airshipUnavailable();closeMenu();
        if(zoo.state.phase!=='caged'){announce(zoo.dangerous?'The tiger is already loose. This is a good time to keep moving.':'Animal control is handling the tiger. Wait until the gate is safely closed.','Zoo');return false;}
        const entry=sightById('zoo').entry;
        if(Math.hypot(player.x-entry.x,player.y-entry.y)>1)return walkTo(entry.x,entry.y,()=>zoo.release());
        return zoo.release();
    }
    function respawnAtHospital(){
        action=null;destination=null;dialogue.close();closeMenu();closeReader();closeHelp();keys.clear();pointers.clear();clearTimeout(pressTimer);gesture=false;
        rocket.cancel();rope.reset();airship.cancel();sutroClimb.cancel();tahoe.reset();surf.cancelJump();surf.state.riding=false;bike.riding=false;currentInterior=null;readerPlace=null;playerSpeechUntil=0;
        if(chase){chase.state.wanted=false;chase.state.jailed=false;chase.state.officers=[];}$('sf-wanted').hidden=true;$('sf-custody').hidden=true;
        const entry=sightById('ucsf').entry;Object.assign(player,{x:entry.x,y:entry.y,path:[],speed:0,moving:false,motion:0,phase:0,runBlend:0,vx:0,vy:0,gesture:null,angle:Math.PI});
        for(const input of world.querySelectorAll('#sf-map-button,.sf-place-marker'))input.disabled=false;
        updateClimbButton();updateRocketControls();updateAirshipButton();updateSurfButton();updateBikeButton();updateTahoeButton();setCamera(-Math.PI*.75-.18,1.08);drawMini();
        announce('You have died and respawned at UCSF Hospital','Hospital');canvas.focus({preventScroll:true});
    }
    function updateAirshipButton(){
        const flying=airship.state.active,climbing=sutroClimb.state.active,returning=['returning','descending'].includes(airship.state.phase),button=$('sf-airship-button');
        document.querySelector('.sf-actions').dataset.mode=climbing?'climbing':flying?'flying':'ground';
        button.hidden=climbing;button.disabled=!!chase?.state.jailed||returning;
        button.setAttribute('aria-pressed',String(flying));button.replaceChildren(document.createTextNode(returning?'Returning…':flying?'Return to terminal':'Airship'));
        if(!returning){const key=document.createElement('span');key.className='sf-key';key.textContent='A';button.append(key);}
        $('sf-bike-button').hidden=flying||climbing;$('sf-surf-button').hidden=flying||climbing;
        $('sf-rope-button').hidden=!airship.state.active;
        $('sf-rope-button').disabled=!!chase?.state.jailed||rope.climbing||!rope.state.deployed&&airship.state.phase!=='flying';
        $('sf-rope-button').textContent=rope.climbing?'Climbing…':rope.onGround?'Climb rope':rope.state.deployed?'Rope options':'Drop rope';
    }
    function airshipUnavailable(){
        if(clickAttempt)clickAttempt.worked=false;announce('Return the airship to the terminal before using a vehicle or entering a building. Press A to land.');return false;
    }
    function boardAirship(){
        if(chase?.state.jailed||sutroClimb.state.active||surf.state.riding)return false;
        const entry=AIRSHIP_TERMINAL.boarding;
        if(Math.hypot(player.x-entry.x,player.y-entry.y)>1)return useAirship();
        if(bike.riding)parkBike();
        if(!airship.board(player))return false;rope.reset();ropeReturnHome=false;
        closeReader();closeMenu();keys.clear();player.path=[];player.speed=0;player.gesture=null;action=null;destination=null;currentInterior=null;
        updateAirshipButton();announce('You rent the airship and board the forward deck. Rising above the city…','Pilot');canvas.focus({preventScroll:true});return true;
    }
    function showAirshipMenu(sx=width/2,sy=height/2){
        closeMenu();const menu=$('sf-context');menu.replaceChildren();
        const title=document.createElement('div');title.className='sf-context-title';title.textContent=airship.state.active?'Airship · Choose an option':'Private Jet Terminal · Airship rental';menu.append(title);
        const choices=airship.state.active?[['Fly to Tahoe',()=>{if(rope.state.deployed){announce('Retract the rope before flying.');return false;}airship.flyTo(TAHOE.base.x,TAHOE.base.z);destination={x:TAHOE.base.x-.5,y:TAHOE.base.z-.5};announce('Flying northeast across California to Lake Tahoe. This is a long continuous flight.','Pilot');return true;}],['Rope options',showRopeMenu],['Return to terminal',useAirship],['Float here',()=>{const p=tileAt(sx,sy);walkTo(p.x,p.y);}]]:[['Rent airship',boardAirship],['Examine terminal',()=>examine(sightById('airship'))]];
        for(const [label,fn] of [...choices,['Cancel',()=>canvas.focus({preventScroll:true})]]){
            const button=document.createElement('button');button.type='button';button.setAttribute('role','menuitem');button.textContent=label;button.addEventListener('click',e=>clicked(e.clientX,e.clientY,()=>{closeMenu();return fn();}));menu.append(button);
        }
        menu.hidden=false;menu.style.left=Math.min(width-menu.offsetWidth-12,Math.max(12,sx))+'px';menu.style.top=Math.min(height-menu.offsetHeight-12,Math.max(12,sy))+'px';menu.querySelector('button').focus({preventScroll:true});return true;
    }
    function useAirship(){
        if(tahoe.state.mode!=='ground')return false;
        if(chase?.state.jailed)return false;
        if(rope.climbing)return false;
        if(rope.onGround){ropeReturnHome=true;return climbRope(false);}
        if(rope.state.deployed&&!rope.retract()){announce('Wait for your passenger to finish climbing.');return false;}
        if(airship.state.active){closeMenu();closeReader();airship.returnHome();destination={x:airship.home.x-.5,y:airship.home.z-.5};action=null;updateAirshipButton();announce('Returning to the private jet terminal. The airship will descend onto its mooring.','Pilot');canvas.focus({preventScroll:true});return true;}
        if(sutroClimb.state.active)return climbUnavailable();
        if(surf.state.riding){if(clickAttempt)clickAttempt.worked=false;announce('Return to shore before renting an airship.');return false;}
        const entry=AIRSHIP_TERMINAL.boarding;
        if(Math.hypot(player.x-entry.x,player.y-entry.y)<1)return showAirshipMenu();
        closeReader();closeMenu();const accepted=walkTo(entry.x,entry.y,showAirshipMenu);
        if(accepted)announce('Walking south to the private jet terminal and airship rental stand.','Pilot');canvas.focus({preventScroll:true});return accepted;
    }
    function setupAirshipTerminal(){
        const region=navigationRegionAt(player.x,player.y),approach=airportGate(N),gate=nearestNavigation(approach.x,approach.y,.8,(x,y)=>y<N-.5&&navFree(x+.5,y+.5)&&surfaceTypeAt(x+.5,y+.5)==='road'&&navigationRegionAt(x,y)===region);
        if(!gate)throw new Error('Private jet terminal has no connected city approach');airship.setGate(gate);
        airship.setCruiseHeight(Math.max(...objects.map(o=>o.hi[1]))+4);
        const sight={id:'airship',kind:'airship',label:'Private Jet Terminal',category:'South of San Francisco · Airship rentals',entry:{...AIRSHIP_TERMINAL.boarding},description:'A private jet terminal on the peninsula south of the city. Small jets wait by the hangar, and a moored airship is available to rent. Click Rent airship or press A nearby; click the ground or minimap to fly, and A returns to the terminal.'};sights.push(sight);
        const {start,end,lo,hi}=drawAirshipTerminal(sceneMesh,airportSurfaceHeight),object={sight,x:lo[0],y:lo[2],w:hi[0]-lo[0],d:hi[2]-lo[2],base:AIRSHIP_TERMINAL.base,arch:'terminal',preserveGround:true,mesh:sceneMesh,start:start/11,count:(end-start)/11,lo,hi};
        objects.push(object);sight.object=object;
        const hq=drawStartupHQ(sceneMesh),hqSight={id:'startup-hq',kind:'startup',label:'Startup HQ',entry:{x:STARTUP_HQ.x-.5,y:131.6},description:'A small startup house at the end of Third Street. The orange Y Combinator sign hangs over the door. Talk to the founder to purchase startup equity.'};
        const house={sight:hqSight,mesh:sceneMesh,start:hq.start/11,count:hq.count/11,lo:hq.lo,hi:hq.hi,x:hq.lo[0],y:hq.lo[2],w:hq.hi[0]-hq.lo[0],d:hq.hi[2]-hq.lo[2],solid:true,base:AIRSHIP_TERMINAL.base};
        objects.push(house);hqSight.object=house;sights.push(hqSight);
    }
    function setupMerchants(){
        const region=navigationRegionAt(player.x,player.y),near=(x,z)=>nearestNavigation(x-.5,z-.5,4,(a,b)=>navigationRegionAt(a,b)===region&&clearAt(a,b));
        const exchange=places.find(p=>p.id==='venture'),buyer=near(exchange.entry.x+1.8,exchange.entry.y+.5),grain=near(POND.x-1,PARK_BOUNDS.north*MAP_SCALE-.8);
        if(!buyer||!grain)throw new Error('Trading NPCs need reachable street positions');
        merchants.push(merchant('founder',STARTUP_HQ.x+.35,131.8,AIRSHIP_TERMINAL.base+.04),merchant('secondary',buyer.x+.5,buyer.y+.5,characterGround(buyer.x+.5,buyer.y+.5)),merchant('grain',grain.x+.5,grain.y+.5,characterGround(grain.x+.5,grain.y+.5)));
        drawGrainStand(sceneMesh,merchants.find(p=>p.kind==='grain'));
        for(let i=0;i<5;i++)merchants.push({...merchant('tax',TAX_HQ.x+Math.sin(i*Math.PI/2.5)*1.9,130.5+Math.cos(i*Math.PI/2.5)*.7,AIRSHIP_TERMINAL.base+.04),id:'tax-authority-'+i,index:i,hold:0,height:2.15,phase:0});
    }
    function setupRegionalWorld(){
        const register=(site,mesh)=>{
            const regionalDescription=site.kind==='rail-pit'?'An empty pit. The sign says California high-speed rail.':site.kind==='tax-hq'?'The Tax Authority Headquarters. Gilded officials in top hats patrol the forecourt.':site.kind==='spaceport'?'A SpaceX reusable rocket and landing pad. Board for a one-coin flight between San Francisco and Tahoe.':site.kind==='gondola'?'A gondola climbs the immense mountain above Lake Tahoe.':'Rent skis at the summit for one coin, then ski the winding course and jump its ramps.';
            const sight={...site,description:site.description||regionalDescription};
            const object={sight,mesh,start:site.start/11,count:site.count/11,lo:site.lo,hi:site.hi,x:site.lo[0],y:site.lo[2],w:site.hi[0]-site.lo[0],d:site.hi[2]-site.lo[2],base:site.lo[1],arch:'regional',solid:true,preserveGround:true};
            sight.object=object;objects.push(object);sights.push(sight);
        };
        for(const site of drawSouthernDistrict(sceneMesh,signs))register(site,sceneMesh);
        register(drawPrometheus(sceneMesh,signs),sceneMesh);streetLights.push(prometheusTorchLight());
        makeTownhomeRow(SPACEPORT_HOUSES.x,SPACEPORT_HOUSES.z,SPACEPORT_HOUSES.w,SPACEPORT_HOUSES.d,0,.25);
        southernNeighborhood=populateSouthernNeighborhood({mesh:sceneMesh,terrain:southernTerrain,makeTownhomeRow,tree,bench,roadDistance:airportRoadDistance,signs});
        for(const site of southernNeighborhood.sights)register(site,sceneMesh);
        restaurantDiners.push(...southernNeighborhood.diners);
        for(const [i,p] of southernNeighborhood.lamps.entries())streetLights.push(...drawStreetLamp(sceneMesh,p.x,characterGround(p.x,p.z)+.02,p.z,p.angle,i%3));
        tahoeMesh=new Mesh();if(!headless)drawTahoeTerrain(tahoeMesh);for(const site of drawTahoeStructures(tahoeMesh,tahoe,signs))register(site,tahoeMesh);tahoeGPU=upload(tahoeMesh);
        const a=DOWNTOWN.bridge.rampStart.map(mapPosition),cityGate=nearestNavigation(a[0]-.5,a[1]-.5,1.5,(x,y)=>navFree(x+.5,y+.5));
        if(!cityGate)throw new Error('Bay Bridge must connect to the city navigation grid');
        regionalRoad=createRegionalRoad({scale:MAP_SCALE,groundHeight:terrainHeight,cityGate});highwayMesh=regionalRoad.mesh();highwayGPU=upload(highwayMesh);
    }
    function useRocket(sight){
        if(rocket.state.active||chase?.state.jailed||rope.climbing||sutroClimb.state.active||tahoe.state.mode!=='ground'||flying())return false;
        const go=()=>{
            closeMenu();closeReader();player.path=[];player.speed=0;keys.clear();
            const toTahoe=sight.id==='sf-spaceport';
            dialogue.open({name:'SpaceX flight crew',shirt:'#768fb5',intro:'Our reusable rocket flies '+(toTahoe?'to Lake Tahoe':'back to San Francisco')+' for one coin. Enjoy the view from the capsule!',question:'Board the rocket for one coin?',choice:'Launch · 1 coin',decline:'Stay here',receipt:'Launch clearance received. Click OK to board your rocket.',accept:()=>{
                const result=economy.trade('rocket');return {...result,after:result.ok?()=>{
                    rope.reset();airship.cancel();surf.cancelJump();surf.state.riding=false;bike.riding=false;tahoe.reset();currentInterior=null;action=null;destination=null;
                    rocket.start(toTahoe?SF_SPACEPORT:tahoe.spaceport,toTahoe?tahoe.spaceport:SF_SPACEPORT,{x:player.x+.5,y:playerGround(),z:player.y+.5});
                    setCamera(Math.PI*.75+.3,.72);setZoom(.85);updateAirshipButton();updateTahoeButton();updateRocketControls();drawMini();
                    announce('You board the reusable rocket. Next stop: '+(toTahoe?'Lake Tahoe.':'San Francisco.'),'SpaceX');
                }:null};
            }});
        };
        if(Math.hypot(player.x-sight.entry.x,player.y-sight.entry.y)<2){go();return true;}return walkTo(sight.entry.x,sight.entry.y,go);
    }
    function updateRocketControls(){
        for(const id of ['sf-bike-button','sf-surf-button','sf-airship-button','sf-rope-button','sf-climb-button'])$(id).disabled=rocket.state.active;
    }
    function useGondola(up=true){
        if(chase?.state.jailed||flying()||rope.climbing||tahoe.state.mode!=='ground')return false;
        const entry=up?tahoe.baseEntry:tahoe.summitEntry,start=()=>{closeMenu();closeReader();player.path=[];player.speed=0;action=null;destination=null;tahoe.gondola(up);updateTahoeButton();announce(up?'You board the gondola. The mountain rises far above the lake.':'You board the gondola down to the lakeside station.','Gondola');};
        if(Math.hypot(player.x-entry.x,player.y-entry.y)<2){start();return true;}return walkTo(entry.x,entry.y,start);
    }
    function rentSkis(){
        if(tahoe.state.rented){announce('Your skis are already rented for this visit.');return true;}
        const site=sightById('ski-rental'),open=()=>{closeMenu();player.path=[];player.speed=0;dialogue.open({name:'Ski rental',shirt:'#74959c',intro:'Welcome to the summit! Rent a pair of skis for one coin. The course below has four ramps. Press Space in the air to flip, and click to steer.',question:'Rent skis for one coin?',choice:'Rent skis · 1 coin',decline:'Not yet',receipt:'Your skis are ready. Use Ski down to begin your descent.',accept:()=>{const result=economy.trade('skis');if(result.ok)tahoe.state.rented=true;updateTahoeButton();return result;}});};
        if(Math.hypot(player.x-site.entry.x,player.y-site.entry.y)<2){open();return true;}return walkTo(site.entry.x,site.entry.y,open);
    }
    function startSkiRun(){
        if(!tahoe.state.rented)return rentSkis();
        const start=()=>{player.path=[];player.speed=0;action=null;destination=null;tahoe.startSki();setCamera(-Math.PI*3/4,.65);updateTahoeButton();announce('You push off. Click to steer and press Space while airborne to flip!','Skiing');};
        if(Math.hypot(player.x-tahoe.summitEntry.x,player.y-tahoe.summitEntry.y)<1.2){start();return true;}return walkTo(tahoe.summitEntry.x,tahoe.summitEntry.y,start);
    }
    function useTahoeActivity(){
        if(tahoe.state.mode==='ski')return tahoe.flip();
        if(tahoe.state.mode==='gondola')return false;
        return Math.hypot(player.x+.5-TAHOE.peak.x,player.y+.5-TAHOE.peak.z)<10?(tahoe.state.rented?startSkiRun():rentSkis()):useGondola(true);
    }
    function updateTahoeButton(){
        const button=$('sf-ski-button'),near=nearTahoe(player.x+.5,player.y+.5),mode=tahoe.state.mode;
        button.hidden=!near;button.disabled=rocket.state.active||mode==='gondola'||mode==='ski'&&tahoe.state.airTime<=0;
        button.textContent=mode==='gondola'?'Riding gondola…':mode==='ski'?(tahoe.state.airTime>0?'Flip · Space':'Skiing…'):Math.hypot(player.x+.5-TAHOE.peak.x,player.y+.5-TAHOE.peak.z)<10?(tahoe.state.rented?'Ski down':'Rent skis · 1 coin'):'Ride gondola';
        if(near){$('sf-bike-button').hidden=true;$('sf-surf-button').hidden=true;$('sf-airship-button').hidden=!airship.state.active||mode!=='ground';$('sf-rope-button').hidden=!airship.state.active||mode!=='ground';}
    }
    function merchantApproach(npc){
        return npc.kind==='founder'?{x:STARTUP_HQ.x-.5,y:130.6}:npc.kind==='tax'?{x:npc.x-.5,y:131.6}:nearestNavigation(npc.x-.5,npc.z-.5,2,(x,y)=>Math.hypot(x+.5-npc.x,y+.5-npc.z)>.7);
    }
    function talkMerchant(npc){
        if(chase?.state.jailed||rope.climbing)return false;
        if(flying()&&npc.kind!=='passenger')return airshipUnavailable();
        closeReader();closeMenu();
        if(npc.kind==='tax')npc.hold=35;
        const begin=()=>{player.path=[];player.speed=0;keys.clear();dialogue.open(npc.kind==='tax'?taxDialogue(economy):{...MERCHANTS[npc.kind],...npc});};
        if(npc.kind==='passenger'||Math.hypot(player.x+.5-npc.x,player.y+.5-npc.z)<2){begin();return true;}
        const target=merchantApproach(npc);
        return !!target&&walkTo(target.x,target.y,begin);
    }
    function deployRope(){
        if(!airship.state.active||airship.state.phase!=='flying'){announce('Reach cruising height before dropping a rope.');return false;}
        const p=airship.state.position,a=airship.state.heading,x=p.x+Math.cos(a)*.55,z=p.z+Math.sin(a)*.55;
        if(!clearAt(x-.5,z-.5)||placeAt(x-.5,z-.5)){announce('Hover over a clear street, park, or airport apron before dropping the rope.');return false;}
        airship.stop();const ground=characterGround(x,z);
        const ok=rope.deploy({x,y:p.y+.07,z},{x,y:ground,z});updateAirshipButton();if(ok)announce('You lower a rope to the ground. Use Rope options to climb down or offer a traveler a ride.','You');return ok;
    }
    function climbRope(down){
        const begin=()=>{if(rope.climb(down)){player.path=[];player.speed=0;destination=null;updateAirshipButton();}};
        if(!down&&Math.hypot(player.x+.5-rope.state.bottom.x,player.y+.5-rope.state.bottom.z)>.9)return walkTo(rope.state.bottom.x-.5,rope.state.bottom.z-.5,begin);
        begin();return true;
    }
    function showRopeMenu(){
        closeMenu();if(!airship.state.active)return false;
        if(!rope.state.deployed)return deployRope();
        const menu=$('sf-context');menu.replaceChildren();const heading=document.createElement('div');heading.className='sf-context-title';heading.textContent='Airship rope';menu.append(heading);
        const options=rope.onGround?[['Climb up',()=>climbRope(false)]]:[['Climb down',()=>climbRope(true)],['Offer a ride · 5 coins',()=>talkMerchant({...MERCHANTS.passenger,kind:'passenger',receipt:'The traveler starts climbing. They will pay you five coins when they reach the deck.',accept:()=>rope.invite()?{ok:true}:{ok:false,message:'Your passenger has already boarded or is still climbing.'}})],['Retract rope',()=>{if(!rope.retract())announce('Wait for your passenger to finish climbing.');updateAirshipButton();}]];
        for(const [text,fn] of [...options,['Cancel',()=>{}]]){const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',()=>{closeMenu();fn();canvas.focus({preventScroll:true});});menu.append(b);}
        menu.hidden=false;menu.style.left=Math.max(12,width/2-menu.offsetWidth/2)+'px';menu.style.top=Math.max(12,height/2-menu.offsetHeight/2)+'px';menu.querySelector('button').focus();return true;
    }
    function updateClimbButton(){
        const active=sutroClimb.state.active,button=$('sf-climb-button'),descending=sutroClimb.state.phase==='descending';
        button.hidden=!active;updateAirshipButton();
        button.disabled=!!chase?.state.jailed||descending;
        button.replaceChildren(document.createTextNode(descending?'Climbing down…':'Climb down'));
        if(!descending){const key=document.createElement('span');key.className='sf-key';key.textContent='E';button.append(key);}
    }
    function climbUnavailable(text='Climb down from Sutro Tower before walking elsewhere. Use Climb down or press E.'){
        if(clickAttempt)clickAttempt.worked=false;announce(text);return false;
    }
    function descendSutro(){
        if(chase?.state.jailed||!sutroClimb.descend())return false;
        closeMenu();closeReader();keys.clear();updateClimbButton();
        announce('You start climbing down Sutro Tower.','You');canvas.focus({preventScroll:true});return true;
    }
    function sutroApproach(from=player){
        const tower=sightById('sutro').object,cx=tower.x+tower.w/2,cz=tower.y+tower.d/2,region=navigationRegionAt(from.x,from.y);
        return nearestNavigation(cx-.5,cz-tower.d/2-.9-.5,2,(x,y)=>y+.5<cz-tower.d/2-.25&&navigationRegionAt(x,y)===region&&!placeAt(x,y));
    }
    function climbSutro(){
        if(airship.state.active)return airshipUnavailable();
        if(chase?.state.jailed)return false;
        if(sutroClimb.state.active)return descendSutro();
        if(surf.state.riding)return climbUnavailable('Return to shore before climbing Sutro Tower.');
        closeMenu();closeReader();
        const tower=sightById('sutro').object,cx=tower.x+tower.w/2,cz=tower.y+tower.d/2,approach=sutroApproach();
        if(!approach)return climbUnavailable('There is no clear route to the Sutro Tower ladder.');
        const accepted=walkTo(approach.x,approach.y,()=>{
            if(chase?.state.jailed)return;
            if(bike.riding)parkBike();
            sutroClimb.begin({x:cx,z:cz,base:tower.base},{x:player.x+.5,y:terrainHeight(player.x+.5,player.y+.5),z:player.y+.5});
            player.path=[];player.speed=0;player.gesture=null;action=null;destination=null;currentInterior=null;keys.clear();
            updateClimbButton();announce('You take the service ladder up Sutro Tower. Press E or Climb down to turn back.','You');
        });
        if(accepted&&!sutroClimb.state.active)announce('Walking to the Sutro Tower service ladder…');
        canvas.focus({preventScroll:true});return accepted;
    }
    function goToSight(s){
        if(rocket.state.active)return false;
        if(chase?.state.jailed)return;
        if(s.kind==='bunny')return petBunny();
        if(s.kind==='zoo')return releaseTiger();
        if(s.kind==='spaceport')return useRocket(s);
        if(s.kind==='gondola')return useGondola(s.id==='gondola-base');
        if(s.kind==='ski-rental')return rentSkis();
        if(s.kind==='tax-hq')return talkMerchant(merchants.find(p=>p.kind==='tax'));
        if(s.kind==='rail-pit')return examine(s);
        closeMenu();
        if(s.kind==='startup'){talkMerchant(merchants.find(p=>p.kind==='founder'));return;}
        if(s.kind==='whale')return jumpWhale(s);
        if(s.kind==='airship'){useAirship();return;}
        if(s.kind==='windsurf'){useSurf();return;}
        if(s.kind==='bike'){useBike();return;}
        if(s.kind==='guest'){walkTo(s.entry.x,s.entry.y,talkToNia);return;}
        return examine(s);
    }
    function talkToNia(){announce('“Best way to see the city? Borrow the bicycle, take Market west, and go say hello to the ducks.”','Nia');}
    function setupBunny(){
        const p=sightById('painted'),o=p.object,a=o.rotation||0,cx=o.x+o.w/2,cz=o.y+o.d/2;
        const x=cx-Math.sin(a)*(o.d/2+1.6),z=cz+Math.cos(a)*(o.d/2+1.6),region=navigationRegionAt(player.x,player.y);
        const reachable=(x,y)=>navigationRegionAt(x,y)===region&&!placeAt(x,y);
        const site=nearestNavigation(x-.5,z-.5,3,(x,y)=>reachable(x,y)&&surfaceTypeAt(x+.5,y+.5)==='grass')||nearestNavigation(x-.5,z-.5,2,reachable);
        if(!site)throw new Error('The Painted Ladies bunny needs a reachable patch of grass');
        bunny=createPaintedBunny(site.x+.5,site.y+.5);sights.push(bunny.sight);
    }
    function setupSkateDog(){
        const hall=sightById('cityhall').object,cx=hall.x+hall.w/2,front=hall.y+hall.d+.85,region=navigationRegionAt(player.x,player.y);
        const paved=(x,y)=>navigationRegionAt(x,y)===region&&!placeAt(x,y)&&['plaza','courtyard','sidewalk','path','cobble'].includes(surfaceTypeAt(x+.5,y+.5));
        const home=nearestNavigation(cx-.5,front-.5,2,paved);
        if(!home)throw new Error('City Hall needs a paved forecourt for its skateboarding dog');
        let route=null;
        search:for(const angle of [0,Math.PI/2])for(const half of [1.2,.9,.6]){
            const a={x:home.x-Math.cos(angle)*half,y:home.y-Math.sin(angle)*half},b={x:home.x+Math.cos(angle)*half,y:home.y+Math.sin(angle)*half};
            if(!canTravel(a.x,a.y,b.x,b.y))continue;
            let valid=true;for(let i=0;i<=12;i++)if(!paved(a.x+(b.x-a.x)*i/12,a.y+(b.y-a.y)*i/12))valid=false;
            if(!valid)continue;
            route=[a,b].map(p=>({x:p.x+.5,z:p.y+.5}));break search;
        }
        if(!route)throw new Error('The skateboarding dog needs a clear route outside City Hall');
        skateDog=createSkateDog(route,{onWoof:()=>announce('Woof!','Skateboarding dog')});sights.push(skateDog.sight);
    }
    function bunnyApproach(from=player){
        const b=bunny.state,a=Math.atan2(from.y+.5-b.z,from.x+.5-b.x);
        const region=navigationRegionAt(from.x,from.y),valid=(x,y)=>{const d=Math.hypot(x+.5-b.x,y+.5-b.z);return d>.6&&d<.85&&!placeAt(x,y)&&navigationRegionAt(x,y)===region&&Math.abs(characterGround(x+.5,y+.5)-characterGround(b.x,b.z))<.22;};
        return nearestNavigation(b.x+Math.cos(a)*.72-.5,b.z+Math.sin(a)*.72-.5,1,valid)||nearestNavigation(b.x-.5,b.z-.5,.9,valid);
    }
    function petBunny(){
        if(!bunny||chase?.state.jailed||rocket.state.active||rope.climbing||sutroClimb.state.active||surf.state.riding||tahoe.state.mode!=='ground')return false;
        if(flying())return airshipUnavailable();closeMenu();closeReader();
        const b=bunny.state,target=bunnyApproach();
        if(!target)return false;
        return walkTo(target.x,target.y,()=>{
            if(bike.riding)parkBike();player.path=[];player.speed=0;player.motion=0;player.runBlend=0;player.phase=0;player.angle=Math.atan2(b.z-player.y-.5,b.x-player.x-.5);
            const now=performance.now();player.gesture={name:'pet',started:now,duration:1500};bunny.pet(now,player.angle+Math.PI);
            announce('You pet the bunny. Its nose twitches approvingly.','You');canvas.focus({preventScroll:true});
        });
    }
    function feedDucks(){
        const s=sightById('ducks');closeMenu();
        if(!economy.state.grain){announce('You need grain. Talk to the grain merchant beside the park; one bag costs one coin.');return false;}
        return walkTo(s.entry.x,s.entry.y,()=>{const result=economy.trade('feed');if(!result.ok){announce(result.message);return;}ducksFedUntil=performance.now()+10000;announce('You scatter one bag of grain. Quack! The mallards and ducklings paddle over to investigate.','Ducks');});
        canvas.focus({preventScroll:true});
    }
    function updateBikeButton(){
        const near=!currentInterior&&Math.hypot(player.x-bike.x,player.y-bike.y)<2.5;
        const button=$('sf-bike-button'),mode=bike.riding?'riding':near?'near':'far';if(button.dataset.mode===mode)return;button.dataset.mode=mode;button.replaceChildren(document.createTextNode(bike.riding?'Park bike ':near?'Ride bike ':'Find bike '));
        const key=document.createElement('span');key.className='sf-key';key.textContent='B';button.append(key);button.setAttribute('aria-pressed',String(bike.riding));
    }
    function parkBike(x=player.x,y=player.y){bike.riding=false;bike.x=x;bike.y=y;player.speed=Math.min(player.speed,WALK_SPEED);updateBikeButton();announce('You park the bicycle. It will be waiting here.','You');}
    function mountBike(){
        if(currentInterior)return;
        bike.riding=true;player.speed=0;player.path=[];destination=null;action=null;updateBikeButton();
        announce('You hop on the bicycle. Click to ride; press B to park.','You');canvas.focus({preventScroll:true});
    }
    function useBike(){
        if(chase?.state.jailed)return;
        if(sutroClimb.state.active)return climbUnavailable();
        if(airship.state.active)return airshipUnavailable();
        if(surf.state.riding){if(clickAttempt)clickAttempt.worked=false;announce('Return to shore before collecting the bicycle.');return;}
        closeMenu();if(bike.riding){parkBike();return;}
        if(!currentInterior&&Math.hypot(player.x-bike.x,player.y-bike.y)<2.5)mountBike();
        else{walkTo(Math.round(bike.x),Math.round(bike.y),mountBike);announce('Walking to the bicycle…');canvas.focus({preventScroll:true});}
    }
    function updateSurfButton(){const b=$('sf-surf-button');b.textContent=surf.state.riding?'Return to shore':'Windsurf · F';b.setAttribute('aria-pressed',String(surf.state.riding));}
    function jumpWhale(sight){
        closeMenu();
        if(!surf.state.riding||chase?.state.jailed){if(clickAttempt)clickAttempt.worked=false;announce('Borrow a windsurf board at Crissy Field to jump over the whales.','Whale watching');return false;}
        if(surf.state.jump)return false;
        let attempts=0;
        const launch=()=>{
            const target=whales.sample(reduced?0:performance.now()+800,sight.index);
            if(surf.jumpOver(player,target)){
                player.path=[];player.speed=7.2;player.angle=surf.state.jump.angle;action=null;destination=null;
                announce('You launch your board over the humpback whale!','Windsurfing');canvas.focus({preventScroll:true});return true;
            }
            const takeoff=surf.jumpApproach(player,target);
            if(!takeoff||attempts++>=3){if(clickAttempt)clickAttempt.worked=false;announce('Choose a whale with enough open water around it to jump.','Windsurfing');return false;}
            const accepted=walkTo(takeoff.x,takeoff.y,launch);
            if(accepted)announce('You sail into position to jump the humpback.','Windsurfing');return accepted;
        };
        return launch();
    }
    function mountSurf(){
        if(chase?.state.jailed)return;
        if(bike.riding)parkBike();closeReader();closeMenu();
        surf.cancelJump();surf.state.riding=true;player.x=surf.state.launch.x;player.y=surf.state.launch.y;player.path=[];player.speed=0;destination=null;action=null;
        currentInterior=null;updateSurfButton();announce('You launch from Crissy Field. Click the bay to windsurf; F returns you to shore.','You');
    }
    function landSurf(){
        surf.cancelJump();surf.state.riding=false;player.x=surf.state.shore.x;player.y=surf.state.shore.y;player.path=[];player.speed=0;action=null;destination=null;updateSurfButton();announce('You carry the board back onto Crissy Field.','You');
    }
    function useSurf(){
        if(airship.state.active)return airshipUnavailable();
        if(chase?.state.jailed)return;if(sutroClimb.state.active)return climbUnavailable();closeMenu();closeReader();
        if(surf.state.riding)walkTo(surf.state.launch.x,surf.state.launch.y,landSurf);
        else if(walkTo(surf.state.shore.x,surf.state.shore.y,mountSurf))announce('Walking to the windsurf board at Crissy Field…');
        canvas.focus({preventScroll:true});
    }
    function officerRoute(tx,ty,from){
        return surf.pursuitRoute(from,{x:tx,y:ty},{landPath:(to,origin)=>pathTo(to.x,to.y,origin),clear:p=>clearAt(p.x,p.y)});
    }
    function arrestPlayer(){
        dialogue.close();rocket.cancel();updateRocketControls();rope.reset();airship.cancel();sutroClimb.cancel();updateClimbButton();
        surf.cancelJump();surf.state.riding=false;bike.riding=false;player.x=detention.x-.5;player.y=detention.z-.5;player.path=[];player.speed=0;player.moving=false;player.angle=-Math.PI/2;player.motion=0;player.runBlend=0;player.phase=0;player.gesture=null;
        action=null;destination=null;currentInterior=null;keys.clear();pointers.clear();clearTimeout(pressTimer);gesture=false;
        closeMenu();closeReader();closeHelp();$('sf-hover').hidden=true;$('sf-wanted').hidden=true;$('sf-custody').hidden=false;
        for(const input of world.querySelectorAll('#sf-map-button,#sf-bike-button,#sf-surf-button,#sf-airship-button,.sf-place-marker'))input.disabled=true;
        camera.yaw=.35;camera.cos=Math.cos(camera.yaw);camera.sin=Math.sin(camera.yaw);camera.pitch=.7;zoom=1;
        $('sf-zoom-slider').value='100';$('sf-zoom-slider').setAttribute('aria-valuetext','100% zoom');updateCamera();drawMini();
        updateSurfButton();announce('You are under arrest! You have been placed in the Carceral Urbanist Facility in the Marin Headlands. Click the floor to walk within your cell.','Police');
    }
    function interactCitizen(npc,verb){
        if(npc.kind&&MERCHANTS[npc.kind])return talkMerchant(npc);
        if(flying())return airshipUnavailable();
        if(chase?.state.jailed||surf.state.riding)return;closeMenu();
        if(sutroClimb.state.active)return climbUnavailable();
        npc.hold=8;npc.lookAt={x:player.x+.5,z:player.y+.5};
        const target=nearestNavigation(npc.x-.5,npc.z-.5,2,(x,y)=>{const d=Math.hypot(x+.5-npc.x,y+.5-npc.z);return d>=.8&&d<1.5&&(!npc.interior||placeAt(x,y)===npc.interior);});
        const perform=()=>{
            npc.hold=3;npc.lookAt={x:player.x+.5,z:player.y+.5};
            const started=performance.now();player.gesture={name:verb,started,duration:verb==='talk'?900:650};
            npc.gesture={name:verb==='attack'?'flinch':verb==='talk'?'talk':null,started,duration:900};
            if(verb==='talk'){
                const lines=['The wind is good off Crissy Field. There is a board by the beach. Sail west of the city to spot whales.','You can see the whole city from Twin Peaks.','I was on my way to Mazarine for a coffee.','Try the park. The ducks always have something to say.'];
                const text=npc.named==='Nia'?'Best way to see the city? Borrow the bicycle, or go windsurfing at Crissy Field.':lines[Math.floor(rand(npc.x,npc.z,7)*lines.length)];
                npc.speech=text;npc.speechUntil=performance.now()+4500;announce('“'+text+'”',npc.named||npc.label);
            }else{
                npc.speech='Help! Police!';npc.speechUntil=performance.now()+4500;
                announce(verb==='attack'?'You attack the '+npc.label.toLowerCase()+'. They call for the police.':'You steal a few coins from the '+npc.label.toLowerCase()+'. They raise the alarm.','You');
                chase.start();$('sf-wanted').hidden=false;announce('Stop! You are under arrest!','Police');
            }
        };
        if(Math.hypot(player.x+.5-npc.x,player.y+.5-npc.z)<1.8&&(!npc.interior||currentInterior===npc.interior))perform();
        else if(!target||!walkTo(target.x,target.y,perform)){if(clickAttempt)clickAttempt.worked=false;npc.hold=0;announce('Move closer to the '+npc.label.toLowerCase()+'.');}
        canvas.focus({preventScroll:true});
    }
    function initializeGeography(){
        for(let y=0;y<N;y++)for(let x=0;x<N;x++){
            const id=y*N+x;
            landMask[id]=[[.04,.04],[.96,.04],[.96,.96],[.04,.96]].every(([dx,dy])=>insidePolygon(x+dx,y+dy,COAST))?1:0;
            const r=nearestStreet(x+.5,y+.5);roadIndex[id]=r.index;roadDistance[id]=r.distance;
            if(landMask[id]&&(pondValue(x+.5,y+.5)<1.1||mercedValue(x+.5,y+.5)<1.08||palaceWater(x+.5,y+.5)<1.08))occupied[id]=1;
        }
        // Entrances and landmark approaches remain open when scenery is generated.
        for(const p of [...places.map(p=>p.entry),...sights.map(s=>s.entry),player]){
            for(let x=Math.floor(p.x)-1;x<=Math.ceil(p.x)+1;x++)for(let y=Math.floor(p.y)-1;y<=Math.ceil(p.y)+1;y++)if(x>=0&&y>=0&&x<N&&y<N)reserved[y*N+x]=1;
        }
    }



    let worldTiles=null;
    // BEGIN TILE BUILDER
    function tileBaseType(x,z,fixed=false){
        if(!insidePolygon(x,z,COAST))return 'sea';
        if(worldTiles?.waterTiles?worldTiles.waterTiles.regionAt(x,z).type==='water':pondValue(x,z)<1.12||mercedValue(x,z)<1.1||palaceWater(x,z)<1.1)return 'water';
        return tileLandType(x,z,fixed);
    }
    function tileLandType(x,z,fixed=false){
        if(fixed)return 'building';if(Math.abs(x-SF_ZOO.x)<SF_ZOO.w/2&&Math.abs(z-SF_ZOO.z)<SF_ZOO.d/2)return 'grass';const u=x/MAP_SCALE,v=z/MAP_SCALE;if(u>=23.7&&u<=26.9&&v>=12.8&&v<=17.4)return 'grass';if(u>=47.8&&u<=51.6&&v>=18.8&&v<=23)return 'plaza';if(u<9.6&&v>28)return 'sand';if(greenArea(x,z))return sfHillCover(u,v);return 'plaza';
    }
    const sub2=(a,b)=>[a[0]-b[0],a[1]-b[1]];
    function chamferDistance(mask,size){
        const out=new Float32Array(mask.length);for(let i=0;i<out.length;i++)out[i]=mask[i]?0:1e5;
        for(let z=0;z<size;z++)for(let x=0;x<size;x++){const i=z*size+x;if(x)out[i]=Math.min(out[i],out[i-1]+1);if(z){out[i]=Math.min(out[i],out[i-size]+1);if(x)out[i]=Math.min(out[i],out[i-size-1]+Math.SQRT2);if(x+1<size)out[i]=Math.min(out[i],out[i-size+1]+Math.SQRT2);}}
        for(let z=size-1;z>=0;z--)for(let x=size-1;x>=0;x--){const i=z*size+x;if(x+1<size)out[i]=Math.min(out[i],out[i+1]+1);if(z+1<size){out[i]=Math.min(out[i],out[i+size]+1);if(x)out[i]=Math.min(out[i],out[i+size-1]+Math.SQRT2);if(x+1<size)out[i]=Math.min(out[i],out[i+size+1]+Math.SQRT2);}}return out;
    }
    function createTileBuilder(){
        const size=N*TILE_CONFIG.resolution,step=1/TILE_CONFIG.resolution,blocked=new Uint8Array(size*size),fixed=new Uint8Array(N*N);
        for(let i=0;i<fixed.length;i++)fixed[i]=occupied[i];
        for(let z=0;z<size;z++)for(let x=0;x<size;x++){const wx=(x+.5)*step,wz=(z+.5)*step,id=z*size+x,base=tileBaseType(wx,wz);blocked[id]=!landMask[Math.floor(wz)*N+Math.floor(wx)]||base==='water'||fixed[Math.floor(wz)*N+Math.floor(wx)]?1:0;}
        const vertices=(size+1)**2,road=new Float32Array(vertices),path=new Float32Array(vertices);road.fill(100);path.fill(100);
        return {size,step,blocked,clearance:chamferDistance(blocked,size),road,path,roadFrames:new Float32Array(vertices),routes:[],tiles:[],connectors:0,waterTiles:createWaterTiles({size,step,coast:COAST,lakes})};
    }
    function simplifyRoute(ids,size,step){
        const result=[];for(let i=0;i<ids.length;i++){const id=ids[i],x=id%size,z=Math.floor(id/size),prev=ids[i-1],next=ids[i+1];if(i&&i+1<ids.length&&x-prev%size===next%size-x&&z-Math.floor(prev/size)===Math.floor(next/size)-z)continue;result.push([(x+.5)*step,(z+.5)*step]);}return result;
    }
    function paintStreetField(map,points,kind,halfWidth){
        const field=kind==='path'?map.path:map.road,stride=map.size+1,margin=halfWidth+TILE_CONFIG.curbWidth+map.step*2;
        for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],loX=Math.max(0,Math.floor((Math.min(a[0],b[0])-margin)/map.step)),hiX=Math.min(map.size,Math.ceil((Math.max(a[0],b[0])+margin)/map.step)),loZ=Math.max(0,Math.floor((Math.min(a[1],b[1])-margin)/map.step)),hiZ=Math.min(map.size,Math.ceil((Math.max(a[1],b[1])+margin)/map.step));for(let z=loZ;z<=hiZ;z++)for(let x=loX;x<=hiX;x++){const id=z*stride+x;const value=distanceToSegment(x*map.step,z*map.step,a,b)-halfWidth;if(value<field[id]){field[id]=value;if(kind!=='path')map.roadFrames[id]=((Math.atan2(b[1]-a[1],b[0]-a[0])%(Math.PI/2))+Math.PI/2)%(Math.PI/2);}}}
    }
    function centerNetworkComponents(map){
        const labels=new Int32Array(map.size*map.size);labels.fill(-1);const centers=new Uint8Array(labels.length),stride=map.size+1;
        for(let z=0;z<map.size;z++)for(let x=0;x<map.size;x++){const a=z*stride+x,c=(z+1)*stride+x+1;centers[z*map.size+x]=Math.min((map.road[a]+map.road[c])*.5,(map.path[a]+map.path[c])*.5)<=1e-9?1:0;}
        let count=0;for(let id=0;id<labels.length;id++)if(centers[id]&&labels[id]<0){const queue=[id];labels[id]=count;for(let i=0;i<queue.length;i++){const k=queue[i],x=k%map.size,z=Math.floor(k/map.size);for(const d of TILE_EDGES){const nx=x+d.dx,nz=z+d.dz;if(nx<0||nz<0||nx>=map.size||nz>=map.size)continue;const ni=nz*map.size+nx;if(centers[ni]&&labels[ni]<0){labels[ni]=count;queue.push(ni);}}}count++;}return {labels,count};
    }
    function connectStreetNetwork(map){
        for(let tries=0;tries<16;tries++){const {labels,count}=centerNetworkComponents(map);if(count<=1)return;
            const owner=new Int32Array(labels),parent=new Int32Array(labels.length);parent.fill(-1);const queue=[];for(let id=0;id<labels.length;id++)if(labels[id]>=0)queue.push(id);const need=(.18+TILE_CONFIG.curbWidth+map.step*Math.SQRT2)/map.step+.5;let pair=null;
            search:for(let i=0;i<queue.length;i++){const k=queue[i],x=k%map.size,z=Math.floor(k/map.size);for(const d of TILE_EDGES){const nx=x+d.dx,nz=z+d.dz;if(nx<0||nz<0||nx>=map.size||nz>=map.size)continue;const ni=nz*map.size+nx;if(map.clearance[ni]<need)continue;if(owner[ni]<0){owner[ni]=owner[k];parent[ni]=k;queue.push(ni);}else if(owner[ni]!==owner[k]){pair=[k,ni];break search;}}}
            if(!pair)throw new Error('Isolated street network');const left=[],right=[];for(let id=pair[0];id>=0;id=parent[id])left.push(id);for(let id=pair[1];id>=0;id=parent[id])right.push(id);const route=[...left.reverse(),...right],points=simplifyRoute(route,map.size,map.step);if(route.length*map.step>12)throw new Error('Unreasonably long street connector');paintStreetField(map,points,'path',.18);map.routes.push({name:'Connecting walk',kind:'path',points,halfWidth:.18});map.connectors++;
        }throw new Error('Too many disconnected street fragments');
    }
    function compileStreetTiles(){
        const map=createTileBuilder();
        for(const r of streets){
            const profile={kind:r.kind==='path'?'path':'road',halfWidth:r.w},parts=[];
            // Clip straight road runs to dry land. Buildings never bend the grid.
            for(let i=1;i<r.points.length;i++){
                const a=r.points[i-1],b=r.points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]),steps=Math.max(1,Math.ceil(length/.125));let part=[];
                const finish=()=>{if(part.length>1){const line=[part[0],part[part.length-1]];parts.push(line);}part=[];};
                for(let j=0;j<=steps;j++){const t=j/steps,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,ix=Math.floor(x/map.step),iz=Math.floor(z/map.step),need=(profile.halfWidth+TILE_CONFIG.curbWidth+map.step*Math.SQRT2)/map.step+.5;
                    if(ix>=0&&iz>=0&&ix<map.size&&iz<map.size&&map.clearance[iz*map.size+ix]>=need)part.push([x,z]);else finish();
                }finish();
            }
            const runs=[];for(const p of parts){const last=runs[runs.length-1];if(last&&Math.hypot(...sub2(last[last.length-1][1],p[0]))<.15)last.push(p);else runs.push([p]);}const main=runs.sort((a,b)=>b.reduce((s,p)=>s+Math.hypot(...sub2(p[1],p[0])),0)-a.reduce((s,p)=>s+Math.hypot(...sub2(p[1],p[0])),0))[0]||[];parts.length=0;parts.push(...main);for(const line of parts){paintStreetField(map,line,profile.kind,profile.halfWidth);map.routes.push({name:r.name,...profile,points:line});}
            r.parts=parts;r.route=parts.length?parts.reduce((a,b)=>Math.hypot(...sub2(b[1],b[0]))>Math.hypot(...sub2(a[1],a[0]))?b:a):r.points;
            // This road continues over the grid boundary. Evaluate its complete
            // centerline so the final city tiles match the airport tiles exactly.
            if(r.regional)paintStreetField(map,r.points,profile.kind,profile.halfWidth);
            if(r.name==='Market Street')r.route=r.points;
        }
        connectStreetNetwork(map);
        const stride=map.size+1,claims=new Map();map.overrideTypes=new Map();for(const item of TILE_CONFIG.overrides){const preset=TILE_PRESETS[item.preset];if(!preset)throw new Error('Unknown tile preset: '+item.preset);if(!Number.isInteger(item.rotation??0)||(item.rotation??0)<0||(item.rotation??0)>3)throw new Error('Tile rotation must be 0–3');if(!Number.isInteger(item.x)||!Number.isInteger(item.z)||item.x<0||item.z<0||item.x>=map.size||item.z>=map.size)throw new Error('Tile override outside map');const ids=[item.z*stride+item.x,item.z*stride+item.x+1,(item.z+1)*stride+item.x+1,(item.z+1)*stride+item.x];for(const key of ['road','path'])if(preset[key])for(let i=0;i<4;i++){const value=preset[key][(i-(item.rotation||0)+4)%4],vertex=ids[i],claim=key+':'+vertex;if(claims.has(claim)&&claims.get(claim)!==value)throw new Error('Conflicting shared tile override');claims.set(claim,value);map[key][vertex]=value;}if(preset.type)map.overrideTypes.set(item.z*map.size+item.x,preset.type);}
        map.passageCache?.clear();worldTiles=map;rebuildSurfaceTiles();
    }
    function rebuildSurfaceTiles(){
        const map=worldTiles,stride=map.size+1;map.tiles=[];
        for(let z=0;z<map.size;z++)for(let x=0;x<map.size;x++){
            const id=z*map.size+x,wx=(x+.5)*map.step,wz=(z+.5)*map.step,cell=map.waterTiles.boundaries.get(id),region=map.waterTiles.regionAt(wx,wz);
            const base=map.overrideTypes.get(id)||(cell?tileLandType(wx,wz):region.type||tileLandType(wx,wz));
            const tile=applyWaterTile(buildSurfaceTile(base,[z*stride+x,z*stride+x+1,(z+1)*stride+x+1,(z+1)*stride+x].map(k=>[map.road[k],map.path[k]])),cell);
            if(region.type)tile.waterLevel=region.level;
            tile.frame=map.road[z*stride+x]<99?map.roadFrames[z*stride+x]:(wx-wz>=layoutPosition(3)&&wx+wz>=layoutPosition(99)&&wx+wz<=layoutPosition(126)?Math.PI/4:0);map.tiles.push(tile);
        }
    }
    function pavingInArea(x,z,w=1,d=1){
        if(!worldTiles)return false;const m=worldTiles;for(let iz=Math.max(0,Math.floor(z/m.step));iz<Math.min(m.size,Math.ceil((z+d)/m.step));iz++)for(let ix=Math.max(0,Math.floor(x/m.step));ix<Math.min(m.size,Math.ceil((x+w)/m.step));ix++){const t=m.tiles[iz*m.size+ix];if((t.areas.road||0)+(t.areas.path||0)+(t.areas.sidewalk||0)>1e-8)return true;}return false;
    }
    function auditDowntown(){
        const end=DOWNTOWN.market[0].map(mapPosition),f=DOWNTOWN.ferry.entrance.map(mapPosition),tower=objects.find(o=>o.sight?.id==='salesforce'),ferry=objects.find(o=>o.sight?.id==='ferry');
        const endpoint=(name,p)=>Math.min(...worldTiles.routes.filter(r=>r.name===name).flatMap(r=>r.points.map(q=>Math.hypot(q[0]-p[0],q[1]-p[1]))));
        const first=DOWNTOWN.bridge.rampStart.map(mapPosition),dx=f[0]-end[0],dz=f[1]-end[1];
        const checks={salesforceSouthOfMarket:marketSide((tower.x+tower.w/2)/MAP_SCALE,(tower.y+tower.d/2)/MAP_SCALE)>2.5,marketReachesFerryPlaza:endpoint('Market Street',end)<.26,embarcaderoMeetsMarket:endpoint('Embarcadero',end)<.26,ferryFacesMarket:Math.abs(dx+dz)<1e-7&&dx>0,bridgeJoinsFirstStreet:endpoint('First Street',first)<.26,ferryPinned:!!ferry.pinned};
        return {ok:Object.values(checks).every(Boolean),checks};
    }
    function finalizeSurfaceTiles(){
        const map=worldTiles;for(const o of objects)if((o.place||o.arch||o.solid)&&!o.preserveGround){const footprint=objectFootprint(o),bounds=polygonBounds(footprint);
            for(let z=Math.max(0,Math.floor(bounds.z/map.step));z<Math.min(map.size,Math.ceil(bounds.bottom/map.step));z++)for(let x=Math.max(0,Math.floor(bounds.x/map.step));x<Math.min(map.size,Math.ceil(bounds.right/map.step));x++){
                const wx=x*map.step,wz=z*map.step,tile=map.tiles[z*map.size+x];if((tile.areas.road||tile.areas.path||tile.areas.sidewalk)){const patches=tile.patches||[{type:tile.type,polygon:[[0,0],[1,0],[1,1],[0,1]]}];for(const patch of patches)if(['road','path','sidewalk'].includes(patch.type)&&tilePolygonOverlap(footprint,patch.polygon.map(p=>[wx+p[0]*map.step,wz+p[1]*map.step]))>1e-6)throw new Error('Building crosses its curb at '+o.x+','+o.y);continue;}if(!insidePolygon(wx+map.step/2,wz+map.step/2,footprint))continue;
                if((tile.areas.road||0)+(tile.areas.path||0)+(tile.areas.sidewalk||0)>1e-7)continue;
                tile.frame=((o.rotation||0)%(Math.PI/2)+Math.PI/2)%(Math.PI/2);
                // Waterfront piers and lagoon landmarks may span water. Their
                // footprints can recolor dry ground, but must retain the bank.
                if(tile.areas.sea||tile.areas.water){
                    if(tile.patches?.some(p=>TILE_TYPES[p.type].group!=='water')){const replacement=surfaceTileFromPatches('building',tile.patches.map(p=>TILE_TYPES[p.type].group==='water'?p:{...p,type:'building'}),{keepPolygons:true});replacement.variant='shoreline';Object.assign(tile,replacement);}
                    continue;
                }
                tile.base='building';tile.type='building';tile.variant='building';tile.patches=null;tile.areas={building:1};tile.edges=TILE_EDGES.map(()=>[{from:0,to:1,type:'building'}]);
            }
        }
        // Enclosed rear-block space is a shared garden, not an empty paved lot.
        const buildings=chamferDistance(Uint8Array.from(map.tiles,t=>t.type==='building'?1:0),map.size),paving=chamferDistance(Uint8Array.from(map.tiles,t=>(t.areas.road||t.areas.path||t.areas.sidewalk)?1:0),map.size);
        for(let z=0;z<map.size;z++)for(let x=0;x<map.size;x++){const id=z*map.size+x,t=map.tiles[id],wx=(x+.5)*map.step,wz=(z+.5)*map.step;if(t.type!=='plaza'||t.areas.sea||t.areas.water||buildings[id]>8||paving[id]<2.5||publicSpaces.some(p=>insidePolygon(wx,wz,p)))continue;t.type='courtyard';t.base='courtyard';t.variant='courtyard';t.patches=null;t.areas={courtyard:1};t.edges=TILE_EDGES.map(()=>[{from:0,to:1,type:'courtyard'}]);}
        const regression=runTileRuleTests(),report=validateTileMap(map);if(!report.ok)throw new Error('World tile validation failed: '+report.errors.slice(0,8).join('; '));const geography=auditDowntown();if(!geography.ok)throw new Error('Downtown geography failed: '+JSON.stringify(geography.checks));const frontages=auditCityBlocks();if(!frontages.ok)throw new Error('Street-block validation failed: '+frontages.coverage+'% building frontage; '+frontages.alignmentErrors+' alignment errors');map.validation={...report,regression,connectors:map.connectors,dimensions:{x:N,y:N,reference:REFERENCE_SIZE,scale:MAP_SCALE},frontages,geography};
    }
    // END TILE BUILDER
    // Mesh coordinates are east, elevation, south. Positions/normals/colors/UVs
    // remain in GPU buffers when the camera moves; only its matrix changes.
    // Inline SVG source assets are rasterized once into one mipmapped GPU atlas.
    // Materials repeat in world coordinates, so adjacent surface cells have no seams.
    let tahoeGPU=null,tahoeMesh=null;
    let program,atlasTexture,materialTexture,materialState=null,alpineTextures,alpineState=null,sceneGPU,groundGPU,dynamicGPU,sceneMesh,groundMesh,seaBounds,shadowProgram,shadowFramebuffer,shadowTexture,shadowMatrix,shadowRoom,lampGlow,cityLife;
    const SHADOW_SIZE=2048;
    const streetLights=[],buildingModels=[],signs=new Map(),gpuStats={triangles:0,drawCalls:0};
    function signNames(){return [...places.map(p=>p.name),'Golden Gate Park','The Panhandle','Presidio','Mazarine Coffee','City Lights','FERRY BUILDING','CHINATOWN','de Young','Conservatory','Academy of Sciences','Crissy Field','TAX AUTHORITY','California high-speed rail','SPACEX · 1 COIN','PROMETHEUS','Fire is for everyone.','PENINSULA CAFE','GONDOLA','SKIS · 1 COIN','SF ZOO','TIGER','UCSF HOSPITAL',...RESTAURANTS.map(r=>r.name)];}
    function initGPU(){
        const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;};
        program=gl.createProgram();
        gl.attachShader(program,compile(gl.VERTEX_SHADER,`attribute vec3 aPosition,aNormal,aColor;attribute vec2 aUV;uniform mat4 uVP,uLightVP;uniform vec3 uEye;varying vec3 vColor,vWorld,vNormal;varying vec2 vUV;varying vec4 vShadow;varying float vDistance;void main(){float light=.69+.31*max(dot(normalize(aNormal),normalize(vec3(-.5,.9,.35))),0.);bool room=abs(aUV.x+1.05)<.025;bool emissive=aUV.x> -1.3&&aUV.x< -1.1;vColor=aColor*mix(light,room?.9:.97,room?1.:emissive?clamp(aUV.y,0.,1.):0.);vUV=aUV;vWorld=aPosition;vNormal=aNormal;vDistance=distance(aPosition,uEye);vShadow=uLightVP*vec4(aPosition,1.);gl_Position=uVP*vec4(aPosition,1.);}`));
        const precision=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT).precision?'highp':'mediump',glassStyle=-2-MATERIAL_IDS.glass;
        gl.attachShader(program,compile(gl.FRAGMENT_SHADER,`precision ${precision} float;uniform sampler2D uAtlas,uMaterials,uShadowMap,uAlpineSnow,uAlpineGroom,uAlpineRock,uAlpineForest;uniform float uShadows,uTime;uniform vec3 uEye,uFocus;varying vec3 vColor,vWorld,vNormal;varying vec2 vUV;varying vec4 vShadow;varying float vDistance;${ALPINE_TEXTURE_GLSL}void main(){vec3 col=vColor;
            ${SALESFORCE_CROWN_GLSL}
            if(vUV.x> -1.9&&vUV.x< -1.5){
                float lake=step(1.5,vUV.y),depth=clamp(vUV.y,0.,1.),time=uTime*(1.-lake*.65);
                float a=vWorld.x*1.6+vWorld.z*.83-time*.65+sin(vWorld.z*.31)*.7,b=vWorld.x*.6-vWorld.z*2.1+time*.45+sin(vWorld.x*.22)*.8,c=vWorld.x*4.2+vWorld.z*3.7+time*.18;
                vec3 n=normalize(vec3(-cos(a)*.064-cos(b)*.024,1.,-cos(a)*.033+cos(b)*.084));
                vec3 view=normalize(uEye-vWorld);float fresnel=pow(1.-max(dot(n,view),0.),3.);
                vec3 deep=mix(vec3(.14,.33,.42),vec3(.19,.39,.44),smoothstep(20.,60.,vWorld.x));
                col=mix(vec3(.32,.55,.54),deep,depth);col=mix(col,vec3(.28,.43,.4),lake*.55);
                col=mix(col,vec3(.57,.7,.72),fresnel*.6)+(sin(a)+sin(b)*.45+sin(c)*.12)*.018;
                float shine=pow(max(dot(reflect(-normalize(vec3(-.5,.9,.35)),n),view),0.),48.);col+=vec3(.69,.76,.7)*shine*.32;
                float surf=(1.-smoothstep(.025,.23,depth))*(.5+.5*sin(time*1.1+vWorld.x*.9+vWorld.z*.6-depth*24.));col+=vec3(.22,.25,.22)*surf;
                vec3 p=vShadow.xyz/vShadow.w*.5+.5;float shadow=0.;if(uShadows>.5&&p.x>0.&&p.x<1.&&p.y>0.&&p.y<1.){for(int x=0;x<2;x++){for(int y=0;y<2;y++){vec2 o=(vec2(float(x),float(y))-.5)*1.5/2048.;shadow+=p.z-.0007>texture2D(uShadowMap,p.xy+o).r?.25:0.;}}}col*=1.-shadow*.1;
                float fog=smoothstep(50.,150.,length(uEye-vWorld));gl_FragColor=vec4(mix(col,vec3(.59,.72,.74),fog*.7),1.);return;
            }
            bool envelope=abs(vUV.x+1.)<.025&&vUV.y< -7.;
            if(envelope){vec3 sight=normalize(uEye-uFocus),delta=vWorld-uFocus;float along=dot(delta,sight),radius=length(delta-sight*along);if(along>0.&&radius<1.15){float opacity=smoothstep(.98,1.06,radius),pattern=fract(dot(mod(floor(gl_FragCoord.xy),4.),vec2(.25,.5625)));if(pattern>=opacity)discard;}}
            if(vUV.x>=0.)col*=texture2D(uAtlas,vUV).rgb;
            ${SNOW_SURFACE_GLSL}
            else if(vUV.x< -1.5||envelope){float kind=envelope?${MATERIAL_IDS.stucco}.:-vUV.x-2.;vec3 n=abs(vNormal);vec2 plane=n.y>.65?vWorld.xz:n.x>n.z?vec2(vWorld.z,-vWorld.y):vec2(vWorld.x,-vWorld.y);if(!envelope&&n.y>.65&&abs(vUV.y)>.001){float c=cos(vUV.y),s=sin(vUV.y);plane=vec2(vWorld.x*c+vWorld.z*s,-vWorld.x*s+vWorld.z*c);}vec2 cell=vec2(mod(kind,${MATERIAL_ATLAS.columns}.),floor(kind/${MATERIAL_ATLAS.columns}.));vec2 uv=fract(plane);col*=texture2D(uMaterials,(cell+vec2(.008)+uv*.984)/vec2(${MATERIAL_ATLAS.columns}.,${MATERIAL_ATLAS.rows}.)).rgb*1.08;}
            if(abs(vUV.x-(${glassStyle}.))<.5){float f=pow(1.-abs(dot(normalize(vNormal),normalize(uEye-vWorld))),3.);col=mix(col,vec3(.52,.64,.66),.12+f*.3);}
            vec3 p=vShadow.xyz/vShadow.w*.5+.5;float shade=0.;if(uShadows>.5&&p.x>0.&&p.x<1.&&p.y>0.&&p.y<1.){for(int x=0;x<3;x++){for(int y=0;y<3;y++){vec2 o=(vec2(float(x),float(y))-1.)/2048.;shade+=p.z-.0006>texture2D(uShadowMap,p.xy+o).r?.111111:0.;}}}col*=1.-shade*.23;
            if(abs(vUV.x+1.05)<.025){float ambient=clamp(vUV.y,0.,1.),f=pow(1.-abs(dot(normalize(vNormal),normalize(uEye-vWorld))),3.);col=mix(vColor*.89,vColor*vec3(1.03,1.,.96)+vec3(.11,.085,.045),ambient);col+=vec3(.12,.17,.18)*f*.16;}
            bool emissive=vUV.x> -1.3&&vUV.x< -1.1;
            if(emissive){float facing=abs(dot(normalize(vNormal),normalize(uEye-vWorld)));vec3 lit=mix(vColor*vec3(1.,.94,.84),vec3(1.,.98,.87),pow(facing,2.)*.62);col=mix(col,lit,clamp(vUV.y,0.,1.));}
            else if(vUV.x> -1.5&&vUV.x< -1.3){vec3 halfVector=normalize(normalize(uEye-vWorld)+normalize(vec3(-.5,.9,.35)));float shine=pow(max(dot(normalize(vNormal),halfVector),0.),44.);col+=vec3(.98,.93,.78)*shine*vUV.y*(1.-shade*.7);}
            float luminance=dot(col,vec3(.2126,.7152,.0722));col=mix(vec3(luminance),col,1.12);float fog=smoothstep(50.,115.,vDistance);gl_FragColor=vec4(mix(col,vec3(.59,.72,.74),fog*.7),1.);}`));
        gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
        program.position=gl.getAttribLocation(program,'aPosition');program.normal=gl.getAttribLocation(program,'aNormal');program.color=gl.getAttribLocation(program,'aColor');program.uv=gl.getAttribLocation(program,'aUV');program.vp=gl.getUniformLocation(program,'uVP');program.eye=gl.getUniformLocation(program,'uEye');program.focus=gl.getUniformLocation(program,'uFocus');program.light=gl.getUniformLocation(program,'uLightVP');program.shadows=gl.getUniformLocation(program,'uShadows');program.time=gl.getUniformLocation(program,'uTime');gl.uniform1i(gl.getUniformLocation(program,'uAtlas'),0);gl.uniform1i(gl.getUniformLocation(program,'uShadowMap'),1);gl.uniform1i(gl.getUniformLocation(program,'uMaterials'),2);for(const [i,name] of ['uAlpineSnow','uAlpineGroom','uAlpineRock','uAlpineForest'].entries())gl.uniform1i(gl.getUniformLocation(program,name),3+i);
        gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(.56,.7,.73,1);
        const names=signNames();
        atlasTexture=createSignTexture(gl,names,signs,{preserveCase:[...RESTAURANTS.map(r=>r.name),'California high-speed rail']});
        materialState=createMaterialTexture(gl);materialTexture=materialState.texture;alpineState=createAlpineTexture(gl);alpineTextures=alpineState.textures;dynamicGPU={buffer:gl.createBuffer(),count:0};initShadows(compile);lampGlow=createLampGlow(gl);
        if(built){lampGlow.setLights(streetLights,terrainHeight);gpuStats.triangles+=lampGlow.stats.triangles;}
    }
    function upload(mesh){const data=new Float32Array(mesh.data);if(headless){mesh.data=data;return {count:data.length/11};}const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);mesh.data=data;gpuStats.triangles+=data.length/33;return {buffer,count:data.length/11};}
    function drawGPU(gpu,start=0,count=gpu.count){if(!count)return;gl.bindBuffer(gl.ARRAY_BUFFER,gpu.buffer);for(const [location,size,offset] of [[program.position,3,0],[program.normal,3,12],[program.color,3,24],[program.uv,2,36]]){if(location>=0){gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,size,gl.FLOAT,false,44,offset);}}gl.drawArrays(gl.TRIANGLES,start,count);gpuStats.drawCalls++;}
    function initShadows(compile){
        const eye=[-20*MAP_SCALE,90,70*MAP_SCALE],target=[N/2,0,N/2],b=unit(sub(eye,target)),r=unit(cross([0,1,0],b)),u=cross(b,r);
        const view=new Float32Array([r[0],u[0],b[0],0,r[1],u[1],b[1],0,r[2],u[2],b[2],0,-dot(r,eye),-dot(u,eye),-dot(b,eye),1]),ortho=new Float32Array([1/(55*MAP_SCALE),0,0,0,0,1/(55*MAP_SCALE),0,0,0,0,-2/199,0,0,0,-201/199,1]);shadowMatrix=matrixMultiply(ortho,view);shadowRoom=undefined;
        gl.activeTexture(gl.TEXTURE1);shadowTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,shadowTexture);
        if(!gl.getExtension('WEBGL_depth_texture')){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));shadowFramebuffer=null;}
        else{
            gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT,SHADOW_SIZE,SHADOW_SIZE,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_SHORT,null);
            shadowFramebuffer=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFramebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,shadowTexture,0);
            const color=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,color);gl.renderbufferStorage(gl.RENDERBUFFER,gl.RGBA4,SHADOW_SIZE,SHADOW_SIZE);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.RENDERBUFFER,color);
            if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)shadowFramebuffer=null;
        }
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.activeTexture(gl.TEXTURE0);
        shadowProgram=gl.createProgram();gl.attachShader(shadowProgram,compile(gl.VERTEX_SHADER,'attribute vec3 aPosition;uniform mat4 uVP;void main(){gl_Position=uVP*vec4(aPosition,1.);}'));gl.attachShader(shadowProgram,compile(gl.FRAGMENT_SHADER,'precision mediump float;void main(){gl_FragColor=vec4(1.);}'));gl.linkProgram(shadowProgram);
        Object.assign(shadowProgram,{position:gl.getAttribLocation(shadowProgram,'aPosition'),normal:-1,color:-1,uv:-1,vp:gl.getUniformLocation(shadowProgram,'uVP')});
    }
    function drawBuildings(){for(const o of buildingModels){o.cutaway=o.place===currentInterior;o.hiddenWalls=o.cutaway?cutawayWallMask(o,camera.eye):0;drawGPU(o.gpu,o.permanent.start,o.permanent.count);for(const wall of o.walls)if(!o.cutaway||!(o.hiddenWalls&(1<<wall.side)))drawGPU(o.gpu,wall.start,wall.count);if(!o.cutaway)drawGPU(o.gpu,o.roof.start,o.roof.count);drawGPU(o.gpu,o.extras.start,o.extras.count);}}
    function renderShadows(){
        const key=currentInterior?currentInterior.id+':'+cutawayWallMask(currentInterior,camera.eye):'outside';if(!shadowFramebuffer||shadowRoom===key)return;shadowRoom=key;
        const main=program;program=shadowProgram;gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFramebuffer);gl.viewport(0,0,SHADOW_SIZE,SHADOW_SIZE);gl.clear(gl.DEPTH_BUFFER_BIT|gl.COLOR_BUFFER_BIT);gl.useProgram(program);gl.uniformMatrix4fv(program.vp,false,shadowMatrix);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,1);drawGPU(groundGPU);drawGPU(sceneGPU);drawBuildings();gl.disable(gl.POLYGON_OFFSET_FILL);gl.bindFramebuffer(gl.FRAMEBUFFER,null);program=main;
    }
    function updateCamera(){
        const angle=Math.PI/4+camera.yaw,sa=Math.sin(angle),ca=Math.cos(angle),sp=Math.sin(camera.pitch),cp=Math.cos(camera.pitch),distance=27/zoom;
        camera.right=[ca,0,-sa];camera.up=[-sa*sp,cp,-ca*sp];camera.back=[sa*cp,sp,ca*cp];camera.target=[player.x+.5,playerGround()+.9,player.y+.5];camera.eye=camera.target.map((v,i)=>v+camera.back[i]*distance);
        let focalScale=1;
        if(nearTahoe(player.x+.5,player.y+.5,360)){
            const fit=fitTahoeCamera(camera.target,camera.back,distance,camera.terrainRise||0);camera.terrainRise=fit.rise;camera.eye=fit.eye;focalScale=fit.focalScale;
            camera.back=unit(sub(camera.eye,camera.target));camera.right=unit([camera.back[2],0,-camera.back[0]]);camera.up=cross(camera.back,camera.right);
        }else camera.terrainRise=0;
        const r=camera.right,u=camera.up,b=camera.back,e=camera.eye,view=new Float32Array([r[0],u[0],b[0],0,r[1],u[1],b[1],0,r[2],u[2],b[2],0,-dot(r,e),-dot(u,e),-dot(b,e),1]);
        camera.tan=Math.tan(Math.PI*34/360)*focalScale;const f=1/camera.tan,near=.15,far=850,proj=new Float32Array([f/(width/height),0,0,0,0,f,0,0,0,0,-(far+near)/(far-near),-1,0,0,-2*far*near/(far-near),0]);camera.matrix=matrixMultiply(proj,view);
    }
    function project(x,y,z){const p=[x,y,z,1],m=camera.matrix,v=[0,0,0,0];for(let r=0;r<4;r++)for(let c=0;c<4;c++)v[r]+=m[c*4+r]*p[c];return {x:(v[0]/v[3]+1)*width/2,y:(1-v[1]/v[3])*height/2,depth:v[2]/v[3],distance:v[3]};}
    function setCamera(yaw=camera.yaw,pitch=camera.pitch){camera.yaw=Math.atan2(Math.sin(yaw),Math.cos(yaw));camera.pitch=Math.max(Math.PI*24/180,Math.min(Math.PI*65/180,pitch));camera.cos=Math.cos(camera.yaw);camera.sin=Math.sin(camera.yaw);camera.version++;hovered=null;$('sf-hover').hidden=true;updateCamera();drawMini();}
    function setZoom(value){zoom=Math.max(.55,Math.min(1.65,value));const slider=$('sf-zoom-slider');slider.value=String(Math.round(zoom*100));slider.setAttribute('aria-valuetext',Math.round(zoom*100)+'% zoom');updateCamera();}
    function resize(){width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,1.5);for(const c of [canvas]){c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);c.style.width=width+'px';c.style.height=height+'px';}if(width<600&&zoom===1)setZoom(.8);closeMenu();updateCamera();if(active&&built)render(performance.now(),0);}
    let heights=null,naturalHeights=null;
    function rawHeight(x,z){
        const land=insidePolygon(x,z,COAST);
        let coast=Infinity;for(let i=1;i<COAST.length;i++)coast=Math.min(coast,distanceToSegment(x,z,COAST[i-1],COAST[i]));
        if(!land)return coast<.6?.35:-.65;
        // Relief scales independently of map size; fade it into the shoreline.
        const shoulder=1.8+1.4*Math.exp(-(((x-72)/14)**2+((z-24)/12)**2)),shore=Math.min(1,coast/shoulder),grade=shore*shore*(3-2*shore);
        let y=.35+(sfElevation(x/MAP_SCALE,z/MAP_SCALE)-.35)*grade;
        for(const lake of lakes){const d=((x-lake.x)/lake.rx)**2+((z-lake.z)/lake.rz)**2;if(d<1.15)y=Math.min(y,lake.level-.3*Math.min(1,(1.15-d)*5));}
        return y;
    }
    const lakes=[];
    function buildHeightField(){
        for(const [x,z,rx,rz] of [[POND.x,POND.y,POND.rx,POND.ry],[PALACE_LAGOON.x,PALACE_LAGOON.y,PALACE_LAGOON.rx,PALACE_LAGOON.ry],[16,56,1.7,2.7].map(mapPosition),[18.5,58.3,1.7,2.2].map(mapPosition)])lakes.push({x,z,rx,rz,level:rawHeight(x,z)+.015});
        // Merced's connected lobes share one surface instead of overlapping discs.
        lakes[2].level=lakes[3].level=Math.min(lakes[2].level,lakes[3].level);
        heights=Array.from({length:TERRAIN_GRID+1},(_,z)=>Array.from({length:TERRAIN_GRID+1},(_,x)=>rawHeight(x/TERRAIN_RES,z/TERRAIN_RES)));
        // Ease the road into the peninsula's level ground, without an elevated
        // walkway or a height discontinuity at the edge of the city grid.
        for(let z=(N-2)*TERRAIN_RES;z<=TERRAIN_GRID;z++)for(let x=0;x<=TERRAIN_GRID;x++){
            const distance=airportRoadDistance(x/TERRAIN_RES,z/TERRAIN_RES);
            if(distance>TILE_CONFIG.curbWidth+.6)continue;
            const t=(z/TERRAIN_RES-(N-2))/2,collar=Math.max(0,Math.min(1,(distance-TILE_CONFIG.curbWidth)/.6)),weight=t*t*(3-2*t)*(1-collar*collar*(3-2*collar));
            heights[z][x]+=(AIRSHIP_TERMINAL.base-heights[z][x])*weight;
        }
        naturalHeights=heights.map(row=>row.slice());
    }
    function terrainHeight(x,z){return sampleTerrain(heights,x,z);}
    function airportSurfaceHeight(x,z){return southernTerrain?.contains(x,z)?southernTerrain.height(x,z):AIRSHIP_TERMINAL.base;}
    function airportWalkingHeight(x,z){return airportSurfaceHeight(x,z)+(onAirportApron(x,z)?.03:(TILE_TYPES[airportSurfaceTypeAt(x,z)]?.height||0)+.008);}
    function characterGround(x,z){
        const road=regionalRoad?.at(x,z);if(road)return road.height+.015;
        if(tahoe.contains(x,z))return tahoeHeight(x,z)+.04;
        if(z>=N&&airship.contains(x,z))return airportWalkingHeight(x,z);
        const type=surfaceTypeAt(x,z);
        if(type==='building'){
            const room=placeAt(x-.5,z-.5);
            if(room){const [u,v]=buildingPoint(room,x,z,true),rug=u>room.x+.6&&u<room.x+room.w-.6&&v>room.y+.5&&v<room.y+room.d-.5;return room.object.base+(rug?.09:.035);}
        }
        return terrainHeight(x,z)+(TILE_TYPES[type]?.height||0)+.008;
    }
    function playerGround(){
        if(chase?.state.jailed)return detention.base+.18;
        if(rocket.state.active)return rocket.state.position.y;
        if(tahoe.state.mode!=='ground')return tahoe.state.position.y;
        if(rope.climbing)return rope.state.position.y;
        if(sutroClimb.state.active)return sutroClimb.state.position.y;
        if(flying())return airship.state.position.y;
        if(surf.state.riding)return .06+(surf.state.jump?.height||0);
        const x=player.x+.5,z=player.y+.5,road=regionalRoad?.at(x,z);if(road)return road.height+.015;
        if(tahoe.contains(x,z))return tahoeHeight(x,z);
        if(z>=N&&airship.contains(x,z))return airportWalkingHeight(x,z);
        return terrainHeight(x,z);
    }
    function naturalHeight(x,z){return southernTerrain?.contains(x,z)?southernTerrain.naturalHeight(x,z):sampleTerrain(naturalHeights,x,z);}
    function cutHousePlot(pad){cutBuildingPlot(heights,TERRAIN_RES,pad);if(southernTerrain&&pad.cz+Math.hypot(pad.w,pad.d)/2>=N)southernTerrain.cutPlot(pad);}
    function sampleTerrain(field,x,z){
        if(!field)return 1.15;
        if(x<0||z<0||x>=N||z>=N)return southernTerrain?.contains(x,z)?southernTerrain.height(x,z):inRailPit(x,z)?RAIL_PIT.floor:z>=SOUTHERN_BOUNDS.north&&z<=SOUTHERN_BOUNDS.south&&x>=SOUTHERN_BOUNDS.west&&x<=SOUTHERN_BOUNDS.east?1.15:regionalGroundHeight(x,z);
        const ix=Math.floor(x*TERRAIN_RES),iz=Math.floor(z*TERRAIN_RES),u=x*TERRAIN_RES-ix,v=z*TERRAIN_RES-iz,a=field[iz][ix],b=field[iz][ix+1],c=field[iz+1][ix+1],d=field[iz+1][ix];return u>=v?a+(b-a)*u+(c-b)*v:a+(c-d)*u+(d-a)*v;
    }
    const terrainPads=[];
    function levelTerrainPad(cx,cz,w,d,angle=0,height=terrainHeight(cx,cz)){
        const pad={cx,cz,w,d,angle,height};
        const result=levelHeightField(heights,TERRAIN_RES,pad);terrainPads.push({...pad,...result});
        return height;
    }
    function groundPoint(x,z,offset=.025){return [x,terrainHeight(x,z)+offset,z];}
    function surfacePolygon(m,points,color,offset){
        const xs=points.map(p=>p[0]),zs=points.map(p=>p[1]);
        const clip=(polygon,a,b)=>{const out=[],side=p=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);for(let i=0;i<polygon.length;i++){const p=polygon[i],q=polygon[(i+1)%polygon.length],dp=side(p),dq=side(q);if(dp>=-1e-9)out.push(p);if((dp>=0)!==(dq>=0)){const t=dp/(dp-dq);out.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}}return out;};
        for(let iz=Math.floor(Math.min(...zs)*TERRAIN_RES);iz<=Math.floor(Math.max(...zs)*TERRAIN_RES);iz++)for(let ix=Math.floor(Math.min(...xs)*TERRAIN_RES);ix<=Math.floor(Math.max(...xs)*TERRAIN_RES);ix++)for(const tri of [[[ix/TERRAIN_RES,iz/TERRAIN_RES],[(ix+1)/TERRAIN_RES,iz/TERRAIN_RES],[(ix+1)/TERRAIN_RES,(iz+1)/TERRAIN_RES]],[[ix/TERRAIN_RES,iz/TERRAIN_RES],[(ix+1)/TERRAIN_RES,(iz+1)/TERRAIN_RES],[ix/TERRAIN_RES,(iz+1)/TERRAIN_RES]]]){
            let polygon=points;for(let i=0;i<3&&polygon.length;i++)polygon=clip(polygon,tri[i],tri[(i+1)%3]);
            if(polygon.length<3)continue;const cx=polygon.reduce((v,p)=>v+p[0],0)/polygon.length,cz=polygon.reduce((v,p)=>v+p[1],0)/polygon.length;if(!insidePolygon(cx,cz,COAST))continue;
            for(let i=1;i<polygon.length-1;i++)m.tri(groundPoint(...polygon[0],offset),groundPoint(...polygon[i+1],offset),groundPoint(...polygon[i],offset),color);
        }
    }
    function terrainRect(m,x,z,w,d,color,offset=.035){surfacePolygon(m,[[x,z],[x+w,z],[x+w,z+d],[x,z+d]],color,offset);}
    function terrainStrip(m,points,w,color,offset=.04){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),nx=-dz/len*w,nz=dx/len*w;surfacePolygon(m,[[a[0]-nx,a[1]-nz],[b[0]-nx,b[1]-nz],[b[0]+nx,b[1]+nz],[a[0]+nx,a[1]+nz]],color,offset);}}
    function renderSurfaceTiles(m){
        const map=worldTiles;
        for(let z=0;z<map.size;z++)for(let x=0;x<map.size;x++){
            const t=map.tiles[z*map.size+x],wx=x*map.step,wz=z*map.step;if(t.type==='sea')continue;
            const stride=map.size+1,corners=[[0,0],[1,0],[1,1],[0,1]],polygon=t.type==='sidewalk'?corners.map(p=>{const k=(z+p[1])*stride+x+p[0],r=map.road[k],q=map.path[k];return [...p,r,q,Math.min(r,q)];}):corners,patches=t.patches||[{type:t.type,polygon}];
            for(const patch of patches){
                // Ocean fragments are covered by the continuous offshore surface.
                // Lakes use their shared level, never the terrain below the water.
                if(patch.type==='sea')continue;
                const material=TILE_TYPES[patch.type],wet=patch.type==='water',level=patch.level??t.waterLevel;
                const shade=patch.type==='grass'?Math.floor(rand(Math.floor(wx),Math.floor(wz))*5)-2:0,color=shade?tint(material.color,shade):material.color;
                const points=patch.polygon.map(p=>wet?[wx+p[0]*map.step,level,wz+p[1]*map.step]:groundPoint(wx+p[0]*map.step,wz+p[1]*map.step,material.height));
                for(let i=1;i<points.length-1;i++)m.tri(points[0],points[i+1],points[i],color,wet?{water:2}:material.texture?{material:material.texture,angle:t.frame||0}:null);
                if(patch.type==='sidewalk')for(let i=0;i<patch.polygon.length;i++){const a=patch.polygon[i],b=patch.polygon[(i+1)%patch.polygon.length],roadEdge=(Math.abs(a[2])<1e-6&&Math.abs(b[2])<1e-6)||(Math.abs(a[3])<1e-6&&Math.abs(b[3])<1e-6),outer=Math.abs(a[4]-TILE_CONFIG.curbWidth)<1e-6&&Math.abs(b[4]-TILE_CONFIG.curbWidth)<1e-6;if(!roadEdge&&!outer)continue;const bottom=roadEdge?TILE_TYPES.road.height:TILE_TYPES[t.base].height,ax=wx+a[0]*map.step,az=wz+a[1]*map.step,bx=wx+b[0]*map.step,bz=wz+b[1]*map.step;m.quad(groundPoint(ax,az,bottom),groundPoint(bx,bz,bottom),groundPoint(bx,bz,material.height),groundPoint(ax,az,material.height),'#aaa58f');}
            }
        }
    }
    function makeTerrain(){
        const m=new Mesh();
        renderSurfaceTiles(m);
        southernTerrain.drawLand(m);
        const marinHeight=(wx,wz)=>detention.terrain(wx,wz);
        // Clip boundary cells to the actual headland polygon, keeping the shore
        // continuous rather than exposing a checkerboard of whole terrain cells.
        // Distant northern ridges use a coarse mesh; the visible headlands keep
        // finer contours without a rectangular land edge behind them.
        for(let z=mapPosition(-65);z<mapPosition(3.2);){const step=z<mapPosition(-22)?2.4:.6;
        for(let x=mapPosition(-20);x<mapPosition(65);x+=step){
            const points=[],insideCell=p=>p[0]>=x-1e-8&&p[0]<=x+step+1e-8&&p[1]>=z-1e-8&&p[1]<=z+step+1e-8;
            for(const p of [[x,z],[x+step,z],[x+step,z+step],[x,z+step]])if(insidePolygon(...p,MARIN))points.push(p);
            // Match the fine row's vertices at the terrain LOD seam.
            if(step>1&&z+step>=mapPosition(-22))for(let dx=.6;dx<step-.01;dx+=.6){const p=[x+dx,z+step];if(insidePolygon(...p,MARIN))points.push(p);}
            for(let i=0;i<MARIN.length;i++){const a=MARIN[i],b=MARIN[(i+1)%MARIN.length],dx=b[0]-a[0],dz=b[1]-a[1];if(insideCell(a))points.push(a);for(const xx of [x,x+step])if(Math.abs(dx)>1e-9){const t=(xx-a[0])/dx,p=[xx,a[1]+dz*t];if(t>=0&&t<=1&&insideCell(p))points.push(p);}for(const zz of [z,z+step])if(Math.abs(dz)>1e-9){const t=(zz-a[1])/dz,p=[a[0]+dx*t,zz];if(t>=0&&t<=1&&insideCell(p))points.push(p);}}
            const unique=[...new Map(points.map(p=>[p.map(v=>v.toFixed(6)).join(','),p])).values()];if(unique.length<3)continue;const center=unique.reduce((a,p)=>[a[0]+p[0]/unique.length,a[1]+p[1]/unique.length],[0,0]);unique.sort((a,b)=>Math.atan2(a[1]-center[1],a[0]-center[0])-Math.atan2(b[1]-center[1],b[0]-center[0]));
            for(let i=0;i<unique.length;i++){const a=unique[i],b=unique[(i+1)%unique.length];const start=m.data.length,h=marinHeight(...center),slope=Math.hypot(marinHeight(center[0]+.2,center[1])-h,marinHeight(center[0],center[1]+.2)-h)/.2;m.tri([center[0],h,center[1]],[b[0],marinHeight(...b),b[1]],[a[0],marinHeight(...a),a[1]],'#899775','grass');for(let v=start;v<m.data.length;v+=11){const x=m.data[v],z=m.data[v+2],n=unit([-(marinHeight(x+.1,z)-marinHeight(x-.1,z))/.2,1,-(marinHeight(x,z+.1)-marinHeight(x,z-.1))/.2]),dry=.5+.3*Math.sin(x*.28+z*.11)+.2*Math.sin(z*.57-x*.19),rock=Math.min(.65,Math.max(0,slope-.6)*.5),grass=[.46+dry*.13,.53+dry*.065,.36+dry*.07];for(let k=0;k<3;k++){m.data[v+3+k]=n[k];m.data[v+6+k]=grass[k]*(1-rock)+[.62,.60,.49][k]*rock;}}}
        }
        z+=step;}
        for(const [p,q] of shorelineSegments(COAST,1/TERRAIN_RES))m.quad([p[0],-.25,p[1]],[q[0],-.25,q[1]],[q[0],terrainHeight(...q)+.02,q[1]],[p[0],terrainHeight(...p)+.02,p[1]],'#9c9d87','stone');
        seaBounds=createSeaSurface(m,[{polygon:COAST,width:2.8},{polygon:MARIN,width:2.2}]);decorateHeadlands(m,MARIN,MAP_SCALE);
        // Rails are details contained inside Market Street's merged road surface.
        for(const shift of [-.18,.18]){const p=market.route||market.points,rail=p.map((v,i)=>{const a=p[Math.max(0,i-1)],b=p[Math.min(p.length-1,i+1)],len=Math.hypot(b[0]-a[0],b[1]-a[1])||1;return [v[0]-(b[1]-a[1])/len*shift,v[1]+(b[0]-a[0])/len*shift];});terrainStrip(m,rail,.018,'#424e49',.028);}
        detailedGround(m);

        groundMesh=m;groundGPU=upload(m);
    }
    const cityParcels=[],publicSpaces=[],parcelBins=new Map();
    const rectangle=(cx,cz,w,d,angle=0)=>[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([x,z])=>[cx+x*Math.cos(angle)-z*Math.sin(angle),cz+x*Math.sin(angle)+z*Math.cos(angle)]);
    const polygonBounds=p=>({x:Math.min(...p.map(v=>v[0])),z:Math.min(...p.map(v=>v[1])),right:Math.max(...p.map(v=>v[0])),bottom:Math.max(...p.map(v=>v[1]))});
    const objectFootprint=o=>o.footprint||rectangle(o.x+o.w/2,o.y+o.d/2,o.w,o.d);
    function parcelNeighbors(poly){const b=polygonBounds(poly),found=new Set();for(let z=Math.floor(b.z/3);z<=Math.floor(b.bottom/3);z++)for(let x=Math.floor(b.x/3);x<=Math.floor(b.right/3);x++)for(const p of parcelBins.get(x+','+z)||[])found.add(p);return found;}
    function claimParcel(p){cityParcels.push(p);const b=polygonBounds(p.polygon);for(let z=Math.floor(b.z/3);z<=Math.floor(b.bottom/3);z++)for(let x=Math.floor(b.x/3);x<=Math.floor(b.right/3);x++){const key=x+','+z;if(!parcelBins.has(key))parcelBins.set(key,[]);parcelBins.get(key).push(p);}return p;}
    function parcelFits(poly,{park=false,ignore=null}={}){
        const b=polygonBounds(poly),m=worldTiles;if(b.x<0||b.z<0||b.right>N||b.bottom>N)return false;
        for(const p of parcelNeighbors(poly))if(p!==ignore&&tilePolygonOverlap(poly,p.polygon)>1e-6)return false;
        for(let z=Math.max(0,Math.floor(b.z/m.step));z<Math.min(m.size,Math.ceil(b.bottom/m.step));z++)for(let x=Math.max(0,Math.floor(b.x/m.step));x<Math.min(m.size,Math.ceil(b.right/m.step));x++){
            const wx=x*m.step,wz=z*m.step,t=m.tiles[z*m.size+x],cell=[[wx,wz],[wx+m.step,wz],[wx+m.step,wz+m.step],[wx,wz+m.step]];
            if(tilePolygonOverlap(poly,cell)<1e-7)continue;
            if(t.base==='sea'||t.base==='water'||!park&&greenArea(wx+m.step/2,wz+m.step/2))return false;
            if(!((t.areas.road||0)+(t.areas.path||0)+(t.areas.sidewalk||0)))continue;
            if(!t.patches)return false;
            for(const patch of t.patches)if(['road','path','sidewalk'].includes(patch.type)&&tilePolygonOverlap(poly,patch.polygon.map(v=>[wx+v[0]*m.step,wz+v[1]*m.step]))>1e-7)return false;
        }return true;
    }
    function moveObject(o,dx,dz){
        const dy=terrainHeight(o.x+o.w/2+dx,o.y+o.d/2+dz)-terrainHeight(o.x+o.w/2,o.y+o.d/2);
        for(let v=o.start*11;v<(o.start+o.count)*11;v+=11){o.mesh.data[v]+=dx;o.mesh.data[v+1]+=dy;o.mesh.data[v+2]+=dz;}
        o.x+=dx;o.y+=dz;o.base+=dy;for(const p of [o.lo,o.hi]){p[0]+=dx;p[1]+=dy;p[2]+=dz;}if(o.footprint)o.footprint=o.footprint.map(p=>[p[0]+dx,p[1]+dz]);
    }
    function fitLandmarksToBlocks(){
        const groups=new Map();for(const o of objects)if(o.arch||o.solid){const key=o.sight?.id||o;if(key==='nia')continue;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);}
        for(const [key,solid] of groups){
            const group=typeof key==='string'?objects.filter(o=>o.sight?.id===key):solid;let offset=null;
            if(group.some(o=>o.pinned)){for(const o of solid)claimParcel({polygon:objectFootprint(o),kind:'landmark',object:o});continue;}
            search:for(let r=0;r<=32;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){
                if(r&&Math.abs(dx)!==r&&Math.abs(dz)!==r)continue;
                if(key==='salesforce'&&solid.some(o=>marketSide((o.x+o.w/2+dx*.25)/MAP_SCALE,(o.y+o.d/2+dz*.25)/MAP_SCALE)<2.5))continue;
                if(solid.every(o=>parcelFits(objectFootprint(o).map(p=>[p[0]+dx*.25,p[1]+dz*.25]),{park:true}))){offset=[dx*.25,dz*.25];break search;}
            }
            if(!offset)throw new Error('No planned landmark site for '+(typeof key==='string'?key:'building'));
            for(const o of group)moveObject(o,...offset);
            for(const o of solid)if(o.arch!=='townhomes'&&!o.preserveGround)levelTerrainPad(o.x+o.w/2,o.y+o.d/2,o.w,o.d,o.rotation||0,o.base-(o.arch?.025:0));
            for(const o of solid)claimParcel({polygon:objectFootprint(o),kind:'landmark',object:o});
            if(key==='cityhall'){
                const hall=solid[0],forecourt=rectangle(hall.x+hall.w/2,hall.y+hall.d+.65,hall.w-.1,1.3);
                if(parcelFits(forecourt,{park:true})){publicSpaces.push(forecourt);claimParcel({polygon:forecourt,kind:'civic forecourt'});}
            }
            if(typeof key==='string'){const s=sightById(key);if(s){s.entry.x+=offset[0];s.entry.y+=offset[1];if(s.mapPoint){s.mapPoint.x+=offset[0];s.mapPoint.y+=offset[1];}}}
        }
    }
    function reserveBridgeApproach(){
        const a=DOWNTOWN.bridge.rampStart.map(mapPosition),b=DOWNTOWN.bridge.abutment.map(mapPosition),cx=(a[0]+b[0])/2,cz=(a[1]+b[1])/2,length=Math.hypot(b[0]-a[0],b[1]-a[1]);
        const polygon=rectangle(cx,cz,length+1,1.65,Math.atan2(b[1]-a[1],b[0]-a[0])),object=objects.find(o=>o.sight?.id==='baybridge');
        publicSpaces.push(polygon);claimParcel({polygon,kind:'bridge approach',object});
    }
    function buildingPoint(p,x,z,inverse=false){const a=(p.rotation||0)*(inverse?-1:1),cx=p.x+p.w/2,cz=p.y+p.d/2,dx=x-cx,dz=z-cz;return [cx+dx*Math.cos(a)-dz*Math.sin(a),cz+dx*Math.sin(a)+dz*Math.cos(a)];}
    function planContentBuildings(){
        for(const p of places){
            const target=[p.x+p.w/2,p.y+p.d/2];let best=null,score=Infinity;
            for(const r of worldTiles.routes)if(r.kind==='road'&&(p.id!=='links'||r.name==='Market Street')){
                const [a,b]=r.points,dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),ux=dx/length,uz=dz/length,at=Math.max(0,Math.min(length,(target[0]-a[0])*ux+(target[1]-a[1])*uz));
                for(const side of [-1,1])for(let step=-24;step<=24;step++){
                    const t=Math.max(p.w/2,Math.min(length-p.w/2,at+step*.25));if(length<p.w+.5)continue;
                    const nx=-uz*side,nz=ux*side,offset=r.halfWidth+TILE_CONFIG.curbWidth+.18+p.d/2,cx=a[0]+ux*t+nx*offset,cz=a[1]+uz*t+nz*offset,angle=Math.atan2(nx,-nz),poly=rectangle(cx,cz,p.w,p.d,angle),distance=(cx-target[0])**2+(cz-target[1])**2;
                    if(distance>=score||!parcelFits(poly))continue;score=distance;best={cx,cz,angle,poly};
                }
            }
            if(!best)throw new Error('No curb-facing site for '+p.name);
            p.x=best.cx-p.w/2;p.y=best.cz-p.d/2;p.rotation=best.angle;p.footprint=best.poly;p.localDoor=p.x+(p.w-1)/2;
            const inside=buildingPoint(p,p.x+p.w/2,p.y+p.d-.7),entry=buildingPoint(p,p.x+p.w/2,p.y+p.d+.65);
            p.inside={x:inside[0]-.5,y:inside[1]-.5};p.entry={x:entry[0]-.5,y:entry[1]-.5};
            claimParcel({polygon:best.poly,kind:'destination',place:p});
            // Doorways have short, deliberate public approaches, never vacant lots.
            const forecourt=rectangle(...buildingPoint(p,p.x+p.w/2,p.y+p.d+.3),1.2,.6,p.rotation);publicSpaces.push(forecourt);claimParcel({polygon:forecourt,kind:'entrance'});
            levelTerrainPad(best.cx,best.cz,p.w,p.d,p.rotation);
            makeBuilding(p,true);
        }
    }
    const restaurantDiners=[],restaurantSites=[];
    function planRestaurants(){
        for(const definition of RESTAURANTS){
            const target=definition.target.map(mapPosition),width=definition.w,depth=definition.d+definition.patioDepth;let best=null,score=Infinity;
            for(const r of worldTiles.routes)if(r.kind==='road'&&(definition.id!=='rich-table'||['Oak Street','Van Ness Avenue','Fell Street'].includes(r.name))){
                const [a,b]=r.points,dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),ux=dx/length,uz=dz/length;
                if(length<width+.4)continue;
                const at=Math.max(0,Math.min(length,(target[0]-a[0])*ux+(target[1]-a[1])*uz));
                for(const side of [-1,1])for(let step=-64;step<=64;step++){
                    const t=Math.max(width/2,Math.min(length-width/2,at+step*.125)),nx=-uz*side,nz=ux*side,offset=r.halfWidth+TILE_CONFIG.curbWidth+.18+depth/2;
                    const cx=a[0]+ux*t+nx*offset,cz=a[1]+uz*t+nz*offset,angle=Math.atan2(nx,-nz),polygon=rectangle(cx,cz,width,depth,angle),distance=(cx-target[0])**2+(cz-target[1])**2;
                    const bodyX=cx+nx*definition.patioDepth/2,bodyZ=cz+nz*definition.patioDepth/2;
                    if(definition.id==='rich-table'&&(bodyX<mapPosition(PANHANDLE.east+.25)||bodyZ<mapPosition(PANHANDLE.south)||bodyX>mapPosition(44)||bodyZ>mapPosition(37)||marketSide(bodyX/MAP_SCALE,bodyZ/MAP_SCALE)>=0))continue;
                    if(distance>=score||!parcelFits(polygon))continue;score=distance;best={cx,cz,nx,nz,angle,polygon,street:r.name};
                }
            }
            if(!best||score>144)throw new Error('No nearby curb-facing restaurant plot for '+definition.label);
            const cx=best.cx+best.nx*definition.patioDepth/2,cz=best.cz+best.nz*definition.patioDepth/2;
            const sight=sightById(definition.id),site={...definition,x:cx-definition.w/2,y:cz-definition.d/2,rotation:best.angle,footprint:rectangle(cx,cz,definition.w,definition.d,best.angle),sight,street:best.street};
            if(definition.id==='rich-table')site.localDoor=site.x+.14;
            const parcel=claimParcel({polygon:best.polygon,kind:'restaurant'});
            levelTerrainPad(best.cx,best.cz,width,depth,best.angle);
            site.object=makeBuilding(site);parcel.object=site.object;
            const patio=makeRestaurantPatio(site);sight.object=site.object;site.tables=patio.tables;restaurantDiners.push(...patio.diners);restaurantSites.push(site);
            const entry=restaurantPoint(site,definition.id==='rich-table'?-site.w/2+.38:0,site.d/2+site.patioDepth+.3);
            sight.x=cx-.5;sight.y=cz-.5;sight.entry={x:entry[0]-.5,y:entry[1]-.5};sight.mapPoint={x:cx,y:cz};sight.site=site;
        }
    }
    function protectLandmarkApproaches(){
        for(const s of sights)if(s.kind!=='bike'&&s.kind!=='guest'&&!s.approachReserved){
            s.approachReserved=true;const origin=[s.entry.x+.5,s.entry.y+.5];let nearest=null,best=Infinity;
            for(const r of worldTiles.routes){const [a,b]=r.points,dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((origin[0]-a[0])*dx+(origin[1]-a[1])*dz)/(dx*dx+dz*dz))),p=[a[0]+dx*t,a[1]+dz*t],d=Math.hypot(p[0]-origin[0],p[1]-origin[1]);if(d<best){best=d;nearest=p;}}
            if(!nearest||best>7)continue;const middle=[(origin[0]+nearest[0])/2,(origin[1]+nearest[1])/2],angle=Math.atan2(nearest[1]-origin[1],nearest[0]-origin[0]),poly=rectangle(...middle,best+1,1,angle);
            publicSpaces.push(poly);claimParcel({polygon:poly,kind:'public approach'});
        }
    }
    let cityNavigation=null;
    function navFree(x,z){return !!cityNavigation?.free(x-.5,z-.5);}
    function buildNavigation(){
        cityNavigation=buildTileNavigation(worldTiles,{obstacles:navigationObstacles(objects)});
        for(const p of places){p.inside=nearestNavigation(p.inside.x,p.inside.y,2,(x,y)=>placeAt(x,y)===p);p.entry=nearestNavigation(p.entry.x,p.entry.y,2);if(!p.inside||!p.entry)throw new Error('Blocked doorway: '+p.name);}
        const cafe=places.find(p=>p.id==='links');
        for(const s of sights)if(s.kind!=='bike'){const entry=nearestNavigation(s.entry.x,s.entry.y,4,(x,y)=>s.kind!=='guest'||placeAt(x,y)===cafe);if(entry)s.entry=entry;}
        const spawn=cafe.entry;camera.yaw=-cafe.rotation-Math.PI/4;camera.cos=Math.cos(camera.yaw);camera.sin=Math.sin(camera.yaw);player.x=spawn.x;player.y=spawn.y;bike.x=spawn.x+1;bike.y=spawn.y;
        const bikeSite=nearestNavigation(bike.x,bike.y,2);if(bikeSite){bike.x=bikeSite.x;bike.y=bikeSite.y;}
    }
    function nearestNavigation(x,y,radius=3,predicate=()=>true){return cityNavigation.nearest(x,y,radius,predicate);}
    function auditCityBlocks(){
        const map=worldTiles,missing=[];let eligible=0,backed=0,alignmentErrors=0;
        for(const p of cityParcels)if(p.kind==='housing'||p.kind==='shopfront'){
            const routes=map.routes.filter(r=>r.name===p.street),valid=routes.some(r=>{const [a,b]=r.points,angle=Math.atan2(b[1]-a[1],b[0]-a[0]);return Math.abs(Math.sin(p.rotation-angle))<1e-6;});if(!valid)alignmentErrors++;
        }
        for(const r of map.routes)if(r.kind==='road'){
            const [a,b]=r.points,length=Math.hypot(...sub2(b,a)),ux=(b[0]-a[0])/length,uz=(b[1]-a[1])/length;
            for(let t=.5;t<length;t+=.5)for(const side of [-1,1]){
                const nx=-uz*side,nz=ux*side,x=a[0]+ux*t+nx*(r.halfWidth+TILE_CONFIG.curbWidth+.15),z=a[1]+uz*t+nz*(r.halfWidth+TILE_CONFIG.curbWidth+.15),ix=Math.floor(x/map.step),iz=Math.floor(z/map.step),tile=map.tiles[iz*map.size+ix];
                if(!tile||['sea','water','grass','sand'].includes(tile.base)||(tile.areas.road||tile.areas.path||tile.areas.sidewalk)||publicSpaces.some(p=>insidePolygon(x,z,p)))continue;
                const nearby=[...parcelNeighbors(rectangle(x+nx*1.5,z+nz*1.5,6,6))].filter(p=>p.object||p.place);let hit=false,junction=false,landscape=false;
                for(let d=0;d<=3;d+=.125){const px=x+nx*d,pz=z+nz*d;if(nearby.some(p=>insidePolygon(px,pz,p.polygon))){hit=true;break;}if(d<1){const t=map.tiles[Math.floor(pz/map.step)*map.size+Math.floor(px/map.step)];if(t&&(t.areas.road||t.areas.path)){junction=true;break;}if(t&&['grass','sea','water','sand'].includes(t.base)){landscape=true;break;}}}
                if(junction||landscape)continue;eligible++;if(hit)backed++;else missing.push({street:r.name,x:+x.toFixed(2),z:+z.toFixed(2)});
            }
        }
        return {ok:alignmentErrors===0&&backed/eligible>=.9,eligible,backed,coverage:+(100*backed/eligible).toFixed(1),alignmentErrors,missing};
    }
    function balancedCurbDepth(r,t,side){
        const [a,b]=r.points,length=Math.hypot(...sub2(b,a)),ux=(b[0]-a[0])/length,uz=(b[1]-a[1])/length,nx=-uz*side,nz=ux*side,px=a[0]+ux*t,pz=a[1]+uz*t;let depth=3.25;
        for(const other of worldTiles.routes)if(other!==r&&other.kind==='road'){
            const [c,d]=other.points,len=Math.hypot(...sub2(d,c)),vx=(d[0]-c[0])/len,vz=(d[1]-c[1])/len;if(Math.abs(ux*vz-uz*vx)>1e-5)continue;
            const along=(px-c[0])*vx+(pz-c[1])*vz,gap=(c[0]-px)*nx+(c[1]-pz)*nz;if(along<-.1||along>len+.1||gap<1)continue;
            depth=Math.min(depth,(gap-r.halfWidth-other.halfWidth-2*TILE_CONFIG.curbWidth-.16)/2);
        }return Math.max(1.5,Math.floor(depth*4)/4);
    }
    function populateCity(){
        // Fill urban curbs in street order; Great Highway keeps an open
        // beachfront instead of a continuous row of houses.
        const rows=[];
        for(const r of worldTiles.routes)if(r.kind==='road'){
            if(r.name==='Great Highway')continue;
            const [a,b]=r.points,dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),ux=dx/length,uz=dz/length;
            for(const side of [-1,1]){
                const nx=-uz*side,nz=ux*side;
                const angle=Math.atan2(nx,-nz),curb=r.halfWidth+TILE_CONFIG.curbWidth+.08;let row=null,t=0;
                while(t<length-1){let found=null;const preferred=balancedCurbDepth(r,t+.75,side);
                    for(const width of [1.5,1.25]){for(const depth of [...new Set([preferred,Math.max(1.5,preferred-.5),1.5])]){
                        if(t+width>length)continue;const cx=a[0]+ux*(t+width/2)+nx*(curb+depth/2),cz=a[1]+uz*(t+width/2)+nz*(curb+depth/2),poly=rectangle(cx,cz,width,depth,angle);
                        if(parcelFits(poly)){found={cx,cz,width,depth,poly};break;}
                    }if(found)break;}
                    if(!found){row=null;t+=.25;continue;}
                    const parcel=claimParcel({polygon:found.poly,kind:'housing',street:r.name,rotation:angle});
                    if(row&&Math.abs(row.end-t)<1e-5&&row.depth===found.depth){row.end=t+found.width;row.parcels.push(parcel);}
                    else{row={a,ux,uz,nx,nz,angle,curb,start:t,end:t+found.width,depth:found.depth,parcels:[parcel]};rows.push(row);}
                    t+=found.width;
                }
            }
        }
        for(const r of rows){const width=r.end-r.start,cx=r.a[0]+r.ux*(r.start+width/2)+r.nx*(r.curb+r.depth/2),cz=r.a[1]+r.uz*(r.start+width/2)+r.nz*(r.curb+r.depth/2),o=makeTownhomeRow(cx-width/2,cz-r.depth/2,width,r.depth,2,rand(Math.round(cx),Math.round(cz),8),r.angle);for(const p of r.parcels)p.object=o;}
        // Close the short frontage gaps with shallow, single-story premises.
        for(const r of worldTiles.routes)if(r.kind==='road'){
            if(r.name==='Great Highway')continue;
            const [a,b]=r.points,length=Math.hypot(...sub2(b,a)),ux=(b[0]-a[0])/length,uz=(b[1]-a[1])/length;
            for(const side of [-1,1]){const nx=-uz*side,nz=ux*side;
                const angle=Math.atan2(nx,-nz),curb=r.halfWidth+TILE_CONFIG.curbWidth+.08;
                for(let t=0;t<length-.7;){let found=false;
                    for(const width of [1.25,1,.75,.5]){for(const depth of [1.5,1.25,1,.75]){
                        if(width*depth<.375||t+width>length)continue;const cx=a[0]+ux*(t+width/2)+nx*(curb+depth/2),cz=a[1]+uz*(t+width/2)+nz*(curb+depth/2),poly=rectangle(cx,cz,width,depth,angle);
                        if(!parcelFits(poly))continue;const o=makeCurbShop(cx,cz,width,depth,angle,rand(cx,cz,10));claimParcel({polygon:poly,kind:'shopfront',street:r.name,rotation:angle,object:o});t+=width;found=true;break;
                    }if(found)break;}if(!found)t+=.25;
                }
            }
        }
        protectLandmarkApproaches();
        let count=0;for(let z=mapTile(8);z<mapTile(62);z+=2)for(let x=mapTile(10);x<mapTile(55);x+=2){if(count>=Math.round(105*LAYOUT_SCALE**2)||!canPlaceScenery(x,z)||!greenArea(x+.5,z+.5)||roadDistance[z*N+x]<.85||rand(x,z,9)<.23||pondValue(x+.5,z+.5)<1.7||mercedValue(x+.5,z+.5)<1.5||palaceWater(x+.5,z+.5)<1.5)continue;tree(x,z,x<mapTile(30)&&z<mapTile(22)?count++%3!==0:count++%4===0?3:false);}
        for(const x of [11,14,17,23,26,29])for(const z of [29,34])if(mapCanPlace(x,z)&&pondValue(mapTile(x)+.5,mapTile(z)+.5)>1.5)mapTree(x,z,x%3===0);
        addPanhandleDetails();
        for(const [x,z] of [[21,12],[21,16],[29,18],[30,13]])if(mapCanPlace(x,z))mapTree(x,z,3);
        for(const z of [20,21])if(isWalkable(mapTile(50),mapTile(z))&&!pavingInArea(mapTile(50),mapTile(z)))mapTree(50,z,true);
        for(const [x,z] of [[17,32],[27,33],[35,28],[41,30],[25,15]])if(mapCanPlace(x,z))bench(mapTile(x),mapTile(z));

    }
    function surfaceTypeAt(x,z){
        const m=worldTiles,ix=Math.floor(x/m.step),iz=Math.floor(z/m.step);if(ix<0||iz<0||ix>=m.size||iz>=m.size)return 'sea';
        const tile=m.tiles[iz*m.size+ix];if(!tile.patches)return tile.type;
        return tile.patches.find(p=>insidePolygon(x/m.step-ix,z/m.step-iz,p.polygon))?.type||tile.base;
    }
    function placeStreetLights(){
        const names=['Market Street','Embarcadero','California Street','Powell Street','Van Ness Avenue','Geary Boulevard','Haight Street','Lincoln Way','JFK Promenade','Presidio Boulevard','Main Post walk','Crissy Field promenade'];
        const fixtures=[],m=worldTiles,cafe=places.find(p=>p.id==='links');
        const sidewalk=(x,z)=>{
            const ix=Math.floor(x/m.step),iz=Math.floor(z/m.step);if(ix<0||iz<0||ix>=m.size||iz>=m.size)return false;
            const tile=m.tiles[iz*m.size+ix];if(!tile.patches)return tile.type==='sidewalk';
            return tile.patches.some(p=>p.type==='sidewalk'&&insidePolygon(x/m.step-ix,z/m.step-iz,p.polygon));
        };
        for(const name of names)for(const r of m.routes.filter(r=>r.name===name)){
            const [a,b]=r.points,length=Math.hypot(b[0]-a[0],b[1]-a[1]),ux=(b[0]-a[0])/length,uz=(b[1]-a[1])/length;
            for(let t=1.6,i=0;t<length-1;t+=r.kind==='path'?5:6.2,i++){
                if(fixtures.length>=56)return;
                const side=i%2?1:-1,nx=-uz*side,nz=ux*side,offset=r.halfWidth+.125;
                let x=a[0]+ux*t+nx*offset,z=a[1]+uz*t+nz*offset;
                // Clear Mazarine's opening: one tile southwest along Market's
                // sidewalk. Place the mesh and its glow at the same new point.
                if(name==='Market Street'&&Math.hypot(x-cafe.entry.x-.5,z-cafe.entry.y-.5)<1.5){x+=ux;z+=uz;}
                if(![[0,0],[.075,0],[-.075,0],[0,.075],[0,-.075]].every(([dx,dz])=>sidewalk(x+dx,z+dz))||fixtures.some(p=>Math.hypot(p.x-x,p.z-z)<3.1))continue;
                const style=r.kind==='path'?2:r.name==='Market Street'?1:r.name==='Embarcadero'||r.name==='California Street'?0:i%3;
                const object=addScenery(null,x-.12,z-.12,.24,.24,2.8,(mesh,h)=>streetLights.push(...drawStreetLamp(mesh,x,h+.065,z,Math.atan2(nx,-nz),style)));
                object.lamp={style,x,z};fixtures.push({x,z});
            }
        }
    }
    function canPlaceScenery(x,z,w=1,d=1){if(worldTiles&&cityParcels.length&&!parcelFits(rectangle(x+w/2,z+d/2,w,d),{park:true}))return false;if(pavingInArea(x,z,w,d))return false;for(let yy=z;yy<z+d;yy++)for(let xx=x;xx<x+w;xx++)if(!isWalkable(xx,yy)||reserved[yy*N+xx])return false;return true;}
    const {makeBuilding,makeRestaurantPatio,addScenery,tree,bench,human,bicycle,makeLandmarks,enhanceLandmarks,addPanhandleDetails,detailedGround,mapTree,mapCanPlace,makeTownhomeRow,makeCurbShop,drawHillsideLifts,housingDetails,WATERFRONT_PIERS}=createModels({
        N,MAP_SCALE,mapTile,mapPosition,layoutPosition,terrainHeight,naturalHeight,cutHousePlot,occupy,upload,objects,signs,
        buildingModels,sightById,canPlaceScenery,isWalkable,pavingInArea,insidePolygon,parcelFits,
        COAST,MARIN,POND,PANHANDLE,lakes,getSceneMesh:()=>sceneMesh,rectangle
    });
    function build(){
        if(headless)for(const name of signNames())signs.set(name,[[0,0],[1,0],[1,1],[0,1]]);else initGPU();
        initializeGeography();buildHeightField();sceneMesh=new Mesh();
        compileStreetTiles();setupZoo();makeLandmarks();enhanceLandmarks();fitLandmarksToBlocks();reserveBridgeApproach();planRestaurants();planContentBuildings();
        positionNia();protectLandmarkApproaches();populateCity();buildNavigation();setupBunny();setupSkateDog();finalizeSurfaceTiles();
        southernTerrain=createSouthernTerrain({roads:SOUTHERN_ROADS,pit:RAIL_PIT,pads:SOUTHERN_LEVEL_PADS,edgeHeight:x=>{const ix=Math.min(TERRAIN_GRID-1,Math.max(0,Math.floor(x*TERRAIN_RES))),u=x*TERRAIN_RES-ix;return heights[TERRAIN_GRID][ix]*(1-u)+heights[TERRAIN_GRID][ix+1]*u;}});
        surf.state.shore={...sightById('windsurf').entry};
        chase=createPoliceChase({player,routeTo:officerRoute,nearest:nearestNavigation,canCapture:(o,p)=>!rocket.state.active&&!flying()&&(surf.water(o.x+.5,o.y+.5)&&surf.water(p.x+.5,p.y+.5)||canTravel(o.x,o.y,p.x,p.y)),onArrest:arrestPlayer});
        setupAirshipTerminal();setupMerchants();setupRegionalWorld();setupTigerEncounter();drawDetentionFacility(sceneMesh,detention);if(!headless)makeTerrain();placeStreetLights();
        if(headless){
            // Placement is finished. The model keeps bounds and footprints;
            // navigation tests do not need to retain millions of vertex values.
            for(const mesh of new Set([sceneMesh,tahoeMesh,highwayMesh,...objects.map(o=>o.mesh),...buildingModels.map(o=>o.mesh)]))if(mesh)mesh.data=[];
            built=true;return;
        }
        sceneGPU=upload(sceneMesh);
        lampGlow.setLights(streetLights,terrainHeight);gpuStats.triangles+=lampGlow.stats.triangles;cityLife=createCityLife({routes:worldTiles.routes,surfaceType:surfaceTypeAt,lamps:objects.filter(o=>o.lamp).map(o=>o.lamp),terrainHeight,groundHeight:characterGround,scale:MAP_SCALE,human,bicycle});buildCityMap();prepareWayfinding();
        built=true;updateCamera();drawMini();updateBikeButton();updateSurfButton();updateAirshipButton();updateTahoeButton();
    }



    // Eight-way A* with corner clearance, followed by line-of-sight string pulling.
    // Routing starts at the live position, so a new click never snaps back to a tile.
    function pathTo(tx,ty,from=player,ignoreCustody=false){
        if(regionalRoad)return regionalRoad.path(from,{x:tx,y:ty},{cityPath:(a,b)=>airship.path(a,b,(to,origin)=>cityPathTo(to.x,to.y,origin,ignoreCustody)),tahoePath:(a,b)=>tahoe.path(a,b)});
        if(tahoe.contains(from.x+.5,from.y+.5)||tahoe.contains(tx+.5,ty+.5))return tahoe.path(from,{x:tx,y:ty});
        return airship.path(from,{x:tx,y:ty},(to,origin)=>cityPathTo(to.x,to.y,origin,ignoreCustody));
    }
    function cityPathTo(tx,ty,from=player,ignoreCustody=false){
        const free=ignoreCustody?landClearAt:clearAt;if(!free(tx,ty)||!free(from.x,from.y))return null;
        return cityNavigation.path(from,{x:tx,y:ty});
    }
    function walkTo(x,y,onArrival=null) {
        if(player.gesture?.name==='pet')player.gesture=null;
        if(rocket.state.active){if(clickAttempt)clickAttempt.worked=false;return false;}
        if(surf.state.jump){if(clickAttempt)clickAttempt.worked=false;return false;}
        if(dialogue.active)dialogue.close();
        if(tahoe.state.mode==='ski')return tahoe.steerTo(x+.5,y+.5);
        if(tahoe.state.mode==='gondola')return false;
        if(rope.climbing)return false;
        if(flying()){
            if(rope.state.deployed){announce("Retract the rope before flying.");return false;}
            const accepted=airship.flyTo(x+.5,y+.5);if(!accepted){if(clickAttempt)clickAttempt.worked=false;return false;}
            destination={x,y};action=null;closeReader();updateAirshipButton();drawMini();return true;
        }
        if(sutroClimb.state.active)return climbUnavailable();
        const jailed=chase?.state.jailed;
        if(surf.state.riding&&!surf.water(x+.5,y+.5)&&Math.hypot(x-surf.state.shore.x,y-surf.state.shore.y)<5){useSurf();return true;}
        const route=jailed?detention.path(player,{x,y}):surf.state.riding?surf.path(player,{x,y}):pathTo(x,y);
        if(!route){if(clickAttempt)clickAttempt.worked=false;announce(jailed?'You can walk within your cell, but cannot pass through the bars or the bunk.':surf.state.riding?'Choose open water, or Return to shore.':'You cannot walk there. Try the pavement or a storefront.');return false;}
        player.path=route;action=jailed?null:onArrival;destination={x,y};
        if(!route.length){player.speed=0;destination=null;if(action){const fn=action;action=null;fn();}}drawMini();return true;
    }
    function goToPlace(p) {closeMenu();if(walkTo(p.inside.x,p.inside.y,()=>enter(p)))announce('Walking to '+p.label+'…');canvas.focus({preventScroll:true});}
    function announce(text,who='Guide') {
        $('sf-status').textContent=text;const row=document.createElement('div'), time=document.createElement('time');time.textContent=who;row.append(time,document.createTextNode(' '+text));const log=$('sf-log');log.append(row);while(log.children.length>4)log.firstChild.remove();log.scrollTop=log.scrollHeight;
    }
    function enter(p) {
        if(!active||chase?.state.jailed)return;if(placeAt(player.x,player.y)!==p){goToPlace(p);return;}
        if(readerPlace===p&&!$('sf-reader').hidden)return;
        readerPlace=p;closeMenu();$('sf-help').hidden=true;world.classList.add('sf-reading');
        visited.add(p.id);
        $('sf-reader-title').textContent=p.label;$('sf-reader-category').textContent=p.category+' / San Francisco';$('sf-reader-description').textContent=p.description;
        const content=$('sf-reader-content');content.replaceChildren();
        if(p.source==='Bio') {
            const bio=classic.querySelector('.bio-content').cloneNode(true);content.append(bio);const contact=classic.querySelector('.header-right').cloneNode(true);contact.className='sf-contact';content.append(contact);
        } else {
            const source=sections.get(p.source);
            for(const child of source.children){if(child.tagName==='SUMMARY')continue;if(p.match){if(child.tagName==='P'&&(child.querySelector(`a[href*="${p.match}"]`)||!child.querySelector('a')))content.append(child.cloneNode(true));}else content.append(child.cloneNode(true));}
        }
        content.querySelectorAll('a').forEach(a=>{a.target='_blank';a.rel='noopener noreferrer';});
        $('sf-reader').hidden=false;$('sf-reader-shade').hidden=true;$('sf-reader').scrollTop=0;
        announce('You step inside '+p.label+'. The roof is hidden; walk out to return to the street.','You');drawMini();
    }
    function closeReader(){if($('sf-reader').hidden)return;$('sf-reader').hidden=true;readerPlace=null;world.classList.remove('sf-reading');$('sf-reader-shade').hidden=$('sf-help').hidden;if(active)canvas.focus({preventScroll:true});}
    function closeMenu(){$('sf-context').hidden=true;}
    let clickAttempt=null,clickAnimation=null;
    function clicked(sx,sy,fn){
        const previous=clickAttempt,attempt={worked:true};clickAttempt=attempt;
        try{const result=fn();if(result===false)attempt.worked=false;return result;}
        finally{
            clickAttempt=previous;
            if(Number.isFinite(sx)&&Number.isFinite(sy)&&(sx||sy)){
                const feedback=$('sf-click-marker');clickAnimation?.cancel();feedback.hidden=false;feedback.dataset.accepted=String(attempt.worked);feedback.style.left=sx+'px';feedback.style.top=sy+'px';
                clickAnimation=feedback.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:'translate(-50%,-50%) scale(.08)',opacity:0}],{duration:reduced?180:440,easing:'ease-in',fill:'forwards'});
                clickAnimation.onfinish=()=>{feedback.hidden=true;};
            }
        }
    }
    function examine(p){closeMenu();announce(p?p.description:'A sun-warmed San Francisco street. Somewhere nearby, someone is building the future.','Examine');canvas.focus({preventScroll:true});}
    function showMenu(sx,sy) {
        if(rocket.state.active)return false;
        if(chase?.state.jailed)return false;
        if(surf.state.jump)return false;
        if(tahoe.state.mode!=='ground')return false;
        if(flying())return showAirshipMenu(sx,sy);
        if(sutroClimb.state.active){
            const menu=$('sf-context');menu.replaceChildren();const heading=document.createElement('div');heading.className='sf-context-title';heading.textContent='Sutro Tower · Choose an option';menu.append(heading);
            for(const [label,fn] of [['Climb down Sutro Tower',descendSutro],['Examine Sutro Tower',()=>examine(sightById('sutro'))],['Cancel',()=>canvas.focus({preventScroll:true})]]){
                const button=document.createElement('button');button.type='button';button.setAttribute('role','menuitem');button.textContent=label;button.addEventListener('click',e=>clicked(e.clientX,e.clientY,()=>{closeMenu();return fn();}));menu.append(button);
            }
            menu.hidden=false;menu.style.left=Math.min(width-menu.offsetWidth-12,Math.max(12,sx))+'px';menu.style.top=Math.min(height-menu.offsetHeight-12,Math.max(12,sy))+'px';menu.querySelector('button').focus({preventScroll:true});return true;
        }
        const npc=hitCitizen(sx,sy),s=npc?null:hitSight(sx,sy),p=s||npc?null:hitPlace(sx,sy),t=tileAt(sx,sy),menu=$('sf-context');menu.replaceChildren();$('sf-hover').hidden=true;
        const heading=document.createElement('div');heading.className='sf-context-title';heading.textContent=npc?npc.label+' · Choose an option':'Choose an option';menu.append(heading);
        const add=(text,fn)=>{const b=document.createElement('button');b.type='button';b.setAttribute('role','menuitem');b.textContent=text;b.addEventListener('click',e=>clicked(e.clientX,e.clientY,()=>{closeMenu();fn();}));menu.append(b);};
        if(npc?.kind&&MERCHANTS[npc.kind])add('Talk-to '+npc.label,()=>talkMerchant(npc));
        else if(npc){
            add('Attack '+npc.label,()=>interactCitizen(npc,'attack'));
            add('Steal-from '+npc.label,()=>interactCitizen(npc,'steal'));
            add('Talk-to '+npc.label,()=>interactCitizen(npc,'talk'));
        }
        if(npc)add('Examine '+npc.label,()=>{announce(describeCharacter(npc),'Examine');canvas.focus({preventScroll:true});});
        if(p)add((currentInterior===p?'Browse ':'Enter ')+p.label,()=>currentInterior===p?enter(p):goToPlace(p));
        if(s){
            if(s.kind==='bunny')add('Pet bunny',petBunny);
            if(s.kind==='zoo'&&zoo.state.phase==='caged')add('Release tiger',releaseTiger);
            if(s.kind==='spaceport')add('Launch rocket · 1 coin',()=>useRocket(s));
            else if(s.kind==='gondola')add(s.id==='gondola-base'?'Ride gondola up':'Ride gondola down',()=>useGondola(s.id==='gondola-base'));
            else if(s.kind==='ski-rental')add('Rent skis · 1 coin',rentSkis);
            else if(s.kind==='tax-hq')add('Talk to tax authority',()=>talkMerchant(merchants.find(p=>p.kind==='tax')));
            else if(s.id==='sutro'){add('Climb Sutro Tower',climbSutro);add('Walk to Sutro Tower',()=>goToSight(s));}
            else if(s.kind==='airship')add('Rent an airship',useAirship);
            else if(s.kind==='bike')add('Ride bicycle',useBike);
            else if(s.kind==='windsurf')add('Go windsurfing',useSurf);
            else if(s.kind==='whale')add('Jump over '+s.label,()=>jumpWhale(s));
            else if(s.kind==='guest')add('Talk to Nia',()=>goToSight(s));
            else if(s.kind==='ducks')add('Feed ducks',feedDucks);
            else if(s.kind==='startup')add('Talk to founder',()=>talkMerchant(merchants.find(p=>p.kind==='founder')));
        }
        const roadTarget=regionalRoad?.targetAt(t.x+.5,t.y+.5);
        if(!npc){if(surf.state.riding&&surf.water(t.x+.5,t.y+.5))add('Windsurf here',()=>walkTo(t.x,t.y));else if(roadTarget)add('Walk here',()=>walkTo(roadTarget.x,roadTarget.y));else if(clearAt(t.x,t.y))add('Walk here',()=>walkTo(t.x,t.y));else if(p)add('Walk to entrance',()=>walkTo(p.entry.x,p.entry.y));
        add('Examine '+(s?s.label:p?p.label:inPark(t.x,t.y)?'Golden Gate Park':'street'),()=>examine(s||p||(inPark(t.x,t.y)?sightById('park'):null)));}
        add('Cancel',()=>canvas.focus({preventScroll:true}));
        menu.hidden=false;menu.style.left=Math.min(width-menu.offsetWidth-12,Math.max(12,sx))+'px';menu.style.top=Math.min(height-menu.offsetHeight-12,Math.max(12,sy))+'px';menu.querySelector('button').focus({preventScroll:true});
    }
    const mapArtPoint=(x,y)=>({x:MAP_ART.x+x*10/MAP_SCALE,y:MAP_ART.y+y*9.5/MAP_SCALE});
    const referenceMapArtPoint=(x,y)=>mapArtPoint(mapPosition(x),mapPosition(y));
    function drawCityLandmarkSymbols(c){
        const at=referenceMapArtPoint;
        const p=at(49,20);poly(c,[{x:p.x-7,y:p.y+6},{x:p.x+7,y:p.y+6},{x:p.x,y:p.y-17}],'#e3ddc1','#6e806b');
        const palace=at(33,13);ellipse(c,palace.x+15,palace.y+1,14,7,'#658f82');ellipse(c,palace.x,palace.y,8,6,'#c7af7f');ellipse(c,palace.x,palace.y-3,6,4,'#80916b');
        for(const x of [22,27])for(const y of [13,15]){const b=at(x,y);c.fillStyle='#9a5a3b';c.fillRect(b.x,b.y,18,7);}
        const flag=at(25.4,14.4);line(c,[flag,{x:flag.x,y:flag.y-12}],'#d8d8bc',1.5);c.fillStyle='#b2644b';c.fillRect(flag.x,flag.y-12,7,4);
        const museum=at(27,29.5);c.fillStyle='#916b45';c.fillRect(museum.x-10,museum.y-4,20,8);poly(c,[{x:museum.x+1,y:museum.y-4},{x:museum.x+8,y:museum.y-4},{x:museum.x+11,y:museum.y-15},{x:museum.x-1,y:museum.y-18}],'#a17b4b');
        const academy=at(28,32.5);for(let i=-1;i<=1;i++)ellipse(c,academy.x+i*6,academy.y,6,4,'#527d43');
        const glass=at(31,29.5);c.fillStyle='#ebe9d1';c.fillRect(glass.x-10,glass.y-3,20,6);ellipse(c,glass.x,glass.y-4,5,6,'#eeeedd');
        const windmill=at(11.5,29.5);c.fillStyle='#9f8152';c.fillRect(windmill.x-3,windmill.y-1,6,8);line(c,[{x:windmill.x-7,y:windmill.y-8},{x:windmill.x+7,y:windmill.y+6}],'#e2d9b4',2);line(c,[{x:windmill.x-7,y:windmill.y+6},{x:windmill.x+7,y:windmill.y-8}],'#e2d9b4',2);
        const dome=at(39,31);ellipse(c,dome.x,dome.y,7,7,'#92a391');ellipse(c,dome.x,dome.y-2,3,4,'#d7bb74');
        const towerSite=sightById('salesforce').mapPoint,tower=mapArtPoint(towerSite.x,towerSite.y);ellipse(c,tower.x,tower.y,5,10,'#8fa9aa');
        const ferrySite=sightById('ferry').mapPoint,f=mapArtPoint(ferrySite.x,ferrySite.y);c.save();c.translate(f.x,f.y);c.rotate(Math.PI/4);c.fillStyle='#c7bca2';c.fillRect(-13,-4,26,8);c.fillStyle='#6e8378';c.fillRect(-2,-7,4,5);c.restore();
        const field=at(53.5,35.5);poly(c,[{x:field.x-8,y:field.y},{x:field.x,y:field.y-8},{x:field.x+8,y:field.y},{x:field.x,y:field.y+8}],'#6d9359','#b2a17a');
        const monument=at(34.4,31);c.fillStyle='#766e48';c.fillRect(monument.x-2,monument.y-5,4,10);
        const sutro=sightById('sutro').mapPoint,s=mapArtPoint(sutro.x,sutro.y);
        for(const side of [-1,1])line(c,[{x:s.x+side*5,y:s.y+6},{x:s.x+side*2,y:s.y-2},{x:s.x+side*4,y:s.y-9}],'#b95b43',1.5);
        line(c,[{x:s.x-6,y:s.y-9},{x:s.x+6,y:s.y-9}],'#e9dfbd',2);
        for(const dx of [-4,0,4])line(c,[{x:s.x+dx,y:s.y-9},{x:s.x+dx,y:s.y-17}],'#c65d44',1.2);
    }
    function buildCityMap(){
        const c=cityMap.getContext('2d');c.fillStyle='#456c72';c.fillRect(0,0,cityMap.width,cityMap.height);
        const project=points=>points.map(([x,y])=>mapArtPoint(x,y)),referenceProject=points=>project(mapPolygon(points));
        southernTerrain.drawMinimap(c,mapArtPoint);
        poly(c,project(MARIN),'#748b53','#d2c49d');
        poly(c,project(rectangle(detention.x,detention.z,detention.w,detention.d)),'#a4a49a','#536966');
        c.save();poly(c,project(COAST),'#c2b793');c.clip();
        poly(c,project(PRESIDIO),'#78934d');poly(c,referenceProject([[23.7,12.8],[26.9,12.8],[26.9,17.4],[23.7,17.4]]),'#a5ad75');poly(c,referenceProject([[25,10],[32,11],[32,12.5],[25,11.5]]),'#a5b17c');
        poly(c,referenceProject([[9,29],[32,29],[32,34],[9,34]]),'#789a4d');poly(c,referenceProject(boundsPolygon(PANHANDLE)),'#789a4d');
        poly(c,referenceProject([[33,27],[36,27],[36,30],[33,30]]),'#8fa35e');
        for(const [x,y,rx,ry] of [[29,43,4,5],[25.6,39.7,2.4,3],[42,51,2.2,1.4],[28,52,3,3],[17,57,6,5]]){const p=referenceMapArtPoint(x,y);ellipse(c,p.x,p.y,rx*10,ry*9.5,'#8b9c62');}
        for(const h of HILLS){if(h.name==='Presidio')continue;const p=mapArtPoint(h.x,h.y);for(const scale of [.45,.7,1]){c.beginPath();c.ellipse(p.x,p.y,h.r*10*scale/MAP_SCALE,h.r*9.5*scale/MAP_SCALE,0,0,Math.PI*2);c.strokeStyle='#736f4e28';c.lineWidth=1;c.stroke();}}
        for(let z=0;z<worldTiles.size;z++)for(let x=0;x<worldTiles.size;x++){const t=worldTiles.tiles[z*worldTiles.size+x],patches=t.patches||[{type:t.type,polygon:[[0,0],[1,0],[1,1],[0,1]]}];for(const p of patches)if(['road','path','sidewalk'].includes(p.type))poly(c,p.polygon.map(v=>mapArtPoint((x+v[0])*worldTiles.step,(z+v[1])*worldTiles.step)),p.type==='road'?'#879083':p.type==='path'?'#c0ab7e':'#e2d6b6');}
        const pond=[];for(let i=0;i<32;i++){const a=i*Math.PI/16;pond.push(mapArtPoint(POND.x+Math.cos(a)*POND.rx,POND.y+Math.sin(a)*POND.ry));}poly(c,pond,'#568b85');
        for(const [x,y,rx,ry] of [[16,56,1.7,2.7],[18.5,58.3,1.7,2.2]]){const p=referenceMapArtPoint(x,y);ellipse(c,p.x,p.y,rx*10,ry*9.5,'#57867c');}
        for(const o of objects)if(o.arch&&!o.place)poly(c,project(objectFootprint(o)),'#a89b7d');
        drawCityLandmarkSymbols(c);
        for(const p of places)poly(c,project(p.footprint||rectangle(p.x+p.w/2,p.y+p.d/2,p.w,p.d)),'#8b7454');
        c.restore();line(c,project(COAST),'#ded0a5',2);
        for(const o of objects)if(o.y>=N&&o.arch&&!['terminal','regional'].includes(o.arch))poly(c,project(objectFootprint(o)),o.arch==='townhomes'?'#b39b7e':'#a5aa86');
        for(const [x,z,w,d,angle] of WATERFRONT_PIERS){const c=Math.cos(angle),s=Math.sin(angle),points=[[-w/2,0],[w/2,0],[w/2,-d],[-w/2,-d]].map(([u,v])=>[x+u*c-v*s,z+u*s+v*c]);poly(cityMap.getContext('2d'),referenceProject(points),'#c9bca0');}
        poly(c,project([[82.4,103.2],[94.8,103.2],[94.8,150.5],[82.4,150.5]]),'#9da99c','#d4ceb1');
        const pier=SPACEPORT_PIER,pad=pier.pad;
        poly(c,project([[pier.west,pier.north],[pier.east,pier.north],[pier.east,pier.south],[pier.west,pier.south]]),'#a5b5b0');
        poly(c,project([[pad.west,pad.north],[pad.east,pad.north],[pad.east,pad.south],[pad.west,pad.south]]),'#a5b5b0','#d4ceb1');
        for(const r of SOUTHERN_ROADS){line(c,project(r.points),'#e2d6b6',3);line(c,project(r.points),'#879083',2);}
        for(const r of SOUTHERN_TRAILS)line(c,project(r.points),'#c4af85',2.5);
        poly(c,project(rectangle(TAX_HQ.x,TAX_HQ.z,5.4,3.4)),'#c6b778');
        poly(c,project(rectangle(SF_SPACEPORT.x,SF_SPACEPORT.z,5,5)),'#8fa5c0');
        poly(c,project(rectangle(SPACEPORT_HOUSES.x+3,SPACEPORT_HOUSES.z+2.1,6,4.2)),'#b49e79');
        poly(c,project([[RAIL_PIT.west,RAIL_PIT.north],[RAIL_PIT.east,RAIL_PIT.north],[RAIL_PIT.east,RAIL_PIT.south],[RAIL_PIT.west,RAIL_PIT.south]]),'#82715b');
        poly(c,project([[75.7,105],[79.8,105],[79.8,111],[75.7,111]]),'#7d9487');
        line(c,project([[AIRPORT_RUNWAY.x+AIRPORT_RUNWAY.width/2,AIRPORT_RUNWAY.z],[AIRPORT_RUNWAY.x+AIRPORT_RUNWAY.width/2,AIRPORT_RUNWAY.z+AIRPORT_RUNWAY.depth]]),'#bfc5af',4);
        poly(c,project([[STARTUP_HQ.x-1.7,133.1],[STARTUP_HQ.x+1.7,133.1],[STARTUP_HQ.x+1.7,135.9],[STARTUP_HQ.x-1.7,135.9]]),'#e88440');
        const mooring=mapArtPoint(AIRSHIP_TERMINAL.boarding.x+.5,AIRSHIP_TERMINAL.boarding.y+.5);ellipse(c,mooring.x,mooring.y,5,3,'#dfd3ac');
        const island=referenceMapArtPoint(42,2.5);ellipse(c,island.x,island.y,14,6,'#aeb995');c.fillStyle='#d1cdb4';c.fillRect(island.x-9,island.y-2,18,4);
        const statue=mapArtPoint(PROMETHEUS.x,PROMETHEUS.z);ellipse(c,statue.x,statue.y,12,10,'#a3b29d');ellipse(c,statue.x,statue.y,4,4,'#e2ba62');
        line(c,referenceProject([[18.8,.5],[18.8,10]]),'#bb6945',4);line(c,referenceProject([DOWNTOWN.bridge.rampStart,DOWNTOWN.bridge.abutment,DOWNTOWN.bridge.end]),'#c4c8ad',3);
        poly(c,referenceProject([[DOWNTOWN.bridge.end[0]-.5,DOWNTOWN.bridge.end[1]],[DOWNTOWN.bridge.end[0]+1,DOWNTOWN.bridge.end[1]-2],[DOWNTOWN.bridge.end[0]+3,DOWNTOWN.bridge.end[1]-1],[DOWNTOWN.bridge.end[0]+2,DOWNTOWN.bridge.end[1]+1]]),'#8e9b65');
    }
    let miniIcons=[],miniKeyboardPlace=null;
    const placeMarkerViews=[];
    function miniProjection(){return createMinimapProjection(N,map.width,map.height,camera.yaw,player.x+.5,player.y+.5);}
    function drawMini(){
        const m=miniProjection(),origin=m.point(-MAP_ART.x/10*MAP_SCALE,-MAP_ART.y/9.5*MAP_SCALE);
        mc.setTransform(1,0,0,1,0,0);mc.fillStyle='#456c72';mc.fillRect(0,0,map.width,map.height);
        mc.save();mc.setTransform(m.a*MAP_SCALE/10,m.b*MAP_SCALE/10,m.c*MAP_SCALE/9.5,m.d*MAP_SCALE/9.5,origin.x,origin.y);mc.drawImage(cityMap,0,0);mc.restore();
        if(nearTahoe(player.x+.5,player.y+.5))drawTahoeMinimap(mc,m,[player.x+.5,player.y+.5]);else if(player.x>160){mc.fillStyle='#9eaa84';mc.fillRect(0,0,map.width,map.height);}
        if(regionalRoad)drawHighwayMinimap(mc,m,regionalRoad);
        if(player.path.length)line(mc,[m.point(player.x+.5,player.y+.5),...player.path.map(p=>m.point(p.x+.5,p.y+.5))],'#ead294aa',1);
        for(const s of sights)if(!s.hiddenFromDirectory&&s.kind!=='bike'){
            const at=s.mapPoint||{x:s.entry.x+.5,y:s.entry.y+.5},p=m.point(at.x,at.y);
            ellipse(mc,p.x,p.y,1.2,1.2,'#e0d4ab');
        }
        miniIcons=layoutMinimapIcons(places.map(place=>({place,...m.point(place.x+place.w/2,place.y+place.d/2)})),map.width,map.height,13,12);
        for(const p of miniIcons)if(Math.hypot(p.x-p.anchorX,p.y-p.anchorY)>3)line(mc,[{x:p.anchorX,y:p.anchorY},p],'#ddcea580',.7);
        for(const p of miniIcons)drawPlaceIcon(mc,p.place.id,p.x,p.y);
        const selected=miniIcons.find(p=>p.place===miniKeyboardPlace);
        if(document.activeElement===$('sf-map-button')&&selected){
            mc.beginPath();mc.arc(selected.x,selected.y,7,0,Math.PI*2);mc.strokeStyle='#fff5d0';mc.lineWidth=1;mc.stroke();
        }
        const p=m.point(player.x+.5,player.y+.5),direction=m.point(player.x+.5+Math.cos(player.angle),player.y+.5+Math.sin(player.angle)),angle=Math.atan2(direction.y-p.y,direction.x-p.x);
        mc.save();mc.translate(p.x,p.y);mc.rotate(angle);poly(mc,[{x:5,y:0},{x:-4,y:-3},{x:-2,y:0},{x:-4,y:3}],'#fff6bb','#263d32');mc.restore();
        const nx=-m.c,ny=-m.d,len=Math.hypot(nx,ny),ux=nx/len,uy=ny/len;
        line(mc,[{x:map.width-17-ux*6,y:18-uy*6},{x:map.width-17+ux*9,y:18+uy*9}],'#f2dfa4',1.5);
        poly(mc,[{x:map.width-17+ux*9,y:18+uy*9},{x:map.width-17+ux*2-uy*3,y:18+uy*2+ux*3},{x:map.width-17+ux*2+uy*3,y:18+uy*2-ux*3}],'#f2dfa4');
        if(destination){const flag=m.point(destination.x+.5,destination.y+.5);drawDestinationFlag(mc,flag.x,flag.y);}
    }
    function minimapPointer(e){
        return canvasPixelPoint(e.clientX,e.clientY,map.getBoundingClientRect(),{
            width:map.width,height:map.height,offsetWidth:map.offsetWidth,offsetHeight:map.offsetHeight,
            clientWidth:map.clientWidth,clientHeight:map.clientHeight,clientLeft:map.clientLeft,clientTop:map.clientTop
        });
    }
    function navigationRegionAt(x,y){
        if(airship.contains(x+.5,y+.5)){x=airship.gate.x;y=airship.gate.y;}
        return cityNavigation?.regionAt(x,y)??-1;
    }
    function navigateFromMinimap(e){
        if(chase?.state.jailed)return false;
        keys.clear();closeMenu();closeReader();drawMini();
        const pixel=e.detail===0&&e.clientX===0&&e.clientY===0?(miniIcons.find(p=>p.place===miniKeyboardPlace)||miniIcons[0]):minimapPointer(e);
        if(!pixel)return false;
        const icon=nearestMinimapIcon(miniIcons,pixel.x,pixel.y);
        if(icon){goToPlace(icon.place);drawMini();return;}
        const worldPoint=miniProjection().unproject(pixel.x,pixel.y),x=worldPoint.x-.5,y=worldPoint.y-.5;
        if(flying()){walkTo(x,y);canvas.focus({preventScroll:true});return;}
        const roadTarget=regionalRoad?.targetAt(x+.5,y+.5);
        if(roadTarget){walkTo(roadTarget.x,roadTarget.y);canvas.focus({preventScroll:true});return;}
        if(tahoe.contains(x+.5,y+.5)){walkTo(x,y);canvas.focus({preventScroll:true});return;}
        if(Math.hypot(x-AIRSHIP_TERMINAL.boarding.x,y-AIRSHIP_TERMINAL.boarding.y)<3){useAirship();return;}
        if(airship.contains(x+.5,y+.5)){walkTo(x,y);canvas.focus({preventScroll:true});return;}
        if(surf.state.riding){walkTo(x,y);canvas.focus({preventScroll:true});return;}
        if(!insidePolygon(worldPoint.x,worldPoint.y,COAST)){announce('Choose a street, a park, or a content icon on the minimap.');canvas.focus({preventScroll:true});return false;}
        const region=navigationRegionAt(player.x,player.y),target=nearestNavigation(x,y,3,(tx,ty)=>navigationRegionAt(tx,ty)===region);
        if(target)walkTo(target.x,target.y);else{if(clickAttempt)clickAttempt.worked=false;announce('There is no reachable path to that point. Try a nearby street.');}
        canvas.focus({preventScroll:true});
    }
    function selectMinimapIcon(e){
        if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)||chase?.state.jailed)return;
        e.preventDefault();e.stopPropagation();keys.clear();
        if(!miniIcons.length)return;
        const step=e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1;
        const current=miniIcons.findIndex(p=>p.place===miniKeyboardPlace),index=current<0?(step<0?miniIcons.length-1:0):(current+step+miniIcons.length)%miniIcons.length;
        const p=miniIcons[index].place,name=placeIcon(p.id).label;miniKeyboardPlace=p;
        $('sf-map-button').setAttribute('aria-label','Minimap: '+name+'. Press Enter to travel. Arrow keys select another icon.');
        $('sf-status').textContent=name+' · '+p.label;drawMini();
    }
    function prepareWayfinding(){
        const legend=$('sf-icon-legend'),layer=$('sf-place-markers');legend.replaceChildren();layer.replaceChildren();
        for(const p of places){
            if(!PLACE_ICONS[p.id])throw new Error('Missing content icon for '+p.id);
            const icon=placeIcon(p.id),item=document.createElement('div'),badge=document.createElement('span'),copy=document.createElement('span'),title=document.createElement('strong'),detail=document.createElement('small');
            item.className='sf-legend-item';item.setAttribute('role','listitem');badge.className='sf-legend-icon';badge.style.setProperty('--sf-place-color',icon.color);badge.innerHTML=iconSVG(p.id);
            title.textContent=icon.label;detail.textContent=icon.detail;copy.append(title,detail);item.append(badge,copy);legend.append(item);
            const button=document.createElement('button');button.type='button';button.className='sf-place-marker';button.dataset.place=p.id;
            button.style.setProperty('--sf-place-color',icon.color);button.innerHTML=iconSVG(p.id);button.title=icon.label+' · '+p.label;button.setAttribute('aria-label','Visit '+p.label+' · '+icon.label);
            button.addEventListener('click',e=>{e.stopPropagation();clicked(e.clientX,e.clientY,()=>goToPlace(p));drawMini();});layer.append(button);
            placeMarkerViews.push({place:p,button,lastCheck:-Infinity,version:-1,blocked:false});
        }
    }
    function drawPlaceMarkers(t){
        for(const marker of placeMarkerViews){
            const {place:p,button}=marker;
            if(chase.state.jailed||currentInterior===p){button.hidden=true;continue;}
            const anchor=[p.x+p.w/2,p.object.hi[1]+.55,p.y+p.d/2],at=project(...anchor);
            if(at.distance<=0||at.depth>1||at.x<14||at.x>width-14||at.y<28||at.y>height-14){button.hidden=true;continue;}
            if(t-marker.lastCheck>120||marker.version!==camera.version){
                const ray={origin:camera.eye,dir:unit(sub(anchor,camera.eye))},distance=Math.hypot(...sub(anchor,camera.eye));
                marker.blocked=objects.some(o=>{if(o===p.object||o.interior===p||!o.arch&&!o.solid)return false;const d=rayBox(ray,o.lo,o.hi);return d!==null&&d<distance-.35;});
                marker.lastCheck=t;marker.version=camera.version;
            }
            button.hidden=marker.blocked;
            if(!marker.blocked){button.style.left=at.x+'px';button.style.top=at.y+'px';}
        }
    }

    function update(dt,t) {
        const jailed=chase?.state.jailed;
        cityLife?.update(dt);
        const blocked=!$('sf-help').hidden||!$('sf-context').hidden||dialogue.active;
        moveTaxAuthorities(merchants,dt,t,blocked);updateTahoeButton();
        const topSpeed=surf.state.riding?7.2:bike.riding?8.2:WALK_SPEED,acceleration=bike.riding||surf.state.riding?30:ACCELERATION;
        const oldX=player.x,oldY=player.y;
        skateDog?.update(dt,t,{x:player.x+.5,z:player.y+.5},{paused:blocked,canGreet:!jailed&&!rocket.state.active&&!flying()&&!surf.state.riding&&!sutroClimb.state.active&&!rope.climbing&&tahoe.state.mode==='ground'});
        if(zoo?.update(blocked?0:dt)==='player-caught'){updateCamera();drawMini();return;}
        if(!blocked){
            const turn=Number(keys.has('arrowright'))-Number(keys.has('arrowleft')),tilt=Number(keys.has('arrowup'))-Number(keys.has('arrowdown'));
            if(turn||tilt)setCamera(camera.yaw+turn*dt*1.2,camera.pitch+tilt*dt*.8);
        }
        if(rocket.state.active){
            const event=blocked?null:rocket.update(dt),p=rocket.state.position,pose=rocket.state.pose;
            player.x=p.x-.5;player.y=p.z-.5;player.angle=pose.angle;player.path=[];player.speed=0;player.moving=!blocked&&pose.motion>0;player.motion=pose.motion;player.phase=pose.phase;player.runBlend=0;
            if(event==='arrived'){updateRocketControls();updateSurfButton();updateAirshipButton();updateTahoeButton();announce(nearTahoe(p.x,p.z)?'Touchdown in Tahoe. Ride the gondola, then rent skis at the summit.':'Touchdown at the San Francisco spaceport.','SpaceX');}
            updateCamera();drawMini();return;
        }
        if(tahoe.state.mode!=='ground'){
            const event=blocked?null:tahoe.update(dt),p=tahoe.state.position;
            player.x=p.x-.5;player.y=p.z-.5;player.angle=tahoe.state.angle;player.path=[];player.speed=tahoe.state.speed;player.moving=!blocked;player.motion=0;
            if(event==='summit'){setCamera(-Math.PI*3/4,.65);announce('You reach the summit, impossibly high above Lake Tahoe. Rent skis for one coin.','Gondola');}
            if(event==='base')announce('You return to the lakeside gondola station.','Gondola');
            if(event==='flip')announce('Front flip landed!','Skiing');
            if(event==='finish')announce('You reach the lake at the end of the run. '+tahoe.state.flips+' flips landed. Ride the gondola for another run.','Skiing');
            updateCamera();drawMini();updateTahoeButton();return;
        }
        if(surf.state.riding&&!whalesSeen&&Array.from({length:whales.count},(_,i)=>whales.sample(t,i)).some(p=>Math.hypot(p.x-player.x-.5,p.z-player.y-.5)<14)){
            whalesSeen=true;announce('Whale sighted! Beyond the western shore, humpbacks surface and breathe beside your board.','Discovery');
        }
        if(surf.state.riding&&surf.state.jump){
            const jump=surf.state.jump,landed=!blocked&&surf.updateJump(dt);
            player.x=jump.x;player.y=jump.y;player.angle=jump.angle;player.moving=!blocked;player.speed=landed?0:7.2;
            if(landed)announce('You clear the humpback and splash back into the Pacific.','Windsurfing');
            chase?.update(dt,topSpeed);updateCamera();drawMini();return;
        }
        if(rope.state.deployed&&!blocked){
            const event=rope.update(dt);
            if(event==='passenger-aboard'){economy.trade('passenger');announce('The traveler reaches the deck and pays you 5 coins.','Traveler');}
            if(event==='ground')announce('You reach the ground. Walk around, then return to the rope to climb aboard.','You');
            if(event==='aboard'&&ropeReturnHome){ropeReturnHome=false;if(rope.retract())airship.returnHome();}
            if(event)updateAirshipButton();
        }
        if(rope.climbing){
            const p=rope.state.position;player.x=p.x-.5;player.y=p.z-.5;player.angle=airship.state.heading;player.moving=!blocked;player.speed=0;player.motion=1;player.phase=p.y*Math.PI*2/CHARACTER_CLIPS.climb.stride;
            updateCamera();drawMini();return;
        }
        if(airship.state.active&&!rope.onGround){
            const event=blocked?null:airship.update(dt),p=airship.state.position||airship.home;
            player.x=p.x-.5;player.y=p.z-.5;player.angle=airship.state.heading;player.speed=airship.state.speed;player.moving=!!airship.state.target;player.motion=0;player.runBlend=0;
            if(event==='landed'){rope.reset();player.path=[];player.speed=0;destination=null;updateAirshipButton();announce('You step onto the apron. Your airship rental is complete.','Pilot');}
            else if(event==='cruising')announce('You are above the city. Click the ground or minimap to fly; A returns to the terminal.','Pilot');
            else if(event==='arrived'){destination=null;updateAirshipButton();}
            chase?.update(dt,WALK_SPEED);updateCamera();drawMini();updateTahoeButton();miniLast=t;return;
        }
        if(sutroClimb.state.active){
            const before={...sutroClimb.state.position},event=blocked?null:sutroClimb.update(dt),position=sutroClimb.state.position,pose=sutroClimb.state.pose;
            player.x=position.x-.5;player.y=position.z-.5;player.speed=0;player.runBlend=0;
            const distance=Math.hypot(position.x-before.x,position.y-before.y,position.z-before.z);
            player.moving=distance>.00001;player.motion=pose.motion;
            if(pose.mode==='climb')player.phase=pose.ladderHeight*Math.PI*2/CHARACTER_CLIPS.climb.stride;
            else player.phase+=Math.hypot(position.x-before.x,position.z-before.z)*Math.PI*2/CHARACTER_CLIPS.walk.stride;
            const turn=Math.atan2(Math.sin(pose.angle-player.angle),Math.cos(pose.angle-player.angle));player.angle+=Math.max(-dt*15,Math.min(dt*15,turn));
            if(event){updateClimbButton();announce(event==='top'?'You reach the upper platform of Sutro Tower. Use the arrows to look around; Climb down or E returns to the ground.':'You step off the Sutro Tower ladder and return to the trail.','You');}
            chase?.update(dt,WALK_SPEED);updateCamera();drawMini();miniLast=t;updateBikeButton();return;
        }
        if(!blocked&&player.path.length){
            let remaining=0,px=player.x,py=player.y;
            for(const p of player.path){remaining+=Math.hypot(p.x-px,p.y-py);px=p.x;py=p.y;}
            const desired=Math.min(topSpeed,Math.sqrt(2*acceleration*remaining));
            player.speed+=Math.max(-acceleration*dt,Math.min(acceleration*dt,desired-player.speed));
            let budget=Math.min(remaining,Math.max(player.speed,.05)*dt);
            // Consume the entire frame distance, including across waypoint boundaries.
            while(player.path.length){
                const next=player.path[0],dx=next.x-player.x,dy=next.y-player.y,len=Math.hypot(dx,dy);
                if(len<.00001){player.path.shift();continue;}
                if(budget<=0)break;
                const step=Math.min(budget,len);player.vx=dx/len;player.vy=dy/len;
                player.x+=player.vx*step;player.y+=player.vy*step;budget-=step;
                if(step>=len-.00001){player.x=next.x;player.y=next.y;player.path.shift();}
            }
            if(!player.path.length){player.speed=0;destination=null;if(action){const fn=action;action=null;fn();}drawMini();}
        }
        const moved=Math.hypot(player.x-oldX,player.y-oldY);player.moving=moved>.00001;
        const response=1-Math.exp(-dt*12),speed=dt>0?moved/dt:0;
        player.motion+=(Number(player.moving)-player.motion)*response;
        player.runBlend+=(Number(player.moving&&speed>2.3)-player.runBlend)*response;
        if(player.moving){
            const stride=CHARACTER_CLIPS.walk.stride+(CHARACTER_CLIPS.run.stride-CHARACTER_CLIPS.walk.stride)*player.runBlend;
            player.phase+=moved*(bike.riding?1/.31:Math.PI*2/stride);
            const dx=player.x-oldX,dy=player.y-oldY,target=Math.atan2(dy,dx);
            const turn=Math.atan2(Math.sin(target-player.angle),Math.cos(target-player.angle));
            player.angle+=Math.max(-dt*15,Math.min(dt*15,turn));
            player.angle=Math.atan2(Math.sin(player.angle),Math.cos(player.angle));
        }
        const interior=jailed||surf.state.riding||flying()?null:placeAt(player.x,player.y);
        if(interior!==currentInterior){
            const previous=currentInterior;currentInterior=interior;
            if(previous&&readerPlace===previous)closeReader();
            if(interior&&bike.riding)parkBike(interior.entry.x,interior.entry.y);
            if(interior)enter(interior);else if(previous)announce('You leave '+previous.label+' and return to the street.','You');
        }
        chase?.update(dt,topSpeed);updateCamera();
        if(player.moving||t-miniLast>180){drawMini();updateBikeButton();miniLast=t;}
    }


    function mouseRay(sx,sy){const nx=(sx/width*2-1)*camera.tan*width/height,ny=(1-sy/height*2)*camera.tan;return {origin:camera.eye,dir:unit(camera.right.map((v,i)=>v*nx+camera.up[i]*ny-camera.back[i]))};}
    function terrainIntersection(ray){
        if(chase?.state.jailed){const t=(detention.base+.18-ray.origin[1])/ray.dir[1];return t>0&&Number.isFinite(t)?{point:ray.origin.map((v,i)=>v+ray.dir[i]*t),distance:t}:null;}
        const roadHit=regionalRoad?.raycast(ray),southHit=southernTerrain?.raycast(ray);
        if(nearTahoe(player.x+.5,player.y+.5,400)){const hit=raycastTahoe(ray);if(hit)return roadHit&&roadHit.distance<hit.distance?roadHit:hit;}
        // Traverse terrain grid cells and intersect the actual rendered triangles.
        // This remains exact at shorelines and steep hills, where ray marching can skip a ridge.
        const o=ray.origin,d=ray.dir,water=(.02-o[1])/d[1];let best=Math.min(water>0?water:220,roadHit?.distance||220,southHit?.distance||220),near=0;
        const apron=(AIRSHIP_TERMINAL.base+.03-o[1])/d[1];
        if(apron>0&&onAirportApron(o[0]+d[0]*apron,o[2]+d[2]*apron))best=Math.min(best,apron);
        let far=Math.min(220,best);
        for(const axis of [0,2]){if(Math.abs(d[axis])<1e-9){if(o[axis]<0||o[axis]>N)return best<220?{point:o.map((v,i)=>v+d[i]*best),distance:best}:null;}else{let a=(0-o[axis])/d[axis],b=(N-o[axis])/d[axis];if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);}}
        let x=Math.max(0,Math.min(TERRAIN_GRID-1,Math.floor((o[0]+d[0]*(near+1e-7))*TERRAIN_RES))),z=Math.max(0,Math.min(TERRAIN_GRID-1,Math.floor((o[2]+d[2]*(near+1e-7))*TERRAIN_RES)));
        const sx=d[0]>=0?1:-1,sz=d[2]>=0?1:-1,deltaX=Math.abs(1/TERRAIN_RES/d[0]),deltaZ=Math.abs(1/TERRAIN_RES/d[2]);let nextX=Math.abs(d[0])<1e-9?Infinity:((sx>0?x+1:x)/TERRAIN_RES-o[0])/d[0],nextZ=Math.abs(d[2])<1e-9?Infinity:((sz>0?z+1:z)/TERRAIN_RES-o[2])/d[2],t=near;
        while(t<=far+1e-7&&t<=best&&x>=0&&z>=0&&x<TERRAIN_GRID&&z<TERRAIN_GRID){
            const a=[x/TERRAIN_RES,heights[z][x],z/TERRAIN_RES],b=[(x+1)/TERRAIN_RES,heights[z][x+1],z/TERRAIN_RES],c=[(x+1)/TERRAIN_RES,heights[z+1][x+1],(z+1)/TERRAIN_RES],e=[x/TERRAIN_RES,heights[z+1][x],(z+1)/TERRAIN_RES];
            for(const tri of [[a,c,b],[a,e,c]]){const hit=rayTriangle(ray,...tri);if(hit!==null&&hit<best&&insidePolygon(o[0]+d[0]*hit,o[2]+d[2]*hit,COAST))best=hit;}
            if(nextX<nextZ){t=nextX;nextX+=deltaX;x+=sx;}else{t=nextZ;nextZ+=deltaZ;z+=sz;}
        }
        return best<220?{point:o.map((v,i)=>v+d[i]*best),distance:best}:null;
    }
    function tileAt(sx,sy){const hit=terrainIntersection(mouseRay(sx,sy));return hit?{x:hit.point[0]-.5,y:hit.point[2]-.5}:{x:NaN,y:NaN};}
    let pickedCache=null,frameID=0;
    function pick(sx,sy){
        if(pickedCache&&pickedCache.x===sx&&pickedCache.y===sy&&pickedCache.frame===frameID)return pickedCache.result;
        const ray=mouseRay(sx,sy),ground=terrainIntersection(ray);let distance=ground?ground.distance+.12:220,result=null;
        const test=o=>{const near=rayBox(ray,o.lo,o.hi);if(near===null||near>distance)return;const data=o.mesh.data,hiddenWalls=o.place&&o.place===currentInterior?cutawayWallMask(o,camera.eye):0;for(let vertex=o.start;vertex<o.start+o.count;vertex+=3){if(o.place&&o.place===currentInterior){const hidden=o.roof.start<=vertex&&vertex<o.roof.start+o.roof.count||o.walls.some(w=>(hiddenWalls&(1<<w.side))&&vertex>=w.start&&vertex<w.start+w.count);if(hidden)continue;}const i=vertex*11,t=rayTriangle(ray,[data[i],data[i+1],data[i+2]],[data[i+11],data[i+12],data[i+13]],[data[i+22],data[i+23],data[i+24]]);if(t!==null&&(t<distance||o.character&&Math.abs(t-distance)<1e-6)){distance=t;result=o;}}};
        for(const o of objects)test(o);for(const o of dynamicTargets)test(o);
        pickedCache={x:sx,y:sy,frame:frameID,result};return result;
    }
    function hitPlace(sx,sy){return pick(sx,sy)?.place||null;}
    function hitCitizen(sx,sy){
        const hit=pick(sx,sy);if(hit?.npc)return hit.npc;
        if(hit?.sight?.kind==='guest')return niaCitizen;
        // A few screen pixels of tolerance make thin limbs easy to select.
        // Test visibility at the actor itself so the extra area never reaches
        // through a wall or a closed café roof.
        let closest=null,best=Infinity;
        for(const o of [...dynamicTargets.filter(o=>o.npc),...objects.filter(o=>o.character&&o.sight?.kind==='guest')]){
            if(o.interior&&o.interior!==currentInterior)continue;
            const points=[];for(const x of [o.lo[0],o.hi[0]])for(const y of [o.lo[1],o.hi[1]])for(const z of [o.lo[2],o.hi[2]])points.push(project(x,y,z));
            if(points.some(p=>p.distance<=0))continue;
            const left=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y)),bottom=Math.max(...points.map(p=>p.y)),padding=5;
            if(sx<left-padding||sx>right+padding||sy<top-padding||sy>bottom+padding)continue;
            const anchor=[(o.lo[0]+o.hi[0])/2,o.lo[1]+(o.hi[1]-o.lo[1])*.62,(o.lo[2]+o.hi[2])/2],at=project(...anchor),ray=mouseRay(at.x,at.y),distance=Math.hypot(...sub(anchor,camera.eye));
            if(objects.some(w=>{if(w===o||w.place===currentInterior||!w.arch&&!w.solid)return false;const d=rayBox(ray,w.lo,w.hi);return d!==null&&d<distance-.18;}))continue;
            const score=Math.hypot(sx-at.x,sy-at.y);if(score<best){best=score;closest=o.npc||niaCitizen;}
        }
        return closest;
    }
    function positionNia(){
        const body=sightById('nia').object;
        if(!body?.character)throw new Error('Nia must have a seat inside Mazarine Coffee');
        Object.assign(niaCitizen,body.character,{interior:body.interior});
    }
    function hitSight(sx,sy){
        const hit=pick(sx,sy);if(hit)return hit.sight||null;
        const tower=sightById('sutro'),ray=mouseRay(sx,sy),near=tower.object?rayBox(ray,tower.object.lo,tower.object.hi):null;
        if(near!==null){const ground=terrainIntersection(ray);if(!ground||near<ground.distance+.1)return tower;}
        const t=tileAt(sx,sy);if(pondValue(t.x+.5,t.y+.5)<1.3)return sightById('ducks');if(palaceWater(t.x+.5,t.y+.5)<1.2)return sightById('palace');return null;
    }
    let dynamicTargets=[],actorTags=[];
    function makeActors(t){
        let pendingAirshipTarget=null;const m=new Mesh(),base=playerGround()+.07,phase=reduced?0:player.phase,gesture=player.gesture,actionT=gesture?(t-gesture.started)/gesture.duration:1;
        if(tahoe.state.mode==='ski')drawSkiRider(m,tahoe.state,t,reduced);
        else if(surf.state.riding)drawWindsurfer(m,player.x+.5,player.y+.5,playerGround(),player.angle,t,{moving:player.moving&&!surf.state.jump,reduced,pitch:surf.state.jump?.pitch||0});
        else{const rocketPose=rocket.state.active?rocket.state.pose:null,climbing=sutroClimb.state.active||rope.climbing||rocketPose?.mode==='climb',pose=rocketPose||(rope.climbing?{mode:'climb'}:sutroClimb.state.pose);
        human(m,player.x+.5,player.y+.5,base+(bike.riding?.3:0),player.angle,phase,bike.riding,undefined,undefined,{mode:rocketPose?rocketPose.mode:climbing?pose.mode:bike.riding?'cycle':'move',motion:reduced||flying()&&!rope.climbing?0:player.motion,run:player.runBlend,time:reduced?0:t*.001,action:climbing||rocketPose||reduced||actionT>=1?null:gesture?.name,actionT,ground:rocketPose?(pose.mode==='climb'?null:()=>rocket.state.position.y+.008):tahoe.state.mode==='gondola'?()=>tahoe.state.position.y+.01:rope.climbing?null:flying()?()=>airship.state.position.y+.008:climbing?(pose.mode==='climb'?null:()=>sutroClimb.state.position.y+.008):bike.riding?null:chase.state.jailed?()=>detention.base+.19:characterGround});
        if(bike.riding)bicycle(m,player.x+.5,player.y+.5,base,player.angle,phase);}
        if(tahoe.state.mode==='gondola')drawGondolaCabin(m,tahoe.state.position,tahoe.state.angle);
        drawRegionalBackdrop(m,player.x+.5,player.y+.5,playerGround());
        const shipPosition=airship.state.active?airship.state.position:{x:AIRSHIP_TERMINAL.boarding.x+.5,y:AIRSHIP_TERMINAL.base+.03,z:AIRSHIP_TERMINAL.boarding.y+.5};
        if(Math.hypot(player.x+.5-shipPosition.x,player.y+.5-shipPosition.z)<110){const start=m.data.length;drawAirship(m,shipPosition,airship.state.active?airship.state.heading:-Math.PI/2,t,reduced);if(!airship.state.active)pendingAirshipTarget={start,end:m.data.length};}
        const seaX=player.x+.5,seaZ=player.y+.5,seaRadius=350;
        drawOffshoreSea(m,seaBounds,seaX,seaZ,seaRadius);
        dynamicTargets=[];
        actorTags=[];
        const addTarget=(start,metadata,end=m.data.length)=>{const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=start;i<end;i+=11)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],m.data[i+k]);hi[k]=Math.max(hi[k],m.data[i+k]);}dynamicTargets.push({mesh:m,start:start/11,count:(end-start)/11,lo,hi,...metadata});};
        if(bunny&&Math.hypot(bunny.state.x-player.x-.5,bunny.state.z-player.y-.5)<70){const start=m.data.length;bunny.draw(m,t,characterGround,{reduced,cameraAngle:Math.atan2(camera.eye[2]-bunny.state.z,camera.eye[0]-bunny.state.x)});addTarget(start,{sight:bunny.sight});}
        if(skateDog&&Math.hypot(skateDog.state.x-player.x-.5,skateDog.state.z-player.y-.5)<70){
            const start=m.data.length,dog=skateDog.state;skateDog.draw(m,t,characterGround,{reduced});addTarget(start,{sight:skateDog.sight});
            actorTags.push({x:dog.x,z:dog.z,base:characterGround(dog.x,dog.z),height:1.4,speech:'Woof!',speechUntil:dog.speechUntil});
        }
        if(zoo){
            const animal=zoo.state.tiger,near=(x,y)=>Math.hypot(x-player.x,y-player.y)<100;
            if(near(SF_ZOO.x,SF_ZOO.z)){const start=m.data.length;drawTigerGate(m,zooBase,zoo.state.gate);addTarget(start,{sight:sightById('zoo')});}
            if(near(animal.x,animal.y)){
                const start=m.data.length;drawTiger(m,animal,(x,z)=>characterGround(x,z),{reduced});
                addTarget(start,{sight:{id:'tiger',kind:'wild-tiger',label:'Tiger',entry:{x:animal.x,y:animal.y},description:zoo.dangerous?'A magnificent striped cat. Currently reviewing your position on the food chain.':'An excellent tiger. It has never read a single warning sign.'}});
                if(['opening','escaping','loose'].includes(zoo.state.phase))actorTags.push({x:animal.x+.5,z:animal.y+.5,base:characterGround(animal.x+.5,animal.y+.5),height:1.65,hostile:true});
            }
            const lines=['Stop! We have paperwork!','Pspsps is not working!','You are outside your service area!','This was not in the job description!','Please return to your designated tiger area!','Nobody said there would be cardio!'];
            for(const w of zoo.state.wardens)if(near(w.x,w.y)){
                const base=characterGround(w.x+.5,w.y+.5),speech=w.speechFor>0?w.speech:zoo.state.phase==='loose'&&Math.floor(zoo.state.elapsed/3.5)%2===w.index&&zoo.state.elapsed%3.5<2.7?lines[(Math.floor(zoo.state.elapsed/7)+w.index)%lines.length]:'';
                human(m,w.x+.5,w.y+.5,base+.07,w.angle,reduced?0:w.travel*Math.PI*2/CHARACTER_CLIPS.run.stride,false,w.index?'#ba8b67':'#d4b493','#7a976f',{mode:'move',motion:reduced||!w.moving?0:1,run:1,pants:'#536658',cap:true,uniform:true,backpack:false,time:reduced?0:t*.001,ground:characterGround});
                drawAnimalControlNet(m,w.x+.5,base,w.y+.5,w.angle,reduced?0:t*.001);
                actorTags.push({x:w.x+.5,z:w.y+.5,base,height:2.45,label:'Animal Control',speech,speechUntil:Infinity});
            }
        }
        if(rocket.state.active){const p=rocket.state.vehicle;drawReusableRocket(m,p,t,{occupied:rocket.state.occupied,hatch:rocket.state.hatch,cameraAngle:Math.atan2(camera.eye[2]-p.z,camera.eye[0]-p.x),thrust:rocket.state.thrust});}
        else for(const [id,site] of [['sf-spaceport',SF_SPACEPORT],['tahoe-spaceport',tahoe.spaceport]])if(Math.hypot(site.x-player.x-.5,site.z-player.y-.5)<100){const start=m.data.length;drawReusableRocket(m,{x:site.x,y:site.base+.14,z:site.z},t);addTarget(start,{sight:sightById(id)});}
        if(pendingAirshipTarget)addTarget(pendingAirshipTarget.start,{sight:sightById('airship')},pendingAirshipTarget.end);
        drawAirshipRope(m,rope.state,t,reduced);
        if(rope.state.passenger){
            const p=rope.state.passenger,aboard=p.phase==='aboard',ship=airship.state.position||airship.home,a=airship.state.heading;
            human(m,aboard?ship.x-Math.cos(a)*.8:p.x,aboard?ship.z-Math.sin(a)*.8:p.z,aboard?ship.y+.1:p.y,a,aboard?0:p.y*Math.PI*2/.56,false,MERCHANTS.passenger.skin,MERCHANTS.passenger.shirt,{mode:aboard?'idle':'climb',motion:aboard?0:1,backpack:false,time:reduced?0:t*.001});
        }
        whales.draw(m,t,[player.x+.5,player.y+.5],reduced,(start,sight)=>addTarget(start,{sight}));
        if(Math.hypot(player.x+.5-PROMETHEUS.x,player.y+.5-PROMETHEUS.z)<135)drawPrometheusFlame(m,t,reduced);
        bayShipping.draw(m,t,[player.x+.5,player.y+.5],reduced);
        if(!bike.riding){const start=m.data.length;bicycle(m,bike.x+.5,bike.y+.5,terrainHeight(bike.x+.5,bike.y+.5)+.06,.5);addTarget(start,{sight:sightById('bicycle')});}
        if(!surf.state.riding){const start=m.data.length,s=sightById('windsurf'),x=s.entry.x+.5,z=s.entry.y+.5;drawWindsurfer(m,x,z,terrainHeight(x,z)+.08,-Math.PI/2,t,{rider:false,reduced:true});addTarget(start,{sight:s});}
        for(let i=0;i<6;i++){
            const fed=t<ducksFedUntil,a=i*2.4+(reduced?0:t*.0001),r=fed?.38:.7,x=fed?POND.x+1.15+Math.cos(a)*.25:POND.x+Math.cos(a)*POND.rx*r,z=fed?POND.y+Math.sin(a)*.25:POND.y+Math.sin(a)*POND.ry*r,h=lakes[0].level+.08,small=i>=4,scale=small?.65:1,start=m.data.length;
            m.sphere(x,h,z,.24*scale,.13*scale,.16*scale,small?'#d4b36d':i%2?'#9d8b6a':'#b0a888',7,3);const hx=x-Math.sin(a)*.19*scale,hz=z+Math.cos(a)*.19*scale;m.sphere(hx,h+.19*scale,hz,.1*scale,.13*scale,.1*scale,small?'#d5c27f':i%2?'#99886b':'#476f4f',7,3);m.sphere(hx-Math.sin(a)*.12*scale,h+.17*scale,hz+Math.cos(a)*.12*scale,.07*scale,.035*scale,.06*scale,'#c79e51',5,3);addTarget(start,{sight:sightById('ducks')});
        }
        cityLife.draw(m,t,[player.x+.5,player.y+.5],reduced,(start,npc)=>{addTarget(start,{npc});actorTags.push(npc);});
        drawRestaurantDiners(m,restaurantDiners,t,[player.x+.5,player.y+.5],reduced,(start,npc)=>{addTarget(start,{npc});actorTags.push(npc);});
        for(const npc of merchants){
            if(Math.hypot(npc.x-player.x-.5,npc.z-player.y-.5)>32)continue;
            const start=m.data.length;human(m,npc.x,npc.z,npc.base,npc.angle,npc.kind==='tax'?(npc.phase||0):0,false,npc.skin,npc.shirt,{mode:npc.kind==='tax'&&npc.hold<=0?'move':'idle',motion:npc.kind==='tax'&&npc.hold<=0?1:0,backpack:false,time:reduced?0:t*.001,pants:npc.kind==='tax'?'#c7a752':'#555e55',coat:npc.kind==='tax',topHat:npc.kind==='tax',gilded:npc.kind==='tax'});addTarget(start,{npc});
        }
        if(currentInterior===niaCitizen.interior)actorTags.push(niaCitizen);
        const officers=chase.state.jailed?[{x:detention.x-3.5,y:detention.z+2.8,angle:-Math.PI/2,index:0,phase:0},{x:detention.x+3,y:detention.z+2.8,angle:-Math.PI/2,index:1,phase:0}]:chase.state.officers;
        for(const o of officers){
            if(Math.hypot(o.x-player.x,o.y-player.y)>27)continue;
            const water=surf.water(o.x+.5,o.y+.5),base=water?.06:chase.state.jailed?detention.terrain(o.x+.5,o.y+.5)+.07:terrainHeight(o.x+.5,o.y+.5)+.07;
            if(water)drawWindsurfer(m,o.x+.5,o.y+.5,base,o.angle,t,{police:true,moving:!chase.state.jailed,reduced});
            else human(m,o.x+.5,o.y+.5,base,o.angle,reduced?0:o.phase*Math.PI*2/(10*CHARACTER_CLIPS.run.stride),false,'#ba9476','#304b66',{pants:'#2d4055',cap:true,uniform:true,backpack:false,mode:'move',motion:reduced||chase.state.jailed?0:1,run:1,time:reduced?0:t*.001,ground:chase.state.jailed?(x,z)=>detention.terrain(x,z)+.01:characterGround});
            const phrases=['Stop!','You are under arrest!','Stop right there!'],speaking=Math.floor(chase.state.elapsed/2.8)%3===o.index,speech=!chase.state.jailed&&speaking&&chase.state.elapsed%2.8<2.25?phrases[Math.floor(chase.state.elapsed/2.8)%phrases.length]:'';
            actorTags.push({x:o.x+.5,z:o.y+.5,base,height:water?3.3:1.95,label:'Police',police:true,speech,speechUntil:Infinity});
        }
        const travel=reduced?.5:(t*.000014)%2,f=travel<=1?travel:2-travel,car=alongStreet(market,f),next=alongStreet(market,Math.max(.0001,Math.min(.9999,f+(travel<=1?.001:-.001)))),angle=Math.atan2(next.y-car.y,next.x-car.x);
        drawStreetcar(m,car.x,terrainHeight(car.x,car.y)+.05,car.y,angle);
        drawHillsideLifts(m,t,reduced);
        return m;
    }
    function drawActorLabels(t){
        let used=0;
        for(const actor of actorTags){
            const marked=actor.police||actor.hostile;
            if(!marked&&!(actor.speech&&t<actor.speechUntil))continue;
            if(!marked&&Math.hypot(actor.x-player.x-.5,actor.z-player.y-.5)>13)continue;
            const head=[actor.x,actor.base+actor.height,actor.z],p=project(...head);
            if(p.distance<=0||p.depth>1||p.x<0||p.x>width||p.y<0||p.y>height)continue;
            if(!marked){const ray=mouseRay(p.x,p.y),distance=Math.hypot(...head.map((v,i)=>v-camera.eye[i]));if(objects.some(o=>{if(o.place&&o.place===currentInterior||!o.arch&&!o.solid)return false;const d=rayBox(ray,o.lo,o.hi);return d!==null&&d<distance-.4;}))continue;}
            let tag=labelPool[used++];
            if(!tag){const el=document.createElement('div'),speech=document.createElement('span'),arrow=document.createElement('span'),name=document.createElement('span');el.className='sf-actor-label';speech.className='sf-speech';arrow.className='sf-police-arrow';arrow.textContent='▼';el.append(speech,arrow,name);$('sf-actor-labels').append(el);tag={el,speech,arrow,name};labelPool.push(tag);}
            tag.el.hidden=false;tag.el.style.left=p.x+'px';tag.el.style.top=p.y+'px';tag.name.hidden=!actor.police;tag.name.textContent=actor.police?actor.label:'';tag.arrow.hidden=!marked;tag.speech.textContent=t<actor.speechUntil?actor.speech||'':'';
        }
        for(let i=used;i<labelPool.length;i++)labelPool[i].el.hidden=true;
        const speech=$('sf-player-speech');speech.hidden=t>=playerSpeechUntil;
        if(!speech.hidden){const at=project(player.x+.5,playerGround()+2.15,player.y+.5);speech.hidden=at.distance<=0||at.depth>1;if(!speech.hidden){speech.style.left=at.x+'px';speech.style.top=at.y+'px';}}

    }
    function render(t,dt){
        if(!active||!built||gl.isContextLost())return;update(dt,t);frameID++;gpuStats.drawCalls=0;
        const nearCity=Math.hypot(player.x-N/2,player.y-N/2)<220;if(nearCity)renderShadows();gl.viewport(0,0,canvas.width,canvas.height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);gl.uniformMatrix4fv(program.vp,false,camera.matrix);gl.uniform3fv(program.eye,camera.eye);gl.uniform3fv(program.focus,camera.target);gl.uniform1f(program.time,reduced?0:t*.001);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,atlasTexture);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,shadowTexture);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,materialTexture);for(const [i,texture] of alpineTextures.entries()){gl.activeTexture(gl.TEXTURE3+i);gl.bindTexture(gl.TEXTURE_2D,texture);}gl.activeTexture(gl.TEXTURE0);gl.uniformMatrix4fv(program.light,false,shadowMatrix);gl.uniform1f(program.shadows,shadowFramebuffer?1:0);
        if(nearCity){drawGPU(groundGPU);drawGPU(sceneGPU);drawBuildings();}
        if(nearTahoe(player.x+.5,player.y+.5,500))drawGPU(tahoeGPU);
        drawGPU(highwayGPU);
        const dynamic=makeActors(t);
        gl.bindBuffer(gl.ARRAY_BUFFER,dynamicGPU.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(dynamic.data),gl.DYNAMIC_DRAW);dynamicGPU.count=dynamic.data.length/11;drawGPU(dynamicGPU);if(lampGlow.draw(camera))gpuStats.drawCalls++;drawActorLabels(t);drawPlaceMarkers(t);
    }

    function frame(t){if(!active)return;const dt=Math.min((t-last)/1000,.075);last=t;render(t,dt);raf=requestAnimationFrame(frame);}
    function startLoop(){cancelAnimationFrame(raf);last=performance.now();raf=requestAnimationFrame(frame);}
    function setMode(on) {
        if(on===active)return;active=on;
        if(on){scrollBefore=scrollY;world.hidden=false;document.body.classList.add('sf-mode');classic.inert=true;classic.setAttribute('aria-hidden','true');if(!built)build();resize();updateCamera();canvas.focus({preventScroll:true});startLoop();}
        else{dialogue.close();const rocketEntry=rocket.state.active?rocket.state.from.entry:null;rocket.cancel();updateRocketControls();if(rocketEntry)Object.assign(player,rocketEntry);rope.reset();const landing=airship.cancel(),entry=sutroClimb.cancel();if(landing){player.x=landing.x;player.y=landing.y;}else if(entry){player.x=entry.x-.5;player.y=entry.z-.5;}updateClimbButton();cancelAnimationFrame(raf);keys.clear();pointers.clear();clearTimeout(pressTimer);gesture=false;hovered=null;currentInterior=null;readerPlace=null;world.classList.remove('sf-reading');$('sf-hover').hidden=true;player.path=[];player.speed=0;action=null;closeMenu();$('sf-reader').hidden=true;$('sf-help').hidden=true;$('sf-reader-shade').hidden=true;playerSpeechUntil=0;$('sf-player-speech').hidden=true;world.hidden=true;document.body.classList.remove('sf-mode');classic.inert=false;classic.removeAttribute('aria-hidden');window.scrollTo(0,scrollBefore);$('sf-toggle').focus({preventScroll:true});}
        $('sf-toggle').setAttribute('aria-pressed',String(on));$('sf-toggle-label').textContent=on?'Classic page':'Explore SF';
    }
    function sayYo(){
        if(!active)return false;
        playerSpeechUntil=performance.now()+3000;$('sf-player-speech').textContent='yo';canvas.focus({preventScroll:true});return true;
    }
    function showHelp(){closeReader();closeMenu();keys.clear();player.speed=0;$('sf-help').hidden=false;$('sf-reader-shade').hidden=false;$('sf-close-help').focus({preventScroll:true});}
    function closeHelp(){$('sf-help').hidden=true;$('sf-reader-shade').hidden=true;canvas.focus({preventScroll:true});}
    if(headless){
        build();
        return {tiles:worldTiles,navigation:cityNavigation,objects,places,sights,spawn:{x:player.x,y:player.y},merchants,bunny,skateDog,airship,tahoe,regionalRoad,southernTerrain,terrainHeight,pathTo,canTravel,clearAt,landClearAt,cityPathTo,navigationRegionAt,nearestNavigation,approaches:{bunny:bunnyApproach,sutro:sutroApproach,merchant:merchantApproach}};
    }
    window.SFMapDiagnostics=Object.freeze({
        navigation:Object.freeze({audit:()=>cityNavigation?auditNavigationGrid(cityNavigation):null,position:(x,y)=>cityNavigation?.describe(x,y),connected:(from,to)=>cityNavigation?.connected(from,to)||false,route:(from,to)=>built?pathTo(to.x,to.y,from):null}),
        validate:()=>worldTiles?validateTileMap(worldTiles):null,testRules:runTileRuleTests,get report(){return worldTiles?.validation||null;},tile:(x,z)=>{const m=worldTiles;if(!m||x<0||z<0||x>=m.size||z>=m.size)return null;const t=m.tiles[z*m.size+x];return {x,z,type:t.type,base:t.base,variant:t.variant,ports:t.ports,curbEdges:t.curbEdges,areas:{...t.areas},waterLevel:t.waterLevel,waterBorders:t.waterBorders?.map(e=>e.map(s=>({...s}))),edges:t.edges.map(e=>e.map(s=>({...s})))};}
    });
    $('sf-toggle').hidden=false;$('sf-toggle').addEventListener('click',()=>{
        if(document.documentElement.dataset.sfEntry==='explore'){window.location.href=new URL('./index.html',window.location.href).href;return;}
        setMode(!active);
    });
    $('sf-bike-button').addEventListener('click',useBike);
    $('sf-climb-button').addEventListener('click',descendSutro);
    $('sf-airship-button').addEventListener('click',useAirship);
    $('sf-rope-button').addEventListener('click',showRopeMenu);
    $('sf-ski-button').addEventListener('click',useTahoeActivity);
    $('sf-surf-button').addEventListener('click',useSurf);
    $('sf-map-button').addEventListener('click',e=>clicked(e.clientX,e.clientY,()=>navigateFromMinimap(e)));
    $('sf-map-button').addEventListener('keydown',selectMinimapIcon);
    $('sf-map-button').addEventListener('focus',()=>{keys.clear();drawMini();});
    $('sf-map-button').addEventListener('blur',()=>{miniKeyboardPlace=null;$('sf-map-button').setAttribute('aria-label','Minimap. Click to travel. Arrow keys select a content icon; Enter travels there.');drawMini();});
    $('sf-map-button').addEventListener('pointerdown',()=>keys.clear());
    $('sf-map-button').addEventListener('pointermove',e=>{
        const pixel=minimapPointer(e),icon=pixel&&nearestMinimapIcon(miniIcons,pixel.x,pixel.y);
        $('sf-map-button').title=icon?placeIcon(icon.place.id).label+' · '+icon.place.label:'Click to travel · Red flag marks your destination';
    });
    $('sf-close-reader').addEventListener('click',closeReader);
    $('sf-reader-shade').addEventListener('click',()=>{closeReader();closeHelp();});
    $('sf-say-button').addEventListener('click',sayYo);
    $('sf-help-button').addEventListener('click',showHelp);$('sf-close-help').addEventListener('click',closeHelp);$('sf-help-start').addEventListener('click',closeHelp);
    $('sf-zoom-slider').addEventListener('input',e=>setZoom(Number(e.target.value)/100));
    $('sf-zoom-slider').addEventListener('focus',()=>keys.clear());
    $('sf-recenter').addEventListener('click',()=>{setCamera(0,Math.PI/5);setZoom(width<600?.8:1);updateCamera();});
    canvas.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom*Math.exp(-e.deltaY*.0015));},{passive:false});
    canvas.addEventListener('contextmenu',e=>{e.preventDefault();clearTimeout(pressTimer);longPressed=true;clicked(e.clientX,e.clientY,()=>showMenu(e.clientX,e.clientY));});
    canvas.addEventListener('pointerdown',e=>{
        if(e.button!==0)return;closeMenu();canvas.focus({preventScroll:true});pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY});canvas.setPointerCapture(e.pointerId);longPressed=false;
        if(pointers.size===1&&e.pointerType!=='mouse')pressTimer=setTimeout(()=>{longPressed=true;clicked(e.clientX,e.clientY,()=>showMenu(e.clientX,e.clientY));},550);
        if(pointers.size===2){clearTimeout(pressTimer);gesture=true;const [a,b]=[...pointers.values()];pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);}
    });
    canvas.addEventListener('pointermove',e=>{
        const pointer=pointers.get(e.pointerId);if(pointer){pointer.x=e.clientX;pointer.y=e.clientY;if(Math.hypot(pointer.x-pointer.startX,pointer.y-pointer.startY)>9)clearTimeout(pressTimer);}
        if(pointers.size===2){const [a,b]=[...pointers.values()],dist=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance>0)setZoom(zoom*Math.pow(dist/pinchDistance,1.5));pinchDistance=dist;return;}
        if(e.pointerType==='touch')return;const citizen=hitCitizen(e.clientX,e.clientY);hovered=citizen||hitSight(e.clientX,e.clientY)||hitPlace(e.clientX,e.clientY);
        const tip=$('sf-hover');tip.hidden=!hovered||!$('sf-context').hidden;if(hovered){tip.textContent=citizen?citizen.label+' / Click for options':(hovered.source?'Enter':sightPrimaryVerb(hovered))+' '+hovered.label+' / Right-click for more';tip.style.left=Math.max(8,Math.min(width-300,e.clientX+17))+'px';tip.style.top=Math.min(height-38,e.clientY+22)+'px';}
    });
    canvas.addEventListener('pointerup',e=>{
        clearTimeout(pressTimer);const p=pointers.get(e.pointerId);pointers.delete(e.pointerId);if(pointers.size===0&&gesture){gesture=false;return;}if(!p||gesture||longPressed||e.button!==0||Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>12)return;
        clicked(e.clientX,e.clientY,()=>{
            const tile=tileAt(e.clientX,e.clientY);
            if(chase?.state.jailed)return walkTo(tile.x,tile.y);
            if(sutroClimb.state.active){if(hitSight(e.clientX,e.clientY)?.id==='sutro')return showMenu(e.clientX,e.clientY);return climbUnavailable();}
            if(flying()){const tile=tileAt(e.clientX,e.clientY);return walkTo(tile.x,tile.y);}
            if(hitCitizen(e.clientX,e.clientY)){showMenu(e.clientX,e.clientY);return;}
            const roadTarget=regionalRoad?.targetAt(tile.x+.5,tile.y+.5);
            if(roadTarget)return walkTo(roadTarget.x,roadTarget.y);
            const place=hitPlace(e.clientX,e.clientY),sight=hitSight(e.clientX,e.clientY);
            if(sight?.id==='sutro')return showMenu(e.clientX,e.clientY);
            if(sight)goToSight(sight);else if(place&&!(place===currentInterior&&isWalkable(tile.x,tile.y)))goToPlace(place);else walkTo(tile.x,tile.y);
        });
    });
    canvas.addEventListener('pointercancel',e=>{clearTimeout(pressTimer);pointers.delete(e.pointerId);if(!pointers.size)gesture=false;});
    canvas.addEventListener('pointerleave',()=>{$('sf-hover').hidden=true;hovered=null;});
    document.addEventListener('pointerdown',e=>{if(!$('sf-context').hidden&&!$('sf-context').contains(e.target)&&e.target!==canvas)closeMenu();});
    document.addEventListener('keydown',e=>{
        if(!active||e.ctrlKey||e.metaKey||e.altKey)return;const key=e.key.toLowerCase();
        if(chase?.state.jailed&&['b','f','e','a'].includes(key)){e.preventDefault();return;}
        const modal=!$('sf-help').hidden?$('sf-help'):null;
        if(key==='escape'){e.preventDefault();if(dialogue.active){dialogue.close();return;}if(!$('sf-context').hidden){closeMenu();canvas.focus({preventScroll:true});}else if(!$('sf-help').hidden)closeHelp();else if(!$('sf-reader').hidden)closeReader();else if(sutroClimb.state.active)descendSutro();else if(airship.state.active){airship.stop();destination=null;updateAirshipButton();}else{player.path=[];player.speed=0;action=null;destination=null;drawMini();}return;}
        if(dialogue.active){keys.clear();dialogue.handleKey(e);return;}
        if(rocket.state.active&&['a','b','f','e'].includes(key)){e.preventDefault();return;}
        if(modal){if(key==='tab'){const focus=[...modal.querySelectorAll('button,a[href],canvas[tabindex]')],first=focus[0],last=focus[focus.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}return;}
        if(e.target instanceof HTMLInputElement)return;
        if(!$('sf-context').hidden&&(key==='arrowdown'||key==='arrowup')){e.preventDefault();const opts=[...$('sf-context').querySelectorAll('button')],i=opts.indexOf(document.activeElement);opts[(i+(key==='arrowdown'?1:-1)+opts.length)%opts.length].focus();return;}
        if(['arrowup','arrowdown','arrowleft','arrowright'].includes(key)){if(e.target instanceof Element&&e.target.closest('#sf-reader'))return;e.preventDefault();keys.add(key);return;}
        if(e.repeat)return;if(key===' '&&tahoe.state.mode==='ski'){e.preventDefault();tahoe.flip();return;}if(key==='e'&&nearTahoe(player.x+.5,player.y+.5)){e.preventDefault();useTahoeActivity();return;}if(key==='s'){e.preventDefault();sayYo();return;}if(key==='a'){e.preventDefault();useAirship();return;}if(key==='b'){e.preventDefault();useBike();}if(key==='f'){e.preventDefault();useSurf();}if(key==='e'){e.preventDefault();if(airship.state.active){airshipUnavailable();return;}if(sutroClimb.state.active){descendSutro();return;}const tower=sightById('sutro').object;if(tower&&Math.hypot(player.x+.5-tower.x-tower.w/2,player.y+.5-tower.y-tower.d/2)<4){climbSutro();return;}const p=currentInterior||places.find(p=>Math.hypot(player.x-p.entry.x,player.y-p.entry.y)<2.5);if(p)enter(p);else announce('Walk closer to a storefront to enter. Click a content icon on the minimap to visit a storefront.');}
        if(key==='+'||key==='='){e.preventDefault();setZoom(zoom+.1);}if(key==='-'){e.preventDefault();setZoom(zoom-.1);}if(key==='?')showHelp();
    });
    document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();clearTimeout(pressTimer);pointers.clear();gesture=false;});
    document.addEventListener('visibilitychange',()=>{keys.clear();if(document.hidden)cancelAnimationFrame(raf);else if(active)startLoop();});
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();keys.clear();cancelAnimationFrame(raf);});
    canvas.addEventListener('webglcontextrestored',()=>{if(!built)return;gpuStats.triangles=0;initGPU();groundGPU=upload(groundMesh);sceneGPU=upload(sceneMesh);if(tahoeMesh)tahoeGPU=upload(tahoeMesh);if(highwayMesh)highwayGPU=upload(highwayMesh);for(const o of buildingModels)o.gpu=upload(o.mesh);updateCamera();if(active)startLoop();});
    window.addEventListener('resize',resize);
    if(document.documentElement.dataset.sfEntry==='explore')setMode(true);
}

/** Build the actual authored world without DOM, canvas, WebGL, images or a server.
 * Geometry placement is shared; rasterization, upload and UI initialization are skipped. */
export function createWorldModel(){return createSFWorld({headless:true});}
if(typeof document!=='undefined')createSFWorld();
