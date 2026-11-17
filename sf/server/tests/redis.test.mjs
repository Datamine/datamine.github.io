import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer,connect} from 'node:net';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createClient} from 'redis';
import {createStore} from '../store.mjs';

test('Redis snapshots persist, ownership is exclusive and losing a lease prevents stale writes',{skip:process.env.RUN_REDIS_TESTS!=='1'},async()=>{
    const probe=createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
    const dir=await mkdtemp(join(tmpdir(),'loeberland-redis-')),server=spawn('redis-server',['--bind','127.0.0.1','--port',String(port),'--save','','--appendonly','no','--dir',dir],{stdio:'ignore'}),stores=[];let raw;
    try{
        for(let i=0;i<100;i++){const ready=await new Promise(resolve=>{const socket=connect(port,'127.0.0.1');socket.once('connect',()=>{socket.destroy();resolve(true);});socket.once('error',()=>resolve(false));});if(ready)break;await new Promise(resolve=>setTimeout(resolve,20));}
        const redisURL='redis://127.0.0.1:'+port,first=await createStore({redisURL});stores.push(first);await first.batch([['test',{value:42}]]);await first.rename('owner','baypilot','BayPilot',1000000);assert.equal((await first.get('test')).value,42);
        await assert.rejects(createStore({redisURL}),/already has a simulation owner/);
        await first.close();stores.pop();const second=await createStore({redisURL});stores.push(second);assert.equal((await second.get('test')).value,42);assert.equal((await second.names())[0].name,'BayPilot');
        raw=createClient({url:redisURL});raw.on('error',()=>{});await raw.connect();await raw.del('loeberland:v1:simulation-owner');const third=await createStore({redisURL});stores.push(third);
        await assert.rejects(second.batch([['test',{value:0}]]),/lease was lost/);assert.equal((await third.get('test')).value,42);
    }finally{for(const store of stores)await store.close();await raw?.close();server.kill('SIGTERM');await new Promise(resolve=>server.exitCode!==null?resolve():server.once('exit',resolve));await rm(dir,{recursive:true,force:true});}
});
