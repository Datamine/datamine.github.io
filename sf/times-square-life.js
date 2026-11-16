import {pose} from './geometry.js';
import {drawPlaque} from './southern-district.js';
import {SQUARE_DIGSITE} from './square-construction-layout.js';
import {TIMES_SQUARE} from './southern-layout.js';

export const SQUARE_LIFE_SIGNS=Object.freeze(['SQUARE COFFEE','USED BOOKS','HILLSBOROUGH WORKS','NOTICE · PUBLIC PLAZA']);
export function createSquareNPCs(){
    const make=(id,name,role,x,z,shirt,approach,extra={})=>({id,name,label:name,questRole:role,x,z,shirt,approach,base:TIMES_SQUARE.base+.05,regional:true,skin:'#b78a66',hair:'#42382e',angle:-Math.PI/2,height:1.8,description:extra.description||'A local making a very large urban experiment feel a little more human.',...extra});
    return [
        make('square-barista','Mira, coffee seller','square-coffee',61,157.35,'#758e7c',{x:60.5,y:157.65},{female:true,longHair:true,description:'A barista measuring the progress of the neighborhood in empty cups.'}),
        make('square-bookseller','Leo, bookseller','square-books',65,152.65,'#8b6d63',{x:64.5,y:152.8},{description:'A bookseller with first editions of books that have not yet been written.'}),
        make('square-busker','June, street musician','square-busker',65.5,156.1,'#7787a1',{x:64.5,y:155.4},{female:true,description:'A street musician playing a song the zoning board has yet to approve.'}),
        make('square-foreman','Vic, demolition foreman','square-foreman',SQUARE_DIGSITE.foreman.x,SQUARE_DIGSITE.foreman.z,'#d89b4b',{x:SQUARE_DIGSITE.foreman.x+.3,y:SQUARE_DIGSITE.foreman.z-.5},{cap:true,description:'The excavator operator has traded a quiet suburb for a very interesting afternoon. His clipboard now lives at the digsite beside the square.'}),
        make('square-diner','Woman','square-diner',63.5,157.2,'#a66d72',{x:62.1,y:157.25},{female:true,longHair:true,seated:true,angle:-Math.PI/2,description:'She came for coffee and stayed to watch an entire neighborhood change its mind.'})
    ];
}
export function squareNPCDialogue(npc,economy){
    const p={...npc,repeat:true,decline:'See you around'};
    if(npc.questRole==='square-foreman')return {...p,intro:'Hillsborough is being demolished and replaced with Times Square. Same longitude, rather different committee meetings.',question:'What is happening here?',choices:[
        {label:'Why Times Square?',receipt:'Somebody wrote “more walkable” on the planning form. The next thing I knew, there were billboards in the magnolias. We kept the old stone facades and added a public square.'},
        {label:'How is the demolition going?',receipt:'Very carefully. That excavator has a smaller turning circle than most of the former residents’ SUVs. The coffee seller gets final approval on dust.'},
        {label:'What is staying?',receipt:'The trees, the neighbors, and the public right of way. We are building a neighborhood, not just somewhere to hang advertisements.'}
    ]};
    if(npc.questRole==='square-coffee')return {...p,intro:'Welcome to Square Coffee. The espresso is local. The skyline is undergoing a somewhat dramatic identity crisis.',question:'Can I get you anything?',choices:[{label:'Coffee · 1 coin',accept:()=>{const r=economy.trade('coffee');return {...r,message:r.ok?'Mira hands you a small, excellent coffee. You drink it while the excavator takes a dignified pause.':r.message};}},{label:'How is the neighborhood?',receipt:'The book cart has good company, June plays every afternoon, and Vic has learned to idle the digger during the quiet songs. It is becoming a place.'}]};
    if(npc.questRole==='square-books')return {...p,intro:'Used books! Architecture, poetry, and one extremely optimistic book on finishing public works.',question:'What are you reading?',choices:[{label:'Recommend a book',receipt:'Invisible Cities. Particularly useful when the city you remember is currently under an excavator.'},{label:'What is that rare edition?',receipt:'A complete history of Hillsborough. The last chapter is being typeset at considerable speed.'}]};
    if(npc.questRole==='square-busker')return {...p,intro:'June taps a rhythm against her guitar. The street sounds considerably better with a bass line.',question:'Listen for a moment?',choices:[{label:'Leave a tip · 1 coin',accept:()=>{const r=economy.trade('busker-tip');return {...r,message:r.ok?'“Thanks!” June plays a bright little flourish just for you.':r.message};}},{label:'What is this song?',receipt:'“I Left My Heart in a Pending Environmental Review.” The chorus is surprisingly catchy.'}]};
    return {...p,intro:'The coffee is good. The people-watching is extraordinary. Yesterday this was a hedge.',question:'How is your afternoon?',choice:'Chat over coffee',receipt:'I am waiting to see whether the next planning notice comes with a guitar solo.'};
}

