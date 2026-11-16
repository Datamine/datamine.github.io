import {pose} from './geometry.js';

export const ZOO_ENCLOSURES=Object.freeze([
    // Stack the eastern habitats on dry land below Merced's southern lobe.
    // The compact pens leave a visitor aisle and stay inside the city terrain.
    {id:'zoo-giraffes',label:'Giraffes',species:'giraffe',x:23.6,z:94.6,w:3.4,d:2.6,count:1,entry:{x:21.2,y:94.1},description:'A giraffe surveys the city from an enviable height. Still cannot find affordable housing.'},
    {id:'zoo-penguins',label:'Penguins',species:'penguin',x:23.6,z:91.4,w:3.4,d:2.8,count:4,entry:{x:21.2,y:90.9},description:'A committee of penguins, formally dressed for a meeting about fish. The motion passes unanimously.'},
    {id:'zoo-monkeys',label:'Squirrel monkeys',species:'monkey',x:18.7,z:97.5,w:3.4,d:2.2,count:2,entry:{x:15.9,y:97.3},description:'Two squirrel monkeys debate the nature of experience. One has already stolen the footnotes.'},
    {id:'zoo-deer',label:'Deer',species:'deer',x:18.7,z:94.7,w:3.4,d:2.2,count:2,entry:{x:15.9,y:94.2},description:'Two deer browse peacefully. They have declined to comment on their neighbor’s recent escape.'}
].map(Object.freeze));

export function drawZooEnclosures(m,ground,{include=()=>true}={}){
    return ZOO_ENCLOSURES.filter(include).map(s=>{
        const start=m.data.length,base=ground(s.x,s.z),left=s.x-s.w/2,top=s.z-s.d/2;
        m.box(left,base-.04,top,s.w,.06,s.d,s.species==='penguin'?'#b4b9aa':'#87956a',s.species==='penguin'?'stone':'grass');
        const corners=[[left,top],[left+s.w,top],[left+s.w,top+s.d],[left,top+s.d]];
        for(let side=0;side<4;side++){
            const a=corners[side],b=corners[(side+1)%4],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.45);
            for(let i=0;i<=n;i++){const x=a[0]+(b[0]-a[0])*i/n,z=a[1]+(b[1]-a[1])*i/n;m.cylinder(x,base,z,.025,.85,'#657d70',8);}
            for(const h of [.22,.55,.85])m.rod([a[0],base+h,a[1]],[b[0],base+h,b[1]],.018,'#71867b',6);
        }
        if(s.species==='monkey'){
            for(const dx of [-.9,.9])m.cylinder(s.x+dx,base,s.z,.06,1.7,'#8c7750',12,.06,'wood');
            m.rod([s.x-.9,base+1.55,s.z],[s.x+.9,base+1.55,s.z],.035,'#9e8662',8,'wood');
        }
        if(s.species==='penguin'){
            m.cylinder(s.x+.65,base+.025,s.z,.64,.035,'#719eaa',40,.64,{water:.5});
            for(const [x,z,r] of [[-.9,-.8,.28],[.8,.9,.3]])m.sphere(s.x+x,base+.11,s.z+z,r,.18,r*.8,'#a3aca4',14,8,'stone');
        }else{
            m.box(s.x-.6,base+.05,top+.17,1.2,.23,.32,'#967953','wood');
            m.box(s.x-.5,base+.285,top+.2,1,.035,.25,'#c4af63');
        }
        const lo=[left-.03,base-.04,top-.03],hi=[left+s.w+.03,base+2.8,top+s.d+.03];
        return {...s,kind:'animals',base,start,count:m.data.length-start,lo,hi,footprint:corners};
    });
}

