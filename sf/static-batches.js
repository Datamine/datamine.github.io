/** Repack only the GPU copy. CPU triangle order stays untouched for picking,
 * cutaways and object ranges. Broad bounds include every triangle vertex, so
 * tall landmarks and geometry crossing a cell edge cannot disappear early. */
export function packStaticMesh(source,cellSize=12){
    const buckets=new Map(),keyAt=i=>{
        const x=(source[i]+source[i+11]+source[i+22])/3,z=(source[i+2]+source[i+13]+source[i+24])/3;
        return (Math.floor(x/cellSize)+1024)*2048+Math.floor(z/cellSize)+1024;
    };
    for(let i=0;i<source.length;i+=33){
        const key=keyAt(i);let b=buckets.get(key);if(!b){b={triangles:0,lo:[Infinity,Infinity,Infinity],hi:[-Infinity,-Infinity,-Infinity]};buckets.set(key,b);}b.triangles++;
        for(const j of [0,11,22])for(let k=0;k<3;k++){const v=source[i+j+k];b.lo[k]=Math.min(b.lo[k],v);b.hi[k]=Math.max(b.hi[k],v);}
    }
    let offset=0;const batches=[];for(const b of buckets.values()){b.start=offset/11;b.count=b.triangles*3;b.cursor=offset;offset+=b.triangles*33;batches.push(b);}
    const data=new Float32Array(source.length);for(let i=0;i<source.length;i+=33){const b=buckets.get(keyAt(i));data.set(source.subarray(i,i+33),b.cursor);b.cursor+=33;}
    return {data,batches};
}
export function batchInFrustum(batch,matrix){
    const {lo,hi}=batch,points=[];
    for(const x of [lo[0],hi[0]])for(const y of [lo[1],hi[1]])for(const z of [lo[2],hi[2]])points.push([matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12],matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13],matrix[2]*x+matrix[6]*y+matrix[10]*z+matrix[14],matrix[3]*x+matrix[7]*y+matrix[11]*z+matrix[15]]);
    for(let axis=0;axis<3;axis++)for(const side of [-1,1])if(points.every(p=>p[axis]*side>p[3]))return false;
    return true;
}