export function drawSquareStreetLife(m,signs){
    const y=TIMES_SQUARE.base+.04;
    // A real kiosk: espresso machine, serving counter, striped canvas awning.
    pose(m,61,y,156.5,0,()=>{
        m.box(-.51,0,-.37,1.02,.78,.74,'#668678','wood');m.box(-.56,.78,-.4,1.12,.07,.82,'#c6b89c','stone');
        for(const x of [-.5,.5])m.rod([x,.05,-.35],[x,1.7,-.35],.025,'#384e4b',8);
        for(let i=0;i<8;i++)m.box(-.6+i*.15,1.6,-.49,.15,.06,1.03,i%2?'#ece1bf':'#6f8a78');
        m.box(-.23,.85,-.18,.45,.35,.25,'#c1c6bc',{metal:.3});m.box(-.18,.97,.08,.34,.11,.025,'#344b4c');
        for(const x of [-.38,.33])m.cylinder(x,.85,.25,.045,.07,'#ede7d1',12);
        drawPlaque(m,signs,'SQUARE COFFEE',0,1.43,.54,1.1,.18);
    });
    // Dog-eared stock, little wheels, and a handwritten sign at the book cart.
    pose(m,65,y,152,0,()=>{
        m.box(-.39,.27,-.28,.78,.38,.56,'#8d7051','wood');
        for(const x of [-.28,.28])m.sphere(x,.15,0,.06,.11,.11,'#47514e',12,6);
        for(let i=0;i<9;i++)m.box(-.34+i*.075,.66,-.23,.055,.12+(i%3)*.025,.28,['#6c8a8f','#b69364','#8f685e'][i%3],'wood');
        drawPlaque(m,signs,'USED BOOKS',0,.36,.29,.7,.15);
    });
    const tx=63.5,tz=156.7;
    m.cylinder(tx,y+.58,tz,.34,.055,'#a17d52',20);m.cylinder(tx,y,tz,.035,.58,'#56635c',10);
    for(const z of [tz-.52,tz+.52]){m.box(tx-.19,y+.34,z-.17,.38,.06,.34,'#739088','wood');for(const dx of [-.15,.15])m.rod([tx+dx,y,z],[tx+dx,y+.35,z],.018,'#435a54',8);m.box(tx-.2,y+.4,z+(z<tz?-.17:.14),.4,.38,.035,'#739088','wood');}
    m.cylinder(tx+.13,y+.635,tz,.04,.06,'#e7e0c8',10);m.box(tx-.19,y+.64,tz-.06,.15,.009,.11,'#ded9c5');
    // Quiet garden replaces the novelty red stair sculpture.
    m.box(61.4,y,158.7,3.2,.28,2.6,'#9a9d8c','stone');m.box(61.55,y+.28,158.85,2.9,.018,2.3,'#6b7c54','dirt');
    for(const [x,z] of [[61.95,159.3],[63.95,159.3],[63,160.6]]){m.cylinder(x,y+.3,z,.045,1.4,'#827053',10);m.sphere(x,y+1.6,z,.55,.65,.5,'#668657',16,8);}
    for(const z of [158.65,161.25]){m.box(61.7,y+.31,z,2.6,.07,.28,'#a78c68','wood');for(const x of [62,64])m.box(x,y+.06,z+.04,.04,.26,.16,'#56665d');}
    // Guitar and open case beside the busker; ordinary civic street furniture.
    m.sphere(65.65,y+.31,156.3,.14,.2,.055,'#a47d4f',16,8);m.rod([65.65,y+.39,156.3],[65.72,y+.95,156.3],.025,'#785c43',8);
    m.box(65.1,y+.02,155.8,.45,.045,.24,'#45565a');
    for(const [x,z] of [[65.6,158.1],[59.8,153],[69.4,155.8]]){m.box(x-.23,y,z-.3,.46,.25,.6,'#858d80','stone');m.sphere(x,y+.35,z,.25,.2,.29,'#6c895c',14,8);}
    for(const [x,z] of [[57.2,155.7],[69.5,153]]){m.cylinder(x,y,z,.11,.4,'#4f6664',14);for(let i=0;i<5;i++)m.rod([x-.07+i*.035,y+.05,z+.1],[x-.07+i*.035,y+.35,z+.1],.006,'#a5aba0',6);}
    for(const x of [61.3,64.8])m.cylinder(x,y-.015,154.5,.13,.025,'#65716b',18);
}
