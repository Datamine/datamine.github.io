import {inEstateDistrict} from './estate-layout.js';
import {makeEstateHouse} from './estate-architecture.js';
import {drawWoodlandParks} from './woodland-park.js';
import {rand} from './geometry.js';
import {inPacificaPark,PACIFICA_PARK} from './southern-expansion.js';
import {drawPeninsulaDetails} from './peninsula-details.js';
import {researchCampusAt} from './research-layout.js';
import {NIGHTLIFE} from './nightlife.js';
import {drawTimesSquare} from './times-square.js';
import {SOUTHERN_HOUSING,inSouthernHousePlot,southernTrailDistance,inTimesSquare,gymAccess} from './southern-layout.js';
import {SOUTHERN_ROADS,airportSurfaceTypeAt} from './airship.js';
import {planBlockStreetLights,houseDoorPositions,SOUTHERN_STREET_LIGHT_POLICY} from './street-light-layout.js';
import {inSquareConstruction} from './square-construction-layout.js';

export function populateSouthernNeighborhood({mesh,terrain,makeTownhomeRow,tree,bench,roadDistance,signs,entrances=[],cityRoads=[],cityBuildings=[],surfaceType=airportSurfaceTypeAt,registerEstate=()=>{}}){
    const houses=[];
    for(const [i,p] of SOUTHERN_HOUSING.entries())if(inEstateDistrict(p.x,p.z)){const house=makeEstateHouse(mesh,p,terrain);registerEstate(house);houses.push(house);}else houses.push(makeTownhomeRow(p.x-p.w/2,p.z-p.d/2,p.w,p.d,2,p.seed??(.17+i*.083)%1,p.rotation,p.district||(i%3===2?'victorian':'west')));
    // Coastal pines and broadleaf trees frame the streets and hill contours.
    // Every tree inherits the terrain below it; none brings a square of turf.
    const trees=[];
    for(let i=0;i<185;i++){
        const x=21+rand(i,11,2)*50,z=99+rand(i,13,7)*70;
        if(inSquareConstruction(x,z,.6)||inPacificaPark(x,z)||researchCampusAt(x,z)||gymAccess(x,z)||inTimesSquare(x,z)||roadDistance(x,z)<1.3||southernTrailDistance(x,z)<.95||inSouthernHousePlot(x,z,1)||x>60&&z<107||x>64&&z>128||x>74)continue;
        if(terrain.height(x,z)<2.5&&i%3)continue;
        tree(x-.5,z-.5,i%3===0?true:i%7===0?3:false);trees.push({x,z});
    }
    for(let i=0;i<360;i++){
        const x=54+rand(i,21,4)*26,z=117+rand(i,19,8)*30;
        if(roadDistance(x,z)<1.15||southernTrailDistance(x,z)<.95||inSouthernHousePlot(x,z,.5)||entrances.some(p=>Math.hypot(p.x-x,p.z-z)<1.3))continue;
        tree(x-.5,z-.5,true,true);trees.push({x,z,evergreen:true});
    }
    for(const [x,z] of [[44.3,112.1],[47.6,113.6],[52.2,109.4]])bench(x,z);
    for(let i=0;i<22;i++){
        const x=31+rand(i,7,5)*21,z=107+rand(i,5,4)*42;
        if(inSouthernHousePlot(x,z,1)||inPacificaPark(x,z)||roadDistance(x,z)<1.3||southernTrailDistance(x,z)<.9)continue;
        const h=terrain.height(x,z),r=.18+rand(i,8,9)*.23;mesh.sphere(x,h+.07,z,r,.17+r*.2,r*.8,i%2?'#a7ab93':'#919b85',14,8,'dirt');
        for(let j=0;j<3;j++)mesh.sphere(x+.32+j*.1,h+.1,z+.18,.12,.13,.11,'#7a9252',8,5);
    }
    const woods=drawWoodlandParks(mesh,{terrain,tree,bench,roadDistance,signs});trees.push(...woods.trees);
    const avoid=[...entrances,...[NIGHTLIFE.entry,PACIFICA_PARK.entry].map(p=>({x:p.x+.5,z:p.y+.5}))];
    avoid.push(...houseDoorPositions([...houses,...cityBuildings]));
    const lightPlan=planBlockStreetLights({roads:[...cityRoads,...SOUTHERN_ROADS],surfaceType,avoid,minZ:78,...SOUTHERN_STREET_LIGHT_POLICY}),lamps=lightPlan.lamps;
    return {houses,trees,lamps,lightPlan,sights:[drawTimesSquare(mesh,signs),drawPeninsulaDetails(mesh,terrain,signs,tree),...woods.sites],diners:[]};
}
