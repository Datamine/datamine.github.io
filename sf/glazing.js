/** Glass is separate from decorative, opaque window materials on scenery. */
export const GLASS_UV=-.9;
export const isGlassVertex=(data,vertex)=>Math.abs(data[vertex*11+9]-GLASS_UV)<.015;
export function meshGlassTriangles(data){
    const triangles=[];for(let start=0;start<data.length/11;start+=3)if(isGlassVertex(data,start)){
        const at=start*11;triangles.push({start,data:data.subarray?data.subarray(at,at+33):data.slice(at,at+33),center:[0,1,2].map(k=>(data[at+k]+data[at+11+k]+data[at+22+k])/3)});
    }return triangles;
}
/** Only glass belonging to the wall sections drawn this frame is submitted.
 * All panes share one depth-tested, back-to-front blended draw, after actors.
 * Reuse the upload array so camera rotation creates no per-pane GPU buffers. */
export function createGlazingBatch(){
    let submitted=[],storage=new Float32Array(0);
    return {
        begin(){submitted.length=0;},
        collect(gpu,start,count){for(const t of gpu.glass||[])if(t.start>=start&&t.start<start+count)submitted.push(t);},
        data(eye){
            for(const t of submitted){const dx=t.center[0]-eye[0],dy=t.center[1]-eye[1],dz=t.center[2]-eye[2];t.distance=dx*dx+dy*dy+dz*dz;}
            submitted.sort((a,b)=>b.distance-a.distance);
            const size=submitted.length*33;if(storage.length<size)storage=new Float32Array(Math.max(size,storage.length*2));
            for(let i=0;i<submitted.length;i++)storage.set(submitted[i].data,i*33);
            return storage.subarray(0,size);
        },
        get triangles(){return submitted.length;}
    };
}
