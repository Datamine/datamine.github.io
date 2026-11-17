import test from 'node:test';
import assert from 'node:assert/strict';
import {multiplayerEndpoint,interpolateNetworkPose} from '../multiplayer-client.js';
import {sanitizePrivateState,validNetworkPose,unpackNetworkNPC} from '../multiplayer-protocol.js';

test('connection settings accept local sockets and require TLS from an HTTPS page',()=>{
    assert.equal(multiplayerEndpoint('/ws','http://localhost:8787/explore.html'),'ws://localhost:8787/ws');
    assert.equal(multiplayerEndpoint('/ws','https://example.com/explore.html'),'wss://example.com/ws');
    assert.equal(multiplayerEndpoint('ws://localhost/ws','file:///tmp/explore.html'),'ws://localhost/ws');
    for(const value of ['javascript:alert(1)','https://user:secret@example.com/ws','ws://example.com/ws'])assert.equal(multiplayerEndpoint(value,'https://example.com/explore.html'),null);
});
test('network interpolation takes the short turn and snaps real teleports rather than crossing the city',()=>{
    const a={x:1,y:2,z:3,angle:Math.PI-.1,phase:0,motion:0,mode:'walk'},b={...a,x:2,angle:-Math.PI+.1,phase:1,motion:1};
    const middle=interpolateNetworkPose(a,b,.5);assert.equal(middle.x,1.5);assert.ok(Math.abs(middle.angle-Math.PI)<1e-10);assert.equal(middle.motion,.5);
    assert.equal(interpolateNetworkPose(a,{...b,x:1000},.5).x,1000);
    assert.equal(interpolateNetworkPose(a,{...b,mode:'hidden'},.5).mode,'hidden');
});
test('personal checkpoints are bounded and cannot include credentials or shared world claims',()=>{
    const result=sanitizePrivateState({'sf-purse-v1':'{"coins":25}','sf-inebriation-v1':'30','sf-mp-identity':'secret',cows:'{"hp":0}','sf-quests-v1':'not JSON','sf-character-v1':'x'.repeat(20000)});
    assert.deepEqual(result,{'sf-purse-v1':'{"coins":25}','sf-inebriation-v1':'30'});
    const pose={x:1,y:2,z:3,angle:0,phase:1,motion:0,mode:'walk'};assert.ok(validNetworkPose(pose));for(const invalid of [{...pose,x:Infinity},{...pose,motion:4},{...pose,mode:'admin'}])assert.equal(validNetworkPose(invalid),false);
    assert.equal(unpackNetworkNPC(['citizen-1',1,2,null,.3,1,4,5,0,.1]).elapsed,5);
});
