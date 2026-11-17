import {MP_PROTOCOL} from '../../multiplayer-protocol.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {startServer} from '../index.mjs';
import {createMemoryStore} from '../store.mjs';
import {fixtureGeometry} from './fixtures.mjs';

test('real WebSockets authenticate, exchange nearby avatars, moderate names and recover the same account',async()=>{
    const server=await startServer({port:0,geometry:fixtureGeometry(),store:createMemoryStore(),allowDebug:true}),clients=[];
    const open=async token=>{
        const ws=new WebSocket('ws://127.0.0.1:'+server.port+'/ws'),messages=[];clients.push(ws);ws.on('message',(data,binary)=>{if(!binary)messages.push(JSON.parse(data));});
        await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});ws.send(JSON.stringify({type:'hello',protocol:MP_PROTOCOL,token,privateState:{}}));
        return {ws,messages};
    };
    const until=async predicate=>{for(let i=0;i<200;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,10));}assert.fail('Timed out waiting for a WebSocket event');};
    try{
        const a=await open('a'.repeat(64)),b=await open('b'.repeat(64));await until(()=>a.messages.some(m=>m.type==='welcome')&&b.messages.some(m=>m.type==='interest'&&m.enter.length));
        a.ws.send(JSON.stringify({type:'command',request:1,action:'rename',args:{name:'BayPilot'}}));await until(()=>a.messages.some(m=>m.request===1));assert.equal(a.messages.find(m=>m.request===1).ok,true);
        b.ws.send(JSON.stringify({type:'command',request:2,action:'rename',args:{name:'baypilot'}}));await until(()=>b.messages.some(m=>m.request===2));assert.equal(b.messages.find(m=>m.request===2).ok,false);
        b.ws.send(JSON.stringify({type:'command',request:3,action:'rename',args:{name:'sh1t'}}));await until(()=>b.messages.some(m=>m.request===3));assert.equal(b.messages.find(m=>m.request===3).ok,false);
        const reconnect=await open('a'.repeat(64));await until(()=>reconnect.messages.some(m=>m.type==='welcome'));assert.equal(reconnect.messages.find(m=>m.type==='welcome').name,'BayPilot');
        const health=await(await fetch('http://127.0.0.1:'+server.port+'/healthz')).json();assert.equal(health.players,2);assert.equal(health.ok,true);
        assert.equal((await fetch('http://127.0.0.1:'+server.port+'/sf/server/package.json')).status,404);
    }finally{for(const ws of clients)ws.terminate();await server.close();}
});
