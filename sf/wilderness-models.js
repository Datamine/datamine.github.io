import {pose} from './geometry.js';
export function drawWildMonster(m,actor,time=0){
    const bear=actor.combatKind==='bear',ice=actor.combatKind==='ice-giant',motion=actor.motion||0,phase=actor.phase||0;
    pose(m,actor.x,actor.base,actor.z,actor.angle+Math.PI/2,()=>{
        if(bear){
            const fur='#80604a',light='#af8a63',bob=actor.affection?Math.sin(time*.008)*.06:0;
            m.sphere(0,.79,0,.47,.49,.67,fur,16,10,'stucco');m.sphere(0,1.03,.43,.38,.4,.38,fur,16,10,'stucco');
            m.sphere(0,.96,.72,.23,.17,.18,light,14,8);m.sphere(0,1.02,.86,.10,.07,.06,'#303634',12,7);
            for(const side of [-1,1]){m.sphere(side*.25,1.37+bob,.41,.13,.15,.10,fur,12,7);m.sphere(side*.25,1.38+bob,.49,.075,.085,.016,light,10,6);m.sphere(side*.16,1.15,.73,.035,.036,.022,'#282d29',10,6);m.sphere(side*.17,1.16,.747,.009,.009,.008,'#efe6d2',8,5);}
            for(const side of [-1,1])for(const end of [-1,1]){const lift=motion*Math.max(0,Math.sin(phase+side*end*Math.PI))*.12;m.sphere(side*.30,.29+lift,end*.39,.15,.30,.17,fur,12,7,'stucco');m.sphere(side*.3,.11+lift,end*.39+.07,.17,.12,.22,'#614a3d',12,7);}
            m.sphere(0,.85,-.62,.13,.13,.13,fur,10,6);
        }else{
            const skin=ice?'#9dcfdf':'#d1ddd8',shade=ice?'#5b94b9':'#8fabb5',frost='#e1f3ee';
            m.sphere(0,1.85,0,.7,.94,.43,skin,16,11,'stucco');m.sphere(0,2.83,.03,.39,.47,.32,skin,14,10);
            for(const side of [-1,1]){
                const stride=Math.sin(phase+side*Math.PI)*motion*.25,hand=[side*.91,1.1+stride,.08];
                m.rod([side*.31,1.21,0],[side*.35,.58,-stride],.23,shade,12);m.rod([side*.35,.58,-stride],[side*.36,.16,stride],.20,skin,12);m.sphere(side*.36,.15,stride+.12,.23,.16,.34,shade,12,7);
                m.sphere(side*.64,2.36,0,.35,.39,.31,frost,12,8);m.rod([side*.66,2.3,0],[side*.91,1.75,-stride],.22,skin,12);m.rod([side*.91,1.75,-stride],hand,.18,shade,12);m.sphere(...hand,.23,.25,.21,skin,12,7);
                m.sphere(side*.13,2.90,.315,.06,.035,.022,'#4b7488',10,5,{emissive:.22});
                for(let i=0;i<3;i++){const x=side*(.5+i*.13),y=2.55-i*.03;m.tri([x-.10,y,-.1],[x+.10,y,-.1],[x+side*.12,y+.43-i*.06,0],frost);m.tri([x+.10,y,.1],[x-.10,y,.1],[x+side*.12,y+.43-i*.06,0],skin);}
            }
            m.sphere(0,2.72,.35,.09,.11,.10,shade,12,6);
            for(let i=0;i<5;i++){const x=(i-2)*.07;m.tri([x-.045,2.68,.30],[x+.045,2.68,.30],[x,2.32-Math.abs(i-2)*.05,.25],frost);}
            if(ice){m.rod([1.04,.1,.15],[1.04,1.28,.15],.055,shade,10);m.sphere(1.04,1.45,.15,.17,.38,.17,'#a7e1ec',6,4,{emissive:.1});}
            else m.sphere(-.94,1.08,.17,.32,.32,.3,'#d8e6df',12,8,'stucco');
        }
    });
}
