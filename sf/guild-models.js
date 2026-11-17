/** Small code-native lodge and grocery details share the existing material
 * atlas. No bitmap download or per-frame texture construction is required. */
export function drawGuildInterior(m,b,base){
    const {x,y:z,w,d}=b;
    for(let j=0;j<8;j++)for(let i=0;i<9;i++)m.box(x+.12+i*(w-.24)/9,base+.002,z+.12+j*(d-.24)/8,(w-.24)/9,.012,(d-.24)/8,(i+j)%2?'#3b4948':'#ddd4b7','stone');
    for(const side of [-1,1]){
        const xx=side<0?x+.22:x+w-.63;
        m.box(xx,base+.38,z+.6,.42,.08,d-1.3,'#7e3034','wood');m.box(side<0?xx:xx+.35,base+.45,z+.6,.07,.65,d-1.3,'#72403b','wood');
        for(const zz of [z+.7,z+d-1])m.box(xx+.04,base,zz,.33,.4,.09,'#9d7e4f','wood');
    }
    m.box(x+w/2-.55,base,z+.32,1.1,.65,.43,'#76644c','wood');m.box(x+w/2-.6,base+.65,z+.27,1.2,.07,.53,'#d0bd86','stone');
    for(const xx of [x+.55,x+w-.55]){m.cylinder(xx,base,z+.35,.13,1.72,'#d1c5a0',16,.11,'stone');m.sphere(xx,base+1.84,z+.35,.18,.18,.18,'#c4aa66',16,8,{metal:.4});}
    const cx=x+w/2,cz=z+d/2,brass='#c5a967';
    for(const [a,b] of [[[cx-.6,base+.025,cz+.45],[cx,base+.025,cz-.55]],[[cx,base+.025,cz-.55],[cx+.6,base+.025,cz+.45]],[[cx-.48,base+.027,cz-.05],[cx-.48,base+.027,cz+.5]],[[cx-.48,base+.027,cz+.5],[cx+.48,base+.027,cz+.5]]])m.rod(a,b,.022,brass,6,{metal:.35});
}
export function drawWholeFoodsInterior(m,b,base){
    const {x,y:z,w,d}=b;
    m.box(x+.12,base,z+.12,w-.24,.012,d-.24,'#c8c5ae','stone');
    for(const xx of [x+.25,x+w-.7]){
        m.box(xx,base,z+.3,.45,.76,d-1,'#8b7955','wood');
        for(let j=0;j<5;j++)for(let i=0;i<2;i++)m.sphere(xx+.12+i*.2,base+.82,z+.5+j*.33,.085,.075,.08,['#b04e3d','#63854d','#d3ae50'][(i+j)%3],8,5);
    }
    m.box(x+w/2-.5,base,z+.25,1,.74,.4,'#48654c','wood');m.box(x+w/2+.15,base+.74,z+.3,.21,.27,.12,'#4a5552');
}
export function drawGuildEmblem(m,b,base,height){
    const cx=b.x+b.w/2,z=b.y+b.d+.108,y=base+height-.9,c='#c6a767';
    for(const [a,d] of [[[cx-.3,y,z],[cx,y+.48,z]],[[cx,y+.48,z],[cx+.3,y,z]],[[cx-.23,y+.25,z],[cx-.23,y-.08,z]],[[cx-.23,y-.08,z],[cx+.23,y-.08,z]]])m.rod(a,d,.018,c,7,{metal:.35});
}
export function drawPeptideVial(m,x,base,z,time=0){
    m.cylinder(x,base+.03,z,.095,.28,'#92c7bd',16,.095,{metal:.12});m.cylinder(x,base+.055,z,.073,.16,'#67b8d0',16,.073,{emissive:.2});
    m.cylinder(x,base+.31,z,.104,.065,'#ddd5b7',16,.104,{metal:.35});
    m.box(x-.096,base+.15,z-.025,.025,.1,.05,'#f4efdb');m.box(x+.017,base+.13,z+.081,.05,.09,.014,'#edf3d9');
    // A small glint makes the vial legible among produce and pavement.
    const glow=.01+.007*Math.sin(time*.003);m.sphere(x+.055,base+.25,z-.055,glow,glow,glow,'#d9ffff',8,4,{emissive:.5});
}