function drawHoofedAnimal(m,s,phase){
    const tall=s.species==='giraffe',fur=tall?'#d6ad62':'#ad8056',dark=tall?'#8c633c':'#68513d',body=tall?.95:.53;
    m.sphere(0,body,0,tall?.24:.2,tall?.34:.23,tall?.48:.34,fur,20,12);
    for(const side of [-1,1])for(const end of [-1,1]){
        const x=side*(tall?.14:.12),z=end*(tall?.3:.22),swing=Math.sin(phase+(side===end?Math.PI:0))*.07;
        m.rod([x,body-.14,z],[x,body*.46,z+swing],tall?.055:.043,fur,10);
        m.rod([x,body*.46,z+swing],[x,.065,z-swing],tall?.04:.03,fur,10);
        m.sphere(x,.055,z-swing,.055,.045,.07,dark,10,6);
    }
    m.rod([0,body+.12,.26],[0,tall?1.97:.95,tall?.51:.39],tall?.115:.075,fur,14);
    const head=tall?2.05:1.0;
    m.sphere(0,head,.51,tall?.13:.11,tall?.16:.12,tall?.25:.16,fur,18,10);
    for(const side of [-1,1]){
        m.sphere(side*.13,head+.13,.42,.11,.045,.06,fur,12,6);
        m.sphere(side*.115,head+.025,.6,.023,.026,.022,'#30392b',10,6);
        m.rod([side*.065,head+.1,.48],[side*.085,head+(tall?.29:.35),.44],.018,dark,8);
        if(!tall)m.rod([side*.08,head+.22,.46],[side*.16,head+.31,.5],.012,dark,6);
    }
    m.rod([0,body,-.33],[.05*Math.sin(phase),body-.23,-.53],.025,fur,8);
    if(tall){
        for(const side of [-1,1])for(let i=0;i<6;i++)m.sphere(side*.225,body+(i%2)*.13-.04,-.3+i*.12,.015,.07,.045,dark,10,6);
        for(let i=0;i<6;i++)m.sphere(.105,1.2+i*.13,.31+i*.03,.025,.045,.045,dark,10,6);
    }else for(const side of [-1,1])for(let i=0;i<4;i++)m.sphere(side*.18,.58,-.18+i*.11,.018,.025,.025,'#dfcba1',8,6);
}

function drawZooPenguin(m,phase){
    m.sphere(0,.29,0,.14,.25,.13,'#354451',18,12);m.sphere(0,.28,.095,.105,.19,.05,'#ecebd8',16,10);
    m.sphere(0,.55,.02,.12,.12,.115,'#354451',18,10);
    m.rod([0,.52,.11],[0,.5,.23],.045,'#d9a357',10);
    for(const side of [-1,1]){
        m.sphere(side*.065,.035,.055+Math.sin(phase+side)*.025,.055,.025,.085,'#c79652',10,6);
        m.rod([side*.115,.4,0],[side*(.18+.025*Math.sin(phase)),.18,-.04],.045,'#354451',12);
        m.sphere(side*.08,.56,.105,.018,.02,.018,'#1f292b',10,6);
    }
}

export function drawZooAnimals(m,time,ground,{reduced=false,near=()=>true,monkeyTaken=false}={}){
    for(const s of ZOO_ENCLOSURES){
        if(!near(s.x,s.z))continue;
        for(let i=0;i<s.count;i++){
            if(s.species==='monkey'&&i===0&&monkeyTaken)continue;
            const t=(reduced?0:time*.00018)+i*Math.PI*2/s.count,a=t+(s.species==='penguin'?i*.4:0);
            const x=s.x+Math.cos(a)*(s.w/2-.75),z=s.z+Math.sin(a)*(s.d/2-.65),heading=Math.atan2(Math.cos(a)*(s.d/2-.65),-Math.sin(a)*(s.w/2-.75));
            pose(m,x,ground(s.x,s.z)+.03,z,heading-Math.PI/2,()=>{
                if(s.species==='monkey')drawMonkey(m,reduced?0:time*.004+i);
                else if(s.species==='penguin')drawZooPenguin(m,reduced?0:time*.006+i);
                else drawHoofedAnimal(m,s,reduced?0:time*.004+i*Math.PI);
            });
        }
    }
}


/** Small expressive primate, reused in the habitat, on the player's shoulder,
 * and beside the professor after the quest. Local feet begin at y=0. */
export function drawMonkey(m,phase=0){
    const fur='#997348',face='#d9ba89',dark='#3d3930';
    m.sphere(0,.32,0,.16,.23,.14,fur,14,8);m.sphere(0,.6,.035,.16,.15,.14,fur,14,8);
    m.sphere(0,.58,.14,.115,.095,.035,face,12,8);
    for(const side of [-1,1]){
        m.sphere(side*.16,.6,.025,.055,.07,.035,face,10,6);m.sphere(side*.054,.61,.17,.021,.024,.016,dark,8,5);
        const swing=Math.sin(phase+side)*.025;
        m.rod([side*.14,.43,0],[side*.23,.18,.09+swing],.035,fur,10);m.sphere(side*.23,.17,.09+swing,.045,.04,.055,face,10,6);
        m.rod([side*.085,.2,0],[side*.12,.04,.11-swing],.045,fur,10);m.sphere(side*.12,.035,.13-swing,.055,.03,.08,dark,10,6);
    }
    let previous=[0,.25,-.12];for(let i=1;i<=9;i++){
        const a=i*Math.PI/8,next=[Math.sin(a)*.18,.25+Math.sin(a*.5)*.18,-.12-i*.025];m.rod(previous,next,.025,fur,8);previous=next;
    }
}
