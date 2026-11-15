import test from 'node:test';
import assert from 'node:assert/strict';
import {createMinimapProjection,canvasPixelPoint,layoutMinimapIcons,nearestMinimapIcon,navigationRegions} from '../wayfinding.js';

test('the moving player stays centered and map clicks recover world coordinates at every rotation',()=>{
    for(const [width,height] of [[184,154],[116,98]])for(const [cx,cy] of [[73.875,45.125],[30,-11.4],[450.5,-249.5]])for(let yaw=-Math.PI;yaw<=Math.PI;yaw+=.17){
        const m=createMinimapProjection(96,width,height,yaw,cx,cy);
        assert.deepEqual(m.point(cx,cy),{x:width/2,y:height/2});
        assert.deepEqual(m.unproject(width/2,height/2),{x:cx,y:cy});
        for(const [x,y] of [[0,0],[96,96],[19.5,44.875],[87.375,20.125],[48,48]]){
            const pixel=m.point(x,y),world=m.unproject(pixel.x,pixel.y);
            assert.ok(Math.abs(world.x-x)<1e-9&&Math.abs(world.y-y)<1e-9);
        }
        assert.ok(Math.abs(Math.hypot(m.a,m.b)-Math.hypot(m.c,m.d))<1e-12,'both map axes keep the same scale');
        assert.ok(Math.abs(m.a*m.c+m.b*m.d)<1e-12,'rotation never tilts or skews the map');
    }
});

test('walking translates the map around its fixed center without changing its orientation',()=>{
    const before=createMinimapProjection(96,184,154,.7,34,29),after=createMinimapProjection(96,184,154,.7,37,27);
    const a=before.point(40,32),b=after.point(40,32);
    assert.ok(Math.abs(b.x-a.x-(-before.a*3+before.c*2))<1e-9);
    assert.ok(Math.abs(b.y-a.y-(-before.b*3+before.d*2))<1e-9);
    assert.equal(before.a,after.a);assert.equal(before.d,after.d);
});

test('pointer coordinates account for canvas borders and responsive CSS scaling',()=>{
    for(const metrics of [
        {width:184,height:154,offsetWidth:180,offsetHeight:151,clientWidth:172,clientHeight:143,clientLeft:4,clientTop:4},
        {width:184,height:154,offsetWidth:116,offsetHeight:98,clientWidth:110,clientHeight:92,clientLeft:3,clientTop:3}
    ])for(const scale of [1,.75]){
        const rect={left:187,top:114,width:metrics.offsetWidth*scale,height:metrics.offsetHeight*scale};
        for(const [x,y] of [[0,0],[91,76],[184,154]]){
            const clientX=rect.left+(metrics.clientLeft+x/metrics.width*metrics.clientWidth)*scale;
            const clientY=rect.top+(metrics.clientTop+y/metrics.height*metrics.clientHeight)*scale;
            const p=canvasPixelPoint(clientX,clientY,rect,metrics);
            assert.ok(p&&Math.abs(p.x-x)<1e-9&&Math.abs(p.y-y)<1e-9);
        }
        assert.equal(canvasPixelPoint(rect.left,rect.top,rect,metrics),null,'the border is outside the map');
    }
});

test('clustered destination icons separate while retaining their map anchors and click targets',()=>{
    const anchors=Array.from({length:10},(_,id)=>({id,x:112+(id%3),y:54+Math.floor(id/3)}));
    const icons=layoutMinimapIcons(anchors,184,154);
    assert.deepEqual(icons,layoutMinimapIcons(anchors,184,154),'layout does not jitter between draws');
    for(const [i,p] of icons.entries()){
        assert.equal(p.anchorX,anchors[i].x);assert.equal(p.anchorY,anchors[i].y);
        assert.ok(p.x>=7&&p.x<=177&&p.y>=7&&p.y<=147);
        assert.equal(nearestMinimapIcon(icons,p.x,p.y),p);
        for(const q of icons.slice(i+1))assert.ok(Math.hypot(p.x-q.x,p.y-q.y)>12.5,'icons must not overlap');
    }
    assert.equal(nearestMinimapIcon(icons,0,0),null);
});

test('the player marker stays clear and offscreen places do not become false edge targets',()=>{
    const icons=layoutMinimapIcons([{id:'near',x:92,y:77},{id:'neighbor',x:93,y:78},{id:'away',x:-300,y:-200}],184,154,13,12);
    assert.deepEqual(icons.map(p=>p.id),['near','neighbor']);
    for(const p of icons)assert.ok(Math.hypot(p.x-92,p.y-77)>=12-1e-9);
    assert.equal(nearestMinimapIcon(icons,92,77),null);
});

test('map routing distinguishes enclosed gardens and blocked diagonal corners',()=>{
    const mask=Uint8Array.from([
        1,1,1,0,0,
        1,0,1,0,1,
        1,1,1,0,0,
        0,0,0,1,0,
        0,0,0,0,1
    ]),regions=navigationRegions(mask,5);
    assert.equal(regions[0],regions[12]);
    assert.equal(regions[6],-1);
    assert.notEqual(regions[9],regions[0]);
    assert.notEqual(regions[18],regions[24],'a blocked diagonal is not a route');
});
