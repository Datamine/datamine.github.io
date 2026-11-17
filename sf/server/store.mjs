import {Worker} from 'node:worker_threads';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';

/** All SQLite work runs off the simulation thread. Batched snapshots never
 * put disk I/O in a movement tick. Redis is an optional durable adapter. */
export async function createStore({redisURL=process.env.REDIS_URL,filename=process.env.STATE_FILE||fileURLToPath(new URL('./data/world.sqlite',import.meta.url))}={}){
    if(redisURL){
        const {createClient}=await import('redis'),client=createClient({url:redisURL,socket:{connectTimeout:5000}});client.on('error',e=>console.error('Redis:',e.message));await client.connect();
        const prefix='loeberland:v1:',lease=prefix+'simulation-owner',owner=randomUUID();
        if(!await client.set(lease,owner,{NX:true,PX:15000})){await client.close();throw Error('This Redis world already has a simulation owner. Run one server process for the common world.');}
        let leaseHealthy=true;
        const timer=setInterval(async()=>{try{leaseHealthy=!!await client.eval('if redis.call("GET",KEYS[1])==ARGV[1] then return redis.call("PEXPIRE",KEYS[1],15000) else return 0 end',{keys:[lease],arguments:[owner]});}catch{leaseHealthy=false;}},4000);timer.unref();
        return {kind:'redis',get leaseHealthy(){return leaseHealthy;},get:async key=>{const value=await client.get(prefix+key);return value===null?null:JSON.parse(value);},
            batch:async entries=>{if(!entries.length)return;const result=await client.eval('if redis.call("GET",KEYS[1])~=ARGV[1] then return 0 end; for i=2,#KEYS do redis.call("SET",KEYS[i],ARGV[i]) end; return 1',{keys:[lease,...entries.map(([key])=>prefix+key)],arguments:[owner,...entries.map(([,value])=>JSON.stringify(value))]});if(!result){leaseHealthy=false;throw Error('World ownership lease was lost. Writes stopped.');}},
            names:async()=>Object.values(await client.hGetAll(prefix+'names')).map(JSON.parse),
            rename:async(nameOwner,canonical,name,changed)=>{const result=await client.eval('if redis.call("GET",KEYS[1])~=ARGV[1] then return 0 end; redis.call("HSET",KEYS[2],ARGV[2],ARGV[3]); return 1',{keys:[lease,prefix+'names'],arguments:[owner,nameOwner,JSON.stringify({owner:nameOwner,canonical,name,changed})]});if(!result)throw Error('World ownership lease was lost.');},
            close:async()=>{clearInterval(timer);await client.eval('if redis.call("GET",KEYS[1])==ARGV[1] then return redis.call("DEL",KEYS[1]) else return 0 end',{keys:[lease],arguments:[owner]});await client.close();}};
    }
    const worker=new Worker(new URL('./sqlite-worker.mjs',import.meta.url),{workerData:{filename}}),pending=new Map();let serial=0;
    worker.on('message',({id,result,error})=>{const task=pending.get(id);if(!task)return;pending.delete(id);error?task.reject(Error(error)):task.resolve(result);});
    worker.on('error',error=>{for(const task of pending.values())task.reject(error);pending.clear();});
    const call=(method,...args)=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});worker.postMessage({id,method,args});});
    return {kind:'sqlite',get:async key=>{const value=await call('get',key);return value===null?null:JSON.parse(value);},batch:entries=>call('batch',entries.map(([key,value])=>[key,JSON.stringify(value)])),names:()=>call('names'),rename:(...args)=>call('rename',...args),close:async()=>{await call('close');await worker.terminate();}};
}

export function createMemoryStore(){
    const values=new Map(),names=new Map();return {kind:'memory',get:async key=>values.get(key)??null,batch:async entries=>{for(const [key,value] of entries)values.set(key,structuredClone(value));},names:async()=>[...names.values()],rename:async(owner,canonical,name,changed)=>{names.set(owner,{owner,canonical,name,changed});},close:async()=>{}};
}
