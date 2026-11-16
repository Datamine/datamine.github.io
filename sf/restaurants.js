import {pose} from './geometry.js';
import {drawCharacter} from './characters.js';

// Targets use the same 64-unit geographic drawing as the other landmarks.
export const RESTAURANTS=Object.freeze([
    Object.freeze({id:'lucindas-deli',name:"Lucinda's Deli",label:'Lucinda’s Deli',target:[35.5,30.5],w:2.4,d:1.6,patioDepth:1.2,worldHeight:2.8,arch:'victorian',roof:'gable',color:'#819a76',trim:'#f0d9a4',roofColor:'#5a6a64',category:'Alamo Square · sandwiches',description:'Lucinda’s Deli, by Alamo Square. Pick up a sandwich for 3 coins, or order DoorDash for 4. A tiny cooler delivers it. Eat a sandwich to restore up to 18 hitpoints.'}),
    Object.freeze({id:'shanghai-kelly',name:"Shanghai Kelly's",label:"Shanghai Kelly’s",target:[40,18.8],w:2.5,d:1.7,patioDepth:1,worldHeight:2.75,arch:'warehouse',roof:'gable',color:'#5c665c',trim:'#d7b677',roofColor:'#565f66',category:'North Beach · neighborhood bar',description:'Shanghai Kelly’s bar. A beer costs one coin and adds 10% inebriation. A little balance returns every three seconds.'}),
    Object.freeze({id:'cotogna',name:'cotogna',label:'Cotogna',target:[46,17],w:3,d:1.9,patioDepth:1.5,worldHeight:2.3,arch:'warehouse',roof:'flat',color:'#ad795d',trim:'#d8c5a5',roofColor:'#68776b',category:'North Beach · near Coit Tower',description:'A brick neighborhood restaurant near Coit Tower. Neighbors eat at a table outside beneath the cotogna sign. The chef buys live fish from Fisherman’s Wharf for 5 coins each.'}),
    Object.freeze({id:'rich-table',name:'Rich Table',label:'Rich Table',target:[39,33.5],w:2.1,d:1.3,patioDepth:1.5,worldHeight:3.05,arch:'victorian',roof:'gable',color:'#597667',trim:'#e0d8bc',roofColor:'#7c6b66',category:'Hayes Valley · outdoor dining',description:'A little Hayes Valley house with a Rich Table sign. Neighbors share dinner at the tables outside.'})
]);

export function restaurantPoint(site,u,v){
    const a=site.rotation||0,c=Math.cos(a),s=Math.sin(a);
    return [site.x+site.w/2+u*c-v*s,site.y+site.d/2+u*s+v*c];
}

/** Patio furniture stays inside its reserved private parcel. The dining group
 * has one collision footprint; a clear aisle leads to the front door. */
export function createRestaurantPatio(m,site,registerFixture=()=>{}){
    const base=site.object.base+.015,front=site.d/2,diners=[];
    pose(m,site.x+site.w/2,base,site.y+site.d/2,site.rotation||0,()=>{
        const left=-site.w/2,right=site.w/2;
        const back=front,edge=front+site.patioDepth;
        m.quad([left,0,back],[left,0,edge],[right,0,edge],[right,0,back],'#c0b79b','cobble');
        for(const x of site.id==='rich-table'?[right-.17]:[left+.17,right-.17]){
            const z=back+.25;m.cylinder(x,.015,z,.135,.24,'#aa7759',16,.16,'stone');m.sphere(x,.36,z,.17,.23,.17,'#788f59',12,8);
        }
    });
    const tables=[];
    for(let table=0;table<1;table++){
        const u=site.id==='cotogna'?.78:.45,v=front+.75,turn=0,start=m.data.length;
        const local=(x,z)=>[u+x*Math.cos(turn)-z*Math.sin(turn),v+x*Math.sin(turn)+z*Math.cos(turn)];
        pose(m,site.x+site.w/2,base,site.y+site.d/2,site.rotation||0,()=>pose(m,u,0,v,turn,()=>{
            m.cylinder(0,.02,0,.065,.7,'#566a60',12);m.cylinder(0,.71,0,.32,.065,'#b19b75',24,.32,'wood');
            for(const side of [-1,1]){
                const seat=side*.4;
                m.box(-.17,.43,seat-.16,.34,.065,.32,'#856e51','wood');m.box(-.18,.49,seat+side*.18-.025,.36,.49,.05,'#856e51','wood');
                for(const dx of [-.13,.13])for(const dz of [-.12,.12])m.rod([dx,.02,seat+dz],[dx,.43,seat+dz],.018,'#596d61',8);
                m.cylinder(0,.781,side*.18,.115,.018,'#e3ddca',24);m.sphere(0,.81,side*.18,.065,.015,.05,table?'#b88a55':'#8c9a55',12,6);
                for(const offset of [-.05,.045])m.sphere(offset,.822,side*.18,.018,.015,.018,'#b96e4e',8,4);
                m.cylinder(.19,.78,side*.12,.035,.12,'#9caaa0',16,.04,'glass');m.rod([-.16,.79,side*.08],[-.16,.79,side*.26],.006,'#bdc2b2',5);
            }
        }));
        const point=restaurantPoint(site,u,v),footprint=[[-.36,-.625],[.36,-.625],[.36,.625],[-.36,.625]].map(([x,z])=>restaurantPoint(site,...local(x,z)));
        registerFixture(m,start,{x:point[0]-.8,y:point[1]-.8,w:1.6,d:1.6,h:1,base,rotation:(site.rotation||0)+turn,footprint,solid:true,preserveGround:true,sight:site.sight});
        tables.push({x:point[0],z:point[1],base,footprint});
        for(const side of [-1,1]){
            const [x,z]=restaurantPoint(site,...local(0,side*.4)),index=(site.id==='cotogna'?2:0)+table*2+(side>0?1:0);
            diners.push({id:site.id+'-diner-'+index,label:index%2?'Woman':'Man',x,z,base:base+.025,height:1.55,angle:(site.rotation||0)+turn+(side<0?Math.PI/2:-Math.PI/2),index,hold:0,seed:index*.217});
        }
    }
    return {diners,tables};
}

export function drawRestaurantDiners(m,diners,time,viewer,reduced=false,addTarget=()=>{}){
    const skins=['#9b7053','#c19a78','#c7ac8c','#805a42'],shirts=['#647e87','#a87f6b','#7d825c','#9b7985'];
    for(const diner of diners){
        if(Math.hypot(diner.x-viewer[0],diner.z-viewer[1])>28)continue;
        const start=m.data.length,gesture=!reduced&&diner.gesture&&time<diner.gesture.started+diner.gesture.duration?diner.gesture:null;
        drawCharacter(m,diner.x,diner.z,diner.base,diner.angle,0,!diner.club,diner.skin||skins[diner.index],diner.shirt||shirts[diner.index],{
            mode:diner.club?'idle':'sit',female:diner.label==='Woman',longHair:diner.index===1,hairstyle:diner.index===3?'curly':undefined,
            backpack:false,pants:'#59605a',time:reduced?0:time*.001+diner.seed,
            action:reduced?null:gesture?gesture.name:diner.club?'dance':'eat',actionT:gesture?(time-gesture.started)/gesture.duration:(time*.00019+diner.seed)%1
        });
        addTarget(start,diner);
    }
}
