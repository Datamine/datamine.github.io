import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,relative,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {monitorEventLoopDelay} from 'node:perf_hooks';
import {WebSocketServer,WebSocket} from 'ws';
import {createWorldModel} from '../world.js';
import {createGame} from './game.mjs';
import {createStore} from './store.mjs';
import {MP_PROTOCOL,MP_TICK_HZ,MP_BROADCAST_HZ} from '../multiplayer-protocol.js';

const root=fileURLToPath(new URL('../../',import.meta.url));
const contentTypes={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'};
export async function startServer({port=Number(process.env.PORT)||8787,host=process.env.HOST||'127.0.0.1',store=null,geometry=null,maxPlayers=Number(process.env.MAX_PLAYERS)||2000,allowDebug=process.env.ALLOW_DEBUG==='1',allowedOrigins=(process.env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean)}={}){
    store??=await createStore();
    if(!geometry){console.log('Preparing the authoritative map and its tile adjacency…');geometry=createWorldModel();geometry.hospital=geometry.sights.find(s=>s.id==='ucsf').entry;geometry.nearestGround=(x,z)=>{
        if(geometry.landClearAt(x-.5,z-.5))return {x,z};
        for(let r=.25;r<=2;r+=.25)for(let a=0;a<16;a++){const xx=x+Math.cos(a*Math.PI/8)*r,zz=z+Math.sin(a*Math.PI/8)*r;if(geometry.landClearAt(xx-.5,zz-.5))return {x:xx,z:zz};}return null;
    };}
    const game=await createGame({geometry,store,maxPlayers,allowDebug}),delay=monitorEventLoopDelay({resolution:20});delay.enable();
    let draining=false,healthy=true;
    function permitted(origin){
        if(!origin)return true;
        if(allowedOrigins.includes(origin))return true;
        if(origin==='null')return host==='127.0.0.1'||process.env.ALLOW_FILE_ORIGIN==='1';
        try{const u=new URL(origin);return ['127.0.0.1','localhost','[::1]'].includes(u.hostname);}catch{return false;}
    }
    const http=createServer(async(req,res)=>{
        const url=new URL(req.url,'http://localhost');
        if(url.pathname==='/healthz'){
            res.writeHead(healthy&&!draining?200:503,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({ok:healthy&&!draining,players:game.players.size,capacity:maxPlayers,store:store.kind,uptimeSeconds:Math.floor(process.uptime()),eventLoopP99Ms:Math.round(delay.percentile(99)/1e6),tickMs:+game.metrics.tickMs.toFixed(2),broadcastMs:+game.metrics.broadcastMs.toFixed(2)}));return;
        }
        if(url.pathname==='/multiplayer-config.json'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({endpoint:'/ws',protocol:MP_PROTOCOL}));return;}
        if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
        try{
            const path=decodeURIComponent(url.pathname),file=resolve(root,'.'+(path==='/'?'/index.html':path)),local=relative(root,file),type=contentTypes[extname(file)];
            if(local.startsWith('..')||local.startsWith('sf/server/')||local.split(/[\\/]/).some(p=>p.startsWith('.'))||!type){res.writeHead(404);res.end();return;}
            const data=await readFile(file);res.writeHead(200,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':path.endsWith('.html')?'no-cache':'public, max-age=300'});res.end(req.method==='HEAD'?undefined:data);
        }catch{res.writeHead(404);res.end();}
    });
    const sockets=new WebSocketServer({noServer:true,maxPayload:98304,perMessageDeflate:false,clientTracking:true});
    http.on('upgrade',(req,socket,head)=>{
        let path;try{path=new URL(req.url,'http://localhost').pathname;}catch{socket.destroy();return;}
        if(draining||!healthy||path!=='/ws'||!permitted(req.headers.origin)||sockets.clients.size>maxPlayers+128){socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;}
        sockets.handleUpgrade(req,socket,head,ws=>sockets.emit('connection',ws,req));
    });
    sockets.on('connection',ws=>{
        let player=null,authenticating=false;ws.alive=true;
        const deadline=setTimeout(()=>{if(!player)ws.close(4003,'Authentication timeout');},10_000);deadline.unref();
        const transport={get open(){return ws.readyState===WebSocket.OPEN;},get bufferedAmount(){return ws.bufferedAmount;},send(data){if(ws.readyState!==WebSocket.OPEN)return;if(ws.bufferedAmount>1048576){ws.close(4009,'Connection too slow; reconnect to resynchronize');return;}ws.send(data);},close:(code,reason)=>ws.close(code,reason)};
        ws.on('error',()=>{});ws.on('pong',()=>ws.alive=true);
        ws.on('message',async(data,binary)=>{
            if(binary){ws.close(4002,'Client messages must be JSON');return;}
            let message;try{message=JSON.parse(data.toString());}catch{ws.close(4002,'Invalid JSON');return;}
            if(!player){if(authenticating)return;if(message.type!=='hello'){ws.close(4003,'Authenticate first');return;}authenticating=true;
                try{player=await game.connect(message,transport);clearTimeout(deadline);if(ws.readyState!==WebSocket.OPEN)game.disconnect(player);}catch(error){ws.close(4003,error.message.slice(0,120));}return;
            }
            game.receive(player,message);
        });
        ws.on('close',()=>{clearTimeout(deadline);if(player)game.disconnect(player);});
    });
    const tickSeconds=1/MP_TICK_HZ,broadcastMilliseconds=1000/MP_BROADCAST_HZ;let previous=performance.now(),accumulator=0,lastBroadcast=0;
    const loop=setInterval(()=>{
        if(store.leaseHealthy===false){healthy=false;for(const ws of sockets.clients)ws.close(1012,'World ownership changed');return;}
        const current=performance.now();accumulator+=Math.min(.25,(current-previous)/1000);previous=current;
        try{let steps=0;while(accumulator>=tickSeconds&&steps++<5){game.tick(tickSeconds);accumulator-=tickSeconds;}if(current-lastBroadcast>=broadcastMilliseconds-1){lastBroadcast=current;game.broadcast();}}catch(error){healthy=false;console.error('Simulation failed:',error);}
    },10);
    const persistence=setInterval(()=>game.flush().catch(error=>{healthy=false;console.error('Persistence failed:',error.message);}),5000);
    const heartbeat=setInterval(()=>{for(const ws of sockets.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},15000);
    await new Promise((resolve,reject)=>{http.once('error',reject);http.listen(port,host,resolve);});
    const address=http.address();console.log(`Loeberland: http://${host}:${address.port}/explore.html · WebSocket /ws · ${store.kind} · capacity ${maxPlayers}`);
    async function close(){if(draining)return;draining=true;clearInterval(loop);clearInterval(persistence);clearInterval(heartbeat);delay.disable();await game.close();for(const ws of sockets.clients)ws.close(1001,'Server restarting');await new Promise(resolve=>http.close(resolve));sockets.close();await store.close();}
    return {http,sockets,game,port:address.port,close};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
    const server=await startServer();for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>server.close().then(()=>process.exit(0)).catch(error=>{console.error(error);process.exit(1);}));
}
