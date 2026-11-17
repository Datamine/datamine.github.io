import {pose} from './geometry.js';

export function drawCoffeeCup(m,x,y,z,{steam=0}={}){
    m.cylinder(x,y,z,.06,.115,'#ece6ce',16,.072);m.cylinder(x,y+.117,z,.061,.004,'#624733',16,.061);
    for(let i=0;i<9;i++){const a=i*Math.PI*2/9,b=(i+1)*Math.PI*2/9;m.rod([x+.068+Math.cos(a)*.029,y+.061+Math.sin(a)*.034,z],[x+.068+Math.cos(b)*.029,y+.061+Math.sin(b)*.034,z],.009,'#ded5b8',6);}
    if(steam>0)for(let i=0;i<2;i++){const offset=Math.sin(steam*2+i)*.014;m.rod([x+i*.025-.012,y+.14,z],[x+i*.025-.012+offset,y+.23,z],.003,'#c9d5c9',4);}
}
export function drawBankInterior(m,b,base){
    const {x,y:z,w,d}=b;
    m.box(x+.12,base+.002,z+.12,w-.24,.014,d-.24,'#d4cdb3','stone');
    m.box(x+.2,base,z+.62,w-.95,.8,.36,'#376a51','wood');m.box(x+.16,base+.8,z+.58,w-.87,.065,.44,'#c6b68d','stone');
    for(let i=0;i<3;i++)m.box(x+.37+i*.47,base+.87,z+.68,.29,.006,.18,'#e7dec3');
    m.box(x+w-.66,base,z+.22,.42,1.34,.38,'#687970',{metal:.25});m.box(x+w-.63,base+.2,z+.615,.36,.98,.012,'#84958a');m.cylinder(x+w-.45,base+.68,z+.64,.065,.018,'#d1c19b',16,.065);m.rod([x+w-.45,base+.68,z+.665],[x+w-.45,base+.78,z+.665],.011,'#4c6257',8);
    // A quiet coffee station, with a real cup and brass espresso fittings.
    m.box(x+.23,base,z+d-.75,.57,.64,.43,'#8f7959','wood');m.box(x+.2,base+.64,z+d-.78,.63,.045,.49,'#c9bd9a');
    m.box(x+.3,base+.69,z+d-.69,.28,.24,.22,'#a7b6a9',{metal:.35});m.cylinder(x+.44,base+.93,z+d-.58,.075,.035,'#394f48',12,.075);drawCoffeeCup(m,x+.62,base+.69,z+d-.47);
    for(let i=0;i<3;i++)m.sphere(x+w-.42,base+.15+i*.14,z+d-.5,.22,.16,.22,['#658766','#78936a','#537555'][i],10,7);m.cylinder(x+w-.42,base,z+d-.5,.14,.21,'#967554',12,.12,'stone');
    b.interiorObstacles=[[[x+.16,z+.58],[x+w-.67,z+.58],[x+w-.67,z+1.02],[x+.16,z+1.02]],[[x+w-.7,z+.2],[x+w-.2,z+.2],[x+w-.2,z+.67],[x+w-.7,z+.67]],[[x+.2,z+d-.8],[x+.86,z+d-.8],[x+.86,z+d-.27],[x+.2,z+d-.27]]];
}
export function drawBankBillboard(m,b,base,signs){
    const cx=b.x+b.w/2,z=b.y+b.d*.57,width=b.w-.25,height=.98,y=base+.95,uv=signs.get('green-bank-roof');
    for(const side of [-1,1]){const x=cx+side*width*.33;m.rod([x,base,z],[x,y+height,z],.045,'#536960',10);m.rod([x,base,z-.55],[x,y+.1,z],.03,'#839487',8);}
    m.box(cx-width/2-.045,y-.045,z-.06,width+.09,height+.09,.12,'#c3cab5','wood');m.box(cx-width/2,y,z+.065,width,height,.012,'#295a44');
    if(uv){m.quad([cx-width/2,y,z+.079],[cx+width/2,y,z+.079],[cx+width/2,y+height,z+.079],[cx-width/2,y+height,z+.079],'#ffffff',uv);m.quad([cx+width/2,y,z-.125],[cx-width/2,y,z-.125],[cx-width/2,y+height,z-.125],[cx+width/2,y+height,z-.125],'#ffffff',uv);}
    for(const x of [cx-width*.3,cx+width*.3]){m.rod([x,base+.1,z+.25],[x,base+.55,z+.5],.022,'#8b9a89',8);m.box(x-.09,base+.51,z+.45,.18,.08,.13,'#b5c4ae');}
}
export function drawDrinkingCoffee(m,player,base,time,started,duration=1600){
    const t=Math.max(0,Math.min(1,(time-started)/duration)),lift=Math.sin(t*Math.PI);
    pose(m,player.x+.5,base,player.y+.5,player.angle-Math.PI/2,()=>drawCoffeeCup(m,.18,.96+lift*.36,.22,{steam:time*.001}));
}
