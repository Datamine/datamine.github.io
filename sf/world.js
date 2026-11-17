import {createLoadingScreen,nextLoadingPaint} from './loading-screen.js';
import {createTeleportTablets,TABLET_PLACES} from './teleport-tablets.js';
import {drawTabletTeleport} from './teleport-models.js';
import {createMarinLand} from './marin-land.js';
import {createCountryside} from './countryside.js';
import {createDebugConsole,debugMapPosition,debugTilePosition,createFrameMeter} from './debug-console.js';
import {ITEM_STATS,selectedWeapon,equipmentOwned,equipmentDefense} from './item-stats.js';
import {createWilderness,wildernessSpawns} from './wilderness.js';
import {drawWildMonster} from './wilderness-models.js';
import {drawArmory} from './armory.js';
import {packStaticMesh,batchInFrustum} from './static-batches.js';
import {SOUTHERN_CRAFT_SIGNS} from './southern-craft.js';
import {GLASS_UV,isGlassVertex,meshGlassTriangles,createGlazingBatch} from './glazing.js';
import {TWITTER_HQ,SALES_CONFERENCE,socialLocalPoint} from './social-layout.js';
import {SOCIAL_SIGNS,drawSocialBuildings} from './social-buildings.js';
import {drawRunoffBanks,drawBottlePostAnimation} from './bottle-post.js';
import {createSocialBusiness,softwareSalesDialogue} from './sales-conference.js';
import {drawNeuralLabAnimation} from './ai-lab-interior.js';
import {APPLE_CAMPUS,ROBOTAXI_DEALER} from './tech-layout.js';
import {TECH_SIGNS,drawAppleCampus,drawRobotaxiDealer} from './tech-buildings.js';
import {createTechVentures,techMerchantDialogue} from './tech-ventures.js';
import {HABERDASHER} from './haberdasher-layout.js';
import {HAT_CATALOG,ownedHat} from './hat-catalog.js';
import {haberdasherDialogue} from './haberdashery.js';
import {HABERDASHER_SIGNS,drawHaberdasherShop} from './haberdasher-shop.js';
import {SALT_FLATS_SIGNS,drawSaltFlats} from './salt-flats.js';
import {createSaltMail,saltActivistDialogue,saltClerkDialogue} from './salt-mail.js';
import {planBlockStreetLights,houseDoorPositions} from './street-light-layout.js';
import {MINIMAP_MATERIALS,MINIMAP_BUILDING,minimapGroundColor} from './map-colors.js';
import {buildTileNavigation,navigationObstacles,auditNavigationGrid} from './navigation.js';
import {nearestMinimapPoint} from './minimap-navigation.js';
import {PLACE_ICONS,placeIcon,iconSVG,drawPlaceIcon,drawDestinationFlag,createMinimapProjection,canvasPixelPoint,layoutMinimapIcons,nearestMinimapIcon} from './wayfinding.js';
import {createMaterialTexture,createSignTexture,MATERIAL_ATLAS,MATERIAL_IDS} from './materials.js';
import {createAlpineTexture,ALPINE_TEXTURE_GLSL} from './alpine-materials.js';
import {Mesh,rand,rgb,tint,sub,dot,cross,unit,matrixMultiply,rayBox,rayTriangle,pose,cutawayWallMask} from './geometry.js';
import {gradeStreetHeightField} from './street-ground.js';
import {SF_SHADOW_GLSL} from './shadows.js';
import {TILE_CONFIG,TILE_TYPES,TILE_PRESETS,TILE_EDGES,tileArea,clipTilePolygon,tilePolygonOverlap,surfaceTileFromPatches,buildSurfaceTile,validateTileMap,runTileRuleTests} from './tiles.js';
import {createWaterTiles,applyWaterTile,WATER_LEVEL} from './water-tiles.js';
import {createSFCoast,shorelineSegments,westernCoastX,westernBeachWidth} from './coastline.js';
import {createCoastalRocks,drawCoastalRocks,drawCoastalSeagulls} from './western-coast-details.js';
import {createModels} from './models.js';
import {SUTRO_SITE,createSutroClimb} from './sutro.js';
import {drawStreetLamp,createLampGlow,SALESFORCE_CROWN_GLSL} from './lighting.js';
import {DOWNTOWN,marketSide} from './downtown.js';
import {createSeaSurface,drawOffshoreSea,decorateHeadlands} from './environment.js';
import {AIRSHIP_TERMINAL,AIRPORT_TERMINAL_BUILDING,AIRSHIP_ACCESS,SOUTHERN_ROADS,AIRPORT_RUNWAY,SPACEPORT_PIER,STARTUP_HQ,airportGate,airportRoadTiles,airportRoadDistance,airportSurfaceTypeAt,onAirportApron,createAirship,drawAirship,drawAirshipTerminal} from './airship.js';
import {TAX_HQ,SF_SPACEPORT,SPACEPORT_HOUSES,RAIL_PIT,inRailPit,drawSouthernDistrict,drawRailPit,taxDialogue} from './southern-district.js';
import {SOUTHERN_BOUNDS,SOUTHERN_TRAILS,SOUTHERN_LEVEL_PADS} from './southern-layout.js';
import {createSouthernTerrain} from './southern-terrain.js';
import {createStrength} from './strength.js';
import {JURASSIC,COW_PEN,PEQUOD,KRAKEN_CAPE_TEXT} from './jurassic-layout.js';
import {createExpeditions,scientistDialogue,ahabDialogue,RAILGUN_RANGE} from './jurassic.js';
import {JURASSIC_SIGNS,drawJurassicCampus,drawRaptorGate,drawVelociraptor,drawCattlePen,drawCow,drawSpectre,drawPequod,drawKraken,drawRailgun,drawBeam,drawExpeditionLoot,drawKrakenCape} from './jurassic-models.js';
import {createForwardRoll,forwardRollTarget,applyForwardRollMesh,FORWARD_ROLL_DURATION,FORWARD_ROLL_SPEED} from './forward-roll.js';
import {createAILabJob} from './ai-lab.js';
import {createAIInterviewUI} from './ai-interview-ui.js';
import {createHitpoints,createAlienBattle,rollEnemyDamage} from './combat.js';
import {createDeli,drawDeliveryCooler} from './deli.js';
import {createStreetTraffic} from './street-traffic.js';
import {AIRPORT_FIELD_ADS,planAirportBillboards,drawAirportBillboard} from './airport-billboards.js';
import {GYM_EXERCISES,gymExercise,gymExercisePosition,drawGymExercise} from './gym-exercises.js';
import {createFerrari,drawFerrari} from './ferrari.js';
import {createFuelDialogue,refuelFerrariFromCan} from './fuel.js';
import {ADVENTURE_SIGNS,drawFitness,drawTrainingSites,drawBenchPress,createHighwaySites,drawHighwaySites} from './adventure-sites.js';
import {fitnessObstacles} from './fitness-layout.js';
import {SF_FITNESS,SAND_HILL_CAPITAL,gymAccess} from './southern-layout.js';
import {WOODLAND_SIGNS} from './woodland-park.js';
import {BILLBOARD_ART} from './billboards.js';
import {RESEARCH_ART} from './research-art.js';
import {TIMES_SQUARE_SIGNS} from './times-square.js';
import {RESEARCH_CAMPUSES,researchCampusAt} from './research-layout.js';
import {insideInstitute,instituteHiddenSections,raycastInstituteFloor,INSTITUTE_FLOOR_HEIGHT} from './institute-interiors.js';
import {RESEARCH_SIGNS,drawResearchCampuses,createResearcherNPCs,moveResearcherNPCs} from './research-campuses.js';
import {SUNGLASSES_BEACH_TARGET,createSunglasses,beachSunglassesSite,drawDroppedSunglasses} from './sunglasses.js';
import {createQuestLog,monkeyQuestDialogue} from './quests.js';
import {createQuestMenu} from './quest-menu.js';
import {ALIEN_TARGETS,theyLiveDialogue} from './they-live.js';
import {ALIEN_SITE_SIGNS,INDUSTRIAL_CENTER,drawIndustrialCenter,createEsotericCampus} from './alien-sites.js';
import {SQUARE_LIFE_SIGNS,createSquareNPCs,squareNPCDialogue} from './times-square-life.js';
import {drawSquareConstruction} from './square-construction.js';
import {timesSquareWalkable} from './southern-layout.js';
import {drawPlayerSkateboard,createSkateTricks,SKATE_TRICKS} from './skateboard.js';
import {createNPCRoaming} from './npc-roaming.js';
import {drawShipyardCargo,drawNavyShip,NAVY_SHIP} from './shipyard.js';
import {COIT_GROVE,inCoitGrove,drawParrot,parrotDialogue} from './parrots.js';
import {createInebriation,swayCharacter} from './inebriation.js';
import {createRehabilitation,detentionStaff,rehabilitationDialogue,scrambleAppearance,drawRehabilitationLaser} from './rehabilitation.js';
import {createFishing,drawFishingSpot,drawFishingRod,drawFishBucket} from './fishing.js';
import {createMonkeyPursuit} from './monkey-escape.js';
import {ZOO_PURSUIT_SPEED} from './zoo-encounter.js';
import {createMotorcycle,drawMotorcycle,pitchMotorcycleMesh,MOTORCYCLE_SPEED,MOTORCYCLE_RENTAL_PRICE,MOTORCYCLE_EXAMINE} from './motorcycle.js';
import {RAIL_WORKER,railWorkerDialogue,drawRailWorks} from './rail-works.js';
import {createResearchDialogue} from './research-dialogue.js';
import {TIMES_SQUARE,TIMES_SQUARE_BUILDINGS,inTimesSquare} from './southern-layout.js';
import {populateSouthernNeighborhood} from './southern-neighborhood.js';
import {PENINSULA_STREETS,PACIFICA_PARK,PACIFICA_PARK_RESIDENTS,inPacificaPark} from './southern-expansion.js';
import {PENINSULA_SIGNS} from './peninsula-details.js';
import {createRocketTravel,drawReusableRocket,tiltRocketMesh,rocketFlightPoint,rocketCruiseSpeed,ROCKET_RIDER_CENTER} from './rocket.js';
import {createRegionalRoad,createGoldenGateCrossing,drawHighwayMinimap} from './regional-road.js';
import {TAHOE,TAHOE_BOUNDS,createTahoe,nearTahoe,tahoeHeight,regionalGroundHeight,drawTahoeTerrain,drawTahoeStructures,drawGondolaCabin,drawSkiRider,drawRegionalBackdrop,drawTahoeMinimap,raycastTahoe,fitTahoeCamera,SNOW_SURFACE_GLSL} from './tahoe.js';
import {createAirshipRope,drawAirshipRope} from './airship-rope.js';
import {AIRSHIP_BASKET,createAirshipBasket} from './airship-basket.js';
import {createEconomy,MERCHANTS} from './economy.js';
import {createDialogue} from './dialogue.js';
import {bootMultiplayer} from './multiplayer-client.js';
import {createWorldMultiplayer,setupMultiplayerSettings} from './multiplayer-world.js';
import {createCombatFeedback,createCombatOverlay} from './combat-feedback.js';
import {actorLevel} from './levels.js';
import {GUILD_BUILDINGS,createGuildMembership,guildDialogue,marketFarmerDialogue,insideGuild,peptideSpawnPoints,PEPTIDE_SPAWN_MS,TECHNOLOGIST_MARKET} from './guild.js';
import {PUBLIC_INSTANCE,ILLUMINATI_CAVE,CAVE_TILES,CAVE_NAVIGATION,ILLUMINATI_PRICE} from './map-instances.js';
import {createSecretAdventures} from './secret-adventures.js';
import {bankerDialogue} from './banking.js';
import {createBankService,createBankMenu} from './bank-ui.js';
import {drawDrinkingCoffee} from './bank-models.js';
import {createIlluminatiCaveMesh,drawStealthBomber,drawSecretStair,drawBombEffect,drawParachute,drawBomberCrash} from './illuminati-models.js';
import {describeCharacter,sightPrimaryVerb} from './descriptions.js';
import {buildingNPCService,serviceStaffPosition} from './building-interactions.js';
import {drawStartupHQ,drawGrainStand,merchant} from './commerce-world.js';
import {createWhales} from './wildlife.js';
import {createPaintedBunny} from './bunny.js';
import {createSkateDog} from './skate-dog.js';
import {PROMETHEUS,drawPrometheus,drawPrometheusFlame,prometheusTorchLight} from './prometheus.js';
import {createBayShipping} from './shipping.js';
import {RESTAURANTS,restaurantPoint,drawRestaurantDiners} from './restaurants.js';
import {drawEstateResidents} from './estate-life.js';
import {createCityLife,clipLifeRoutes,drawStreetcar,NOE_VALLEY_BOUNDS} from './life.js';
import {dogWalkerDialogue} from './companions.js';
import {createTrafficSignals} from './traffic-signals.js';
import {createSlowBus,planNightlifeBus} from './slow-bus.js';
import {BUS_SIGNS,drawTrafficSignalPosts,drawTrafficSignalLights,drawSlowBus} from './transit-models.js';
import {GPU_FACTORY} from './gpu-layout.js';
import {GPU_FACTORY_SIGNS,oceanBeachSandSite,drawBeachSand,drawGPUFactory} from './gpu-factory.js';
import {CHARACTER_CLIPS} from './characters.js';
import {normalizeCharacter,characterAppearance,drawCharacterPreview} from './character-config.js';
import {buildNightlife,nightlifeObstacles,NIGHTLIFE,inNightlife,nightlifeAccess,nightlifeWalkable,nightlifeHeight,nightlifeRebuff,drawNightlife,raycastNightlife} from './nightlife.js';
import {createCaptureAnimation,collapseCharacterMesh} from './capture-animation.js';
import {ZOO_ENCLOSURES,drawZooEnclosures,drawZooAnimals,drawMonkey} from './zoo-animals.js';
import {createTigerEncounter} from './zoo-encounter.js';
import {SF_ZOO,UCSF_HOSPITAL,ZOO_PATHS,drawZooAndHospital,drawTigerGate,drawTiger,drawAnimalControlNet} from './zoo.js';
import {WINDSURF_LAUNCH,createWindsurfing,drawWindsurfer} from './windsurfing.js';
import {createSurfing,PACIFICA_SURF_SPOT,SURF_TRICKS,drawSurfRack,drawWaveSurfer,drawPacificaWaves} from './surfing.js';
import {createPoliceChase,createDetentionSite,drawDetentionFacility} from './encounters.js';
import {WORLD_SIZE,REFERENCE_SIZE,STREET_LAYOUT_SIZE,EAST_BAY_COAST_X,PARK_BOUNDS,PANHANDLE,DOLORES_PARK,inBounds,boundsPolygon,SF_HILLS,sfElevation,sfHillCover,woodedHillPark,levelHeightField,cutBuildingPlot,MARIN_OUTLINE,marinElevation} from './geography.js';

/* Static WebGL world entry point. Terrain and models are actual 3D triangle
   meshes; the 2D canvases below are only maps and interface labels. No game assets
   or renderer code are copied from RuneScape or private-server clients. */
function createSFWorld({headless=false,retainInteriors=false,multiplayer=null,loading=null}={}){
    const $=id=>document.getElementById(id),world=headless?null:$('sf-world'),canvas=headless?null:$('sf-canvas'),map=headless?null:$('sf-minimap');
    const gl=headless?null:canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'low-power'});
    const mc=headless?null:map.getContext('2d');
    if(!headless&&(!gl||!mc))return;
    const classic=headless?null:document.querySelector('.maintable');
    const sections=headless?new Map():new Map([...classic.querySelectorAll('details')].map(el=>[el.querySelector('summary').textContent.trim(),el]));
    // Share one geographic transform across coast, park shapes and landmarks.
    // The street drawing has its own authored reference size; widths stay fixed.
    const N=WORLD_SIZE,MAP_SCALE=N/REFERENCE_SIZE,LAYOUT_SCALE=N/STREET_LAYOUT_SIZE;
    const mapTile=v=>Math.round(v*MAP_SCALE),mapPosition=v=>v*MAP_SCALE;
    const layoutPosition=v=>v*LAYOUT_SCALE;
    const mapPolygon=points=>points.map(p=>p.map(mapPosition));
    const TERRAIN_RES=4,TERRAIN_GRID=N*TERRAIN_RES,WALK_SPEED=4.6,ACCELERATION=24,CLEARANCE=.16;
    const occupied=new Uint8Array(N*N),landMask=new Uint8Array(N*N),reserved=new Uint8Array(N*N),roadIndex=new Int16Array(N*N),roadDistance=new Float32Array(N*N);
    const objects=[],places=[],instituteRooms=[],visited=new Set(),policeActors=new Map();
    let multiplayerWorld=null,multiplayerSettings=null;
    let secretWorld=null,caveMesh=null,caveGPU=null,oldMan=null,secretStairs=null;
    let wilderness=null,wildTarget=null,wildAttackIn=0,wildLootSerial=0;
    let bankService=null,bankMenu=null,banker=null;
    let tabletService=null,tabletWizard=null,tabletDestinations=null;
    const caveExitSite={id:'illuminati-exit',kind:'cave-exit',label:'Stairs to the guild',entry:{x:13,y:24},description:'A long stairway returns to the Freemasons’ Guild above. The public minimap resumes on the surface.'};
    const bomberSite={id:'personal-b2',kind:'stealth-bomber',label:'B-2 Stealth Bomber',entry:{x:13,y:16},description:'Your personal flying wing. Cruise just below the airship; hold Shift for rocket speed. Land by parachuting out. The Illuminati covers replacement aircraft. Space drops one bomb every 30 seconds: 100 damage in a 3×3 area, affecting cows only.'};
    let savedGuild={};if(!headless)try{savedGuild=JSON.parse(localStorage.getItem('sf-guild-v1')||'{}')||{};}catch{}
    let localPeptides=Number.isSafeInteger(savedGuild.peptides)?Math.max(0,savedGuild.peptides):0,peptideSpawns=[],nextLocalPeptideAt=Number.isFinite(savedGuild.nextPeptideAt)?savedGuild.nextPeptideAt:Date.now()+PEPTIDE_SPAWN_MS;
    function saveLocalGuild(){if(!headless&&!multiplayer)try{localStorage.setItem('sf-guild-v1',JSON.stringify({...localGuild.state,peptides:localPeptides,nextPeptideAt:nextLocalPeptideAt}));}catch{}}
    const localGuild=createGuildMembership(savedGuild,Date.now,()=>saveLocalGuild());
    function guildStatus(){return multiplayer?{...multiplayer.state.guild,peptides:multiplayer.state.inventory?.peptides||0}:{...localGuild.status(),peptides:localPeptides};}
    const player={x:mapTile(45),y:mapTile(29),path:[],moving:false,angle:Math.PI/2,speed:0,vx:0,vy:0,phase:0,motion:0,runBlend:0};
    const bike={x:mapTile(44),y:mapTile(30),riding:false};
    const skateboard={riding:false,travel:0},skateTricks=createSkateTricks(),forwardRoll=createForwardRoll();let alienCombat=null,deli=null,streetTraffic=null,airportAds=[],airportFieldAds=[],esotericCampus=null,squareLife=null,motorcycle=null,monkeyKeeper=null,keeperNPC=null,approachingNPC=null,specialNPCLife=null,socialLife=null;
    let savedMotorcycle={},savedKeeper={};if(!headless)try{savedMotorcycle=JSON.parse(localStorage.getItem('sf-motorcycle-v1')||'{}')||{};savedKeeper=JSON.parse(localStorage.getItem('sf-monkey-keeper-v1')||'{}')||{};}catch{}
    const capture=createCaptureAnimation(),basket=createAirshipBasket();let basketArrival=null;
    let savedSunglasses={};if(!headless)try{savedSunglasses=JSON.parse(localStorage.getItem('sf-sunglasses-v1')||'{}');}catch{}
    const sunglasses=createSunglasses(savedSunglasses,state=>{if(!headless)try{localStorage.setItem('sf-sunglasses-v1',JSON.stringify(state));}catch{}if(!headless)updateSunglassesControl();});
    let sunglassesSite=null,beachBillboard=null;
    let savedCharacter={};if(!headless)try{savedCharacter=JSON.parse(localStorage.getItem('sf-character-v1')||'{}');}catch{}
    let playerLook=normalizeCharacter({...savedCharacter,sunglasses:sunglasses.state.owned&&savedCharacter?.sunglasses===true});
    let savedStrength={},savedFerrari={};if(!headless)try{savedStrength=JSON.parse(localStorage.getItem('sf-strength-v1')||'{}')||{};savedFerrari=JSON.parse(localStorage.getItem('sf-ferrari-v1')||'{}')||{};}catch{}
    const strength=createStrength(savedStrength,state=>{if(!headless)try{localStorage.setItem('sf-strength-v1',JSON.stringify(state));}catch{}});
    let savedHealth={},savedDeli={};if(!headless)try{savedHealth=JSON.parse(localStorage.getItem('sf-hitpoints-v1')||'{}');savedDeli=JSON.parse(localStorage.getItem('sf-deli-v1')||'{}');}catch{}
    const health=createHitpoints(savedHealth,state=>{if(!headless)try{localStorage.setItem('sf-hitpoints-v1',JSON.stringify(state));}catch{}});
    const combatFeedback=createCombatFeedback(),combatOverlay=headless?null:createCombatOverlay($('sf-combat-overlay'));
    let ferrari=null,highwaySites=[],training=false,trainingLast=0,gymSelection='bench';
    if(!headless)try{gymSelection=gymExercise(localStorage.getItem('sf-gym-exercise-v1')).id;}catch{}
    const camera={yaw:0,pitch:Math.PI/5,cos:1,sin:0,version:0};
    let active=false,built=false,raf=0,last=0,width=1,height=1,dpr=1,zoom=1,hovered=null,destination=null,action=null,slowBus=null;
    let keys=new Set(),scrollBefore=0,currentInstitute=null,currentInterior=null,readerPlace=null,ducksFedUntil=0,miniLast=0,playerSpeechUntil=0;
    const reduced=headless||matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointers=new Map();let pressTimer=0,longPressed=false,pinchDistance=0,gesture=false;
    let savedEconomy={};if(!headless)try{savedEconomy=JSON.parse(localStorage.getItem('sf-purse-v1')||'{}')||{};}catch{}
    function updatePurse(state){if(headless)return;if(built){questMenu?.render();updatePhoneControl();}$('sf-coins').textContent=state.coins;$('sf-inventory').textContent=state.equity+' equity · '+state.grain+' grain'+(state.sand?' · '+state.sand+' sand sack'+(state.sand===1?'':'s'):'')+(state.softwareCopies?' · '+state.softwareCopies+' sales software':'')+(state.iphoneOwned?' · iPhone':'')+(state.saltLetters?' · 1 conservation letter':'')+(state.fish?' · 1 live fish':'')+(state.fuelCans?' · '+state.fuelCans+' fuel can'+(state.fuelCans===1?'':'s'):'');$('sf-fuel-can-button').hidden=!state.fuelCans;$('sf-fuel-can-button').textContent='Use fuel can · '+state.fuelCans;try{localStorage.setItem('sf-purse-v1',JSON.stringify(state));}catch{}}
    const economy=createEconomy(savedEconomy,updatePurse);updatePurse(economy.state);
    if(!ownedHat(economy.state.ownedHats,playerLook.hat))playerLook.hat='none';
    const saltMail=createSaltMail(economy);
    let savedTech={};if(!headless)try{savedTech=JSON.parse(localStorage.getItem('sf-tech-ventures-v1')||'{}')||{};}catch{}
    const tech=createTechVentures({economy,health,saved:savedTech,onSave:state=>{if(!headless)try{localStorage.setItem('sf-tech-ventures-v1',JSON.stringify(state));}catch{}},onMessage:text=>{if(!headless&&built)announce(text,'Tech');},onDeath:()=>{if(!headless)beginCapture('doomscrolling',respawnAtHospital);}});

    let savedJob={};if(!headless)try{savedJob=JSON.parse(localStorage.getItem('sf-ai-lab-job-v1')||'{}');}catch{}
    const aiLabJob=createAILabJob({saved:savedJob,economy,onSave:state=>{if(!headless)try{localStorage.setItem('sf-ai-lab-job-v1',JSON.stringify(state));}catch{}}});
    const fishing=createFishing(economy);let fishingSite=null,sandSite=null;
    let savedInebriation=0;if(!headless)try{savedInebriation=JSON.parse(localStorage.getItem('sf-inebriation-v1')||'0');}catch{}
    const inebriation=createInebriation(savedInebriation,value=>{if(!headless)try{localStorage.setItem('sf-inebriation-v1',JSON.stringify(value));}catch{}});
    const social=createSocialBusiness({economy,inebriation,onEvent:event=>{
        event.npc.speech=event.accepted?'Sold! More sales!':'Let us circle back next quarter.';event.npc.speechUntil=(headless?0:performance.now())+3500;
        if(!headless){announce(event.message,event.npc.name);dialogue.resolvePending(event.npc.id,event.message);updateAdventureUI();}
    }});
    const rehabilitation=createRehabilitation(()=>{playerLook=normalizeCharacter(scrambleAppearance(playerLook));if(!headless)try{localStorage.setItem('sf-character-v1',JSON.stringify(playerLook));}catch{}inebriation.set(100);world.inert=false;respawnAtHospital(true);});
    let jailStaff=[],parrots=[];
    let savedQuests={},questMenu=null;
    if(!headless)try{savedQuests=JSON.parse(localStorage.getItem('sf-quests-v1')||'{}')||{};}catch{}
    const quests=createQuestLog(savedQuests,state=>{if(!headless)try{localStorage.setItem('sf-quests-v1',JSON.stringify(state));}catch{}questMenu?.render();if(state.monkey!=='carrying')monkeyKeeper?.stop();if(built&&!headless)updateAdventureUI();});
    let savedExpeditions={};if(!headless)try{savedExpeditions=JSON.parse(localStorage.getItem('sf-expeditions-v1')||'{}')||{};}catch{}
    let pequodSite=null,ahabNPC=null;
    const expeditions=createExpeditions({saved:savedExpeditions,health,economy,level:()=>strength.status.level,sharedWorld:()=>!!multiplayer,hasBayonet:()=>quests.theyLive.state.bayonet,food:n=>deli?.storeSandwich(n),
        player:()=>({x:player.x+.5,z:player.y+.5,base:playerGround(),isPlayer:true,eligible:!capture.state.active&&!chase?.state.jailed&&!flying()&&!rocket.state.active&&!surf.state.riding&&!rope.climbing&&!sutroClimb.state.active&&tahoe.state.mode==='ground'}),
        pedestrians:()=>[...(cityLife?.people||[]),...(southernLife?.people||[]),...(squareLife?.people||[])],
        routeTo:(a,b)=>pathTo(b.x-.5,b.z-.5,{x:a.x-.5,y:a.z-.5},true)?.map(p=>({x:p.x+.5,z:p.y+.5})),canTravel:(a,b)=>canTravel(a.x-.5,a.z-.5,b.x-.5,b.z-.5,true),lineClear:railgunLineClear,
        onSave:state=>{if(!headless)try{localStorage.setItem('sf-expeditions-v1',JSON.stringify(state));}catch{}questMenu?.render();},onEvent:expeditionEvent});
    const existingQuestEntries=quests.entries;quests.entries=()=>[...existingQuestEntries(),...expeditions.entries(),...saltMail.entries(),...(secretWorld?[secretWorld.questEntry(guildStatus())]:[])];
    playerLook.cape=expeditions.state.cape&&playerLook.cape;
    // Existing sunglasses owners enter the quest too; a reload never resets it.
    if(sunglasses.state.owned)quests.theyLive.start();
    const dialogue=headless?null:createDialogue({element:$('sf-dialogue'),journal:world.querySelector('.sf-journal'),log:$('sf-log'),economy,announce,getPlayer:()=>playerLook,onClose:()=>{releaseNPC();canvas.focus({preventScroll:true});}});
    const aiInterview=headless?null:createAIInterviewUI({element:$('sf-ai-interview'),job:aiLabJob,onOpen:()=>{fishing.cancel();alienCombat=null;setDancing(false);closeReader();closeCharacter();closeHelp();closeMenu();dialogue.close();keys.clear();player.path=[];player.speed=0;action=null;destination=null;},onClose:()=>canvas.focus({preventScroll:true}),onResult:result=>{announce(result.message,'AI Lab');updateAdventureUI();}});
    if(!headless)questMenu=createQuestMenu({element:$('sf-quests'),content:$('sf-quest-list'),button:$('sf-quests-button'),closeButton:$('sf-close-quests'),shade:$('sf-reader-shade'),canvas,quests,beforeOpen:()=>{closeCharacter();closeReader();closeHelp();closeMenu();dialogue.close();keys.clear();player.path=[];player.speed=0;}});
    const frameMeter=createFrameMeter();
    const debugConsole=headless?null:createDebugConsole({panel:$('sf-debug'),form:$('sf-command'),input:$('sf-command-input'),status:$('sf-command-status'),xOutput:$('sf-debug-x'),yOutput:$('sf-debug-y'),fpsOutput:$('sf-debug-fps'),getFPS:()=>frameMeter.fps,getPosition:()=>debugMapPosition(player),teleport:debugTeleport,
        beforeOpen:()=>{keys.clear();player.path=[];player.speed=0;player.moving=false;action=null;destination=null;},onMessage:text=>announce(text,'Debug'),focusWorld:()=>canvas.focus({preventScroll:true})});
    function poly(c,points,fill,stroke){c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
    function line(c,pts,color,size=1){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=size;c.stroke();}
    function ellipse(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
    // A hand-drawn geographic schematic. x runs west to east; y runs north to south.
    // The southern land continues past the city boundary, rather than forming an island.
    // Compressed, hand-traced shoreline: Lands End, the northern waterfront,
    // Rincon Point, Mission Bay, India Basin, and the Hunters Point peninsula.
    const COAST=createSFCoast(MAP_SCALE);
    const PRESIDIO = [[14,10],[19,8],[29,11],[33,17],[30,20],[27,22],[17,20],[11,16]].map(p=>p.map(mapPosition));
    const MARIN=mapPolygon(MARIN_OUTLINE);
    const sailingCoast=createSFCoast(MAP_SCALE,SOUTHERN_BOUNDS.south);
    const bridgeDirection=unit([DOWNTOWN.bridge.end[0]-DOWNTOWN.bridge.abutment[0],0,DOWNTOWN.bridge.end[1]-DOWNTOWN.bridge.abutment[1]]);
    const islandCenter=[mapPosition(DOWNTOWN.bridge.end[0])+bridgeDirection[0]*2,mapPosition(DOWNTOWN.bridge.end[1])+bridgeDirection[2]*2];
    const islandOutline=(x,z,rx,rz)=>Array.from({length:32},(_,i)=>[x+Math.cos(i*Math.PI/16)*rx,z+Math.sin(i*Math.PI/16)*rz]);
    const surf=createWindsurfing({scale:MAP_SCALE,obstacles:[sailingCoast,MARIN,islandOutline(...islandCenter,3.25,2.8),islandOutline(islandCenter[0]+1.1,islandCenter[1]-.8,2.1,2.1),islandOutline(PROMETHEUS.x,PROMETHEUS.z,3.15,3.15)]}),detention=createDetentionSite(MAP_SCALE);
    const waveSurf=createSurfing({water:surf.water,segment:(a,b)=>surf.segment({x:a.x-.5,y:a.z-.5},{x:b.x-.5,y:b.z-.5})});
    let pacificaSurfSite=null,waveTime=0;
    let chase=null,zoo=null,zooBase=0,bunny=null,skateDog=null;
    const sutroClimb=createSutroClimb(),airship=createAirship({worldSize:N,groundHeight:(x,z)=>terrainHeight(x,z)}),rope=createAirshipRope(),bayShipping=createBayShipping(MAP_SCALE),whales=createWhales(),merchants=[],tahoe=createTahoe();
    let ropeReturnHome=false,whalesSeen=false;
    const rocket=createRocketTravel({groundHeight:(x,z)=>terrainHeight(x,z)});
    let southernLife=null,nightclub=null,goldenGate=null,marinLand=null,regionalRoad=null,countryside=null,highwayMesh=null,highwayGPU=null,southernTerrain=null,southernNeighborhood=null;
    const flying=()=>airship.state.active&&!rope.onGround;
    const labelPool=[],niaCitizen={id:'nia',label:'Woman',named:'Nia'};
    const HILLS=SF_HILLS.map(h=>({...h,x:mapPosition(h.x),y:mapPosition(h.y),r:mapPosition(h.r)}));
    // Planned city blocks. Regular streets use the same half-tile center lines;
    // SoMa has a separate 45-degree grid meeting Market Street.
    const streets=[];
    const street=(name,points,w=.5,kind='road')=>streets.push({name,points,w,kind,planned:true});
    street('Market Street',[[69.5,29.5],[46.5,52.5]],.75,'market');
    street('Embarcadero',[[60.5,14.5],[64.5,18.5],[68.5,23.5],[71.5,29.5],[71.5,35.5],[73.5,42.5],[74.5,48.5]],.65);
    const west=[12.5,18.5,23.5,29.5,34.5,40.5];
    for(let i=0;i<west.length;i++){
        street(['Great Highway','Sunset Boulevard','19th Avenue','24th Avenue','30th Avenue','Stanyan Street'][i],[[west[i],45.5],[west[i],80.5]]);
        if(i)street('Richmond avenue',[[west[i],28.5],[west[i],36.5]]);
    }
    for(const [name,z] of [['Lincoln Way',45.5],['Irving Street',51.5],['Noriega Street',56.5],['Taraval Street',61.5],['Vicente Street',66.5],['Sloat Boulevard',71.5],['Ocean Avenue',77.5]])street(name,[[12.5,z],[40.5,z]]);
    for(const [name,z] of [['Clement Street',28.5],['Geary Boulevard',32.5],['Fulton Street',36.5]])street(name,[[12.5,z],[z===28.5||z===36.5?40.5:Math.min(60.5,99-z),z]]);
    for(const [name,x] of [['Divisadero Street',42.5],['Van Ness Avenue',49.5],['Powell Street',54.5],['Grant Avenue',60.5]])street(name,[[x,x<46?22.5:x===54.5?13.5:17.5],[x,Math.min(43.5,99-x)]]);
    for(const [name,z] of [['Lombard Street',17.5],['Broadway',22.5],['California Street',27.5]])street(name,[[z<23?45.5:40.5,z],[Math.min(z>=27?60.5:68.5,99-z),z]]);
    street('Marina Boulevard',[[32.5,16.5],[38.5,17.5],[45.5,17.5]]);
    street('Fell Street',[[40.5,39.5],[49.5,39.5]]);street('Oak Street',[[40.5,42.5],[55.5,42.5]]);
    street('Haight Street',[[40.5,48.5],[49.5,48.5]]);
    for(const [name,x] of [['Divisadero south',44.5],['Castro Street',49.5],['Valencia Street',54.5],['Mission Street',59.5],['South Van Ness',64.5],['Third Street',70.5]])street(name,[[x,x<50?43.5:x-3],[x,x<50?64.5:77.5]]);
    for(const [name,z] of [['Sixteenth Street',54.5],['Twentieth Street',59.5],['Twenty-fourth Street',64.5],['Cesar Chavez Street',69.5],['Alemany Boulevard',74.5]])street(name,[[44.5,z],[Math.min(74.5,z+3),z]]);
    for(const [name,sum] of [['Mission Street north',108],['Folsom Street',117],['Harrison Street',126]])street(name,[[(sum+3)/2,(sum-3)/2],[74.5,sum-74.5]]);
    for(const [name,diff] of [['Second Street',30],['Fourth Street',21],['Sixth Street',12],['Eighth Street',3]])street(name,[[(99+diff)/2,(99-diff)/2],[(126+diff)/2,(126-diff)/2]]);
    for(const r of streets)r.points=r.points.map(p=>p.map(layoutPosition));
    // End each northern avenue where its southbound continuation begins.
    for(const name of ['Great Highway','24th Avenue','30th Avenue','Stanyan Street'])streets.find(r=>r.name===name).points.at(-1)[1]=89.5;
    streets.find(r=>r.name==='19th Avenue').points.at(-1)[1]=91.5;
    streets[0].points=mapPolygon(DOWNTOWN.market);
    streets.find(r=>r.name==='Embarcadero').points[3]=DOWNTOWN.market[0].map(mapPosition);
    street('First Street',mapPolygon(DOWNTOWN.firstStreet),.5);
    for(const r of SOUTHERN_ROADS){street(r.name,r.points,AIRSHIP_ACCESS.halfWidth);streets.at(-1).regional=true;}
    for(const r of ZOO_PATHS)street(r.name,r.points,r.w,'path');
    // These two streets hug the park's actual edges, on the same coordinates.
    streets.find(r=>r.name==='Fell Street').points.forEach(p=>p[1]=mapPosition(PANHANDLE.north)-.8);
    streets.find(r=>r.name==='Oak Street').points.forEach(p=>p[1]=mapPosition(PANHANDLE.south)+.8);
    street('Stanyan park edge',[[mapPosition(32)-.85,layoutPosition(36.5)],[mapPosition(32)-.85,layoutPosition(45.5)]]);
    street('Masonic Avenue',mapPolygon([[35.8,30.95],[35.8,32.2]]),.38);
    street('Portola Drive',mapPolygon([[35,39],[32,41],[31,46],[34,50],[40,55]]),.5);
    for(const [name,points] of [
        ['Presidio Boulevard',[[19,9],[20,13],[24,16],[27,20],[32,22]]],
        ['JFK Promenade',[[10,30.5],[15,30.1],[19,30.5],[24,30.3],[29,31],[32,31.5],[37.1,31.5]]],
        ['Main Post walk',[[22,17.5],[29,17.5]]],['Lovers Lane',[[25,17.5],[27,19.5],[29,21]]],
        ['Crissy Field promenade',[[25,11.5],[29,12],[32,12]]],
        ['Martin Luther King Jr Drive',[[10,33],[18,33.2],[25,33.3],[31,33]]],
        ['Twin Peaks trail',[[32,41],[30,41.5],[29,43],[28,44.5],[31,46]]]
    ])street(name,mapPolygon(points),.24,'path');
    const market = streets[0], POND = {x:23.3,y:32,rx:1.9,ry:.8}, PALACE_LAGOON={x:34.6,y:13.1,rx:1.4,ry:.8};
    for(const p of [POND,PALACE_LAGOON])for(const key of ['x','y','rx','ry'])p[key]*=MAP_SCALE;
    // Keep the private cartography north of the city too, so following the
    // player into Marin does not turn the headlands into blank water.
    const MAP_ART={x:220,y:640,width:900,height:Math.ceil(640+SOUTHERN_BOUNDS.south*9.5/MAP_SCALE+24)};
    const cityMap=headless?null:document.createElement('canvas');if(cityMap){cityMap.width=MAP_ART.width;cityMap.height=MAP_ART.height;}
    function insidePolygon(x,y,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const [ax,ay]=points[i],[bx,by]=points[j];if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;}return inside;}
    function distanceToSegment(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);}
    function nearestStreet(x,y){let distance=Infinity,index=0;streets.forEach((r,i)=>{for(let j=1;j<r.points.length;j++){const d=distanceToSegment(x,y,r.points[j-1],r.points[j]);if(d<distance){distance=d;index=i;}}});return {distance,index};}
    function alongStreet(r,f){r={...r,points:r.route||r.points};const lengths=r.points.slice(1).map((p,i)=>Math.hypot(p[0]-r.points[i][0],p[1]-r.points[i][1]));let d=f*lengths.reduce((a,b)=>a+b,0);for(let i=0;i<lengths.length;i++){if(d<=lengths[i]||i===lengths.length-1){const a=r.points[i],b=r.points[i+1],t=d/lengths[i];return {x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t};}d-=lengths[i];}}
    const inPanhandle=(x,y)=>inBounds(x/MAP_SCALE,y/MAP_SCALE,PANHANDLE);
    const inPark=(x,y)=>inBounds(x/MAP_SCALE,y/MAP_SCALE,PARK_BOUNDS)||inPanhandle(x,y);
    const lincolnWay=streets.find(r=>r.name==='Lincoln Way');
    const parkSouthEdge=Object.freeze({west:mapPosition(PARK_BOUNDS.west),east:mapPosition(PARK_BOUNDS.east),north:mapPosition(PARK_BOUNDS.south),south:lincolnWay.points[0][1]-lincolnWay.w-TILE_CONFIG.curbWidth});
    const pondValue = (x,y) => ((x-POND.x)/POND.rx)**2+((y-POND.y)/POND.ry)**2;
    const mercedValue = (wx,wy) => {const x=wx/MAP_SCALE,y=wy/MAP_SCALE;return Math.min(((x-16)/1.7)**2+((y-56)/2.7)**2,((x-18.5)/1.7)**2+((y-58.3)/2.2)**2);};
    const palaceWater = (x,y) => ((x-PALACE_LAGOON.x)/PALACE_LAGOON.rx)**2+((y-PALACE_LAGOON.y)/PALACE_LAGOON.ry)**2;
    const greenArea = (wx,wy) => {const x=wx/MAP_SCALE,y=wy/MAP_SCALE;return wx<layoutPosition(12.5)+3.5&&wy>=layoutPosition(45.5)||inPark(wx,wy)||inBounds(wx,wy,parkSouthEdge)||woodedHillPark(x,y)||insidePolygon(wx,wy,PRESIDIO)||x>=31.5&&x<=36&&y>=11&&y<=15||x<13&&y>18&&y<26||x>=33&&x<=36&&y>=27&&y<=30||inBounds(x,y,DOLORES_PARK)||((x-29)/4)**2+((y-43)/5)**2<1||((x-28)/3)**2+((y-52)/3)**2<1||((x-17)/3.6)**2+((y-57)/3.5)**2<1;};
    function water(x,y){return !insidePolygon(x+.5,y+.5,COAST);}
    function isWalkable(x,y){return cityNavigation?navFree(x+.5,y+.5):Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<N&&y<N&&landMask[y*N+x]&&!occupied[y*N+x];}
    function placeAt(x,y){return places.find(p=>{const [u,v]=buildingPoint(p,x+.5,y+.5,true);return u>p.x&&u<p.x+p.w&&v>p.y&&v<p.y+p.d;})||null;}
    function instituteRoomAt(x,z){return instituteRooms.find(room=>insideInstitute(room,x,z))||null;}
    function activeInstituteRoom(){
        if(capture.state.active||chase?.state.jailed||rocket.state.active||surf.state.riding||flying()||rope.climbing||sutroClimb.state.active||tahoe.state.mode!=='ground'||ferrari?.state.riding)return null;
        return instituteRoomAt(player.x+.5,player.y+.5);
    }
    function registerInstituteInterior(sight,interior){
        const room={...interior.spec,sight,entry:sight.entry,inside:sight.inside};
        const object={sight,researchRoom:room,mesh:interior.mesh,gpu:upload(interior.mesh),sections:interior.sections,start:0,count:interior.mesh.data.length/11,lo:interior.lo,hi:interior.hi,x:room.x-room.w/2,y:room.z-room.d/2,w:room.w,d:room.d,base:room.base,arch:'research-interior',preserveGround:true,navigationPolygons:[]};
        room.object=object;objects.push(object);buildingModels.push(object);instituteRooms.push(room);
        for(const detail of sight.details||[]){
            const section=interior.sections.find(p=>p.kind===detail.section);if(!section)throw new Error('Missing detail geometry: '+detail.id);
            const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity],data=interior.mesh.data;
            for(let i=section.start*11;i<(section.start+section.count)*11;i+=11)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],data[i+k]);hi[k]=Math.max(hi[k],data[i+k]);}
            const target={sight:{...detail},detailTarget:true,mesh:interior.mesh,start:section.start,count:section.count,lo,hi};target.sight.object=target;objects.push(target);sights.push(target.sight);
        }
    }
    function landClearAt(x,y){return countryside?.contains(x+.5,y+.5)||marinLand?.contains(x+.5,y+.5)||esotericCampus?.contains(x+.5,y+.5)||goldenGate?.contains(x+.5,y+.5)||regionalRoad?.contains(x+.5,y+.5)?true:tahoe.contains(x+.5,y+.5)?tahoe.walkable(x+.5,y+.5):airship.contains(x+.5,y+.5)?true:cityNavigation?navFree(x+.5,y+.5):isWalkable(Math.floor(x),Math.floor(y));}
    function clearAt(x,y){if(secretWorld?.kind==='illuminati')return CAVE_NAVIGATION.free(x,y);return chase?.state.jailed?detention.walkable(x+.5,y+.5):landClearAt(x,y);}
    function canTravel(ax,ay,bx,by,ignoreCustody=false){
        if(secretWorld?.kind==='illuminati')return CAVE_NAVIGATION.segment({x:ax,y:ay},{x:bx,y:by});
        const endpointFree=ignoreCustody?landClearAt:clearAt;if(!endpointFree(ax,ay)||!endpointFree(bx,by))return false;
        if(countryside?.segment({x:ax,y:ay},{x:bx,y:by})||marinLand?.segment({x:ax,y:ay},{x:bx,y:by}))return true;
        if(esotericCampus?.segment({x:ax,y:ay},{x:bx,y:by})||goldenGate?.segment({x:ax,y:ay},{x:bx,y:by})||regionalRoad?.segment({x:ax,y:ay},{x:bx,y:by}))return true;
        if(tahoe.contains(ax+.5,ay+.5)||tahoe.contains(bx+.5,by+.5))return tahoe.segment({x:ax,y:ay},{x:bx,y:by});
        if((ignoreCustody||!chase?.state.jailed)&&airship.segment({x:ax,y:ay},{x:bx,y:by}))return true;
        return cityNavigation?.segment({x:ax,y:ay},{x:bx,y:by})||false;
    }

    function occupy(x,y,w=1,d=1){for(let j=Math.max(0,Math.floor(y));j<Math.min(N,Math.ceil(y+d));j++)for(let i=Math.max(0,Math.floor(x));i<Math.min(N,Math.ceil(x+w));i++)occupied[j*N+i]=1;}
    const configs = [
        {id:'home',name:"John's place",label:"John's place",category:'Bio & contact',source:'Bio',x:34,y:16,w:3,d:3,h:106,color:'#d3bc88',style:'victorian',description:'A San Francisco resident, builder, and incurable optimist. Ring the bell and say hello.'},
        {id:'links',name:'Mazarine Coffee',label:'Mazarine Coffee',category:'Links · Market Street',source:'Links',x:44,y:24,w:3,d:3,h:73,color:'#c99a79',style:'cafe',description:'Coffee on Market Street. Nia is enjoying a table inside Mazarine; browse a few connections to the rest of the internet over coffee.'},
        {id:'writing',name:'City Lights',label:'City Lights · Essays',category:'Writing',source:'Writing',x:44,y:15,w:3,d:3,h:88,color:'#d3c29e',style:'library',description:"Pull up a chair. Essays on technology, markets, and the ideas that won't leave you alone."},
        {id:'books',name:'Main Library',label:'Main Library · Bookshelf',category:'Bookshelf',source:'Bookshelf',x:40,y:27,w:3,d:3,h:88,color:'#cbc6b4',style:'civic',description:'Fiction and non-fiction that stay with you, long after the last page.'},
        {id:'press',name:'The Chronicle',label:'The newsstand',category:'Press & podcasts',source:'Press',x:44,y:34,w:3,d:2,h:48,color:'#bb7e60',style:'kiosk',description:'Extra, extra. News, conversations, and dispatches from the world of building companies.'},
        {id:'green',name:'Green Bank',label:'Green Bank',category:'Founding',source:'Founding',match:'green.com',x:49,y:38,w:3,d:3,h:102,color:'#789788',style:'bank',description:'A global financial institution for the people and agents of the future. Speak to the friendly banker inside: deposited coins earn 5% interest per hour. Coffee is on the house.'},
        {id:'limit',name:'Limit',label:'Limit',category:'Founding',source:'Founding',match:'limit.com',x:52,y:43,w:3,d:3,h:87,color:'#91a6ab',style:'shop',description:'Tools that changed the daily lives of thousands of insurance professionals.'},
        {id:'rose',name:'Rose',label:'Rose',category:'Founding',source:'Founding',match:'rosehome.com',x:25,y:25,w:3,d:2,h:70,color:'#c29790',style:'shop',description:'A healthier home, starting with the environment around you.'},
        {id:'venture',name:'Venture exchange',label:'Venture exchange',category:'Venture',source:'Venture',x:48,y:15,w:3,d:3,h:115,color:'#b0a18c',style:'bank',description:'An arcade of ambitious companies. Meet the builders working on what comes next.'},
        {id:'ai-lab',name:'AI Lab',label:'AI Lab',category:'SoMa · interview & employment',source:'AI Lab',x:49,y:32,w:3.5,d:3,worldHeight:3.1,color:'#82989b',trim:'#dbe3d6',arch:'warehouse',roof:'flat',roofColor:'#657a7e',description:'A SoMa AI lab with a levitating cortical brain, magnetic containment rings, specimen pods, and humming GPU racks. Score 40 or more on the two-minute arithmetic interview to get the job, then earn 1 coin every 2 seconds while inside.'},
        {id:'etc',name:'Curiosity shop',label:'Curiosity shop',category:'Etc. · Haight-Ashbury',source:'Etc.',x:31,y:36,w:3,d:3,h:78,color:'#aca0b3',style:'shop',description:'Other corners of the internet, a past life on the web, and a few digital curiosities.'}
    ];
    configs.push(...GUILD_BUILDINGS.map(b=>({...b})));
    configs.forEach(b => {b.x=mapTile(b.x);b.y=mapTile(b.y);const door=Math.floor(b.x+b.w/2);b.entry={x:door,y:b.y+b.d};b.inside={x:door,y:b.y+b.d-2};places.push(b);});
    const sights = [
        {id:'park',label:'Golden Gate Park',category:'Park · ducks & cycling',kind:'park',x:30,y:32,entry:{x:30,y:31},description:'A long green escape on the western side of the city. Winding paths, cypress trees, and a pond full of very opinionated ducks.'},
        {id:'panhandle',label:'The Panhandle',category:'Fell & Oak · tree-lined cycle path',kind:'park',x:34,y:30,entry:{x:35,y:31},description:'The narrow green strip continuing east from Golden Gate Park between Fell and Oak. Cycle beneath the trees, pass the park monument, and continue toward Alamo Square.'},
        {id:'presidio',label:'Presidio · Main Post',category:'Parade ground · red-roof barracks',kind:'park',x:22,y:13,entry:{x:25,y:17},description:'Wooded hills give way to a broad parade ground, a flagpole, and rows of red-roof barracks. Trails lead toward Crissy Field, Lovers Lane, and the Golden Gate.'},
        {id:'crissy',label:'Crissy Field',category:'Presidio · bayfront meadow',kind:'park',x:28,y:11,entry:{x:29,y:12},description:'A low, open meadow beside the bay, below the wooded Presidio. Borrow the windsurf board by the promenade to sail off the beach.'},
        {id:'windsurf',label:'Windsurfing',category:'Crissy Field · board launch',kind:'windsurf',x:WINDSURF_LAUNCH.shore[0],y:WINDSURF_LAUNCH.shore[1],entry:{x:29,y:12},description:'A windsurf board and rig wait beside Crissy Field. Click the bay to sail; use Return to shore when you are ready to land.'},
        {id:'palace',label:'Palace of Fine Arts',category:'Marina · rotunda & lagoon',kind:'palace',x:32,y:12,entry:{x:32,y:15},description:'A sandstone-colored rotunda rises beside a little lagoon. Its dome and colonnade mark the eastern edge of the Presidio and the Marina.'},
        {id:'deyoung',label:'de Young Museum',category:'Golden Gate Park · copper tower',kind:'museum',x:26,y:29,entry:{x:26,y:31},description:'A dark copper museum and a twisted observation tower overlook the Music Concourse. The Academy sits across the plaza.'},
        {id:'academy',label:'California Academy of Sciences',category:'Golden Gate Park · living roof',kind:'museum',x:27,y:32,entry:{x:28,y:33},description:'Rounded green hills form the living roof of the Academy. Skylights, gardens, and the Music Concourse make a small cultural center within the park.'},
        {id:'conservatory',label:'Conservatory of Flowers',category:'Golden Gate Park · white glasshouse',kind:'garden',x:30,y:29,entry:{x:30,y:30},description:'A white glasshouse with a central dome, long glazed wings, and bright flower beds. The Panhandle begins a short ride to the east.'},
        {id:'windmill',label:'Park windmill',category:'Golden Gate Park · western gardens',kind:'windmill',x:11,y:29,entry:{x:12,y:31},description:'A timber windmill and flower beds stand near the park’s western end. Beyond the Great Highway, Ocean Beach opens onto the Pacific.'},
        {id:'ferry',label:'Ferry Building',category:'Embarcadero · waterfront',kind:'ferry',x:52,y:17,entry:{x:53,y:23},description:'The clock tower at the bay end of Market Street. Watch a streetcar roll past, then follow the waterfront north.'},
        {id:'coit',label:'Coit Tower',category:'Telegraph Hill',kind:'coit',x:46,y:12,entry:{x:47,y:15},description:'A pale tower above the steep streets of Telegraph Hill. North Beach sits just down the slope.'},
        {id:'pyramid',label:'Transamerica Pyramid',category:'Financial District · redwood plaza',kind:'pyramid',x:48,y:19,entry:{x:51,y:22},description:'A pale, tapering pyramid with a gridded façade and projecting side wings. A small redwood plaza softens the base of the Financial District landmark.'},
        {id:'painted',label:'Painted Ladies',category:'Alamo Square',kind:'painted',x:34,y:28,entry:{x:35,y:30},description:'A row of colorful Victorian houses overlooking Alamo Square. A good place to pause before riding west to the park.'},
        {id:'chinatown',label:'Chinatown',category:'Grant Avenue',kind:'gate',x:45,y:22,entry:{x:47,y:23},description:'Red pillars, green roof tiles, and Grant Avenue leading into Chinatown. Keep heading north for City Lights.'},
        {id:'bicycle',label:'Bicycle',category:'Ride around the city · B',kind:'bike',get entry(){return {x:Math.round(bike.x),y:Math.round(bike.y)};},description:'A red city bicycle. Ride it along Market Street and through the park. Press B to ride or park it; dismount automatically at shop doors.'},
        {id:'golden',label:'Golden Gate Bridge',category:'Presidio · northern strait',kind:'bridge',x:18,y:0,entry:{x:20,y:10},description:'The orange towers span the Golden Gate between the Presidio and Marin. The Pacific opens to the west; the bay opens to the east.'},
        {id:'beach',label:'Ocean Beach',category:'Pacific coast · western shore',kind:'beach',x:9,y:42,entry:{x:10,y:42},description:'The long Pacific shoreline beside the Great Highway. Golden Gate Park reaches the beach to the north, and the Sunset stretches inland.'},
        {id:'baybridge',label:'Bay Bridge',category:'Rincon Point · eastern waterfront',kind:'bridge',x:55,y:23,entry:{x:54,y:28},description:'The bridge leaves the eastern waterfront for Yerba Buena Island and the East Bay.'},
        {id:'peaks',label:'Twin Peaks',category:'Central hills · Portola Drive',kind:'hill',x:29,y:43,entry:{x:30,y:43},description:'The central ridgeline rises between the Sunset and the Castro. Follow the winding trail for a different view of the city.'},
        {id:'sutro',label:'Sutro Tower',category:'Central ridge · Clarendon Heights',kind:'tower',x:SUTRO_SITE.x,y:SUTRO_SITE.y,entry:{...SUTRO_SITE.entry},mapPoint:{x:SUTRO_SITE.x,y:SUTRO_SITE.y},description:'The red-and-white broadcasting tower rises between Mount Sutro and Twin Peaks. Three splayed legs, triangular crossbeams and slender antenna masts make its unmistakable silhouette above the trees.'},
        {id:'merced',label:'Lake Merced',category:'Southwestern San Francisco',kind:'lake',x:17,y:57,entry:{x:20,y:57},description:'A freshwater lake near the southwestern edge of the city, south of the Sunset and close to the Pacific.'},
        {id:'nia',label:'Nia · café regular',category:'Mazarine Coffee',kind:'guest',x:44,y:28,entry:{x:45,y:29},hiddenFromDirectory:true,description:'A friendly woman with warm brown skin and dark curls, enjoying her coffee at a table inside Mazarine.'},
        {id:'ducks',label:'Mallards & ducklings',category:'Golden Gate Park',kind:'ducks',entry:{x:26,y:32},hiddenFromDirectory:true,description:'Mallards and little ducklings paddle around the pond. They seem certain you brought something for them.'}
    ];
    sights.push(...RESTAURANTS.map(r=>({id:r.id,label:r.label,kind:'restaurant',x:r.target[0],y:r.target[1],entry:{x:r.target[0],y:r.target[1]},category:r.category,description:r.description})));
    sights.push(
        {id:'cityhall',label:'City Hall',category:'Civic Center · gilded dome',kind:'civic',x:38,y:30,entry:{x:39,y:33},description:'The granite wings and gilded dome of City Hall anchor Civic Center, just west of Market Street. Speak to the clerk outside about permits.'},
        {id:'salesforce',label:'Salesforce Tower',category:'South of Market · skyline',kind:'tower',x:50,y:25,entry:{x:51,y:28},description:'Broad glass façades taper toward a flat rooftop and a softly illuminated crown over the dense towers south of Market. The Transamerica Pyramid stands farther north.'},
        {id:'oracle',label:'Oracle Park',category:'South Beach · ballpark & cove',kind:'stadium',x:52,y:34,entry:{x:51,y:36},description:'A brick ballpark opens toward McCovey Cove, with green grass, tiered stands, and tall floodlights above the waterfront.'},
        {id:'dolores',label:'Dolores Park',category:'Mission · hillside lawns',kind:'park',x:36,y:44,entry:{x:36,y:46},description:'Palm trees and sloping lawns sit between the Mission and the Castro, with the downtown skyline beyond.'}
    );
    const ferrySite=sights.find(s=>s.id==='ferry'),salesforceSite=sights.find(s=>s.id==='salesforce'),bridgeSite=sights.find(s=>s.id==='baybridge');
    ferrySite.x=DOWNTOWN.ferry.center[0];ferrySite.y=DOWNTOWN.ferry.center[1];
    ferrySite.entry={x:DOWNTOWN.ferry.entrance[0]-.35*Math.SQRT1_2,y:DOWNTOWN.ferry.entrance[1]+.35*Math.SQRT1_2};
    ferrySite.mapPoint={x:DOWNTOWN.ferry.center[0],y:DOWNTOWN.ferry.center[1]};
    salesforceSite.x=DOWNTOWN.salesforce.center[0];salesforceSite.y=DOWNTOWN.salesforce.center[1];salesforceSite.entry={x:50,y:31.6};salesforceSite.mapPoint={x:50,y:30};
    bridgeSite.entry={x:DOWNTOWN.bridge.rampStart[0],y:DOWNTOWN.bridge.rampStart[1]};bridgeSite.mapPoint={x:DOWNTOWN.bridge.abutment[0],y:DOWNTOWN.bridge.abutment[1]};
    for(const [id,x,y] of [['panhandle',35,31.5],['presidio',25,15],['crissy',29,11.5],['palace',33,13],['deyoung',27,29.5],['academy',28,32.5],['conservatory',31,29.5],['windmill',11.5,29.5],['pyramid',49,20],['coit',47,13],['golden',18.8,5]])sights.find(s=>s.id===id).mapPoint={x,y};
    for(const [id,label] of [['deyoung','de Young'],['academy','Academy · living roof'],['conservatory','Conservatory']])sights.find(s=>s.id===id).worldLabel=label;
    for(const s of sights){if(s.x!==undefined)s.x=mapTile(s.x);if(s.y!==undefined)s.y=mapTile(s.y);if(s.kind!=='bike')s.entry={x:mapTile(s.entry.x),y:mapTile(s.entry.y)};if(s.mapPoint)s.mapPoint={x:mapPosition(s.mapPoint.x),y:mapPosition(s.mapPoint.y)};}
    function sightById(id){return sights.find(s=>s.id===id);}
    function setupZoo(){
        const c=SF_ZOO.cage,h=UCSF_HOSPITAL;
        zooBase=levelTerrainPad(c.x,c.z,c.w+.2,c.d+.2);
        levelTerrainPad(18.7,86.8,2.6,1.7);levelTerrainPad(h.x,h.z,h.w,h.d);
        for(const poly of [rectangle(SF_ZOO.x,SF_ZOO.z,SF_ZOO.w,SF_ZOO.d),rectangle(h.x,h.z,5.4,8.4)]){claimParcel({polygon:poly,kind:'public garden'});publicSpaces.push(poly);}
        for(const pen of ZOO_ENCLOSURES.filter(s=>s.z<N)){
            levelTerrainPad(pen.x,pen.z,pen.w+.1,pen.d+.1);
            const poly=rectangle(pen.x,pen.z,pen.w+.1,pen.d+.1);claimParcel({polygon:poly,kind:'public garden'});publicSpaces.push(poly);
        }
        for(const site of [...drawZooAndHospital(sceneMesh,terrainHeight,signs),...drawZooEnclosures(sceneMesh,terrainHeight,{include:s=>s.z<N})]){
            const sight={id:site.id,kind:site.kind,label:site.label,entry:site.entry,description:site.description,mapPoint:{x:site.lo[0]+(site.hi[0]-site.lo[0])/2,y:site.lo[2]+(site.hi[2]-site.lo[2])/2}};
            const object={mesh:sceneMesh,start:site.start/11,count:site.count/11,x:site.lo[0],y:site.lo[2],w:site.hi[0]-site.lo[0],d:site.hi[2]-site.lo[2],lo:site.lo,hi:site.hi,base:site.base,footprint:site.footprint,solid:true,pinned:true,preserveGround:true,arch:site.kind==='zoo'?'enclosure':'civic',sight};
            sight.object=object;objects.push(object);sights.push(sight);
        }
    }
    function setupCityFitness(){
        const g=SF_FITNESS;levelTerrainPad(g.x,g.z,g.w+.15,g.d+.2,0,g.base-.015);
        const site=drawFitness(sceneMesh,signs),sight={...site},object={sight,mesh:sceneMesh,start:site.start/11,count:site.count/11,lo:site.lo,hi:site.hi,x:g.x-g.w/2,y:g.z-g.d/2,w:g.w,d:g.d,base:g.base,arch:'fitness',solid:true,pinned:true,preserveGround:true,footprint:rectangle(g.x,g.z,g.w,g.d),navigationPolygons:fitnessObstacles()};
        sight.object=object;sights.push(sight);objects.push(object);
        const grounds=rectangle(g.x,g.z+.3,g.w+.4,g.d+1.2);claimParcel({polygon:grounds,kind:'fitness grounds',object});publicSpaces.push(grounds);
    }
    function setupJurassicCampus(){
        const j=JURASSIC;levelTerrainPad(j.x,j.z,j.w,j.d,0,j.base-.04);
        const site=drawJurassicCampus(sceneMesh,signs),sight={id:'jurassic-biosciences',kind:'biosciences',label:'Jurassic Biosciences',entry:{...j.entry},description:'A discreet biosciences company in the green belt. Its cage contains a velociraptor. Speak to the scientist outside about fieldwork.'};
        const obstacle=b=>rectangle(b.x,b.z,b.w+.06,b.d+.06),object={sight,mesh:sceneMesh,start:site.start/11,count:site.count/11,lo:site.lo,hi:site.hi,x:j.x-j.w/2,y:j.z-j.d/2,w:j.w,d:j.d,base:j.base,arch:'biosciences',pinned:true,solid:true,preserveGround:true,navigationPolygons:[obstacle(j.lab),obstacle(j.cage)]};
        sight.object=object;objects.push(object);sights.push(sight);const grounds=rectangle(j.x,j.z+.7,j.w+.8,j.d+2.2);claimParcel({polygon:grounds,kind:'biosciences grounds'});publicSpaces.push(grounds);
    }
    function setupExpeditionSites(){
        const j=JURASSIC,scientistPoint=airship.nearest(j.entry.x,j.entry.y,.9,(x,y)=>landClearAt(x,y));if(!scientistPoint)throw new Error('Jurassic Biosciences needs a reachable scientist');
        sightById('jurassic-biosciences').entry={...scientistPoint};
        merchants.push({id:'jurassic-scientist',expeditionRole:'scientist',label:'Jurassic scientist',name:'Dr. Helen Vale',x:scientistPoint.x+.5,z:scientistPoint.y+.5,base:characterGround(scientistPoint.x+.5,scientistPoint.y+.5),skin:'#a98260',shirt:'#e7e8de',hair:'#554737',coat:true,angle:-Math.PI/2,height:1.9,description:'A scientist with a clipboard, a spare railgun, and a remarkably flexible definition of a controlled experiment.'});
        const p=COW_PEN,start=sceneMesh.data.length;drawCattlePen(sceneMesh,terrainHeight);const footprint=(x,z,w,d)=>rectangle(x,z,w,d),sight={id:'south-cow-pen',kind:'cattle',label:'Southern cow pasture',entry:{...p.entry},description:'Three cows graze at the southern end of the peninsula. A defeated cow drops a sandwich and respawns after ten seconds.'},polygons=[footprint(p.x,p.z-p.d/2,p.w,.12),footprint(p.x-p.w/2,p.z,.12,p.d),footprint(p.x+p.w/2,p.z,.12,p.d),...[-1,1].map(side=>footprint(p.x+side*(p.w/4+.35),p.z+p.d/2,p.w/2-.7,.12))];
        const object={sight,mesh:sceneMesh,start:start/11,count:(sceneMesh.data.length-start)/11,lo:[p.x-p.w/2,0,p.z-p.d/2],hi:[p.x+p.w/2,16,p.z+p.d/2],x:p.x-p.w/2,y:p.z-p.d/2,w:p.w,d:p.d,arch:'cow-pen',solid:true,preserveGround:true,navigationPolygons:polygons};sight.object=object;objects.push(object);sights.push(sight);
        const coast=westernCoastX(PEQUOD.z),entry=airship.nearest(coast+.6-.5,PEQUOD.z-.5,4,(x,y)=>landClearAt(x,y));if(!entry)throw new Error('The Pequod needs a connected beach approach');
        pequodSite={id:'pequod',kind:'pequod',label:'The Pequod',entry,description:'Captain Ahab’s whaling ship. Speak to the captain on the beach; he requires a railgun before taking you hunting.'};sights.push(pequodSite);expeditions.setHarbor({x:coast-PEQUOD.offshore,z:PEQUOD.z});
        ahabNPC={id:'captain-ahab',expeditionRole:'ahab',label:'Captain Ahab',name:'Captain Ahab',x:entry.x+.5,z:entry.y+.5,shore:{x:entry.x+.5,z:entry.y+.5},base:characterGround(entry.x+.5,entry.y+.5),skin:'#ba9f7e',hair:'#c3c1ac',shirt:'#394a58',coat:true,cap:true,angle:Math.PI,height:1.95,description:'Ahab has downsized his ambitions. The procurement requirements remain formidable.',approach:{...entry}};merchants.push(ahabNPC);
        const h=terrainHeight(entry.x+.5,entry.y+.5);for(let x=coast-1.5;x<entry.x+.8;x+=.35){sceneMesh.box(x,.38,PEQUOD.z-.45,.32,.09,.9,'#a58c68','wood');if(Math.floor((x-coast)*10)%7===0)sceneMesh.rod([x,-.25,PEQUOD.z-.4],[x,h+.5,PEQUOD.z-.4],.035,'#827253',9);}
    }
    function playerWeapon(){return selectedWeapon(playerLook.weapon,{bayonet:quests.theyLive.state.bayonet,railgun:expeditions.state.railgun&&expeditions.state.equipped,battleaxe:equipmentOwned(economy.state,'battleaxe')});}
    function setupWilderness(){
        const spawns=wildernessSpawns({marin:goldenGate.gate('marin'),tahoe:TAHOE.base});
        for(const p of spawns)if(!landClearAt(p.x-.5,p.z-.5))throw Error(p.id+' needs a native walkable spawn');
        wilderness=createWilderness({spawns,ground:characterGround,canTravel:(a,b)=>canTravel(a.x-.5,a.z-.5,b.x-.5,b.z-.5,true),route:(a,b)=>pathTo(b.x-.5,b.z-.5,{x:a.x-.5,y:a.z-.5})?.map(p=>({x:p.x+.5,z:p.y+.5})),
            onHit:({actor,damage})=>{if(!headless)expeditionEvent({type:'shot',target:actor,damage,hp:actor.hp,max:actor.max});},
            onDrop:record=>expeditions.state.loot.push({...record,id:'wild-loot-'+(++wildLootSerial),kind:'loot',expires:expeditions.state.clock+120}),
            onDamage:(person,amount,actor)=>{if(headless)return;const damage=health.damage(Math.max(0,rollEnemyDamage(amount,strength.status.level)-equipmentDefense(playerLook)));expeditionEvent({type:'damage',damage,hp:health.state.hp,max:health.state.max,target:actor,message:actor.label+' hits you for '+damage+'.'});if(!health.state.hp){wildTarget=null;expeditionEvent({type:'death',message:'You have died and respawned at UCSF Hospital'});}}});
    }
    function attackWildMonster(npc){
        if(capture.state.active||chase?.state.jailed||secretWorld?.bomber.state.active||flying()||rocket.state.active||surf.state.riding||rope.climbing||sutroClimb.state.active||tahoe.state.mode!=='ground')return false;
        if(ferrari?.state.riding)return parkCarFirst();
        const attack=()=>{if(bike.riding)parkBike();parkMotorcycle(false);skateboard.riding=false;setDancing(false);alienCombat=null;expeditions.stop();wildTarget=npc;player.path=[];player.speed=0;
            if(multiplayerWorld){multiplayerWorld.command('attack',{id:npc.id,weapon:playerWeapon()});wildTarget=null;}return true;};
        closeMenu();closeReader();const d=Math.hypot(npc.x-player.x-.5,npc.z-player.y-.5);return d<=ITEM_STATS[playerWeapon()].range?attack():walkTo(npc.x-.5,npc.z-.5,attack);
    }
    function petBear(npc){
        if(capture.state.active||chase?.state.jailed||secretWorld?.bomber.state.active||flying()||rocket.state.active||surf.state.riding)return false;
        closeMenu();const pet=()=>{wildTarget=null;expeditions.stop();if(multiplayerWorld)multiplayerWorld.command('petBear',{id:npc.id});else {const r=wilderness.pet(npc.id,{x:player.x+.5,z:player.y+.5});announce(r.message,'You');}player.gesture={name:'talk',started:performance.now(),duration:1000};return true;};
        return Math.hypot(npc.x-player.x-.5,npc.z-player.y-.5)<1.8?pet():walkTo(npc.x-.5,npc.z-.5,pet);
    }
    function buyBattleaxe(){
        if(!quests.theyLive.state.completed)return {ok:false,message:'Complete They Live to unlock the American Industrial Center’s full stock.'};
        if(multiplayerWorld){multiplayerWorld.command('buyBattleaxe').then(r=>{dialogue.resolvePending('industrial-armorer',r.message);updateEquipmentControl();});return {ok:true,pending:true,message:'The armorer checks your civic-service record…'};}
        const r=economy.buyEquipment('battleaxe');if(r.ok)updateEquipmentControl();return r;
    }
    function railgunLineClear(a,b){
        const ay=(a.base||0)+1.14,by=(b.base||0)+.9,d=Math.hypot(b.x-a.x,by-ay,b.z-a.z);if(!d)return true;const ray={origin:[a.x,ay,a.z],dir:[(b.x-a.x)/d,(by-ay)/d,(b.z-a.z)/d]};
        return !objects.some(o=>o.arch&&o.arch!=='cow-pen'&&o.sight?.kind!=='park'&&o.sight?.kind!=='biosciences'&&(()=>{const hit=rayBox(ray,o.lo,o.hi);return hit!==null&&hit<d-.2;})());
    }
    function expeditionEvent(e){
        if(headless)return;
        if(e.message)announce(e.message,e.type==='illegal'?'Police':e.type==='damage'?'Combat':'Adventure');
        if(e.type==='illegal'){chase.start();$('sf-wanted').hidden=false;}
        if(e.type==='shot'){combatFeedback.hit(e.target,e.damage,e.hp,e.max);combatFeedback.show(player,health.state.hp,health.state.max);player.angle=Math.atan2(e.target.z-player.y-.5,e.target.x-player.x-.5);player.gesture={name:'attack',started:performance.now(),duration:450};}
        if(e.type==='boarded'){parkMotorcycle(false);if(bike.riding)parkBike();skateboard.riding=false;alienCombat=null;setDancing(false);player.path=[];player.speed=0;action=null;destination=null;closeMenu();setCamera(.65,.8);}
        if(e.type==='disembarked'&&pequodSite){Object.assign(player,pequodSite.entry);player.path=[];player.speed=0;}
        if(e.type==='disembarked'&&secretWorld?.kind==='kraken')secretAction(secretWorld.leave());
        if(e.type==='damage'){combatFeedback.hit(player,e.damage,e.hp,e.max);if(e.target)combatFeedback.show(e.target,e.target.hp,e.target.max);updateAdventureUI();}
        if(e.type==='death')beginCapture('alien',respawnAtHospital);
        if(e.type==='cape')updateCapeControl();
    }
    function talkExpeditionNPC(npc){
        if(capture.state.active||chase?.state.jailed||flying()||rocket.state.active||surf.state.riding||rope.climbing||sutroClimb.state.active||tahoe.state.mode!=='ground')return false;
        if(ferrari?.state.riding)return parkCarFirst();expeditions.stop();closeMenu();closeReader();
        const open=()=>dialogue.open(npc.expeditionRole==='scientist'?scientistDialogue(npc,expeditions):ahabDialogue(npc,expeditions));
        if(expeditions.ship.aboard&&npc===ahabNPC){open();return true;}return approachNPC(npc,open);
    }
    function attackExpeditionTarget(npc){
        if(capture.state.active||chase?.state.jailed||flying()||rocket.state.active||surf.state.riding||rope.climbing||sutroClimb.state.active||tahoe.state.mode!=='ground')return false;
        const weapon=npc.alienId||npc.combatKind==='kraken'?'railgun':playerWeapon(),range=ITEM_STATS[weapon].range;
        if(weapon==='railgun'&&(!expeditions.state.railgun||!expeditions.state.equipped)){announce('Obtain a railgun from Jurassic Biosciences, then equip it with G.');return false;}
        if(npc.combatKind==='raptor'&&expeditions.raptor.phase==='caged'){announce('The cage is locked. Speak to the Jurassic scientist first.');return false;}
        if(npc.alienId){const permission=quests.theyLive.attack(npc.alienId,{revealed:npcRevealed(npc)});if(!permission.ok){announce(permission.message);if(permission.illegal){chase.start();$('sf-wanted').hidden=false;}return false;}npc.combatKind='spectre';npc.hp=npc.alienHP??36;npc.max=36;}
        const shoot=()=>{if(bike.riding)parkBike();parkMotorcycle(false);skateboard.riding=false;alienCombat=null;player.path=[];player.speed=0;setDancing(false);const result=expeditions.attack(npc,weapon);if(result.message)announce(result.message,'Railgun');canvas.focus({preventScroll:true});return result.ok||result.cooldown;};
        closeMenu();if(Math.hypot(npc.x-player.x-.5,npc.z-player.y-.5)<=range&&railgunLineClear({x:player.x+.5,z:player.y+.5,base:playerGround()},npc))return shoot();
        if(expeditions.ship.aboard)return false;
        const point=nearestExpeditionPoint(npc.x-.5,npc.z-.5,range,(x,y)=>{const d=Math.hypot(x+.5-npc.x,y+.5-npc.z);return d>.6&&d<range-.1&&landClearAt(x,y)&&railgunLineClear({x:x+.5,z:y+.5,base:characterGround(x+.5,y+.5)},npc);});
        if(!point){announce('Move within five tiles with a clear line of fire.');return false;}return walkTo(point.x,point.y,shoot);
    }
    function nearestExpeditionPoint(x,y,radius,predicate){if(marinLand?.onLand(x+.5,y+.5))return marinLand.nearest(x,y,radius,predicate);return y>=N-1.5?airship.nearest(x,y,radius,predicate):nearestNavigation(x,y,radius,predicate);}
    function collectExpeditionLoot(item){
        if(capture.state.active||chase?.state.jailed)return false;
        closeMenu();const collect=()=>{if(item.lootKind==='equipment'&&!item.network){if(!expeditions.state.loot.includes(item)||equipmentOwned(economy.state,item.itemId))return false;economy.state.ownedEquipment.push(item.itemId);expeditions.state.loot.splice(expeditions.state.loot.indexOf(item),1);updatePurse(economy.state);updateEquipmentControl();announce('You take the '+ITEM_STATS[item.itemId].name+'. Equip it in Character settings.','Loot');return true;}if(item.lootKind==='peptides'&&!item.network){if(!expeditions.state.loot.includes(item))return false;localPeptides+=item.amount;expeditions.state.loot.splice(expeditions.state.loot.indexOf(item),1);saveLocalGuild();announce('You take the peptides. Ray at the Freemasons’ Guild accepts donations.','Loot');updateAdventureUI();return true;}const r=expeditions.collect(item);if(r.message)announce(r.message,'Loot');updateAdventureUI();return r.ok;};
        const distance=Math.hypot(item.x-player.x-.5,item.z-player.y-.5);if(expeditions.ship.aboard)return item.lootKind==='kraken'&&distance<2?collect():false;
        if(airship.state.active){const floor=item.base??characterGround(item.x,item.z);return distance<1.5&&Math.abs(playerGround()-floor)<2.5?collect():false;}
        if(distance<1.5)return collect();
        const point=nearestExpeditionPoint(item.x-.5,item.z-.5,1.3,(x,y)=>landClearAt(x,y));return point?walkTo(point.x,point.y,collect):false;
    }
    function toggleRailgun(){if(!expeditions.state.railgun)return false;const equipped=playerWeapon()==='railgun';playerLook.weapon='auto';expeditions.state.equipped=equipped;if(expeditions.toggleWeapon()){alienCombat=null;announce(expeditions.state.equipped?'Railgun equipped. Click enemies to fire from up to five tiles.':'Railgun stowed. Use your bayonet for green spectres.','Equipment');try{localStorage.setItem('sf-character-v1',JSON.stringify(playerLook));}catch{}updateAdventureUI();}canvas.focus({preventScroll:true});}
    function setupTigerEncounter(){
        zoo=createTigerEncounter({player,home:{x:SF_ZOO.cage.x-.5,y:SF_ZOO.cage.z-.5},exit:SF_ZOO.exit,wardenStarts:SF_ZOO.wardens,
            routeTo:(x,y,from)=>pathTo(x,y,from,true),speed:ZOO_PURSUIT_SPEED,
            canPursue:()=>!ferrari?.state.riding&&!chase.state.jailed&&!rocket.state.active&&!flying()&&!rope.climbing&&!sutroClimb.state.active&&!surf.state.riding&&tahoe.state.mode==='ground'&&!(zoo?.state.deaths&&Math.hypot(player.x-sightById('ucsf').entry.x,player.y-sightById('ucsf').entry.y)<2.5),
            canCapture:(a,b)=>canTravel(a.x,a.y,b.x,b.y,true),onDeath:()=>beginCapture('tiger',respawnAtHospital),
            onEvent:(event,warden)=>{
                if(event==='released')announce('You open the tiger’s gate. The tiger has interpreted this as a dinner invitation. Run!','Zoo');
                if(event==='dispatched')announce('Animal control is on its way. “Nobody said there would be cardio.”','Animal Control');
                if(event==='captured')announce('“Got you! Back to your rent-controlled enclosure.” Animal control escorts the tiger home.','Animal Control');
                if(event==='caged')announce('The tiger is safely back in its cage. The latch has learned absolutely nothing.','Zoo');
                if(event==='missed'&&warden){warden.speech='That was a practice net!';warden.speechFor=2.4;}
                sightById('zoo').tigerLoose=event!=='caged';
            }
        });
    }
    function releaseTiger(){
        if(multiplayerWorld){multiplayerWorld.releaseTiger();return true;}
        if(!zoo||chase?.state.jailed||rocket.state.active||sutroClimb.state.active||rope.climbing||surf.state.riding||tahoe.state.mode!=='ground')return false;
        if(flying())return airshipUnavailable();closeMenu();
        if(zoo.state.phase!=='caged'){announce(zoo.dangerous?'The tiger is already loose. This is a good time to keep moving.':'Animal control is handling the tiger. Wait until the gate is safely closed.','Zoo');return false;}
        const entry=sightById('zoo').entry;
        if(Math.hypot(player.x-entry.x,player.y-entry.y)>1)return walkTo(entry.x,entry.y,()=>zoo.release());
        return zoo.release();
    }
    function beginCapture(kind,complete){
        social.cancelPitch();expeditions.stop();fishing.cancel();forwardRoll.cancel();
        skateboard.riding=false;alienCombat=null;
        parkMotorcycle(false);
        if(ferrari?.state.riding)parkFerrari();if(training)stopTraining();
        setDancing(false);questMenu?.close();closeCharacter();
        const base=playerGround(true);
        if(!capture.start(kind,base,()=>{world.inert=false;complete();}))return;
        tech.losePhone(kind==='police'?'arrest':'death');
        closeMenu();closeReader();closeHelp();dialogue.close();aiInterview.close();keys.clear();pointers.clear();clearTimeout(pressTimer);
        action=null;destination=null;player.path=[];player.speed=0;player.motion=0;player.moving=false;player.gesture=null;playerSpeechUntil=0;
        if(bike.riding){bike.x=player.x;bike.y=player.y;bike.riding=false;}
        waveSurf.stop();surf.cancelJump();surf.state.riding=false;tahoe.reset();rope.reset();sutroClimb.cancel();world.inert=true;
    }
    function respawnAtHospital(rehabilitated=false){
        secretWorld?.reset();
        if(multiplayer?.state.connected)multiplayer.command(rehabilitated?'personalTransit':'respawn',rehabilitated?{kind:'rehabilitation'}:{});
        social.cancelPitch();if(!rehabilitated)tech.losePhone('death');
        expeditions.abandonShip();health.restore();combatFeedback.clear();alienCombat=null;forwardRoll.cancel();
        action=null;destination=null;dialogue.close();closeMenu();closeReader();closeHelp();keys.clear();pointers.clear();clearTimeout(pressTimer);gesture=false;
        rocket.cancel();rope.reset();airship.cancel();sutroClimb.cancel();tahoe.reset();waveSurf.stop();surf.cancelJump();surf.state.riding=false;bike.riding=false;currentInterior=null;readerPlace=null;playerSpeechUntil=0;
        if(chase){chase.state.wanted=false;chase.state.jailed=false;chase.state.officers=[];}$('sf-wanted').hidden=true;$('sf-custody').hidden=true;
        const entry=sightById('ucsf').entry;Object.assign(player,{x:entry.x,y:entry.y,path:[],speed:0,moving:false,motion:0,phase:0,runBlend:0,vx:0,vy:0,gesture:null,angle:Math.PI});
        for(const input of world.querySelectorAll('#sf-map-button,#sf-bike-button,#sf-surf-button,#sf-airship-button,.sf-place-marker'))input.disabled=false;
        updateClimbButton();updateRocketControls();updateAirshipButton();updateSurfButton();updateBikeButton();updateTahoeButton();setCamera(-Math.PI*.75-.18,1.08);drawMini();
        announce(rehabilitated?'Rehabilitation complete. You arrive outside UCSF in a completely different outfit, 100% inebriated.':'You have died and respawned at UCSF Hospital','Hospital');canvas.focus({preventScroll:true});
    }
    function updateAirshipButton(){
        const flying=airship.state.active,climbing=sutroClimb.state.active,returning=['returning','descending'].includes(airship.state.phase),button=$('sf-airship-button');
        document.querySelector('.sf-actions').dataset.mode=climbing?'climbing':flying?'flying':'ground';
        button.hidden=climbing;button.disabled=!!chase?.state.jailed||returning;
        button.setAttribute('aria-pressed',String(flying));button.replaceChildren(document.createTextNode(returning?'Returning…':flying?'Return to terminal':'Airship'));
        if(!returning){const key=document.createElement('span');key.className='sf-key';key.textContent='A';button.append(key);}
        $('sf-bike-button').hidden=flying||climbing;$('sf-surf-button').hidden=flying||climbing;
        $('sf-rope-button').hidden=!airship.state.active;
        $('sf-rope-button').disabled=!!chase?.state.jailed||rope.climbing||!rope.state.deployed&&airship.state.phase!=='flying';
        $('sf-rope-button').textContent=rope.climbing?'Climbing…':rope.onGround?'Climb rope':rope.state.deployed?'Rope options':'Drop rope';
    }
    function airshipUnavailable(){
        if(clickAttempt)clickAttempt.worked=false;announce('Return the airship to the terminal before using a vehicle or entering a building. Press A to land.');return false;
    }
    function boardAirship(){
        if(chase?.state.jailed||sutroClimb.state.active||surf.state.riding)return false;
        const entry=AIRSHIP_TERMINAL.boarding;
        if(Math.hypot(player.x-entry.x,player.y-entry.y)>.08){closeReader();closeMenu();return walkTo(entry.x,entry.y,boardAirship);}
        if(bike.riding)parkBike();
        parkMotorcycle(false);if(!airship.board(entry))return false;rope.reset();ropeReturnHome=false;basket.reset();basketArrival=null;
        closeReader();closeMenu();keys.clear();player.path=[];player.speed=0;player.gesture=null;action=null;destination=null;currentInterior=null;
        updateAirshipButton();announce('You board the airship’s white flight basket. Click its floor to walk around; click the ground or minimap to fly.','Pilot');canvas.focus({preventScroll:true});return true;
    }
    function walkInBasket(point){
        setDancing(false);
        basketArrival=null;const ok=basket.walkTo(point.x,point.z);if(ok){closeMenu();canvas.focus({preventScroll:true});}return ok;
    }
    function showAirshipMenu(sx=width/2,sy=height/2){
        closeMenu();const menu=$('sf-context');menu.replaceChildren();
        const title=document.createElement('div');title.className='sf-context-title';title.textContent=airship.state.active?'Airship · Choose an option':'Private Jet Terminal · Airship rental';menu.append(title);
        const floor=flying()?basket.pick(mouseRay(sx,sy),airship.state.position,airship.state.heading):null;
        const choices=airship.state.active?[...(floor?[['Walk here',()=>walkInBasket(floor)]]:[]),['Fly to Tahoe',()=>{if(rope.state.deployed){announce('Retract the rope before flying.');return false;}airship.flyTo(TAHOE.base.x,TAHOE.base.z);destination={x:TAHOE.base.x-.5,y:TAHOE.base.z-.5};announce('Flying northeast across California to Lake Tahoe. This is a long continuous flight.','Pilot');return true;}],['Rope options',showRopeMenu],['Return to terminal',useAirship],['Float here',()=>{const p=tileAt(sx,sy);walkTo(p.x,p.y);}]]:[['Rent airship',boardAirship],...(multiplayerWorld?[['Buy grappling hook · 5 coins',()=>multiplayerWorld.buyGrapple()]]:[]),['Examine terminal',()=>examine(sightById('airship'))]];
        for(const [label,fn] of choices){
            const button=document.createElement('button');button.type='button';button.setAttribute('role','menuitem');button.textContent=label;button.addEventListener('click',e=>clicked(e.clientX,e.clientY,()=>{closeMenu();return fn();}));menu.append(button);
        }
        menu.hidden=false;menu.style.left=Math.min(width-menu.offsetWidth-12,Math.max(12,sx))+'px';menu.style.top=Math.min(height-menu.offsetHeight-12,Math.max(12,sy))+'px';menu.querySelector('button').focus({preventScroll:true});return true;
    }
    function useAirship(){
        if(tahoe.state.mode!=='ground')return false;
        if(chase?.state.jailed)return false;
        if(rope.climbing)return false;
        if(rope.onGround){ropeReturnHome=true;return climbRope(false);}
        if(rope.state.deployed&&!rope.retract()){announce('Wait for your passenger to finish climbing.');return false;}
        if(airship.state.active){closeMenu();closeReader();basketArrival=null;basket.state.target=null;airship.returnHome();destination={x:airship.home.x-.5,y:airship.home.z-.5};action=null;updateAirshipButton();announce('Returning to the private jet terminal. The airship will descend onto its mooring.','Pilot');canvas.focus({preventScroll:true});return true;}
        if(sutroClimb.state.active)return climbUnavailable();
        if(surf.state.riding){if(clickAttempt)clickAttempt.worked=false;announce('Return to shore before renting an airship.');return false;}
        const entry=AIRSHIP_TERMINAL.entry;
        if(Math.hypot(player.x-entry.x,player.y-entry.y)<1)return showAirshipMenu();
        closeReader();closeMenu();const accepted=walkTo(entry.x,entry.y,showAirshipMenu);
        if(accepted)announce('Walking south to the private jet terminal and airship rental stand.','Pilot');canvas.focus({preventScroll:true});return accepted;
    }
    function setupAirshipTerminal(){
        const region=navigationRegionAt(player.x,player.y),approach=airportGate(N),gate=nearestNavigation(approach.x,approach.y,.8,(x,y)=>y<N-.5&&navFree(x+.5,y+.5)&&surfaceTypeAt(x+.5,y+.5)==='road'&&navigationRegionAt(x,y)===region);
        if(!gate)throw new Error('Private jet terminal has no connected city approach');airship.setGate(gate);
        airship.setCruiseHeight(Math.max(...objects.map(o=>o.hi[1]))+4);
        const sight={id:'airship',kind:'airship',label:'Private Jet Terminal',category:'South of San Francisco · Airship rentals',entry:{...AIRSHIP_TERMINAL.entry},description:'The private jet terminal occupies the building east of the runway. Its passenger entrance faces the airship mooring to the north. Click Rent airship or press A nearby; click the ground or minimap to fly, and A returns to the mooring.'};sights.push(sight);
        const {start,end,lo,hi}=drawAirshipTerminal(sceneMesh,airportSurfaceHeight,signs),object={sight,x:lo[0],y:lo[2],w:hi[0]-lo[0],d:hi[2]-lo[2],base:AIRSHIP_TERMINAL.base,arch:'terminal',preserveGround:true,mesh:sceneMesh,start:start/11,count:(end-start)/11,lo,hi};
        objects.push(object);sight.object=object;
        const hq=drawStartupHQ(sceneMesh),hqSight={id:'startup-hq',kind:'startup',label:'Startup HQ',entry:{x:STARTUP_HQ.x-.5,y:131.6},description:'A small startup house at the end of Third Street. The orange Y Combinator sign hangs over the door. Talk to the founder to purchase startup equity.'};
        const house={sight:hqSight,mesh:sceneMesh,start:hq.start/11,count:hq.count/11,lo:hq.lo,hi:hq.hi,x:hq.lo[0],y:hq.lo[2],w:hq.hi[0]-hq.lo[0],d:hq.hi[2]-hq.lo[2],solid:true,base:AIRSHIP_TERMINAL.base};
        objects.push(house);hqSight.object=house;sights.push(hqSight);
    }
    function setupMerchants(){
        const region=navigationRegionAt(player.x,player.y),near=(x,z)=>nearestNavigation(x-.5,z-.5,4,(a,b)=>navigationRegionAt(a,b)===region&&clearAt(a,b));
        const exchange=places.find(p=>p.id==='venture'),buyer=near(exchange.entry.x+1.8,exchange.entry.y+.5),grain=near(POND.x-1,PARK_BOUNDS.north*MAP_SCALE-.8);
        if(!buyer||!grain)throw new Error('Trading NPCs need reachable street positions');
        merchants.push(merchant('founder',STARTUP_HQ.x+.35,131.8,AIRSHIP_TERMINAL.base+.04),merchant('secondary',buyer.x+.5,buyer.y+.5,characterGround(buyer.x+.5,buyer.y+.5)),merchant('grain',grain.x+.5,grain.y+.5,characterGround(grain.x+.5,grain.y+.5)));
        drawGrainStand(sceneMesh,merchants.find(p=>p.kind==='grain'));
        const bar=sightById('shanghai-kelly'),barPoint=near(bar.entry.x+.7,bar.entry.y+.5);if(!barPoint)throw new Error('The bar needs a reachable bartender');merchants.push({id:'shanghai-bartender',kind:'bartender',label:'Bartender',name:'Bartender',x:barPoint.x+.5,z:barPoint.y+.5,base:characterGround(barPoint.x+.5,barPoint.y+.5),angle:Math.PI/2,skin:'#ba8d6d',shirt:'#e5dcc8',hair:'#4b3f35',height:1.9});
        const deliSite=sightById('lucindas-deli'),deliPoint=near(deliSite.entry.x+.6,deliSite.entry.y);if(!deliPoint)throw new Error('Lucinda’s needs a reachable proprietor');merchants.push({id:'lucindas-proprietor',kind:'deli',label:'Deli proprietor',name:'Lucinda’s Deli',x:deliPoint.x+.5,z:deliPoint.y+.5,base:characterGround(deliPoint.x+.5,deliPoint.y+.5),angle:Math.PI/2,skin:'#ad825f',shirt:'#ede0bd',hair:'#43362e',height:1.9});
        const lab=places.find(p=>p.id==='ai-lab'),recruiter=near(lab.entry.x+.8,lab.entry.y+.5);if(!recruiter)throw new Error('The AI Lab needs a reachable recruiter');merchants.push({...merchant('recruiter',recruiter.x+.5,recruiter.y+.5,characterGround(recruiter.x+.5,recruiter.y+.5)),id:'ai-lab-recruiter',height:1.9});
        const restaurant=sightById('cotogna'),chef=near(restaurant.entry.x+1.3,restaurant.entry.y+.5);
        if(!chef)throw new Error('Cotogna needs a reachable chef');
        merchants.push({...merchant('chef',chef.x+.5,chef.y+.5,characterGround(chef.x+.5,chef.y+.5)),id:'cotogna-chef',coat:true,height:2.15});
        for(let i=0;i<5;i++)merchants.push({...merchant('tax',TAX_HQ.x+Math.sin(i*Math.PI/2.5)*1.9,130.5+Math.cos(i*Math.PI/2.5)*.7,AIRSHIP_TERMINAL.base+.04),id:'tax-authority-'+i,index:i,hold:0,height:2.15,phase:0});
    }
    function setupNPCRoaming(){
        const obstacles=new Map(),add=(x,z,r)=>{const key=Math.floor(x/4)+','+Math.floor(z/4);if(!obstacles.has(key))obstacles.set(key,[]);obstacles.get(key).push({x,z,r});};
        for(const p of [...cityLightPlan.lamps,...southernNeighborhood.lamps])add(p.x,p.z,.23);
        const grain=merchants.find(n=>n.kind==='grain');for(const dx of [-.6,-.35])add(grain.x+dx,grain.z+.45,.25);
        const free=(x,y)=>{
            if(!landClearAt(x,y)||placeAt(x,y))return false;
            const wx=x+.5,wz=y+.5,cx=Math.floor(wx/4),cz=Math.floor(wz/4);
            for(let j=cz-1;j<=cz+1;j++)for(let i=cx-1;i<=cx+1;i++)for(const p of obstacles.get(i+','+j)||[])if(Math.hypot(p.x-wx,p.z-wz)<p.r)return false;return true;
        };
        specialNPCLife=createNPCRoaming(merchants,{eligible:n=>!n.socialActor&&!n.seated&&!n.researcher&&!!(n.neighborhood||n.alienId||n.questRole||n.expeditionRole==='scientist'||n.kind&&MERCHANTS[n.kind]),walkable:free,canTravel:(ax,ay,bx,by)=>canTravel(ax,ay,bx,by,true),ground:characterGround,approachFor:merchantApproach});
        if(specialNPCLife.unavailable.length)throw new Error('Special NPCs need a connected roaming area: '+specialNPCLife.unavailable.join(', '));
    }
    function setupCityNightlife(){
        const c=NIGHTLIFE,club=buildNightlife(sceneMesh,{height:terrainHeight,naturalHeight:(x,z)=>sampleTerrain(naturalHeights,x,z),cutPlot:cutHousePlot}),sight=club.sight;
        const object={sight,mesh:sceneMesh,start:sight.start/11,count:sight.count/11,lo:sight.lo,hi:sight.hi,x:c.x-c.w/2,y:c.z-c.d/2,w:c.w,d:c.d,base:sight.base,arch:'nightlife',pinned:true,preserveGround:true,navigationPolygons:nightlifeObstacles().map(o=>o.polygon)};
        sight.object=object;nightclub=sight;objects.push(object);sights.push(sight);restaurantDiners.push(...club.diners);
        const parcel=rectangle(c.x,c.z+.65,c.w+.4,c.d+1.7);claimParcel({polygon:parcel,kind:'nightclub'});publicSpaces.push(parcel);
    }
    function setupIndustrialCenter(){
        const c=INDUSTRIAL_CENTER,footprint=rectangle(c.x,c.z,c.w,c.d,c.angle);
        if(!parcelFits(footprint,{park:true}))throw new Error('American Industrial Center must fit between streets on dry land');
        const base=levelTerrainPad(c.x,c.z,c.w,c.d,c.angle),site=drawIndustrialCenter(sceneMesh,signs,{base});
        const sight={...site},object={sight,mesh:sceneMesh,start:site.start/11,count:site.count/11,lo:site.lo,hi:site.hi,x:site.lo[0],y:site.lo[2],w:site.hi[0]-site.lo[0],d:site.hi[2]-site.lo[2],base,arch:'industrial',solid:true,pinned:true,preserveGround:true,footprint};
        sight.object=object;objects.push(object);sights.push(sight);
        const court=rectangle(82.85,c.z,.6,3.2);claimParcel({polygon:court,kind:'workshop forecourt'});publicSpaces.push(court);
        let placed=0;for(const [i,[x,z]] of [[87.2,74.4],[87.2,80.3],[84.3,81.5],[83,73.5],[88.3,77.5],[88.5,80.8],[89.2,78.4],[87.5,82.5],[88.5,72],[85.8,72],[87.6,75]].entries()){
            if(placed>=6)break;const footprint=rectangle(x,z,1.7,2);if(!parcelFits(footprint,{park:true}))continue;
            const h=levelTerrainPad(x,z,1.7,2),part=drawShipyardCargo(sceneMesh,x,h,z,.17+i*.19,placed===0),lo=[x-.85,h,z-1],hi=[x+.85,h+(placed===0?4.3:1.5),z+1];
            const object={mesh:sceneMesh,start:part.start/11,count:part.count/11,lo,hi,x:x-.85,y:z-1,w:1.7,d:2,base:h,arch:'shipyard',solid:true,preserveGround:true,footprint};objects.push(object);claimParcel({polygon:footprint,kind:'shipyard',object});placed++;
        }

    }
    function setupQuestCharacters(){
        const region=navigationRegionAt(player.x,player.y);
        const near=(x,z)=>nearestNavigation(x-.5,z-.5,3,(a,b)=>navigationRegionAt(a,b)===region&&!placeAt(a,b));
        const cityPerson=(id,x,z,extra={})=>{
            const p=near(x,z);if(!p)throw new Error(id+' needs a connected public position');
            const approach=nearestNavigation(p.x+.65,p.y+.25,1,(a,b)=>navigationRegionAt(a,b)===region&&!placeAt(a,b)&&Math.hypot(a-p.x,b-p.y)>.5&&Math.hypot(a-p.x,b-p.y)<1.3);
            if(!approach)throw new Error(id+' needs a reachable conversation approach');
            return {id,label:'Man',x:p.x+.5,z:p.y+.5,base:characterGround(p.x+.5,p.y+.5),angle:Math.PI/2,skin:'#ba926d',hair:'#423b32',shirt:'#758b7c',height:1.85,approach,...extra};
        };
        const hall=sightById('cityhall'),ferry=sightById('ferry'),venture=places.find(p=>p.id==='venture'),factory=sightById('american-industrial-center');
        merchants.push(cityPerson('city-hall-clerk',hall.entry.x+1.4,hall.entry.y+.6,{name:'City Hall clerk',label:'City Hall clerk',questRole:'clerk',shirt:'#7c869f',description:'An unflappable clerk. Her stamp has faced stranger paperwork than this.',female:true,longHair:true}));
        const armorer=cityPerson('industrial-armorer',82.9,INDUSTRIAL_CENTER.z,{name:'American Industrial Center armorer',label:'Armorer',questRole:'armorer',shirt:'#7b756b',cap:true,description:'He measures twice, sharpens once, and always checks the paperwork.'});
        factory.entry={...armorer.approach};merchants.push(armorer);
        const cityAliens=[['alien-civic',hall.entry.x-1,hall.entry.y+1.8],['alien-ferry',ferry.entry.x-1.4,ferry.entry.y+2],['alien-venture',venture.entry.x+2,venture.entry.y+1.6],['alien-industrial',82.8,INDUSTRIAL_CENTER.z+1.5]];
        for(const [i,[id,x,z]] of cityAliens.entries())merchants.push(cityPerson(id,x,z,{alienId:id,label:i%2?'Woman':'Man',female:!!(i%2),longHair:!!(i%2),shirt:['#847b69','#9b797e','#637e8c','#72876b'][i]}));
        const regionalAlien=(id,x,z,female=false)=>({id,alienId:id,label:female?'Woman':'Man',female,longHair:female,x,z,base:characterGround(x,z),angle:Math.PI/2,skin:'#b69272',hair:'#403d36',shirt:female?'#8f7b93':'#71887c',height:1.85,regional:true,approach:{x:x-.5,y:z+.35}});
        merchants.push(regionalAlien('alien-square',63.5,152.55,true),regionalAlien('alien-sand-hill',47,137.5));
        for(const target of ALIEN_TARGETS)if(!merchants.some(n=>n.alienId===target.id))throw new Error('Missing quest alien '+target.id);
    }
    function setupRegionalWorld(){
        const register=(site,mesh)=>{
            const regionalDescription=site.kind==='rail-pit'?'An empty pit. The sign says California high-speed rail.':site.kind==='tax-hq'?'The Tax Authority Headquarters. Gilded officials in top hats patrol the forecourt.':site.kind==='spaceport'?'A SpaceX reusable rocket and landing pad. Speak to the attendant for a one-coin flight between San Francisco and Tahoe.':site.kind==='gondola'?'A gondola climbs the immense mountain above Lake Tahoe.':'The summit lift attendant rents skis for one coin. Then ski the winding course and jump its ramps.';
            const sight={...site,description:site.description||regionalDescription};
            const object={sight,mesh,start:site.start/11,count:site.count/11,lo:site.lo,hi:site.hi,x:site.lo[0],y:site.lo[2],w:site.hi[0]-site.lo[0],d:site.hi[2]-site.lo[2],base:site.lo[1],arch:'regional',solid:true,preserveGround:true,footprint:site.footprint,navigationPolygons:site.navigationPolygons};
            sight.object=object;objects.push(object);sights.push(sight);if(site.interior)registerInstituteInterior(sight,site.interior);
        };
        for(const site of [...drawSocialBuildings(sceneMesh,signs),drawAppleCampus(sceneMesh,signs),drawRobotaxiDealer(sceneMesh,signs),drawHaberdasherShop(sceneMesh,signs),drawSaltFlats(sceneMesh,signs,southernTerrain),...drawSouthernDistrict(sceneMesh,signs,{includeRailPit:false}),...drawTrainingSites(sceneMesh,signs,{includeGym:false}),drawGPUFactory(sceneMesh,signs,terrainHeight),...drawResearchCampuses(sceneMesh,signs,{separateInteriors:true})])register(site,sceneMesh);
        for(const site of drawZooEnclosures(sceneMesh,terrainHeight,{include:s=>s.z>=N}))register(site,sceneMesh);
        for(const p of AIRPORT_FIELD_ADS){
            const start=sceneMesh.data.length,base=southernTerrain.height(p.x,p.z);drawAirportBillboard(sceneMesh,signs,{...p,base});
            const object={mesh:sceneMesh,start:start/11,count:(sceneMesh.data.length-start)/11,x:p.x-1.15,y:p.z-.4,w:2.3,d:.8,base,arch:'airport-field-billboard',solid:true,preserveGround:true,footprint:p.polygon,lo:[p.x-1.15,base-.1,p.z-.4],hi:[p.x+1.15,base+2.8,p.z+.4]};
            objects.push(object);airportFieldAds.push({...p,base,object});
        }
        drawRunoffBanks(sceneMesh,southernTerrain);
        drawRailWorks(sceneMesh,terrainHeight);merchants.push({...RAIL_WORKER});
        merchants.push(...createResearcherNPCs(),...createSquareNPCs());
        merchants.push({...merchant('capital',SAND_HILL_CAPITAL.x+.7,137.1,SAND_HILL_CAPITAL.base+.04),id:'sand-hill-partner',angle:Math.PI/2});
        register(drawPrometheus(sceneMesh,signs),sceneMesh);streetLights.push(prometheusTorchLight());
        makeTownhomeRow(SPACEPORT_HOUSES.x,SPACEPORT_HOUSES.z,SPACEPORT_HOUSES.w,SPACEPORT_HOUSES.d,0,.25);
        southernNeighborhood=populateSouthernNeighborhood({mesh:sceneMesh,terrain:southernTerrain,makeTownhomeRow,tree,bench,roadDistance:airportRoadDistance,signs,cityRoads:worldTiles.routes.filter(r=>r.kind==='road'&&r.points.some(p=>p[1]>=78)),cityBuildings:objects.filter(o=>o.arch==='townhomes'),surfaceType:(x,z)=>z>=N?airportSurfaceTypeAt(x,z):surfaceTypeAt(x,z),registerEstate:o=>objects.push(o),entrances:[...sights,...places].filter(s=>s.entry).map(s=>({x:s.entry.x+.5,z:s.entry.y+.5}))});
        register(drawArmory(sceneMesh,signs,characterGround),sceneMesh);
        register(drawRailPit(sceneMesh,signs,southernTerrain),sceneMesh);
        for(const site of southernNeighborhood.sights)register(site,sceneMesh);
        register(drawSquareConstruction(sceneMesh,signs,southernTerrain),sceneMesh);
        const foreman=merchants.find(n=>n.id==='square-foreman');foreman.base=characterGround(foreman.x,foreman.z)+.025;
        nightclub=southernNeighborhood.sights.find(s=>s.id==='nightlife')||nightclub;
        merchants.push(...PACIFICA_PARK_RESIDENTS.map(p=>({...p,base:terrainHeight(p.x,p.z)+.025})));
        restaurantDiners.push(...southernNeighborhood.diners);
        for(const p of southernNeighborhood.lamps)streetLights.push(...drawStreetLamp(sceneMesh,p.x,characterGround(p.x,p.z)+.02,p.z,p.angle,p.style));
        tahoeMesh=new Mesh();if(!headless)drawTahoeTerrain(tahoeMesh);for(const site of drawTahoeStructures(tahoeMesh,tahoe,signs))register(site,tahoeMesh);tahoeGPU=upload(tahoeMesh);
        for(const [id,site] of [['sf-spaceport',SF_SPACEPORT],['tahoe-spaceport',tahoe.spaceport]]){
            const npc=merchant('crew',site.entry.x+1.2,site.entry.y+.5,id==='sf-spaceport'?airportWalkingHeight(site.entry.x+1.2,site.entry.y+.5):tahoeHeight(site.entry.x+1.2,site.entry.y+.5)+.04);
            merchants.push({...npc,id:id+'-attendant',siteId:id,angle:Math.PI});
        }
        merchants.push({...merchant('lift',TAHOE.peak.x+1.9,TAHOE.peak.z-2.4,tahoeHeight(TAHOE.peak.x+1.9,TAHOE.peak.z-2.4)+.04),id:'summit-lift-attendant',cap:true,coat:true,angle:Math.PI/2});
        const a=DOWNTOWN.bridge.rampStart.map(mapPosition),cityGate=nearestNavigation(a[0]-.5,a[1]-.5,1.5,(x,y)=>navFree(x+.5,y+.5));
        if(!cityGate)throw new Error('Bay Bridge must connect to the city navigation grid');
        regionalRoad=createRegionalRoad({scale:MAP_SCALE,groundHeight:terrainHeight,cityGate});highwayMesh=regionalRoad.mesh();
        ferrari=createFerrari(regionalRoad,savedFerrari,state=>{if(!headless)try{localStorage.setItem('sf-ferrari-v1',JSON.stringify(state));}catch{}},{cityDriving:{
            contains:(x,z)=>x>=0&&x<N&&z>=0&&z<180&&!regionalRoad.contains(x,z)&&landClearAt(x-.5,z-.5)&&!placeAt(x-.5,z-.5)&&!instituteRoomAt(x,z),
            ground:characterGround,
            route:(from,to)=>pathTo(to.x-.5,to.z-.5,{x:from.x-.5,y:from.z-.5})?.map(p=>({x:p.x+.5,y:characterGround(p.x+.5,p.y+.5),z:p.y+.5}))||null
        }});
        highwaySites=createHighwaySites(ferrari);for(const site of drawHighwaySites(highwayMesh,ferrari,highwaySites,signs))register(site,highwayMesh);
        esotericCampus=createEsotericCampus(ferrari);register(esotericCampus.draw(highwayMesh,signs,{separateInterior:true}),highwayMesh);merchants.push(esotericCampus.npc);
        esotericCampus.life=createCityLife({visible:actorInView,routes:esotericCampus.routes,surfaceType:esotericCampus.surfaceType,lamps:[],terrainHeight:esotericCampus.ground,groundHeight:characterGround,scale:MAP_SCALE,human,bicycle,maxWalkers:6,maxRiders:0,waterTraffic:false,prefix:'berkeley-scholar',regional:true});
        esotericCampus.life.update(0);
        countryside=createCountryside({road:regionalRoad,campus:esotericCampus,parcels:highwaySites.flatMap(s=>s.solidParcels||[])});
        sights.push({id:'ferrari-car',kind:'ferrari',label:'Ferrari',get entry(){const p=ferrari.position;return {x:p.x-.5,y:p.z-.5};},description:'A very fast red Ferrari: twenty times walking speed, with a tank that lasts 56% of the drive to Tahoe.'});
        goldenGate=createGoldenGateCrossing({scale:MAP_SCALE,cityGate:sightById('golden').entry,groundHeight:terrainHeight,marinHeight:detention.terrain});
        marinLand=createMarinLand({polygon:MARIN,scale:MAP_SCALE,detention,gate:goldenGate.gate('marin')});
        for(const value of goldenGate.mesh().data)highwayMesh.data.push(value);highwayGPU=upload(highwayMesh);
        sights.push({id:'marin-bridge-landing',kind:'bridge',label:'Marin Headlands overlook',entry:goldenGate.gate('marin'),description:'Across the Golden Gate, the Marin hills look back over the orange towers and San Francisco.'});
    }
    function useRocket(sight,npc=null){
        npc=npc||merchants.find(n=>n.kind==='crew'&&n.siteId===sight?.id);if(!npc)return false;
        if(rocket.state.active||chase?.state.jailed||rope.climbing||sutroClimb.state.active||tahoe.state.mode!=='ground'||flying())return false;
        const go=()=>{
            closeMenu();closeReader();player.path=[];player.speed=0;keys.clear();
            const toTahoe=sight.id==='sf-spaceport';
            dialogue.open({...npc,intro:'Our reusable rocket flies '+(toTahoe?'to Lake Tahoe':'back to San Francisco')+' for one coin. Enjoy the view from the capsule!',question:'Board the rocket for one coin?',choice:'Launch · 1 coin',decline:'Stay here',receipt:'Launch clearance received. Click OK to board your rocket.',accept:()=>{
                const result=economy.trade('rocket');return {...result,after:result.ok?()=>{
                    rope.reset();airship.cancel();waveSurf.stop();surf.cancelJump();surf.state.riding=false;bike.riding=false;tahoe.reset();currentInterior=null;action=null;destination=null;
                    rocket.start(toTahoe?SF_SPACEPORT:tahoe.spaceport,toTahoe?tahoe.spaceport:SF_SPACEPORT,{x:player.x+.5,y:playerGround(),z:player.y+.5});
                    setCamera(Math.PI*.75+.3,.72);setZoom(.85);updateAirshipButton();updateTahoeButton();updateRocketControls();drawMini();
                    announce('You board the reusable rocket. Next stop: '+(toTahoe?'Lake Tahoe.':'San Francisco.'),'SpaceX');
                }:null};
            }});
        };
        return approachNPC(npc,go);
    }
    function updateRocketControls(){
        for(const id of ['sf-bike-button','sf-surf-button','sf-airship-button','sf-rope-button','sf-climb-button'])$(id).disabled=rocket.state.active;
    }
    function useGondola(up=true){
        if(ferrari?.state.riding)return parkCarFirst();
        if(chase?.state.jailed||flying()||rope.climbing||tahoe.state.mode!=='ground')return false;
        const entry=up?tahoe.baseEntry:tahoe.summitEntry,start=()=>{closeMenu();closeReader();player.path=[];player.speed=0;action=null;destination=null;tahoe.gondola(up);updateTahoeButton();announce(up?'You board the gondola. The mountain rises far above the lake.':'You board the gondola down to the lakeside station.','Gondola');};
        if(Math.hypot(player.x-entry.x,player.y-entry.y)<2){start();return true;}return walkTo(entry.x,entry.y,start);
    }
    function rentSkis(){
        if(ferrari?.state.riding)return parkCarFirst();
        if(tahoe.state.rented){announce('Your skis are already rented for this visit.');return true;}
        return talkLiftAttendant(merchants.find(n=>n.kind==='lift'));
    }
    function talkLiftAttendant(npc){
        if(!npc||capture.state.active||chase?.state.jailed||flying()||rope.climbing||rocket.state.active||tahoe.state.mode!=='ground')return false;
        return approachNPC(npc,()=>dialogue.open({...npc,repeat:true,intro:'Welcome to the summit. I rent skis for one coin. Keep your skis on the snow and your existential crises inside the gondola.',question:'What can I help you with?',decline:'Leave',choices:[
            {label:'Rent skis · 1 coin',accept:()=>{if(tahoe.state.rented)return {ok:false,message:'Your skis are already rented for this visit.'};const result=economy.trade('skis');if(result.ok)tahoe.state.rented=true;updateTahoeButton();return {...result,message:result.ok?'Your skis are ready. Use Ski down to begin your descent.':result.message};}},
            {label:'Any advice?',receipt:MERCHANTS.lift.receipt}
        ]}));
    }
    function startSkiRun(){
        if(!tahoe.state.rented)return rentSkis();
        const start=()=>{player.path=[];player.speed=0;action=null;destination=null;tahoe.startSki();setCamera(-Math.PI*3/4,.65);updateTahoeButton();announce('You push off. Click to steer and press Space while airborne to flip!','Skiing');};
        if(Math.hypot(player.x-tahoe.summitEntry.x,player.y-tahoe.summitEntry.y)<1.2){start();return true;}return walkTo(tahoe.summitEntry.x,tahoe.summitEntry.y,start);
    }
    function useTahoeActivity(){
        if(tahoe.state.mode==='ski')return tahoe.flip();
        if(tahoe.state.mode==='gondola')return false;
        return Math.hypot(player.x+.5-TAHOE.peak.x,player.y+.5-TAHOE.peak.z)<10?(tahoe.state.rented?startSkiRun():rentSkis()):useGondola(true);
    }
    function updateTahoeButton(){
        const button=$('sf-ski-button'),near=nearTahoe(player.x+.5,player.y+.5),mode=tahoe.state.mode;
        button.hidden=!near;button.disabled=rocket.state.active||mode==='gondola'||mode==='ski'&&tahoe.state.airTime<=0;
        button.textContent=mode==='gondola'?'Riding gondola…':mode==='ski'?(tahoe.state.airTime>0?'Flip · Space':'Skiing…'):Math.hypot(player.x+.5-TAHOE.peak.x,player.y+.5-TAHOE.peak.z)<10?(tahoe.state.rented?'Ski down':'Rent skis · 1 coin'):'Ride gondola';
        if(near){$('sf-bike-button').hidden=true;$('sf-surf-button').hidden=true;$('sf-airship-button').hidden=!airship.state.active||mode!=='ground';$('sf-rope-button').hidden=!airship.state.active||mode!=='ground';}
    }
    function merchantApproach(npc){
        const approach=npc.approach;if(approach)return {...approach};
        return npc.kind==='capital'?{...SAND_HILL_CAPITAL.entry}:npc.kind==='crew'?{...sightById(npc.siteId).entry}:npc.kind==='founder'?{x:STARTUP_HQ.x-.5,y:130.6}:npc.kind==='tax'?{x:npc.x-.5,y:131.6}:nearestNavigation(npc.x-.5,npc.z-.5,2,(x,y)=>Math.hypot(x+.5-npc.x,y+.5-npc.z)>.7);
    }
    function approachNPC(npc,begin,{distance=1.8,approach=merchantApproach}={}){
        if(!npc)return false;
        const open=()=>{fishing.cancel();releaseNPC();npc.hold=2;npc.moving=false;npc.motion=0;player.path=[];player.speed=0;action=null;destination=null;keys.clear();if(!npc.seated&&!npc.fixedFacing&&Number.isFinite(npc.x)&&Number.isFinite(npc.z))npc.angle=Math.atan2(player.y+.5-npc.z,player.x+.5-npc.x);begin();};
        if(distance===Infinity||Math.hypot(player.x+.5-npc.x,player.y+.5-npc.z)<distance){open();return true;}
        const target=approach(npc);if(!target)return false;
        const accepted=walkTo(target.x,target.y,open);
        if(accepted&&player.path.length){approachingNPC=npc;npc.waiting=true;npc.moving=false;npc.motion=0;}
        return accepted;
    }
    function releaseNPC(){if(approachingNPC){if(!approachingNPC.thinking)approachingNPC.waiting=false;approachingNPC=null;}}
    function talkResearcher(npc){
        if(ferrari?.state.riding)return parkCarFirst();
        if(chase?.state.jailed||rope.climbing||sutroClimb.state.active||rocket.state.active)return false;
        if(flying())return airshipUnavailable();
        closeReader();closeMenu();
        return approachNPC(npc,()=>dialogue.open(npc.id==='ada-meridian'?monkeyQuestDialogue(npc,quests,economy):createResearchDialogue(npc)));
    }
    function talkRailWorker(npc){
        if(ferrari?.state.riding)return parkCarFirst();
        if(chase?.state.jailed||flying()||capture.state.active)return false;
        closeMenu();closeReader();return approachNPC(npc,()=>dialogue.open(railWorkerDialogue()));
    }
    function stealQuestMonkey(){
        if(ferrari?.state.riding)return parkCarFirst();
        if(chase?.state.jailed||flying()||capture.state.active||surf.state.riding)return false;
        const site=sightById('zoo-monkeys'),take=()=>{const result=quests.steal();if(result.ok){player.path=[];player.speed=0;action=null;destination=null;monkeyKeeper.start();}announce(result.ok?result.message+' “Stop! That monkey has a keeper!” The zookeeper gives chase.':result.message,'Monkey Business');return result.ok;};
        closeMenu();if(Math.hypot(player.x-site.entry.x,player.y-site.entry.y)<1.5)return take();
        return walkTo(site.entry.x,site.entry.y,take);
    }
    function setupMonkeyEscape(){
        const pen=sightById('zoo-monkeys'),home=airship.nearest(15.2,98.6,2,(x,y)=>Math.hypot(x-pen.entry.x,y-pen.entry.y)<3&&!placeAt(x,y));
        const keeperHome=nearestNavigation(pen.entry.x,pen.entry.y-4.5,2,(x,y)=>!placeAt(x,y));
        if(!home||!keeperHome)throw new Error('Monkey escape needs reachable motorcycle parking and a zookeeper post');
        const validSaved=(s)=>Number.isFinite(s.x)&&Number.isFinite(s.y)&&landClearAt(s.x,s.y)&&!placeAt(s.x,s.y);
        motorcycle=createMotorcycle({home,saved:validSaved(savedMotorcycle)?savedMotorcycle:{rented:savedMotorcycle.rented},onSave:s=>{if(!headless)try{localStorage.setItem('sf-motorcycle-v1',JSON.stringify(s));}catch{}}});
        const sight={id:'zoo-motorcycle',kind:'motorcycle',label:'Motorcycle',description:MOTORCYCLE_EXAMINE,get rented(){return motorcycle.state.rented;},get entry(){return {x:motorcycle.state.x,y:motorcycle.state.y};}};sights.push(sight);
        const rentalClerk=serviceStaffPosition(home,{walkable:p=>landClearAt(p.x,p.y),canTravel:(a,b)=>canTravel(a.x,a.y,b.x,b.y,true)});merchants.push({...merchant('motorcycle-clerk',rentalClerk.x+.5,rentalClerk.y+.5,characterGround(rentalClerk.x+.5,rentalClerk.y+.5)),id:'zoo-motorcycle-clerk',regional:true,cap:true});
        monkeyKeeper=createMonkeyPursuit({player,home:keeperHome,saved:quests.carrying&&validSaved(savedKeeper)?savedKeeper:{},routeTo:(x,y,from)=>pathTo(x,y,from,true),canCapture:(a,b)=>canTravel(a.x,a.y,b.x,b.y,true),
            canPursue:()=>quests.carrying&&!capture.state.active&&!chase.state.jailed&&!rocket.state.active&&!flying()&&!rope.climbing&&!sutroClimb.state.active&&!surf.state.riding&&tahoe.state.mode==='ground',
            onSave:s=>{if(!headless)try{localStorage.setItem('sf-monkey-keeper-v1',JSON.stringify(s));}catch{}},
            onCaught:()=>{const result=quests.recover();parkMotorcycle(false);player.path=[];player.speed=0;action=null;destination=null;player.gesture={name:'caught',started:performance.now(),duration:900};announce(result.message,'Zookeeper');}});
        const actor=monkeyKeeper.state.actor;
        keeperNPC={id:'monkey-zookeeper',label:'Zookeeper',keeper:true,get x(){return actor.x+.5;},get z(){return actor.y+.5;},get regional(){return actor.y>=N-2.5;}};
        sights.push({id:'monkey-keeper-post',kind:'scenery',label:'Zookeeper’s post',entry:{...keeperHome},description:'A remarkably athletic zookeeper is keeping a close eye on the monkey habitat.'});
        if(quests.carrying)monkeyKeeper.start();
    }
    function motorcycleApproach(){
        const p=motorcycle.state,candidates=[];
        for(let i=0;i<16;i++){const a=i*Math.PI/8,x=p.x+Math.cos(a)*.9,y=p.y+Math.sin(a)*.9;if(clearAt(x,y)&&canTravel(x,y,p.x,p.y))candidates.push({x,y});}
        return candidates.sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0]||{x:p.x,y:p.y};
    }
    function parkMotorcycle(speak=true){
        if(!motorcycle?.state.riding)return false;motorcycle.park(player.x,player.y,player.angle);player.speed=Math.min(player.speed,WALK_SPEED);
        if(!headless){updateAdventureUI();if(speak)announce('You park the motorcycle. Your rental remains valid.','You');}return true;
    }
    function useMotorcycle(actionName='ride'){
        if(!motorcycle||chase?.state.jailed||capture.state.active||rocket.state.active||flying()||rope.climbing||sutroClimb.state.active||surf.state.riding||tahoe.state.mode!=='ground')return false;
        if(ferrari?.state.riding)return parkCarFirst();
        if(motorcycle.state.riding)return parkMotorcycle();
        if(currentInterior)return false;closeMenu();closeReader();
        const begin=()=>{
            if(bike.riding)parkBike();skateboard.riding=false;setDancing(false);player.path=[];player.speed=0;action=null;destination=null;
            if(actionName==='steal'&&!motorcycle.state.rented){announce('You try to steal the conveniently parked motorcycle. Its alarm summons the police!','You');chase.start();$('sf-wanted').hidden=false;return true;}
            if(motorcycle.state.rented){motorcycle.mount();updateAdventureUI();announce('You start the motorcycle. Click to ride; M parks.','You');return true;}
            announce('Speak to the motorcycle rental clerk beside the zoo to rent it for 5 coins.','Motorcycle');return true;
        };
        const p=motorcycle.state;if(Math.hypot(player.x-p.x,player.y-p.y)<1.6)return begin();
        const target=motorcycleApproach();return walkTo(target.x,target.y,begin);
    }
    function setupSocialNPCs(){
        const add=(room,kind,id,u,v,au,av,extra={})=>{
            const p=socialLocalPoint(room,u,v),a=socialLocalPoint(room,au,av),npc={...merchant(kind,p.x,p.z,room.base+.015),id,siteId:room.id,socialActor:true,regional:true,angle:Math.PI,approach:{x:a.x-.5,y:a.z-.5},...extra};
            if(!landClearAt(npc.approach.x,npc.approach.y))throw new Error(id+' needs a reachable indoor approach');merchants.push(npc);return npc;
        };
        add(TWITTER_HQ,'twitter-worker','twitter-bottle-worker',.38,-.65,.25,.22,{fixedFacing:true});
        add(TWITTER_HQ,'twitter-poster','twitter-poster',1.35,.86,.55,.95,{seated:true,phone:true,angle:-Math.PI/2});
        add(SALES_CONFERENCE,'software-vendor','software-vendor',-.72,-.95,-.35,-.2);
        add(SALES_CONFERENCE,'software-buyer','software-buyer-1',.35,-.85,.2,-.05,{shirt:'#6d7e9b',skin:'#b48d70'});
        add(SALES_CONFERENCE,'software-buyer','software-buyer-2',.9,.2,.2,.2,{shirt:'#928278',skin:'#956c50',hair:'#353135'});
        add(SALES_CONFERENCE,'software-buyer','software-buyer-3',-.65,.9,.05,.9,{shirt:'#798a72',skin:'#c5a17e',hair:'#6b5646'});
        socialLife=createNPCRoaming(merchants,{eligible:n=>n.kind==='software-buyer',span:1.7,walkable:(x,y)=>insideInstitute(SALES_CONFERENCE,x+.5,y+.5)&&landClearAt(x,y),canTravel:(ax,ay,bx,by)=>canTravel(ax,ay,bx,by,true),ground:characterGround,approachFor:merchantApproach});
        if(socialLife.unavailable.length)throw new Error('Salesmen need connected indoor roaming: '+socialLife.unavailable.join(', '));
    }
    function setupServiceNPCs(){
        setupSocialNPCs();
        for(const [i,site] of southernNeighborhood.craftSites.entries()){
            if(site.kind==='neighborhood-garden'&&i%3)continue;
            const p=serviceStaffPosition(site.entry,{walkable:p=>landClearAt(p.x,p.y),canTravel:(a,b)=>canTravel(a.x,a.y,b.x,b.y,true)});
            merchants.push({id:site.id+'-neighbor',siteId:site.id,label:i%2?'Woman':'Man',neighborhood:true,neighborLine:site.neighborLine,description:site.kind==='neighborhood-garden'?'A neighbor with a trowel, bright gloves, and a carefully considered opinion about compost.':'A local shopkeeper. The window display changes with the seasons; the welcome does not.',x:p.x+.5,z:p.y+.5,base:characterGround(p.x+.5,p.y+.5),angle:site.rotation||0,skin:['#a77c5c','#bf987a','#825c48'][i%3],shirt:['#a17c91','#759996','#bd985f','#879c77'][i%4],hair:['#463b34','#86644b','#44403b'][i%3],female:!!(i%2),longHair:!!(i%2),height:1.85,regional:true});
        }
        for(const [id,kind] of [['tim-apple-campus','tim-apple'],['tesla-robotaxi','robotaxi-sales']]){
            const site=sightById(id),p=serviceStaffPosition(site.entry,{walkable:p=>landClearAt(p.x,p.y),canTravel:(a,b)=>canTravel(a.x,a.y,b.x,b.y,true)});
            merchants.push({...merchant(kind,p.x+.5,p.y+.5,characterGround(p.x+.5,p.y+.5)),id:kind,siteId:id,regional:true,phone:kind==='tim-apple',angle:-Math.PI/2});
        }
        const shop=sightById('haberdasher'),hatter=serviceStaffPosition(shop.entry,{walkable:p=>landClearAt(p.x,p.y),canTravel:(a,b)=>canTravel(a.x,a.y,b.x,b.y,true)});
        merchants.push({...merchant('haberdasher',hatter.x+.5,hatter.y+.5,characterGround(hatter.x+.5,hatter.y+.5)),id:'haberdasher-merchant',siteId:shop.id,regional:true,topHat:true,coat:true,angle:-Math.PI/2});
        const flats=sightById('salt-flats'),activist=serviceStaffPosition(flats.entry,{walkable:p=>landClearAt(p.x,p.y),canTravel:(a,b)=>canTravel(a.x,a.y,b.x,b.y,true)});
        merchants.push({...merchant('salt-activist',activist.x+.5,activist.y+.5,characterGround(activist.x+.5,activist.y+.5)),id:'salt-conservationist',siteId:flats.id,regional:true,cap:true,angle:-Math.PI/2});
        const factory=sightById('gpu-factory'),buyer=serviceStaffPosition(factory.entry,{walkable:p=>landClearAt(p.x,p.y),canTravel:(a,b)=>canTravel(a.x,a.y,b.x,b.y,true)});
        merchants.push({...merchant('gpu-buyer',buyer.x+.5,buyer.y+.5,characterGround(buyer.x+.5,buyer.y+.5)),id:'gpu-factory-buyer',siteId:factory.id,regional:true,coat:true,angle:Math.PI/2});
        const burger=sightById('in-n-out'),burgerStaff=serviceStaffPosition(burger.entry,{walkable:p=>landClearAt(p.x,p.y),canTravel:(a,b)=>canTravel(a.x,a.y,b.x,b.y,true)});
        merchants.push({id:'in-n-out-clerk',kind:'burger-clerk',name:'In-N-Out associate',label:'In-N-Out associate',x:burgerStaff.x+.5,z:burgerStaff.y+.5,base:characterGround(burgerStaff.x+.5,burgerStaff.y+.5),skin:'#ba936d',shirt:'#f0e8d3',pants:'#c64a41',cap:true,height:1.9,regional:true,approach:{...burger.entry},description:'A cheerful associate. The paper hat is included in the employee benefits.'});
        const sites=highwaySites.filter(s=>s.kind==='fuel'||s.kind==='dealership');
        for(const site of sites){
            const p=serviceStaffPosition(site.entry,{walkable:p=>landClearAt(p.x,p.y),canTravel:(a,b)=>canTravel(a.x,a.y,b.x,b.y,true)});
            merchants.push({...merchant('fuel-attendant',p.x+.5,p.y+.5,characterGround(p.x+.5,p.y+.5)),id:site.id+'-attendant',siteId:site.id,regional:true,cap:true,shirt:site.paid?'#a06865':'#709d8b'});
        }
    }
    function talkMotorcycleClerk(npc){
        if(!npc||capture.state.active||chase?.state.jailed||flying()||rocket.state.active||surf.state.riding||rope.climbing||sutroClimb.state.active)return false;
        if(ferrari?.state.riding)return parkCarFirst();
        return approachNPC(npc,()=>dialogue.open({...npc,intro:motorcycle.state.rented?'Your motorcycle rental is still valid. Press M to find or ride it.':'Five coins rents the conveniently parked motorcycle beside the monkey habitat. Please arrange your rental before commencing any suspicious primate-related errands.',question:motorcycle.state.rented?'Review your rental?':'Rent the motorcycle for 5 coins?',choice:motorcycle.state.rented?'Where is my motorcycle?':'Rent · 5 coins',decline:'Leave',accept:()=>{if(motorcycle.state.rented)return {ok:true,message:'Press M to find your parked motorcycle. Your rental stays valid.'};const result=motorcycle.rent(economy,{pursued:quests.carrying});updateAdventureUI();return {...result,message:result.ok?'The motorcycle is yours to ride. Click it or press M to get on.':result.message};}}));
    }
    function setupTabletWizard(){
        const house=places.find(p=>p.id==='home'),center=buildingPoint(house,house.x+house.w*.5,house.y+house.d*.35);
        const spot=nearestNavigation(center[0]-.5,center[1]-.5,1.8,(x,y)=>placeAt(x,y)===house),approach=spot&&nearestNavigation(spot.x,spot.y,1.5,(x,y)=>placeAt(x,y)===house&&Math.hypot(x-spot.x,y-spot.y)>.65);
        if(!spot||!approach)throw Error('The tablet wizard needs a reachable room and conversation approach');
        tabletWizard={id:'tablet-wizard',kind:'tablet-wizard',label:'Orin the Wizard',name:'Orin the Wizard',x:spot.x+.5,z:spot.y+.5,base:characterGround(spot.x+.5,spot.y+.5),interior:house,approach,angle:Math.PI/2,skin:'#bd9c7e',hair:'#cfc9b5',shirt:'#71609c',pants:'#48425f',hat:'wizard',coat:true,height:1.95,description:'A friendly wizard. He has compressed the regional transportation problem into two small purple tablets.'};merchants.push(tabletWizard);
        const downtown=places.find(p=>p.id==='links').entry,tahoePoint={x:TAHOE.base.x+2.5,z:TAHOE.base.z+3.5};
        tabletDestinations={downtown:{x:downtown.x+.5,z:downtown.y+.5,label:'in downtown San Francisco'},tahoe:{...tahoePoint,label:'beside the Tahoe gondola'}};
        for(const p of Object.values(tabletDestinations)){if(!landClearAt(p.x-.5,p.z-.5))throw Error('A teleport tablet destination is blocked');p.y=characterGround(p.x,p.z);}
        tabletService=createTeleportTablets({client:multiplayer,economy,storage:headless?null:localStorage,destinations:tabletDestinations,getPlayer:()=>({x:player.x+.5,y:playerGround(),z:player.y+.5}),canUse:canUseTablet,onPurse:updatePurse,onMessage:announce,
            onStart:()=>{if(headless)return;multiplayerWorld?.stopFollowing(true);if(training)stopTraining();expeditions.stop();fishing.cancel();setDancing(false);forwardRoll.cancel();alienCombat=null;wildTarget=null;closeMenu();closeReader();closeCharacter();questMenu?.close();dialogue.close();keys.clear();player.path=[];player.speed=0;player.motion=0;player.gesture=null;},
            onArrive:to=>{Object.assign(player,{x:to.x-.5,y:to.z-.5,path:[],speed:0,moving:false,motion:0});currentInterior=null;if(!headless){updateAdventureUI();updateCamera();drawMini();}}});
    }
    function canUseTablet(){return !capture.state.active&&!chase?.state.jailed&&secretWorld?.kind==='world'&&!secretWorld.bomber.state.active&&!flying()&&!rocket.state.active&&!surf.state.riding&&!rope.climbing&&!sutroClimb.state.active&&!bike.riding&&!motorcycle?.state.riding&&!ferrari?.state.riding&&!skateboard.riding&&tahoe.state.mode==='ground';}
    function talkTabletWizard(npc=tabletWizard){
        if(!canUseTablet())return false;closeMenu();closeReader();return approachNPC(npc,()=>dialogue.open({...npc,repeat:true,intro:'Welcome! A little stone, a little purple lightning, and you can skip an extraordinary amount of walking. Downtown and Tahoe teleportation tablets are 20 coins apiece.',question:'Where would you like to go?',decline:'Leave',choices:TABLET_PLACES.map(id=>({label:'Buy '+ITEM_STATS[id+'-tablet'].name+' · '+ITEM_STATS[id+'-tablet'].price+' coins',accept:()=>{tabletService.buy(id).then(r=>{dialogue.resolvePending(npc.id,r.message);updateAdventureUI();});return {ok:true,pending:true,message:'Orin carefully inscribes a tiny purple sigil…'};}}))}));
    }
    function useTeleportTablet(id){tabletService.use(id).then(r=>{if(r.message)announce(r.message,'Teleport');updateAdventureUI();});}
    function setupGreenBank(){
        const bank=places.find(p=>p.id==='green'),point=buildingPoint(bank,bank.x+bank.w/2,bank.y+.32);
        banker={id:'green-banker',kind:'banker',label:'Friendly banker',name:'Friendly banker',x:point[0],z:point[1],base:bank.object.base+.065,skin:'#aa7a57',hair:'#48392e',shirt:'#437855',pants:'#455747',coat:true,angle:(bank.rotation||0)+Math.PI/2,height:1.9,interior:bank};merchants.push(banker);
        bankService=createBankService({client:multiplayer,economy,storage:headless?null:localStorage,onPurse:updatePurse,onDrink:()=>{if(!headless){setDancing(false);player.path=[];player.speed=0;action=null;destination=null;player.gesture={name:'drink',started:performance.now(),duration:1600};}}});
        if(!headless)bankMenu=createBankMenu({element:$('sf-bank'),service:bankService,economy,announce,beforeOpen:()=>{closeReader();closeMenu();closeHelp();closeCharacter();questMenu?.close();dialogue.close();player.path=[];player.speed=0;keys.clear();$('sf-reader-shade').hidden=false;},afterClose:()=>{$('sf-reader-shade').hidden=true;canvas.focus({preventScroll:true});}});
    }
    function talkBanker(npc=banker){
        if(capture.state.active||chase?.state.jailed||secretWorld?.kind!=='world'||secretWorld.bomber.state.active||flying())return false;
        closeMenu();closeReader();return approachNPC(npc,()=>dialogue.open(bankerDialogue(npc,{open:()=>bankMenu.open(),coffee:()=>{bankService.act('coffee').then(r=>{dialogue.resolvePending(npc.id,r.message);updateAdventureUI();});return {ok:true,pending:true,message:'One fresh coffee, coming right up…'};}})));
    }
    function drinkBankCoffee(){bankService.act('drink').then(r=>{if(r.message)announce(r.message,'Green Bank');updateAdventureUI();});}
    function setupGuildSites(){
        const lodge=places.find(p=>p.id==='freemasons-guild'),store=places.find(p=>p.id==='sunset-whole-foods');
        const entry=nearestNavigation(lodge.entry.x+.8,lodge.entry.y,1.5,(x,y)=>!placeAt(x,y)&&cityNavigation.connected(player,{x,y}));
        if(!entry)throw Error('Ray needs a reachable guild entrance');
        merchants.push({id:'guild-ray',kind:'guild-master',name:'Ray',label:'Ray',x:entry.x+.5,z:entry.y+.5,base:characterGround(entry.x+.5,entry.y+.5),skin:'#bd926d',hair:'#171717',shirt:'#b7393f',pants:'#8e2932',coat:true,height:1.95,angle:lodge.rotation||0});
        peptideSpawns=peptideSpawnPoints(store,(x,y)=>landClearAt(x,y)&&!placeAt(x,y)&&cityNavigation.connected(player,{x,y}));
        const farmers=[['Ada',.4,.38,'The tomatoes are heirloom. The simulation is legacy.'],['Lin',.6,.59,'There is no spoon. There is, however, an excellent seasonal chard.'],['Null',.4,.77,'I took the red pill and became a small-batch peptide farmer.'],['Root',null,null,'We grow everything locally. Even the glitches.']],occupiedFarmers=[];
        for(const [i,[name,u,v,line]] of farmers.entries()){
            const inside=u!==null,p=inside?buildingPoint(store,store.x+store.w*u,store.y+store.d*v):[store.entry.x+.5,store.entry.y+.5];
            const spot=nearestNavigation(p[0]-.5,p[1]-.5,1.4,(x,y)=>(inside?placeAt(x,y)===store:!placeAt(x,y))&&cityNavigation.connected(player,{x,y})&&occupiedFarmers.every(a=>Math.hypot(x-a.x,y-a.y)>.75));
            if(!spot)throw Error('The farmers market needs a reachable vendor position for '+name);occupiedFarmers.push(spot);
            const approach=nearestNavigation(spot.x,spot.y,1.5,(x,y)=>(!inside||placeAt(x,y)===store)&&Math.hypot(x-spot.x,y-spot.y)>.7&&canTravel(spot.x,spot.y,x,y,true));if(!approach)throw Error('A market farmer needs a reachable conversation approach');
            merchants.push({id:'market-farmer-'+i,kind:'market-farmer',name:'Farmer '+name,label:'Farmer '+name,x:spot.x+.5,z:spot.y+.5,base:characterGround(spot.x+.5,spot.y+.5),angle:(store.rotation||0)+Math.PI/2,skin:['#b9815d','#d0ac87','#8f634c','#bc9675'][i],hair:['#161b19','#242b25','#161616','#413a30'][i],shirt:['#202923','#151c1b','#2a302c','#19201e'][i],pants:'#161d1a',coat:true,sunglasses:true,female:i===0||i===1,longHair:i===0||i===1,height:1.95,interior:inside?store:null,approach,marketLine:line});
        }
        let savedSecret={};if(!headless)try{savedSecret=JSON.parse(localStorage.getItem('sf-illuminati-v1')||'{}')||{};}catch{}
        secretWorld=createSecretAdventures({client:multiplayer,saved:savedSecret,economy,guildMember:()=>guildStatus().member,guildSite:lodge,getPlayer:()=>({x:player.x+.5,y:playerGround(),z:player.y+.5,angle:player.angle,hp:health.state.hp}),ground:characterGround,cruiseHeight:()=>airship.cruiseHeight-3,boostSpeed:()=>rocketCruiseSpeed(SF_SPACEPORT,tahoe.spaceport),landingFree:(x,z)=>landClearAt(x-.5,z-.5),landingFallback:{x:player.x+.5,z:player.y+.5},onPurse:updatePurse,
            save:state=>{if(!headless&&!multiplayer)try{localStorage.setItem('sf-illuminati-v1',JSON.stringify(state));}catch{}},transition:changeMapInstance,onMessage:announce,onProgress:()=>questMenu?.render(),
            onCowHit:e=>{const cow=expeditions.cows.find(c=>c.id===e.target);if(cow){cow.hp=e.hp;cow.respawn=10;combatFeedback.hit(cow,e.damage,e.hp,e.max);}},onOfflineBomb:area=>expeditions.bombCows(area)});
        questMenu?.render();
        const originalBoard=expeditions.board;expeditions.board=()=>secretWorld.boardKraken({...expeditions,board:originalBoard});
        const {oldMan:elder,portal}=secretWorld.sites;
        oldMan={id:'illuminati-old-man',kind:'illuminati-elder',name:'Old Man',label:'Old Man',x:elder.x,z:elder.z,base:lodge.object.base+.065,skin:'#c8ae8b',shirt:'#4e6258',pants:'#3e4941',hair:'#d8d3b9',coat:true,height:1.9,angle:Math.PI/2,interior:lodge};merchants.push(oldMan);
        const access=nearestNavigation(portal.x-.5,portal.z-.5,1,(x,y)=>placeAt(x,y)===lodge);if(!access)throw Error('The Illuminati passage needs a clear guild approach');
        secretStairs={id:'illuminati-stairway',kind:'secret-stairs',label:'Illuminati passage',x:portal.x,z:portal.z,entry:access,description:'A discreet stairway carved beneath the lodge. The Old Man admits Illuminati initiates after a donation of 250,000 coins.'};
        caveMesh=createIlluminatiCaveMesh();if(!headless){caveGPU=upload(caveMesh);caveGPU.walls=caveMesh.walls.map(w=>({...w,gpu:upload(w.mesh)}));}
    }
    function changeMapInstance(message){
        if(headless)return;
        multiplayerWorld?.stopFollowing(true);expeditions.stop();alienCombat=null;fishing.cancel();forwardRoll.cancel();setDancing(false);keys.clear();
        if(message.instance.kind!=='kraken')expeditions.abandonShip();
        closeReader();closeMenu();currentInterior=null;currentInstitute=null;readerPlace=null;destination=null;action=null;
        Object.assign(player,{x:message.position.x-.5,y:message.position.z-.5,path:[],speed:0,moving:false,motion:0});
        if(chase){Object.assign(chase.state,{wanted:false,officers:[]});$('sf-wanted').hidden=true;}
        for(const view of placeMarkerViews)view.button.hidden=message.instance.kind!=='world';
        $('sf-hover').hidden=true;pickedCache=null;updateAdventureUI();updateCamera();drawMini();
    }
    function secretAction(result){
        if(result?.then){result.then(()=>{updateAdventureUI();canvas.focus({preventScroll:true});});return true;}
        if(result?.message)announce(result.message,'Illuminati');updateAdventureUI();return result?.ok!==false;
    }
    function talkOldMan(npc=oldMan){
        if(capture.state.active||chase?.state.jailed||secretWorld?.kind!=='world'||!guildStatus().member)return false;
        closeMenu();return approachNPC(npc,()=>dialogue.open({...npc,intro:secretWorld.initiated?'Welcome, initiate. Your aircraft is waiting below.':'The guild was only the waiting room. Donate 250,000 coins and the Illuminati will admit you to the underground hangar.',question:()=>secretWorld.initiated?'The stairway is open. Your personal B-2 awaits.':'Donate 250,000 coins to join the Illuminati?',choice:'Donate 250,000 coins',decline:'Leave',accept:()=>{const result=secretWorld.join();if(result?.then){result.then(r=>{dialogue.resolvePending(npc.id,r.message);updateAdventureUI();});return {ok:true,pending:true,message:'The Old Man counts your coins…'};}return result;}}));
    }
    function useSecretSite(sight){
        if(capture.state.active||chase?.state.jailed)return false;
        const action=sight.kind==='secret-stairs'?()=>secretWorld.enterCave():sight.kind==='cave-exit'?()=>secretWorld.leave():()=>secretWorld.boardBomber();
        if(sight.kind==='secret-stairs'&&!secretWorld.initiated){announce('Speak to the Old Man inside the guild to join the Illuminati.');return false;}
        return walkTo(sight.entry.x,sight.entry.y,()=>secretAction(action()));
    }
    function tickLocalPeptides(){
        if(multiplayer||!peptideSpawns.length||Date.now()<nextLocalPeptideAt)return;
        const point=peptideSpawns[Math.floor(Math.random()*peptideSpawns.length)];
        expeditions.state.loot.push({id:'local-peptides-'+Date.now(),kind:'loot',lootKind:'peptides',label:'Peptides',amount:1,x:point.x,z:point.z,expires:expeditions.state.clock+1200,description:'One tiny vial. Ray at the Freemasons’ Guild calls it a generous contribution to the molecular arts.'});
        nextLocalPeptideAt=Date.now()+PEPTIDE_SPAWN_MS;saveLocalGuild();
    }
    function talkGuildRay(npc){
        if(chase?.state.jailed||capture.state.active||flying()||surf.state.riding||rocket.state.active||rope.climbing||sutroClimb.state.active)return false;
        closeMenu();closeReader();
        return approachNPC(npc,()=>dialogue.open(guildDialogue(npc,{status:guildStatus,act:kind=>{
            if(multiplayerWorld){const result=multiplayerWorld.command(kind==='donate'?'guildDonate':'guildCheckIn');result.then(r=>{dialogue.resolvePending('guild-ray',r.message);updateAdventureUI();});return {ok:true,pending:true,message:'Ray consults the admissions ledger…'};}
            const r=kind==='donate'?localGuild.donate(()=>{if(!localPeptides)return false;localPeptides--;return true;}):localGuild.checkIn();saveLocalGuild();updateAdventureUI();return r;
        }})));
    }
    function talkMarketFarmer(npc){
        if(!canUseTablet())return false;
        closeMenu();closeReader();return approachNPC(npc,()=>dialogue.open(marketFarmerDialogue(npc,{nextSpawnAt:()=>multiplayer?multiplayer.state.world?.peptideSpawnAt:nextLocalPeptideAt,now:()=>Date.now()+(multiplayer?.state.serverOffset||0)})));
    }
    function talkMerchant(npc){
        if(npc.kind==='market-farmer')return talkMarketFarmer(npc);
        if(npc.kind==='tablet-wizard')return talkTabletWizard(npc);
        if(npc.kind==='guild-master')return talkGuildRay(npc);
        if(npc.socialActor){
            if(ferrari?.state.riding)return parkCarFirst();
            if(chase?.state.jailed||capture.state.active||flying()||surf.state.riding||rocket.state.active||rope.climbing||sutroClimb.state.active)return false;
            closeMenu();closeReader();
            return approachNPC(npc,()=>{
                if(npc.kind.startsWith('twitter-')){npc.speech=npc.kind==='twitter-poster'?'Very busy, someone is wrong on the internet.':'One envelope in, one bottle out. Please do not tap the backend.';npc.speechUntil=performance.now()+4000;announce(npc.speech,npc.name);}
                else dialogue.open(softwareSalesDialogue(npc,economy,social,inebriation));
            },{distance:1.25});
        }
        if(['tim-apple','robotaxi-sales'].includes(npc.kind)){
            if(ferrari?.state.riding)return parkCarFirst();
            if(chase?.state.jailed||capture.state.active||flying()||surf.state.riding||rocket.state.active||rope.climbing||sutroClimb.state.active)return false;
            closeMenu();closeReader();return approachNPC(npc,()=>dialogue.open(techMerchantDialogue(npc,tech,economy)));
        }
        if(npc.kind==='haberdasher'){
            if(ferrari?.state.riding)return parkCarFirst();
            if(chase?.state.jailed||capture.state.active||flying()||surf.state.riding||rocket.state.active||rope.climbing||sutroClimb.state.active)return false;
            closeMenu();closeReader();return approachNPC(npc,()=>dialogue.open(haberdasherDialogue(npc,economy,wearHat)));
        }
        if(npc.kind==='salt-activist'){
            if(ferrari?.state.riding)return parkCarFirst();
            if(chase?.state.jailed||capture.state.active||flying()||surf.state.riding||rocket.state.active||rope.climbing||sutroClimb.state.active)return false;
            closeMenu();closeReader();return approachNPC(npc,()=>dialogue.open(saltActivistDialogue(npc,saltMail,economy)));
        }
        if(npc.expeditionRole)return talkExpeditionNPC(npc);
        if(npc.kind==='fuel-attendant')return useFuel(sightById(npc.siteId),npc);
        if(npc.kind==='motorcycle-clerk')return talkMotorcycleClerk(npc);
        if(npc.kind==='lift')return talkLiftAttendant(npc);
        if(npc.kind==='recruiter')return talkLabRecruiter();
        if(npc.kind==='deli')return talkDeli();
        if(npc.kind==='burger-clerk')return talkBurger(npc);
        if(npc.kind==='bartender')return talkBeer();
        if(npc.questRole)return talkQuestNPC(npc);
        if(npc.researcher)return talkResearcher(npc);
        if(npc.kind==='rail-worker')return talkRailWorker(npc);
        if(npc.kind==='capital')return talkCapital();
        if(npc.kind==='crew')return useRocket(sightById(npc.siteId),npc);
        if(chase?.state.jailed||rope.climbing)return false;
        if(flying()&&npc.kind!=='passenger')return airshipUnavailable();
        closeReader();closeMenu();
        return approachNPC(npc,()=>dialogue.open(npc.kind==='tax'?taxDialogue(economy):{...MERCHANTS[npc.kind],...npc}),{distance:npc.kind==='passenger'?Infinity:1.8});
    }

    function talkQuestNPC(npc){
        if(ferrari?.state.riding)return parkCarFirst();
        if(chase?.state.jailed||capture.state.active||rope.climbing||sutroClimb.state.active||rocket.state.active||surf.state.riding||tahoe.state.mode!=='ground')return false;
        if(flying())return airshipUnavailable();
        closeMenu();closeReader();
        const begin=()=>{parkMotorcycle(false);skateboard.riding=false;alienCombat=null;player.gesture=null;player.path=[];player.speed=0;keys.clear();if(!npc.seated)npc.angle=Math.atan2(player.y+.5-npc.z,player.x+.5-npc.x);const person=npc.questRole.startsWith('square-')?squareNPCDialogue(npc,economy):theyLiveDialogue(npc,quests.theyLive,{buyBattleaxe});dialogue.open(npc.questRole==='clerk'?saltClerkDialogue(person,saltMail):person);};
        return approachNPC(npc,begin);
    }
    const npcRevealed=npc=>!!(npc.alienId&&playerLook.sunglasses);
    const npcLabel=npc=>npc.networkPlayer?npc.label+' - Level '+actorLevel(npc):(npcRevealed(npc)?'Green spectre':npc.label)+' (Level '+(npc.alienId&&!npcRevealed(npc)?1:actorLevel(npc))+')';
    const npcPrimary=npc=>npc.wilderness?(npc.combatKind==='bear'?'pet':'attack'):npc.police?'examine':npc.networkPlayer?'walk':['raptor','cow','kraken'].includes(npc.combatKind)||npcRevealed(npc)?'attack':'talk';
    function attackAlien(npc){
        const result=quests.theyLive.attack(npc.alienId,{revealed:npcRevealed(npc)});
        if(!result.ok){
            announce(result.message,'You');
            if(result.illegal){const now=performance.now();player.gesture={name:'attack',started:now,duration:600};npc.gesture={name:'flinch',started:now,duration:600};}
            if(result.illegal){npc.speech='Help! Police!';npc.speechUntil=performance.now()+4500;chase.start();$('sf-wanted').hidden=false;}
            if(clickAttempt)clickAttempt.worked=false;return false;
        }
        if(alienCombat)return false;
        if(bike.riding)parkBike();parkMotorcycle(false);skateboard.riding=false;player.path=[];player.speed=0;setDancing(false);
        player.angle=Math.atan2(npc.z-player.y-.5,npc.x-player.x-.5);npc.angle=player.angle+Math.PI;
        alienCombat={npc,battle:createAlienBattle({health,level:()=>strength.status.level,bayonet:quests.theyLive.state.bayonet,hp:npc.alienHP})};npc.hold=2;announce('Combat started · '+(quests.theyLive.state.bayonet?'Bayonet ready.':'Unarmed: you need a bayonet to cut this spectre apart.')+' Click away to retreat; eat a sandwich to heal.','They Live');return true;
    }
    function updateAlienCombat(dt,t){
        if(!alienCombat)return;
        const combat=alienCombat,npc=combat.npc;
        if(!playerLook.sunglasses||Math.hypot(player.x+.5-npc.x,player.y+.5-npc.z)>2.3){alienCombat=null;player.gesture=null;announce('You break off the fight. Keep the sunglasses on to identify your target.','They Live');return;}
        npc.hold=2;
        const events=combat.battle.update(dt);
        for(const event of events){
            if(event.type==='player-hit'){
                player.gesture={name:'attack',started:t,duration:540};npc.gesture={name:'flinch',started:t,duration:430};npc.alienHP=event.hp;npc.hp=event.hp;combatFeedback.hit(npc,event.damage,event.hp,combat.battle.state.max);combatFeedback.show(player,health.state.hp,health.state.max);
            }else if(event.type==='alien-hit'){
                combatFeedback.hit(player,event.damage,event.hp,health.state.max);
                npc.gesture={name:'attack',started:t,duration:540};player.gesture={name:'flinch',started:t,duration:430};
                announce('The spectre hits you for '+event.damage+'. '+health.state.hp+'/'+health.state.max+' hitpoints.','Combat');
            }else if(event.type==='victory'){
                const r=quests.theyLive.defeat(npc.alienId,{revealed:true});if(r.ok){npc.defeatAt=t;announce(r.message,'They Live');}alienCombat=null;
            }else if(event.type==='death'){alienCombat=null;updateAdventureUI();beginCapture('alien',respawnAtHospital);return;}
        }
        if(events.length)updateAdventureUI();
    }
    function deployRope(){
        if(multiplayerWorld){multiplayerWorld.command('airshipRope');return true;}
        if(!airship.state.active||airship.state.phase!=='flying'){announce('Reach cruising height before dropping a rope.');return false;}
        const p=airship.state.position,a=airship.state.heading,x=p.x+Math.cos(a)*.35,z=p.z+Math.sin(a)*.35;
        if(!clearAt(x-.5,z-.5)||placeAt(x-.5,z-.5)||instituteRoomAt(x,z)){announce('Hover over a clear street, park, or airport apron before dropping the rope.');return false;}
        airship.stop();const ground=characterGround(x,z);
        const ok=rope.deploy({x,y:p.y+AIRSHIP_BASKET.floor,z},{x,y:ground,z});updateAirshipButton();if(ok)announce('You lower a rope to the ground. Use Rope options to climb down or offer a traveler a ride.','You');return ok;
    }
    function climbRope(down){
        if(multiplayerWorld){multiplayerWorld.command(down?'airshipClimbDown':'airshipClimbUp');return true;}
        const begin=()=>{if(rope.climb(down)){basket.state.target=null;player.path=[];player.speed=0;destination=null;updateAirshipButton();}};
        if(down&&Math.hypot(basket.state.x-.35,basket.state.z)>.1){basket.walkTo(.35,0);basketArrival=begin;return true;}
        if(!down&&Math.hypot(player.x+.5-rope.state.bottom.x,player.y+.5-rope.state.bottom.z)>.9)return walkTo(rope.state.bottom.x-.5,rope.state.bottom.z-.5,begin);
        begin();return true;
    }
    function showRopeMenu(){
        closeMenu();if(!airship.state.active)return false;
        if(!rope.state.deployed)return deployRope();
        const menu=$('sf-context');menu.replaceChildren();const heading=document.createElement('div');heading.className='sf-context-title';heading.textContent='Airship rope';menu.append(heading);
        const options=rope.onGround?[['Climb up',()=>climbRope(false)]]:[['Climb down',()=>climbRope(true)],['Offer a ride · 5 coins',()=>{const invited=rope.invite();announce(invited?'A traveler accepts your offer and starts climbing. They will pay you 5 coins once aboard.':'Your passenger has already boarded or is still climbing.','Airship');}],['Retract rope',()=>{if(multiplayerWorld){multiplayerWorld.command('airshipRope',{retract:true});return;}if(!rope.retract())announce('Wait for your passenger to finish climbing.');updateAirshipButton();}]];
        for(const [text,fn] of options){const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',()=>{closeMenu();fn();canvas.focus({preventScroll:true});});menu.append(b);}
        menu.hidden=false;menu.style.left=Math.max(12,width/2-menu.offsetWidth/2)+'px';menu.style.top=Math.max(12,height/2-menu.offsetHeight/2)+'px';menu.querySelector('button').focus();return true;
    }
    function updateClimbButton(){
        const active=sutroClimb.state.active,button=$('sf-climb-button'),descending=sutroClimb.state.phase==='descending';
        button.hidden=!active;updateAirshipButton();
        button.disabled=!!chase?.state.jailed||descending;
        button.replaceChildren(document.createTextNode(descending?'Climbing down…':'Climb down'));
        if(!descending){const key=document.createElement('span');key.className='sf-key';key.textContent='E';button.append(key);}
    }
    function climbUnavailable(text='Climb down from Sutro Tower before walking elsewhere. Use Climb down or press E.'){
        if(clickAttempt)clickAttempt.worked=false;announce(text);return false;
    }
    function descendSutro(){
        setDancing(false);
        if(chase?.state.jailed||!sutroClimb.descend())return false;
        closeMenu();closeReader();keys.clear();updateClimbButton();
        announce('You start climbing down Sutro Tower.','You');canvas.focus({preventScroll:true});return true;
    }
    function sutroApproach(from=player){
        const tower=sightById('sutro').object,cx=tower.x+tower.w/2,cz=tower.y+tower.d/2,region=navigationRegionAt(from.x,from.y);
        return nearestNavigation(cx-.5,cz-tower.d/2-.9-.5,2,(x,y)=>y+.5<cz-tower.d/2-.25&&navigationRegionAt(x,y)===region&&!placeAt(x,y));
    }
    function climbSutro(){
        if(airship.state.active)return airshipUnavailable();
        if(chase?.state.jailed)return false;
        if(sutroClimb.state.active)return descendSutro();
        if(surf.state.riding)return climbUnavailable('Return to shore before climbing Sutro Tower.');
        closeMenu();closeReader();
        const tower=sightById('sutro').object,cx=tower.x+tower.w/2,cz=tower.y+tower.d/2,approach=sutroApproach();
        if(!approach)return climbUnavailable('There is no clear route to the Sutro Tower ladder.');
        const accepted=walkTo(approach.x,approach.y,()=>{
            if(chase?.state.jailed)return;
            if(bike.riding)parkBike();
            sutroClimb.begin({x:cx,z:cz,base:tower.base},{x:player.x+.5,y:terrainHeight(player.x+.5,player.y+.5),z:player.y+.5});
            player.path=[];player.speed=0;player.gesture=null;action=null;destination=null;currentInterior=null;keys.clear();
            updateClimbButton();announce('You take the service ladder up Sutro Tower. Press E or Climb down to turn back.','You');
        });
        if(accepted&&!sutroClimb.state.active)announce('Walking to the Sutro Tower service ladder…');
        canvas.focus({preventScroll:true});return accepted;
    }
    function goToSight(s){
        if(['secret-stairs','cave-exit','stealth-bomber'].includes(s.kind))return useSecretSite(s);
        if(s.kind==='loot')return collectExpeditionLoot(s);
        if(rocket.state.active)return false;
        if(chase?.state.jailed)return;
        if(s.enterableInstitute){closeMenu();return walkTo(s.inside.x,s.inside.y);}
        if(buildingNPCService(s))return examine(s);
        if(s.kind==='sand')return collectOceanSand();
        if(s.kind==='sunglasses')return pickUpSunglasses();
        if(s.kind==='fishing')return fishAtWharf();
        if(s.kind==='motorcycle')return motorcycle.state.rented?useMotorcycle():examine(s);
        if(s.id==='zoo-monkeys')return stealQuestMonkey();
        if(s.id==='sutro')return climbSutro();
        if(s.kind==='bunny')return petBunny();
        if(s.kind==='ferrari')return useFerrari();
        if(s.kind==='gym')return useGym();
        if(s.kind==='surfing')return usePacificaSurf();
        if(s.kind==='nightlife')return walkTo(NIGHTLIFE.inside.x,NIGHTLIFE.inside.y);
        if(s.kind==='zoo')return releaseTiger();
        if(s.kind==='gondola')return useGondola(s.id==='gondola-base');
        if(s.kind==='rail-pit')return examine(s);
        closeMenu();
        if(s.kind==='whale')return jumpWhale(s);
        if(s.kind==='airship'){useAirship();return;}
        if(s.kind==='windsurf'){useSurf();return;}
        if(s.kind==='bike'){useBike();return;}
        if(s.kind==='guest'){walkTo(s.entry.x,s.entry.y,talkToNia);return;}
        return examine(s);
    }
    function setupDeli(){
        const origin=sightById('lucindas-deli').entry;
        deli=createDeli({economy,health,origin,routeTo:(target,from)=>pathTo(target.x,target.y,from,true),canTravel:(a,b)=>canTravel(a.x,a.y,b.x,b.y,true),saved:savedDeli,onSave:state=>{if(!headless)try{localStorage.setItem('sf-deli-v1',JSON.stringify(state));}catch{}},onMessage:message=>{if(!headless)announce(message,'Lucinda’s');}});
    }
    function orderDoorDash(){
        if(!deli||capture.state.active||chase?.state.jailed)return false;
        if(flying()||surf.state.riding||rocket.state.active||sutroClimb.state.active||rope.climbing||currentInterior){announce('Meet your DoorDash cooler on walkable ground.','Lucinda’s');return false;}
        const result=deli.order(player);announce(result.message,'Lucinda’s');updateAdventureUI();return result.ok;
    }
    function eatSandwich(){
        if(capture.state.active)return false;const result=deli.eat();announce(result.message,'You');updateAdventureUI();return result.ok;
    }
    function talkBurger(npc){
        if(capture.state.active||chase?.state.jailed||flying()||rocket.state.active||secretWorld?.bomber.state.active)return false;
        if(ferrari?.state.riding)return parkCarFirst();closeMenu();closeReader();
        return approachNPC(npc,()=>dialogue.open({...npc,repeat:true,intro:'Welcome to In-N-Out! A sandwich is just '+ITEM_STATS.sandwich.inNOutPrice+' coins, versus '+ITEM_STATS.sandwich.pickupPrice+' at Lucinda’s. Same excellent emergency lunch.',question:'What can I get you?',decline:'Leave',choices:[{label:'Buy sandwich · '+ITEM_STATS.sandwich.inNOutPrice+' coins',accept:()=>deli.pickup('in-n-out')}]}));
    }
    function talkDeli(){
        if(chase?.state.jailed||flying()||capture.state.active)return false;
        const npc=merchants.find(n=>n.kind==='deli');
        return approachNPC(npc,()=>dialogue.open({...npc,repeat:true,intro:'Welcome to Lucinda’s Deli, by Alamo Square. A sandwich costs 3 coins here, or 4 delivered by our tiny DoorDash cooler. Each restores up to 18 hitpoints.',question:'What can I get you?',decline:'Leave',choices:[{label:'Pick up sandwich · 3 coins',accept:()=>deli.pickup()},{label:'Order DoorDash · 4 coins',accept:()=>deli.order(player)}]}));
    }
    function planBeachBillboard(){
        const pickup=[mapPosition(SUNGLASSES_BEACH_TARGET.x),mapPosition(SUNGLASSES_BEACH_TARGET.y)],near=[pickup[0],pickup[1]-3];let best=null,score=Infinity;
        for(const road of worldTiles.routes)if(road.name==='Great Highway'){
            const [a,b]=road.points,dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),ux=dx/length,uz=dz/length;
            for(let t=1.2;t<length-1.2;t+=.25)for(const side of [-1,1]){
                const x=a[0]+ux*t-uz*side*(road.halfWidth+.9),z=a[1]+uz*t+ux*side*(road.halfWidth+.9),distance=(x-near[0])**2+(z-near[1])**2;
                if(x>=a[0]+ux*t||distance>=score||Math.hypot(x-pickup[0],z-pickup[1])<2.5)continue;
                const angle=Math.atan2(uz,ux),polygon=rectangle(x,z,2.3,.6,angle);
                if(parcelFits(polygon,{park:true})){score=distance;best={x,z,angle,polygon};}
            }
        }
        if(!best||score>25)throw new Error('The beach sunglasses need a nearby dry billboard plot');
        const base=terrainHeight(best.x,best.z),sight={id:'beach-billboard',label:'Pacific Holidays billboard',kind:'billboard',entry:{x:best.x+.45,y:best.z-.5},get description(){return playerLook.sunglasses?'The billboard reads OBEY. The holiday offer was apparently a suggestion of a different kind.':'A sunny Pacific Holidays advertisement invites you to take a break by the coast.';}};
        sights.push(sight);const parcel=claimParcel({polygon:best.polygon,kind:'coastal billboard'});
        const object=addScenery(sight.id,best.x-1.2,best.z-1.2,2.4,2.4,2.75,m=>drawAirportBillboard(m,signs,{...best,base,art:'beach-getaway'}));
        Object.assign(object,{solid:true,footprint:best.polygon,preserveGround:true});parcel.object=object;
        beachBillboard={...best,base,art:'beach-getaway',sight,object};
    }
    function planAirportAds(){
        for(const best of planAirportBillboards({routes:worldTiles.routes,fits:polygon=>parcelFits(polygon,{park:true}),curbWidth:TILE_CONFIG.curbWidth})){
            const parcel=claimParcel({polygon:best.clearing,kind:'airport billboard'});
            levelTerrainPad(best.x,best.z,2.3,.8,0);
            const base=terrainHeight(best.x,best.z);
            const object=addScenery(null,best.x-1.2,best.z-1.2,2.4,2.4,2.75,m=>drawAirportBillboard(m,signs,{...best,base}));Object.assign(object,{solid:true,footprint:best.polygon,preserveGround:true});parcel.object=object;airportAds.push({...best,base,object});
        }
    }
    function labOffer(){
        const lab=places.find(p=>p.id==='ai-lab'),npc=merchants.find(n=>n.kind==='recruiter');
        player.path=[];player.speed=0;action=null;destination=null;keys.clear();closeReader();closeMenu();
        dialogue.open({...npc,decline:'Leave',intro:aiLabJob.state.hired?'You are on the team. The GPU racks are humming, and payroll runs every two seconds while you are inside the lab.':'Welcome to the AI Lab. Our interview is a normal two-minute Zetamac-style arithmetic challenge. Score 40 or more and the job is yours. We pay one coin every two seconds while you are inside.',question:aiLabJob.state.hired?'Ready to work?':'Take the arithmetic interview?',choice:aiLabJob.state.hired?'Go to work':'Take interview · 40+ to pass',accept:()=>({ok:true,message:aiLabJob.state.hired?'Come inside the lab to start earning. Walk out whenever you like.':'The interview screen is ready. Press Start when you are ready for two minutes of arithmetic.',after:()=>aiLabJob.state.hired?goToPlace(lab):aiInterview.open()})});
    }
    function talkLabRecruiter(){
        if(chase?.state.jailed||capture.state.active||rocket.state.active||flying()||rope.climbing||sutroClimb.state.active)return false;
        return approachNPC(merchants.find(n=>n.kind==='recruiter'),labOffer);
    }
    function talkBeer(){
        if(chase?.state.jailed||flying()||capture.state.active)return false;
        const npc=merchants.find(n=>n.kind==='bartender');
        return approachNPC(npc,()=>dialogue.open({...npc,repeat:true,decline:'Leave',intro:'Welcome to Shanghai Kelly’s. One coin a beer. The floor is quite level; any disagreement is between you and the floor.',question:'Buy a beer for one coin?',choice:'Buy beer · 1 coin',accept:()=>inebriation.drink(economy)}));
    }
    function talkToNia(){announce('“Best way to see the city? Borrow the bicycle, take Market west, and go say hello to the ducks.”','Nia');}
    function setupSunglasses(){
        sunglassesSite=beachSunglassesSite(cityNavigation,{scale:MAP_SCALE,from:player});sights.push(sunglassesSite);
    }
    function setupOceanSand(){sandSite=oceanBeachSandSite(cityNavigation,{scale:MAP_SCALE,from:player});sights.push(sandSite);}
    function collectOceanSand(){
        if(ferrari?.state.riding)return parkCarFirst();
        if(capture.state.active||chase?.state.jailed||flying()||rocket.state.active||surf.state.riding||rope.climbing||sutroClimb.state.active||expeditions.ship.aboard||tahoe.state.mode!=='ground')return false;
        const gather=()=>{
            fishing.cancel();expeditions.stop();alienCombat=null;if(bike.riding)parkBike();parkMotorcycle(false);skateboard.riding=false;setDancing(false);closeMenu();closeReader();player.path=[];player.speed=0;action=null;destination=null;
            const result=economy.trade('collect-sand');if(result.ok){player.angle=Math.atan2(sandSite.z-player.y-.5,sandSite.x-player.x-.5);player.gesture={name:'pet',started:performance.now(),duration:750};announce('You fill a sack with Ocean Beach sand. The GPU Factory buyer in the South Bay pays 20 coins per sack.','You');}else announce(result.message,'Sand');return result.ok;
        };
        closeMenu();return Math.hypot(player.x-sandSite.entry.x,player.y-sandSite.entry.y)<.8?gather():walkTo(sandSite.entry.x,sandSite.entry.y,gather);
    }
    function setupParrots(){
        const region=navigationRegionAt(player.x,player.y);
        for(const [index,[x,z]] of [[67.2,16],[69.2,14.4],[72,16]].entries()){
            const p=nearestNavigation(x-.5,z-.5,2.5,(a,b)=>navigationRegionAt(a,b)===region&&landClearAt(a,b)&&!placeAt(a,b));if(!p)throw new Error('Parrot grove needs a reachable perch');
            parrots.push({id:'coit-parrot-'+index,label:'Wild parrot',parrot:true,index,x:p.x+.5,z:p.y+.5,base:characterGround(p.x+.5,p.y+.5),height:1.25,angle:index,description:'A cherry-headed Telegraph Hill parrot. Small bird, enormous neighborhood opinions.',approach:{x:p.x+.6,y:p.y}});
        }
    }
    function talkParrot(npc){return approachNPC(npc,()=>dialogue.open(parrotDialogue(npc)));}
    function setupFishing(){
        const region=navigationRegionAt(player.x,player.y),target={x:60.75,y:15.75};let best=null,score=Infinity;
        for(let z=12.5;z<=21;z+=.25)for(let x=56;x<=68;x+=.25){
            const entry={x:x-.5,y:z-.5},cost=(x-target.x)**2+(z-target.y)**2;
            if(cost>=score||navigationRegionAt(entry.x,entry.y)!==region||!landClearAt(entry.x,entry.y)||placeAt(entry.x,entry.y))continue;
            for(const angle of [-Math.PI/2,-Math.PI/4,-Math.PI*3/4,0,Math.PI]){
                const water={x:x+Math.cos(angle)*2,z:z+Math.sin(angle)*2};
                if(!surf.water(water.x,water.z)||objects.some(o=>water.x>o.lo[0]-.15&&water.x<o.hi[0]+.15&&water.z>o.lo[2]-.15&&water.z<o.hi[2]+.15))continue;
                best={entry,water,base:characterGround(x,z)};score=cost;break;
            }
        }
        if(!best)throw new Error('Fisherman’s Wharf needs a connected fishing spot facing open water');
        fishingSite={id:'wharf-fishing',kind:'fishing',label:'Fisherman’s Wharf fishing spot',...best,description:'Small fish gather below the wharf. Borrow the rod to catch a live fish, then sell it to the chef at Cotogna for 5 coins. Your bucket only holds one.'};sights.push(fishingSite);
    }
    function fishAtWharf(){
        if(ferrari?.state.riding)return parkCarFirst();
        if(capture.state.active||chase?.state.jailed||rocket.state.active||flying()||rope.climbing||sutroClimb.state.active||surf.state.riding||tahoe.state.mode!=='ground')return false;
        if(economy.state.fish){announce('You can only carry one live fish. Sell yours to the chef at Cotogna first.','Fishing');return false;}
        const begin=()=>{
            if(bike.riding)parkBike();parkMotorcycle(false);skateboard.riding=false;setDancing(false);closeMenu();closeReader();keys.clear();player.path=[];player.speed=0;player.motion=0;player.gesture=null;action=null;destination=null;
            const result=fishing.start(fishingSite);if(result.ok)player.angle=Math.atan2(fishingSite.water.z-player.y-.5,fishingSite.water.x-player.x-.5);announce(result.message,'Fishing');return result.ok;
        };
        closeMenu();return Math.hypot(player.x-fishingSite.entry.x,player.y-fishingSite.entry.y)<.55?begin():walkTo(fishingSite.entry.x,fishingSite.entry.y,begin);
    }
    function pickUpSunglasses(){
        if(sunglasses.state.owned)return false;
        if(ferrari?.state.riding)return parkCarFirst();
        if(flying())return airshipUnavailable();
        if(chase?.state.jailed||capture.state.active||rocket.state.active||surf.state.riding||rope.climbing||sutroClimb.state.active||tahoe.state.mode!=='ground')return false;
        closeMenu();if(bike.riding)parkBike();
        const collect=()=>{const result=sunglasses.pickUp();announce(result.message,'You');if(result.ok){player.gesture={name:'pet',started:performance.now(),duration:750};const quest=quests.theyLive.start();if(quest.ok)announce(quest.message,'They Live');}return result.ok;};
        const e=sunglassesSite.entry;
        return Math.hypot(player.x-e.x,player.y-e.y)<1?collect():walkTo(e.x,e.y,collect);
    }
    function setupBunny(){
        const p=sightById('painted'),o=p.object,a=o.rotation||0,cx=o.x+o.w/2,cz=o.y+o.d/2;
        const x=cx-Math.sin(a)*(o.d/2+1.6),z=cz+Math.cos(a)*(o.d/2+1.6),region=navigationRegionAt(player.x,player.y);
        const reachable=(x,y)=>navigationRegionAt(x,y)===region&&!placeAt(x,y);
        const site=nearestNavigation(x-.5,z-.5,3,(x,y)=>reachable(x,y)&&surfaceTypeAt(x+.5,y+.5)==='grass')||nearestNavigation(x-.5,z-.5,2,reachable);
        if(!site)throw new Error('The Painted Ladies bunny needs a reachable patch of grass');
        bunny=createPaintedBunny(site.x+.5,site.y+.5);sights.push(bunny.sight);
    }
    function setupSkateDog(){
        const park=sightById('dolores'),cx=park.entry.x+.5,front=park.entry.y+.5,region=navigationRegionAt(player.x,player.y);
        const paved=(x,y)=>navigationRegionAt(x,y)===region&&!placeAt(x,y)&&['plaza','courtyard','sidewalk','path','cobble'].includes(surfaceTypeAt(x+.5,y+.5));
        const home=nearestNavigation(cx-.5,front-.5,4,paved);
        if(!home)throw new Error('Dolores Park needs a paved path for its skateboarding dog');
        let route=null;
        search:for(const angle of [0,Math.PI/2])for(const half of [1.2,.9,.6]){
            const a={x:home.x-Math.cos(angle)*half,y:home.y-Math.sin(angle)*half},b={x:home.x+Math.cos(angle)*half,y:home.y+Math.sin(angle)*half};
            if(!canTravel(a.x,a.y,b.x,b.y))continue;
            let valid=true;for(let i=0;i<=12;i++)if(!paved(a.x+(b.x-a.x)*i/12,a.y+(b.y-a.y)*i/12))valid=false;
            if(!valid)continue;
            route=[a,b].map(p=>({x:p.x+.5,z:p.y+.5}));break search;
        }
        if(!route)throw new Error('The skateboarding dog needs a clear route beside Dolores Park');
        skateDog=createSkateDog(route,{onWoof:()=>announce('Woof!','Skateboarding dog')});sights.push(skateDog.sight);
    }
    function bunnyApproach(from=player){
        const b=bunny.state,a=Math.atan2(from.y+.5-b.z,from.x+.5-b.x);
        const region=navigationRegionAt(from.x,from.y),valid=(x,y)=>{const d=Math.hypot(x+.5-b.x,y+.5-b.z);return d>.6&&d<.85&&!placeAt(x,y)&&navigationRegionAt(x,y)===region&&Math.abs(characterGround(x+.5,y+.5)-characterGround(b.x,b.z))<.22;};
        return nearestNavigation(b.x+Math.cos(a)*.72-.5,b.z+Math.sin(a)*.72-.5,1,valid)||nearestNavigation(b.x-.5,b.z-.5,.9,valid);
    }
    function petBunny(){
        if(!bunny||chase?.state.jailed||rocket.state.active||rope.climbing||sutroClimb.state.active||surf.state.riding||tahoe.state.mode!=='ground')return false;
        if(flying())return airshipUnavailable();closeMenu();closeReader();
        const b=bunny.state,target=bunnyApproach();
        if(!target)return false;
        return walkTo(target.x,target.y,()=>{
            if(bike.riding)parkBike();player.path=[];player.speed=0;player.motion=0;player.runBlend=0;player.phase=0;player.angle=Math.atan2(b.z-player.y-.5,b.x-player.x-.5);
            const now=performance.now();player.gesture={name:'pet',started:now,duration:1500};bunny.pet(now,player.angle+Math.PI);
            announce('You pet the bunny. Its nose twitches approvingly.','You');canvas.focus({preventScroll:true});
        });
    }
    function feedDucks(){
        const s=sightById('ducks');closeMenu();
        if(!economy.state.grain){announce('You need grain. Talk to the grain merchant beside the park; one bag costs one coin.');return false;}
        return walkTo(s.entry.x,s.entry.y,()=>{const result=economy.trade('feed');if(!result.ok){announce(result.message);return;}ducksFedUntil=performance.now()+10000;announce('You scatter one bag of grain. Quack! The mallards and ducklings paddle over to investigate.','Ducks');});
        canvas.focus({preventScroll:true});
    }
    function updateBikeButton(){
        const near=!currentInterior&&Math.hypot(player.x-bike.x,player.y-bike.y)<2.5;
        const button=$('sf-bike-button'),mode=bike.riding?'riding':near?'near':'far';if(button.dataset.mode===mode)return;button.dataset.mode=mode;button.replaceChildren(document.createTextNode(bike.riding?'Park bike ':near?'Ride bike ':'Find bike '));
        const key=document.createElement('span');key.className='sf-key';key.textContent='B';button.append(key);button.setAttribute('aria-pressed',String(bike.riding));
    }
    function parkBike(x=player.x,y=player.y){bike.riding=false;bike.x=x;bike.y=y;player.speed=Math.min(player.speed,WALK_SPEED);updateBikeButton();announce('You park the bicycle. It will be waiting here.','You');}
    function mountBike(){
        parkMotorcycle(false);
        if(currentInterior)return;
        bike.riding=true;player.speed=0;player.path=[];destination=null;action=null;updateBikeButton();
        announce('You hop on the bicycle. Click to ride; press B to park.','You');canvas.focus({preventScroll:true});
    }
    function useBike(){
        skateboard.riding=false;
        if(chase?.state.jailed)return;
        if(sutroClimb.state.active)return climbUnavailable();
        if(airship.state.active)return airshipUnavailable();
        if(surf.state.riding){if(clickAttempt)clickAttempt.worked=false;announce('Return to shore before collecting the bicycle.');return;}
        closeMenu();if(bike.riding){parkBike();return;}
        if(!currentInterior&&Math.hypot(player.x-bike.x,player.y-bike.y)<2.5)mountBike();
        else{walkTo(Math.round(bike.x),Math.round(bike.y),mountBike);announce('Walking to the bicycle…');canvas.focus({preventScroll:true});}
    }
    function useSkateboard(){
        if(!quests.theyLive.state.skateboard){announce('Complete They Live to earn a skateboard from the City Hall clerk.','You');return false;}
        if(capture.state.active||chase?.state.jailed||flying()||rope.climbing||rocket.state.active||surf.state.riding||sutroClimb.state.active||training||tahoe.state.mode!=='ground'||currentInterior)return false;
        if(ferrari?.state.riding)return parkCarFirst();
        if(bike.riding)parkBike();
        closeMenu();setDancing(false);alienCombat=null;player.gesture=null;player.path=[];player.speed=0;action=null;destination=null;
        parkMotorcycle(false);skateboard.riding=!skateboard.riding;updateAdventureUI();
        announce(skateboard.riding?'You set down your skateboard. Click to skate; K puts it away.':'You pick up your skateboard.','You');canvas.focus({preventScroll:true});return true;
    }
    function performSkateTrick(id){
        if(!skateboard.riding||capture.state.active||chase?.state.jailed||dialogue.active||!$('sf-help').hidden||!$('sf-character').hidden)return false;
        const accepted=skateTricks.start(id);if(accepted){setDancing(false);closeMenu();announce(SKATE_TRICKS.find(t=>t.id===id).label+'!','Skateboard');updateAdventureUI();canvas.focus({preventScroll:true});}return accepted;
    }
    function updateSurfButton(){
        const b=$('sf-surf-button'),text=surf.state.riding?'Return to shore · F':'Windsurf · F';if(b.textContent!==text)b.textContent=text;b.setAttribute('aria-pressed',String(surf.state.riding));
        const p=$('sf-pacifica-surf-button'),active=surf.state.riding&&surf.state.mode==='surf',label=active?'Return to beach · U':'Surf · U';if(p.textContent!==label)p.textContent=label;p.setAttribute('aria-pressed',String(active));
    }
    function setupPacificaSurf(){
        const z=PACIFICA_SURF_SPOT.z,coast=westernCoastX(z),near={x:coast+Math.max(.6,westernBeachWidth(z)*.5)-.5,y:z-.5},entry=airship.nearest(near.x,near.y,2);
        if(!entry)throw new Error('Pacifica needs a dry surfboard launch');
        const launch={x:coast-PACIFICA_SURF_SPOT.launchDistance-.5,y:z-.5};if(!surf.water(launch.x+.5,launch.y+.5))throw new Error('Pacifica surf launch must be in the ocean');
        const x=entry.x+1.25,zz=entry.y-.5,base=airportWalkingHeight(x,zz);
        const sight={id:'pacifica-surf',kind:'surfing',label:'Pacifica surfboards',entry,launch,description:'Bright boards wait on the Pacifica beach. Paddle into the foam lines, press Space to catch a wave, and use 1 / 2 / 3 for an Air 360, kickflip or backflip. U returns to the beach.'};
        const object=addScenery(null,x-.35,zz-.95,.7,1.9,2.4,m=>drawSurfRack(m,{x,z:zz,base}));Object.assign(object,{sight,base,arch:'surf-rack',solid:true,preserveGround:true,footprint:rectangle(x,zz,.65,1.85)});sight.object=object;sights.push(sight);pacificaSurfSite=sight;
    }
    function usePacificaSurf(){
        if(surf.state.riding)return useSurf();
        if(capture.state.active||chase?.state.jailed||flying()||rocket.state.active||rope.climbing||sutroClimb.state.active||tahoe.state.mode!=='ground')return false;
        if(ferrari?.state.riding)return parkCarFirst();if(training)stopTraining();
        const mount=()=>{surf.state.mode='surf';Object.assign(surf.state.launch,pacificaSurfSite.launch);surf.state.shore={...pacificaSurfSite.entry};mountSurf();};
        closeMenu();return walkTo(pacificaSurfSite.entry.x,pacificaSurfSite.entry.y,mount);
    }
    function catchPacificaWave(){
        if(!surf.state.riding||surf.state.mode!=='surf')return false;
        if(waveSurf.state.ride)return performSurfTrick('air-360');
        const accepted=waveSurf.catchWave({x:player.x+.5,z:player.y+.5},waveTime);
        if(accepted){waveSurf.state.angle=player.angle;player.path=[];player.speed=0;destination=null;action=null;announce('You pop up and catch the wave! Click to steer along it. Try 1, 2 or 3 for tricks.','Surfing');}else announce('Paddle closer to a foam line off Pacifica, then press Space to catch it.','Surfing');
        canvas.focus({preventScroll:true});return accepted;
    }
    function performSurfTrick(id){if(!surf.state.riding||surf.state.mode!=='surf'||dialogue.active||!$('sf-help').hidden||!$('sf-character').hidden)return false;const accepted=waveSurf.trick(id);if(accepted){closeMenu();announce(SURF_TRICKS.find(t=>t.id===id).label+'!','Surfing');canvas.focus({preventScroll:true});}return accepted;}
    function jumpWhale(sight){
        closeMenu();
        if(!surf.state.riding||surf.state.mode!=='windsurf'||chase?.state.jailed){if(clickAttempt)clickAttempt.worked=false;announce('Borrow a windsurf board at Crissy Field to jump over the whales.','Whale watching');return false;}
        if(surf.state.jump)return false;
        let attempts=0;
        const launch=()=>{
            const target=whales.sample(reduced?0:performance.now()+800,sight.index);
            if(surf.jumpOver(player,target)){
                player.path=[];player.speed=7.2;player.angle=surf.state.jump.angle;action=null;destination=null;
                announce('You launch your board over the humpback whale!','Windsurfing');canvas.focus({preventScroll:true});return true;
            }
            const takeoff=surf.jumpApproach(player,target);
            if(!takeoff||attempts++>=3){if(clickAttempt)clickAttempt.worked=false;announce('Choose a whale with enough open water around it to jump.','Windsurfing');return false;}
            const accepted=walkTo(takeoff.x,takeoff.y,launch);
            if(accepted)announce('You sail into position to jump the humpback.','Windsurfing');return accepted;
        };
        return launch();
    }
    function mountSurf(){
        parkMotorcycle(false);
        if(chase?.state.jailed)return;
        if(bike.riding)parkBike();skateboard.riding=false;setDancing(false);closeReader();closeMenu();
        surf.cancelJump();surf.state.riding=true;player.x=surf.state.launch.x;player.y=surf.state.launch.y;player.path=[];player.speed=0;destination=null;action=null;
        if(surf.state.mode==='surf'){waveSurf.start({x:player.x+.5,z:player.y+.5});player.angle=Math.PI;}
        currentInterior=null;updateSurfButton();announce(surf.state.mode==='surf'?'You paddle out from Pacifica. Click the water to paddle; Space catches a wave. 1 / 2 / 3 perform tricks while riding. U returns to the beach.':'You launch from Crissy Field. Click the bay to windsurf; F returns you to shore.','You');
    }
    function landSurf(){
        const pacifica=surf.state.mode==='surf';waveSurf.stop();surf.cancelJump();surf.state.riding=false;player.x=surf.state.shore.x;player.y=surf.state.shore.y;player.path=[];player.speed=0;action=null;destination=null;updateSurfButton();announce(pacifica?'You carry the board back onto Pacifica beach.':'You carry the board back onto Crissy Field.','You');
    }
    function useSurf(){
        if(airship.state.active)return airshipUnavailable();
        if(chase?.state.jailed)return;if(sutroClimb.state.active)return climbUnavailable();closeMenu();closeReader();
        if(surf.state.riding){waveSurf.cancelRide();walkTo(surf.state.launch.x,surf.state.launch.y,landSurf);}
        else{surf.state.mode='windsurf';Object.assign(surf.state.launch,{x:WINDSURF_LAUNCH.water[0]*MAP_SCALE-.5,y:WINDSURF_LAUNCH.water[1]*MAP_SCALE-.5});surf.state.shore={...sightById('windsurf').entry};if(walkTo(surf.state.shore.x,surf.state.shore.y,mountSurf))announce('Walking to the windsurf board at Crissy Field…');}
        canvas.focus({preventScroll:true});
    }
    function officerRoute(tx,ty,from){
        return surf.pursuitRoute(from,{x:tx,y:ty},{landPath:(to,origin)=>pathTo(to.x,to.y,origin),clear:p=>clearAt(p.x,p.y)});
    }
    function talkRehabilitation(npc){
        if(!chase.state.jailed||rehabilitation.state.active)return false;closeMenu();keys.clear();player.path=[];player.speed=0;
        dialogue.open(rehabilitationDialogue(npc,()=>{rehabilitation.start();fishing.cancel();setDancing(false);player.path=[];player.motion=0;player.gesture=null;world.inert=true;announce('“Not at all.” The rehabilitation apparatus descends.','Specialist');}));return true;
    }
    function arrestPlayer(){
        social.cancelPitch();tech.losePhone('arrest');
        expeditions.abandonShip();
        dialogue.close();rocket.cancel();updateRocketControls();rope.reset();airship.cancel();sutroClimb.cancel();updateClimbButton();
        waveSurf.stop();surf.cancelJump();surf.state.riding=false;bike.riding=false;player.x=detention.x-.5;player.y=detention.z-.5;player.path=[];player.speed=0;player.moving=false;player.angle=-Math.PI/2;player.motion=0;player.runBlend=0;player.phase=0;player.gesture=null;
        action=null;destination=null;currentInterior=null;keys.clear();pointers.clear();clearTimeout(pressTimer);gesture=false;
        closeMenu();closeReader();closeHelp();$('sf-hover').hidden=true;$('sf-wanted').hidden=true;$('sf-custody').hidden=false;
        for(const input of world.querySelectorAll('#sf-map-button,#sf-bike-button,#sf-surf-button,#sf-airship-button,.sf-place-marker'))input.disabled=true;
        camera.yaw=.35;camera.cos=Math.cos(camera.yaw);camera.sin=Math.sin(camera.yaw);camera.pitch=.7;zoom=1;
        $('sf-zoom-slider').value='100';$('sf-zoom-slider').setAttribute('aria-valuetext','100% zoom');updateCamera();drawMini();
        updateSurfButton();announce('You are under arrest! You have been placed in the Carceral Urbanist Facility in the Marin Headlands. Click the floor to walk within your cell, or talk through the bars to the judge or rehabilitation specialist.','Police');
    }
    function regionalCitizenApproach(npc){
        if(npc.approach)return {...npc.approach};
        const candidates=[];
        for(let i=0;i<16;i++){const a=i*Math.PI/8,x=npc.x-.5+Math.cos(a),y=npc.z-.5+Math.sin(a);if(clearAt(x,y)&&airship.segment({x,y},{x:npc.x-.5,y:npc.z-.5}))candidates.push({x,y});}
        return candidates.sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0]||null;
    }
    function talkDogWalker(npc){
        if(capture.state.active||chase?.state.jailed||flying()||surf.state.riding||rocket.state.active||rope.climbing||sutroClimb.state.active||tahoe.state.mode!=='ground')return false;
        if(ferrari?.state.riding)return parkCarFirst();
        closeMenu();closeReader();expeditions.stop();alienCombat=null;
        return approachNPC(npc,()=>{npc.speech='';approachingNPC=npc;npc.waiting=true;dialogue.open(dogWalkerDialogue(npc));},{approach:n=>n.regional?regionalCitizenApproach(n):nearestNavigation(n.x-.5,n.z-.5,2,(x,y)=>{const d=Math.hypot(x+.5-n.x,y+.5-n.z);return d>.7&&d<1.5;})});
    }
    function interactCitizen(npc,verb){
        if(npc.kind==='market-farmer'&&verb==='talk')return talkMarketFarmer(npc);
        if(npc.wilderness)return verb==='pet'?petBear(npc):verb==='attack'?attackWildMonster(npc):examine(npc);
        if(npc.police)return examine(npc);
        if(npc.networkPlayer){if(verb==='attack')return multiplayerWorld.attackPlayer(npc);if(verb==='follow')return multiplayerWorld.followPlayer(npc);return walkToActor(npc);}
        if(npc.kind==='guild-master'&&verb==='talk')return talkGuildRay(npc);
        if(npc.kind==='illuminati-elder'&&verb==='talk')return talkOldMan(npc);
        if(npc.kind==='tablet-wizard'&&verb==='talk')return talkTabletWizard(npc);
        if(npc.kind==='banker'&&verb==='talk')return talkBanker(npc);
        if(npc.dogWalker&&verb==='talk')return talkDogWalker(npc);
        if(npc.expeditionRole)return talkExpeditionNPC(npc);
        if(['raptor','cow','kraken'].includes(npc.combatKind)&&verb==='attack')return attackExpeditionTarget(npc);
        if(npc.alienId&&verb==='attack'&&expeditions.state.railgun&&expeditions.state.equipped)return attackExpeditionTarget(npc);
        if(npc.rehabilitation)return talkRehabilitation(npc);
        if(npc.parrot)return talkParrot(npc);
        if(npc.dog===true&&!npc.dogWalker){npc.speech='Woof!';npc.speechUntil=performance.now()+3000;player.gesture={name:'talk',started:performance.now(),duration:900};announce('You pet the dog. Its afternoon has improved considerably.','You');return true;}
        if(npc.child&&verb!=='talk')return false;
        if(npc.questRole)return talkQuestNPC(npc);
        if(quests.theyLive.isDefeated(npc.alienId))return false;
        if(npc.researcher)return talkResearcher(npc);
        if(npc.kind==='rail-worker')return talkRailWorker(npc);
        if(npc.club&&verb==='talk'){
            const speak=()=>{npc.speech=nightlifeRebuff(playerLook.gender);npc.speechUntil=performance.now()+3500;announce('“'+npc.speech+'”',npc.label);};
            if(inNightlife(player.x+.5,player.y+.5))speak();else walkTo(NIGHTLIFE.inside.x,NIGHTLIFE.inside.y,speak);
            return;
        }
        if(npc.kind==='fuel-attendant')return useFuel(sightById(npc.siteId),npc);
        if(npc.kind==='motorcycle-clerk')return talkMotorcycleClerk(npc);
        if(npc.kind==='lift')return talkLiftAttendant(npc);
        if(npc.kind==='recruiter')return talkLabRecruiter();
        if(npc.kind==='deli')return talkDeli();
        if(npc.kind==='burger-clerk')return talkBurger(npc);
        if(npc.kind==='bartender')return talkBeer();
        if(npc.kind&&MERCHANTS[npc.kind])return talkMerchant(npc);
        if(flying())return airshipUnavailable();
        if(chase?.state.jailed||surf.state.riding||rocket.state.active||rope.climbing||tahoe.state.mode!=='ground')return;closeMenu();if(dialogue.active)dialogue.close();
        if(sutroClimb.state.active)return climbUnavailable();
        if(npc.baby)npc.parent.hold=8;
        npc.hold=8;npc.lookAt={x:player.x+.5,z:player.y+.5};
        const target=npc.approach?{...npc.approach}:npc.regional?regionalCitizenApproach(npc):nearestNavigation(npc.x-.5,npc.z-.5,2,(x,y)=>{const d=Math.hypot(x+.5-npc.x,y+.5-npc.z);return d>=.8&&d<1.5&&(!npc.interior||placeAt(x,y)===npc.interior);});
        const perform=()=>{
            if(npc.alienId&&verb==='attack')return attackAlien(npc);
            if(npc.baby)npc.parent.hold=3;
            npc.hold=3;npc.lookAt={x:player.x+.5,z:player.y+.5};
            const started=performance.now();player.gesture={name:verb,started,duration:verb==='talk'?900:650};
            npc.gesture={name:verb==='attack'?'flinch':verb==='talk'?'talk':null,started,duration:900};
            if(verb==='talk'){
                const lines=['The wind is good off Crissy Field. There is a board by the beach. Sail west of the city to spot whales.','You can see the whole city from Twin Peaks.','I was on my way to Mazarine for a coffee.','Try the park. The ducks always have something to say.'];
                const localLines=['Pacifica Commons is my favorite place for a quiet lap. The fountain has excellent conversational skills.','SF Fitness is east of the zoo. I consider walking past it a warm-up.','Grand Avenue is looking lively. I came for a short stroll and accidentally toured the entire peninsula.','A hill, a coffee, and a suspicious amount of ocean air. That is my afternoon sorted.'];
                const text=npc.neighborhood?npc.neighborLine:npc.estateResident?npc.poolTalk:npc.baby?'Goo!':npc.dogWalker?'We are taking the scenic route. He has strong opinions about every tree in the neighborhood.':npc.child?'I am going to count every duck in the park. Twice, for science.':npc.keeper?(monkeyKeeper.active?'Stop! Return that monkey! It has a very full social calendar.':'Please leave the monkeys in their enclosure. Especially the one applying for academic jobs.'):npcRevealed(npc)?'Nothing unusual here. Consume normally. Please direct all existential inquiries to our advertising department.':npc.regional?localLines[Math.floor(rand(npc.x,npc.z,7)*localLines.length)]:npc.named==='Nia'?'Best way to see the city? Borrow the bicycle, or go windsurfing at Crissy Field.':lines[Math.floor(rand(npc.x,npc.z,7)*lines.length)];
                npc.speech=text;npc.speechUntil=performance.now()+4500;announce('“'+text+'”',npc.named||npc.label);
            }else{
                npc.speech='Help! Police!';npc.speechUntil=performance.now()+4500;
                announce(verb==='attack'?'You attack the '+npc.label.toLowerCase()+'. They call for the police.':'You steal a few coins from the '+npc.label.toLowerCase()+'. They raise the alarm.','You');
                chase.start();$('sf-wanted').hidden=false;announce('Stop! You are under arrest!','Police');
            }
        };
        if(Math.hypot(player.x+.5-npc.x,player.y+.5-npc.z)<1.8&&(!npc.interior||currentInterior===npc.interior))perform();
        else if(!target||!walkTo(target.x,target.y,perform)){if(clickAttempt)clickAttempt.worked=false;npc.hold=0;announce('Move closer to the '+npc.label.toLowerCase()+'.');}
        canvas.focus({preventScroll:true});
    }
    function initializeGeography(){
        for(let y=0;y<N;y++)for(let x=0;x<N;x++){
            const id=y*N+x;
            landMask[id]=[[.04,.04],[.96,.04],[.96,.96],[.04,.96]].every(([dx,dy])=>insidePolygon(x+dx,y+dy,COAST))?1:0;
            const r=nearestStreet(x+.5,y+.5);roadIndex[id]=r.index;roadDistance[id]=r.distance;
            if(landMask[id]&&(pondValue(x+.5,y+.5)<1.1||mercedValue(x+.5,y+.5)<1.08||palaceWater(x+.5,y+.5)<1.08))occupied[id]=1;
        }
        // Entrances and landmark approaches remain open when scenery is generated.
        for(const p of [...places.map(p=>p.entry),...sights.map(s=>s.entry),player]){
            for(let x=Math.floor(p.x)-1;x<=Math.ceil(p.x)+1;x++)for(let y=Math.floor(p.y)-1;y<=Math.ceil(p.y)+1;y++)if(x>=0&&y>=0&&x<N&&y<N)reserved[y*N+x]=1;
        }
    }



    let worldTiles=null;
    // BEGIN TILE BUILDER
    function tileBaseType(x,z,fixed=false){
        if(!insidePolygon(x,z,COAST))return 'sea';
        if(worldTiles?.waterTiles?worldTiles.waterTiles.regionAt(x,z).type==='water':pondValue(x,z)<1.12||mercedValue(x,z)<1.1||palaceWater(x,z)<1.1)return 'water';
        return tileLandType(x,z,fixed);
    }
    function tileLandType(x,z,fixed=false){
        if(fixed)return 'building';if(Math.abs(x-SF_ZOO.x)<SF_ZOO.w/2&&Math.abs(z-SF_ZOO.z)<SF_ZOO.d/2)return 'grass';const u=x/MAP_SCALE,v=z/MAP_SCALE;if(u>=23.7&&u<=26.9&&v>=12.8&&v<=17.4)return 'grass';if(u>=47.8&&u<=51.6&&v>=18.8&&v<=23)return 'plaza';if(u<9.6&&v>28)return 'sand';if(greenArea(x,z))return sfHillCover(u,v);return 'plaza';
    }
    const sub2=(a,b)=>[a[0]-b[0],a[1]-b[1]];
    function chamferDistance(mask,size){
        const out=new Float32Array(mask.length);for(let i=0;i<out.length;i++)out[i]=mask[i]?0:1e5;
        for(let z=0;z<size;z++)for(let x=0;x<size;x++){const i=z*size+x;if(x)out[i]=Math.min(out[i],out[i-1]+1);if(z){out[i]=Math.min(out[i],out[i-size]+1);if(x)out[i]=Math.min(out[i],out[i-size-1]+Math.SQRT2);if(x+1<size)out[i]=Math.min(out[i],out[i-size+1]+Math.SQRT2);}}
        for(let z=size-1;z>=0;z--)for(let x=size-1;x>=0;x--){const i=z*size+x;if(x+1<size)out[i]=Math.min(out[i],out[i+1]+1);if(z+1<size){out[i]=Math.min(out[i],out[i+size]+1);if(x)out[i]=Math.min(out[i],out[i+size-1]+Math.SQRT2);if(x+1<size)out[i]=Math.min(out[i],out[i+size+1]+Math.SQRT2);}}return out;
    }
    function createTileBuilder(){
        const size=N*TILE_CONFIG.resolution,step=1/TILE_CONFIG.resolution,blocked=new Uint8Array(size*size),fixed=new Uint8Array(N*N);
        for(let i=0;i<fixed.length;i++)fixed[i]=occupied[i];
        for(let z=0;z<size;z++)for(let x=0;x<size;x++){const wx=(x+.5)*step,wz=(z+.5)*step,id=z*size+x,base=tileBaseType(wx,wz);blocked[id]=!landMask[Math.floor(wz)*N+Math.floor(wx)]||base==='water'||fixed[Math.floor(wz)*N+Math.floor(wx)]?1:0;}
        const vertices=(size+1)**2,road=new Float32Array(vertices),path=new Float32Array(vertices);road.fill(100);path.fill(100);
        return {size,step,blocked,clearance:chamferDistance(blocked,size),road,path,roadFrames:new Float32Array(vertices),routes:[],tiles:[],connectors:0,waterTiles:createWaterTiles({size,step,coast:COAST,lakes})};
    }
    function simplifyRoute(ids,size,step){
        const result=[];for(let i=0;i<ids.length;i++){const id=ids[i],x=id%size,z=Math.floor(id/size),prev=ids[i-1],next=ids[i+1];if(i&&i+1<ids.length&&x-prev%size===next%size-x&&z-Math.floor(prev/size)===Math.floor(next/size)-z)continue;result.push([(x+.5)*step,(z+.5)*step]);}return result;
    }
    function paintStreetField(map,points,kind,halfWidth){
        const field=kind==='path'?map.path:map.road,stride=map.size+1,margin=halfWidth+TILE_CONFIG.curbWidth+map.step*2;
        for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],loX=Math.max(0,Math.floor((Math.min(a[0],b[0])-margin)/map.step)),hiX=Math.min(map.size,Math.ceil((Math.max(a[0],b[0])+margin)/map.step)),loZ=Math.max(0,Math.floor((Math.min(a[1],b[1])-margin)/map.step)),hiZ=Math.min(map.size,Math.ceil((Math.max(a[1],b[1])+margin)/map.step));for(let z=loZ;z<=hiZ;z++)for(let x=loX;x<=hiX;x++){const id=z*stride+x;const value=distanceToSegment(x*map.step,z*map.step,a,b)-halfWidth;if(value<field[id]){field[id]=value;if(kind!=='path')map.roadFrames[id]=((Math.atan2(b[1]-a[1],b[0]-a[0])%(Math.PI/2))+Math.PI/2)%(Math.PI/2);}}}
    }
    function centerNetworkComponents(map){
        const labels=new Int32Array(map.size*map.size);labels.fill(-1);const centers=new Uint8Array(labels.length),stride=map.size+1;
        for(let z=0;z<map.size;z++)for(let x=0;x<map.size;x++){const a=z*stride+x,c=(z+1)*stride+x+1;centers[z*map.size+x]=Math.min((map.road[a]+map.road[c])*.5,(map.path[a]+map.path[c])*.5)<=1e-9?1:0;}
        let count=0;for(let id=0;id<labels.length;id++)if(centers[id]&&labels[id]<0){const queue=[id];labels[id]=count;for(let i=0;i<queue.length;i++){const k=queue[i],x=k%map.size,z=Math.floor(k/map.size);for(const d of TILE_EDGES){const nx=x+d.dx,nz=z+d.dz;if(nx<0||nz<0||nx>=map.size||nz>=map.size)continue;const ni=nz*map.size+nx;if(centers[ni]&&labels[ni]<0){labels[ni]=count;queue.push(ni);}}}count++;}return {labels,count};
    }
    function connectStreetNetwork(map){
        for(let tries=0;tries<16;tries++){const {labels,count}=centerNetworkComponents(map);if(count<=1)return;
            const owner=new Int32Array(labels),parent=new Int32Array(labels.length);parent.fill(-1);const queue=[];for(let id=0;id<labels.length;id++)if(labels[id]>=0)queue.push(id);const need=(.18+TILE_CONFIG.curbWidth+map.step*Math.SQRT2)/map.step+.5;let pair=null;
            search:for(let i=0;i<queue.length;i++){const k=queue[i],x=k%map.size,z=Math.floor(k/map.size);for(const d of TILE_EDGES){const nx=x+d.dx,nz=z+d.dz;if(nx<0||nz<0||nx>=map.size||nz>=map.size)continue;const ni=nz*map.size+nx;if(map.clearance[ni]<need)continue;if(owner[ni]<0){owner[ni]=owner[k];parent[ni]=k;queue.push(ni);}else if(owner[ni]!==owner[k]){pair=[k,ni];break search;}}}
            if(!pair)throw new Error('Isolated street network');const left=[],right=[];for(let id=pair[0];id>=0;id=parent[id])left.push(id);for(let id=pair[1];id>=0;id=parent[id])right.push(id);const route=[...left.reverse(),...right],points=simplifyRoute(route,map.size,map.step);if(route.length*map.step>12)throw new Error('Unreasonably long street connector');paintStreetField(map,points,'path',.18);map.routes.push({name:'Connecting walk',kind:'path',points,halfWidth:.18});map.connectors++;
        }throw new Error('Too many disconnected street fragments');
    }
    function compileStreetTiles(){
        const map=createTileBuilder();
        for(const r of streets){
            const profile={kind:r.kind==='path'?'path':'road',halfWidth:r.w},parts=[];
            // Clip straight road runs to dry land. Buildings never bend the grid.
            for(let i=1;i<r.points.length;i++){
                const a=r.points[i-1],b=r.points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]),steps=Math.max(1,Math.ceil(length/.125));let part=[];
                const finish=()=>{if(part.length>1){const line=[part[0],part[part.length-1]];parts.push(line);}part=[];};
                for(let j=0;j<=steps;j++){const t=j/steps,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,ix=Math.floor(x/map.step),iz=Math.floor(z/map.step),need=(profile.halfWidth+TILE_CONFIG.curbWidth+map.step*Math.SQRT2)/map.step+.5;
                    if(ix>=0&&iz>=0&&ix<map.size&&iz<map.size&&map.clearance[iz*map.size+ix]>=need)part.push([x,z]);else finish();
                }finish();
            }
            const runs=[];for(const p of parts){const last=runs[runs.length-1];if(last&&Math.hypot(...sub2(last[last.length-1][1],p[0]))<.15)last.push(p);else runs.push([p]);}const main=runs.sort((a,b)=>b.reduce((s,p)=>s+Math.hypot(...sub2(p[1],p[0])),0)-a.reduce((s,p)=>s+Math.hypot(...sub2(p[1],p[0])),0))[0]||[];parts.length=0;parts.push(...main);for(const line of parts){paintStreetField(map,line,profile.kind,profile.halfWidth);map.routes.push({name:r.name,...profile,points:line});}
            r.parts=parts;r.route=parts.length?parts.reduce((a,b)=>Math.hypot(...sub2(b[1],b[0]))>Math.hypot(...sub2(a[1],a[0]))?b:a):r.points;
            // This road continues over the grid boundary. Evaluate its complete
            // centerline so the final city tiles match the airport tiles exactly.
            if(r.regional)paintStreetField(map,r.points,profile.kind,profile.halfWidth);
            if(r.name==='Market Street')r.route=r.points;
        }
        connectStreetNetwork(map);
        const stride=map.size+1,claims=new Map();map.overrideTypes=new Map();for(const item of TILE_CONFIG.overrides){const preset=TILE_PRESETS[item.preset];if(!preset)throw new Error('Unknown tile preset: '+item.preset);if(!Number.isInteger(item.rotation??0)||(item.rotation??0)<0||(item.rotation??0)>3)throw new Error('Tile rotation must be 0–3');if(!Number.isInteger(item.x)||!Number.isInteger(item.z)||item.x<0||item.z<0||item.x>=map.size||item.z>=map.size)throw new Error('Tile override outside map');const ids=[item.z*stride+item.x,item.z*stride+item.x+1,(item.z+1)*stride+item.x+1,(item.z+1)*stride+item.x];for(const key of ['road','path'])if(preset[key])for(let i=0;i<4;i++){const value=preset[key][(i-(item.rotation||0)+4)%4],vertex=ids[i],claim=key+':'+vertex;if(claims.has(claim)&&claims.get(claim)!==value)throw new Error('Conflicting shared tile override');claims.set(claim,value);map[key][vertex]=value;}if(preset.type)map.overrideTypes.set(item.z*map.size+item.x,preset.type);}
        map.passageCache?.clear();worldTiles=map;rebuildSurfaceTiles();
    }
    function rebuildSurfaceTiles(){
        const map=worldTiles,stride=map.size+1;map.tiles=[];
        for(let z=0;z<map.size;z++)for(let x=0;x<map.size;x++){
            const id=z*map.size+x,wx=(x+.5)*map.step,wz=(z+.5)*map.step,cell=map.waterTiles.boundaries.get(id),region=map.waterTiles.regionAt(wx,wz);
            const base=map.overrideTypes.get(id)||(cell?tileLandType(wx,wz):region.type||tileLandType(wx,wz));
            const tile=applyWaterTile(buildSurfaceTile(base,[z*stride+x,z*stride+x+1,(z+1)*stride+x+1,(z+1)*stride+x].map(k=>[map.road[k],map.path[k]])),cell);
            if(region.type)tile.waterLevel=region.level;
            tile.frame=map.road[z*stride+x]<99?map.roadFrames[z*stride+x]:(wx-wz>=layoutPosition(3)&&wx+wz>=layoutPosition(99)&&wx+wz<=layoutPosition(126)?Math.PI/4:0);map.tiles.push(tile);
        }
    }
    function pavingInArea(x,z,w=1,d=1){
        if(!worldTiles)return false;const m=worldTiles;for(let iz=Math.max(0,Math.floor(z/m.step));iz<Math.min(m.size,Math.ceil((z+d)/m.step));iz++)for(let ix=Math.max(0,Math.floor(x/m.step));ix<Math.min(m.size,Math.ceil((x+w)/m.step));ix++){const t=m.tiles[iz*m.size+ix];if((t.areas.road||0)+(t.areas.path||0)+(t.areas.sidewalk||0)>1e-8)return true;}return false;
    }
    function auditDowntown(){
        const end=DOWNTOWN.market[0].map(mapPosition),f=DOWNTOWN.ferry.entrance.map(mapPosition),tower=objects.find(o=>o.sight?.id==='salesforce'),ferry=objects.find(o=>o.sight?.id==='ferry');
        const endpoint=(name,p)=>Math.min(...worldTiles.routes.filter(r=>r.name===name).flatMap(r=>r.points.map(q=>Math.hypot(q[0]-p[0],q[1]-p[1]))));
        const first=DOWNTOWN.bridge.rampStart.map(mapPosition),dx=f[0]-end[0],dz=f[1]-end[1];
        const checks={salesforceSouthOfMarket:marketSide((tower.x+tower.w/2)/MAP_SCALE,(tower.y+tower.d/2)/MAP_SCALE)>2.5,marketReachesFerryPlaza:endpoint('Market Street',end)<.26,embarcaderoMeetsMarket:endpoint('Embarcadero',end)<.26,ferryFacesMarket:Math.abs(dx+dz)<1e-7&&dx>0,bridgeJoinsFirstStreet:endpoint('First Street',first)<.26,ferryPinned:!!ferry.pinned};
        return {ok:Object.values(checks).every(Boolean),checks};
    }
    function finalizeSurfaceTiles(){
        for(let z=0;z<worldTiles.size;z++)for(let x=0;x<worldTiles.size;x++){const tile=worldTiles.tiles[z*worldTiles.size+x];if(!inCoitGrove((x+.5)*worldTiles.step,(z+.5)*worldTiles.step))continue;if(['plaza','courtyard','dirt'].includes(tile.base)){tile.base='grass';if(tile.patches)tile.patches=tile.patches.map(p=>['plaza','courtyard','dirt'].includes(p.type)?{...p,type:'grass'}:p);else {tile.type='grass';tile.areas={grass:1};tile.edges=TILE_EDGES.map(()=>[{from:0,to:1,type:'grass'}]);}}}
        const map=worldTiles;for(const o of objects)if((o.place||o.arch||o.solid)&&!o.preserveGround){const footprint=objectFootprint(o),bounds=polygonBounds(footprint);
            for(let z=Math.max(0,Math.floor(bounds.z/map.step));z<Math.min(map.size,Math.ceil(bounds.bottom/map.step));z++)for(let x=Math.max(0,Math.floor(bounds.x/map.step));x<Math.min(map.size,Math.ceil(bounds.right/map.step));x++){
                const wx=x*map.step,wz=z*map.step,tile=map.tiles[z*map.size+x];if((tile.areas.road||tile.areas.path||tile.areas.sidewalk)){const patches=tile.patches||[{type:tile.type,polygon:[[0,0],[1,0],[1,1],[0,1]]}];for(const patch of patches)if(['road','path','sidewalk'].includes(patch.type)&&tilePolygonOverlap(footprint,patch.polygon.map(p=>[wx+p[0]*map.step,wz+p[1]*map.step]))>1e-6)throw new Error('Building crosses its curb at '+o.x+','+o.y);continue;}if(!insidePolygon(wx+map.step/2,wz+map.step/2,footprint))continue;
                if((tile.areas.road||0)+(tile.areas.path||0)+(tile.areas.sidewalk||0)>1e-7)continue;
                tile.frame=((o.rotation||0)%(Math.PI/2)+Math.PI/2)%(Math.PI/2);
                // Waterfront piers and lagoon landmarks may span water. Their
                // footprints can recolor dry ground, but must retain the bank.
                if(tile.areas.sea||tile.areas.water){
                    if(tile.patches?.some(p=>TILE_TYPES[p.type].group!=='water')){const replacement=surfaceTileFromPatches('building',tile.patches.map(p=>TILE_TYPES[p.type].group==='water'?p:{...p,type:'building'}),{keepPolygons:true});replacement.variant='shoreline';Object.assign(tile,replacement);}
                    continue;
                }
                tile.base='building';tile.type='building';tile.variant='building';tile.patches=null;tile.areas={building:1};tile.edges=TILE_EDGES.map(()=>[{from:0,to:1,type:'building'}]);
            }
        }
        // Enclosed rear-block space is a shared garden, not an empty paved lot.
        const buildings=chamferDistance(Uint8Array.from(map.tiles,t=>t.type==='building'?1:0),map.size),paving=chamferDistance(Uint8Array.from(map.tiles,t=>(t.areas.road||t.areas.path||t.areas.sidewalk)?1:0),map.size);
        for(let z=0;z<map.size;z++)for(let x=0;x<map.size;x++){const id=z*map.size+x,t=map.tiles[id],wx=(x+.5)*map.step,wz=(z+.5)*map.step;if(t.type!=='plaza'||t.areas.sea||t.areas.water||buildings[id]>8||paving[id]<2.5||publicSpaces.some(p=>insidePolygon(wx,wz,p)))continue;t.type='courtyard';t.base='courtyard';t.variant='courtyard';t.patches=null;t.areas={courtyard:1};t.edges=TILE_EDGES.map(()=>[{from:0,to:1,type:'courtyard'}]);}
        const regression=runTileRuleTests(),report=validateTileMap(map);if(!report.ok)throw new Error('World tile validation failed: '+report.errors.slice(0,8).join('; '));const geography=auditDowntown();if(!geography.ok)throw new Error('Downtown geography failed: '+JSON.stringify(geography.checks));const frontages=auditCityBlocks();if(!frontages.ok)throw new Error('Street-block validation failed: '+frontages.coverage+'% building frontage; '+frontages.alignmentErrors+' alignment errors');map.validation={...report,regression,connectors:map.connectors,dimensions:{x:N,y:N,reference:REFERENCE_SIZE,scale:MAP_SCALE},frontages,geography};
    }
    // END TILE BUILDER
    // Mesh coordinates are east, elevation, south. Positions/normals/colors/UVs
    // remain in GPU buffers when the camera moves; only its matrix changes.
    // Inline SVG source assets are rasterized once into one mipmapped GPU atlas.
    // Materials repeat in world coordinates, so adjacent surface cells have no seams.
    let tahoeGPU=null,tahoeMesh=null;
    const signTextureControls={};
    let program,atlasTexture,materialTexture,materialState=null,alpineTextures,alpineState=null,sceneGPU,groundGPU,dynamicGPU,sceneMesh,groundMesh,seaBounds,shadowProgram,shadowFramebuffer,shadowTexture,shadowMatrix,shadowRoom,lampGlow,cityLife,noeValleyLife;
    const SHADOW_SIZE=2048;
    const glazing=createGlazingBatch();let glassGPU=null,drawingGlass=false;
    let cityLightPlan=null;
    const streetLights=[],buildingModels=[],signs=new Map(),gpuStats={triangles:0,drawCalls:0};
    function signNames(){return ['THE ARMORY',...SOUTHERN_CRAFT_SIGNS,...SOCIAL_SIGNS,...TECH_SIGNS,...HABERDASHER_SIGNS,...SALT_FLATS_SIGNS,...GPU_FACTORY_SIGNS,...BUS_SIGNS,...JURASSIC_SIGNS,...places.flatMap(p=>[p.name,...(p.signText?[p.signText]:[])]),'Golden Gate Park','The Panhandle','Presidio','Mazarine Coffee','City Lights','FERRY BUILDING','CHINATOWN','de Young','Conservatory','Academy of Sciences','Crissy Field','TAX AUTHORITY','California high-speed rail','SPACEX · 1 COIN','PRIVATE JET TERMINAL','PROMETHEUS','Fire is for everyone.','NIGHTLIFE',...TIMES_SQUARE_SIGNS,...SQUARE_LIFE_SIGNS,...ALIEN_SITE_SIGNS,...RESEARCH_SIGNS,...PENINSULA_SIGNS,...WOODLAND_SIGNS,...ADVENTURE_SIGNS,'GONDOLA','SKIS · 1 COIN','SF ZOO','TIGER','UCSF HOSPITAL',...RESTAURANTS.map(r=>r.name)];}
    function initGPU(){
        const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;};
        program=gl.createProgram();
        gl.attachShader(program,compile(gl.VERTEX_SHADER,`attribute vec3 aPosition,aNormal,aColor;attribute vec2 aUV;uniform mat4 uVP,uLightVP;uniform vec3 uEye;varying vec3 vColor,vWorld,vNormal;varying vec2 vUV;varying vec4 vShadow;varying float vDistance,vBillboard;void main(){vBillboard=aUV.x>=0.&&aColor.r>1.05?1.:0.;float light=.69+.31*max(dot(normalize(aNormal),normalize(vec3(-.5,.9,.35))),0.);bool room=abs(aUV.x+1.05)<.025;bool emissive=aUV.x> -1.3&&aUV.x< -1.1;vColor=aColor*mix(light,room?.9:.97,room?1.:emissive?clamp(aUV.y,0.,1.):0.);if(vBillboard>.5)vColor=vec3(1.);vUV=aUV;vWorld=aPosition;vNormal=aNormal;vDistance=distance(aPosition,uEye);vShadow=uLightVP*vec4(aPosition,1.);gl_Position=uVP*vec4(aPosition,1.);}`));
        const precision=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT).precision?'highp':'mediump',glassStyle=-2-MATERIAL_IDS.glass;
        gl.attachShader(program,compile(gl.FRAGMENT_SHADER,`precision ${precision} float;uniform sampler2D uAtlas,uMaterials,uShadowMap,uAlpineSnow,uAlpineGroom,uAlpineRock,uAlpineForest;uniform float uShadows,uTime,uGlassPass;uniform vec3 uEye,uFocus;varying vec3 vColor,vWorld,vNormal;varying vec2 vUV;varying vec4 vShadow;varying float vDistance,vBillboard;${ALPINE_TEXTURE_GLSL}${SF_SHADOW_GLSL}void main(){vec3 col=vColor;
            bool clearGlass=abs(vUV.x-(${GLASS_UV}))<.015;
            if(clearGlass!=(uGlassPass>.5))discard;
            if(clearGlass){
                vec3 view=normalize(uEye-vWorld),normal=normalize(vNormal);
                float fresnel=pow(1.-abs(dot(normal,view)),3.);
                float shine=pow(max(dot(reflect(-normalize(vec3(-.5,.9,.35)),normal),view),0.),56.);
                vec3 tint=mix(vColor,vec3(.72,.84,.88),.28+fresnel*.35)+shine*.12;
                float fog=smoothstep(50.,115.,vDistance);
                gl_FragColor=vec4(mix(tint,vec3(.59,.72,.74),fog*.7),clamp(vUV.y+fresnel*.12+shine*.04,.06,.28));return;
            }
            ${SALESFORCE_CROWN_GLSL}
            if(vUV.x> -1.9&&vUV.x< -1.5){
                if(vUV.y>9.5){
                    float r=sin(vWorld.x*9.+sin(vWorld.z*6.+uTime*.3))*sin(vWorld.z*11.-uTime*.25);
                    col=vColor*(.96+.025*r)+vec3(.025,.028,.02)*pow(max(0.,r),12.);
                    col*=1.-sfShadow(vShadow,.0007)*.16;
                    gl_FragColor=vec4(col,1.);return;
                }
                if(vUV.y>3.5){
                    vec2 plane=vWorld.xz+vec2(sin(vWorld.z*7.+uTime*.7),cos(vWorld.x*6.-uTime*.6))*.006;
                    vec2 cell=vec2(${MATERIAL_IDS.poolMosaic%MATERIAL_ATLAS.columns}.,${Math.floor(MATERIAL_IDS.poolMosaic/MATERIAL_ATLAS.columns)}.);
                    vec3 tile=texture2D(uMaterials,(cell+vec2(.008)+fract(plane)*.984)/vec2(${MATERIAL_ATLAS.columns}.,${MATERIAL_ATLAS.rows}.)).rgb;
                    float ripple=sin(vWorld.x*12.+sin(vWorld.z*9.+uTime*.8))*sin(vWorld.z*11.-uTime*.65);
                    col=mix(tile*vec3(.35,.69,.69),vec3(.36,.72,.72),.43)+vec3(.09,.10,.07)*pow(max(0.,ripple),8.);
                    col*=1.-sfShadow(vShadow,.0007)*.18;
                    gl_FragColor=vec4(col,1.);return;
                }
                float lake=step(1.5,vUV.y),depth=clamp(vUV.y,0.,1.),time=uTime*(1.-lake*.65);
                float a=vWorld.x*1.6+vWorld.z*.83-time*.65+sin(vWorld.z*.31)*.7,b=vWorld.x*.6-vWorld.z*2.1+time*.45+sin(vWorld.x*.22)*.8,c=vWorld.x*4.2+vWorld.z*3.7+time*.18;
                vec3 n=normalize(vec3(-cos(a)*.064-cos(b)*.024,1.,-cos(a)*.033+cos(b)*.084));
                vec3 view=normalize(uEye-vWorld);float fresnel=pow(1.-max(dot(n,view),0.),3.);
                vec3 deep=mix(vec3(.14,.33,.42),vec3(.19,.39,.44),smoothstep(20.,60.,vWorld.x));
                col=mix(vec3(.32,.55,.54),deep,depth);col=mix(col,vec3(.28,.43,.4),lake*.55);
                col=mix(col,vec3(.57,.7,.72),fresnel*.6)+(sin(a)+sin(b)*.45+sin(c)*.12)*.018;
                float shine=pow(max(dot(reflect(-normalize(vec3(-.5,.9,.35)),n),view),0.),48.);col+=vec3(.69,.76,.7)*shine*.32;
                float surf=(1.-smoothstep(.025,.23,depth))*(.5+.5*sin(time*1.1+vWorld.x*.9+vWorld.z*.6-depth*24.));col+=vec3(.22,.25,.22)*surf;
                col*=1.-sfShadow(vShadow,.0007)*.1;
                float fog=smoothstep(50.,150.,length(uEye-vWorld));gl_FragColor=vec4(mix(col,vec3(.59,.72,.74),fog*.7),1.);return;
            }
            bool envelope=abs(vUV.x+1.)<.025&&vUV.y< -7.;
            if(envelope){vec3 sight=normalize(uEye-uFocus),delta=vWorld-uFocus;float along=dot(delta,sight),radius=length(delta-sight*along);if(along>0.&&radius<1.15){float opacity=smoothstep(.98,1.06,radius),pattern=fract(dot(mod(floor(gl_FragCoord.xy),4.),vec2(.25,.5625)));if(pattern>=opacity)discard;}}
            if(vUV.x>=0.){col*=texture2D(uAtlas,vUV).rgb;if(vBillboard>.5){float fog=smoothstep(50.,115.,vDistance);gl_FragColor=vec4(mix(col,vec3(.59,.72,.74),fog*.7),1.);return;}}
            ${SNOW_SURFACE_GLSL}
            else if(envelope){col*=.99+.01*sin(dot(vWorld,vec3(17.,31.,13.)));}
            else if(vUV.x< -1.5){float kind=envelope?${MATERIAL_IDS.stucco}.:-vUV.x-2.;vec3 n=abs(vNormal);vec2 plane=n.y>.65?vWorld.xz:n.x>n.z?vec2(vWorld.z,-vWorld.y):vec2(vWorld.x,-vWorld.y);if(!envelope&&n.y>.65&&abs(vUV.y)>.001){float c=cos(vUV.y),s=sin(vUV.y);plane=vec2(vWorld.x*c+vWorld.z*s,-vWorld.x*s+vWorld.z*c);}vec2 cell=vec2(mod(kind,${MATERIAL_ATLAS.columns}.),floor(kind/${MATERIAL_ATLAS.columns}.));vec2 uv=fract(plane);col*=texture2D(uMaterials,(cell+vec2(.008)+uv*.984)/vec2(${MATERIAL_ATLAS.columns}.,${MATERIAL_ATLAS.rows}.)).rgb*1.08;}
            if(abs(vUV.x-(${glassStyle}.))<.5){float f=pow(1.-abs(dot(normalize(vNormal),normalize(uEye-vWorld))),3.);col=mix(col,vec3(.52,.64,.66),.12+f*.3);}
            float shade=sfShadow(vShadow,.0006);col*=1.-shade*.23;
            if(abs(vUV.x+1.05)<.025){float ambient=clamp(vUV.y,0.,1.),f=pow(1.-abs(dot(normalize(vNormal),normalize(uEye-vWorld))),3.);col=mix(vColor*.89,vColor*vec3(1.03,1.,.96)+vec3(.11,.085,.045),ambient);col+=vec3(.12,.17,.18)*f*.16;}
            bool emissive=vUV.x> -1.3&&vUV.x< -1.1;
            if(emissive){float facing=abs(dot(normalize(vNormal),normalize(uEye-vWorld)));vec3 lit=mix(vColor*vec3(1.,.94,.84),vec3(1.,.98,.87),pow(facing,2.)*.62);col=mix(col,lit,clamp(vUV.y,0.,1.));}
            else if(vUV.x> -1.5&&vUV.x< -1.3){vec3 halfVector=normalize(normalize(uEye-vWorld)+normalize(vec3(-.5,.9,.35)));float shine=pow(max(dot(normalize(vNormal),halfVector),0.),44.);col+=vec3(.98,.93,.78)*shine*vUV.y*(1.-shade*.7);}
            float luminance=dot(col,vec3(.2126,.7152,.0722));col=mix(vec3(luminance),col,1.12);float fog=smoothstep(50.,115.,vDistance);gl_FragColor=vec4(mix(col,vec3(.59,.72,.74),fog*.7),1.);}`));
        gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
        program.position=gl.getAttribLocation(program,'aPosition');program.normal=gl.getAttribLocation(program,'aNormal');program.color=gl.getAttribLocation(program,'aColor');program.uv=gl.getAttribLocation(program,'aUV');program.vp=gl.getUniformLocation(program,'uVP');program.eye=gl.getUniformLocation(program,'uEye');program.focus=gl.getUniformLocation(program,'uFocus');program.light=gl.getUniformLocation(program,'uLightVP');program.shadows=gl.getUniformLocation(program,'uShadows');program.time=gl.getUniformLocation(program,'uTime');program.glassPass=gl.getUniformLocation(program,'uGlassPass');gl.uniform1i(gl.getUniformLocation(program,'uAtlas'),0);gl.uniform1i(gl.getUniformLocation(program,'uShadowMap'),1);gl.uniform1i(gl.getUniformLocation(program,'uMaterials'),2);for(const [i,name] of ['uAlpineSnow','uAlpineGroom','uAlpineRock','uAlpineForest'].entries())gl.uniform1i(gl.getUniformLocation(program,name),3+i);
        gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(.56,.7,.73,1);
        const names=signNames();
        atlasTexture=createSignTexture(gl,names,signs,{preserveCase:[...RESTAURANTS.map(r=>r.name),'California high-speed rail'],artwork:[...BILLBOARD_ART,...RESEARCH_ART],billboardController:signTextureControls,revealed:playerLook.sunglasses});
        materialState=createMaterialTexture(gl);materialTexture=materialState.texture;alpineState=createAlpineTexture(gl);alpineTextures=alpineState.textures;dynamicGPU={buffer:gl.createBuffer(),count:0};glassGPU={buffer:gl.createBuffer(),count:0};initShadows(compile);lampGlow=createLampGlow(gl);
        if(built){lampGlow.setLights(streetLights,terrainHeight);gpuStats.triangles+=lampGlow.stats.triangles;}
    }
    function upload(mesh,{spatial=false}={}){const data=new Float32Array(mesh.data);if(headless){mesh.data=data;return {count:data.length/11};}const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);const packed=spatial?packStaticMesh(data):{data,batches:null};gl.bufferData(gl.ARRAY_BUFFER,packed.data,gl.STATIC_DRAW);mesh.data=data;gpuStats.triangles+=data.length/33;return {buffer,count:data.length/11,glass:meshGlassTriangles(packed.data),batches:packed.batches};}
    function drawGPU(gpu,start=0,count=gpu.count){if(!count)return;if(program.glassPass&&!drawingGlass&&gpu.glass?.length)glazing.collect(gpu,start,count);gl.bindBuffer(gl.ARRAY_BUFFER,gpu.buffer);for(const [location,size,offset] of [[program.position,3,0],[program.normal,3,12],[program.color,3,24],[program.uv,2,36]]){if(location>=0){gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,size,gl.FLOAT,false,44,offset);}}if(gpu.batches&&program!==shadowProgram&&start===0&&count===gpu.count){for(const batch of gpu.batches)if(batchInFrustum(batch,camera.matrix)){gl.drawArrays(gl.TRIANGLES,batch.start,batch.count);gpuStats.drawCalls++;}}else{gl.drawArrays(gl.TRIANGLES,start,count);gpuStats.drawCalls++;}}
    function drawGlazing(){
        const data=glazing.data(camera.eye);if(!data.length)return;
        gl.bindBuffer(gl.ARRAY_BUFFER,glassGPU.buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);glassGPU.count=data.length/11;
        drawingGlass=true;gl.uniform1f(program.glassPass,1);gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
        drawGPU(glassGPU);gl.depthMask(true);gl.disable(gl.BLEND);gl.uniform1f(program.glassPass,0);drawingGlass=false;
    }
    function initShadows(compile){
        const eye=[-20*MAP_SCALE,90,70*MAP_SCALE],target=[N/2,0,N/2],b=unit(sub(eye,target)),r=unit(cross([0,1,0],b)),u=cross(b,r);
        const view=new Float32Array([r[0],u[0],b[0],0,r[1],u[1],b[1],0,r[2],u[2],b[2],0,-dot(r,eye),-dot(u,eye),-dot(b,eye),1]),ortho=new Float32Array([1/(55*MAP_SCALE),0,0,0,0,1/(55*MAP_SCALE),0,0,0,0,-2/199,0,0,0,-201/199,1]);shadowMatrix=matrixMultiply(ortho,view);shadowRoom=undefined;
        gl.activeTexture(gl.TEXTURE1);shadowTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,shadowTexture);
        if(!gl.getExtension('WEBGL_depth_texture')){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));shadowFramebuffer=null;}
        else{
            gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT,SHADOW_SIZE,SHADOW_SIZE,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_SHORT,null);
            shadowFramebuffer=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFramebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,shadowTexture,0);
            const color=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,color);gl.renderbufferStorage(gl.RENDERBUFFER,gl.RGBA4,SHADOW_SIZE,SHADOW_SIZE);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.RENDERBUFFER,color);
            if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)shadowFramebuffer=null;
        }
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.activeTexture(gl.TEXTURE0);
        shadowProgram=gl.createProgram();gl.attachShader(shadowProgram,compile(gl.VERTEX_SHADER,'attribute vec3 aPosition;attribute vec2 aUV;uniform mat4 uVP;varying float vGlass;void main(){vGlass=abs(aUV.x-('+GLASS_UV+'))<.015?1.:0.;gl_Position=uVP*vec4(aPosition,1.);}'));gl.attachShader(shadowProgram,compile(gl.FRAGMENT_SHADER,'precision mediump float;varying float vGlass;void main(){if(vGlass>.5)discard;gl_FragColor=vec4(1.);}'));gl.linkProgram(shadowProgram);
        Object.assign(shadowProgram,{position:gl.getAttribLocation(shadowProgram,'aPosition'),normal:-1,color:-1,uv:gl.getAttribLocation(shadowProgram,'aUV'),vp:gl.getUniformLocation(shadowProgram,'uVP')});
    }
    function drawBuildings(){
        const room=activeInstituteRoom();
        for(const o of buildingModels){
            if(o.researchRoom){
                o.cutaway=o.researchRoom===room;const hidden=instituteHiddenSections(o.researchRoom,o.sections,camera.eye,o.cutaway);
                if(!o.cutaway){drawGPU(o.gpu);continue;}
                for(const part of o.sections)if(!hidden.includes(part))drawGPU(o.gpu,part.start,part.count);
                continue;
            }
            o.cutaway=o.place===currentInterior;o.hiddenWalls=o.cutaway?cutawayWallMask(o,camera.eye):0;
            drawGPU(o.gpu,o.permanent.start,o.permanent.count);for(const wall of o.walls)if(!o.cutaway||!(o.hiddenWalls&(1<<wall.side)))drawGPU(o.gpu,wall.start,wall.count);if(!o.cutaway)drawGPU(o.gpu,o.roof.start,o.roof.count);drawGPU(o.gpu,o.extras.start,o.extras.count);
        }
    }
    function renderShadows(){
        const room=activeInstituteRoom(),key=currentInterior?currentInterior.id+':'+cutawayWallMask(currentInterior,camera.eye):room?room.id+':'+instituteHiddenSections(room,room.object.sections,camera.eye,true).map(p=>p.side??'roof').join(','):'outside';if(!shadowFramebuffer||shadowRoom===key)return;shadowRoom=key;
        const main=program;program=shadowProgram;gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFramebuffer);gl.viewport(0,0,SHADOW_SIZE,SHADOW_SIZE);gl.clear(gl.DEPTH_BUFFER_BIT|gl.COLOR_BUFFER_BIT);gl.useProgram(program);gl.uniformMatrix4fv(program.vp,false,shadowMatrix);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,1);drawGPU(groundGPU);drawGPU(sceneGPU);drawBuildings();gl.disable(gl.POLYGON_OFFSET_FILL);gl.bindFramebuffer(gl.FRAMEBUFFER,null);program=main;
    }
    function updateCamera(){
        const angle=Math.PI/4+camera.yaw,sa=Math.sin(angle),ca=Math.cos(angle),sp=Math.sin(camera.pitch),cp=Math.cos(camera.pitch),distance=27/zoom;
        camera.right=[ca,0,-sa];camera.up=[-sa*sp,cp,-ca*sp];camera.back=[sa*cp,sp,ca*cp];camera.target=[player.x+.5,playerGround()+(surf.state.riding&&surf.state.mode==='surf'?.23+.67*waveSurf.pose.stand:rocket.state.active?ROCKET_RIDER_CENTER:.9),player.y+.5];camera.eye=camera.target.map((v,i)=>v+camera.back[i]*distance);
        let focalScale=1;
        if(nearTahoe(player.x+.5,player.y+.5,360)){
            const fit=fitTahoeCamera(camera.target,camera.back,distance,camera.terrainRise||0);camera.terrainRise=fit.rise;camera.eye=fit.eye;focalScale=fit.focalScale;
            camera.back=unit(sub(camera.eye,camera.target));camera.right=unit([camera.back[2],0,-camera.back[0]]);camera.up=cross(camera.back,camera.right);
        }else camera.terrainRise=0;
        const r=camera.right,u=camera.up,b=camera.back,e=camera.eye,view=new Float32Array([r[0],u[0],b[0],0,r[1],u[1],b[1],0,r[2],u[2],b[2],0,-dot(r,e),-dot(u,e),-dot(b,e),1]);
        camera.tan=Math.tan(Math.PI*34/360)*focalScale;const f=1/camera.tan,near=.15,far=850,proj=new Float32Array([f/(width/height),0,0,0,0,f,0,0,0,0,-(far+near)/(far-near),-1,0,0,-2*far*near/(far-near),0]);camera.matrix=matrixMultiply(proj,view);
    }
    function project(x,y,z){const p=[x,y,z,1],m=camera.matrix,v=[0,0,0,0];for(let r=0;r<4;r++)for(let c=0;c<4;c++)v[r]+=m[c*4+r]*p[c];return {x:(v[0]/v[3]+1)*width/2,y:(1-v[1]/v[3])*height/2,depth:v[2]/v[3],distance:v[3]};}
    function setCamera(yaw=camera.yaw,pitch=camera.pitch){camera.yaw=Math.atan2(Math.sin(yaw),Math.cos(yaw));camera.pitch=Math.max(Math.PI*24/180,Math.min(Math.PI*65/180,pitch));camera.cos=Math.cos(camera.yaw);camera.sin=Math.sin(camera.yaw);camera.version++;hovered=null;$('sf-hover').hidden=true;updateCamera();drawMini();}
    function setZoom(value){zoom=Math.max(.55,Math.min(6.5,value));const slider=$('sf-zoom-slider');slider.value=String(Math.round(zoom*100));slider.setAttribute('aria-valuetext',Math.round(zoom*100)+'% zoom');updateCamera();}
    function resize(){width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,1.5);for(const c of [canvas]){c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);c.style.width=width+'px';c.style.height=height+'px';}if(width<600&&zoom===1)setZoom(.8);closeMenu();updateCamera();if(active&&built)render(performance.now(),0);}
    let heights=null,naturalHeights=null;
    function rawHeight(x,z){
        const land=insidePolygon(x,z,COAST);
        let coast=Infinity;for(let i=1;i<COAST.length;i++)coast=Math.min(coast,distanceToSegment(x,z,COAST[i-1],COAST[i]));
        if(!land)return coast<.6?.35:-.65;
        // Relief scales independently of map size; fade it into the shoreline.
        const shoulder=1.8+1.4*Math.exp(-(((x-72)/14)**2+((z-24)/12)**2)),shore=Math.min(1,coast/shoulder),grade=shore*shore*(3-2*shore);
        let y=.35+(sfElevation(x/MAP_SCALE,z/MAP_SCALE)-.35)*grade;
        for(const lake of lakes){const d=((x-lake.x)/lake.rx)**2+((z-lake.z)/lake.rz)**2;if(d<1.15)y=Math.min(y,lake.level-.3*Math.min(1,(1.15-d)*5));}
        return y;
    }
    const lakes=[];
    function buildHeightField(){
        for(const [x,z,rx,rz] of [[POND.x,POND.y,POND.rx,POND.ry],[PALACE_LAGOON.x,PALACE_LAGOON.y,PALACE_LAGOON.rx,PALACE_LAGOON.ry],[16,56,1.7,2.7].map(mapPosition),[18.5,58.3,1.7,2.2].map(mapPosition)])lakes.push({x,z,rx,rz,level:rawHeight(x,z)+.015});
        // Merced's connected lobes share one surface instead of overlapping discs.
        lakes[2].level=lakes[3].level=Math.min(lakes[2].level,lakes[3].level);
        heights=Array.from({length:TERRAIN_GRID+1},(_,z)=>Array.from({length:TERRAIN_GRID+1},(_,x)=>rawHeight(x/TERRAIN_RES,z/TERRAIN_RES)));
        // Ease the road into the peninsula's level ground, without an elevated
        // walkway or a height discontinuity at the edge of the city grid.
        for(let z=(N-2)*TERRAIN_RES;z<=TERRAIN_GRID;z++)for(let x=0;x<=TERRAIN_GRID;x++){
            const distance=airportRoadDistance(x/TERRAIN_RES,z/TERRAIN_RES);
            if(distance>TILE_CONFIG.curbWidth+.6)continue;
            const t=(z/TERRAIN_RES-(N-2))/2,collar=Math.max(0,Math.min(1,(distance-TILE_CONFIG.curbWidth)/.6)),weight=t*t*(3-2*t)*(1-collar*collar*(3-2*collar));
            heights[z][x]+=(AIRSHIP_TERMINAL.base-heights[z][x])*weight;
        }
        const fulton=streets.find(r=>r.name==='Fulton Street');
        gradeStreetHeightField(heights,TERRAIN_RES,{points:fulton.points,halfWidth:fulton.w,curbWidth:TILE_CONFIG.curbWidth,contains:(x,z)=>insidePolygon(x,z,COAST)});
        naturalHeights=heights.map(row=>row.slice());
    }
    function terrainHeight(x,z){if(countryside?.contains(x,z))return countryside.height(x,z);if(marinLand?.onLand(x,z))return marinLand.height(x,z);return esotericCampus?.contains(x,z)?esotericCampus.ground(x,z):sampleTerrain(heights,x,z);}
    function airportSurfaceHeight(x,z){return southernTerrain?.contains(x,z)?southernTerrain.height(x,z):AIRSHIP_TERMINAL.base;}
    function airportWalkingHeight(x,z){if(inTimesSquare(x,z))return TIMES_SQUARE.base+Math.max(.012,TILE_TYPES[airportSurfaceTypeAt(x,z)]?.height||0)+.008;if(gymAccess(x,z))return SF_FITNESS.base+.04;if(nightclub&&nightlifeAccess(x,z)&&nightlifeWalkable(x,z))return nightlifeHeight(x,z,nightclub.base,terrainHeight);return airportSurfaceHeight(x,z)+(onAirportApron(x,z)?.03:(TILE_TYPES[airportSurfaceTypeAt(x,z)]?.height||0)+.008);}
    function characterGround(x,z){
        if(secretWorld?.kind==='illuminati')return ILLUMINATI_CAVE.floor+.025;
        const institute=instituteRoomAt(x,z);if(institute)return institute.base+INSTITUTE_FLOOR_HEIGHT;
        if(gymAccess(x,z))return SF_FITNESS.base+.065;
        if(nightclub&&nightlifeAccess(x,z)&&nightlifeWalkable(x,z))return nightlifeHeight(x,z,nightclub.base,terrainHeight)+.025;
        if(esotericCampus?.contains(x,z))return esotericCampus.ground(x,z);
        const road=goldenGate?.at(x,z)||regionalRoad?.at(x,z);if(road)return road.height+.015;
        if(tahoe.contains(x,z))return tahoeHeight(x,z)+.04;
        if(z>=N&&airship.contains(x,z))return airportWalkingHeight(x,z);
        const type=surfaceTypeAt(x,z);
        if(type==='building'){
            const room=placeAt(x-.5,z-.5);
            if(room){const [u,v]=buildingPoint(room,x,z,true),rug=u>room.x+.6&&u<room.x+room.w-.6&&v>room.y+.5&&v<room.y+room.d-.5;return room.object.base+(rug?.09:.035);}
        }
        return terrainHeight(x,z)+(TILE_TYPES[type]?.height||0)+.008;
    }
    function playerGround(ignoreCustody=false){
        if(tabletService?.state.active)return tabletService.state.pose.position.y;
        if(secretWorld?.bomber.state.active)return secretWorld.bomber.state.position.y;
        if(secretWorld?.kind==='illuminati')return ILLUMINATI_CAVE.floor+.025;
        if(multiplayerWorld?.traversing)return multiplayerWorld.ground;
        if(expeditions.ship.aboard)return PEQUOD.deck+Math.sin(expeditions.state.clock*1.4)*.035;
        if(capture.state.active)return capture.state.base;
        if(chase?.state.jailed&&!ignoreCustody)return detention.base+.18;
        if(rocket.state.active)return rocket.state.position.y;
        if(tahoe.state.mode!=='ground')return tahoe.state.position.y;
        if(rope.climbing)return rope.state.position.y;
        if(sutroClimb.state.active)return sutroClimb.state.position.y;
        if(flying())return airship.state.position.y+AIRSHIP_BASKET.floor;
        if(ferrari?.state.riding)return ferrari.position.y;
        if(training)return SF_FITNESS.base;
        if(surf.state.riding)return .06+(surf.state.mode==='surf'?waveSurf.pose.height:surf.state.jump?.height||0);
        const x=player.x+.5,z=player.y+.5,institute=instituteRoomAt(x,z);if(institute)return institute.base+INSTITUTE_FLOOR_HEIGHT;
        if(gymAccess(x,z))return SF_FITNESS.base+.065;if(esotericCampus?.contains(x,z))return esotericCampus.ground(x,z);const road=goldenGate?.at(x,z)||regionalRoad?.at(x,z);if(road)return road.height+.015;
        if(tahoe.contains(x,z))return tahoeHeight(x,z);
        if(z>=N&&airship.contains(x,z))return airportWalkingHeight(x,z);
        return terrainHeight(x,z);
    }
    function naturalHeight(x,z){return southernTerrain?.contains(x,z)?southernTerrain.naturalHeight(x,z):sampleTerrain(naturalHeights,x,z);}
    function protectPublicGroundVertex(x,z){
        const m=worldTiles;if(!m)return false;
        const ix=Math.round(x/m.step),iz=Math.round(z/m.step);
        for(const dx of [-1,0])for(const dz of [-1,0]){
            const xx=ix+dx,zz=iz+dz;if(xx<0||zz<0||xx>=m.size||zz>=m.size)continue;
            const t=m.tiles[zz*m.size+xx];if(t&&(t.areas.road||t.areas.path||t.areas.sidewalk))return true;
        }
        return false;
    }
    function cutHousePlot(pad){cutBuildingPlot(heights,TERRAIN_RES,pad,{protect:protectPublicGroundVertex});if(southernTerrain&&pad.cz+Math.hypot(pad.w,pad.d)/2>=N)southernTerrain.cutPlot(pad);}
    function sampleTerrain(field,x,z){
        if(!field)return 1.15;
        if(x<0||z<0||x>=N||z>=N)return southernTerrain?.contains(x,z)?southernTerrain.height(x,z):inRailPit(x,z)?RAIL_PIT.floor:z>=SOUTHERN_BOUNDS.north&&z<=SOUTHERN_BOUNDS.south&&x>=SOUTHERN_BOUNDS.west&&x<=SOUTHERN_BOUNDS.east?1.15:regionalGroundHeight(x,z);
        const ix=Math.floor(x*TERRAIN_RES),iz=Math.floor(z*TERRAIN_RES),u=x*TERRAIN_RES-ix,v=z*TERRAIN_RES-iz,a=field[iz][ix],b=field[iz][ix+1],c=field[iz+1][ix+1],d=field[iz+1][ix];return u>=v?a+(b-a)*u+(c-b)*v:a+(c-d)*u+(d-a)*v;
    }
    const terrainPads=[];
    function levelTerrainPad(cx,cz,w,d,angle=0,height=terrainHeight(cx,cz)){
        const pad={cx,cz,w,d,angle,height};
        const result=levelHeightField(heights,TERRAIN_RES,pad,{protect:protectPublicGroundVertex});terrainPads.push({...pad,...result});
        return height;
    }
    function groundPoint(x,z,offset=.025){return [x,terrainHeight(x,z)+offset,z];}
    function surfacePolygon(m,points,color,offset){
        const xs=points.map(p=>p[0]),zs=points.map(p=>p[1]);
        const clip=(polygon,a,b)=>{const out=[],side=p=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);for(let i=0;i<polygon.length;i++){const p=polygon[i],q=polygon[(i+1)%polygon.length],dp=side(p),dq=side(q);if(dp>=-1e-9)out.push(p);if((dp>=0)!==(dq>=0)){const t=dp/(dp-dq);out.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}}return out;};
        for(let iz=Math.floor(Math.min(...zs)*TERRAIN_RES);iz<=Math.floor(Math.max(...zs)*TERRAIN_RES);iz++)for(let ix=Math.floor(Math.min(...xs)*TERRAIN_RES);ix<=Math.floor(Math.max(...xs)*TERRAIN_RES);ix++)for(const tri of [[[ix/TERRAIN_RES,iz/TERRAIN_RES],[(ix+1)/TERRAIN_RES,iz/TERRAIN_RES],[(ix+1)/TERRAIN_RES,(iz+1)/TERRAIN_RES]],[[ix/TERRAIN_RES,iz/TERRAIN_RES],[(ix+1)/TERRAIN_RES,(iz+1)/TERRAIN_RES],[ix/TERRAIN_RES,(iz+1)/TERRAIN_RES]]]){
            let polygon=points;for(let i=0;i<3&&polygon.length;i++)polygon=clip(polygon,tri[i],tri[(i+1)%3]);
            if(polygon.length<3)continue;const cx=polygon.reduce((v,p)=>v+p[0],0)/polygon.length,cz=polygon.reduce((v,p)=>v+p[1],0)/polygon.length;if(!insidePolygon(cx,cz,COAST))continue;
            for(let i=1;i<polygon.length-1;i++)m.tri(groundPoint(...polygon[0],offset),groundPoint(...polygon[i+1],offset),groundPoint(...polygon[i],offset),color);
        }
    }
    function terrainRect(m,x,z,w,d,color,offset=.035){surfacePolygon(m,[[x,z],[x+w,z],[x+w,z+d],[x,z+d]],color,offset);}
    function terrainStrip(m,points,w,color,offset=.04){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),nx=-dz/len*w,nz=dx/len*w;surfacePolygon(m,[[a[0]-nx,a[1]-nz],[b[0]-nx,b[1]-nz],[b[0]+nx,b[1]+nz],[a[0]+nx,a[1]+nz]],color,offset);}}
    function renderSurfaceTiles(m){
        const map=worldTiles;
        for(let z=0;z<map.size;z++)for(let x=0;x<map.size;x++){
            const t=map.tiles[z*map.size+x],wx=x*map.step,wz=z*map.step;if(t.type==='sea')continue;
            const stride=map.size+1,corners=[[0,0],[1,0],[1,1],[0,1]],polygon=t.type==='sidewalk'?corners.map(p=>{const k=(z+p[1])*stride+x+p[0],r=map.road[k],q=map.path[k];return [...p,r,q,Math.min(r,q)];}):corners,patches=t.patches||[{type:t.type,polygon}];
            for(const patch of patches){
                // Ocean fragments are covered by the continuous offshore surface.
                // Lakes use their shared level, never the terrain below the water.
                if(patch.type==='sea')continue;
                const material=TILE_TYPES[patch.type],wet=patch.type==='water',level=patch.level??t.waterLevel;
                const shade=patch.type==='grass'?Math.floor(rand(Math.floor(wx),Math.floor(wz))*5)-2:0,color=shade?tint(material.color,shade):material.color;
                const points=patch.polygon.map(p=>wet?[wx+p[0]*map.step,level,wz+p[1]*map.step]:groundPoint(wx+p[0]*map.step,wz+p[1]*map.step,material.height));
                for(let i=1;i<points.length-1;i++)m.tri(points[0],points[i+1],points[i],color,wet?{water:2}:material.texture?{material:material.texture,angle:t.frame||0}:null);
                if(patch.type==='sidewalk')for(let i=0;i<patch.polygon.length;i++){const a=patch.polygon[i],b=patch.polygon[(i+1)%patch.polygon.length],roadEdge=(Math.abs(a[2])<1e-6&&Math.abs(b[2])<1e-6)||(Math.abs(a[3])<1e-6&&Math.abs(b[3])<1e-6),outer=Math.abs(a[4]-TILE_CONFIG.curbWidth)<1e-6&&Math.abs(b[4]-TILE_CONFIG.curbWidth)<1e-6;if(!roadEdge&&!outer)continue;const bottom=roadEdge?TILE_TYPES.road.height:TILE_TYPES[t.base].height,ax=wx+a[0]*map.step,az=wz+a[1]*map.step,bx=wx+b[0]*map.step,bz=wz+b[1]*map.step;m.quad(groundPoint(ax,az,bottom),groundPoint(bx,bz,bottom),groundPoint(bx,bz,material.height),groundPoint(ax,az,material.height),'#aaa58f');}
            }
        }
    }
    function makeTerrain(){
        const m=new Mesh();
        renderSurfaceTiles(m);
        southernTerrain.drawLand(m);
        marinLand.draw(m);
        for(const [p,q] of shorelineSegments(COAST,1/TERRAIN_RES)){if(Math.min(p[1],q[1])>=N-1e-8)continue;m.quad([p[0],-.25,p[1]],[q[0],-.25,q[1]],[q[0],terrainHeight(...q)+.02,q[1]],[p[0],terrainHeight(...p)+.02,p[1]],'#9c9d87','stone');}
        seaBounds=createSeaSurface(m,[{polygon:sailingCoast,width:2.8},{polygon:MARIN,width:2.2}]);decorateHeadlands(m,MARIN,MAP_SCALE);
        drawCoastalRocks(m,createCoastalRocks(),terrainHeight,(x,z)=>z>=N?southernTerrain.contains(x,z):insidePolygon(x,z,COAST));
        // Rails are details contained inside Market Street's merged road surface.
        for(const shift of [-.18,.18]){const p=market.route||market.points,rail=p.map((v,i)=>{const a=p[Math.max(0,i-1)],b=p[Math.min(p.length-1,i+1)],len=Math.hypot(b[0]-a[0],b[1]-a[1])||1;return [v[0]-(b[1]-a[1])/len*shift,v[1]+(b[0]-a[0])/len*shift];});terrainStrip(m,rail,.018,'#424e49',.028);}
        detailedGround(m);

        groundMesh=m;groundGPU=upload(m,{spatial:true});
    }
    const cityParcels=[],publicSpaces=[],parcelBins=new Map();
    const rectangle=(cx,cz,w,d,angle=0)=>[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([x,z])=>[cx+x*Math.cos(angle)-z*Math.sin(angle),cz+x*Math.sin(angle)+z*Math.cos(angle)]);
    const polygonBounds=p=>({x:Math.min(...p.map(v=>v[0])),z:Math.min(...p.map(v=>v[1])),right:Math.max(...p.map(v=>v[0])),bottom:Math.max(...p.map(v=>v[1]))});
    const objectFootprint=o=>o.footprint||rectangle(o.x+o.w/2,o.y+o.d/2,o.w,o.d);
    function parcelNeighbors(poly){const b=polygonBounds(poly),found=new Set();for(let z=Math.floor(b.z/3);z<=Math.floor(b.bottom/3);z++)for(let x=Math.floor(b.x/3);x<=Math.floor(b.right/3);x++)for(const p of parcelBins.get(x+','+z)||[])found.add(p);return found;}
    function claimParcel(p){cityParcels.push(p);const b=polygonBounds(p.polygon);for(let z=Math.floor(b.z/3);z<=Math.floor(b.bottom/3);z++)for(let x=Math.floor(b.x/3);x<=Math.floor(b.right/3);x++){const key=x+','+z;if(!parcelBins.has(key))parcelBins.set(key,[]);parcelBins.get(key).push(p);}return p;}
    function parcelFits(poly,{park=false,ignore=null}={}){
        const b=polygonBounds(poly),m=worldTiles;if(b.x<0||b.z<0||b.right>N||b.bottom>N)return false;
        for(const p of parcelNeighbors(poly))if(p!==ignore&&tilePolygonOverlap(poly,p.polygon)>1e-6)return false;
        for(let z=Math.max(0,Math.floor(b.z/m.step));z<Math.min(m.size,Math.ceil(b.bottom/m.step));z++)for(let x=Math.max(0,Math.floor(b.x/m.step));x<Math.min(m.size,Math.ceil(b.right/m.step));x++){
            const wx=x*m.step,wz=z*m.step,t=m.tiles[z*m.size+x],cell=[[wx,wz],[wx+m.step,wz],[wx+m.step,wz+m.step],[wx,wz+m.step]];
            if(tilePolygonOverlap(poly,cell)<1e-7)continue;
            if(t.base==='sea'||t.base==='water'||!park&&greenArea(wx+m.step/2,wz+m.step/2))return false;
            if(!((t.areas.road||0)+(t.areas.path||0)+(t.areas.sidewalk||0)))continue;
            if(!t.patches)return false;
            for(const patch of t.patches)if(['road','path','sidewalk'].includes(patch.type)&&tilePolygonOverlap(poly,patch.polygon.map(v=>[wx+v[0]*m.step,wz+v[1]*m.step]))>1e-7)return false;
        }return true;
    }
    function moveObject(o,dx,dz){
        const dy=terrainHeight(o.x+o.w/2+dx,o.y+o.d/2+dz)-terrainHeight(o.x+o.w/2,o.y+o.d/2);
        for(let v=o.start*11;v<(o.start+o.count)*11;v+=11){o.mesh.data[v]+=dx;o.mesh.data[v+1]+=dy;o.mesh.data[v+2]+=dz;}
        o.x+=dx;o.y+=dz;o.base+=dy;for(const p of [o.lo,o.hi]){p[0]+=dx;p[1]+=dy;p[2]+=dz;}if(o.footprint)o.footprint=o.footprint.map(p=>[p[0]+dx,p[1]+dz]);
    }
    function fitLandmarksToBlocks(){
        const groups=new Map();for(const o of objects)if(o.arch||o.solid){const key=o.sight?.id||o;if(key==='nia')continue;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);}
        for(const [key,solid] of groups){
            const group=typeof key==='string'?objects.filter(o=>o.sight?.id===key):solid;let offset=null;
            if(group.some(o=>o.pinned)){for(const o of solid)claimParcel({polygon:objectFootprint(o),kind:'landmark',object:o});continue;}
            search:for(let r=0;r<=32;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){
                if(r&&Math.abs(dx)!==r&&Math.abs(dz)!==r)continue;
                if(key==='salesforce'&&solid.some(o=>marketSide((o.x+o.w/2+dx*.25)/MAP_SCALE,(o.y+o.d/2+dz*.25)/MAP_SCALE)<2.5))continue;
                if(solid.every(o=>parcelFits(objectFootprint(o).map(p=>[p[0]+dx*.25,p[1]+dz*.25]),{park:true}))){offset=[dx*.25,dz*.25];break search;}
            }
            if(!offset)throw new Error('No planned landmark site for '+(typeof key==='string'?key:'building'));
            for(const o of group)moveObject(o,...offset);
            for(const o of solid)if(o.arch!=='townhomes'&&!o.preserveGround)levelTerrainPad(o.x+o.w/2,o.y+o.d/2,o.w,o.d,o.rotation||0,o.base-(o.arch?.025:0));
            for(const o of solid)claimParcel({polygon:objectFootprint(o),kind:'landmark',object:o});
            if(key==='cityhall'){
                const hall=solid[0],forecourt=rectangle(hall.x+hall.w/2,hall.y+hall.d+.65,hall.w-.1,1.3);
                if(parcelFits(forecourt,{park:true})){publicSpaces.push(forecourt);claimParcel({polygon:forecourt,kind:'civic forecourt'});}
            }
            if(typeof key==='string'){const s=sightById(key);if(s){s.entry.x+=offset[0];s.entry.y+=offset[1];if(s.mapPoint){s.mapPoint.x+=offset[0];s.mapPoint.y+=offset[1];}}}
        }
    }
    function reserveBridgeApproach(){
        const a=DOWNTOWN.bridge.rampStart.map(mapPosition),b=DOWNTOWN.bridge.abutment.map(mapPosition),cx=(a[0]+b[0])/2,cz=(a[1]+b[1])/2,length=Math.hypot(b[0]-a[0],b[1]-a[1]);
        const polygon=rectangle(cx,cz,length+1,1.65,Math.atan2(b[1]-a[1],b[0]-a[0])),object=objects.find(o=>o.sight?.id==='baybridge');
        publicSpaces.push(polygon);claimParcel({polygon,kind:'bridge approach',object});
    }
    function buildingPoint(p,x,z,inverse=false){const a=(p.rotation||0)*(inverse?-1:1),cx=p.x+p.w/2,cz=p.y+p.d/2,dx=x-cx,dz=z-cz;return [cx+dx*Math.cos(a)-dz*Math.sin(a),cz+dx*Math.sin(a)+dz*Math.cos(a)];}
    function planContentBuildings(){
        for(const p of places){
            const target=[p.x+p.w/2,p.y+p.d/2];let best=null,score=Infinity;
            for(const r of worldTiles.routes)if(r.kind==='road'&&(p.id!=='links'||r.name==='Market Street')){
                const [a,b]=r.points,dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),ux=dx/length,uz=dz/length,at=Math.max(0,Math.min(length,(target[0]-a[0])*ux+(target[1]-a[1])*uz));
                for(const side of [-1,1])for(let step=-24;step<=24;step++){
                    const t=Math.max(p.w/2,Math.min(length-p.w/2,at+step*.25));if(length<p.w+.5)continue;
                    const nx=-uz*side,nz=ux*side,offset=r.halfWidth+TILE_CONFIG.curbWidth+.18+p.d/2,cx=a[0]+ux*t+nx*offset,cz=a[1]+uz*t+nz*offset,angle=Math.atan2(nx,-nz),poly=rectangle(cx,cz,p.w,p.d,angle),distance=(cx-target[0])**2+(cz-target[1])**2;
                    if(p.id==='ai-lab'&&(marketSide(cx/MAP_SCALE,cz/MAP_SCALE)<=0||cz>mapPosition(40)||cx<mapPosition(43)))continue;
                    if(distance>=score||!parcelFits(poly))continue;score=distance;best={cx,cz,angle,poly};
                }
            }
            if(!best)throw new Error('No curb-facing site for '+p.name);
            p.x=best.cx-p.w/2;p.y=best.cz-p.d/2;p.rotation=best.angle;p.footprint=best.poly;p.localDoor=p.x+(p.w-1)/2;
            const inside=buildingPoint(p,p.x+p.w/2,p.y+p.d-.7),entry=buildingPoint(p,p.x+p.w/2,p.y+p.d+.65);
            p.inside={x:inside[0]-.5,y:inside[1]-.5};p.entry={x:entry[0]-.5,y:entry[1]-.5};
            claimParcel({polygon:best.poly,kind:'destination',place:p});
            // Doorways have short, deliberate public approaches, never vacant lots.
            const forecourt=rectangle(...buildingPoint(p,p.x+p.w/2,p.y+p.d+.3),1.2,.6,p.rotation);publicSpaces.push(forecourt);claimParcel({polygon:forecourt,kind:'entrance'});
            levelTerrainPad(best.cx,best.cz,p.w,p.d,p.rotation);
            makeBuilding(p,true);
        }
    }
    const restaurantDiners=[],restaurantSites=[];
    function planRestaurants(){
        for(const definition of RESTAURANTS){
            const target=definition.target.map(mapPosition),width=definition.w,depth=definition.d+definition.patioDepth;let best=null,score=Infinity;
            for(const r of worldTiles.routes)if(r.kind==='road'&&(definition.id!=='rich-table'||['Oak Street','Van Ness Avenue','Fell Street'].includes(r.name))){
                const [a,b]=r.points,dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),ux=dx/length,uz=dz/length;
                if(length<width+.4)continue;
                const at=Math.max(0,Math.min(length,(target[0]-a[0])*ux+(target[1]-a[1])*uz));
                for(const side of [-1,1])for(let step=-64;step<=64;step++){
                    const t=Math.max(width/2,Math.min(length-width/2,at+step*.125)),nx=-uz*side,nz=ux*side,offset=r.halfWidth+TILE_CONFIG.curbWidth+.18+depth/2;
                    const cx=a[0]+ux*t+nx*offset,cz=a[1]+uz*t+nz*offset,angle=Math.atan2(nx,-nz),polygon=rectangle(cx,cz,width,depth,angle),distance=(cx-target[0])**2+(cz-target[1])**2;
                    const bodyX=cx+nx*definition.patioDepth/2,bodyZ=cz+nz*definition.patioDepth/2;
                    if(definition.id==='rich-table'&&(bodyX<mapPosition(PANHANDLE.east+.25)||bodyZ<mapPosition(PANHANDLE.south)||bodyX>mapPosition(44)||bodyZ>mapPosition(37)||marketSide(bodyX/MAP_SCALE,bodyZ/MAP_SCALE)>=0))continue;
                    if(distance>=score||!parcelFits(polygon))continue;score=distance;best={cx,cz,nx,nz,angle,polygon,street:r.name};
                }
            }
            if(!best||score>144)throw new Error('No nearby curb-facing restaurant plot for '+definition.label);
            const cx=best.cx+best.nx*definition.patioDepth/2,cz=best.cz+best.nz*definition.patioDepth/2;
            const sight=sightById(definition.id),site={...definition,x:cx-definition.w/2,y:cz-definition.d/2,rotation:best.angle,footprint:rectangle(cx,cz,definition.w,definition.d,best.angle),sight,street:best.street};
            if(definition.id==='rich-table')site.localDoor=site.x+.14;
            const parcel=claimParcel({polygon:best.polygon,kind:'restaurant'});
            levelTerrainPad(best.cx,best.cz,width,depth,best.angle);
            site.object=makeBuilding(site);parcel.object=site.object;
            const patio=makeRestaurantPatio(site);sight.object=site.object;site.tables=patio.tables;restaurantDiners.push(...patio.diners);restaurantSites.push(site);
            const entry=restaurantPoint(site,definition.id==='rich-table'?-site.w/2+.38:0,site.d/2+site.patioDepth+.3);
            sight.x=cx-.5;sight.y=cz-.5;sight.entry={x:entry[0]-.5,y:entry[1]-.5};sight.mapPoint={x:cx,y:cz};sight.site=site;
        }
    }
    function protectLandmarkApproaches(){
        for(const s of sights)if(s.kind!=='bike'&&s.kind!=='guest'&&!s.approachReserved){
            s.approachReserved=true;const origin=[s.entry.x+.5,s.entry.y+.5];let nearest=null,best=Infinity;
            for(const r of worldTiles.routes){const [a,b]=r.points,dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((origin[0]-a[0])*dx+(origin[1]-a[1])*dz)/(dx*dx+dz*dz))),p=[a[0]+dx*t,a[1]+dz*t],d=Math.hypot(p[0]-origin[0],p[1]-origin[1]);if(d<best){best=d;nearest=p;}}
            if(!nearest||best>7)continue;const middle=[(origin[0]+nearest[0])/2,(origin[1]+nearest[1])/2],angle=Math.atan2(nearest[1]-origin[1],nearest[0]-origin[0]),poly=rectangle(...middle,best+1,1,angle);
            publicSpaces.push(poly);claimParcel({polygon:poly,kind:'public approach'});
        }
    }
    let cityNavigation=null;
    function navFree(x,z){return !!cityNavigation?.free(x-.5,z-.5);}
    function buildNavigation(){
        cityNavigation=buildTileNavigation(worldTiles,{obstacles:navigationObstacles(objects)});
        for(const p of places){p.inside=nearestNavigation(p.inside.x,p.inside.y,2,(x,y)=>placeAt(x,y)===p);p.entry=nearestNavigation(p.entry.x,p.entry.y,2);if(!p.inside||!p.entry)throw new Error('Blocked doorway: '+p.name);}
        const cafe=places.find(p=>p.id==='links');
        for(const s of sights)if(s.kind!=='bike'){const entry=nearestNavigation(s.entry.x,s.entry.y,4,(x,y)=>s.kind!=='guest'||placeAt(x,y)===cafe);if(entry)s.entry=entry;}
        const spawn=cafe.entry;camera.yaw=-cafe.rotation-Math.PI/4;camera.cos=Math.cos(camera.yaw);camera.sin=Math.sin(camera.yaw);player.x=spawn.x;player.y=spawn.y;bike.x=spawn.x+1;bike.y=spawn.y;
        const bikeSite=nearestNavigation(bike.x,bike.y,2);if(bikeSite){bike.x=bikeSite.x;bike.y=bikeSite.y;}
    }
    function nearestNavigation(x,y,radius=3,predicate=()=>true){return cityNavigation.nearest(x,y,radius,predicate);}
    function auditCityBlocks(){
        const map=worldTiles,missing=[];let eligible=0,backed=0,alignmentErrors=0;
        for(const p of cityParcels)if(p.kind==='housing'||p.kind==='shopfront'){
            const routes=map.routes.filter(r=>r.name===p.street),valid=routes.some(r=>{const [a,b]=r.points,angle=Math.atan2(b[1]-a[1],b[0]-a[0]);return Math.abs(Math.sin(p.rotation-angle))<1e-6;});if(!valid)alignmentErrors++;
        }
        for(const r of map.routes)if(r.kind==='road'){
            const [a,b]=r.points,length=Math.hypot(...sub2(b,a)),ux=(b[0]-a[0])/length,uz=(b[1]-a[1])/length;
            for(let t=.5;t<length;t+=.5)for(const side of [-1,1]){
                const nx=-uz*side,nz=ux*side,x=a[0]+ux*t+nx*(r.halfWidth+TILE_CONFIG.curbWidth+.15),z=a[1]+uz*t+nz*(r.halfWidth+TILE_CONFIG.curbWidth+.15),ix=Math.floor(x/map.step),iz=Math.floor(z/map.step),tile=map.tiles[iz*map.size+ix];
                if(!tile||['sea','water','grass','sand'].includes(tile.base)||(tile.areas.road||tile.areas.path||tile.areas.sidewalk)||publicSpaces.some(p=>insidePolygon(x,z,p)))continue;
                const nearby=[...parcelNeighbors(rectangle(x+nx*1.5,z+nz*1.5,6,6))].filter(p=>p.object||p.place);let hit=false,junction=false,landscape=false;
                for(let d=0;d<=3;d+=.125){const px=x+nx*d,pz=z+nz*d;if(nearby.some(p=>insidePolygon(px,pz,p.polygon))){hit=true;break;}if(d<1){const t=map.tiles[Math.floor(pz/map.step)*map.size+Math.floor(px/map.step)];if(t&&(t.areas.road||t.areas.path)){junction=true;break;}if(t&&['grass','sea','water','sand'].includes(t.base)){landscape=true;break;}}}
                if(junction||landscape)continue;eligible++;if(hit)backed++;else missing.push({street:r.name,x:+x.toFixed(2),z:+z.toFixed(2)});
            }
        }
        return {ok:alignmentErrors===0&&backed/eligible>=.9,eligible,backed,coverage:+(100*backed/eligible).toFixed(1),alignmentErrors,missing};
    }
    function balancedCurbDepth(r,t,side){
        const [a,b]=r.points,length=Math.hypot(...sub2(b,a)),ux=(b[0]-a[0])/length,uz=(b[1]-a[1])/length,nx=-uz*side,nz=ux*side,px=a[0]+ux*t,pz=a[1]+uz*t;let depth=3.25;
        for(const other of worldTiles.routes)if(other!==r&&other.kind==='road'){
            const [c,d]=other.points,len=Math.hypot(...sub2(d,c)),vx=(d[0]-c[0])/len,vz=(d[1]-c[1])/len;if(Math.abs(ux*vz-uz*vx)>1e-5)continue;
            const along=(px-c[0])*vx+(pz-c[1])*vz,gap=(c[0]-px)*nx+(c[1]-pz)*nz;if(along<-.1||along>len+.1||gap<1)continue;
            depth=Math.min(depth,(gap-r.halfWidth-other.halfWidth-2*TILE_CONFIG.curbWidth-.16)/2);
        }return Math.max(1.5,Math.floor(depth*4)/4);
    }
    function populateCity(){
        // Fill urban curbs in street order; Great Highway keeps an open
        // beachfront instead of a continuous row of houses.
        const rows=[];
        for(const r of worldTiles.routes)if(r.kind==='road'){
            if(r.name==='Great Highway')continue;
            const [a,b]=r.points,dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),ux=dx/length,uz=dz/length;
            for(const side of [-1,1]){
                const nx=-uz*side,nz=ux*side;
                const angle=Math.atan2(nx,-nz),curb=r.halfWidth+TILE_CONFIG.curbWidth+.08;let row=null,t=0;
                while(t<length-1){let found=null;const preferred=balancedCurbDepth(r,t+.75,side);
                    for(const width of [1.5,1.25]){for(const depth of [...new Set([preferred,Math.max(1.5,preferred-.5),1.5])]){
                        if(t+width>length)continue;const cx=a[0]+ux*(t+width/2)+nx*(curb+depth/2),cz=a[1]+uz*(t+width/2)+nz*(curb+depth/2),poly=rectangle(cx,cz,width,depth,angle);
                        if(parcelFits(poly)){found={cx,cz,width,depth,poly};break;}
                    }if(found)break;}
                    if(!found){row=null;t+=.25;continue;}
                    const parcel=claimParcel({polygon:found.poly,kind:'housing',street:r.name,rotation:angle});
                    if(row&&Math.abs(row.end-t)<1e-5&&row.depth===found.depth){row.end=t+found.width;row.parcels.push(parcel);}
                    else{row={a,ux,uz,nx,nz,angle,curb,start:t,end:t+found.width,depth:found.depth,parcels:[parcel]};rows.push(row);}
                    t+=found.width;
                }
            }
        }
        for(const r of rows){const width=r.end-r.start,cx=r.a[0]+r.ux*(r.start+width/2)+r.nx*(r.curb+r.depth/2),cz=r.a[1]+r.uz*(r.start+width/2)+r.nz*(r.curb+r.depth/2),o=makeTownhomeRow(cx-width/2,cz-r.depth/2,width,r.depth,2,rand(Math.round(cx),Math.round(cz),8),r.angle);for(const p of r.parcels)p.object=o;}
        // Close the short frontage gaps with shallow, single-story premises.
        for(const r of worldTiles.routes)if(r.kind==='road'){
            if(r.name==='Great Highway')continue;
            const [a,b]=r.points,length=Math.hypot(...sub2(b,a)),ux=(b[0]-a[0])/length,uz=(b[1]-a[1])/length;
            for(const side of [-1,1]){const nx=-uz*side,nz=ux*side;
                const angle=Math.atan2(nx,-nz),curb=r.halfWidth+TILE_CONFIG.curbWidth+.08;
                for(let t=0;t<length-.7;){let found=false;
                    for(const width of [1.25,1,.75,.5]){for(const depth of [1.5,1.25,1,.75]){
                        if(width*depth<.375||t+width>length)continue;const cx=a[0]+ux*(t+width/2)+nx*(curb+depth/2),cz=a[1]+uz*(t+width/2)+nz*(curb+depth/2),poly=rectangle(cx,cz,width,depth,angle);
                        if(!parcelFits(poly))continue;const o=makeCurbShop(cx,cz,width,depth,angle,rand(cx,cz,10));o.street=r.name;claimParcel({polygon:poly,kind:'shopfront',street:r.name,rotation:angle,object:o});t+=width;found=true;break;
                    }if(found)break;}if(!found)t+=.25;
                }
            }
        }
        protectLandmarkApproaches();
        // The narrow strip along the park's southern edge is a grove, never a
        // row of undersized houses. Small trunk footprints keep the path clear.
        for(let x=parkSouthEdge.west+.8,i=0;x<parkSouthEdge.east-.5;x+=1.65,i++){
            const z=parkSouthEdge.north+.25+rand(x,51,12)*.12;
            if(!parcelFits(rectangle(x,z,.2,.2),{park:true}))continue;
            const o=tree(x-.5,z-.5,i%3===0?3:true,true);o.district='park-edge-trees';o.street='Lincoln Way';
        }
        let count=0;for(let z=mapTile(8);z<mapTile(62);z+=2)for(let x=mapTile(10);x<mapTile(55);x+=2){if(count>=Math.round(105*LAYOUT_SCALE**2)||!canPlaceScenery(x,z)||!greenArea(x+.5,z+.5)||roadDistance[z*N+x]<.85||rand(x,z,9)<.23||pondValue(x+.5,z+.5)<1.7||mercedValue(x+.5,z+.5)<1.5||palaceWater(x+.5,z+.5)<1.5)continue;tree(x,z,x<mapTile(30)&&z<mapTile(22)?count++%3!==0:count++%4===0?3:false);}
        for(const x of [11,14,17,23,26,29])for(const z of [29,34])if(mapCanPlace(x,z)&&pondValue(mapTile(x)+.5,mapTile(z)+.5)>1.5)mapTree(x,z,x%3===0);
        addPanhandleDetails();
        for(const [x,z] of [[21,12],[21,16],[29,18],[30,13]])if(mapCanPlace(x,z))mapTree(x,z,3);
        for(const z of [20,21])if(isWalkable(mapTile(50),mapTile(z))&&!pavingInArea(mapTile(50),mapTile(z)))mapTree(50,z,true);
        for(const [x,z] of [[17,32],[27,33],[35,28],[41,30],[25,15]])if(mapCanPlace(x,z))bench(mapTile(x),mapTile(z));

    }
    function surfaceTypeAt(x,z){if(countryside?.contains(x,z))return 'grass';if(marinLand?.onLand(x,z))return marinLand.contains(x,z)?'grass':'building';
        const m=worldTiles,ix=Math.floor(x/m.step),iz=Math.floor(z/m.step);if(ix<0||iz<0||ix>=m.size||iz>=m.size)return 'sea';
        const tile=m.tiles[iz*m.size+ix];if(!tile.patches)return tile.type;
        return tile.patches.find(p=>insidePolygon(x/m.step-ix,z/m.step-iz,p.polygon))?.type||tile.base;
    }
    function placeStreetLights(){
        const parkPaths=new Set(['JFK Promenade','Martin Luther King Jr Drive','Main Post walk','Crissy Field promenade','Lovers Lane']);
        const roads=worldTiles.routes.filter(r=>r.kind==='road'||parkPaths.has(r.name));
        const avoid=[...[...places,...sights].filter(s=>s.entry).map(s=>({x:s.entry.x+.5,z:s.entry.y+.5,clearance:s.id==='links'?1.35:.8})),...houseDoorPositions(objects)];
        const surface=(x,z)=>{const type=surfaceTypeAt(x,z);return ['grass','plaza','courtyard'].includes(type)&&!navFree(x,z)?'building':type;};
        cityLightPlan=planBlockStreetLights({roads,surfaceType:surface,avoid,minZ:0,maxZ:78,maxSpacing:6});
        for(const p of cityLightPlan.lamps){
            const object=addScenery(null,p.x-.12,p.z-.12,.24,.24,2.9,(mesh,h)=>streetLights.push(...drawStreetLamp(mesh,p.x,h+.065,p.z,p.angle,p.style)));
            object.lamp=p;
        }
    }
    function setupTransit(){
        const route=planNightlifeBus(streetTraffic),nodeIds=new Set(route.points.filter(p=>p.node!==null).map(p=>p.node));
        const roadWidths=new Map([...worldTiles.routes,...SOUTHERN_ROADS].map(r=>[r.name,r.halfWidth??.5]));
        const avoid=[...objects.filter(o=>o.lamp).map(o=>o.lamp),...southernNeighborhood.lamps,...houseDoorPositions(objects),...[...places,...sights].filter(s=>s.entry).map(s=>({x:s.entry.x+.5,z:s.entry.y+.5}))];
        const signals=createTrafficSignals({...streetTraffic,nodeIds,roadWidths,avoid,canPlace:(x,z)=>landClearAt(x-.5,z-.5)&&['sidewalk','grass','plaza','courtyard','path'].includes(z>=N?airportSurfaceTypeAt(x,z):surfaceTypeAt(x,z))});
        if(signals.missing.length)throw new Error('Bus-route junctions need visible traffic lights: '+signals.missing.join(', '));
        drawTrafficSignalPosts(sceneMesh,signals,characterGround);streetTraffic.setSignals(signals);
        slowBus=createSlowBus({network:streetTraffic,signals,route,walkingSpeed:WALK_SPEED,ground:characterGround});
    }
    function canPlaceScenery(x,z,w=1,d=1){if(worldTiles&&cityParcels.length&&!parcelFits(rectangle(x+w/2,z+d/2,w,d),{park:true}))return false;if(pavingInArea(x,z,w,d))return false;for(let yy=z;yy<z+d;yy++)for(let xx=x;xx<x+w;xx++)if(!isWalkable(xx,yy)||reserved[yy*N+xx])return false;return true;}
    const {makeBuilding,makeRestaurantPatio,addScenery,tree,bench,human,bicycle,makeLandmarks,enhanceLandmarks,addPanhandleDetails,detailedGround,mapTree,mapCanPlace,makeTownhomeRow,makeCurbShop,drawHillsideLifts,housingDetails,WATERFRONT_PIERS}=createModels({
        N,MAP_SCALE,mapTile,mapPosition,layoutPosition,terrainHeight,naturalHeight,cutHousePlot,occupy,upload,objects,signs,
        buildingModels,sightById,canPlaceScenery,isWalkable,pavingInArea,insidePolygon,parcelFits,
        COAST,MARIN,POND,PANHANDLE,lakes,getSceneMesh:()=>sceneMesh,rectangle
    });
    function build(){for(const step of buildSteps()){} }
    async function buildForBrowser(){for(const step of buildSteps())await loading?.stage(...step);
        while(!materialState.ready||!alpineState.ready||signTextureControls.pending){if(materialState.error||alpineState.error)throw Error(materialState.error||alpineState.error);await nextLoadingPaint();}
    }
    function* buildSteps(){
        yield [8,'Preparing graphics…'];
        if(headless)for(const name of [...signNames(),...BILLBOARD_ART.map(a=>a.id),...RESEARCH_ART.map(a=>a.id)])signs.set(name,[[0,0],[1,0],[1,1],[0,1]]);else initGPU();
        yield [16,'Building the hills and shoreline…'];
        initializeGeography();buildHeightField();sceneMesh=new Mesh();
        yield [25,'Laying out neighborhoods…'];
        compileStreetTiles();setupZoo();setupCityFitness();setupJurassicCampus();setupIndustrialCenter();setupCityNightlife();makeLandmarks();enhanceLandmarks();fitLandmarksToBlocks();const grove=rectangle((COIT_GROVE.west+COIT_GROVE.east)/2,(COIT_GROVE.north+COIT_GROVE.south)/2,COIT_GROVE.east-COIT_GROVE.west,COIT_GROVE.south-COIT_GROVE.north);claimParcel({polygon:grove,kind:'parrot grove'});publicSpaces.push(grove);reserveBridgeApproach();planRestaurants();planContentBuildings();
        yield [36,'Building homes and streets…'];
        positionNia();planBeachBillboard();protectLandmarkApproaches();planAirportAds();populateCity();buildNavigation();setupBunny();setupSkateDog();finalizeSurfaceTiles();setupSunglasses();setupOceanSand();setupFishing();setupParrots();
        yield [53,'Connecting the peninsula and Marin…'];
        southernTerrain=createSouthernTerrain({roads:SOUTHERN_ROADS,pit:RAIL_PIT,pads:SOUTHERN_LEVEL_PADS,edgeHeight:x=>{const ix=Math.min(TERRAIN_GRID-1,Math.max(0,Math.floor(x*TERRAIN_RES))),u=x*TERRAIN_RES-ix;return heights[TERRAIN_GRID][ix]*(1-u)+heights[TERRAIN_GRID][ix+1]*u;}});
        surf.state.shore={...sightById('windsurf').entry};
        chase=createPoliceChase({player,routeTo:officerRoute,nearest:(x,y,r,p)=>marinLand?.contains(player.x+.5,player.y+.5)?marinLand.nearest(x,y,r,p):airship.contains(player.x+.5,player.y+.5)?airship.nearest(x,y,r,p):nearestNavigation(x,y,r,p),canCapture:(o,p)=>!rocket.state.active&&!flying()&&(surf.water(o.x+.5,o.y+.5)&&surf.water(p.x+.5,p.y+.5)||canTravel(o.x,o.y,p.x,p.y)),onArrest:()=>beginCapture('police',arrestPlayer)});
        yield [61,'Placing landmarks and adventures…'];
        setupAirshipTerminal();setupMerchants();setupRegionalWorld();setupWilderness();setupGuildSites();setupGreenBank();setupPacificaSurf();setupDeli();setupQuestCharacters();setupExpeditionSites();airship.setObstacles(navigationObstacles(objects.filter(o=>o.y+o.d>=N&&o.arch!=='terminal'&&!['times-square','research-institute','park','nightlife','gym','spaceport'].includes(o.sight?.kind))).map(o=>o.polygon));setupTigerEncounter();setupMonkeyEscape();setupServiceNPCs();setupTabletWizard();drawDetentionFacility(sceneMesh,detention);jailStaff=detentionStaff(detention);yield [72,'Texturing the terrain…'];if(!headless)makeTerrain();
        yield [82,'Bringing the city to life…'];placeStreetLights();setupNPCRoaming();
        const regionalRoutes=[...clipLifeRoutes(worldTiles.routes.filter(r=>r.kind==='road'),78,N),...clipLifeRoutes([...SOUTHERN_ROADS.map(r=>({...r,kind:'road',halfWidth:.5})),...SOUTHERN_TRAILS.map(r=>({...r,kind:'path'}))],N)];
        southernLife=createCityLife({visible:actorInView,routes:regionalRoutes,surfaceType:(x,z)=>landClearAt(x-.5,z-.5)?z>=N?airportSurfaceTypeAt(x,z):surfaceTypeAt(x,z):'grass',lamps:southernNeighborhood.lamps,terrainHeight,groundHeight:characterGround,scale:MAP_SCALE,human,bicycle,maxWalkers:92,maxRiders:8,walkerQuotas:[{count:20,contains:(x,z)=>z<96},{count:22,contains:(x,z)=>z>=96&&z<120},{count:22,contains:(x,z)=>z>=120&&z<145},{count:24,contains:(x,z)=>z>=145}],waterTraffic:false,prefix:'southern-citizen',regional:p=>p.points[Math.floor(p.points.length/2)][1]>=N-2.5});southernLife.update(0);
        const noe=NOE_VALLEY_BOUNDS,noeRoutes=clipLifeRoutes(worldTiles.routes,noe.north,noe.south).filter(r=>r.points.every(p=>p[0]>=noe.west&&p[0]<=noe.east));
        noeValleyLife=createCityLife({visible:actorInView,routes:noeRoutes,surfaceType:surfaceTypeAt,walkable:(x,z)=>landClearAt(x-.5,z-.5),lamps:objects.filter(o=>o.lamp).map(o=>o.lamp),terrainHeight,groundHeight:characterGround,scale:MAP_SCALE,human,bicycle,maxWalkers:3,maxRiders:0,waterTraffic:false,prefix:'noe-parent',strollers:true});noeValleyLife.update(0);

        squareLife=createCityLife({visible:actorInView,routes:[{name:'Square north promenade',kind:'path',halfWidth:0,points:[[60.4,153.1],[65.6,153.1]]},{name:'Square south promenade',kind:'path',halfWidth:0,points:[[60.4,155.6],[65.6,155.6]]},{name:'Square western walk',kind:'path',halfWidth:0,points:[[60.5,151.7],[60.5,155.7]]}],surfaceType:(x,z)=>timesSquareWalkable(x,z)?'sidewalk':'building',lamps:[],terrainHeight:()=>TIMES_SQUARE.base+.01,groundHeight:characterGround,scale:MAP_SCALE,human,bicycle,maxWalkers:6,maxRiders:0,waterTraffic:false,prefix:'square-citizen',regional:true});squareLife.update(0);

        streetTraffic=createStreetTraffic({routes:[...worldTiles.routes,...SOUTHERN_ROADS.map(r=>({...r,kind:'road'}))],isRoad:(x,z)=>(z>=N?airportSurfaceTypeAt(x,z):surfaceTypeAt(x,z))==='road'&&landClearAt(x-.5,z-.5),ground:characterGround,spawnPoints:[{x:65,z:27},{x:21.4,z:58},{x:63,z:70},{x:56.5,z:140}]});
        setupTransit();
        cityLife=createCityLife({visible:actorInView,routes:clipLifeRoutes(worldTiles.routes,-Infinity,78),surfaceType:surfaceTypeAt,lamps:objects.filter(o=>o.lamp).map(o=>o.lamp),terrainHeight,groundHeight:characterGround,scale:MAP_SCALE,human,bicycle});cityLife.update(0);
        if(headless){
            // Placement is finished. The model keeps bounds and footprints;
            // navigation tests do not need to retain millions of vertex values.
            const retained=retainInteriors?new Set(buildingModels.map(o=>o.mesh)):new Set();
            for(const mesh of new Set([sceneMesh,tahoeMesh,highwayMesh,...objects.map(o=>o.mesh),...buildingModels.map(o=>o.mesh)]))if(mesh&&!retained.has(mesh))mesh.data=[];
            built=true;return;
        }
        yield [91,'Uploading the city to your graphics card…'];
        sceneGPU=upload(sceneMesh,{spatial:true});
        lampGlow.setLights(streetLights,terrainHeight);gpuStats.triangles+=lampGlow.stats.triangles;buildCityMap();prepareWayfinding();
        yield [97,'Finishing textures and the minimap…'];
        built=true;setupWorldMultiplayer();updateCamera();drawMini();updateBikeButton();updateSurfButton();updateAirshipButton();updateTahoeButton();
    }



    // Eight-way A* with corner clearance, followed by line-of-sight string pulling.
    // Routing starts at the live position, so a new click never snaps back to a tile.
    function setupWorldMultiplayer(){
        if(headless)return;
        world.addEventListener('click',e=>{if(tabletService?.state.active){e.preventDefault();e.stopImmediatePropagation();}},true);
        multiplayerSettings=setupMultiplayerSettings(multiplayer,{showCharacter,announce});
        for(const id of TABLET_PLACES)$('sf-tablet-'+id).addEventListener('click',()=>useTeleportTablet(id));
        $('sf-bomber-bomb').addEventListener('click',()=>secretAction(secretWorld.dropBomb()));
        $('sf-bomber-land').addEventListener('click',()=>secretAction(secretWorld.ejectBomber()));
        $('sf-grapple-button').addEventListener('click',()=>multiplayerWorld?.grapple());
        if(!multiplayer)return;
        multiplayerWorld=createWorldMultiplayer({client:multiplayer,player,airship,basket,rope,expeditions,wilderness,zoo,merchants:[...merchants,...[cityLife,southernLife,noeValleyLife,squareLife,esotericCampus?.life].flatMap(l=>l?.people||[])],health,economy,deli,combatFeedback,characterGround,playerGround,announce,human,signs,actorInView,
            refreshUI:()=>{updateAdventureUI();updateAirshipButton();},onPurse:updatePurse,
            applyInventory:snapshot=>{Object.assign(economy.state,snapshot.purse);deli.state.sandwiches=snapshot.sandwiches;deli.state.pending=snapshot.deliveryPending&&!deli.state.arrived;if(Number.isFinite(snapshot.hp)){health.state.hp=Math.max(0,Math.min(30,snapshot.hp));localStorage.setItem('sf-hitpoints-v1',JSON.stringify(health.state));}if(!ownedHat(economy.state.ownedHats,playerLook.hat)){playerLook=normalizeCharacter({...playerLook,hat:'none'});localStorage.setItem('sf-character-v1',JSON.stringify(playerLook));}updatePurse(economy.state);updateHatControl();updatePhoneControl();updateAdventureUI();},
            canFollow:()=>active&&!tabletService?.state.active&&multiplayer.state.connected&&secretWorld?.kind==='world'&&!secretWorld.bomber.state.active&&!capture.state.active&&!rehabilitation.state.active&&!chase.state.jailed&&!flying()&&!rope.climbing&&!sutroClimb.state.active&&!rocket.state.active&&!surf.state.riding&&!training&&tahoe.state.mode==='ground'&&!dialogue.active&&!bankMenu?.active&&!questMenu?.active&&!aiInterview.visible&&$('sf-reader').hidden&&$('sf-character').hidden&&$('sf-help').hidden,
            routeFollower:(target,range)=>{const candidates=Array.from({length:12},(_,i)=>{const angle=i*Math.PI/6;return {x:target.x-.5+Math.cos(angle)*Math.min(.9,range*.75),y:target.z-.5+Math.sin(angle)*Math.min(.9,range*.75)};}).filter(p=>landClearAt(p.x,p.y)).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y));for(const point of candidates){const path=pathTo(point.x,point.y);if(path)return path;}return null;},
            setFollowRoute:path=>{player.path=path;action=null;destination=path.at(-1)||null;},stopFollowMotion:()=>{player.path=[];player.speed=0;player.moving=false;player.motion=0;},
            preparePlayerAction:()=>{fishing.cancel();setDancing(false);alienCombat=null;player.path=[];player.speed=0;action=null;destination=null;},
            playerWeapon,
            onPrivateAward:award=>{if(award.kind==='raptor')expeditions.recover();else if(!award.inventory){if(award.kind==='coins')economy.credit(award.amount);else if(award.kind==='sandwich')deli.storeSandwich(award.amount);}updateAdventureUI();},
            onCaught:source=>{health.damage(health.state.hp);beginCapture(source==='tiger'?'tiger':'alien',respawnAtHospital);},
            onPosition:p=>{if(p.reason==='teleport'){debugTeleport(p.x,p.z,true);return;}if(p.reason==='respawn')health.restore();if(secretWorld?.bomber.state.active)secretWorld.bomber.state.position={x:p.x,y:p.y,z:p.z};Object.assign(player,{x:p.x-.5,y:p.z-.5,path:[],speed:0,moving:false,motion:0});action=null;destination=null;if(p.reason==='disembark'||p.reason==='landed'){airship.state.active=false;rope.reset();}updateCamera();drawMini();}
        });
    }
    let sentMultiplayerCustody=false;
    function publishMultiplayerPose(){
        if(!multiplayerWorld)return;
        if(chase.state.jailed&&!sentMultiplayerCustody)multiplayer.command('personalTransit',{kind:'jail'});sentMultiplayerCustody=chase.state.jailed;
        const mode=tabletService?.state.active?'teleport':secretWorld?.bomber.state.active?(secretWorld.bomber.state.phase==='parachuting'?'parachute':'bomber'):expeditions.ship.aboard?'hidden':rocket.state.active?(['boarding','disembarking'].includes(rocket.state.phase)?'climb':'hidden'):multiplayerWorld.traversing?'climb':flying()?'airship':surf.state.riding?'surf':ferrari?.state.riding?'ferrari':motorcycle?.state.riding?'motorcycle':bike.riding?'bike':skateboard.riding?'skateboard':tahoe.state.mode==='ski'?'ski':tahoe.state.mode==='gondola'||sutroClimb.state.active||rope.climbing?'climb':training?'train':player.dancing?'dance':forwardRoll.state.active?'roll':'walk';
        multiplayerWorld.update({x:player.x+.5,z:player.y+.5,y:playerGround(),angle:player.angle,phase:player.phase,motion:Math.max(0,Math.min(1,player.motion||0)),moving:!!player.moving,mode,boost:mode==='bomber'&&secretWorld.bomber.state.boost,hp:health.state.hp,talkingTo:approachingNPC?.id,gesture:capture.state.active?'caught':player.gesture&&performance.now()-player.gesture.started<player.gesture.duration?player.gesture.name:''});
    }
    function debugTeleport(x,y,serverApproved=false){
        if(multiplayerWorld&&!serverApproved){multiplayerWorld.teleport(x,y);return {ok:true,message:'Teleport requested from the server.'};}
        if(bankMenu?.active)bankMenu.close();
        const target=debugTilePosition(x,y),inCell=detention.walkable(x,y);
        if(!multiplayerWorld)secretWorld?.reset();
        if(!landClearAt(target.x,target.y)&&!inCell)return {ok:false,message:'That point is blocked or outside the walkable map. Choose a road, path, or open ground.'};
        // Close committed dialogue receipts first, then cancel any travel they
        // started. No delayed arrival, capture or rehabilitation can undo :tp.
        dialogue.close();aiInterview.close();questMenu?.close();closeReader();closeCharacter();closeHelp();closeMenu();
        if(training)stopTraining();setDancing(false);parkMotorcycle(false);if(ferrari?.state.riding)parkFerrari();
        social.cancelPitch();fishing.cancel();forwardRoll.cancel();alienCombat=null;expeditions.stop();expeditions.abandonShip();monkeyKeeper?.stop();
        capture.cancel();rehabilitation.cancel();combatFeedback.clear();world.inert=false;if(health.state.hp===0)health.restore();
        rocket.cancel();rope.reset();basket.reset();basketArrival=null;airship.cancel();sutroClimb.cancel();tahoe.reset();waveSurf.stop();surf.cancelJump();surf.state.riding=false;bike.riding=false;skateboard.riding=false;
        Object.assign(chase.state,{wanted:false,jailed:inCell,officers:[],elapsed:0});
        keys.clear();pointers.clear();clearTimeout(pressTimer);gesture=false;action=null;destination=null;carArrival=null;currentInterior=null;currentInstitute=null;readerPlace=null;playerSpeechUntil=0;pickedCache=null;
        Object.assign(player,{...target,path:[],speed:0,vx:0,vy:0,moving:false,motion:0,phase:0,runBlend:0,gesture:null,dancing:false});
        $('sf-hover').hidden=true;$('sf-wanted').hidden=true;$('sf-custody').hidden=!inCell;$('sf-player-speech').hidden=true;
        for(const input of world.querySelectorAll('#sf-map-button,#sf-bike-button,#sf-surf-button,#sf-airship-button,.sf-place-marker'))input.disabled=inCell;
        updateClimbButton();updateRocketControls();updateAirshipButton();updateSurfButton();updateBikeButton();updateTahoeButton();updateAdventureUI();updateCamera();drawMini();debugConsole.update();
        return {ok:true,message:'Teleported to '+Number(x.toFixed(4))+', '+Number(y.toFixed(4))+'.'};
    }
    function pathTo(tx,ty,from=player,ignoreCustody=false){
        if(secretWorld?.kind==='illuminati')return CAVE_NAVIGATION.path(from,{x:tx,y:ty});
        const base=(a,b)=>esotericCampus?esotericCampus.path(a,b,(p,q)=>basePathTo(q.x,q.y,p,ignoreCustody)):basePathTo(b.x,b.y,a,ignoreCustody);
        const path=marinLand?marinLand.path(from,{x:tx,y:ty},base):base(from,{x:tx,y:ty});
        if(!headless&&!guildStatus().member){const site=places.find(p=>p.id==='freemasons-guild');if(path?.some(p=>insideGuild(site,p.x+.5,p.y+.5)))return null;}
        return path;
    }
    function basePathTo(tx,ty,from=player,ignoreCustody=false){
        // Overlapping city/peninsula cells still use their connected city
        // graph, rather than being forced through a distant regional gate.
        if(cityNavigation?.connected(from,{x:tx,y:ty})){const route=cityPathTo(tx,ty,from,ignoreCustody);if(route)return route;}
        if(regionalRoad){
            const regionalPath=(a,b)=>regionalRoad.path(a,b,{cityPath:(p,q)=>airship.path(p,q,(to,origin)=>cityPathTo(to.x,to.y,origin,ignoreCustody)),tahoePath:(p,q)=>tahoe.path(p,q)});
            const journey=(a,b)=>goldenGate?goldenGate.path(a,b,{cityPath:regionalPath}):regionalPath(a,b);
            return countryside?countryside.path(from,{x:tx,y:ty},journey):journey(from,{x:tx,y:ty});
        }
        if(tahoe.contains(from.x+.5,from.y+.5)||tahoe.contains(tx+.5,ty+.5))return tahoe.path(from,{x:tx,y:ty});
        return airship.path(from,{x:tx,y:ty},(to,origin)=>cityPathTo(to.x,to.y,origin,ignoreCustody));
    }
    function cityPathTo(tx,ty,from=player,ignoreCustody=false){
        const free=ignoreCustody?landClearAt:clearAt;if(!free(tx,ty)||!free(from.x,from.y))return null;
        return cityNavigation.path(from,{x:tx,y:ty});
    }
    function walkTo(x,y,onArrival=null) {wildTarget=null;
        if(secretWorld?.bomber.state.active){closeMenu();closeReader();if(clickAttempt)clickAttempt.walking=true;destination={x,y};return secretWorld.bomber.target(x+.5,y+.5);}
        multiplayerWorld?.stopFollowing(false);
        expeditions.stop();
        if(expeditions.ship.aboard){announce('Speak to Captain Ahab to return to shore.');return false;}
        if(clickAttempt&&!onArrival)clickAttempt.walking=true;
        if(onArrival)skateboard.riding=false;
        if(alienCombat){alienCombat=null;player.gesture=null;}
        if(training)stopTraining();
        if(ferrari?.state.riding){if(onArrival)return parkCarFirst();return driveFerrari(x,y);}
        if(capture.state.active)return false;
        setDancing(false);
        if(player.gesture?.name==='pet')player.gesture=null;
        if(rocket.state.active){if(clickAttempt)clickAttempt.worked=false;return false;}
        if(surf.state.jump){if(clickAttempt)clickAttempt.worked=false;return false;}
        if(dialogue.active)dialogue.close();
        if(tahoe.state.mode==='ski')return tahoe.steerTo(x+.5,y+.5);
        if(tahoe.state.mode==='gondola')return false;
        if(rope.climbing)return false;
        if(flying()){
            if(rope.state.deployed){announce("Retract the rope before flying.");return false;}
            const accepted=airship.flyTo(x+.5,y+.5);if(!accepted){if(clickAttempt)clickAttempt.worked=false;return false;}
            destination={x,y};action=null;closeReader();updateAirshipButton();drawMini();return true;
        }
        if(sutroClimb.state.active)return climbUnavailable();
        const jailed=chase?.state.jailed;
        if(surf.state.riding&&surf.state.mode==='surf'&&waveSurf.state.ride&&!onArrival)return waveSurf.steer(x+.5,y+.5);
        if(surf.state.riding&&!surf.water(x+.5,y+.5)&&Math.hypot(x-surf.state.shore.x,y-surf.state.shore.y)<5){useSurf();return true;}
        const route=jailed?detention.path(player,{x,y}):surf.state.riding?surf.path(player,{x,y}):pathTo(x,y);
        if(!route){if(clickAttempt)clickAttempt.worked=false;announce(jailed?'You can walk within your cell, but cannot pass through the bars or the bunk.':surf.state.riding?'Choose open water, or Return to shore.':'You cannot walk there. Try the pavement or a storefront.');return false;}
        fishing.cancel();releaseNPC();player.path=route;action=jailed?null:onArrival?()=>{parkMotorcycle(false);onArrival();}:null;destination={x,y};
        if(!route.length){player.speed=0;destination=null;if(action){const fn=action;action=null;fn();}}drawMini();return true;
    }
    function goToPlace(p) {closeMenu();if(p.id==='freemasons-guild'&&!guildStatus().member){announce('The guild admits members only. Speak to Ray in the red suit outside.','Guild');return false;}if(walkTo(p.inside.x,p.inside.y,()=>enter(p)))announce('Walking to '+p.label+'…');canvas.focus({preventScroll:true});}
    function announce(text,who='Guide') {
        $('sf-status').textContent=text;const row=document.createElement('div'), time=document.createElement('time');time.textContent=who;row.append(time,document.createTextNode(' '+text));const log=$('sf-log');log.append(row);while(log.children.length>4)log.firstChild.remove();log.scrollTop=log.scrollHeight;
    }
    function enter(p) {
        if(!active||chase?.state.jailed)return;if(placeAt(player.x,player.y)!==p){goToPlace(p);return;}
        if(p.activityBuilding){closeReader();closeMenu();visited.add(p.id);announce(p.id==='freemasons-guild'?'You enter the lodge. A checkerboard floor, brass compasses, and extremely exclusive biscuits.':'You enter the '+TECHNOLOGIST_MARKET+'. The farmers wear black coats and sunglasses. The produce may know kung fu.','You');drawMini();return;}
        if(p.id==='ai-lab'){closeReader();closeMenu();visited.add(p.id);if(aiLabJob.state.hired)announce('Welcome back to the AI Lab. You earn 1 coin every 2 seconds while inside.','AI Lab');else announce('You enter the AI Lab. Speak to the recruiter outside to interview for a job.','AI Lab');drawMini();return;}
        if(readerPlace===p&&!$('sf-reader').hidden)return;
        readerPlace=p;closeMenu();$('sf-help').hidden=true;world.classList.add('sf-reading');
        visited.add(p.id);
        $('sf-reader-title').textContent=p.label;$('sf-reader-category').textContent=p.category+' / San Francisco';$('sf-reader-description').textContent=p.description;
        const content=$('sf-reader-content');content.replaceChildren();
        if(p.source==='Bio') {
            const bio=classic.querySelector('.bio-content').cloneNode(true);content.append(bio);const contact=classic.querySelector('.header-right').cloneNode(true);contact.className='sf-contact';content.append(contact);
        } else {
            const source=sections.get(p.source);
            for(const child of source.children){if(child.tagName==='SUMMARY')continue;if(p.match){if(child.tagName==='P'&&(child.querySelector(`a[href*="${p.match}"]`)||!child.querySelector('a')))content.append(child.cloneNode(true));}else content.append(child.cloneNode(true));}
        }
        content.querySelectorAll('a').forEach(a=>{a.target='_blank';a.rel='noopener noreferrer';});
        $('sf-reader').hidden=false;$('sf-reader-shade').hidden=true;$('sf-reader').scrollTop=0;
        announce('You step inside '+p.label+'. The roof is hidden; walk out to return to the street.','You');drawMini();
    }
    function closeReader(){if($('sf-reader').hidden)return;$('sf-reader').hidden=true;readerPlace=null;world.classList.remove('sf-reading');$('sf-reader-shade').hidden=$('sf-help').hidden;if(active)canvas.focus({preventScroll:true});}
    function closeMenu(){$('sf-context').hidden=true;}
    let clickAttempt=null,clickAnimation=null;
    function clicked(sx,sy,fn){
        if(!built||tabletService?.state.active)return false;
        const previous=clickAttempt,attempt={worked:true,walking:false};clickAttempt=attempt;
        try{const result=fn();if(result===false)attempt.worked=false;return result;}
        finally{
            clickAttempt=previous;
            if(attempt.walking&&Number.isFinite(sx)&&Number.isFinite(sy)&&(sx||sy)){
                const feedback=$('sf-click-marker');clickAnimation?.cancel();feedback.hidden=false;feedback.dataset.accepted=String(attempt.worked);feedback.style.left=sx+'px';feedback.style.top=sy+'px';
                clickAnimation=feedback.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:'translate(-50%,-50%) scale(.08)',opacity:0}],{duration:reduced?180:440,easing:'ease-in',fill:'forwards'});
                clickAnimation.onfinish=()=>{feedback.hidden=true;};
            }
        }
    }
    function actorWalkPoint(npc){
        const requested={x:npc.x-.5,y:npc.z-.5};if(!Number.isFinite(requested.x)||!Number.isFinite(requested.y))return null;
        if(clearAt(requested.x,requested.y)&&pathTo(requested.x,requested.y))return requested;
        for(let r=.25;r<=1.75;r+=.25)for(let i=0;i<16;i++){const x=requested.x+Math.cos(i*Math.PI/8)*r,y=requested.y+Math.sin(i*Math.PI/8)*r;if(clearAt(x,y)&&pathTo(x,y))return {x,y};}return null;
    }
    function walkToActor(npc){const p=actorWalkPoint(npc);return p?walkTo(p.x,p.y):false;}
    function examine(p){closeMenu();announce(p?p.description:'A sun-warmed San Francisco street. Somewhere nearby, someone is building the future.','Examine');canvas.focus({preventScroll:true});}
    function showMenu(sx,sy) {
        if(tabletService?.state.active)return false;
        if(rocket.state.active)return false;
        if(surf.state.jump)return false;
        if(tahoe.state.mode!=='ground')return false;
        if(flying()&&!hitCitizen(sx,sy)?.networkPlayer)return showAirshipMenu(sx,sy);
        if(sutroClimb.state.active){
            const menu=$('sf-context');menu.replaceChildren();const heading=document.createElement('div');heading.className='sf-context-title';heading.textContent='Sutro Tower · Choose an option';menu.append(heading);
            for(const [label,fn] of [...(sutroClimb.state.phase==='top'?[[player.dancing?'Stop dancing':'Dance on Sutro Tower',dance]]:[]),['Climb down Sutro Tower',descendSutro],['Examine Sutro Tower',()=>examine(sightById('sutro'))]]){
                const button=document.createElement('button');button.type='button';button.setAttribute('role','menuitem');button.textContent=label;button.addEventListener('click',e=>clicked(e.clientX,e.clientY,()=>{closeMenu();return fn();}));menu.append(button);
            }
            menu.hidden=false;menu.style.left=Math.min(width-menu.offsetWidth-12,Math.max(12,sx))+'px';menu.style.top=Math.min(height-menu.offsetHeight-12,Math.max(12,sy))+'px';menu.querySelector('button').focus({preventScroll:true});return true;
        }
        const npc=hitCitizen(sx,sy),s=npc?null:hitSight(sx,sy),p=s||npc?null:hitPlace(sx,sy),t=tileAt(sx,sy),menu=$('sf-context');menu.replaceChildren();$('sf-hover').hidden=true;
        const heading=document.createElement('div');heading.className='sf-context-title';heading.textContent=npc?npcLabel(npc)+' · Choose an option':'Choose an option';menu.append(heading);
        const add=(text,fn)=>{const b=document.createElement('button');b.type='button';b.setAttribute('role','menuitem');b.textContent=text;b.addEventListener('click',e=>clicked(e.clientX,e.clientY,()=>{closeMenu();fn();}));menu.append(b);};
        if(secretWorld?.bomber.state.active){
            if(secretWorld.bomber.state.phase==='flying'){add('Fly here',()=>walkTo(t.x,t.y));add('Drop bomb · '+(secretWorld.bomber.bombSeconds?secretWorld.bomber.bombSeconds+'s reload':'Ready'),()=>secretAction(secretWorld.dropBomb()));add('Land · Parachute out',()=>secretAction(secretWorld.ejectBomber()));}add('Examine B-2',()=>examine(bomberSite));
            menu.hidden=false;menu.style.left=Math.min(width-menu.offsetWidth-12,Math.max(12,sx))+'px';menu.style.top=Math.min(height-menu.offsetHeight-12,Math.max(12,sy))+'px';menu.querySelector('button').focus({preventScroll:true});return;
        }
        if(!npc&&surf.state.riding&&surf.state.mode==='surf'){if(waveSurf.state.ride)for(const trick of SURF_TRICKS)add(trick.label,()=>performSurfTrick(trick.id));else add('Catch wave',catchPacificaWave);add('Return to Pacifica beach',useSurf);}
        if(npc?.networkPlayer){add('Follow '+npc.label,()=>multiplayerWorld.followPlayer(npc));if(multiplayerWorld.following===npc.id)add('Stop following',()=>multiplayerWorld.stopFollowing(true));if(multiplayer.state.pvp?.enabled&&npc.pvp&&npc.mode!=='bomber'&&!secretWorld?.bomber.state.active)add('Attack '+npcLabel(npc),()=>multiplayerWorld.attackPlayer(npc));}
        else if(npc?.police){}
        else if(npc?.wilderness){if(npc.combatKind==='bear')add('Pet '+npcLabel(npc),()=>petBear(npc));add('Attack '+npcLabel(npc),()=>attackWildMonster(npc));}
        else if(['raptor','cow','kraken'].includes(npc?.combatKind)){add('Attack '+npcLabel(npc),()=>attackExpeditionTarget(npc));}
        else if(npc?.expeditionRole)add('Talk-To '+npcLabel(npc),()=>talkExpeditionNPC(npc));
        else if(npc?.parrot)add('Talk-To wild parrot',()=>talkParrot(npc));
        else if(npc?.rehabilitation)add('Talk-To '+npcLabel(npc),()=>talkRehabilitation(npc));
        else if(npc?.kind==='illuminati-elder')add('Talk-To '+npcLabel(npc),()=>talkOldMan(npc));
        else if(npc?.kind==='tablet-wizard')add('Talk-To '+npcLabel(npc),()=>talkTabletWizard(npc));
        else if(npc?.kind==='banker')add('Talk-To '+npcLabel(npc),()=>talkBanker(npc));
        else if(npc?.questRole||npc?.kind==='guild-master'||npc?.kind==='market-farmer'||npc?.kind==='recruiter'||npc?.kind==='deli'||npc?.kind==='bartender'||npc?.researcher||npc?.kind==='rail-worker'||npc?.kind&&MERCHANTS[npc.kind])add('Talk-To '+npcLabel(npc),()=>talkMerchant(npc));
        else if(npc){
            const verbs=npc.child||npc.dog===true?['talk']:npcPrimary(npc)==='attack'?['attack','talk','steal']:['talk','attack','steal'];
            for(const verb of verbs)add(({talk:'Talk-To',attack:'Attack',steal:'Steal-from'})[verb]+' '+npcLabel(npc),()=>interactCitizen(npc,verb));
        }
        if(npc&&!npc.networkPlayer)add('Examine '+npcLabel(npc),()=>{announce(npcLabel(npc)+': '+(npcRevealed(npc)?'An aberrant green slime ghost. Railgun beams pass straight through it; a bayonet can cut it apart.':describeCharacter(npc)),'Examine');canvas.focus({preventScroll:true});});
        if(npc){const target=actorWalkPoint(npc);if(target)add('Walk here',()=>walkTo(target.x,target.y));}
        if(s?.kind==='loot')add('Take '+s.label,()=>collectExpeditionLoot(s));
        if(s?.kind==='waymo')add('Examine Waymo',()=>examine(s));
        if(s?.enterableInstitute)add('Enter '+s.label,()=>goToSight(s));
        if(p)add((currentInterior===p?(p.activityBuilding?'Walk inside ':'Browse '):'Enter ')+p.label,()=>currentInterior===p?enter(p):goToPlace(p));
        if(s&&!buildingNPCService(s)){
            if(['secret-stairs','cave-exit','stealth-bomber'].includes(s.kind))add(sightPrimaryVerb(s)+' '+s.label,()=>useSecretSite(s));
            if(s.kind==='sunglasses'&&!sunglasses.state.owned)add('Take '+s.label,pickUpSunglasses);
            if(s.kind==='sand')add('Collect sand',collectOceanSand);
            if(s.kind==='fishing')add('Catch live fish',fishAtWharf);
            if(s.id==='zoo-monkeys')add('Steal monkey',stealQuestMonkey);
            if(s.kind==='motorcycle'){if(motorcycle.state.rented)add('Ride motorcycle',()=>useMotorcycle());else add('Steal motorcycle',()=>useMotorcycle('steal'));}
            if(s.kind==='bunny')add('Pet bunny',petBunny);
            if(s.kind==='zoo'&&zoo.state.phase==='caged')add('Release tiger',releaseTiger);
            if(s.kind==='gondola')add(s.id==='gondola-base'?'Ride gondola up':'Ride gondola down',()=>useGondola(s.id==='gondola-base'));
            else if(s.id==='sutro'){add('Climb Sutro Tower',climbSutro);add('Walk to Sutro Tower',()=>goToSight(s));}
            else if(s.kind==='gym'){for(const exercise of GYM_EXERCISES)add(exercise.label,()=>useGym(exercise.id));if(training)add('Stop training',stopTraining);}
            else if(s.kind==='ferrari'){add('Drive / park Ferrari',useFerrari);if(economy.state.fuelCans)add('Use fuel can',useFuelCan);}
            else if(s.kind==='airship')add('Rent an airship',useAirship);
            else if(s.kind==='bike')add('Ride bicycle',useBike);
            else if(s.kind==='windsurf')add('Go windsurfing',useSurf);
            else if(s.kind==='surfing')add('Paddle out',usePacificaSurf);
            else if(s.kind==='whale')add('Jump over '+s.label,()=>jumpWhale(s));
            else if(s.kind==='guest')add('Talk to Nia',()=>goToSight(s));
            else if(s.kind==='ducks')add('Feed ducks',feedDucks);
        }
        const roadTarget=goldenGate?.targetAt(t.x+.5,t.y+.5)||regionalRoad?.targetAt(t.x+.5,t.y+.5);
        if(!npc){if(s?.kind!=='loot'&&s?.kind!=='sunglasses'){if(surf.state.riding&&surf.water(t.x+.5,t.y+.5))add(surf.state.mode==='surf'?'Paddle here':'Windsurf here',()=>{if(surf.state.mode==='surf')waveSurf.cancelRide();walkTo(t.x,t.y);});else if(roadTarget)add('Walk here',()=>walkTo(roadTarget.x,roadTarget.y));else if(clearAt(t.x,t.y))add('Walk here',()=>walkTo(t.x,t.y));else if(p)add('Walk to entrance',()=>walkTo(p.entry.x,p.entry.y));}
        if(s?.kind!=='waymo')add('Examine '+(s?s.label:p?p.label:inPark(t.x,t.y)?'Golden Gate Park':'street'),()=>examine(s||p||(inPark(t.x,t.y)?sightById('park'):null)));}
        if(skateboard.riding)for(const trick of SKATE_TRICKS)add(trick.label,()=>performSkateTrick(trick.id));
        menu.hidden=false;menu.style.left=Math.min(width-menu.offsetWidth-12,Math.max(12,sx))+'px';menu.style.top=Math.min(height-menu.offsetHeight-12,Math.max(12,sy))+'px';menu.querySelector('button').focus({preventScroll:true});
    }
    const mapArtPoint=(x,y)=>({x:MAP_ART.x+x*10/MAP_SCALE,y:MAP_ART.y+y*9.5/MAP_SCALE});
    const referenceMapArtPoint=(x,y)=>mapArtPoint(mapPosition(x),mapPosition(y));
    function drawCityLandmarkSymbols(c){
        const at=referenceMapArtPoint;
        const p=at(49,20);poly(c,[{x:p.x-7,y:p.y+6},{x:p.x+7,y:p.y+6},{x:p.x,y:p.y-17}],'#e3ddc1','#6e806b');
        const palace=at(33,13);ellipse(c,palace.x+15,palace.y+1,14,7,'#658f82');ellipse(c,palace.x,palace.y,8,6,'#c7af7f');ellipse(c,palace.x,palace.y-3,6,4,'#80916b');
        for(const x of [22,27])for(const y of [13,15]){const b=at(x,y);c.fillStyle='#9a5a3b';c.fillRect(b.x,b.y,18,7);}
        const flag=at(25.4,14.4);line(c,[flag,{x:flag.x,y:flag.y-12}],'#d8d8bc',1.5);c.fillStyle='#b2644b';c.fillRect(flag.x,flag.y-12,7,4);
        const museum=at(27,29.5);c.fillStyle='#916b45';c.fillRect(museum.x-10,museum.y-4,20,8);poly(c,[{x:museum.x+1,y:museum.y-4},{x:museum.x+8,y:museum.y-4},{x:museum.x+11,y:museum.y-15},{x:museum.x-1,y:museum.y-18}],'#a17b4b');
        const academy=at(28,32.5);for(let i=-1;i<=1;i++)ellipse(c,academy.x+i*6,academy.y,6,4,'#527d43');
        const glass=at(31,29.5);c.fillStyle='#ebe9d1';c.fillRect(glass.x-10,glass.y-3,20,6);ellipse(c,glass.x,glass.y-4,5,6,'#eeeedd');
        const windmill=at(11.5,29.5);c.fillStyle='#9f8152';c.fillRect(windmill.x-3,windmill.y-1,6,8);line(c,[{x:windmill.x-7,y:windmill.y-8},{x:windmill.x+7,y:windmill.y+6}],'#e2d9b4',2);line(c,[{x:windmill.x-7,y:windmill.y+6},{x:windmill.x+7,y:windmill.y-8}],'#e2d9b4',2);
        const dome=at(39,31);ellipse(c,dome.x,dome.y,7,7,'#92a391');ellipse(c,dome.x,dome.y-2,3,4,'#d7bb74');
        const towerSite=sightById('salesforce').mapPoint,tower=mapArtPoint(towerSite.x,towerSite.y);ellipse(c,tower.x,tower.y,5,10,'#8fa9aa');
        const ferrySite=sightById('ferry').mapPoint,f=mapArtPoint(ferrySite.x,ferrySite.y);c.save();c.translate(f.x,f.y);c.rotate(Math.PI/4);c.fillStyle='#c7bca2';c.fillRect(-13,-4,26,8);c.fillStyle='#6e8378';c.fillRect(-2,-7,4,5);c.restore();
        const field=at(53.5,35.5);poly(c,[{x:field.x-8,y:field.y},{x:field.x,y:field.y-8},{x:field.x+8,y:field.y},{x:field.x,y:field.y+8}],'#6d9359','#b2a17a');
        const monument=at(34.4,31);c.fillStyle='#766e48';c.fillRect(monument.x-2,monument.y-5,4,10);
        const sutro=sightById('sutro').mapPoint,s=mapArtPoint(sutro.x,sutro.y);
        for(const side of [-1,1])line(c,[{x:s.x+side*5,y:s.y+6},{x:s.x+side*2,y:s.y-2},{x:s.x+side*4,y:s.y-9}],'#b95b43',1.5);
        line(c,[{x:s.x-6,y:s.y-9},{x:s.x+6,y:s.y-9}],'#e9dfbd',2);
        for(const dx of [-4,0,4])line(c,[{x:s.x+dx,y:s.y-9},{x:s.x+dx,y:s.y-17}],'#c65d44',1.2);
    }
    function buildCityMap(){
        const c=cityMap.getContext('2d');c.fillStyle='#456c72';c.fillRect(0,0,cityMap.width,cityMap.height);
        const project=points=>points.map(([x,y])=>mapArtPoint(x,y)),referenceProject=points=>project(mapPolygon(points));
        southernTerrain.drawMinimap(c,mapArtPoint);
        poly(c,project(MARIN),'#748b53','#d2c49d');
        poly(c,project(rectangle(detention.x,detention.z,detention.w,detention.d)),'#a4a49a','#536966');
        c.save();poly(c,project(COAST),null);c.clip();poly(c,project([[0,0],[N,0],[N,N],[0,N]]),null);c.clip();
        for(let z=0;z<N;z++)for(let x=0;x<N;x++){const tile=worldTiles.tiles[Math.floor((z+.5)/worldTiles.step)*worldTiles.size+Math.floor((x+.5)/worldTiles.step)];poly(c,project([[x,z],[x+1,z],[x+1,z+1],[x,z+1]]),minimapGroundColor(tile.base,terrainHeight(x+.5,z+.5)));}
        poly(c,project(PRESIDIO),'#78934d');poly(c,referenceProject([[23.7,12.8],[26.9,12.8],[26.9,17.4],[23.7,17.4]]),'#a5ad75');poly(c,referenceProject([[25,10],[32,11],[32,12.5],[25,11.5]]),'#a5b17c');
        poly(c,referenceProject([[9,29],[32,29],[32,34],[9,34]]),'#789a4d');poly(c,referenceProject(boundsPolygon(PANHANDLE)),'#789a4d');
        poly(c,referenceProject([[33,27],[36,27],[36,30],[33,30]]),'#8fa35e');poly(c,referenceProject(boundsPolygon(DOLORES_PARK)),'#86a564');
        for(const [x,y,rx,ry] of [[29,43,4,5],[25.6,39.7,2.4,3],[42,51,2.2,1.4],[28,52,3,3],[17,57,6,5]]){const p=referenceMapArtPoint(x,y);ellipse(c,p.x,p.y,rx*10,ry*9.5,'#8b9c62');}
        for(const h of HILLS){if(h.name==='Presidio')continue;const p=mapArtPoint(h.x,h.y);for(const scale of [.45,.7,1]){c.beginPath();c.ellipse(p.x,p.y,h.r*10*scale/MAP_SCALE,h.r*9.5*scale/MAP_SCALE,0,0,Math.PI*2);c.strokeStyle='#736f4e28';c.lineWidth=1;c.stroke();}}
        for(let z=0;z<worldTiles.size;z++)for(let x=0;x<worldTiles.size;x++){const t=worldTiles.tiles[z*worldTiles.size+x],patches=t.patches||[{type:t.type,polygon:[[0,0],[1,0],[1,1],[0,1]]}];for(const p of patches)if(['road','path','sidewalk'].includes(p.type))poly(c,p.polygon.map(v=>mapArtPoint((x+v[0])*worldTiles.step,(z+v[1])*worldTiles.step)),MINIMAP_MATERIALS[p.type]);}
        const pond=[];for(let i=0;i<32;i++){const a=i*Math.PI/16;pond.push(mapArtPoint(POND.x+Math.cos(a)*POND.rx,POND.y+Math.sin(a)*POND.ry));}poly(c,pond,'#568b85');
        for(const [x,y,rx,ry] of [[16,56,1.7,2.7],[18.5,58.3,1.7,2.2]]){const p=referenceMapArtPoint(x,y);ellipse(c,p.x,p.y,rx*10,ry*9.5,'#57867c');}
        for(const o of objects)if(o.arch&&!o.place)poly(c,project(objectFootprint(o)),MINIMAP_BUILDING);
        drawCityLandmarkSymbols(c);
        for(const p of places)poly(c,project(p.footprint||rectangle(p.x+p.w/2,p.y+p.d/2,p.w,p.d)),'#8b7454');
        c.restore();c.save();poly(c,project([[0,0],[N,0],[N,N],[0,N]]),null);c.clip();line(c,project(COAST),'#ded0a5',2);c.restore();
        for(const o of objects)if(o.y>=N&&o.arch&&!['terminal','regional'].includes(o.arch))poly(c,project(objectFootprint(o)),MINIMAP_BUILDING);
        for(const site of southernNeighborhood.craftSites)for(const shape of site.kind==='neighborhood-garden'?[site.footprint]:site.navigationPolygons.slice(0,1))poly(c,project(shape),site.kind==='neighborhood-garden'?'#c3b793':'#b4a18a');
        for(const [x,z,w,d,angle] of WATERFRONT_PIERS){const c=Math.cos(angle),s=Math.sin(angle),points=[[-w/2,0],[w/2,0],[w/2,-d],[-w/2,-d]].map(([u,v])=>[x+u*c-v*s,z+u*s+v*c]);poly(cityMap.getContext('2d'),referenceProject(points),'#c9bca0');}
        poly(c,project([[82.4,103.2],[94.8,103.2],[94.8,150.5],[82.4,150.5]]),'#9da99c','#d4ceb1');
        const pier=SPACEPORT_PIER,pad=pier.pad;
        poly(c,project([[pier.west,pier.north],[pier.east,pier.north],[pier.east,pier.south],[pier.west,pier.south]]),'#a5b5b0');
        poly(c,project([[pad.west,pad.north],[pad.east,pad.north],[pad.east,pad.south],[pad.west,pad.south]]),'#a5b5b0','#d4ceb1');
        poly(c,project([[TIMES_SQUARE.west,TIMES_SQUARE.north],[TIMES_SQUARE.east,TIMES_SQUARE.north],[TIMES_SQUARE.east,TIMES_SQUARE.south],[TIMES_SQUARE.west,TIMES_SQUARE.south]]),'#a6a1a3');
        const apple=APPLE_CAMPUS,appleCircle=r=>Array.from({length:64},(_,i)=>[apple.x+Math.sin(i*Math.PI/32)*r,apple.z+Math.cos(i*Math.PI/32)*r]);
        poly(c,project(appleCircle(apple.outer)),'#cbd8d2');poly(c,project(appleCircle(apple.inner)),'#87a171');
        poly(c,project(rectangle(ROBOTAXI_DEALER.x,ROBOTAXI_DEALER.z,ROBOTAXI_DEALER.w,ROBOTAXI_DEALER.d)),'#b8c4bc');
        poly(c,project(rectangle(HABERDASHER.x,HABERDASHER.z,HABERDASHER.w,HABERDASHER.d)),'#8a7474','#d7c7a6');
        poly(c,project(rectangle(GPU_FACTORY.x,GPU_FACTORY.z,GPU_FACTORY.w,GPU_FACTORY.d)),'#a8bdb3','#d3ddd0');
        for(const r of RESEARCH_CAMPUSES){poly(c,project([[r.west,r.north],[r.east,r.north],[r.east,r.south],[r.west,r.south]]),'#bbc3ad');poly(c,project(rectangle(r.x,r.z,r.w,r.d)),'#8caaa8','#e0d7bd');}
        for(const b of TIMES_SQUARE_BUILDINGS)poly(c,project(rectangle(b.x,b.z,b.w,b.d)),'#8d6c94','#c9b791');
        poly(c,project([[PACIFICA_PARK.west,PACIFICA_PARK.north],[PACIFICA_PARK.east,PACIFICA_PARK.north],[PACIFICA_PARK.east,PACIFICA_PARK.south],[PACIFICA_PARK.west,PACIFICA_PARK.south]]),'#749b67');
        for(const {x,z,step,tile} of airportRoadTiles())for(const patch of tile.patches||[{type:tile.type,polygon:[[0,0],[1,0],[1,1],[0,1]]}])if(['road','path','sidewalk'].includes(patch.type))poly(c,project(patch.polygon.map(p=>[x+p[0]*step,z+p[1]*step])),MINIMAP_MATERIALS[patch.type]);
        poly(c,project(rectangle(TAX_HQ.x,TAX_HQ.z,5.4,3.4)),'#c6b778');
        poly(c,project(rectangle(SF_SPACEPORT.x,SF_SPACEPORT.z,5,5)),'#8fa5c0');
        poly(c,project(rectangle(SPACEPORT_HOUSES.x+3,SPACEPORT_HOUSES.z+2.1,6,4.2)),'#b49e79');
        poly(c,project([[RAIL_PIT.west,RAIL_PIT.north],[RAIL_PIT.east,RAIL_PIT.north],[RAIL_PIT.east,RAIL_PIT.south],[RAIL_PIT.west,RAIL_PIT.south]]),'#82715b');
        poly(c,project(rectangle(AIRSHIP_TERMINAL.x,AIRSHIP_TERMINAL.z,AIRPORT_TERMINAL_BUILDING.w,AIRPORT_TERMINAL_BUILDING.d)),'#7d9487');
        line(c,project([[AIRPORT_RUNWAY.x+AIRPORT_RUNWAY.width/2,AIRPORT_RUNWAY.z],[AIRPORT_RUNWAY.x+AIRPORT_RUNWAY.width/2,AIRPORT_RUNWAY.z+AIRPORT_RUNWAY.depth]]),'#bfc5af',4);
        poly(c,project([[STARTUP_HQ.x-1.7,133.1],[STARTUP_HQ.x+1.7,133.1],[STARTUP_HQ.x+1.7,135.9],[STARTUP_HQ.x-1.7,135.9]]),'#e88440');
        const mooring=mapArtPoint(AIRSHIP_TERMINAL.boarding.x+.5,AIRSHIP_TERMINAL.boarding.y+.5);ellipse(c,mooring.x,mooring.y,5,3,'#dfd3ac');
        const island=referenceMapArtPoint(42,2.5);ellipse(c,island.x,island.y,14,6,'#aeb995');c.fillStyle='#d1cdb4';c.fillRect(island.x-9,island.y-2,18,4);
        const statue=mapArtPoint(PROMETHEUS.x,PROMETHEUS.z);ellipse(c,statue.x,statue.y,12,10,'#a3b29d');ellipse(c,statue.x,statue.y,4,4,'#e2ba62');
        line(c,referenceProject([[18.8,.5],[18.8,10]]),'#bb6945',4);line(c,referenceProject([DOWNTOWN.bridge.rampStart,DOWNTOWN.bridge.abutment,DOWNTOWN.bridge.end]),'#c4c8ad',3);
        poly(c,referenceProject([[DOWNTOWN.bridge.end[0]-.5,DOWNTOWN.bridge.end[1]],[DOWNTOWN.bridge.end[0]+1,DOWNTOWN.bridge.end[1]-2],[DOWNTOWN.bridge.end[0]+3,DOWNTOWN.bridge.end[1]-1],[DOWNTOWN.bridge.end[0]+2,DOWNTOWN.bridge.end[1]+1]]),'#8e9b65');
    }
    let miniIcons=[],miniKeyboardPlace=null;
    const placeMarkerViews=[];
    function miniProjection(){return createMinimapProjection(secretWorld?.kind==='illuminati'?28:N,map.width,map.height,camera.yaw,player.x+.5,player.y+.5);}
    function drawMini(){
        if(secretWorld?.kind==='illuminati')return drawCaveMinimap();
        if(secretWorld?.kind==='kraken')return drawHuntMinimap();
        const m=miniProjection(),origin=m.point(-MAP_ART.x/10*MAP_SCALE,-MAP_ART.y/9.5*MAP_SCALE);
        mc.setTransform(1,0,0,1,0,0);mc.fillStyle='#456c72';mc.fillRect(0,0,map.width,map.height);
        mc.save();mc.setTransform(m.a*MAP_SCALE/10,m.b*MAP_SCALE/10,m.c*MAP_SCALE/9.5,m.d*MAP_SCALE/9.5,origin.x,origin.y);mc.drawImage(cityMap,0,0);mc.restore();
        if(nearTahoe(player.x+.5,player.y+.5))drawTahoeMinimap(mc,m,[player.x+.5,player.y+.5]);else poly(mc,[[EAST_BAY_COAST_X,player.y-2000],[Math.max(EAST_BAY_COAST_X,player.x)+2000,player.y-2000],[Math.max(EAST_BAY_COAST_X,player.x)+2000,player.y+2000],[EAST_BAY_COAST_X,player.y+2000]].map(([x,z])=>m.point(x,z)),'#9eaa84');
        if(regionalRoad)drawHighwayMinimap(mc,m,regionalRoad);
        if(esotericCampus)for(const feature of esotericCampus.mapFeatures)poly(mc,feature.polygon.map(p=>m.point(p[0],p[2])),feature.color);
        if(goldenGate)drawHighwayMinimap(mc,m,goldenGate);
        if(player.path.length)line(mc,[m.point(player.x+.5,player.y+.5),...player.path.map(p=>m.point(p.x+.5,p.y+.5))],'#ead294aa',1);
        for(const s of sights)if(!s.hiddenFromDirectory&&s.kind!=='bike'){
            const at=s.mapPoint||{x:s.entry.x+.5,y:s.entry.y+.5},p=m.point(at.x,at.y);
            ellipse(mc,p.x,p.y,1.2,1.2,'#e0d4ab');
        }
        miniIcons=layoutMinimapIcons(places.filter(p=>!p.activityBuilding).map(place=>({place,...m.point(place.x+place.w/2,place.y+place.d/2)})),map.width,map.height,13,12);
        for(const p of miniIcons)if(Math.hypot(p.x-p.anchorX,p.y-p.anchorY)>3)line(mc,[{x:p.anchorX,y:p.anchorY},p],'#ddcea580',.7);
        for(const p of miniIcons)drawPlaceIcon(mc,p.place.id,p.x,p.y);
        const selected=miniIcons.find(p=>p.place===miniKeyboardPlace);
        if(document.activeElement===$('sf-map-button')&&selected){
            mc.beginPath();mc.arc(selected.x,selected.y,7,0,Math.PI*2);mc.strokeStyle='#fff5d0';mc.lineWidth=1;mc.stroke();
        }
        const p=m.point(player.x+.5,player.y+.5),direction=m.point(player.x+.5+Math.cos(player.angle),player.y+.5+Math.sin(player.angle)),angle=Math.atan2(direction.y-p.y,direction.x-p.x);
        mc.save();mc.translate(p.x,p.y);mc.rotate(angle);poly(mc,[{x:5,y:0},{x:-4,y:-3},{x:-2,y:0},{x:-4,y:3}],'#fff6bb','#263d32');mc.restore();
        const nx=-m.c,ny=-m.d,len=Math.hypot(nx,ny),ux=nx/len,uy=ny/len;
        line(mc,[{x:map.width-17-ux*6,y:18-uy*6},{x:map.width-17+ux*9,y:18+uy*9}],'#f2dfa4',1.5);
        poly(mc,[{x:map.width-17+ux*9,y:18+uy*9},{x:map.width-17+ux*2-uy*3,y:18+uy*2+ux*3},{x:map.width-17+ux*2+uy*3,y:18+uy*2-ux*3}],'#f2dfa4');
        if(destination){const flag=m.point(destination.x+.5,destination.y+.5);drawDestinationFlag(mc,flag.x,flag.y);}
    }
    function drawCaveMinimap(){
        const m=miniProjection();miniIcons=[];mc.setTransform(1,0,0,1,0,0);mc.fillStyle='#28342d';mc.fillRect(0,0,map.width,map.height);
        for(const tile of CAVE_TILES)if(tile.type!=='rock')poly(mc,[[tile.x,tile.z],[tile.x+1,tile.z],[tile.x+1,tile.z+1],[tile.x,tile.z+1]].map(([x,z])=>m.point(x,z)),tile.walkable?tile.type==='hangar'?'#889181':'#aaa184':'#3e5052');
        const plane=m.point(ILLUMINATI_CAVE.bomber.x,ILLUMINATI_CAVE.bomber.z),wing=[[-6,2],[0,-3],[6,2],[0,1]].map(([x,z])=>m.point(ILLUMINATI_CAVE.bomber.x+x,ILLUMINATI_CAVE.bomber.z+z));poly(mc,wing,'#c4cdb9');
        const stairs=m.point(ILLUMINATI_CAVE.entrance.x,ILLUMINATI_CAVE.entrance.z);for(let i=0;i<3;i++)line(mc,[{x:stairs.x-3,y:stairs.y-2+i*2},{x:stairs.x+3,y:stairs.y-2+i*2}],'#efcf88',1);
        if(player.path.length)line(mc,[m.point(player.x+.5,player.y+.5),...player.path.map(p=>m.point(p.x+.5,p.y+.5))],'#ead294aa',1);
        const p=m.point(player.x+.5,player.y+.5),d=m.point(player.x+.5+Math.cos(player.angle),player.y+.5+Math.sin(player.angle));mc.save();mc.translate(p.x,p.y);mc.rotate(Math.atan2(d.y-p.y,d.x-p.x));poly(mc,[{x:5,y:0},{x:-4,y:-3},{x:-2,y:0},{x:-4,y:3}],'#fff6bb','#263d32');mc.restore();
        if(destination){const f=m.point(destination.x+.5,destination.y+.5);drawDestinationFlag(mc,f.x,f.y);}
    }
    function drawHuntMinimap(){
        const m=createMinimapProjection(44,map.width,map.height,camera.yaw,player.x+.5,player.y+.5);miniIcons=[];mc.setTransform(1,0,0,1,0,0);mc.fillStyle='#456c72';mc.fillRect(0,0,map.width,map.height);
        const home=expeditions.ship.home;if(home){const p=m.point(home.x,home.z);ellipse(mc,p.x,p.y,3,3,'#d4c38c');}
        if(expeditions.kraken.visible){const p=m.point(expeditions.kraken.x,expeditions.kraken.z);ellipse(mc,p.x,p.y,3,3,'#bc7f8b');}
        const p=m.point(player.x+.5,player.y+.5),d=m.point(player.x+1.5,player.y+.5);mc.save();mc.translate(p.x,p.y);mc.rotate(Math.atan2(d.y-p.y,d.x-p.x));poly(mc,[{x:5,y:0},{x:-4,y:-3},{x:-2,y:0},{x:-4,y:3}],'#fff6bb','#263d32');mc.restore();
    }
    function minimapPointer(e){
        return canvasPixelPoint(e.clientX,e.clientY,map.getBoundingClientRect(),{
            width:map.width,height:map.height,offsetWidth:map.offsetWidth,offsetHeight:map.offsetHeight,
            clientWidth:map.clientWidth,clientHeight:map.clientHeight,clientLeft:map.clientLeft,clientTop:map.clientTop
        });
    }
    function navigationRegionAt(x,y){
        if(airship.contains(x+.5,y+.5)){x=airship.gate.x;y=airship.gate.y;}
        return cityNavigation?.regionAt(x,y)??-1;
    }
    function navigateFromMinimap(e){
        if(chase?.state.jailed)return false;
        keys.clear();closeMenu();closeReader();drawMini();
        const pixel=e.detail===0&&e.clientX===0&&e.clientY===0?(miniIcons.find(p=>p.place===miniKeyboardPlace)||miniIcons[0]):minimapPointer(e);
        if(!pixel)return false;
        if(secretWorld?.bomber.state.active){const p=miniProjection().unproject(pixel.x,pixel.y);const result=walkTo(p.x-.5,p.y-.5);canvas.focus({preventScroll:true});return result;}
        const icon=nearestMinimapIcon(miniIcons,pixel.x,pixel.y);
        if(icon){goToPlace(icon.place);drawMini();return;}
        const worldPoint=miniProjection().unproject(pixel.x,pixel.y),x=worldPoint.x-.5,y=worldPoint.y-.5;
        if(ferrari?.state.riding){driveFerrari(x,y);canvas.focus({preventScroll:true});return;}
        if(flying()){walkTo(x,y);canvas.focus({preventScroll:true});return;}
        if(tahoe.state.mode==='ski'){walkTo(x,y);canvas.focus({preventScroll:true});return;}
        const target=minimapTarget(x,y);
        const accepted=target?walkTo(target.x,target.y):false;
        if(!accepted&&clickAttempt)clickAttempt.worked=false;
        canvas.focus({preventScroll:true});return accepted;
    }
    function minimapTarget(x,y,from=player,{sailing=surf.state.riding}={}){
        if(secretWorld?.kind==='illuminati')return CAVE_NAVIGATION.nearest(x,y,40,(a,b)=>CAVE_NAVIGATION.connected(from,{x:a,y:b}));
        if(secretWorld?.bomber.state.active)return {x,y};
        if(sailing)return nearestMinimapPoint(from,{x,y},{eligible:p=>surf.water(p.x+.5,p.y+.5),reachable:p=>!!surf.path(from,p)});
        const origin=countryside?.contains(from.x+.5,from.y+.5)?regionalRoad.gate('city'):marinLand?.contains(from.x+.5,from.y+.5)?goldenGate.gate('city'):esotericCampus?.contains(from.x+.5,from.y+.5)?regionalRoad.gate('city'):goldenGate?.contains(from.x+.5,from.y+.5)?goldenGate.gate('city'):regionalRoad?.contains(from.x+.5,from.y+.5)||tahoe.contains(from.x+.5,from.y+.5)?regionalRoad.gate('city'):from;
        const region=navigationRegionAt(origin.x,origin.y);
        return nearestMinimapPoint(from,{x,y},{
            eligible:p=>{
                if(countryside?.contains(p.x+.5,p.y+.5)||marinLand?.contains(p.x+.5,p.y+.5)||esotericCampus?.contains(p.x+.5,p.y+.5)||goldenGate?.contains(p.x+.5,p.y+.5)||regionalRoad?.contains(p.x+.5,p.y+.5)||airship.contains(p.x+.5,p.y+.5))return true;
                if(tahoe.contains(p.x+.5,p.y+.5))return tahoe.walkable(p.x+.5,p.y+.5);
                return cityNavigation.free(p.x,p.y)&&cityNavigation.regionAt(p.x,p.y)===region;
            },reachable:p=>!!pathTo(p.x,p.y,from)
        });
    }
    function selectMinimapIcon(e){
        if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)||chase?.state.jailed)return;
        e.preventDefault();e.stopPropagation();keys.clear();
        if(!miniIcons.length)return;
        const step=e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1;
        const current=miniIcons.findIndex(p=>p.place===miniKeyboardPlace),index=current<0?(step<0?miniIcons.length-1:0):(current+step+miniIcons.length)%miniIcons.length;
        const p=miniIcons[index].place,name=placeIcon(p.id).label;miniKeyboardPlace=p;
        $('sf-map-button').setAttribute('aria-label','Minimap: '+name+'. Press Enter to travel. Arrow keys select another icon.');
        $('sf-status').textContent=name+' · '+p.label;drawMini();
    }
    function prepareWayfinding(){
        const legend=$('sf-icon-legend'),layer=$('sf-place-markers');legend.replaceChildren();layer.replaceChildren();
        for(const p of places){
            if(p.activityBuilding)continue;
            if(!PLACE_ICONS[p.id])throw new Error('Missing content icon for '+p.id);
            const icon=placeIcon(p.id),item=document.createElement('div'),badge=document.createElement('span'),copy=document.createElement('span'),title=document.createElement('strong'),detail=document.createElement('small');
            item.className='sf-legend-item';item.setAttribute('role','listitem');badge.className='sf-legend-icon';badge.style.setProperty('--sf-place-color',icon.color);badge.innerHTML=iconSVG(p.id);
            title.textContent=icon.label;detail.textContent=icon.detail;copy.append(title,detail);item.append(badge,copy);legend.append(item);
            const button=document.createElement('button');button.type='button';button.className='sf-place-marker';button.dataset.place=p.id;
            button.style.setProperty('--sf-place-color',icon.color);button.innerHTML=iconSVG(p.id);button.title=icon.label+' · '+p.label;button.setAttribute('aria-label','Visit '+p.label+' · '+icon.label);
            button.addEventListener('click',e=>{e.stopPropagation();clicked(e.clientX,e.clientY,()=>goToPlace(p));drawMini();});layer.append(button);
            placeMarkerViews.push({place:p,button,lastCheck:-Infinity,version:-1,blocked:false});
        }
    }
    function drawPlaceMarkers(t){
        if(secretWorld?.kind!=='world'){for(const view of placeMarkerViews)view.button.hidden=true;return;}
        for(const marker of placeMarkerViews){
            const {place:p,button}=marker;
            if(chase.state.jailed||currentInterior===p){button.hidden=true;continue;}
            const anchor=[p.x+p.w/2,p.object.hi[1]+.55,p.y+p.d/2],at=project(...anchor);
            if(at.distance<=0||at.depth>1||at.x<14||at.x>width-14||at.y<28||at.y>height-14){button.hidden=true;continue;}
            if(t-marker.lastCheck>120||marker.version!==camera.version){
                const ray={origin:camera.eye,dir:unit(sub(anchor,camera.eye))},distance=Math.hypot(...sub(anchor,camera.eye));
                marker.blocked=objects.some(o=>{if(o===p.object||o.interior===p||!o.arch&&!o.solid)return false;const d=rayBox(ray,o.lo,o.hi);return d!==null&&d<distance-.35;});
                marker.lastCheck=t;marker.version=camera.version;
            }
            button.hidden=marker.blocked;
            if(!marker.blocked){button.style.left=at.x+'px';button.style.top=at.y+'px';}
        }
    }

    function update(dt,t) {
        multiplayerWorld?.beforeUpdate(dt);multiplayerSettings?.update();
        if(tabletService?.state.active){tabletService.update();if(tabletService.state.active){const pose=tabletService.state.pose;player.x=pose.position.x-.5;player.y=pose.position.z-.5;player.path=[];player.speed=0;player.motion=0;if(pose.incoming)currentInterior=null;}updateAdventureUI();updateCamera();drawMini();return;}
        if(multiplayerWorld?.traversing){updateCamera();drawMini();return;}
        tech.advanceTo(t,{eligible:active&&!document.hidden});
        aiLabJob.update(dt,{inside:placeAt(player.x,player.y)?.id==='ai-lab',eligible:active&&!document.hidden&&!capture.state.active&&!rehabilitation.state.active&&!chase?.state.jailed&&!flying()&&!rocket.state.active&&!surf.state.riding&&!rope.climbing&&!sutroClimb.state.active&&tahoe.state.mode==='ground'});
        social.advanceTo(t,{eligible:active&&!document.hidden,insideTwitter:activeInstituteRoom()?.id==='twitter-hq'});const drunkUI=$('sf-inebriation');if(drunkUI){drunkUI.hidden=inebriation.state.percent<=0;drunkUI.textContent=Math.ceil(inebriation.state.percent)+'% inebriated';}
        if(rehabilitation.state.active){rehabilitation.update(dt);updateCamera();drawMini();return;}

        if(capture.state.active){capture.update(dt);updateCamera();drawMini();return;}
        const jailed=chase?.state.jailed;
        tickLocalPeptides();streetTraffic?.update(dt);slowBus?.update(dt);deli?.update(dt,player,{deliverable:!jailed&&!flying()&&!rocket.state.active&&!surf.state.riding&&!sutroClimb.state.active&&!rope.climbing&&!currentInterior&&tahoe.state.mode==='ground'});
        cityLife?.update(dt);southernLife?.update(dt);noeValleyLife?.update(dt);squareLife?.update(dt);esotericCampus?.life?.update(dt);
        const blocked=!!bankMenu?.active||aiInterview.visible||!$('sf-help').hidden||!$('sf-character').hidden||!$('sf-context').hidden||dialogue.active||questMenu?.active;
        if(!blocked)waveTime+=dt;
        if(!blocked&&!chase?.state.jailed)expeditions.update(dt);
        if(capture.state.active){updateCamera();drawMini();return;}
        if(ahabNPC){const ship=expeditions.ship;ahabNPC.x=ship.aboard?ship.x-1.45:ahabNPC.shore.x;ahabNPC.z=ship.aboard?ship.z+.55:ahabNPC.shore.z;ahabNPC.base=ship.aboard?PEQUOD.deck:characterGround(ahabNPC.x,ahabNPC.z);}

        if(surf.state.riding&&surf.state.mode==='surf'&&!waveSurf.state.ride)waveSurf.update(blocked?0:dt);
        if(forwardRoll.state.active&&(blocked||alienCombat||!canForwardRoll()||fishing.state.active))forwardRoll.cancel();
        if(!skateboard.riding)skateTricks.cancel();
        skateTricks.update(blocked?0:dt);
        if(approachingNPC&&!action&&!dialogue.active)releaseNPC();
        if(!multiplayer)moveResearcherNPCs(merchants,dt,{paused:blocked,lookAt:{x:player.x+.5,z:player.y+.5}});
        if(!multiplayer)socialLife?.update(dt,{paused:blocked,lookAt:{x:player.x+.5,z:player.y+.5}});
        if(!multiplayer)specialNPCLife?.update(dt,{paused:blocked,lookAt:{x:player.x+.5,z:player.y+.5},disabled:n=>quests.theyLive.isDefeated(n.alienId)||alienCombat?.npc===n});updateTahoeButton();
        const topSpeed=surf.state.riding?(surf.state.mode==='surf'?2.4:7.2):motorcycle?.state.riding?MOTORCYCLE_SPEED:bike.riding?8.2:skateboard.riding?7.6:WALK_SPEED*(forwardRoll.state.active?FORWARD_ROLL_SPEED:1),acceleration=bike.riding||surf.state.riding||motorcycle?.state.riding?30:ACCELERATION;
        const oldX=player.x,oldY=player.y;
        updateAdventureUI();
        if(alienCombat&&(bike.riding||motorcycle?.state.riding||surf.state.riding||ferrari?.state.riding||flying()||rocket.state.active||dialogue.active||training||rope.climbing||sutroClimb.state.active||tahoe.state.mode!=='ground')){alienCombat=null;player.gesture=null;}
        if(!blocked)updateAlienCombat(dt,t);
        if(!multiplayer&&!blocked){const eligible=!capture.state.active&&!chase?.state.jailed&&!flying()&&!secretWorld?.bomber.state.active&&!rocket.state.active&&!surf.state.riding&&tahoe.state.mode==='ground';wilderness?.update(dt,eligible?[{id:'local',x:player.x+.5,z:player.y+.5}]:[]);
            wildAttackIn-=dt;if(wildTarget&&eligible&&wildAttackIn<=0){const weapon=playerWeapon(),r=wilderness.strike(wildTarget.id,{id:'local',x:player.x+.5,z:player.y+.5,level:strength.status.level,weapon});if(!r.ok||!wildTarget.hp)wildTarget=null;wildAttackIn=ITEM_STATS[weapon].interval;}
        }
        skateDog?.update(dt,t,{x:player.x+.5,z:player.y+.5},{paused:blocked,canGreet:!jailed&&!rocket.state.active&&!flying()&&!surf.state.riding&&!sutroClimb.state.active&&!rope.climbing&&tahoe.state.mode==='ground'});
        if(!quests.carrying)monkeyKeeper?.stop();
        if(monkeyKeeper?.update(blocked?0:dt)==='caught'){updateCamera();drawMini();return;}
        if(!multiplayer&&zoo?.update(blocked?0:dt)==='player-caught'){updateCamera();drawMini();return;}
        if(!blocked){
            const turn=Number(keys.has('arrowright'))-Number(keys.has('arrowleft')),tilt=Number(keys.has('arrowup'))-Number(keys.has('arrowdown'));
            if(turn||tilt)setCamera(camera.yaw+turn*dt*1.2,camera.pitch+tilt*dt*.8);
        }
        const airborne=!!secretWorld?.bomber.state.active;
        secretWorld?.update(airborne&&secretWorld.bomber.state.phase==='flying'&&blocked?0:dt,{boost:keys.has('shift')});
        if(airborne){const b=secretWorld.bomber.state;player.x=b.position.x-.5;player.y=b.position.z-.5;player.angle=b.heading;player.moving=!!b.target;player.speed=b.speed;player.path=[];player.motion=0;if(!b.target)destination=null;updateAdventureUI();updateCamera();drawMini();return;}
        if(training){const elapsed=Math.max(0,Math.min(1,(t-trainingLast)/1000));trainingLast=t;const level=blocked?null:strength.train(elapsed);if(level){announce('Strength level '+level+'!'+(level===10?' Sand Hill Road Capital Partners will now fund you.':''),'Gym');if(level===10)stopTraining();}chase?.update(dt,WALK_SPEED);updateAdventureUI();updateCamera();drawMini();return;}
        if(expeditions.ship.aboard){const ship=expeditions.ship;player.x=ship.x-.5;player.y=ship.z-.5;player.path=[];player.speed=0;player.moving=false;player.motion=0;chase?.update(blocked?0:dt,WALK_SPEED);updateCamera();drawMini();updateAdventureUI();return;}
        if(ferrari?.state.riding){
            const event=blocked?null:ferrari.update(dt),p=ferrari.position;player.x=p.x-.5;player.y=p.z-.5;player.angle=p.angle;player.path=[];player.speed=ferrari.state.speed;player.moving=player.speed>0;player.motion=0;player.runBlend=0;
            if(event==='empty'){const station=nearestFuel();destination=null;if(station&&Math.abs(station.distance-ferrari.state.distance)<4)useFuel(sightById(station.id));else announce('The Ferrari is out of fuel. Park with R, walk to a gas station for a fuel can, then bring it back.','Ferrari');}
            if(event==='arrived'){destination=null;if(carArrival){const fn=carArrival;carArrival=null;fn();}else announce(Math.abs(ferrari.state.distance-ferrari.length)<2?'Tahoe! Fill up at the free gondola gas station before the return drive.':'You park at your destination.','Ferrari');}
            chase?.update(dt,WALK_SPEED);updateAdventureUI();updateCamera();drawMini();return;
        }
        if(rocket.state.active){
            const event=blocked?null:rocket.update(dt),p=rocket.state.position,pose=rocket.state.pose;
            player.x=p.x-.5;player.y=p.z-.5;player.angle=pose.angle;player.path=[];player.speed=0;player.moving=!blocked&&pose.motion>0;player.motion=pose.motion;player.phase=pose.phase;player.runBlend=0;
            if(event==='arrived'){updateRocketControls();updateSurfButton();updateAirshipButton();updateTahoeButton();announce(nearTahoe(p.x,p.z)?'Touchdown in Tahoe. Ride the gondola, then rent skis at the summit.':'Touchdown at the San Francisco spaceport.','SpaceX');}
            updateCamera();drawMini();return;
        }
        if(tahoe.state.mode!=='ground'){
            const event=blocked?null:tahoe.update(dt),p=tahoe.state.position;
            player.x=p.x-.5;player.y=p.z-.5;player.angle=tahoe.state.angle;player.path=[];player.speed=tahoe.state.speed;player.moving=!blocked;player.motion=0;
            if(event==='summit'){setCamera(-Math.PI*3/4,.65);announce('You reach the summit, impossibly high above Lake Tahoe. Rent skis for one coin.','Gondola');}
            if(event==='base')announce('You return to the lakeside gondola station.','Gondola');
            if(event==='flip')announce('Front flip landed!','Skiing');
            if(event==='finish')announce('You reach the lake at the end of the run. '+tahoe.state.flips+' flips landed. Ride the gondola for another run.','Skiing');
            updateCamera();drawMini();updateTahoeButton();return;
        }
        if(surf.state.riding&&!whalesSeen&&Array.from({length:whales.count},(_,i)=>whales.sample(t,i)).some(p=>Math.hypot(p.x-player.x-.5,p.z-player.y-.5)<14)){
            whalesSeen=true;announce('Whale sighted! Beyond the western shore, humpbacks surface and breathe beside your board.','Discovery');
        }
        if(surf.state.riding&&surf.state.mode==='surf'&&waveSurf.state.ride){
            const events=waveSurf.update(blocked?0:dt),p=waveSurf.state.position;player.x=p.x-.5;player.y=p.z-.5;player.angle=waveSurf.state.angle;player.moving=!blocked;player.speed=blocked?0:3.6;player.path=[];player.motion=0;
            for(const event of events)announce(event.type==='trick'?event.label+' landed! +'+event.points+' points. Total '+waveSurf.state.score+'.':'The wave rolls on. Paddle into another foam line to catch the next one.','Surfing');
            chase?.update(dt,3.6);updateCamera();drawMini();updateAdventureUI();return;
        }
        if(surf.state.riding&&surf.state.jump){
            const jump=surf.state.jump,landed=!blocked&&surf.updateJump(dt);
            player.x=jump.x;player.y=jump.y;player.angle=jump.angle;player.moving=!blocked;player.speed=landed?0:7.2;
            if(landed)announce('You clear the humpback and splash back into the Pacific.','Windsurfing');
            chase?.update(dt,topSpeed);updateCamera();drawMini();return;
        }
        if(rope.state.deployed&&!blocked){
            const event=rope.update(dt);
            if(event==='passenger-aboard'){economy.trade('passenger');announce('The traveler reaches the deck and pays you 5 coins.','Traveler');}
            if(event==='ground')announce('You reach the ground. Walk around, then return to the rope to climb aboard.','You');
            if(event==='aboard'){basket.reset(.35,0);basketArrival=null;}
            if(event==='aboard'&&ropeReturnHome){ropeReturnHome=false;if(rope.retract())airship.returnHome();}
            if(event)updateAirshipButton();
        }
        if(rope.climbing){
            const p=rope.state.position;player.x=p.x-.5;player.y=p.z-.5;player.angle=airship.state.heading;player.moving=!blocked;player.speed=0;player.motion=1;player.phase=p.y*Math.PI*2/CHARACTER_CLIPS.climb.stride;
            updateCamera();drawMini();return;
        }
        if(airship.state.active&&!rope.onGround){
            const event=blocked?null:airship.update(dt),p=airship.state.position||airship.home;
            const arrived=basket.update(blocked?0:dt),rider=basket.position(p,airship.state.heading);
            player.x=(event==='landed'?p.x:rider.x)-.5;player.y=(event==='landed'?p.z:rider.z)-.5;player.angle=airship.state.heading+basket.state.angle;player.speed=basket.state.moving?2.2:0;player.moving=basket.state.moving;player.motion=player.moving?1:0;player.runBlend=0;player.phase=basket.state.travel*Math.PI*2/CHARACTER_CLIPS.walk.stride;
            if(arrived&&basketArrival){const fn=basketArrival;basketArrival=null;fn();}
            if(event==='landed'){rope.reset();basket.reset();basketArrival=null;player.path=[];player.speed=0;destination=null;updateAirshipButton();announce('You step onto the apron. Your airship rental is complete.','Pilot');}
            else if(event==='cruising')announce('Click the basket floor to walk around. Click the ground or minimap to fly; A returns to the terminal.','Pilot');
            else if(event==='arrived'){destination=null;updateAirshipButton();}
            chase?.update(dt,WALK_SPEED);updateCamera();drawMini();updateTahoeButton();miniLast=t;return;
        }
        if(sutroClimb.state.active){
            const before={...sutroClimb.state.position},event=blocked?null:sutroClimb.update(dt),position=sutroClimb.state.position,pose=sutroClimb.state.pose;
            player.x=position.x-.5;player.y=position.z-.5;player.speed=0;player.runBlend=0;
            const distance=Math.hypot(position.x-before.x,position.y-before.y,position.z-before.z);
            player.moving=distance>.00001;player.motion=pose.motion;
            if(pose.mode==='climb')player.phase=pose.ladderHeight*Math.PI*2/CHARACTER_CLIPS.climb.stride;
            else player.phase+=Math.hypot(position.x-before.x,position.z-before.z)*Math.PI*2/CHARACTER_CLIPS.walk.stride;
            const turn=Math.atan2(Math.sin(pose.angle-player.angle),Math.cos(pose.angle-player.angle));player.angle+=Math.max(-dt*15,Math.min(dt*15,turn));
            if(event){updateClimbButton();announce(event==='top'?'You reach the upper platform of Sutro Tower. Use the arrows to look around; Climb down or E returns to the ground.':'You step off the Sutro Tower ladder and return to the trail.','You');}
            chase?.update(dt,WALK_SPEED);updateCamera();drawMini();miniLast=t;updateBikeButton();return;
        }
        if(fishing.state.active){
            const result=fishing.update(blocked||questMenu?.active?0:dt);player.moving=false;player.motion=0;player.speed=0;
            if(result)announce(result.message,'Fishing');chase?.update(dt,WALK_SPEED);updateCamera();drawMini();return;
        }
        if(!blocked&&player.path.length){
            let remaining=0,px=player.x,py=player.y;
            for(const p of player.path){remaining+=Math.hypot(p.x-px,p.y-py);px=p.x;py=p.y;}
            const desired=forwardRoll.state.active?topSpeed:Math.min(topSpeed,Math.sqrt(2*acceleration*remaining));
            player.speed+=Math.max(-acceleration*dt,Math.min(acceleration*dt,desired-player.speed));
            let budget=Math.min(remaining,Math.max(player.speed,.05)*dt);
            // Consume the entire frame distance, including across waypoint boundaries.
            while(player.path.length){
                const next=player.path[0],dx=next.x-player.x,dy=next.y-player.y,len=Math.hypot(dx,dy);
                if(len<.00001){player.path.shift();continue;}
                if(budget<=0)break;
                const step=Math.min(budget,len);player.vx=dx/len;player.vy=dy/len;
                player.x+=player.vx*step;player.y+=player.vy*step;budget-=step;
                if(step>=len-.00001){player.x=next.x;player.y=next.y;player.path.shift();}
            }
            if(!player.path.length){player.speed=0;destination=null;if(action){const fn=action;action=null;forwardRoll.cancel();fn();}drawMini();}
        }
        forwardRoll.update(blocked?0:dt);
        const moved=Math.hypot(player.x-oldX,player.y-oldY);motorcycle?.move(player.x,player.y,player.angle,moved,dt);if(skateboard.riding)skateboard.travel+=moved;player.moving=moved>.00001;
        const response=1-Math.exp(-dt*12),speed=dt>0?moved/dt:0;
        player.motion+=(Number(player.moving)-player.motion)*response;
        player.runBlend+=(Number(player.moving&&speed>2.3)-player.runBlend)*response;
        if(player.moving){
            const stride=CHARACTER_CLIPS.walk.stride+(CHARACTER_CLIPS.run.stride-CHARACTER_CLIPS.walk.stride)*player.runBlend;
            player.phase+=moved*(bike.riding?1/.31:Math.PI*2/stride);
            const dx=player.x-oldX,dy=player.y-oldY,target=Math.atan2(dy,dx);
            const turn=Math.atan2(Math.sin(target-player.angle),Math.cos(target-player.angle));
            player.angle+=Math.max(-dt*15,Math.min(dt*15,turn));
            player.angle=Math.atan2(Math.sin(player.angle),Math.cos(player.angle));
        }
        const institute=activeInstituteRoom();
        if(institute!==currentInstitute){
            const previous=currentInstitute;currentInstitute=institute;
            if(institute){closeReader();if(bike.riding)parkBike(institute.entry.x,institute.entry.y);if(motorcycle?.state.riding)motorcycle.park(institute.entry.x,institute.entry.y,player.angle);skateboard.riding=false;visited.add(institute.id);announce('You enter '+institute.sight.label+'.','You');}
            else if(previous)announce('You leave '+previous.sight.label+' and return to the campus.','You');
        }
        const interior=jailed||surf.state.riding||flying()?null:placeAt(player.x,player.y);
        if(interior!==currentInterior){
            const previous=currentInterior;currentInterior=interior;
            if(previous&&readerPlace===previous)closeReader();
            if(interior&&bike.riding)parkBike(interior.entry.x,interior.entry.y);
            if(interior&&motorcycle?.state.riding){motorcycle.park(interior.entry.x,interior.entry.y,player.angle);player.speed=Math.min(player.speed,WALK_SPEED);}
            if(interior)enter(interior);else if(previous)announce('You leave '+previous.label+' and return to the street.','You');
        }
        chase?.update(dt,topSpeed);updateCamera();
        if(player.moving||t-miniLast>180){drawMini();updateBikeButton();miniLast=t;}
    }


    function mouseRay(sx,sy){const nx=(sx/width*2-1)*camera.tan*width/height,ny=(1-sy/height*2)*camera.tan;return {origin:camera.eye,dir:unit(camera.right.map((v,i)=>v*nx+camera.up[i]*ny-camera.back[i]))};}
    function terrainIntersection(ray){
        if(secretWorld?.kind==='illuminati'||secretWorld?.kind==='kraken'){const floor=secretWorld.kind==='illuminati'?ILLUMINATI_CAVE.floor+.025:.025,t=(floor-ray.origin[1])/ray.dir[1];return t>0&&Number.isFinite(t)?{point:ray.origin.map((v,i)=>v+ray.dir[i]*t),distance:t}:null;}
        if(chase?.state.jailed){const t=(detention.base+.18-ray.origin[1])/ray.dir[1];return t>0&&Number.isFinite(t)?{point:ray.origin.map((v,i)=>v+ray.dir[i]*t),distance:t}:null;}
        const countrysideHit=countryside?.raycast(ray),marinHit=marinLand?.raycast(ray),campusHit=esotericCampus?.raycast(ray),bridgeHit=goldenGate?.raycast(ray),highwayHit=regionalRoad?.raycast(ray),clubHit=nightclub?raycastNightlife(ray,nightclub,terrainHeight):null,instituteHit=activeInstituteRoom()?raycastInstituteFloor(activeInstituteRoom(),ray):null,roadHit=[countrysideHit,marinHit,campusHit,bridgeHit,highwayHit,clubHit,instituteHit].filter(Boolean).sort((a,b)=>a.distance-b.distance)[0],southHit=southernTerrain?.raycast(ray);
        if(nearTahoe(player.x+.5,player.y+.5,400)){const hit=raycastTahoe(ray);if(hit)return roadHit&&roadHit.distance<hit.distance?roadHit:hit;}
        // Traverse terrain grid cells and intersect the actual rendered triangles.
        // This remains exact at shorelines and steep hills, where ray marching can skip a ridge.
        const o=ray.origin,d=ray.dir,water=(.02-o[1])/d[1];let best=Math.min(water>0?water:220,roadHit?.distance||220,southHit?.distance||220),near=0;
        const apron=(AIRSHIP_TERMINAL.base+.03-o[1])/d[1];
        if(apron>0&&onAirportApron(o[0]+d[0]*apron,o[2]+d[2]*apron))best=Math.min(best,apron);
        let far=Math.min(220,best);
        for(const axis of [0,2]){if(Math.abs(d[axis])<1e-9){if(o[axis]<0||o[axis]>N)return best<220?{point:o.map((v,i)=>v+d[i]*best),distance:best}:null;}else{let a=(0-o[axis])/d[axis],b=(N-o[axis])/d[axis];if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);}}
        let x=Math.max(0,Math.min(TERRAIN_GRID-1,Math.floor((o[0]+d[0]*(near+1e-7))*TERRAIN_RES))),z=Math.max(0,Math.min(TERRAIN_GRID-1,Math.floor((o[2]+d[2]*(near+1e-7))*TERRAIN_RES)));
        const sx=d[0]>=0?1:-1,sz=d[2]>=0?1:-1,deltaX=Math.abs(1/TERRAIN_RES/d[0]),deltaZ=Math.abs(1/TERRAIN_RES/d[2]);let nextX=Math.abs(d[0])<1e-9?Infinity:((sx>0?x+1:x)/TERRAIN_RES-o[0])/d[0],nextZ=Math.abs(d[2])<1e-9?Infinity:((sz>0?z+1:z)/TERRAIN_RES-o[2])/d[2],t=near;
        while(t<=far+1e-7&&t<=best&&x>=0&&z>=0&&x<TERRAIN_GRID&&z<TERRAIN_GRID){
            const a=[x/TERRAIN_RES,heights[z][x],z/TERRAIN_RES],b=[(x+1)/TERRAIN_RES,heights[z][x+1],z/TERRAIN_RES],c=[(x+1)/TERRAIN_RES,heights[z+1][x+1],(z+1)/TERRAIN_RES],e=[x/TERRAIN_RES,heights[z+1][x],(z+1)/TERRAIN_RES];
            for(const tri of [[a,c,b],[a,e,c]]){const hit=rayTriangle(ray,...tri);if(hit!==null&&hit<best&&insidePolygon(o[0]+d[0]*hit,o[2]+d[2]*hit,COAST))best=hit;}
            if(nextX<nextZ){t=nextX;nextX+=deltaX;x+=sx;}else{t=nextZ;nextZ+=deltaZ;z+=sz;}
        }
        return best<220?{point:o.map((v,i)=>v+d[i]*best),distance:best}:null;
    }
    function tileAt(sx,sy){const hit=terrainIntersection(mouseRay(sx,sy));return hit?{x:hit.point[0]-.5,y:hit.point[2]-.5}:{x:NaN,y:NaN};}
    let pickedCache=null,frameID=0;
    function pick(sx,sy){
        if(pickedCache&&pickedCache.x===sx&&pickedCache.y===sy&&pickedCache.frame===frameID)return pickedCache.result;
        const ray=mouseRay(sx,sy),ground=terrainIntersection(ray);let distance=ground?ground.distance+.12:220,result=null;
        const test=o=>{const near=rayBox(ray,o.lo,o.hi);if(near===null||near>distance)return;const data=o.mesh.data,instituteHidden=o.researchRoom?instituteHiddenSections(o.researchRoom,o.sections,camera.eye,o.researchRoom===activeInstituteRoom()):[],hiddenWalls=o.place&&o.place===currentInterior?cutawayWallMask(o,camera.eye):0;for(let vertex=o.start;vertex<o.start+o.count;vertex+=3){if(isGlassVertex(data,vertex))continue;if(instituteHidden.some(p=>vertex>=p.start&&vertex<p.start+p.count))continue;if(o.place&&o.place===currentInterior){const hidden=o.roof.start<=vertex&&vertex<o.roof.start+o.roof.count||o.walls.some(w=>(hiddenWalls&(1<<w.side))&&vertex>=w.start&&vertex<w.start+w.count);if(hidden)continue;}const i=vertex*11,t=rayTriangle(ray,[data[i],data[i+1],data[i+2]],[data[i+11],data[i+12],data[i+13]],[data[i+22],data[i+23],data[i+24]]);if(t!==null&&(t<distance||(o.character||o.detailTarget)&&Math.abs(t-distance)<1e-6)){distance=t;result=o;}}};
        if(!secretWorld||secretWorld.kind==='world')for(const o of objects)test(o);for(const o of dynamicTargets)test(o);
        pickedCache={x:sx,y:sy,frame:frameID,result};return result;
    }
    function hitPlace(sx,sy){return pick(sx,sy)?.place||null;}
    function hitCitizen(sx,sy){
        const hit=pick(sx,sy);if(hit?.npc)return hit.npc;
        if(hit?.sight?.kind==='guest')return niaCitizen;
        // A few screen pixels of tolerance make thin limbs easy to select.
        // Test visibility at the actor itself so the extra area never reaches
        // through a wall or a closed café roof.
        let closest=null,best=Infinity;
        for(const o of [...dynamicTargets.filter(o=>o.npc),...objects.filter(o=>o.character&&o.sight?.kind==='guest')]){
            if(o.interior&&o.interior!==currentInterior)continue;
            const points=[];for(const x of [o.lo[0],o.hi[0]])for(const y of [o.lo[1],o.hi[1]])for(const z of [o.lo[2],o.hi[2]])points.push(project(x,y,z));
            if(points.some(p=>p.distance<=0))continue;
            const left=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y)),bottom=Math.max(...points.map(p=>p.y)),padding=5;
            if(sx<left-padding||sx>right+padding||sy<top-padding||sy>bottom+padding)continue;
            const anchor=[(o.lo[0]+o.hi[0])/2,o.lo[1]+(o.hi[1]-o.lo[1])*.62,(o.lo[2]+o.hi[2])/2],at=project(...anchor);
            // Aggregates such as campuses include walkable courtyards in their
            // bounds. Use the actual visible triangles, never that broad box,
            // to decide whether an actor's torso is behind a wall.
            if(pick(at.x,at.y)!==o)continue;
            const score=Math.hypot(sx-at.x,sy-at.y);if(score<best){best=score;closest=o.npc||niaCitizen;}
        }
        return closest;
    }
    function positionNia(){
        const body=sightById('nia').object;
        if(!body?.character)throw new Error('Nia must have a seat inside Mazarine Coffee');
        Object.assign(niaCitizen,body.character,{interior:body.interior});
    }
    function hitSight(sx,sy){
        const hit=pick(sx,sy);if(hit?.sight)return hit.sight;
        // Small vials and coins get a few screen pixels of tolerance, while
        // an actual visibility ray prevents selecting items through walls.
        let item=null,score=Infinity;
        for(const o of dynamicTargets)if(o.sight?.kind==='loot'||o.sight?.kind==='sunglasses'){
            const anchor=[(o.lo[0]+o.hi[0])/2,(o.lo[1]+o.hi[1])/2,(o.lo[2]+o.hi[2])/2],at=project(...anchor),distance=Math.hypot(sx-at.x,sy-at.y);
            if(at.distance<=0||distance>Math.max(9,(project(o.hi[0],anchor[1],o.hi[2]).x-at.x)*1.3)||distance>=score||pick(at.x,at.y)!==o)continue;
            item=o.sight;score=distance;
        }
        if(item)return item;if(hit||secretWorld?.kind!=='world')return null;
        const tower=sightById('sutro'),ray=mouseRay(sx,sy),near=tower.object?rayBox(ray,tower.object.lo,tower.object.hi):null;
        if(near!==null){const ground=terrainIntersection(ray);if(!ground||near<ground.distance+.1)return tower;}
        const t=tileAt(sx,sy);if(pondValue(t.x+.5,t.y+.5)<1.3)return sightById('ducks');if(palaceWater(t.x+.5,t.y+.5)<1.2)return sightById('palace');return null;
    }
    let dynamicTargets=[],actorTags=[];
    function drawExpeditionActors(m,t,addTarget){
        const game=expeditions,near=n=>Math.hypot(n.x-player.x-.5,n.z-player.y-.5)<40;
        if(near(JURASSIC)){drawRaptorGate(m,game);}
        const r=game.raptor;if(r.phase!=='recovered'&&near(r)){r.base=r.phase==='caged'||r.phase==='releasing'?JURASSIC.base:characterGround(r.x,r.z);const start=m.data.length;drawVelociraptor(m,r,t);if(r.phase!=='dead')addTarget(start,{npc:r});else {const remains=game.state.loot.find(l=>l.lootKind==='raptor');if(remains)addTarget(start,{sight:remains});}if(r.phase==='loose'&&r.prey?.isPlayer)actorTags.push({...r,height:1.6,chasing:true});}
        for(const cow of game.cows)if(cow.hp>0&&near(cow)){cow.base=characterGround(cow.x,cow.z);const start=m.data.length;drawCow(m,cow,t);addTarget(start,{npc:cow});}
        const ship=game.ship;if(ship.home&&near(ship)){const start=m.data.length;drawPequod(m,ship,game.state.clock*1000,signs);addTarget(start,{sight:pequodSite});}
        if(game.kraken.visible&&game.kraken.hp>0&&near(game.kraken)){game.kraken.base=0;const start=m.data.length;drawKraken(m,game.kraken,game.state.clock*1000);addTarget(start,{npc:game.kraken});}
        for(const loot of game.state.loot)if(near(loot)){const base=loot.base??(loot.lootKind==='kraken'?PEQUOD.deck:characterGround(loot.x,loot.z)),start=m.data.length;drawExpeditionLoot(m,loot,base,t);addTarget(start,{sight:loot});}
        for(const beam of game.state.beams)drawBeam(m,beam);
    }
    function actorInView(x,z,base){return headless||batchInFrustum({lo:[x-2,base-.6,z-2],hi:[x+2,base+3.4,z+2]},camera.matrix);}
    function makePrivateActors(t){
        const m=new Mesh(),cave=secretWorld.kind==='illuminati',base=playerGround();dynamicTargets=[];actorTags=[];
        const target=(start,metadata)=>{const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=start;i<m.data.length;i+=11)for(let j=0;j<3;j++){lo[j]=Math.min(lo[j],m.data[i+j]);hi[j]=Math.max(hi[j],m.data[i+j]);}dynamicTargets.push({mesh:m,start:start/11,count:(m.data.length-start)/11,lo,hi,...metadata});};
        const gesture=player.gesture&&t-player.gesture.started<player.gesture.duration?player.gesture:null;
        human(m,player.x+.5,player.y+.5,base+.07,player.angle,reduced?0:player.phase,false,playerLook.skin,playerLook.shirt,{...characterAppearance(playerLook),mode:'move',motion:reduced?0:player.motion,run:player.runBlend,time:t*.001,backpack:false,ground:()=>base,action:player.dancing?'dance':gesture?.name,actionT:gesture?(t-gesture.started)/gesture.duration:0});
        if(gesture?.name==='drink')drawDrinkingCoffee(m,player,base+.07,t,gesture.started,gesture.duration);
        if(playerLook.cape&&expeditions.state.cape)drawKrakenCape(m,player.x+.5,player.y+.5,base+.07,player.angle,t,signs);
        if(cave){
            let start=m.data.length;drawStealthBomber(m,{...ILLUMINATI_CAVE.bomber,y:ILLUMINATI_CAVE.floor+.83},-Math.PI/2,{parked:true,time:t});target(start,{sight:bomberSite});
            start=m.data.length;drawSecretStair(m,ILLUMINATI_CAVE.entrance.x,ILLUMINATI_CAVE.floor+.04,ILLUMINATI_CAVE.entrance.z,0);target(start,{sight:caveExitSite});
        }else{
            const px=player.x+.5,pz=player.y+.5;m.quad([px-120,.02,pz-120],[px-120,.02,pz+120],[px+120,.02,pz+120],[px+120,.02,pz-120],'#ffffff',{water:1});
            let start=m.data.length;drawPequod(m,expeditions.ship,expeditions.state.clock*1000,signs);target(start,{sight:pequodSite});
            if(expeditions.kraken.visible&&expeditions.kraken.hp>0){start=m.data.length;expeditions.kraken.base=0;drawKraken(m,expeditions.kraken,expeditions.state.clock*1000);target(start,{npc:expeditions.kraken});}
            if(ahabNPC){start=m.data.length;human(m,ahabNPC.x,ahabNPC.z,PEQUOD.deck+.07,ahabNPC.angle,0,false,ahabNPC.skin,ahabNPC.shirt,{coat:true,cap:true,pants:'#3d4a4d',time:t*.001});target(start,{npc:ahabNPC});}
            for(const loot of expeditions.state.loot.filter(l=>!l.network&&l.lootKind==='kraken')){start=m.data.length;drawExpeditionLoot(m,loot,PEQUOD.deck,t);target(start,{sight:loot});}
            if(expeditions.state.railgun&&expeditions.state.equipped)drawRailgun(m,px,base+1.14,pz,player.angle);
            for(const beam of expeditions.state.beams)drawBeam(m,beam);
        }
        return m;
    }
    function makeActors(t){
        if(secretWorld&&secretWorld.kind!=='world')return makePrivateActors(t);
        let pendingAirshipTarget=null;const m=new Mesh(),rolling=forwardRoll.state.active,trick=skateboard.riding?skateTricks.pose:null,base=playerGround()+.07+(trick?.height||0),phase=reduced?0:player.phase,gesture=player.gesture,actionT=gesture?(t-gesture.started)/gesture.duration:1;
        const carryingFish=!!(economy.state.fish&&!rolling&&!fishing.state.active&&!player.dancing&&!capture.state.active&&!ferrari?.state.riding&&!bike.riding&&!motorcycle?.state.riding&&!skateboard.riding&&!flying()&&!rope.climbing&&!sutroClimb.state.active&&!rocket.state.active&&tahoe.state.mode==='ground');
        if(training)drawGymExercise(m,gymSelection,t,characterAppearance(playerLook),{reduced});
        else if(tahoe.state.mode==='ski')drawSkiRider(m,tahoe.state,t,reduced,characterAppearance(playerLook));
        else if(tabletService?.state.active){const p=tabletService.state.pose;human(m,p.position.x,p.position.z,p.position.y,player.angle,0,false,playerLook.skin,playerLook.shirt,{...characterAppearance(playerLook),phone:false,battleaxe:false,mode:'idle',action:'teleport',actionT:p.arms,ground:null});drawTabletTeleport(m,p,t);}
        else if(secretWorld?.bomber.state.active){const b=secretWorld.bomber.state;if(b.phase==='parachuting'){human(m,b.position.x,b.position.z,b.position.y,b.heading,0,false,playerLook.skin,playerLook.shirt,{...characterAppearance(playerLook),mode:'idle',action:'parachute',actionT:1,ground:null});drawParachute(m,b.position,b.heading,t);}else drawStealthBomber(m,b.position,b.heading,{bank:b.bank,time:t});}
        else if(surf.state.riding&&surf.state.mode==='surf')drawWaveSurfer(m,player.x+.5,player.y+.5,playerGround(),player.angle,t,waveSurf.pose,{appearance:characterAppearance(playerLook),moving:player.moving,reduced});
        else if(surf.state.riding)drawWindsurfer(m,player.x+.5,player.y+.5,playerGround(),player.angle,t,{appearance:characterAppearance(playerLook),moving:player.moving&&!surf.state.jump,reduced,pitch:surf.state.jump?.pitch||0});
        else{const riderStart=m.data.length,rocketPose=rocket.state.active?rocket.state.pose:null,onSutro=sutroClimb.state.active,networkClimb=!!multiplayerWorld?.traversing,climbing=networkClimb||onSutro&&sutroClimb.state.phase!=='top'||rope.climbing||rocketPose?.mode==='climb',riderPose=networkClimb?{mode:'climb'}:rocketPose||(rope.climbing?{mode:'climb'}:sutroClimb.state.pose);
        human(m,player.x+.5,player.y+.5,base+(ferrari?.state.riding?.12:bike.riding?.3:motorcycle?.state.riding?.13:skateboard.riding?.155:0),player.angle,phase,bike.riding,playerLook.skin,playerLook.shirt,{...characterAppearance(playerLook),battleaxe:playerWeapon()==='battleaxe'&&!rolling&&!player.dancing,phone:economy.state.iphoneEquipped&&!carryingFish&&!rolling&&!player.dancing&&!bike.riding&&!motorcycle?.state.riding&&!ferrari?.state.riding&&!flying()&&!climbing&&!rocketPose&&!(expeditions.state.railgun&&expeditions.state.equipped),carryingFish,railgun:playerWeapon()==='railgun'&&!rolling&&!player.dancing&&!fishing.state.active,bayonet:playerWeapon()==='bayonet'&&!rolling&&!fishing.state.active&&quests.theyLive.state.bayonet&&!skateboard.riding&&!bike.riding&&!motorcycle?.state.riding&&!flying(),height:ferrari?.state.riding?.65:1,mode:rolling?'idle':ferrari?.state.riding?'sit':capture.state.active?'idle':rocketPose?rocketPose.mode:climbing?riderPose.mode:bike.riding?'cycle':motorcycle?.state.riding?'motorcycle':skateboard.riding?'skate':'move',motion:rolling||reduced?0:player.motion,run:rolling?0:player.runBlend,time:reduced?0:t*.001,action:rolling?'forward-roll':capture.state.active?'caught':fishing.state.active?'fish':player.dancing?'dance':trick?'skate-trick':climbing||rocketPose||reduced||actionT>=1?null:gesture?.name,actionT:rolling?forwardRoll.progress:capture.state.active?capture.pose.hands:fishing.state.active?fishing.progress:trick?trick.progress:actionT,ground:rolling||capture.state.active||networkClimb?null:expeditions.ship.aboard?()=>PEQUOD.deck+.01:rocketPose?(riderPose.mode==='climb'?null:()=>rocket.state.position.y+.008):tahoe.state.mode==='gondola'?()=>tahoe.state.position.y+.01:rope.climbing?null:flying()?()=>airship.state.position.y+AIRSHIP_BASKET.floor+.008:onSutro?(riderPose.mode==='climb'?null:()=>sutroClimb.state.position.y+.008):bike.riding||motorcycle?.state.riding||skateboard.riding?null:chase.state.jailed?()=>detention.base+.19:characterGround});
        if(rolling)applyForwardRollMesh(m,riderStart,player.x+.5,base,player.y+.5,player.angle,forwardRoll.progress,chase.state.jailed?()=>detention.base+.18:characterGround,(x,z)=>clearAt(x-.5,z-.5));
        if(!rolling&&!capture.state.active&&inebriation.intensity&&!flying()&&!bike.riding&&!rocket.state.active)swayCharacter(m,riderStart,player.x+.5,base,player.y+.5,t,inebriation.intensity);
        if(fishing.state.active)drawFishingRod(m,{x:player.x+.5,z:player.y+.5,site:fishing.state.site},base,fishing.progress);
        if(carryingFish)pose(m,player.x+.5,base,player.y+.5,player.angle,()=>drawFishBucket(m,.12,.35,.3,0,reduced?0:t*.001));
        if(ferrari?.state.riding)drawFerrari(m,ferrari.position,{occupied:true,travel:ferrari.state.travel});
        if(skateboard.riding)drawPlayerSkateboard(m,player.x+.5,player.y+.5,base-.035,player.angle,skateboard.travel,characterGround,trick);
        if(motorcycle?.state.riding){drawMotorcycle(m,player.x+.5,player.y+.5,base,player.angle,motorcycle.state.travel);pitchMotorcycleMesh(m,riderStart,player.x+.5,base,player.y+.5,player.angle,characterGround);}
        if(bike.riding)bicycle(m,player.x+.5,player.y+.5,base,player.angle,phase);
        if(rocketPose)tiltRocketMesh(m,riderStart,rocket.state.vehicle,rocket.state);
        if(!rolling&&!capture.state.active&&!climbing&&!ferrari?.state.riding&&!bike.riding&&!motorcycle?.state.riding&&!flying()){if(playerLook.cape&&expeditions.state.cape)drawKrakenCape(m,player.x+.5,player.y+.5,base,player.angle,t,signs);if(playerWeapon()==='railgun'&&!player.dancing&&!fishing.state.active)drawRailgun(m,player.x+.5+Math.cos(player.angle)*.08,base+1.14,player.y+.5+Math.sin(player.angle)*.08,player.angle);}
        if(capture.state.active)collapseCharacterMesh(m,riderStart,player.x+.5,base,player.y+.5,player.angle,capture.pose.fall);}
        if(tahoe.state.mode==='gondola')drawGondolaCabin(m,tahoe.state.position,tahoe.state.angle);
        drawRegionalBackdrop(m,player.x+.5,player.y+.5,playerGround());
        const shipPosition=multiplayerWorld?.airshipPosition||(airship.state.active?airship.state.position:{x:AIRSHIP_TERMINAL.boarding.x+.5,y:AIRSHIP_TERMINAL.base+.03,z:AIRSHIP_TERMINAL.boarding.y+.5});
        if(Math.hypot(player.x+.5-shipPosition.x,player.y+.5-shipPosition.z)<110){const start=m.data.length;drawAirship(m,shipPosition,multiplayerWorld?.sharedAirship?.heading??(airship.state.active?airship.state.heading:-Math.PI/2),t,reduced);if(!airship.state.active)pendingAirshipTarget={start,end:m.data.length};}
        const seaX=player.x+.5,seaZ=player.y+.5,seaRadius=350;
        drawOffshoreSea(m,seaBounds,seaX,seaZ,seaRadius);
        drawCoastalSeagulls(m,t,[seaX,seaZ],reduced);
        drawRehabilitationLaser(m,player,base,rehabilitation,t);
        if(player.gesture?.name==='drink'&&t-player.gesture.started<player.gesture.duration)drawDrinkingCoffee(m,player,base,t,player.gesture.started,player.gesture.duration);
        dynamicTargets=[];
        actorTags=[];
        const addTarget=(start,metadata,end=m.data.length)=>{const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=start;i<end;i+=11)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],m.data[i+k]);hi[k]=Math.max(hi[k],m.data[i+k]);}dynamicTargets.push({mesh:m,start:start/11,count:(end-start)/11,lo,hi,...metadata});};
        drawExpeditionActors(m,t,addTarget);for(const monster of wilderness?.actors||[])if(monster.hp>0&&Math.hypot(monster.x-player.x-.5,monster.z-player.y-.5)<40){const start=m.data.length;drawWildMonster(m,monster,t);addTarget(start,{npc:monster});}multiplayerWorld?.draw(m,t,addTarget,actorTags);
        for(const bomb of secretWorld?.bombs||[])drawBombEffect(m,bomb,performance.now(),terrainHeight(bomb.x,bomb.z));
        for(const crash of secretWorld?.crashes||[])drawBomberCrash(m,crash,performance.now());
        if(currentInterior?.id==='freemasons-guild'&&secretStairs){const start=m.data.length;drawSecretStair(m,secretStairs.x,currentInterior.object.base+.065,secretStairs.z,currentInterior.rotation||0);addTarget(start,{sight:secretStairs});}
        if(sandSite&&Math.hypot(sandSite.entry.x-player.x,sandSite.entry.y-player.y)<40){const start=m.data.length;drawBeachSand(m,sandSite,characterGround(sandSite.x,sandSite.z),signs);addTarget(start,{sight:sandSite});}
        if(fishingSite&&Math.hypot(fishingSite.entry.x-player.x,fishingSite.entry.y-player.y)<45){const start=m.data.length;drawFishingSpot(m,fishingSite,t,reduced);addTarget(start,{sight:fishingSite});}
        if(!sunglasses.state.owned&&sunglassesSite&&Math.hypot(sunglassesSite.x-player.x-.5,sunglassesSite.z-player.y-.5)<45){
            const start=m.data.length;drawDroppedSunglasses(m,sunglassesSite,characterGround(sunglassesSite.x,sunglassesSite.z),t,{reduced});addTarget(start,{sight:sunglassesSite});
        }
        if(motorcycle&&!motorcycle.state.riding&&Math.hypot(motorcycle.state.x-player.x,motorcycle.state.y-player.y)<65){const p=motorcycle.state,start=m.data.length,base=characterGround(p.x+.5,p.y+.5)+.025;drawMotorcycle(m,p.x+.5,p.y+.5,base,p.angle,p.travel);pitchMotorcycleMesh(m,start,p.x+.5,base,p.y+.5,p.angle,characterGround);addTarget(start,{sight:sightById('zoo-motorcycle')});}
        if(ferrari&&!ferrari.state.riding){const p=ferrari.position;if(Math.hypot(p.x-player.x-.5,p.z-player.y-.5)<70){const start=m.data.length;drawFerrari(m,p,{travel:ferrari.state.travel});addTarget(start,{sight:sightById('ferrari-car')});}}
        if((!training||gymSelection!=='bench')&&Math.hypot(SF_FITNESS.x-player.x-.5,SF_FITNESS.z-player.y-.5)<50)drawBenchPress(m,t,characterAppearance(playerLook),{reduced,training:false});
        if(bunny&&Math.hypot(bunny.state.x-player.x-.5,bunny.state.z-player.y-.5)<70){const start=m.data.length;bunny.draw(m,t,characterGround,{reduced,cameraAngle:Math.atan2(camera.eye[2]-bunny.state.z,camera.eye[0]-bunny.state.x)});addTarget(start,{sight:bunny.sight});}
        if(skateDog&&Math.hypot(skateDog.state.x-player.x-.5,skateDog.state.z-player.y-.5)<70){
            const start=m.data.length,dog=skateDog.state;skateDog.draw(m,t,characterGround,{reduced});addTarget(start,{sight:skateDog.sight});
            actorTags.push({x:dog.x,z:dog.z,base:characterGround(dog.x,dog.z),height:1.4,speech:'Woof!',speechUntil:dog.speechUntil});
        }
        if(quests.carrying)pose(m,player.x+.5,playerGround()+1.23,player.y+.5,player.angle-Math.PI/2,()=>{pose(m,.28,0,-.12,0,()=>drawMonkey(m,reduced?0:t*.004));});
        if(quests.state.monkey==='completed'&&Math.hypot(player.x-53.8,player.y-173.5)<50)pose(m,53.8,1.625,173.5,0,()=>drawMonkey(m,reduced?0:t*.004));
        if(monkeyKeeper){const k=monkeyKeeper.state,a=k.actor,x=a.x+.5,z=a.y+.5;if(Math.hypot(x-player.x-.5,z-player.y-.5)<65){const start=m.data.length,base=characterGround(x,z);human(m,x,z,base+.07,a.angle,reduced?0:a.travel*Math.PI*2/CHARACTER_CLIPS.run.stride,false,'#bc9470','#8d986a',{pants:'#5b6854',cap:true,backpack:false,mode:'move',motion:a.moving&&!reduced?1:0,run:1,time:reduced?0:t*.001,ground:characterGround});addTarget(start,{npc:keeperNPC});actorTags.push({x,z,base,height:2.05,chasing:monkeyKeeper.active&&!capture.state.active,speech:monkeyKeeper.active?['Stop! Return that monkey!','That primate has a keeper!','Academic recruitment is not an excuse!'][Math.floor(k.elapsed/3)%3]:'',speechUntil:monkeyKeeper.active?Infinity:0});}}
        drawZooAnimals(m,t,terrainHeight,{reduced,monkeyTaken:quests.taken,near:(x,z)=>Math.hypot(x-player.x-.5,z-player.y-.5)<65});
        if(zoo){
            const animal=zoo.state.tiger,near=(x,y)=>Math.hypot(x-player.x,y-player.y)<100;
            if(near(SF_ZOO.x,SF_ZOO.z)){const start=m.data.length;drawTigerGate(m,zooBase,zoo.state.gate);addTarget(start,{sight:sightById('zoo')});}
            if(near(animal.x,animal.y)){
                const start=m.data.length;drawTiger(m,animal,(x,z)=>characterGround(x,z),{reduced});
                addTarget(start,{sight:{id:'tiger',kind:'wild-tiger',label:'Tiger',entry:{x:animal.x,y:animal.y},description:zoo.dangerous?'A magnificent striped cat. Currently reviewing your position on the food chain.':'An excellent tiger. It has never read a single warning sign.'}});
                if(['opening','escaping','loose'].includes(zoo.state.phase))actorTags.push({x:animal.x+.5,z:animal.y+.5,base:characterGround(animal.x+.5,animal.y+.5),height:1.65,chasing:zoo.dangerous&&!capture.state.active});
            }
            const lines=['Stop! We have paperwork!','Pspsps is not working!','You are outside your service area!','This was not in the job description!','Please return to your designated tiger area!','Nobody said there would be cardio!'];
            for(const w of zoo.state.wardens)if(near(w.x,w.y)){
                const base=characterGround(w.x+.5,w.y+.5),speech=w.speechFor>0?w.speech:zoo.state.phase==='loose'&&Math.floor(zoo.state.elapsed/3.5)%2===w.index&&zoo.state.elapsed%3.5<2.7?lines[(Math.floor(zoo.state.elapsed/7)+w.index)%lines.length]:'';
                human(m,w.x+.5,w.y+.5,base+.07,w.angle,reduced?0:w.travel*Math.PI*2/CHARACTER_CLIPS.run.stride,false,w.index?'#ba8b67':'#d4b493','#7a976f',{mode:'move',motion:reduced||!w.moving?0:1,run:1,pants:'#536658',cap:true,uniform:true,backpack:false,time:reduced?0:t*.001,ground:characterGround});
                drawAnimalControlNet(m,w.x+.5,base,w.y+.5,w.angle,reduced?0:t*.001);
                actorTags.push({x:w.x+.5,z:w.y+.5,base,height:2.45,label:'Animal Control',speech,speechUntil:Infinity});
            }
        }
        if(rocket.state.active){const p=rocket.state.vehicle;drawReusableRocket(m,p,t,{occupied:rocket.state.occupied,hatch:rocket.state.hatch,cameraPosition:camera.eye,thrust:rocket.state.thrust,pitch:rocket.state.pitch,heading:rocket.state.heading});}
        else for(const [id,site] of [['sf-spaceport',SF_SPACEPORT],['tahoe-spaceport',tahoe.spaceport]])if(Math.hypot(site.x-player.x-.5,site.z-player.y-.5)<100){const start=m.data.length;drawReusableRocket(m,{x:site.x,y:site.base+.14,z:site.z},t);addTarget(start,{sight:sightById(id)});}
        if(pendingAirshipTarget)addTarget(pendingAirshipTarget.start,{sight:sightById('airship')},pendingAirshipTarget.end);
        drawAirshipRope(m,rope.state,t,reduced);
        if(rope.state.passenger){
            const p=rope.state.passenger,aboard=p.phase==='aboard',ship=airship.state.position||airship.home,a=airship.state.heading;
            human(m,aboard?ship.x-Math.cos(a)*.8:p.x,aboard?ship.z-Math.sin(a)*.8:p.z,aboard?ship.y+.1:p.y,a,aboard?0:p.y*Math.PI*2/.56,false,MERCHANTS.passenger.skin,MERCHANTS.passenger.shirt,{mode:aboard?'idle':'climb',motion:aboard?0:1,backpack:false,time:reduced?0:t*.001});
        }
        whales.draw(m,t,[player.x+.5,player.y+.5],reduced,(start,sight)=>addTarget(start,{sight}));
        if(Math.hypot(player.x+.5-PROMETHEUS.x,player.y+.5-PROMETHEUS.z)<135)drawPrometheusFlame(m,t,reduced);
        bayShipping.draw(m,t,[player.x+.5,player.y+.5],reduced);
        if(!bike.riding){const start=m.data.length;bicycle(m,bike.x+.5,bike.y+.5,terrainHeight(bike.x+.5,bike.y+.5)+.06,.5);addTarget(start,{sight:sightById('bicycle')});}
        drawPacificaWaves(m,waveTime*1000,{x:player.x+.5,z:player.y+.5},{reduced});
        if(!surf.state.riding||surf.state.mode!=='windsurf'){const start=m.data.length,s=sightById('windsurf'),x=s.entry.x+.5,z=s.entry.y+.5;drawWindsurfer(m,x,z,terrainHeight(x,z)+.08,-Math.PI/2,t,{rider:false,reduced:true});addTarget(start,{sight:s});}
        for(let i=0;i<6;i++){
            const fed=t<ducksFedUntil,a=i*2.4+(reduced?0:t*.0001),r=fed?.38:.7,x=fed?POND.x+1.15+Math.cos(a)*.25:POND.x+Math.cos(a)*POND.rx*r,z=fed?POND.y+Math.sin(a)*.25:POND.y+Math.sin(a)*POND.ry*r,h=lakes[0].level+.08,small=i>=4,scale=small?.65:1,start=m.data.length;
            m.sphere(x,h,z,.24*scale,.13*scale,.16*scale,small?'#d4b36d':i%2?'#9d8b6a':'#b0a888',7,3);const hx=x-Math.sin(a)*.19*scale,hz=z+Math.cos(a)*.19*scale;m.sphere(hx,h+.19*scale,hz,.1*scale,.13*scale,.1*scale,small?'#d5c27f':i%2?'#99886b':'#476f4f',7,3);m.sphere(hx-Math.sin(a)*.12*scale,h+.17*scale,hz+Math.cos(a)*.12*scale,.07*scale,.035*scale,.06*scale,'#c79e51',5,3);addTarget(start,{sight:sightById('ducks')});
        }
        if(currentInterior?.id==='ai-lab')drawNeuralLabAnimation(m,currentInterior,currentInterior.object.base+.025,t,{reduced});
        if(nightclub&&Math.hypot(player.x+.5-NIGHTLIFE.x,player.y+.5-NIGHTLIFE.z)<65){const start=m.data.length;drawNightlife(m,nightclub,signs,camera.eye,t,{inside:inNightlife(player.x+.5,player.y+.5),reduced});addTarget(start,{sight:sightById('nightlife')});}
        streetTraffic?.draw(m,{x:player.x+.5,z:player.y+.5},(start,car)=>addTarget(start,{sight:car.sight}));
        if(slowBus){drawTrafficSignalLights(m,slowBus.signals,slowBus.state.clock,{x:player.x+.5,z:player.y+.5});const bus=slowBus.bus;if(Math.hypot(bus.x-player.x-.5,bus.z-player.y-.5)<40){const start=m.data.length;drawSlowBus(m,bus,t,signs);addTarget(start,{sight:bus.sight});}}
        if(deli?.state.pending&&Math.hypot(deli.state.position.x-player.x,deli.state.position.y-player.y)<32)drawDeliveryCooler(m,deli.state,characterGround);
        cityLife.draw(m,t,[player.x+.5,player.y+.5],reduced,(start,npc)=>{addTarget(start,{npc});actorTags.push(npc);});
        southernLife?.draw(m,t,[player.x+.5,player.y+.5],reduced,(start,npc)=>{addTarget(start,{npc});actorTags.push(npc);});
        noeValleyLife?.draw(m,t,[player.x+.5,player.y+.5],reduced,(start,npc)=>{addTarget(start,{npc});actorTags.push(npc);});
        squareLife?.draw(m,t,[player.x+.5,player.y+.5],reduced,(start,npc)=>{addTarget(start,{npc});actorTags.push(npc);});
        esotericCampus?.life?.draw(m,t,[player.x+.5,player.y+.5],reduced,(start,npc)=>{addTarget(start,{npc});actorTags.push(npc);});
        drawEstateResidents(m,southernNeighborhood?.residents||[],t,[player.x+.5,player.y+.5],reduced,(start,npc)=>{addTarget(start,{npc});actorTags.push(npc);});
        drawRestaurantDiners(m,restaurantDiners,t,[player.x+.5,player.y+.5],reduced,(start,npc)=>{addTarget(start,{npc});actorTags.push(npc);});
        if(Math.hypot(TWITTER_HQ.x-player.x-.5,TWITTER_HQ.z-player.y-.5)<30)drawBottlePostAnimation(m,t,southernTerrain,merchants,{reduced,addTarget:(start,npc)=>{addTarget(start,{npc});actorTags.push(npc);}});
        for(const npc of merchants){
            if(npc.interior&&npc.interior!==currentInterior)continue;
            if(npc.kind==='twitter-worker'||npc.kind==='twitter-poster')continue;
            if(npc.expeditionDead)continue;
            if(quests.theyLive.isDefeated(npc.alienId)&&(!npc.defeatAt||t-npc.defeatAt>750))continue;
            if(Math.hypot(npc.x-player.x-.5,npc.z-player.y-.5)>32||!actorInView(npc.x,npc.z,npc.base))continue;
            const walking=(npc.researcher||npc.roam)&&npc.motion>.01;
            const start=m.data.length,g=npc.gesture,gt=g?(t-g.started)/g.duration:1;if(npcRevealed(npc))drawSpectre(m,npc,t);else human(m,npc.x,npc.z,npc.base,npc.angle,walking&&!reduced?(npc.phase||0):0,false,npc.skin,npc.shirt,{sunglasses:!!npc.sunglasses,phone:npc.phone,alien:npcRevealed(npc),action:npc.defeatAt?'caught':npc.thinking?'ponder':gt<1?g.name:null,actionT:npc.defeatAt?1:gt,mode:npc.seated?'sit':walking?'move':'idle',hat:npc.hat,female:!!npc.female,longHair:!!npc.longHair,hairstyle:npc.hairstyle,hair:npc.hair,motion:reduced?0:npc.motion||0,ground:npc.roam?characterGround:null,backpack:false,cap:npc.kind==='crew'||!!npc.cap,uniform:npc.kind==='crew',time:reduced?0:t*.001,pants:npc.pants||(npc.kind==='tax'?'#c7a752':npc.kind==='crew'?'#35465c':'#555e55'),coat:npc.kind==='tax'||!!npc.coat,topHat:npc.kind==='tax',chef:npc.kind==='chef',gilded:npc.kind==='tax'});if(npc.defeatAt)collapseCharacterMesh(m,start,npc.x,npc.base,npc.z,npc.angle,Math.min(1,(t-npc.defeatAt)/700));else addTarget(start,{npc});if(npc.regional)actorTags.push(npc);
        }
        if(currentInterior===niaCitizen.interior)actorTags.push(niaCitizen);
        for(const npc of parrots){if(Math.hypot(npc.x-player.x-.5,npc.z-player.y-.5)>35)continue;const start=m.data.length;drawParrot(m,npc,t,reduced);addTarget(start,{npc});}
        if(Math.hypot(NAVY_SHIP.x-player.x-.5,NAVY_SHIP.z-player.y-.5)<100)drawNavyShip(m,t,reduced);
        for(const npc of jailStaff){if(Math.hypot(npc.x-player.x-.5,npc.z-player.y-.5)>25)continue;const start=m.data.length;npc.base=detention.terrain(npc.x,npc.z)+.07;human(m,npc.x,npc.z,npc.base,npc.angle,0,false,npc.skin,npc.shirt,{hair:npc.hair,coat:true,backpack:false,pants:npc.medical?'#6c8693':'#33353f',time:reduced?0:t*.001});if(npc.medical){m.rod([npc.x-.12,npc.base+1.4,npc.z+.15],[npc.x+.12,npc.base+1,npc.z+.15],.015,'#496675',8);m.sphere(npc.x+.12,npc.base+1,npc.z+.15,.05,.05,.018,'#9daeb3',12,6);}addTarget(start,{npc});}
        const detained=chase.state.jailed&&!capture.state.active;
        const officers=detained?[{x:detention.x-3.5,y:detention.z+2.8,angle:-Math.PI/2,index:0,phase:0},{x:detention.x+3,y:detention.z+2.8,angle:-Math.PI/2,index:1,phase:0}]:chase.state.officers;
        for(const o of officers){
            if(Math.hypot(o.x-player.x,o.y-player.y)>27)continue;
            const start=m.data.length,water=surf.water(o.x+.5,o.y+.5),base=water?.06:detained?detention.terrain(o.x+.5,o.y+.5)+.07:terrainHeight(o.x+.5,o.y+.5)+.07;
            if(water)drawWindsurfer(m,o.x+.5,o.y+.5,base,o.angle,t,{police:true,moving:!detained,reduced});
            else human(m,o.x+.5,o.y+.5,base,o.angle,reduced?0:o.phase*Math.PI*2/(10*CHARACTER_CLIPS.run.stride),false,'#ba9476','#304b66',{pants:'#2d4055',cap:true,uniform:true,backpack:false,mode:'move',motion:reduced||detained?0:1,run:1,time:reduced?0:t*.001,ground:detained?(x,z)=>detention.terrain(x,z)+.01:characterGround});
            let officer=policeActors.get(o.index);if(!officer){officer={id:'personal-police-'+o.index,label:'Police',police:true,kind:'police',height:1.95,description:'A tireless police officer. Their cardio budget is apparently unlimited.'};policeActors.set(o.index,officer);}Object.assign(officer,{x:o.x+.5,z:o.y+.5,base,angle:o.angle});addTarget(start,{npc:officer});
            const phrases=['Stop!','You are under arrest!','Stop right there!'],speaking=Math.floor(chase.state.elapsed/2.8)%3===o.index,speech=!detained&&speaking&&chase.state.elapsed%2.8<2.25?phrases[Math.floor(chase.state.elapsed/2.8)%phrases.length]:'';
            actorTags.push({x:o.x+.5,z:o.y+.5,base,height:water?3.3:1.95,label:'Police',police:true,chasing:chase.state.wanted&&!detained&&!capture.state.active,speech,speechUntil:Infinity});
        }
        const travel=reduced?.5:(t*.000014)%2,f=travel<=1?travel:2-travel,car=alongStreet(market,f),next=alongStreet(market,Math.max(.0001,Math.min(.9999,f+(travel<=1?.001:-.001)))),angle=Math.atan2(next.y-car.y,next.x-car.x);
        drawStreetcar(m,car.x,terrainHeight(car.x,car.y)+.05,car.y,angle);
        drawHillsideLifts(m,t,reduced);
        return m;
    }
    function drawCombatFeedback(){
        const entries=[],game=expeditions,target=alienCombat?.npc||multiplayerWorld?.combatTarget||game.state.target;
        if(alienCombat)entries.push({target,hp:alienCombat.battle.state.hp,max:alienCombat.battle.state.max});
        else if(target?.max)entries.push({target,hp:target.hp,max:target.max});
        if(game.raptor.phase==='loose'&&game.raptor.prey?.isPlayer&&!entries.some(a=>a.target===game.raptor))entries.push({target:game.raptor,hp:game.raptor.hp,max:game.raptor.max});
        if(game.ship.aboard&&game.ship.phase==='fighting'&&!entries.some(a=>a.target===game.kraken))entries.push({target:game.kraken,hp:game.kraken.hp,max:game.kraken.max});
        if(entries.length)entries.push({target:player,hp:health.state.hp,max:health.state.max});
        combatFeedback.engage(entries);
        const visible=combatFeedback.entries().map(a=>a.target===player?{...a,hp:health.state.hp,max:health.state.max}:a);
        combatOverlay.draw(visible,n=>n===player?{x:player.x+.5,y:playerGround()+2.35,z:player.y+.5}:{x:n.x,y:(n.base??characterGround(n.x,n.z))+(n.height??(n.combatKind==='kraken'?3.4:n.combatKind==='cow'?1.7:n.combatKind==='raptor'?2:2.35)),z:n.z},project,width,height);
    }
    function drawActorLabels(t){
        let used=0;
        for(const actor of actorTags){
            const marked=!!actor.chasing;
            if(!marked&&!actor.player&&!(actor.speech&&t<actor.speechUntil))continue;
            if(!marked&&Math.hypot(actor.x-player.x-.5,actor.z-player.y-.5)>13)continue;
            const head=[actor.x,actor.base+actor.height,actor.z],p=project(...head);
            if(p.distance<=0||p.depth>1||p.x<0||p.x>width||p.y<0||p.y>height)continue;
            if(!marked){const ray=mouseRay(p.x,p.y),distance=Math.hypot(...head.map((v,i)=>v-camera.eye[i]));if(objects.some(o=>{if(o.sight?.id===activeInstituteRoom()?.id||o.sight?.id==='pacifica-park'&&inPacificaPark(player.x+.5,player.y+.5)||o.sight?.kind==='nightlife'&&inNightlife(player.x+.5,player.y+.5)||o.place&&o.place===currentInterior||!o.arch&&!o.solid)return false;const d=rayBox(ray,o.lo,o.hi);return d!==null&&d<distance-.4;}))continue;}
            let tag=labelPool[used++];
            if(!tag){const el=document.createElement('div'),speech=document.createElement('span'),arrow=document.createElement('span'),name=document.createElement('span');el.className='sf-actor-label';speech.className='sf-speech';arrow.className='sf-police-arrow';arrow.textContent='▼';el.append(speech,arrow,name);$('sf-actor-labels').append(el);tag={el,speech,arrow,name};labelPool.push(tag);}
            tag.el.hidden=false;tag.el.style.left=p.x+'px';tag.el.style.top=p.y+'px';tag.name.hidden=!actor.police&&!actor.player;tag.name.textContent=actor.police||actor.player?actor.label:'';tag.name.className=actor.player?'sf-player-name':'';tag.name.dataset.pvp=String(!!actor.pvp);tag.arrow.hidden=!marked;tag.speech.textContent=t<actor.speechUntil?actor.speech||'':'';
        }
        for(let i=used;i<labelPool.length;i++)labelPool[i].el.hidden=true;
        const speech=$('sf-player-speech');speech.hidden=t>=playerSpeechUntil;
        if(!speech.hidden){let head={x:player.x+.5,y:playerGround()+2.15,z:player.y+.5};if(rocket.state.active)head=rocketFlightPoint(head,rocket.state.vehicle,rocket.state);const at=project(head.x,head.y,head.z);speech.hidden=at.distance<=0||at.depth>1;if(!speech.hidden){speech.style.left=at.x+'px';speech.style.top=at.y+'px';}}

    }
    function render(t,dt){
        if(!active||!built||gl.isContextLost())return;frameMeter.sample(t);combatFeedback.update(dt);update(dt,t);bankMenu?.update();debugConsole.update();frameID++;gpuStats.drawCalls=0;
        const underground=secretWorld?.kind==='illuminati',publicMap=secretWorld?.kind==='world',nearCity=publicMap&&Math.hypot(player.x-N/2,player.y-N/2)<220;if(nearCity)renderShadows();gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(underground?.12:.56,underground?.16:.7,underground?.14:.73,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);gl.uniformMatrix4fv(program.vp,false,camera.matrix);gl.uniform3fv(program.eye,camera.eye);gl.uniform3fv(program.focus,camera.target);gl.uniform1f(program.time,reduced?0:t*.001);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,atlasTexture);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,shadowTexture);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,materialTexture);for(const [i,texture] of alpineTextures.entries()){gl.activeTexture(gl.TEXTURE3+i);gl.bindTexture(gl.TEXTURE_2D,texture);}gl.activeTexture(gl.TEXTURE0);gl.uniformMatrix4fv(program.light,false,shadowMatrix);gl.uniform1f(program.shadows,publicMap&&shadowFramebuffer?1:0);
        glazing.begin();gl.uniform1f(program.glassPass,0);
        if(nearCity){drawGPU(groundGPU);drawGPU(sceneGPU);drawBuildings();}
        if(publicMap&&nearTahoe(player.x+.5,player.y+.5,500))drawGPU(tahoeGPU);
        if(publicMap)drawGPU(highwayGPU);
        if(underground){drawGPU(caveGPU);for(const w of caveGPU.walls)if(w.dx*camera.back[0]+w.dz*camera.back[2]<0)drawGPU(w.gpu);}
        const dynamic=makeActors(t);
        gl.bindBuffer(gl.ARRAY_BUFFER,dynamicGPU.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(dynamic.data),gl.DYNAMIC_DRAW);dynamicGPU.count=dynamic.data.length/11;drawGPU(dynamicGPU);drawGlazing();if(publicMap&&lampGlow.draw(camera))gpuStats.drawCalls++;drawActorLabels(t);drawCombatFeedback();drawPlaceMarkers(t);publishMultiplayerPose();
    }

    function frame(t){if(!active)return;const dt=Math.min((t-last)/1000,.075);last=t;render(t,dt);raf=requestAnimationFrame(frame);}
    function startLoop(){cancelAnimationFrame(raf);last=performance.now();trainingLast=last;raf=requestAnimationFrame(frame);}
    async function setMode(on) {
        if(!on&&bankMenu?.active)bankMenu.close();
        tech.suspend();social.suspend();
        if(!on)debugConsole?.close();
        if(!on){aiInterview?.close();forwardRoll.cancel();}
        if(on===active)return;active=on;
        if(on){scrollBefore=scrollY;world.hidden=false;document.body.classList.add('sf-mode');classic.inert=true;classic.setAttribute('aria-hidden','true');if(!built){world.inert=true;loading?.show();await loading?.stage(4,'Connecting to your world…');await buildForBrowser();world.inert=false;}resize();updateCamera();render(performance.now(),0);await loading?.done();canvas.focus({preventScroll:true});startLoop();}
        else{fishing.cancel();parkMotorcycle(false);monkeyKeeper?.save();if(training)stopTraining();if(ferrari?.state.riding)parkFerrari();strength.save();questMenu?.close();closeCharacter();setDancing(false);dialogue.close();const rocketEntry=rocket.state.active?rocket.state.from.entry:null;rocket.cancel();updateRocketControls();if(rocketEntry)Object.assign(player,rocketEntry);rope.reset();const landing=airship.cancel(),entry=sutroClimb.cancel();if(landing){player.x=landing.x;player.y=landing.y;}else if(entry){player.x=entry.x-.5;player.y=entry.z-.5;}updateClimbButton();cancelAnimationFrame(raf);keys.clear();pointers.clear();clearTimeout(pressTimer);gesture=false;hovered=null;currentInterior=null;readerPlace=null;world.classList.remove('sf-reading');$('sf-hover').hidden=true;player.path=[];player.speed=0;action=null;closeMenu();$('sf-reader').hidden=true;$('sf-help').hidden=true;$('sf-reader-shade').hidden=true;playerSpeechUntil=0;$('sf-player-speech').hidden=true;world.hidden=true;document.body.classList.remove('sf-mode');classic.inert=false;classic.removeAttribute('aria-hidden');window.scrollTo(0,scrollBefore);$('sf-toggle').focus({preventScroll:true});}
        $('sf-toggle').setAttribute('aria-pressed',String(on));$('sf-toggle-label').textContent=on?'Classic page':'Explore SF';
    }
    let carArrival=null;
    function parkCarFirst(){announce('Park the Ferrari with R before doing that.','Ferrari');return false;}
    function updateAdventureUI(){
        if(headless)return;
        const tablets=tabletService?.inventory()||{};for(const id of TABLET_PLACES){const b=$('sf-tablet-'+id);b.hidden=!tablets[id];b.disabled=!!tabletService?.state.active||!canUseTablet();b.textContent=(id==='tahoe'?'Tahoe':'Downtown')+' tablet · '+(tablets[id]||0);b.title='Break a '+id+' teleportation tablet';}
        const coffee=bankService?.snapshot().coffee||0;$('sf-drink-coffee').hidden=!coffee;$('sf-drink-coffee').disabled=capture.state.active||!!secretWorld?.bomber.state.active||!!chase?.state.jailed;
        const bankBalance=bankService?.snapshot().balance||0;$('sf-bank-character').textContent='Green Bank · '+bankBalance.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+' coins deposited · 5% per hour';
        const aircraft=!!secretWorld?.bomber.state.active,parachuting=secretWorld?.bomber.state.phase==='parachuting',bombSeconds=secretWorld?.bomber.bombSeconds||0;$('sf-bomber-controls').hidden=!aircraft;$('sf-bomber-bomb').disabled=!aircraft||parachuting||bombSeconds>0||!multiplayer?.state.connected&&!!multiplayer;$('sf-bomber-bomb').textContent=bombSeconds?'Reloading · '+bombSeconds+'s':'Drop bomb · Space';$('sf-bomber-land').disabled=parachuting;$('sf-bomber-flight').textContent=parachuting?'Parachuting to safety':secretWorld?.bomber.state.boost?'B-2 · Rocket-speed boost':'Personal B-2 · Hold Shift to boost';
        const layer=$('sf-instance-level'),kind=secretWorld?.kind||'world';layer.hidden=kind==='world';layer.textContent=kind==='illuminati'?'Underground · Private hangar':'Private kraken waters';
        updatePhoneControl();
        const pitch=social.state.pitch,sales=$('sf-sales-status');sales.hidden=!pitch;if(pitch){const text='Sales pitch · '+Math.ceil(pitch.remaining)+'s · '+Math.round(pitch.chance*100)+'% chance';if(sales.textContent!==text)sales.textContent=text;}
        const phone=$('sf-phone-status'),cab=$('sf-robotaxi-status');phone.hidden=!economy.state.iphoneOwned;cab.hidden=!economy.state.robotaxiOwned;
        const phoneText=economy.state.iphoneEquipped?'iPhone · +25% earnings · −5 HP in '+Math.ceil(120-tech.state.doomElapsed)+'s':'iPhone · put away';if(phone.textContent!==phoneText)phone.textContent=phoneText;
        const cabText='Robotaxi · '+(economy.state.iphoneEquipped?25:20)+' coins/min · fare in '+Math.ceil(60-tech.state.taxiElapsed)+'s';if(cab.textContent!==cabText)cab.textContent=cabText;
        $('sf-roll-button').disabled=forwardRoll.state.active||!canForwardRoll();
        if(fishing.state.active&&(player.path.length||bike.riding||motorcycle?.state.riding||skateboard.riding||surf.state.riding||ferrari?.state.riding||rocket.state.active||flying()||rope.climbing||sutroClimb.state.active||training||capture.state.active||chase?.state.jailed||currentInterior))fishing.cancel();
        if(motorcycle?.state.riding&&(bike.riding||surf.state.riding||ferrari?.state.riding||rocket.state.active||flying()||rope.climbing||sutroClimb.state.active||tahoe.state.mode!=='ground'||chase?.state.jailed||training||currentInterior))motorcycle.park(player.x,player.y,player.angle);
        const motor=$('sf-motorcycle-button');motor.hidden=!motorcycle?.state.rented;motor.disabled=!!(capture.state.active||chase?.state.jailed||rocket.state.active);motor.setAttribute('aria-pressed',String(!!motorcycle?.state.riding));const motorText=motorcycle?.state.riding?'Park motorcycle · M':'Motorcycle · M';if(motor.textContent!==motorText)motor.textContent=motorText;
        if(skateboard.riding&&(bike.riding||motorcycle?.state.riding||surf.state.riding||ferrari?.state.riding||rocket.state.active||flying()||rope.climbing||sutroClimb.state.active||tahoe.state.mode!=='ground'||chase?.state.jailed||training||currentInterior))skateboard.riding=false;
        const q=quests.theyLive.state,items=[q.evidence&&!q.permit?'Alien Evidence Certificate':null,q.permit?'Alien-removal permit':null,q.bayonet?'Bayonet':null,q.skateboard?'Skateboard':null].filter(Boolean).join(' · ');
        const inventory=$('sf-quest-inventory');inventory.hidden=!items;if(inventory.textContent!==items)inventory.textContent=items;
        const skate=$('sf-skateboard-button');skate.hidden=!q.skateboard;skate.disabled=!!(capture.state.active||chase?.state.jailed||rocket.state.active);skate.setAttribute('aria-pressed',String(skateboard.riding));const skateText=skateboard.riding?'Put away board · K':'Skateboard · K';if(skate.textContent!==skateText)skate.textContent=skateText;
        $('sf-skate-tricks').hidden=!skateboard.riding;for(const button of world.querySelectorAll('[data-skate-trick]'))button.disabled=skateTricks.state.active||capture.state.active||chase?.state.jailed;
        const employment=$('sf-employment'),working=aiLabJob.state.hired&&placeAt(player.x,player.y)?.id==='ai-lab';employment.hidden=!aiLabJob.state.hired;const jobText=working?(economy.state.iphoneEquipped?'AI Lab · earning 1.25 coins / 2s':'AI Lab · earning 1 coin / 2s'):'AI Lab · employed';if(employment.textContent!==jobText)employment.textContent=jobText;
        const railgun=$('sf-railgun-button');railgun.hidden=!expeditions.state.railgun;railgun.textContent=playerWeapon()==='railgun'?'Railgun equipped · G':'Equip railgun · G';railgun.setAttribute('aria-pressed',String(playerWeapon()==='railgun'));
        const hpText='Hitpoints '+health.state.hp+'/'+health.state.max,enemy=alienCombat?.battle.state||multiplayerWorld?.combatTarget||(expeditions.state.target?.max?expeditions.state.target:null);
        if($('sf-hitpoints-text').textContent!==hpText)$('sf-hitpoints-text').textContent=hpText;
        $('sf-hitpoints-meter').value=health.state.hp;
        $('sf-enemy-health').hidden=!enemy;if(enemy)$('sf-enemy-health').textContent=(alienCombat?'Green spectre':npcLabel(multiplayerWorld?.combatTarget||expeditions.state.target))+' · '+enemy.hp+'/'+enemy.max+' HP';
        const food=$('sf-eat-sandwich');food.hidden=!deli?.state.sandwiches;food.textContent='Eat sandwich · '+(deli?.state.sandwiches||0);food.disabled=health.state.hp===health.state.max||capture.state.active;
        const order=$('sf-order-doordash');order.disabled=!!deli?.state.pending||capture.state.active||chase?.state.jailed;order.textContent=deli?.state.pending?'DoorDash en route…':'DoorDash · 4 coins';
        const guild=guildStatus(),guildText=(guild.member?'Freemasons’ Guild · Member':'Freemasons’ Guild · Rank '+(guild.rank||1)+' · '+(guild.visits||0)+'/24 promotions')+' · '+guild.peptides+' peptides';if($('sf-guild-status').textContent!==guildText)$('sf-guild-status').textContent=guildText;
        const s=strength.status,text='Strength Level '+s.level+(s.next?' · '+s.percent.toFixed(1)+'% to '+s.next:' · Maximum level');
        if($('sf-strength-text').textContent!==text)$('sf-strength-text').textContent=text;
        $('sf-strength-progress').value=s.percent;$('sf-strength-progress').setAttribute('aria-label',s.next?s.percent.toFixed(1)+'% toward strength level '+s.next:'Strength level 10');
        $('sf-gym-button').textContent=training?'Stop training':'SF Fitness';
        const wave=surf.state.riding&&surf.state.mode==='surf';$('sf-wave-controls').hidden=!wave;
        if(wave){const r=waveSurf.state.ride,riding=!!r,status=(riding?'Riding wave':'Paddling')+' · '+waveSurf.state.score+' points',label=riding?'Air 360 · Space':'Catch wave · Space';if($('sf-wave-status').textContent!==status)$('sf-wave-status').textContent=status;if($('sf-wave-catch').textContent!==label)$('sf-wave-catch').textContent=label;$('sf-wave-catch').disabled=riding&&(!!waveSurf.state.trick||r.elapsed<.4||r.duration-r.elapsed<1.15);for(const b of world.querySelectorAll('[data-surf-trick]')){const t=SURF_TRICKS.find(t=>t.id===b.dataset.surfTrick);b.disabled=!riding||!!waveSurf.state.trick||r.elapsed<.4||r.duration-r.elapsed<t.duration+.1;}}
        updateSurfButton();
        $('sf-ferrari-button').textContent=ferrari?.state.riding?'Park Ferrari · R':'Ferrari · R';
        $('sf-fuel-card').hidden=!ferrari?.state.riding;
        if(ferrari){$('sf-fuel-meter').value=ferrari.state.fuel;$('sf-fuel-text').textContent=Math.round(ferrari.state.fuel*100)+'% gas';}
    }
    function nearestFuel(){if(!ferrari)return null;return ferrari.stations.reduce((best,s)=>!best||Math.abs(s.distance-ferrari.state.distance)<Math.abs(best.distance-ferrari.state.distance)?s:best,null);}
    function driveFerrari(x,y,onArrival=null){
        if(!ferrari?.state.riding)return false;
        if(ferrari.state.fuel<=0){const s=nearestFuel();if(s&&Math.abs(s.distance-ferrari.state.distance)<=6)return useFuel(sightById(s.id));announce('Out of gas. Park with R, walk to a gas station for a fuel can, then bring it back.','Ferrari');return false;}
        carArrival=onArrival;setDancing(false);closeMenu();closeReader();
        const accepted=ferrari.driveTo(x+.5,y+.5);if(accepted){const p=ferrari.sample(ferrari.state.target);destination={x:p.x-.5,y:p.z-.5};}return accepted;
    }
    function parkFerrari(){
        if(!ferrari?.state.riding)return false;
        const p=ferrari.position;ferrari.park();carArrival=null;Object.assign(player,{x:p.x-.5,y:p.z-.5,path:[],speed:0,moving:false,motion:0});destination=null;updateAdventureUI();return true;
    }
    function useFerrari(){
        if(!ferrari||capture.state.active||rocket.state.active||chase?.state.jailed||rope.climbing||sutroClimb.state.active||tahoe.state.mode!=='ground'||surf.state.riding)return false;
        if(flying())return airshipUnavailable();if(training)stopTraining();
        if(ferrari.state.riding){parkFerrari();announce('You park the Ferrari. It will be waiting here.','Ferrari');return true;}
        const p=ferrari.position,mount=()=>{
            parkMotorcycle(false);
            if(bike.riding)parkBike();setDancing(false);player.path=[];player.speed=0;player.motion=0;player.gesture=null;currentInterior=null;action=null;destination=null;
            ferrari.mount();player.x=p.x-.5;player.y=p.z-.5;player.angle=p.angle;updateAdventureUI();closeMenu();closeReader();
            announce('The Ferrari does twenty times walking speed. Click the road or minimap to drive, or use Drive to Tahoe. Keep an eye on the gas gauge. R parks.','Ferrari');canvas.focus({preventScroll:true});
        };
        if(Math.hypot(player.x+.5-p.x,player.y+.5-p.z)<1.8){mount();return true;}
        return walkTo(p.x-.5,p.z-.5,mount);
    }
    function useFuelCan(){
        if(!ferrari||capture.state.active||rocket.state.active||chase?.state.jailed||rope.climbing||sutroClimb.state.active||tahoe.state.mode!=='ground'||surf.state.riding)return false;
        if(flying())return airshipUnavailable();
        if(!economy.state.fuelCans){announce('Pick up a fuel can at a gas station.','Fuel');return false;}
        closeMenu();closeReader();
        const pour=()=>{const result=refuelFerrariFromCan(ferrari,economy);announce(result.message,'Fuel');updateAdventureUI();return result.ok;};
        const p=ferrari.position;
        if(ferrari.state.riding||Math.hypot(player.x+.5-p.x,player.y+.5-p.z)<1.8)return pour();
        return walkTo(p.x-.5,p.z-.5,pour);
    }
    function useFuel(site,npc=null){
        if(!site||!ferrari)return false;
        npc=npc||merchants.find(n=>n.kind==='fuel-attendant'&&n.siteId===site.id);if(!npc)return false;
        if(capture.state.active||rocket.state.active||chase?.state.jailed||rope.climbing||sutroClimb.state.active||tahoe.state.mode!=='ground')return false;
        if(flying())return airshipUnavailable();
        const go=()=>{
            closeReader();closeMenu();player.path=[];player.speed=0;keys.clear();npc.hold=3;
            dialogue.open({...npc,...createFuelDialogue(site,ferrari,economy,updateAdventureUI),name:npc.name});return true;
        };
        if(ferrari.state.riding){
            if(Math.hypot(player.x+.5-npc.x,player.y+.5-npc.z)<=1.8)return go();
            if(ferrari.state.fuel>0)return driveFerrari(npc.x-.5,npc.z-.5,go);
            parkFerrari();
        }
        return approachNPC(npc,go);
    }
    function stopTraining(){
        if(!training)return;training=false;strength.save();Object.assign(player,{x:SF_FITNESS.entry.x,y:SF_FITNESS.entry.y,path:[],speed:0,moving:false,motion:0});updateAdventureUI();
    }
    function setGymExercise(id){
        gymSelection=gymExercise(id).id;if(!headless)try{localStorage.setItem('sf-gym-exercise-v1',gymSelection);}catch{}
        if(training){const p=gymExercisePosition(gymSelection);player.x=p.x-.5;player.y=p.z-.5;announce('You switch to '+gymExercise(gymSelection).label.toLowerCase()+'.','Gym');}
        updateAdventureUI();
    }
    function useGym(exercise){
        const chosen=typeof exercise==='string'&&GYM_EXERCISES.some(e=>e.id===exercise);if(chosen)setGymExercise(exercise);
        if(training){if(chosen)return true;stopTraining();return true;}
        if(ferrari?.state.riding)return parkCarFirst();
        if(capture.state.active||rocket.state.active||chase?.state.jailed||flying()||bike.riding||surf.state.riding||rope.climbing||sutroClimb.state.active||tahoe.state.mode!=='ground')return false;
        if(strength.status.level===10){announce('You have reached strength level 10. Sand Hill Road Capital Partners is ready to fund you.','Gym');return true;}
        const begin=()=>{parkMotorcycle(false);const spot=gymExercisePosition(gymSelection);closeReader();closeMenu();setDancing(false);training=true;trainingLast=performance.now();Object.assign(player,{x:spot.x-.5,y:spot.z-.5,path:[],speed:0,moving:false,motion:0});action=null;destination=null;updateAdventureUI();announce('You begin '+gymExercise(gymSelection).label.toLowerCase()+'. Every exercise earns the same strength XP. Choose another exercise to switch, or Stop training / Escape to finish.','Gym');};
        if(Math.hypot(player.x-SF_FITNESS.entry.x,player.y-SF_FITNESS.entry.y)<2){begin();return true;}
        return walkTo(SF_FITNESS.entry.x,SF_FITNESS.entry.y,begin);
    }
    function talkCapital(){
        if(ferrari?.state.riding)return parkCarFirst();
        const begin=()=>{
            const s=strength.status;
            dialogue.open({...MERCHANTS.capital,intro:strength.state.funded?'We already funded your company. We look forward to your extremely strong quarterly results.':'Strength level '+s.level+'. We invest 1,000 coins in founders who reach level 10. SF Fitness is just east of the zoo.',question:s.level<10?'Train at SF Fitness, then come back at strength level 10.':'Accept 1,000 coins of funding?',choice:'Accept funding · 1,000 coins',decline:'Leave',receipt:'One thousand coins. Strong founder, strong conviction. Congratulations!',accept:()=>strength.claim(economy)});
        };
        return approachNPC(merchants.find(n=>n.kind==='capital'),begin);
    }
    function setDancing(value){player.dancing=value;if(!headless){$('sf-dance-button').setAttribute('aria-pressed',String(value));$('sf-dance-button').title=value?'Stop dancing (D)':'Dance (D)';}}
    function dance(){
        forwardRoll.cancel();
        if(secretWorld?.bomber.state.active||ferrari?.state.riding||training||capture.state.active||rocket.state.active||sutroClimb.state.active&&sutroClimb.state.phase!=='top'||rope.climbing||bike.riding||motorcycle?.state.riding||surf.state.riding||tahoe.state.mode!=='ground'){announce('Find your feet before dancing.','You');return false;}
        fishing.cancel();skateboard.riding=false;alienCombat=null;closeMenu();basket.state.target=null;basketArrival=null;player.path=[];player.speed=0;player.motion=0;player.gesture=null;action=null;destination=null;setDancing(!player.dancing);
        if(player.dancing&&inNightlife(player.x+.5,player.y+.5))for(const [i,npc] of restaurantDiners.filter(n=>n.club).entries()){
            npc.speech=i?'Wow! Good moves!':'Good moves! You’ve got rhythm.';npc.speechUntil=performance.now()+3500;announce('“'+npc.speech+'”',npc.label);
        }
        canvas.focus({preventScroll:true});return true;
    }
    function canForwardRoll(){
        return active&&!secretWorld?.bomber.state.active&&!capture.state.active&&!rehabilitation.state.active&&!training&&!rocket.state.active&&!sutroClimb.state.active&&!rope.climbing&&!flying()&&!ferrari?.state.riding&&!bike.riding&&!motorcycle?.state.riding&&!skateboard.riding&&!surf.state.riding&&tahoe.state.mode==='ground'&&!dialogue.active&&!aiInterview.visible&&!questMenu?.active&&$('sf-help').hidden&&$('sf-character').hidden;
    }
    function rollForward(){
        if(forwardRoll.state.active||!canForwardRoll())return false;
        if(!player.path.length){
            const target=forwardRollTarget(player,player.angle,WALK_SPEED*FORWARD_ROLL_SPEED*FORWARD_ROLL_DURATION,(from,to)=>chase?.state.jailed?detention.path(from,to)?.length===1:canTravel(from.x,from.y,to.x,to.y));
            if(!target||Math.hypot(target.x-player.x,target.y-player.y)<.4){announce('There is no room to roll forward. Face some open ground.','You');return false;}
            player.path=[target];destination={...target};action=null;
        }
        fishing.cancel();alienCombat=null;setDancing(false);player.gesture=null;closeMenu();closeReader();
        forwardRoll.start();player.speed=WALK_SPEED*FORWARD_ROLL_SPEED;canvas.focus({preventScroll:true});return true;
    }
    function updateSunglassesControl(){
        const input=world.querySelector('[data-character="sunglasses"]');input.disabled=!sunglasses.state.owned;input.checked=playerLook.sunglasses;
        $('sf-sunglasses-hint').textContent=sunglasses.state.owned?'Wear them to reveal alien disguises and the billboards’ hidden commands.':'Find a pair on Ocean Beach to unlock.';
    }
    function updatePhoneControl(){
        if(headless)return;const input=$('sf-iphone-equipped');input.disabled=!economy.state.iphoneOwned;input.checked=economy.state.iphoneEquipped;
        const text=economy.state.iphoneOwned?'When equipped: +25% earnings; 5 HP per 2 minutes. Death or arrest loses the phone.':'Buy an iPhone for 100 coins from Tim Apple at the southern donut campus.';
        if($('sf-iphone-hint').textContent!==text)$('sf-iphone-hint').textContent=text;
    }
    function updateHatControl(){
        if(headless)return;const field=world.querySelector('[data-character="hat"]');field.replaceChildren();
        for(const h of [{id:'none',name:'No hat'},...HAT_CATALOG.filter(h=>economy.state.ownedHats.includes(h.id))]){
            const option=document.createElement('option');option.value=h.id;option.textContent=h.name+(h.prestige?' · '+h.prestige:'');field.append(option);
        }
        field.value=playerLook.hat;
        $('sf-hat-hint').textContent=economy.state.ownedHats.length?economy.state.ownedHats.length+' hats owned. Wear any of them, or choose No hat.':'Visit the haberdasher just north of the GPU Factory to buy hats.';
    }
    function wearHat(id){
        if(!ownedHat(economy.state.ownedHats,id))return false;
        playerLook=normalizeCharacter({...playerLook,hat:id});if(!headless){try{localStorage.setItem('sf-character-v1',JSON.stringify(playerLook));}catch{}updateHatControl();if(!$('sf-character').hidden)drawCharacterPreview($('sf-character-preview'),{...playerLook,phone:economy.state.iphoneEquipped});}return true;
    }
    function updateEquipmentControl(){
        if(headless)return;for(const [key,id] of [['iceTop','ice-top'],['icePants','ice-pants']]){const field=world.querySelector('[data-character="'+key+'"]');field.disabled=!equipmentOwned(economy.state,id);if(field.disabled)playerLook[key]=false;field.checked=playerLook[key];}
        const field=world.querySelector('[data-character="weapon"]');for(const option of field.options)option.disabled=option.value==='battleaxe'?!equipmentOwned(economy.state,'battleaxe'):option.value==='bayonet'?!quests.theyLive.state.bayonet:option.value==='railgun'?!expeditions.state.railgun:false;
    }
    function updateCapeControl(){const field=world.querySelector('[data-character="cape"]');field.disabled=!expeditions.state.cape;field.checked=playerLook.cape;$('sf-cape-hint').textContent=expeditions.state.cape?KRAKEN_CAPE_TEXT:'Defeat the kraken with Ahab to unlock.';}
    function changeCharacter(field){
        const key=field.dataset.character;
        if(key==='iceTop'&&!equipmentOwned(economy.state,'ice-top')||key==='icePants'&&!equipmentOwned(economy.state,'ice-pants')){field.checked=false;return;}
        if(key==='weapon'&&field.selectedOptions[0]?.disabled)return;
        if(key==='sunglasses'&&!sunglasses.state.owned){field.checked=false;return;}
        if(key==='hat'&&!ownedHat(economy.state.ownedHats,field.value)){field.value=playerLook.hat;return;}
        if(key==='cape'&&!expeditions.state.cape){field.checked=false;return;}
        playerLook=normalizeCharacter({...playerLook,[key]:field.type==='checkbox'?field.checked:field.value});
        try{localStorage.setItem('sf-character-v1',JSON.stringify(playerLook));}catch{}
        signTextureControls.setRevealed?.(playerLook.sunglasses);drawCharacterPreview($('sf-character-preview'),{...playerLook,phone:economy.state.iphoneEquipped});
    }
    function showCharacter(){
        if(bankMenu?.active)bankMenu.close();
        questMenu?.close();closeMenu();closeReader();closeHelp();dialogue.close();keys.clear();player.path=[];player.speed=0;setDancing(false);
        updateSunglassesControl();updateHatControl();updatePhoneControl();
        for(const field of world.querySelectorAll('[data-character]')){if(field.type==='checkbox')field.checked=playerLook[field.dataset.character];else field.value=playerLook[field.dataset.character];}
        updateCapeControl();updateEquipmentControl();$('sf-character').hidden=false;$('sf-reader-shade').hidden=false;drawCharacterPreview($('sf-character-preview'),{...playerLook,phone:economy.state.iphoneEquipped});$('sf-close-character').focus({preventScroll:true});
    }
    function closeCharacter(){if(headless||$('sf-character').hidden)return;$('sf-character').hidden=true;$('sf-reader-shade').hidden=true;canvas.focus({preventScroll:true});}
    function sayPhrase(text){
        if(!active)return false;
        multiplayerWorld?.say(text);playerSpeechUntil=performance.now()+3000;$('sf-player-speech').textContent=text;canvas.focus({preventScroll:true});return true;
    }
    function showHelp(){if(bankMenu?.active)bankMenu.close();questMenu?.close();closeCharacter();closeReader();closeMenu();keys.clear();player.speed=0;$('sf-help').hidden=false;$('sf-reader-shade').hidden=false;$('sf-close-help').focus({preventScroll:true});}
    function closeHelp(){$('sf-help').hidden=true;$('sf-reader-shade').hidden=true;canvas.focus({preventScroll:true});}
    if(headless){
        build();
        return {countryside,tabletService,tabletWizard,tabletDestinations,marinLand,detention,wilderness,bankService,banker,secretWorld,caveMesh,oldMan,secretStairs,guildStatus,peptideSpawns,cityLife,lives:[cityLife,southernLife,noeValleyLife,squareLife,esotericCampus?.life].filter(Boolean),social,socialLife,tech,saltMail,sandSite,slowBus,expeditions,surf,waveSurf,pacificaSurfSite,noeValleyLife,instituteRooms,instituteRoomAt,forwardRoll,aiLabJob,health,deli,streetTraffic,airportAds,airportFieldAds,groundSurfaceAt:(x,z)=>z>=N?airportSurfaceTypeAt(x,z):surfaceTypeAt(x,z),economy,inebriation,rehabilitation,jailStaff,parrots,fishing,fishingSite,sunglasses,sunglassesSite,beachBillboard,quests,skateboard,skateTricks,motorcycle,monkeyKeeper,esotericCampus,squareLife,specialNPCLife,cityLightPlan,tiles:worldTiles,navigation:cityNavigation,objects,places,sights,parkSouthEdge,southernLife,southernNeighborhood,spawn:{x:player.x,y:player.y},merchants,bunny,skateDog,airship,tahoe,ferrari,strength,highwaySites,nightclub,restaurantDiners,regionalRoad,goldenGate,southernTerrain,terrainHeight,characterGround,pathTo,minimapTarget,lineClear:railgunLineClear,canTravel,clearAt,landClearAt,cityPathTo,navigationRegionAt,nearestNavigation,approaches:{bunny:bunnyApproach,sutro:sutroApproach,merchant:merchantApproach}};
    }
    window.SFMapDiagnostics=Object.freeze({
        navigation:Object.freeze({audit:()=>cityNavigation?auditNavigationGrid(cityNavigation):null,position:(x,y)=>cityNavigation?.describe(x,y),connected:(from,to)=>cityNavigation?.connected(from,to)||false,route:(from,to)=>built?pathTo(to.x,to.y,from):null}),
        validate:()=>worldTiles?validateTileMap(worldTiles):null,testRules:runTileRuleTests,get report(){return worldTiles?.validation||null;},tile:(x,z)=>{const m=worldTiles;if(!m||x<0||z<0||x>=m.size||z>=m.size)return null;const t=m.tiles[z*m.size+x];return {x,z,type:t.type,base:t.base,variant:t.variant,ports:t.ports,curbEdges:t.curbEdges,areas:{...t.areas},waterLevel:t.waterLevel,waterBorders:t.waterBorders?.map(e=>e.map(s=>({...s}))),edges:t.edges.map(e=>e.map(s=>({...s})))};}
    });
    $('sf-toggle').hidden=false;$('sf-toggle').addEventListener('click',()=>{
        if(document.documentElement.dataset.sfEntry==='explore'){window.location.href=new URL('./index.html',window.location.href).href;return;}
        setMode(!active).catch(error=>loading?.fail(error));
    });
    $('sf-drive-tahoe').addEventListener('click',()=>driveFerrari(TAHOE.base.x-.5,TAHOE.base.z-.5));$('sf-drive-dealer').addEventListener('click',()=>{const p=ferrari.sample(ferrari.dealer);driveFerrari(p.x-.5,p.z-.5);});
    $('sf-railgun-button').addEventListener('click',toggleRailgun);
    $('sf-order-doordash').addEventListener('click',orderDoorDash);$('sf-eat-sandwich').addEventListener('click',eatSandwich);
    $('sf-fuel-can-button').addEventListener('click',useFuelCan);
    $('sf-ferrari-button').addEventListener('click',useFerrari);$('sf-gym-button').addEventListener('click',useGym);$('sf-refuel-button').addEventListener('click',()=>{const s=nearestFuel();if(s)useFuel(sightById(s.id));});
    $('sf-bike-button').addEventListener('click',useBike);
    $('sf-skateboard-button').addEventListener('click',useSkateboard);
    for(const button of world.querySelectorAll('[data-skate-trick]'))button.addEventListener('click',()=>performSkateTrick(button.dataset.skateTrick));
    $('sf-motorcycle-button').addEventListener('click',()=>useMotorcycle());
    $('sf-climb-button').addEventListener('click',descendSutro);
    $('sf-airship-button').addEventListener('click',useAirship);
    $('sf-rope-button').addEventListener('click',showRopeMenu);
    $('sf-ski-button').addEventListener('click',useTahoeActivity);
    $('sf-surf-button').addEventListener('click',useSurf);
    $('sf-pacifica-surf-button').addEventListener('click',usePacificaSurf);$('sf-wave-catch').addEventListener('click',catchPacificaWave);
    for(const button of world.querySelectorAll('[data-surf-trick]'))button.addEventListener('click',()=>performSurfTrick(button.dataset.surfTrick));
    $('sf-map-button').addEventListener('click',e=>clicked(e.clientX,e.clientY,()=>navigateFromMinimap(e)));
    $('sf-map-button').addEventListener('keydown',selectMinimapIcon);
    $('sf-map-button').addEventListener('focus',()=>{keys.clear();drawMini();});
    $('sf-map-button').addEventListener('blur',()=>{miniKeyboardPlace=null;$('sf-map-button').setAttribute('aria-label','Minimap. Click to travel. Arrow keys select a content icon; Enter travels there.');drawMini();});
    $('sf-map-button').addEventListener('pointerdown',()=>keys.clear());
    $('sf-map-button').addEventListener('pointermove',e=>{
        const pixel=minimapPointer(e),icon=pixel&&nearestMinimapIcon(miniIcons,pixel.x,pixel.y);
        $('sf-map-button').title=icon?placeIcon(icon.place.id).label+' · '+icon.place.label:'Click to travel · Red flag marks your destination';
    });
    $('sf-close-reader').addEventListener('click',closeReader);
    $('sf-reader-shade').addEventListener('click',()=>{if(bankMenu?.active)bankMenu.close();closeReader();closeHelp();closeCharacter();questMenu?.close();});
    for(const button of world.querySelectorAll('[data-say]'))button.addEventListener('click',()=>sayPhrase(button.dataset.say));
    $('sf-roll-button').addEventListener('click',rollForward);
    $('sf-drink-coffee').addEventListener('click',drinkBankCoffee);$('sf-dance-button').addEventListener('click',dance);$('sf-character-button').addEventListener('click',showCharacter);
    $('sf-close-character').addEventListener('click',closeCharacter);$('sf-character-done').addEventListener('click',closeCharacter);
    for(const field of world.querySelectorAll('[data-character]'))field.addEventListener('input',()=>changeCharacter(field));
    $('sf-iphone-equipped').addEventListener('input',e=>{const result=tech.equipPhone(e.target.checked);if(!result.ok)announce(result.message,'iPhone');updatePhoneControl();drawCharacterPreview($('sf-character-preview'),{...playerLook,phone:economy.state.iphoneEquipped});});
    $('sf-help-button').addEventListener('click',showHelp);$('sf-close-help').addEventListener('click',closeHelp);$('sf-help-start').addEventListener('click',closeHelp);
    $('sf-zoom-slider').addEventListener('input',e=>setZoom(Number(e.target.value)/100));
    $('sf-zoom-slider').addEventListener('focus',()=>keys.clear());
    $('sf-recenter').addEventListener('click',()=>{setCamera(0,Math.PI/5);setZoom(width<600?.8:1);updateCamera();});
    canvas.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom*Math.exp(-e.deltaY*.0015));},{passive:false});
    canvas.addEventListener('contextmenu',e=>{e.preventDefault();clearTimeout(pressTimer);longPressed=true;clicked(e.clientX,e.clientY,()=>showMenu(e.clientX,e.clientY));});
    canvas.addEventListener('pointerdown',e=>{
        if(e.button!==0)return;closeMenu();canvas.focus({preventScroll:true});const npc=hitCitizen(e.clientX,e.clientY);
        // Keep a walking actor selected between press and release, even when
        // another NPC crosses the cursor or the character changes pose.
        if(npc&&Number.isFinite(npc.hold))npc.hold=Math.max(npc.hold,.35);
        pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,npc});canvas.setPointerCapture(e.pointerId);longPressed=false;
        if(pointers.size===1&&e.pointerType!=='mouse')pressTimer=setTimeout(()=>{longPressed=true;clicked(e.clientX,e.clientY,()=>showMenu(e.clientX,e.clientY));},550);
        if(pointers.size===2){clearTimeout(pressTimer);gesture=true;const [a,b]=[...pointers.values()];pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);}
    });
    canvas.addEventListener('pointermove',e=>{
        const pointer=pointers.get(e.pointerId);if(pointer){pointer.x=e.clientX;pointer.y=e.clientY;if(Math.hypot(pointer.x-pointer.startX,pointer.y-pointer.startY)>9)clearTimeout(pressTimer);}
        if(pointers.size===2){const [a,b]=[...pointers.values()],dist=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance>0)setZoom(zoom*Math.pow(dist/pinchDistance,1.5));pinchDistance=dist;return;}
        if(e.pointerType==='touch')return;const citizen=hitCitizen(e.clientX,e.clientY);hovered=citizen||hitSight(e.clientX,e.clientY)||hitPlace(e.clientX,e.clientY);
        const tip=$('sf-hover');tip.hidden=!hovered||!$('sf-context').hidden;if(hovered){tip.textContent=citizen?(citizen.networkPlayer?npcLabel(citizen):({talk:'Talk-To',attack:'Attack',examine:'Examine',pet:'Pet'})[npcPrimary(citizen)]+' '+npcLabel(citizen)):(hovered.source?(currentInterior===hovered&&!hovered.activityBuilding?'Browse':'Enter'):hovered.id==='sutro'&&sutroClimb.state.active?'Climb down':sightPrimaryVerb(hovered))+' '+hovered.label;tip.style.left=Math.max(8,Math.min(width-300,e.clientX+17))+'px';tip.style.top=Math.min(height-38,e.clientY+22)+'px';}
    });
    canvas.addEventListener('pointerup',e=>{
        clearTimeout(pressTimer);const p=pointers.get(e.pointerId);pointers.delete(e.pointerId);if(pointers.size===0&&gesture){gesture=false;return;}if(!p||gesture||longPressed||e.button!==0||Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>12)return;
        clicked(e.clientX,e.clientY,()=>{
            const tile=tileAt(e.clientX,e.clientY),selectedPlayer=p.npc?.networkPlayer?p.npc:hitCitizen(e.clientX,e.clientY);if(selectedPlayer?.networkPlayer)return walkToActor(selectedPlayer);if(selectedPlayer?.police)return examine(selectedPlayer);
            if(secretWorld?.bomber.state.active)return walkTo(tile.x,tile.y);
            const selectedItem=hitSight(e.clientX,e.clientY);if(selectedItem?.kind==='loot')return collectExpeditionLoot(selectedItem);
            if(chase?.state.jailed){const npc=p.npc||hitCitizen(e.clientX,e.clientY);return npc?.rehabilitation?talkRehabilitation(npc):walkTo(tile.x,tile.y);}
            if(ferrari?.state.riding){const npc=p.npc||hitCitizen(e.clientX,e.clientY);if(npc?.kind==='fuel-attendant')return interactCitizen(npc,'talk');return driveFerrari(tile.x,tile.y);}
            if(sutroClimb.state.active){if(hitSight(e.clientX,e.clientY)?.id==='sutro')return descendSutro();return climbUnavailable();}
            if(flying()){const floor=basket.pick(mouseRay(e.clientX,e.clientY),airship.state.position,airship.state.heading);if(floor)return walkInBasket(floor);return walkTo(tile.x,tile.y);}
            const npc=p.npc||hitCitizen(e.clientX,e.clientY);if(npc)return interactCitizen(npc,npcPrimary(npc));
            const roadTarget=goldenGate?.targetAt(tile.x+.5,tile.y+.5)||regionalRoad?.targetAt(tile.x+.5,tile.y+.5);
            if(roadTarget)return walkTo(roadTarget.x,roadTarget.y);
            const place=hitPlace(e.clientX,e.clientY),sight=hitSight(e.clientX,e.clientY);
            if(sight?.enterableInstitute){if(activeInstituteRoom()?.id===sight.id&&clearAt(tile.x,tile.y))return walkTo(tile.x,tile.y);if(pick(e.clientX,e.clientY)?.researchRoom)return goToSight(sight);if(clearAt(tile.x,tile.y))return walkTo(tile.x,tile.y);}
            if((sight?.kind==='times-square'||sight?.kind==='research-institute'||sight?.kind==='park'||sight?.kind==='neighborhood-garden')&&clearAt(tile.x,tile.y))return walkTo(tile.x,tile.y);
            if(sight?.kind==='nightlife'&&inNightlife(player.x+.5,player.y+.5))return walkTo(tile.x,tile.y);
            if(sight?.id==='sutro')return climbSutro();
            if(sight)goToSight(sight);else if(place&&!(place===currentInterior&&isWalkable(tile.x,tile.y)))goToPlace(place);else walkTo(tile.x,tile.y);
        });
    });
    canvas.addEventListener('pointercancel',e=>{clearTimeout(pressTimer);pointers.delete(e.pointerId);if(!pointers.size)gesture=false;});
    canvas.addEventListener('pointerleave',()=>{$('sf-hover').hidden=true;hovered=null;});
    document.addEventListener('pointerdown',e=>{if(!$('sf-context').hidden&&!$('sf-context').contains(e.target)&&e.target!==canvas)closeMenu();});
    document.addEventListener('keydown',e=>{
        if(!active||!built||tabletService?.state.active)return;
        if(e.key==='Shift'&&secretWorld?.bomber.state.phase==='flying'){e.preventDefault();keys.add('shift');return;}
        if(e.ctrlKey||e.metaKey||e.altKey)return;
        if(debugConsole.handleKey(e))return;
        if(capture.state.active||rehabilitation.state.active)return;const key=e.key.toLowerCase();
        if(chase?.state.jailed&&['b','f','e','a'].includes(key)){e.preventDefault();return;}
        if(aiInterview.visible){keys.clear();aiInterview.handleKey(e);return;}
        const modal=bankMenu?.active?$('sf-bank'):questMenu?.active?$('sf-quests'):!$('sf-character').hidden?$('sf-character'):!$('sf-help').hidden?$('sf-help'):null;
        if(key==='escape'){e.preventDefault();if(bankMenu?.active){bankMenu.close();return;}if(questMenu?.active){questMenu.close();return;}if(training){stopTraining();return;}if(ferrari?.state.riding){ferrari.state.target=null;ferrari.state.speed=0;destination=null;return;}if(!$('sf-character').hidden){closeCharacter();return;}if(dialogue.active){dialogue.close();return;}if(!$('sf-context').hidden){closeMenu();canvas.focus({preventScroll:true});}else if(!$('sf-help').hidden)closeHelp();else if(!$('sf-reader').hidden)closeReader();else if(fishing.state.active){fishing.cancel();announce('You reel in your line.','Fishing');}else if(sutroClimb.state.active)descendSutro();else if(airship.state.active){airship.stop();destination=null;updateAirshipButton();}else{player.path=[];player.speed=0;action=null;destination=null;drawMini();}return;}
        if(dialogue.active){keys.clear();dialogue.handleKey(e);return;}
        if(rocket.state.active&&['a','b','f','e'].includes(key)){e.preventDefault();return;}
        if(modal){if(key==='tab'){const focus=[...modal.querySelectorAll('button,a[href],canvas[tabindex],input,select')],first=focus[0],last=focus[focus.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}return;}
        if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement||e.target instanceof HTMLTextAreaElement||e.target.isContentEditable)return;
        if(!$('sf-context').hidden&&(key==='arrowdown'||key==='arrowup')){e.preventDefault();const opts=[...$('sf-context').querySelectorAll('button')],i=opts.indexOf(document.activeElement);opts[(i+(key==='arrowdown'?1:-1)+opts.length)%opts.length].focus();return;}
        if(['arrowup','arrowdown','arrowleft','arrowright'].includes(key)){if(e.target instanceof Element&&e.target.closest('#sf-reader'))return;e.preventDefault();keys.add(key);return;}
        if(secretWorld?.bomber.state.active){if(key===' '&&!e.repeat){e.preventDefault();secretAction(secretWorld.dropBomb());return;}if(['a','b','f','e','r','m','k','v','d','u','g'].includes(key)){e.preventDefault();return;}}
        if(!e.repeat&&surf.state.riding&&surf.state.mode==='surf'&&(key===' '||SURF_TRICKS.some(t=>t.key===key))){e.preventDefault();if(key===' ')catchPacificaWave();else performSurfTrick(SURF_TRICKS.find(t=>t.key===key).id);return;}
        if(!e.repeat&&skateboard.riding&&SKATE_TRICKS.some(t=>t.key===key)){e.preventDefault();performSkateTrick(SKATE_TRICKS.find(t=>t.key===key).id);return;}
        if(e.repeat)return;if(key==='g'){e.preventDefault();toggleRailgun();return;}if(key==='u'){e.preventDefault();usePacificaSurf();return;}if(key==='q'){e.preventDefault();questMenu.open();return;}if(key===' '&&tahoe.state.mode==='ski'){e.preventDefault();tahoe.flip();return;}if(key==='e'&&nearTahoe(player.x+.5,player.y+.5)){e.preventDefault();useTahoeActivity();return;}if(key==='m'){e.preventDefault();useMotorcycle();return;}if(key==='k'){e.preventDefault();useSkateboard();return;}if(key==='r'){e.preventDefault();useFerrari();return;}if(key==='d'){e.preventDefault();dance();return;}if(key==='v'){e.preventDefault();rollForward();return;}if(key==='c'){e.preventDefault();showCharacter();return;}if(key==='s'){e.preventDefault();sayPhrase('yo');return;}if(key==='a'){e.preventDefault();useAirship();return;}if(key==='b'){e.preventDefault();useBike();}if(key==='f'){e.preventDefault();useSurf();}if(key==='e'){e.preventDefault();if(airship.state.active){airshipUnavailable();return;}if(sutroClimb.state.active){descendSutro();return;}const tower=sightById('sutro').object;if(tower&&Math.hypot(player.x+.5-tower.x-tower.w/2,player.y+.5-tower.y-tower.d/2)<4){climbSutro();return;}const p=currentInterior||places.find(p=>Math.hypot(player.x-p.entry.x,player.y-p.entry.y)<2.5);if(p)enter(p);else announce('Walk closer to a storefront to enter. Click a content icon on the minimap to visit a storefront.');}
        if(key==='+'||key==='='){e.preventDefault();setZoom(zoom+.1);}if(key==='-'){e.preventDefault();setZoom(zoom-.1);}if(key==='?')showHelp();
    });
    document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();clearTimeout(pressTimer);pointers.clear();gesture=false;});
    document.addEventListener('visibilitychange',()=>{tech.suspend();social.suspend();keys.clear();if(document.hidden){strength.save();ferrari?.save();motorcycle?.save();monkeyKeeper?.save();cancelAnimationFrame(raf);}else if(active)startLoop();});
    canvas.addEventListener('webglcontextlost',e=>{tech.suspend();social.suspend();e.preventDefault();keys.clear();cancelAnimationFrame(raf);});
    canvas.addEventListener('webglcontextrestored',()=>{tech.suspend();social.suspend();if(!built)return;gpuStats.triangles=0;initGPU();if(caveMesh){caveGPU=upload(caveMesh);caveGPU.walls=caveMesh.walls.map(w=>({...w,gpu:upload(w.mesh)}));}groundGPU=upload(groundMesh,{spatial:true});sceneGPU=upload(sceneMesh,{spatial:true});if(tahoeMesh)tahoeGPU=upload(tahoeMesh);
        for(const [id,site] of [['sf-spaceport',SF_SPACEPORT],['tahoe-spaceport',tahoe.spaceport]]){
            const npc=merchant('crew',site.entry.x+1.2,site.entry.y+.5,id==='sf-spaceport'?airportWalkingHeight(site.entry.x+1.2,site.entry.y+.5):tahoeHeight(site.entry.x+1.2,site.entry.y+.5)+.04);
            merchants.push({...npc,id:id+'-attendant',siteId:id,angle:Math.PI});
        }if(highwayMesh)highwayGPU=upload(highwayMesh);for(const o of buildingModels)o.gpu=upload(o.mesh);updateCamera();if(active)startLoop();});
    window.addEventListener('resize',resize);
    if(document.documentElement.dataset.sfEntry==='explore')setMode(true).catch(error=>loading?.fail(error));
}

/** Build the actual authored world without DOM, canvas, WebGL, images or a server.
 * Geometry placement is shared; rasterization, upload and UI initialization are skipped. */
export function createWorldModel({retainInteriors=false}={}){return createSFWorld({headless:true,retainInteriors});}
if(typeof document!=='undefined'){const loading=createLoadingScreen(document.getElementById('sf-loading'));if(document.documentElement.dataset.sfEntry==='explore')loading.show();bootMultiplayer().then(multiplayer=>createSFWorld({multiplayer,loading})).catch(error=>{console.error('World initialization:',error);loading.fail(error);});}
