import {Mesh,pose} from './geometry.js';

export const MOTORCYCLE_RENTAL_PRICE=5,MOTORCYCLE_SPEED=14;
export const MOTORCYCLE_EXAMINE='A conveniently parked motorcycle. Almost suspiciously convenient. The rental note says “5 coins; please arrange your getaway before relocating any primates.” Stealing it attracts the police.';

export function createMotorcycle({home,saved={},onSave=()=>{}}){
    const state={rented:saved.rented===true,riding:false,x:Number.isFinite(saved.x)?saved.x:home.x,y:Number.isFinite(saved.y)?saved.y:home.y,angle:Number.isFinite(saved.angle)?saved.angle:-Math.PI/2,travel:0};let saveTime=0;
    const save=()=>{saveTime=0;onSave({rented:state.rented,x:state.x,y:state.y,angle:state.angle});};
    function rent(economy,{pursued=false}={}){
        if(state.rented)return {ok:false,message:'Your motorcycle rental is already paid for.'};
        if(pursued)return {ok:false,message:'Arrange your rental before stealing the monkey. The rental desk will not process a getaway in progress.'};
        const result=economy.trade('motorcycle-rental');if(!result.ok)return result;
        state.rented=true;save();return {ok:true,message:'You rent the motorcycle for 5 coins. Click it to ride, or use Motorcycle / M. Your rental is ready for a conveniently timed escape.'};
    }
    function mount(){if(!state.rented)return false;state.riding=true;save();return true;}
    function park(x,y,angle=state.angle){Object.assign(state,{riding:false,x,y,angle});save();}
    function move(x,y,angle,distance,dt){if(!state.riding)return;Object.assign(state,{x,y,angle});state.travel+=distance;saveTime+=dt;if(saveTime>=2)save();}
    return {state,home,rent,mount,park,move,save};
}

let motorcycleBody=null;
/** An original small road bike: fork, finned engine, tank, saddle and exhaust.
 * The body is cached; only the spokes rotate with distance traveled. */
export function drawMotorcycle(m,x,z,base,angle,travel=0){
    if(!motorcycleBody){
        const b=new Mesh(),chrome='#b6c2bd',dark='#364448',paint='#507e82',metal={metal:.4};
        for(const a of [-.63,.64]){
            b.sphere(a,.265,0,.255,.255,.09,'#303b3e',24,12);
            for(const side of [-1,1]){b.sphere(a,.265,side*.085,.16,.16,.012,chrome,20,8,metal);b.sphere(a,.265,side*.101,.1,.1,.012,dark,16,8);}
        }
        for(const side of [-1,1]){
            b.rod([-.64,.27,side*.07],[-.26,.7,side*.11],.025,dark,10,metal);
            b.rod([-.26,.7,side*.11],[.34,.63,side*.1],.027,dark,10,metal);
            b.rod([.34,.63,side*.1],[-.22,.34,side*.1],.028,dark,10,metal);
            b.rod([-.22,.34,side*.1],[-.64,.27,side*.07],.023,dark,10,metal);
            b.rod([.64,.27,side*.065],[.43,1.0,side*.1],.025,chrome,12,metal);
            b.rod([-.62,.28,side*.09],[-.44,.68,side*.13],.029,chrome,12,metal);
            for(let i=0;i<6;i++)b.sphere(-.62+i*.03,.31+i*.058,side*.09,.037,.012,.037,chrome,10,4,metal);
            b.rod([.07,.32,side*.12],[.07,.32,side*.23],.025,dark,10);
        }
        b.box(-.22,.35,-.13,.35,.25,.26,'#7c8c89',metal);
        for(let i=0;i<6;i++)b.box(-.19,.41+i*.032,-.155,.29,.012,.31,chrome,metal);
        b.sphere(.17,.72,0,.3,.145,.19,paint,24,12,metal);
        b.cylinder(.17,.86,0,.038,.014,chrome,16,.038,metal);
        b.box(-.48,.715,-.15,.55,.075,.3,'#414743');b.sphere(-.48,.755,0,.12,.038,.15,'#414743',16,6);
        b.rod([-.75,.35,.22],[.12,.4,.22],.045,chrome,14,metal);b.sphere(-.76,.35,.22,.025,.04,.04,dark,12,6);
        b.rod([.43,.99,-.23],[.43,.99,.23],.022,chrome,12,metal);
        for(const side of [-1,1]){b.rod([.43,.99,side*.17],[.43,.99,side*.28],.029,dark,10);b.rod([.43,1,side*.21],[.4,1.21,side*.27],.009,chrome,8);b.sphere(.4,1.23,side*.27,.035,.055,.018,chrome,12,8,metal);}
        b.sphere(.57,.92,0,.13,.12,.12,chrome,20,10,metal);b.sphere(.68,.92,0,.018,.087,.087,'#f8e8b4',16,8,{emissive:.5});
        b.box(-.67,.65,-.08,.06,.06,.16,'#c86e57',{emissive:.25});
        for(const axle of [-.63,.64])for(let i=0;i<12;i++){
            const a=.15+i*Math.PI*.87/12,q=.15+(i+1)*Math.PI*.87/12;
            b.quad([axle+Math.cos(a)*.285,.265+Math.sin(a)*.285,-.105],[axle+Math.cos(q)*.285,.265+Math.sin(q)*.285,-.105],[axle+Math.cos(q)*.285,.265+Math.sin(q)*.285,.105],[axle+Math.cos(a)*.285,.265+Math.sin(a)*.285,.105],paint,metal);
        }
        motorcycleBody=b;
    }
    pose(m,x,base,z,angle,()=>{
        for(const value of motorcycleBody.data)m.data.push(value);
        for(const axle of [-.63,.64])for(const side of [-1,1])for(let i=0;i<8;i++){
            const a=i*Math.PI/4+travel/.255;m.rod([axle,.265,side*.116],[axle+Math.cos(a)*.15,.265+Math.sin(a)*.15,side*.116],.006,'#a7b7b3',4,{metal:.3});
        }
    });
}
export function pitchMotorcycleMesh(m,start,x,base,z,angle,ground){
    const fx=Math.cos(angle),fz=Math.sin(angle),a=Math.atan2(ground(x+fx*.64,z+fz*.64)-ground(x-fx*.63,z-fz*.63),1.27),c=Math.cos(a),s=Math.sin(a);
    for(let i=start;i<m.data.length;i+=11){
        const dx=m.data[i]-x,dz=m.data[i+2]-z,u=dx*fx+dz*fz,h=m.data[i+1]-base,forward=u*c-h*s;
        m.data[i]=x+dx+fx*(forward-u);m.data[i+2]=z+dz+fz*(forward-u);m.data[i+1]=base+u*s+h*c;
        const n=m.data[i+3]*fx+m.data[i+5]*fz,ny=m.data[i+4],turned=n*c-ny*s;m.data[i+3]+=fx*(turned-n);m.data[i+5]+=fz*(turned-n);m.data[i+4]=n*s+ny*c;
    }
}
