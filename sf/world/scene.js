import { createClientControllerFactory } from '../client/controllers.js';
import { createNetwork } from './network.js';
import { createRuntime } from './runtime.js';
import { createRendering } from './rendering.js';
import { createNavigation } from './navigation.js';
import { createGeneration } from './generation.js';
import { createMinimap } from './minimap.js';
import { createHud } from './hud.js';
import { createInteractions } from './interactions.js';
import '../rendering/dynamic-buffer.js';
import '../rendering/character-gpu.js';
import '../rendering/character-frame.js';
import '../rocket-hop.js';
import '../dog-pony-layout.js';
import '../dog-pony-show.js';
import '../config/rendering.js';
import '../redwood-lake-life.js';
import '../southern-countryside-layout.js';
import '../wizard-house.js';
import { setActionText, actionTargetKind } from '../context-menu.js';
import '../config/dialogue.js';
import '../dialogue-config.js';
import '../interaction-results.js';
import '../animation-presentation.js';
import '../neighborhood-interactions.js';
import '../combat-navigation.js';
import '../southern-countryside.js';
import '../world-minimap.js';
import '../world-tile-codec.js';
import '../materials.js';
import { auditNavigationGrid } from '../navigation.js';
import '../world-stream.js';
import '../cupertino-gardens.js';
import {
  createServerConnectionGate,
  serverConnected,
  serverCommand,
} from '../server-connection.js';
import { createGrowthTicker } from '../finance-ui.js';
import '../southern-village.js';
import '../duel-layout.js';
import '../loading-screen.js';
import '../teleport-tablets.js';
import '../teleport-models.js';
import '../marin-land.js';
import '../countryside.js';
import { createDebugConsole, debugMapPosition, createFrameMeter } from '../debug-console.js';
import '../item-stats.js';
import '../wilderness.js';
import '../wilderness-sites.js';
import '../ferrari-roads.js';
import '../wilderness-models.js';
import '../armory.js';
import '../static-batches.js';
import '../southern-craft.js';
import { createGlazingBatch } from '../glazing.js';
import '../social-layout.js';
import '../social-buildings.js';
import '../bottle-post.js';
import { createSocialBusiness } from '../sales-conference.js';
import '../ai-lab-interior.js';
import '../tech-layout.js';
import '../tech-buildings.js';
import { createTechVentures } from '../tech-ventures.js';
import '../haberdasher-layout.js';
import { ownedHat } from '../hat-catalog.js';
import '../haberdashery.js';
import '../haberdasher-shop.js';
import '../salt-flats.js';
import { createSaltMail } from '../salt-mail.js';
import '../street-light-layout.js';
import '../map-colors.js';

import '../minimap-navigation.js';
import { placeIcon, nearestMinimapIcon } from '../wayfinding.js';

import '../alpine-materials.js';
import { unit } from '../geometry.js';
import '../street-ground.js';
import '../shadows.js';
import { TILE_CONFIG, validateTileMap, runTileRuleTests } from '../tiles.js';
import '../water-tiles.js';
import { createSFCoast } from '../coastline.js';
import '../western-coast-details.js';
import { createModels } from '../models.js';
import { SUTRO_SITE, createSutroClimb } from '../sutro.js';
import '../lighting.js';
import { DOWNTOWN } from '../downtown.js';
import '../environment.js';
import { AIRSHIP_ACCESS, SOUTHERN_ROADS, airportSurfaceTypeAt, createAirship } from '../airship.js';
import { SF_SPACEPORT } from '../southern-district.js';
import { SOUTHERN_BOUNDS } from '../southern-layout.js';
import '../southern-terrain.js';
import { createStrength } from '../strength.js';
import '../jurassic-layout.js';
import { createExpeditions } from '../jurassic.js';
import '../jurassic-models.js';
import { createForwardRoll } from '../forward-roll.js';
import { createAILabJob } from '../ai-lab.js';
import { createAIInterviewUI } from '../ai-interview-ui.js';
import { createHitpoints } from '../combat.js';
import '../deli.js';
import '../street-traffic.js';
import '../airport-billboards.js';
import { gymExercise } from '../gym-exercises.js';
import '../ferrari.js';
import '../fuel.js';
import '../adventure-sites.js';
import '../fitness-layout.js';

import '../woodland-park.js';
import '../billboards.js';
import '../research-art.js';
import '../times-square.js';
import '../research-layout.js';
import '../institute-interiors.js';
import '../research-campuses.js';
import { createSunglasses } from '../sunglasses.js';
import { createQuestLog } from '../quests.js';
import '../equipment-options.js';
import '../search-houses.js';
import '../world-lore.js';
import '../encounter-layout.js';
import '../encounter-buildings.js';
import '../progression.js';
import { createCollectionMenu } from '../collection-menu.js';
import { createQuestMenu } from '../quest-menu.js';
import '../they-live.js';
import '../alien-sites.js';
import '../times-square-life.js';
import '../square-construction.js';

import { createSkateTricks, SKATE_TRICKS } from '../skateboard.js';
import '../npc-roaming.js';
import '../shipyard.js';
import '../parrots.js';
import { createInebriation } from '../inebriation.js';
import { createRehabilitation, scrambleAppearance } from '../rehabilitation.js';
import { createFishing } from '../fishing.js';
import '../monkey-escape.js';
import '../zoo-encounter.js';
import '../motorcycle.js';
import '../rail-works.js';
import '../research-dialogue.js';

import '../southern-neighborhood.js';
import '../southern-expansion.js';
import '../peninsula-details.js';
import { createRocketTravel } from '../rocket.js';
import '../regional-road.js';
import { TAHOE, createTahoe, nearTahoe, tahoeHeight } from '../tahoe.js';
import { createAirshipRope } from '../airship-rope.js';
import { createAirshipBasket } from '../airship-basket.js';
import '../airship-rental.js';
import '../config/airship.js';
import { createEconomy } from '../economy.js';
import { createDialogue } from '../dialogue.js';
import '../multiplayer-client.js';
import '../multiplayer-world.js';
import { createCombatFeedback, createCombatOverlay } from '../combat-feedback.js';
import { actorLevel } from '../levels.js';
import { GUILD_BUILDINGS } from '../guild.js';
import '../map-instances.js';
import '../secret-adventures.js';
import '../banking.js';
import '../bank-ui.js';
import '../bank-models.js';
import '../illuminati-models.js';
import '../stealth-bomber.js';
import '../multiplayer-actions.js';
import '../multiplayer-protocol.js';
import '../config/hairstyles.js';
import { npcDisplayLabel } from '../npc-interactions.js';
import '../south-bay-layout.js';
import { sightPrimaryVerb } from '../descriptions.js';
import '../building-interactions.js';
import { merchant } from '../commerce-world.js';
import { createWhales } from '../wildlife.js';
import '../bunny.js';
import '../skate-dog.js';
import { PROMETHEUS } from '../prometheus.js';
import { createBayShipping } from '../shipping.js';
import { RESTAURANTS } from '../restaurants.js';
import '../estate-life.js';
import '../life.js';
import '../companions.js';
import '../traffic-signals.js';
import '../slow-bus.js';
import '../transit-models.js';
import '../gpu-layout.js';
import '../gpu-factory.js';
import '../characters.js';
import { normalizeCharacter, drawCharacterPreview } from '../character-config.js';
import { inNightlife } from '../nightlife.js';
import { createCaptureAnimation } from '../capture-animation.js';
import '../zoo-animals.js';

import { ZOO_PATHS } from '../zoo.js';
import { WINDSURF_LAUNCH, createWindsurfing } from '../windsurfing.js';
import { createSurfing, SURF_TRICKS } from '../surfing.js';
import { createDetentionSite } from '../encounters.js';
import {
  WORLD_SIZE,
  REFERENCE_SIZE,
  STREET_LAYOUT_SIZE,
  PARK_BOUNDS,
  PANHANDLE,
  DOLORES_PARK,
  inBounds,
  SF_HILLS,
  woodedHillPark,
  MARIN_OUTLINE,
} from '../geography.js';

/* Static WebGL world entry point. Terrain and models are actual 3D triangle
   meshes; the 2D canvases below are only maps and interface labels. No game assets
   or renderer code are copied from RuneScape or private-server clients. */
export function createSFWorld({
  headless = false,
  retainInteriors = false,
  bake = false,
  multiplayer = null,
  loading = null,
} = {}) {
  // Explicit live bindings used by the scene services.
  const context = {
    get clientController() {
      return clientController;
    },
    get $() {
      return $;
    },
    get ACCELERATION() {
      return ACCELERATION;
    },
    get action() {
      return action;
    },
    set action(value) {
      action = value;
    },
    get active() {
      return active;
    },
    set active(value) {
      active = value;
    },
    get activeInstituteRoom() {
      return activeInstituteRoom;
    },
    get actorInView() {
      return actorInView;
    },
    get actorTags() {
      return actorTags;
    },
    set actorTags(value) {
      actorTags = value;
    },
    get addPanhandleDetails() {
      return addPanhandleDetails;
    },
    get addScenery() {
      return addScenery;
    },
    get ahabNPC() {
      return ahabNPC;
    },
    set ahabNPC(value) {
      ahabNPC = value;
    },
    get aiInterview() {
      return aiInterview;
    },
    get aiLabJob() {
      return aiLabJob;
    },
    get airportAds() {
      return airportAds;
    },
    set airportAds(value) {
      airportAds = value;
    },
    get airportFieldAds() {
      return airportFieldAds;
    },
    set airportFieldAds(value) {
      airportFieldAds = value;
    },
    get airship() {
      return airship;
    },
    get alienCombat() {
      return alienCombat;
    },
    set alienCombat(value) {
      alienCombat = value;
    },
    get alongStreet() {
      return alongStreet;
    },
    get alpineState() {
      return alpineState;
    },
    set alpineState(value) {
      alpineState = value;
    },
    get alpineTextures() {
      return alpineTextures;
    },
    set alpineTextures(value) {
      alpineTextures = value;
    },
    get announce() {
      return announce;
    },
    get approachingNPC() {
      return approachingNPC;
    },
    set approachingNPC(value) {
      approachingNPC = value;
    },
    get arrestPlayer() {
      return arrestPlayer;
    },
    get atlasTexture() {
      return atlasTexture;
    },
    set atlasTexture(value) {
      atlasTexture = value;
    },
    get bake() {
      return bake;
    },
    get banker() {
      return banker;
    },
    set banker(value) {
      banker = value;
    },
    get bankMenu() {
      return bankMenu;
    },
    set bankMenu(value) {
      bankMenu = value;
    },
    get bankService() {
      return bankService;
    },
    set bankService(value) {
      bankService = value;
    },
    get basket() {
      return basket;
    },
    get basketArrival() {
      return basketArrival;
    },
    set basketArrival(value) {
      basketArrival = value;
    },
    get bayShipping() {
      return bayShipping;
    },
    get beachBillboard() {
      return beachBillboard;
    },
    set beachBillboard(value) {
      beachBillboard = value;
    },
    get beginCapture() {
      return beginCapture;
    },
    get bench() {
      return bench;
    },
    get bicycle() {
      return bicycle;
    },
    get bike() {
      return bike;
    },
    get bomberSite() {
      return bomberSite;
    },
    get buildCityMap() {
      return buildCityMap;
    },
    get buildForBrowser() {
      return buildForBrowser;
    },
    get buildingModels() {
      return buildingModels;
    },
    get buildingPoint() {
      return buildingPoint;
    },
    get buildNavigation() {
      return buildNavigation;
    },
    get built() {
      return built;
    },
    set built(value) {
      built = value;
    },
    get bunny() {
      return bunny;
    },
    set bunny(value) {
      bunny = value;
    },
    get bunnyApproach() {
      return bunnyApproach;
    },
    get camera() {
      return camera;
    },
    get canForwardRoll() {
      return canForwardRoll;
    },
    get canTravel() {
      return canTravel;
    },
    get canUseTablet() {
      return canUseTablet;
    },
    get canvas() {
      return canvas;
    },
    get capture() {
      return capture;
    },
    get carArrival() {
      return carArrival;
    },
    set carArrival(value) {
      carArrival = value;
    },
    get caveExitSite() {
      return caveExitSite;
    },
    get caveGPU() {
      return caveGPU;
    },
    set caveGPU(value) {
      caveGPU = value;
    },
    get caveMesh() {
      return caveMesh;
    },
    set caveMesh(value) {
      caveMesh = value;
    },
    get changeMapInstance() {
      return changeMapInstance;
    },
    get characterGPU() {
      return characterGPU;
    },
    set characterGPU(value) {
      characterGPU = value;
    },
    get characterGround() {
      return characterGround;
    },
    get chase() {
      return chase;
    },
    set chase(value) {
      chase = value;
    },
    get cityLife() {
      return cityLife;
    },
    set cityLife(value) {
      cityLife = value;
    },
    get cityLightPlan() {
      return cityLightPlan;
    },
    set cityLightPlan(value) {
      cityLightPlan = value;
    },
    get cityMap() {
      return cityMap;
    },
    get cityNavigation() {
      return cityNavigation;
    },
    set cityNavigation(value) {
      cityNavigation = value;
    },
    get cityNavigationObjectCount() {
      return cityNavigationObjectCount;
    },
    set cityNavigationObjectCount(value) {
      cityNavigationObjectCount = value;
    },
    get cityParcels() {
      return cityParcels;
    },
    get classic() {
      return classic;
    },
    get clearAt() {
      return clearAt;
    },
    get clickAnimation() {
      return clickAnimation;
    },
    set clickAnimation(value) {
      clickAnimation = value;
    },
    get clickAttempt() {
      return clickAttempt;
    },
    set clickAttempt(value) {
      clickAttempt = value;
    },
    get clicked() {
      return clicked;
    },
    get closeCharacter() {
      return closeCharacter;
    },
    get closeHelp() {
      return closeHelp;
    },
    get closeMenu() {
      return closeMenu;
    },
    get closeReader() {
      return closeReader;
    },
    get COAST() {
      return COAST;
    },
    get collectionFound() {
      return collectionFound;
    },
    set collectionFound(value) {
      collectionFound = value;
    },
    get collectionMenu() {
      return collectionMenu;
    },
    set collectionMenu(value) {
      collectionMenu = value;
    },
    get combatFeedback() {
      return combatFeedback;
    },
    get combatOverlay() {
      return combatOverlay;
    },
    get connectionGate() {
      return connectionGate;
    },
    get countryside() {
      return countryside;
    },
    set countryside(value) {
      countryside = value;
    },
    get creatureApproach() {
      return creatureApproach;
    },
    get currentInstitute() {
      return currentInstitute;
    },
    set currentInstitute(value) {
      currentInstitute = value;
    },
    get currentInterior() {
      return currentInterior;
    },
    set currentInterior(value) {
      currentInterior = value;
    },
    get debugConsole() {
      return debugConsole;
    },
    get debugTeleport() {
      return debugTeleport;
    },
    get deli() {
      return deli;
    },
    set deli(value) {
      deli = value;
    },
    get destination() {
      return destination;
    },
    set destination(value) {
      destination = value;
    },
    get detailedGround() {
      return detailedGround;
    },
    get detention() {
      return detention;
    },
    get dialogue() {
      return dialogue;
    },
    get dpr() {
      return dpr;
    },
    set dpr(value) {
      dpr = value;
    },
    get drawHillsideLifts() {
      return drawHillsideLifts;
    },
    get drawingGlass() {
      return drawingGlass;
    },
    set drawingGlass(value) {
      drawingGlass = value;
    },
    get drawMini() {
      return drawMini;
    },
    get drawPlaceMarkers() {
      return drawPlaceMarkers;
    },
    get driveFerrari() {
      return driveFerrari;
    },
    get ducksFedUntil() {
      return ducksFedUntil;
    },
    set ducksFedUntil(value) {
      ducksFedUntil = value;
    },
    get duelMenu() {
      return duelMenu;
    },
    set duelMenu(value) {
      duelMenu = value;
    },
    get dynamicGPU() {
      return dynamicGPU;
    },
    set dynamicGPU(value) {
      dynamicGPU = value;
    },
    get dynamicTargets() {
      return dynamicTargets;
    },
    set dynamicTargets(value) {
      dynamicTargets = value;
    },
    get economy() {
      return economy;
    },
    get enhanceLandmarks() {
      return enhanceLandmarks;
    },
    get enter() {
      return enter;
    },
    get esotericCampus() {
      return esotericCampus;
    },
    set esotericCampus(value) {
      esotericCampus = value;
    },
    get expeditionEvent() {
      return expeditionEvent;
    },
    get expeditions() {
      return expeditions;
    },
    get ferrari() {
      return ferrari;
    },
    set ferrari(value) {
      ferrari = value;
    },
    get finalizeSceneryNavigation() {
      return finalizeSceneryNavigation;
    },
    get fishing() {
      return fishing;
    },
    get fishingSite() {
      return fishingSite;
    },
    set fishingSite(value) {
      fishingSite = value;
    },
    get flying() {
      return flying;
    },
    get forwardRoll() {
      return forwardRoll;
    },
    get frameID() {
      return frameID;
    },
    set frameID(value) {
      frameID = value;
    },
    get frameMeter() {
      return frameMeter;
    },
    get gesture() {
      return gesture;
    },
    set gesture(value) {
      gesture = value;
    },
    get gl() {
      return gl;
    },
    get glassGPU() {
      return glassGPU;
    },
    set glassGPU(value) {
      glassGPU = value;
    },
    get glazing() {
      return glazing;
    },
    get goldenGate() {
      return goldenGate;
    },
    set goldenGate(value) {
      goldenGate = value;
    },
    get goToPlace() {
      return goToPlace;
    },
    get gpuStats() {
      return gpuStats;
    },
    get greenArea() {
      return greenArea;
    },
    get groundGPU() {
      return groundGPU;
    },
    set groundGPU(value) {
      groundGPU = value;
    },
    get groundMesh() {
      return groundMesh;
    },
    set groundMesh(value) {
      groundMesh = value;
    },
    get growthService() {
      return growthService;
    },
    get growthTicker() {
      return growthTicker;
    },
    get guildStatus() {
      return guildStatus;
    },
    get gymSelection() {
      return gymSelection;
    },
    set gymSelection(value) {
      gymSelection = value;
    },
    get headless() {
      return headless;
    },
    get health() {
      return health;
    },
    get height() {
      return height;
    },
    set height(value) {
      height = value;
    },
    get heights() {
      return heights;
    },
    set heights(value) {
      heights = value;
    },
    get highwayGPU() {
      return highwayGPU;
    },
    set highwayGPU(value) {
      highwayGPU = value;
    },
    get highwayMesh() {
      return highwayMesh;
    },
    set highwayMesh(value) {
      highwayMesh = value;
    },
    get highwaySites() {
      return highwaySites;
    },
    set highwaySites(value) {
      highwaySites = value;
    },
    get HILLS() {
      return HILLS;
    },
    get hitCitizen() {
      return hitCitizen;
    },
    get hitPlace() {
      return hitPlace;
    },
    get hitSight() {
      return hitSight;
    },
    get hoppingRocket() {
      return hoppingRocket;
    },
    set hoppingRocket(value) {
      hoppingRocket = value;
    },
    get hovered() {
      return hovered;
    },
    set hovered(value) {
      hovered = value;
    },
    get human() {
      return human;
    },
    get inebriation() {
      return inebriation;
    },
    get initGPU() {
      return initGPU;
    },
    get inPark() {
      return inPark;
    },
    get insidePolygon() {
      return insidePolygon;
    },
    get instituteRoomAt() {
      return instituteRoomAt;
    },
    get instituteRooms() {
      return instituteRooms;
    },
    get isWalkable() {
      return isWalkable;
    },
    get jailStaff() {
      return jailStaff;
    },
    set jailStaff(value) {
      jailStaff = value;
    },
    get keeperNPC() {
      return keeperNPC;
    },
    set keeperNPC(value) {
      keeperNPC = value;
    },
    get keys() {
      return keys;
    },
    set keys(value) {
      keys = value;
    },
    get labelPool() {
      return labelPool;
    },
    get lakes() {
      return lakes;
    },
    get lampGlow() {
      return lampGlow;
    },
    set lampGlow(value) {
      lampGlow = value;
    },
    get landClearAt() {
      return landClearAt;
    },
    get landMask() {
      return landMask;
    },
    get last() {
      return last;
    },
    set last(value) {
      last = value;
    },
    get LAYOUT_SCALE() {
      return LAYOUT_SCALE;
    },
    get layoutPosition() {
      return layoutPosition;
    },
    get lightingDecorativeRocket() {
      return lightingDecorativeRocket;
    },
    set lightingDecorativeRocket(value) {
      lightingDecorativeRocket = value;
    },
    get loading() {
      return loading;
    },
    get loreSites() {
      return loreSites;
    },
    get makeBuilding() {
      return makeBuilding;
    },
    get makeCurbShop() {
      return makeCurbShop;
    },
    get makeLandmarks() {
      return makeLandmarks;
    },
    get makeRestaurantPatio() {
      return makeRestaurantPatio;
    },
    get makeTownhomeRow() {
      return makeTownhomeRow;
    },
    get map() {
      return map;
    },
    get MAP_ART() {
      return MAP_ART;
    },
    get MAP_SCALE() {
      return MAP_SCALE;
    },
    get mapArtPoint() {
      return mapArtPoint;
    },
    get mapCanPlace() {
      return mapCanPlace;
    },
    get mapPolygon() {
      return mapPolygon;
    },
    get mapPosition() {
      return mapPosition;
    },
    get mapTile() {
      return mapTile;
    },
    get mapTree() {
      return mapTree;
    },
    get MARIN() {
      return MARIN;
    },
    get marinLand() {
      return marinLand;
    },
    set marinLand(value) {
      marinLand = value;
    },
    get market() {
      return market;
    },
    get materialState() {
      return materialState;
    },
    set materialState(value) {
      materialState = value;
    },
    get materialTexture() {
      return materialTexture;
    },
    set materialTexture(value) {
      materialTexture = value;
    },
    get mc() {
      return mc;
    },
    get mercedValue() {
      return mercedValue;
    },
    get merchantApproach() {
      return merchantApproach;
    },
    get merchants() {
      return merchants;
    },
    get miniIcons() {
      return miniIcons;
    },
    set miniIcons(value) {
      miniIcons = value;
    },
    get miniKeyboardPlace() {
      return miniKeyboardPlace;
    },
    set miniKeyboardPlace(value) {
      miniKeyboardPlace = value;
    },
    get miniLast() {
      return miniLast;
    },
    set miniLast(value) {
      miniLast = value;
    },
    get minimapRoadPaths() {
      return minimapRoadPaths;
    },
    set minimapRoadPaths(value) {
      minimapRoadPaths = value;
    },
    get minimapTarget() {
      return minimapTarget;
    },
    get monkeyKeeper() {
      return monkeyKeeper;
    },
    set monkeyKeeper(value) {
      monkeyKeeper = value;
    },
    get motorcycle() {
      return motorcycle;
    },
    set motorcycle(value) {
      motorcycle = value;
    },
    get motorcycleApproach() {
      return motorcycleApproach;
    },
    get mouseRay() {
      return mouseRay;
    },
    get multiplayer() {
      return multiplayer;
    },
    get multiplayerSettings() {
      return multiplayerSettings;
    },
    set multiplayerSettings(value) {
      multiplayerSettings = value;
    },
    get multiplayerWorld() {
      return multiplayerWorld;
    },
    set multiplayerWorld(value) {
      multiplayerWorld = value;
    },
    get N() {
      return N;
    },
    get naturalHeights() {
      return naturalHeights;
    },
    set naturalHeights(value) {
      naturalHeights = value;
    },
    get navFree() {
      return navFree;
    },
    get navigationRegionAt() {
      return navigationRegionAt;
    },
    get nearestExpeditionPoint() {
      return nearestExpeditionPoint;
    },
    get nearestFuel() {
      return nearestFuel;
    },
    get nearestNavigation() {
      return nearestNavigation;
    },
    get niaCitizen() {
      return niaCitizen;
    },
    get nightclub() {
      return nightclub;
    },
    set nightclub(value) {
      nightclub = value;
    },
    get noeValleyLife() {
      return noeValleyLife;
    },
    set noeValleyLife(value) {
      noeValleyLife = value;
    },
    get npcLabel() {
      return npcLabel;
    },
    get npcPrimary() {
      return npcPrimary;
    },
    get npcRevealed() {
      return npcRevealed;
    },
    get objectFootprint() {
      return objectFootprint;
    },
    get objects() {
      return objects;
    },
    get occupied() {
      return occupied;
    },
    get officerRoute() {
      return officerRoute;
    },
    get oldMan() {
      return oldMan;
    },
    set oldMan(value) {
      oldMan = value;
    },
    get pacificaSurfSite() {
      return pacificaSurfSite;
    },
    set pacificaSurfSite(value) {
      pacificaSurfSite = value;
    },
    get PALACE_LAGOON() {
      return PALACE_LAGOON;
    },
    get palaceWater() {
      return palaceWater;
    },
    get parcelBins() {
      return parcelBins;
    },
    get parkBike() {
      return parkBike;
    },
    get parkFerrari() {
      return parkFerrari;
    },
    get parkMotorcycle() {
      return parkMotorcycle;
    },
    get parkSouthEdge() {
      return parkSouthEdge;
    },
    get parrots() {
      return parrots;
    },
    set parrots(value) {
      parrots = value;
    },
    get pathTo() {
      return pathTo;
    },
    get pedestrianNavigation() {
      return pedestrianNavigation;
    },
    get peptideSpawns() {
      return peptideSpawns;
    },
    set peptideSpawns(value) {
      peptideSpawns = value;
    },
    get pequodSite() {
      return pequodSite;
    },
    set pequodSite(value) {
      pequodSite = value;
    },
    get pickedCache() {
      return pickedCache;
    },
    set pickedCache(value) {
      pickedCache = value;
    },
    get placeAt() {
      return placeAt;
    },
    get placeMarkerViews() {
      return placeMarkerViews;
    },
    get places() {
      return places;
    },
    get player() {
      return player;
    },
    get playerGround() {
      return playerGround;
    },
    get playerLook() {
      return playerLook;
    },
    set playerLook(value) {
      playerLook = value;
    },
    get playerRocketHop() {
      return playerRocketHop;
    },
    get playerSpeechUntil() {
      return playerSpeechUntil;
    },
    set playerSpeechUntil(value) {
      playerSpeechUntil = value;
    },
    get playerWeapon() {
      return playerWeapon;
    },
    get pointers() {
      return pointers;
    },
    get policeActors() {
      return policeActors;
    },
    get polygonBounds() {
      return polygonBounds;
    },
    get POND() {
      return POND;
    },
    get pondValue() {
      return pondValue;
    },
    get prepareWayfinding() {
      return prepareWayfinding;
    },
    get PRESIDIO() {
      return PRESIDIO;
    },
    get pressTimer() {
      return pressTimer;
    },
    set pressTimer(value) {
      pressTimer = value;
    },
    get program() {
      return program;
    },
    set program(value) {
      program = value;
    },
    get project() {
      return project;
    },
    get publicSpaces() {
      return publicSpaces;
    },
    get publishMultiplayerPose() {
      return publishMultiplayerPose;
    },
    get questMenu() {
      return questMenu;
    },
    set questMenu(value) {
      questMenu = value;
    },
    get quests() {
      return quests;
    },
    get raf() {
      return raf;
    },
    set raf(value) {
      raf = value;
    },
    get railgunLineClear() {
      return railgunLineClear;
    },
    get readerPlace() {
      return readerPlace;
    },
    set readerPlace(value) {
      readerPlace = value;
    },
    get rectangle() {
      return rectangle;
    },
    get reduced() {
      return reduced;
    },
    get referenceMapArtPoint() {
      return referenceMapArtPoint;
    },
    get regionalCitizenApproach() {
      return regionalCitizenApproach;
    },
    get regionalRoad() {
      return regionalRoad;
    },
    set regionalRoad(value) {
      regionalRoad = value;
    },
    get rehabilitation() {
      return rehabilitation;
    },
    get releaseNPC() {
      return releaseNPC;
    },
    get render() {
      return render;
    },
    get renderStats() {
      return renderStats;
    },
    get reserved() {
      return reserved;
    },
    get resize() {
      return resize;
    },
    get respawnAtHospital() {
      return respawnAtHospital;
    },
    get restaurantDiners() {
      return restaurantDiners;
    },
    get restaurantSites() {
      return restaurantSites;
    },
    get retainInteriors() {
      return retainInteriors;
    },
    get roadDistance() {
      return roadDistance;
    },
    get roadIndex() {
      return roadIndex;
    },
    get rocket() {
      return rocket;
    },
    get rope() {
      return rope;
    },
    get ropeReturnHome() {
      return ropeReturnHome;
    },
    set ropeReturnHome(value) {
      ropeReturnHome = value;
    },
    get sailingCoast() {
      return sailingCoast;
    },
    get saltMail() {
      return saltMail;
    },
    get sandSite() {
      return sandSite;
    },
    set sandSite(value) {
      sandSite = value;
    },
    get savedDeli() {
      return savedDeli;
    },
    set savedDeli(value) {
      savedDeli = value;
    },
    get savedFerrari() {
      return savedFerrari;
    },
    set savedFerrari(value) {
      savedFerrari = value;
    },
    get savedKeeper() {
      return savedKeeper;
    },
    set savedKeeper(value) {
      savedKeeper = value;
    },
    get savedMotorcycle() {
      return savedMotorcycle;
    },
    set savedMotorcycle(value) {
      savedMotorcycle = value;
    },
    get sceneGPU() {
      return sceneGPU;
    },
    set sceneGPU(value) {
      sceneGPU = value;
    },
    get sceneMesh() {
      return sceneMesh;
    },
    set sceneMesh(value) {
      sceneMesh = value;
    },
    get scrollBefore() {
      return scrollBefore;
    },
    set scrollBefore(value) {
      scrollBefore = value;
    },
    get seaBounds() {
      return seaBounds;
    },
    set seaBounds(value) {
      seaBounds = value;
    },
    get searchSites() {
      return searchSites;
    },
    get secretAction() {
      return secretAction;
    },
    get secretStairs() {
      return secretStairs;
    },
    set secretStairs(value) {
      secretStairs = value;
    },
    get secretWorld() {
      return secretWorld;
    },
    set secretWorld(value) {
      secretWorld = value;
    },
    get sections() {
      return sections;
    },
    get sentMultiplayerCustody() {
      return sentMultiplayerCustody;
    },
    set sentMultiplayerCustody(value) {
      sentMultiplayerCustody = value;
    },
    get setCamera() {
      return setCamera;
    },
    get setDancing() {
      return setDancing;
    },
    get setSitting() {
      return setSitting;
    },
    get setupWorldMultiplayer() {
      return setupWorldMultiplayer;
    },
    get setZoom() {
      return setZoom;
    },
    get SHADOW_SIZE() {
      return SHADOW_SIZE;
    },
    get shadowFramebuffer() {
      return shadowFramebuffer;
    },
    set shadowFramebuffer(value) {
      shadowFramebuffer = value;
    },
    get shadowMatrix() {
      return shadowMatrix;
    },
    set shadowMatrix(value) {
      shadowMatrix = value;
    },
    get shadowProgram() {
      return shadowProgram;
    },
    set shadowProgram(value) {
      shadowProgram = value;
    },
    get shadowRoom() {
      return shadowRoom;
    },
    set shadowRoom(value) {
      shadowRoom = value;
    },
    get shadowTexture() {
      return shadowTexture;
    },
    set shadowTexture(value) {
      shadowTexture = value;
    },
    get showCharacter() {
      return showCharacter;
    },
    get sightById() {
      return sightById;
    },
    get sights() {
      return sights;
    },
    get signNames() {
      return signNames;
    },
    get signs() {
      return signs;
    },
    get signTextureControls() {
      return signTextureControls;
    },
    get skateboard() {
      return skateboard;
    },
    get skateDog() {
      return skateDog;
    },
    set skateDog(value) {
      skateDog = value;
    },
    get skateTricks() {
      return skateTricks;
    },
    get slowBus() {
      return slowBus;
    },
    set slowBus(value) {
      slowBus = value;
    },
    get social() {
      return social;
    },
    get socialLife() {
      return socialLife;
    },
    set socialLife(value) {
      socialLife = value;
    },
    get southernLife() {
      return southernLife;
    },
    set southernLife(value) {
      southernLife = value;
    },
    get southernNeighborhood() {
      return southernNeighborhood;
    },
    set southernNeighborhood(value) {
      southernNeighborhood = value;
    },
    get southernTerrain() {
      return southernTerrain;
    },
    set southernTerrain(value) {
      southernTerrain = value;
    },
    get specialNPCLife() {
      return specialNPCLife;
    },
    set specialNPCLife(value) {
      specialNPCLife = value;
    },
    get squareLife() {
      return squareLife;
    },
    set squareLife(value) {
      squareLife = value;
    },
    get stopTraining() {
      return stopTraining;
    },
    get streetLights() {
      return streetLights;
    },
    get streets() {
      return streets;
    },
    get streetTraffic() {
      return streetTraffic;
    },
    set streetTraffic(value) {
      streetTraffic = value;
    },
    get strength() {
      return strength;
    },
    get sub2() {
      return sub2;
    },
    get sunglasses() {
      return sunglasses;
    },
    get sunglassesSite() {
      return sunglassesSite;
    },
    set sunglassesSite(value) {
      sunglassesSite = value;
    },
    get surf() {
      return surf;
    },
    get sutroApproach() {
      return sutroApproach;
    },
    get sutroClimb() {
      return sutroClimb;
    },
    get sutroTravelPending() {
      return sutroTravelPending;
    },
    set sutroTravelPending(value) {
      sutroTravelPending = value;
    },
    get tabletDestinations() {
      return tabletDestinations;
    },
    set tabletDestinations(value) {
      tabletDestinations = value;
    },
    get tabletService() {
      return tabletService;
    },
    set tabletService(value) {
      tabletService = value;
    },
    get tabletWizard() {
      return tabletWizard;
    },
    set tabletWizard(value) {
      tabletWizard = value;
    },
    get tahoe() {
      return tahoe;
    },
    get tahoeGPU() {
      return tahoeGPU;
    },
    set tahoeGPU(value) {
      tahoeGPU = value;
    },
    get tahoeMesh() {
      return tahoeMesh;
    },
    set tahoeMesh(value) {
      tahoeMesh = value;
    },
    get tech() {
      return tech;
    },
    get TERRAIN_GRID() {
      return TERRAIN_GRID;
    },
    get TERRAIN_RES() {
      return TERRAIN_RES;
    },
    get terrainHeight() {
      return terrainHeight;
    },
    get terrainPads() {
      return terrainPads;
    },
    get tileAt() {
      return tileAt;
    },
    get training() {
      return training;
    },
    set training(value) {
      training = value;
    },
    get trainingLast() {
      return trainingLast;
    },
    set trainingLast(value) {
      trainingLast = value;
    },
    get tree() {
      return tree;
    },
    get update() {
      return update;
    },
    get updateAdventureUI() {
      return updateAdventureUI;
    },
    get updateAirshipButton() {
      return updateAirshipButton;
    },
    get updateAlienCombat() {
      return updateAlienCombat;
    },
    get updateBikeButton() {
      return updateBikeButton;
    },
    get updateCamera() {
      return updateCamera;
    },
    get updateCapeControl() {
      return updateCapeControl;
    },
    get updateClimbButton() {
      return updateClimbButton;
    },
    get updateHatControl() {
      return updateHatControl;
    },
    get updatePhoneControl() {
      return updatePhoneControl;
    },
    get updatePurse() {
      return updatePurse;
    },
    get updateRocketControls() {
      return updateRocketControls;
    },
    get updateSitting() {
      return updateSitting;
    },
    get updateSunglassesControl() {
      return updateSunglassesControl;
    },
    get updateSurfButton() {
      return updateSurfButton;
    },
    get updateTahoeButton() {
      return updateTahoeButton;
    },
    get upload() {
      return upload;
    },
    get useFuel() {
      return useFuel;
    },
    get useTeleportTablet() {
      return useTeleportTablet;
    },
    get visited() {
      return visited;
    },
    get WALK_SPEED() {
      return WALK_SPEED;
    },
    get walkTo() {
      return walkTo;
    },
    get WATERFRONT_PIERS() {
      return WATERFRONT_PIERS;
    },
    get waveSurf() {
      return waveSurf;
    },
    get waveTime() {
      return waveTime;
    },
    set waveTime(value) {
      waveTime = value;
    },
    get wearHat() {
      return wearHat;
    },
    get whales() {
      return whales;
    },
    get whalesSeen() {
      return whalesSeen;
    },
    set whalesSeen(value) {
      whalesSeen = value;
    },
    get width() {
      return width;
    },
    set width(value) {
      width = value;
    },
    get wildAttackIn() {
      return wildAttackIn;
    },
    set wildAttackIn(value) {
      wildAttackIn = value;
    },
    get wilderness() {
      return wilderness;
    },
    set wilderness(value) {
      wilderness = value;
    },
    get wildLootSerial() {
      return wildLootSerial;
    },
    set wildLootSerial(value) {
      wildLootSerial = value;
    },
    get wildTarget() {
      return wildTarget;
    },
    set wildTarget(value) {
      wildTarget = value;
    },
    get world() {
      return world;
    },
    get worldStream() {
      return worldStream;
    },
    set worldStream(value) {
      worldStream = value;
    },
    get worldTiles() {
      return worldTiles;
    },
    set worldTiles(value) {
      worldTiles = value;
    },
    get zoo() {
      return zoo;
    },
    set zoo(value) {
      zoo = value;
    },
    get zooBase() {
      return zooBase;
    },
    set zooBase(value) {
      zooBase = value;
    },
    get zoom() {
      return zoom;
    },
    set zoom(value) {
      zoom = value;
    },
  };
  const {
    guildStatus,
    sightById,
    playerWeapon,
    expeditionEvent,
    nearestExpeditionPoint,
    collectExpeditionLoot,
    toggleRailgun,
    beginCapture,
    respawnAtHospital,
    airshipUnavailable,
    walkInBasket,
    useAirship,
    useTahoeActivity,
    releaseNPC,
    parkMotorcycle,
    useMotorcycle,
    canUseTablet,
    useTeleportTablet,
    drinkBankCoffee,
    changeMapInstance,
    secretAction,
    updateAlienCombat,
    showRopeMenu,
    climbUnavailable,
    descendSutro,
    climbSutro,
    goToSight,
    orderDoorDash,
    eatSandwich,
    parkBike,
    useBike,
    useSkateboard,
    performSkateTrick,
    usePacificaSurf,
    catchPacificaWave,
    performSurfTrick,
    useSurf,
    talkRehabilitation,
    arrestPlayer,
    interactCitizen,
    debugTeleport,
    walkTo,
    goToPlace,
    announce,
    enter,
    closeReader,
    closeMenu,
    clicked,
    walkToActor,
    examine,
    showMenu,
    nearestFuel,
    driveFerrari,
    parkFerrari,
    useFerrari,
    useFuelCan,
    useFuel,
    stopTraining,
    useGym,
    setSitting,
    updateSitting,
    sit,
    setDancing,
    dance,
    canForwardRoll,
    rollForward,
  } = createInteractions(context);
  const {
    updatePurse,
    updateAirshipButton,
    updateRocketControls,
    updateTahoeButton,
    updateClimbButton,
    updateBikeButton,
    updateSurfButton,
    updateAdventureUI,
    updateSunglassesControl,
    updatePhoneControl,
    updateHatControl,
    wearHat,
    updateCapeControl,
    playerRocketHop,
    canRocketHop,
    hopRocket,
    lightDecorativeRocket,
    changeCharacter,
    showCharacter,
    closeCharacter,
    sayPhrase,
    showHelp,
    closeHelp,
  } = createHud(context);
  const {
    buildCityMap,
    drawMini,
    minimapPointer,
    navigateFromMinimap,
    selectMinimapIcon,
    prepareWayfinding,
    drawPlaceMarkers,
  } = createMinimap(context);
  const {
    insidePolygon,
    alongStreet,
    occupy,
    pavingInArea,
    signNames,
    terrainHeight,
    airportWalkingHeight,
    characterGround,
    playerGround,
    naturalHeight,
    cutHousePlot,
    parcelFits,
    buildingPoint,
    surfaceTypeAt,
    canPlaceScenery,
    snapshotStaticWorld,
    build,
    buildForBrowser,
  } = createGeneration(context);
  const {
    isWalkable,
    placeAt,
    instituteRoomAt,
    activeInstituteRoom,
    landClearAt,
    clearAt,
    canTravel,
    railgunLineClear,
    creatureApproach,
    merchantApproach,
    motorcycleApproach,
    sutroApproach,
    bunnyApproach,
    officerRoute,
    regionalCitizenApproach,
    navFree,
    buildNavigation,
    finalizeSceneryNavigation,
    nearestNavigation,
    pathTo,
    cityPathTo,
    navigationRegionAt,
    minimapTarget,
  } = createNavigation(context);
  const { initGPU, upload, actorInView, render } = createRendering(context);
  const {
    updateCamera,
    project,
    setCamera,
    setZoom,
    resize,
    update,
    mouseRay,
    tileAt,
    pick,
    hitPlace,
    hitCitizen,
    hitSight,
    startLoop,
    setMode,
  } = createRuntime(context);
  const { setupWorldMultiplayer, publishMultiplayerPose } = createNetwork(context);
  if (!headless && !multiplayer) throw new Error('A game server connection is required.');
  const clientController = createClientControllerFactory({
    client: multiplayer,
    announce: (...args) => announce(...args),
    headless,
    getWorld: () => multiplayerWorld,
    getSecretWorld: () => secretWorld,
    onBoard: () => expeditionEvent({ type: 'boarded' }),
  });
  const $ = (id) => document.getElementById(id),
    world = headless ? null : $('sf-world'),
    canvas = headless ? null : $('sf-canvas'),
    map = headless ? null : $('sf-minimap');
  const gl = headless
    ? null
    : canvas.getContext('webgl', { alpha: false, antialias: true, powerPreference: 'low-power' });
  const mc = headless ? null : map.getContext('2d');
  if (!headless && (!gl || !mc)) return;
  const classic = headless ? null : document.querySelector('.maintable');
  const sections = headless
    ? new Map()
    : new Map(
        [...classic.querySelectorAll('details')].map((el) => [
          el.querySelector('summary').textContent.trim(),
          el,
        ]),
      );
  // Share one geographic transform across coast, park shapes and landmarks.
  // The street drawing has its own authored reference size; widths stay fixed.
  const N = WORLD_SIZE,
    MAP_SCALE = N / REFERENCE_SIZE,
    LAYOUT_SCALE = N / STREET_LAYOUT_SIZE;
  const mapTile = (v) => Math.round(v * MAP_SCALE),
    mapPosition = (v) => v * MAP_SCALE;
  const layoutPosition = (v) => v * LAYOUT_SCALE;
  const mapPolygon = (points) => points.map((p) => p.map(mapPosition));
  const TERRAIN_RES = 4,
    TERRAIN_GRID = N * TERRAIN_RES,
    WALK_SPEED = 4.6,
    ACCELERATION = 24;
  const occupied = new Uint8Array(N * N),
    landMask = new Uint8Array(N * N),
    reserved = new Uint8Array(N * N),
    roadIndex = new Int16Array(N * N),
    roadDistance = new Float32Array(N * N);
  const objects = [],
    places = [],
    instituteRooms = [],
    visited = new Set(),
    policeActors = new Map();
  let multiplayerWorld = null,
    multiplayerSettings = null,
    worldStream = null;
  let secretWorld = null,
    caveMesh = null,
    caveGPU = null,
    oldMan = null,
    secretStairs = null;
  let wilderness = null,
    wildTarget = null,
    wildAttackIn = 0,
    wildLootSerial = 0;
  let bankService = null,
    bankMenu = null,
    banker = null,
    duelMenu = null;
  let tabletService = null,
    tabletWizard = null,
    tabletDestinations = null;
  const caveExitSite = {
    id: 'illuminati-exit',
    kind: 'cave-exit',
    label: 'Stairs to the guild',
    entry: { x: 13, y: 24 },
    description:
      'A long stairway returns to the Freemasons’ Guild above. The public minimap resumes on the surface.',
  };
  const bomberSite = {
    id: 'personal-b2',
    kind: 'stealth-bomber',
    label: 'B-2 Stealth Bomber',
    entry: { x: 13, y: 16 },
    description:
      'Your personal flying wing. Cruise below the airship; hold Shift for rocket speed and press R to barrel roll. Land by parachuting out. The Illuminati covers replacement aircraft. Space drops one bomb every 20 seconds: 100 damage in a 3×3 area, affecting cows, bears and snow/ice giants. Players, townspeople and quest characters are protected.',
  };
  let peptideSpawns = [];

  const player = {
    sitting: false,
    sitBlend: 0,
    x: mapTile(45),
    y: mapTile(29),
    path: [],
    moving: false,
    angle: Math.PI / 2,
    speed: 0,
    vx: 0,
    vy: 0,
    phase: 0,
    motion: 0,
    runBlend: 0,
  };
  const bike = { x: mapTile(44), y: mapTile(30), riding: false };
  const skateboard = { riding: false, travel: 0 },
    skateTricks = createSkateTricks(),
    forwardRoll = createForwardRoll();
  let alienCombat = null,
    deli = null,
    streetTraffic = null,
    airportAds = [],
    airportFieldAds = [],
    esotericCampus = null,
    squareLife = null,
    motorcycle = null,
    monkeyKeeper = null,
    keeperNPC = null,
    approachingNPC = null,
    specialNPCLife = null,
    socialLife = null;
  let savedMotorcycle = {},
    savedKeeper = {};
  if (!headless)
    try {
      savedMotorcycle = JSON.parse(localStorage.getItem('sf-motorcycle-v1') || '{}') || {};
      savedKeeper = JSON.parse(localStorage.getItem('sf-monkey-keeper-v1') || '{}') || {};
    } catch {}
  const capture = createCaptureAnimation(),
    basket = clientController('basket', createAirshipBasket());
  let basketArrival = null;
  let savedSunglasses = {};
  if (!headless)
    try {
      savedSunglasses = JSON.parse(localStorage.getItem('sf-sunglasses-v1') || '{}');
    } catch {}
  const sunglasses = clientController(
    'sunglasses',
    createSunglasses(savedSunglasses, (state) => {
      if (!headless)
        try {
          localStorage.setItem('sf-sunglasses-v1', JSON.stringify(state));
        } catch {}
      if (!headless) updateSunglassesControl();
    }),
  );
  let sunglassesSite = null,
    beachBillboard = null;
  let savedCharacter = {};
  if (!headless)
    try {
      savedCharacter = JSON.parse(localStorage.getItem('sf-character-v1') || '{}');
    } catch {}
  let playerLook = normalizeCharacter({
    ...savedCharacter,
    sunglasses: sunglasses.state.owned && savedCharacter?.sunglasses === true,
  });
  let savedStrength = {},
    savedFerrari = {};
  if (!headless)
    try {
      savedStrength = JSON.parse(localStorage.getItem('sf-strength-v1') || '{}') || {};
      savedFerrari = JSON.parse(localStorage.getItem('sf-ferrari-v1') || '{}') || {};
    } catch {}
  const strength = clientController(
    'strength',
    createStrength(savedStrength, (state) => {
      if (!headless)
        try {
          localStorage.setItem('sf-strength-v1', JSON.stringify(state));
        } catch {}
    }),
  );
  let savedHealth = {},
    savedDeli = {};
  if (!headless)
    try {
      savedHealth = JSON.parse(localStorage.getItem('sf-hitpoints-v1') || '{}');
      savedDeli = JSON.parse(localStorage.getItem('sf-deli-v1') || '{}');
    } catch {}
  const health = createHitpoints(savedHealth, (state) => {
    if (!headless)
      try {
        localStorage.setItem('sf-hitpoints-v1', JSON.stringify(state));
      } catch {}
  });
  const combatFeedback = createCombatFeedback(),
    combatOverlay = headless ? null : createCombatOverlay($('sf-combat-overlay'));
  let ferrari = null,
    highwaySites = [],
    training = false,
    trainingLast = 0,
    gymSelection = 'bench';
  if (!headless)
    try {
      gymSelection = gymExercise(localStorage.getItem('sf-gym-exercise-v1')).id;
    } catch {}
  const camera = { yaw: 0, pitch: Math.PI / 5, cos: 1, sin: 0, version: 0 };
  let active = false,
    built = false,
    raf = 0,
    last = 0,
    width = 1,
    height = 1,
    dpr = 1,
    zoom = 1,
    hovered = null,
    destination = null,
    action = null,
    slowBus = null;
  let keys = new Set(),
    scrollBefore = 0,
    currentInstitute = null,
    currentInterior = null,
    readerPlace = null,
    ducksFedUntil = 0,
    miniLast = 0,
    playerSpeechUntil = 0;
  const reduced = headless || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pointers = new Map();
  let pressTimer = 0,
    longPressed = false,
    pinchDistance = 0,
    gesture = false;
  let savedEconomy = {};
  if (!headless)
    try {
      savedEconomy = JSON.parse(localStorage.getItem('sf-purse-v1') || '{}') || {};
    } catch {}

  const economy = clientController('economy', createEconomy(savedEconomy, updatePurse));
  updatePurse(economy.state);
  const growthTicker = headless ? null : createGrowthTicker($('sf-growth-ticker'));
  const growthService = Object.fromEntries(
    ['buy', 'list', 'sell'].map((method) => [
      method,
      (amount) => ({
        ok: true,
        pending: true,
        promise: serverCommand(
          multiplayer,
          'growth' + { buy: 'Buy', list: 'List', sell: 'Sell' }[method],
          { amount },
        ),
      }),
    ]),
  );
  if (!ownedHat(economy.state.ownedHats, playerLook.hat)) playerLook.hat = 'none';
  const saltMail = createSaltMail(economy);
  let savedTech = {};
  if (!headless)
    try {
      savedTech = JSON.parse(localStorage.getItem('sf-tech-ventures-v1') || '{}') || {};
    } catch {}
  const tech = clientController(
    'tech',
    createTechVentures({
      economy,
      health,
      saved: savedTech,
      onSave: (state) => {
        if (!headless)
          try {
            localStorage.setItem('sf-tech-ventures-v1', JSON.stringify(state));
          } catch {}
      },
      onMessage: (text) => {
        if (!headless && built) announce(text, 'Tech');
      },
      onDeath: () => {
        if (!headless) beginCapture('doomscrolling', respawnAtHospital);
      },
    }),
  );

  let savedJob = {};
  if (!headless)
    try {
      savedJob = JSON.parse(localStorage.getItem('sf-ai-lab-job-v1') || '{}');
    } catch {}
  const aiLabJob = clientController(
    'job',
    createAILabJob({
      saved: savedJob,
      economy,
      onSave: (state) => {
        if (!headless)
          try {
            localStorage.setItem('sf-ai-lab-job-v1', JSON.stringify(state));
          } catch {}
      },
    }),
  );
  const fishing = clientController('fishing', createFishing(economy));
  let fishingSite = null,
    sandSite = null;
  let savedInebriation = 0;
  if (!headless)
    try {
      savedInebriation = JSON.parse(localStorage.getItem('sf-inebriation-v1') || '0');
    } catch {}
  const inebriation = clientController(
    'inebriation',
    createInebriation(savedInebriation, (value) => {
      if (!headless)
        try {
          localStorage.setItem('sf-inebriation-v1', JSON.stringify(value));
        } catch {}
    }),
  );
  const social = clientController(
    'social',
    createSocialBusiness({
      economy,
      inebriation,
      onEvent: (event) => {
        event.npc.speech = event.accepted
          ? 'Sold! More sales!'
          : 'Let us circle back next quarter.';
        event.npc.speechUntil = (headless ? 0 : performance.now()) + 3500;
        if (!headless) {
          announce(event.message, event.npc.name);
          dialogue.resolvePending(event.npc.id, event.message);
          updateAdventureUI();
        }
      },
    }),
  );
  const rehabilitation = createRehabilitation(() => {
    if (multiplayer) {
      world.inert = false;
      respawnAtHospital(true);
      return;
    }
    playerLook = normalizeCharacter(scrambleAppearance(playerLook));
    if (!headless)
      try {
        localStorage.setItem('sf-character-v1', JSON.stringify(playerLook));
      } catch {}
    inebriation.set(100);
    world.inert = false;
    respawnAtHospital(true);
  });
  let jailStaff = [],
    parrots = [];
  let savedQuests = {},
    questMenu = null,
    collectionMenu = null,
    collectionFound = [];
  if (!headless)
    try {
      savedQuests = JSON.parse(localStorage.getItem('sf-quests-v1') || '{}') || {};
    } catch {}
  const quests = clientController(
    'quests',
    createQuestLog(savedQuests, (state) => {
      if (!headless)
        try {
          localStorage.setItem('sf-quests-v1', JSON.stringify(state));
        } catch {}
      questMenu?.render();
      if (state.monkey !== 'carrying') monkeyKeeper?.stop();
      if (built && !headless) updateAdventureUI();
    }),
  );
  let savedExpeditions = {};
  if (!headless)
    try {
      savedExpeditions = JSON.parse(localStorage.getItem('sf-expeditions-v1') || '{}') || {};
    } catch {}
  let pequodSite = null,
    ahabNPC = null;
  const expeditions = clientController(
    'expeditions',
    createExpeditions({
      saved: savedExpeditions,
      health,
      economy,
      level: () => strength.status.level,
      inebriation: () => inebriation.state.percent,
      sharedWorld: () => !!multiplayer,
      hasBayonet: () => quests.theyLive.state.bayonet,
      food: (n) => deli?.storeSandwich(n),
      player: () => ({
        x: player.x + 0.5,
        z: player.y + 0.5,
        base: playerGround(),
        isPlayer: true,
        eligible:
          !capture.state.active &&
          !chase?.state.jailed &&
          !flying() &&
          !rocket.state.active &&
          !surf.state.riding &&
          !rope.climbing &&
          !sutroClimb.state.active &&
          tahoe.state.mode === 'ground',
      }),
      pedestrians: () => [
        ...(cityLife?.people || []),
        ...(southernLife?.people || []),
        ...(squareLife?.people || []),
      ],
      routeTo: (a, b) =>
        pathTo(b.x - 0.5, b.z - 0.5, { x: a.x - 0.5, y: a.z - 0.5 }, true)?.map((p) => ({
          x: p.x + 0.5,
          z: p.y + 0.5,
        })),
      canTravel: (a, b) => canTravel(a.x - 0.5, a.z - 0.5, b.x - 0.5, b.z - 0.5, true),
      lineClear: railgunLineClear,
      onSave: (state) => {
        if (!headless)
          try {
            localStorage.setItem('sf-expeditions-v1', JSON.stringify(state));
          } catch {}
        questMenu?.render();
      },
      onEvent: expeditionEvent,
    }),
  );
  const existingQuestEntries = quests.entries;
  quests.entries = () => [
    ...existingQuestEntries(),
    ...expeditions.entries(),
    ...saltMail.entries(),
    ...(secretWorld ? [secretWorld.questEntry(guildStatus())] : []),
  ];
  playerLook.cape = expeditions.state.cape && playerLook.cape;
  // Existing sunglasses owners enter the quest too; a reload never resets it.
  if (sunglasses.state.owned) quests.theyLive.start();
  const dialogue = headless
    ? null
    : createDialogue({
        element: $('sf-dialogue'),
        journal: world.querySelector('.sf-journal'),
        log: $('sf-log'),
        trade: (kind) => serverCommand(multiplayer, 'inventory', { op: 'trade', kind }),
        canInteract: () => serverConnected(multiplayer),
        announce,
        getPlayer: () => ({ ...playerLook, name: multiplayer?.state.name || 'You' }),
        onClose: () => {
          releaseNPC();
          canvas.focus({ preventScroll: true });
        },
      });
  const aiInterview = headless
    ? null
    : createAIInterviewUI({
        client: multiplayer,
        element: $('sf-ai-interview'),
        job: aiLabJob,
        onOpen: () => {
          fishing.cancel();
          alienCombat = null;
          setDancing(false);
          closeReader();
          closeCharacter();
          closeHelp();
          closeMenu();
          dialogue.close();
          keys.clear();
          player.path = [];
          player.speed = 0;
          action = null;
          destination = null;
        },
        onClose: () => canvas.focus({ preventScroll: true }),
        onResult: (result) => {
          announce(result.message, 'AI Lab');
          updateAdventureUI();
        },
      });
  if (!headless)
    questMenu = createQuestMenu({
      element: $('sf-quests'),
      content: $('sf-quest-list'),
      button: $('sf-quests-button'),
      closeButton: $('sf-close-quests'),
      shade: $('sf-reader-shade'),
      canvas,
      quests,
      beforeOpen: () => {
        collectionMenu?.close();
        closeCharacter();
        closeReader();
        closeHelp();
        closeMenu();
        dialogue.close();
        keys.clear();
        player.path = [];
        player.speed = 0;
      },
    });
  if (!headless)
    collectionMenu = createCollectionMenu({
      element: $('sf-collection'),
      content: $('sf-collection-list'),
      summary: $('sf-collection-summary'),
      button: $('sf-collection-button'),
      closeButton: $('sf-close-collection'),
      shade: $('sf-reader-shade'),
      canvas,
      getFound: () => collectionFound,
      beforeOpen: () => {
        questMenu?.close();
        closeCharacter();
        closeReader();
        closeHelp();
        closeMenu();
        dialogue.close();
        keys.clear();
      },
    });
  const frameMeter = createFrameMeter(),
    renderStats = { cpu: 0, actors: 0 };
  const debugConsole = headless
    ? null
    : createDebugConsole({
        panel: $('sf-debug'),
        form: $('sf-command'),
        input: $('sf-command-input'),
        status: $('sf-command-status'),
        xOutput: $('sf-debug-x'),
        yOutput: $('sf-debug-y'),
        fpsOutput: $('sf-debug-fps'),
        getFPS: () => frameMeter.fps,
        performanceOutputs: {
          cpu: $('sf-debug-cpu'),
          actors: $('sf-debug-actors'),
          tiles: $('sf-debug-tiles'),
          cache: $('sf-debug-cache'),
        },
        getPerformance: () => ({
          cpu: renderStats.cpu.toFixed(1) + ' ms',
          actors: renderStats.actors.toFixed(1) + ' ms',
          tiles:
            (worldStream?.stats.resident || 0) +
            ' +' +
            (worldStream?.stats.queuedVisible || 0) +
            ' pending',
          cache:
            worldStream?.stats.cacheAvailable === false
              ? 'Unavailable'
              : Math.round(
                  (100 * (worldStream?.stats.cachedBytes || 0)) /
                    (worldStream?.stats.totalBytes || 1),
                ) +
                '% · ' +
                (worldStream?.stats.cacheHits || 0) +
                ' hits · ' +
                Math.round((worldStream?.stats.residentBytes || 0) / 1048576) +
                ' MiB scenery',
        }),
        getPosition: () => debugMapPosition(player),
        teleport: debugTeleport,
        beforeOpen: () => {
          keys.clear();
          player.path = [];
          player.speed = 0;
          player.moving = false;
          action = null;
          destination = null;
        },
        onMessage: (text) => announce(text, 'Debug'),
        focusWorld: () => canvas.focus({ preventScroll: true }),
      });
  const connectionGate = headless
    ? null
    : createServerConnectionGate({
        client: multiplayer,
        element: $('sf-server-required'),
        world,
        onDisconnect: () => {
          loading?.hide();
          keys.clear();
          pointers.clear();
          clearTimeout(pressTimer);
          gesture = false;
          player.path = [];
          player.speed = 0;
          player.motion = 0;
          player.moving = false;
          action = null;
          destination = null;
          basketArrival = null;
          carArrival = null;
          forwardRoll.cancel();
          multiplayer.checkpoint(true);
          dialogue.cancel();
          aiInterview.close();
          questMenu?.close();
          debugConsole.close();
          if (bankMenu?.active) bankMenu.close();
          closeMenu();
          closeReader();
          closeCharacter();
          closeHelp();
          $('sf-duel').hidden = true;
          $('sf-hover').hidden = true;
        },
      });

  // A hand-drawn geographic schematic. x runs west to east; y runs north to south.
  // The southern land continues past the city boundary, rather than forming an island.
  // Compressed, hand-traced shoreline: Lands End, the northern waterfront,
  // Rincon Point, Mission Bay, India Basin, and the Hunters Point peninsula.
  const COAST = createSFCoast(MAP_SCALE);
  const PRESIDIO = [
    [14, 10],
    [19, 8],
    [29, 11],
    [33, 17],
    [30, 20],
    [27, 22],
    [17, 20],
    [11, 16],
  ].map((p) => p.map(mapPosition));
  const MARIN = mapPolygon(MARIN_OUTLINE);
  const sailingCoast = createSFCoast(MAP_SCALE, SOUTHERN_BOUNDS.south);
  const bridgeDirection = unit([
    DOWNTOWN.bridge.end[0] - DOWNTOWN.bridge.abutment[0],
    0,
    DOWNTOWN.bridge.end[1] - DOWNTOWN.bridge.abutment[1],
  ]);
  const islandCenter = [
    mapPosition(DOWNTOWN.bridge.end[0]) + bridgeDirection[0] * 2,
    mapPosition(DOWNTOWN.bridge.end[1]) + bridgeDirection[2] * 2,
  ];
  const islandOutline = (x, z, rx, rz) =>
    Array.from({ length: 32 }, (_, i) => [
      x + Math.cos((i * Math.PI) / 16) * rx,
      z + Math.sin((i * Math.PI) / 16) * rz,
    ]);
  const surf = createWindsurfing({
      scale: MAP_SCALE,
      obstacles: [
        sailingCoast,
        MARIN,
        islandOutline(...islandCenter, 3.25, 2.8),
        islandOutline(islandCenter[0] + 1.1, islandCenter[1] - 0.8, 2.1, 2.1),
        islandOutline(PROMETHEUS.x, PROMETHEUS.z, 3.15, 3.15),
      ],
    }),
    detention = createDetentionSite(MAP_SCALE);
  const waveSurf = createSurfing({
    water: surf.water,
    segment: (a, b) => surf.segment({ x: a.x - 0.5, y: a.z - 0.5 }, { x: b.x - 0.5, y: b.z - 0.5 }),
  });
  let pacificaSurfSite = null,
    waveTime = 0;
  let chase = null,
    zoo = null,
    zooBase = 0,
    bunny = null,
    skateDog = null;
  const sutroClimb = clientController('sutro', createSutroClimb()),
    airship = clientController(
      'airship',
      createAirship({ worldSize: N, groundHeight: (x, z) => terrainHeight(x, z) }),
    ),
    rope = clientController('rope', createAirshipRope()),
    bayShipping = createBayShipping(MAP_SCALE),
    whales = createWhales(),
    merchants = [],
    tahoe = clientController('tahoe', createTahoe());
  let sutroTravelPending = false;
  let ropeReturnHome = false,
    whalesSeen = false;
  const rocket = clientController(
    'rocket',
    createRocketTravel({ groundHeight: (x, z) => terrainHeight(x, z) }),
  );
  let southernLife = null,
    nightclub = null,
    goldenGate = null,
    marinLand = null,
    regionalRoad = null,
    countryside = null,
    highwayMesh = null,
    highwayGPU = null,
    southernTerrain = null,
    southernNeighborhood = null;
  const flying = () => airship.state.active && !rope.onGround;
  const searchSites = [],
    loreSites = [];
  const labelPool = [],
    niaCitizen = { id: 'nia', label: 'Bani · Mazarine Coffee', named: 'Bani' };
  const HILLS = SF_HILLS.map((h) => ({
    ...h,
    x: mapPosition(h.x),
    y: mapPosition(h.y),
    r: mapPosition(h.r),
  }));
  // Planned city blocks. Regular streets use the same half-tile center lines;
  // SoMa has a separate 45-degree grid meeting Market Street.
  const streets = [];
  const street = (name, points, w = 0.5, kind = 'road') =>
    streets.push({ name, points, w, kind, planned: true });
  street(
    'Market Street',
    [
      [69.5, 29.5],
      [46.5, 52.5],
    ],
    0.75,
    'market',
  );
  street(
    'Embarcadero',
    [
      [60.5, 14.5],
      [64.5, 18.5],
      [68.5, 23.5],
      [71.5, 29.5],
      [71.5, 35.5],
      [73.5, 42.5],
      [74.5, 48.5],
    ],
    0.65,
  );
  const west = [12.5, 18.5, 23.5, 29.5, 34.5, 40.5];
  for (let i = 0; i < west.length; i++) {
    street(
      [
        'Great Highway',
        'Sunset Boulevard',
        '19th Avenue',
        '24th Avenue',
        '30th Avenue',
        'Stanyan Street',
      ][i],
      [
        [west[i], 45.5],
        [west[i], 80.5],
      ],
    );
    if (i)
      street('Richmond avenue', [
        [west[i], 28.5],
        [west[i], 36.5],
      ]);
  }
  for (const [name, z] of [
    ['Lincoln Way', 45.5],
    ['Irving Street', 51.5],
    ['Noriega Street', 56.5],
    ['Taraval Street', 61.5],
    ['Vicente Street', 66.5],
    ['Sloat Boulevard', 71.5],
    ['Ocean Avenue', 77.5],
  ])
    street(name, [
      [12.5, z],
      [40.5, z],
    ]);
  for (const [name, z] of [
    ['Clement Street', 28.5],
    ['Geary Boulevard', 32.5],
    ['Fulton Street', 36.5],
  ])
    street(name, [
      [12.5, z],
      [z === 28.5 || z === 36.5 ? 40.5 : Math.min(60.5, 99 - z), z],
    ]);
  for (const [name, x] of [
    ['Divisadero Street', 42.5],
    ['Van Ness Avenue', 49.5],
    ['Powell Street', 54.5],
    ['Grant Avenue', 60.5],
  ])
    street(name, [
      [x, x < 46 ? 22.5 : x === 54.5 ? 13.5 : 17.5],
      [x, Math.min(43.5, 99 - x)],
    ]);
  for (const [name, z] of [
    ['Lombard Street', 17.5],
    ['Broadway', 22.5],
    ['California Street', 27.5],
  ])
    street(name, [
      [z < 23 ? 45.5 : 40.5, z],
      [Math.min(z >= 27 ? 60.5 : 68.5, 99 - z), z],
    ]);
  street('Marina Boulevard', [
    [32.5, 16.5],
    [38.5, 17.5],
    [45.5, 17.5],
  ]);
  street('Fell Street', [
    [40.5, 39.5],
    [49.5, 39.5],
  ]);
  street('Oak Street', [
    [40.5, 42.5],
    [55.5, 42.5],
  ]);
  street('Haight Street', [
    [40.5, 48.5],
    [49.5, 48.5],
  ]);
  for (const [name, x] of [
    ['Divisadero south', 44.5],
    ['Castro Street', 49.5],
    ['Valencia Street', 54.5],
    ['Mission Street', 59.5],
    ['South Van Ness', 64.5],
    ['Third Street', 70.5],
  ])
    street(name, [
      [x, x < 50 ? 43.5 : x - 3],
      [x, x < 50 ? 64.5 : 77.5],
    ]);
  for (const [name, z] of [
    ['Sixteenth Street', 54.5],
    ['Twentieth Street', 59.5],
    ['Twenty-fourth Street', 64.5],
    ['Cesar Chavez Street', 69.5],
    ['Alemany Boulevard', 74.5],
  ])
    street(name, [
      [44.5, z],
      [Math.min(74.5, z + 3), z],
    ]);
  for (const [name, sum] of [
    ['Mission Street north', 108],
    ['Folsom Street', 117],
    ['Harrison Street', 126],
  ])
    street(name, [
      [(sum + 3) / 2, (sum - 3) / 2],
      [74.5, sum - 74.5],
    ]);
  for (const [name, diff] of [
    ['Second Street', 30],
    ['Fourth Street', 21],
    ['Sixth Street', 12],
    ['Eighth Street', 3],
  ])
    street(name, [
      [(99 + diff) / 2, (99 - diff) / 2],
      [(126 + diff) / 2, (126 - diff) / 2],
    ]);
  for (const r of streets) r.points = r.points.map((p) => p.map(layoutPosition));
  // End each northern avenue where its southbound continuation begins.
  for (const name of ['Great Highway', '24th Avenue', '30th Avenue', 'Stanyan Street'])
    streets.find((r) => r.name === name).points.at(-1)[1] = 89.5;
  streets.find((r) => r.name === '19th Avenue').points.at(-1)[1] = 91.5;
  streets[0].points = mapPolygon(DOWNTOWN.market);
  streets.find((r) => r.name === 'Embarcadero').points[3] = DOWNTOWN.market[0].map(mapPosition);
  street('First Street', mapPolygon(DOWNTOWN.firstStreet), 0.5);
  for (const r of SOUTHERN_ROADS) {
    street(r.name, r.points, AIRSHIP_ACCESS.halfWidth);
    streets.at(-1).regional = true;
  }
  for (const r of ZOO_PATHS) street(r.name, r.points, r.w, 'path');
  // These two streets hug the park's actual edges, on the same coordinates.
  streets
    .find((r) => r.name === 'Fell Street')
    .points.forEach((p) => (p[1] = mapPosition(PANHANDLE.north) - 0.8));
  streets
    .find((r) => r.name === 'Oak Street')
    .points.forEach((p) => (p[1] = mapPosition(PANHANDLE.south) + 0.8));
  street('Stanyan park edge', [
    [mapPosition(32) - 0.85, layoutPosition(36.5)],
    [mapPosition(32) - 0.85, layoutPosition(45.5)],
  ]);
  street(
    'Masonic Avenue',
    mapPolygon([
      [35.8, 30.95],
      [35.8, 32.2],
    ]),
    0.38,
  );
  street(
    'Portola Drive',
    mapPolygon([
      [35, 39],
      [32, 41],
      [31, 46],
      [34, 50],
      [40, 55],
    ]),
    0.5,
  );
  for (const [name, points] of [
    [
      'Presidio Boulevard',
      [
        [19, 9],
        [20, 13],
        [24, 16],
        [27, 20],
        [32, 22],
      ],
    ],
    [
      'JFK Promenade',
      [
        [10, 30.5],
        [15, 30.1],
        [19, 30.5],
        [24, 30.3],
        [29, 31],
        [32, 31.5],
        [37.1, 31.5],
      ],
    ],
    [
      'Main Post walk',
      [
        [22, 17.5],
        [29, 17.5],
      ],
    ],
    [
      'Lovers Lane',
      [
        [25, 17.5],
        [27, 19.5],
        [29, 21],
      ],
    ],
    [
      'Crissy Field promenade',
      [
        [25, 11.5],
        [29, 12],
        [32, 12],
      ],
    ],
    [
      'Martin Luther King Jr Drive',
      [
        [10, 33],
        [18, 33.2],
        [25, 33.3],
        [31, 33],
      ],
    ],
    [
      'Twin Peaks trail',
      [
        [32, 41],
        [30, 41.5],
        [29, 43],
        [28, 44.5],
        [31, 46],
      ],
    ],
  ])
    street(name, mapPolygon(points), 0.24, 'path');
  const market = streets[0],
    POND = { x: 23.3, y: 32, rx: 1.9, ry: 0.8 },
    PALACE_LAGOON = { x: 34.6, y: 13.1, rx: 1.4, ry: 0.8 };
  for (const p of [POND, PALACE_LAGOON])
    for (const key of ['x', 'y', 'rx', 'ry']) p[key] *= MAP_SCALE;
  // Keep the private cartography north of the city too, so following the
  // player into Marin does not turn the headlands into blank water.
  const MAP_ART = {
    x: 220,
    y: 640,
    width: 900,
    height: Math.ceil(640 + (SOUTHERN_BOUNDS.south * 9.5) / MAP_SCALE + 24),
  };
  let minimapRoadPaths = null;
  const cityMap = headless ? null : document.createElement('canvas');
  if (cityMap) {
    cityMap.width = MAP_ART.width;
    cityMap.height = MAP_ART.height;
  }

  const inPanhandle = (x, y) => inBounds(x / MAP_SCALE, y / MAP_SCALE, PANHANDLE);
  const inPark = (x, y) => inBounds(x / MAP_SCALE, y / MAP_SCALE, PARK_BOUNDS) || inPanhandle(x, y);
  const lincolnWay = streets.find((r) => r.name === 'Lincoln Way');
  const parkSouthEdge = Object.freeze({
    west: mapPosition(PARK_BOUNDS.west),
    east: mapPosition(PARK_BOUNDS.east),
    north: mapPosition(PARK_BOUNDS.south),
    south: lincolnWay.points[0][1] - lincolnWay.w - TILE_CONFIG.curbWidth,
  });
  const pondValue = (x, y) => ((x - POND.x) / POND.rx) ** 2 + ((y - POND.y) / POND.ry) ** 2;
  const mercedValue = (wx, wy) => {
    const x = wx / MAP_SCALE,
      y = wy / MAP_SCALE;
    return Math.min(
      ((x - 16) / 1.7) ** 2 + ((y - 56) / 2.7) ** 2,
      ((x - 18.5) / 1.7) ** 2 + ((y - 58.3) / 2.2) ** 2,
    );
  };
  const palaceWater = (x, y) =>
    ((x - PALACE_LAGOON.x) / PALACE_LAGOON.rx) ** 2 +
    ((y - PALACE_LAGOON.y) / PALACE_LAGOON.ry) ** 2;
  const greenArea = (wx, wy) => {
    const x = wx / MAP_SCALE,
      y = wy / MAP_SCALE;
    return (
      (wx < layoutPosition(12.5) + 3.5 && wy >= layoutPosition(45.5)) ||
      inPark(wx, wy) ||
      inBounds(wx, wy, parkSouthEdge) ||
      woodedHillPark(x, y) ||
      insidePolygon(wx, wy, PRESIDIO) ||
      (x >= 31.5 && x <= 36 && y >= 11 && y <= 15) ||
      (x < 13 && y > 18 && y < 26) ||
      (x >= 33 && x <= 36 && y >= 27 && y <= 30) ||
      inBounds(x, y, DOLORES_PARK) ||
      ((x - 29) / 4) ** 2 + ((y - 43) / 5) ** 2 < 1 ||
      ((x - 28) / 3) ** 2 + ((y - 52) / 3) ** 2 < 1 ||
      ((x - 17) / 3.6) ** 2 + ((y - 57) / 3.5) ** 2 < 1
    );
  };

  const pedestrianNavigation = {
    walkable: (x, z) => landClearAt(x - 0.5, z - 0.5),
    canTravel: (ax, az, bx, bz) => canTravel(ax - 0.5, az - 0.5, bx - 0.5, bz - 0.5, true),
  };

  const configs = [
    {
      id: 'home',
      name: "John's place",
      label: "John's place",
      category: 'Bio & contact',
      source: 'Bio',
      x: 34,
      y: 16,
      w: 3,
      d: 3,
      h: 106,
      color: '#d3bc88',
      style: 'victorian',
      description:
        'A San Francisco resident, builder, and incurable optimist. Ring the bell and say hello.',
    },
    {
      id: 'links',
      name: 'Mazarine Coffee',
      label: 'Mazarine Coffee',
      category: 'Links · Market Street',
      source: 'Links',
      x: 44,
      y: 24,
      w: 3,
      d: 3,
      h: 73,
      color: '#c99a79',
      style: 'cafe',
      description:
        'Coffee on Market Street. Bani is enjoying a table inside Mazarine; browse a few connections to the rest of the internet over coffee.',
    },
    {
      id: 'writing',
      name: 'City Lights',
      label: 'City Lights · Essays',
      category: 'Writing',
      source: 'Writing',
      x: 44,
      y: 15,
      w: 3,
      d: 3,
      h: 88,
      color: '#d3c29e',
      style: 'library',
      description:
        "Pull up a chair. Essays on technology, markets, and the ideas that won't leave you alone.",
    },
    {
      id: 'books',
      name: 'Main Library',
      label: 'Main Library · Bookshelf',
      category: 'Bookshelf',
      source: 'Bookshelf',
      x: 40,
      y: 27,
      w: 3,
      d: 3,
      h: 88,
      color: '#cbc6b4',
      style: 'civic',
      description: 'Fiction and non-fiction that stay with you, long after the last page.',
    },
    {
      id: 'press',
      name: 'The Chronicle',
      label: 'The newsstand',
      category: 'Press & podcasts',
      source: 'Press',
      x: 44,
      y: 34,
      w: 3,
      d: 2,
      h: 48,
      color: '#bb7e60',
      style: 'kiosk',
      description:
        'Extra, extra. News, conversations, and dispatches from the world of building companies.',
    },
    {
      id: 'green',
      name: 'Green Bank',
      label: 'Green Bank',
      category: 'Founding',
      source: 'Founding',
      match: 'green.com',
      x: 49,
      y: 38,
      w: 3,
      d: 3,
      h: 102,
      color: '#789788',
      style: 'bank',
      description:
        'A global financial institution for the people and agents of the future. Speak to the friendly banker inside: deposited coins earn 5% interest per hour. Coffee is on the house.',
    },
    {
      id: 'limit',
      name: 'Limit',
      label: 'Limit',
      category: 'Founding',
      source: 'Founding',
      match: 'limit.com',
      x: 52,
      y: 43,
      w: 3,
      d: 3,
      h: 87,
      color: '#91a6ab',
      style: 'shop',
      description: 'Tools that changed the daily lives of thousands of insurance professionals.',
    },
    {
      id: 'rose',
      name: 'Rose',
      label: 'Rose',
      category: 'Founding',
      source: 'Founding',
      match: 'rosehome.com',
      x: 25,
      y: 25,
      w: 3,
      d: 2,
      h: 70,
      color: '#c29790',
      style: 'shop',
      description: 'A healthier home, starting with the environment around you.',
    },
    {
      id: 'venture',
      name: 'Venture exchange',
      label: 'Venture exchange',
      category: 'Venture',
      source: 'Venture',
      x: 48,
      y: 15,
      w: 3,
      d: 3,
      h: 115,
      color: '#b0a18c',
      style: 'bank',
      description:
        'An arcade of ambitious companies. Meet the builders working on what comes next.',
    },
    {
      id: 'ai-lab',
      name: 'AI Lab',
      label: 'AI Lab',
      category: 'SoMa · interview & employment',
      source: 'AI Lab',
      x: 49,
      y: 32,
      w: 3.5,
      d: 3,
      worldHeight: 3.1,
      color: '#82989b',
      trim: '#dbe3d6',
      arch: 'warehouse',
      roof: 'flat',
      roofColor: '#657a7e',
      description:
        'A SoMa AI lab with a levitating cortical brain, magnetic containment rings, specimen pods, and humming GPU racks. Score 40 or more on the two-minute arithmetic interview to get the job, then earn 1 coin every 2 seconds while inside.',
    },
    {
      id: 'etc',
      name: 'Curiosity shop',
      label: 'Curiosity shop',
      category: 'Etc. · Haight-Ashbury',
      source: 'Etc.',
      x: 31,
      y: 36,
      w: 3,
      d: 3,
      h: 78,
      color: '#aca0b3',
      style: 'shop',
      description:
        'Other corners of the internet, a past life on the web, and a few digital curiosities.',
    },
  ];
  configs.push(...GUILD_BUILDINGS.map((b) => ({ ...b })));
  configs.forEach((b) => {
    b.x = mapTile(b.x);
    b.y = mapTile(b.y);
    const door = Math.floor(b.x + b.w / 2);
    b.entry = { x: door, y: b.y + b.d };
    b.inside = { x: door, y: b.y + b.d - 2 };
    places.push(b);
  });
  const sights = [
    {
      id: 'park',
      label: 'Golden Gate Park',
      category: 'Park · ducks & cycling',
      kind: 'park',
      x: 30,
      y: 32,
      entry: { x: 30, y: 31 },
      description:
        'A long green escape on the western side of the city. Winding paths, cypress trees, and a pond full of very opinionated ducks.',
    },
    {
      id: 'panhandle',
      label: 'The Panhandle',
      category: 'Fell & Oak · tree-lined cycle path',
      kind: 'park',
      x: 34,
      y: 30,
      entry: { x: 35, y: 31 },
      description:
        'The narrow green strip continuing east from Golden Gate Park between Fell and Oak. Cycle beneath the trees, pass the park monument, and continue toward Alamo Square.',
    },
    {
      id: 'presidio',
      label: 'Presidio · Main Post',
      category: 'Parade ground · red-roof barracks',
      kind: 'park',
      x: 22,
      y: 13,
      entry: { x: 25, y: 17 },
      description:
        'Wooded hills give way to a broad parade ground, a flagpole, and rows of red-roof barracks. Trails lead toward Crissy Field, Lovers Lane, and the Golden Gate.',
    },
    {
      id: 'crissy',
      label: 'Crissy Field',
      category: 'Presidio · bayfront meadow',
      kind: 'park',
      x: 28,
      y: 11,
      entry: { x: 29, y: 12 },
      description:
        'A low, open meadow beside the bay, below the wooded Presidio. Borrow the windsurf board by the promenade to sail off the beach.',
    },
    {
      id: 'windsurf',
      label: 'Windsurfing',
      category: 'Crissy Field · board launch',
      kind: 'windsurf',
      x: WINDSURF_LAUNCH.shore[0],
      y: WINDSURF_LAUNCH.shore[1],
      entry: { x: 29, y: 12 },
      description:
        'A windsurf board and rig wait beside Crissy Field. Click the bay to sail; use Return to shore when you are ready to land.',
    },
    {
      id: 'palace',
      label: 'Palace of Fine Arts',
      category: 'Marina · rotunda & lagoon',
      kind: 'palace',
      x: 32,
      y: 12,
      entry: { x: 32, y: 15 },
      description:
        'A sandstone-colored rotunda rises beside a little lagoon. Its dome and colonnade mark the eastern edge of the Presidio and the Marina.',
    },
    {
      id: 'deyoung',
      label: 'de Young Museum',
      category: 'Golden Gate Park · copper tower',
      kind: 'museum',
      x: 26,
      y: 29,
      entry: { x: 26, y: 31 },
      description:
        'A dark copper museum and a twisted observation tower overlook the Music Concourse. The Academy sits across the plaza.',
    },
    {
      id: 'academy',
      label: 'California Academy of Sciences',
      category: 'Golden Gate Park · living roof',
      kind: 'museum',
      x: 27,
      y: 32,
      entry: { x: 28, y: 33 },
      description:
        'Rounded green hills form the living roof of the Academy. Skylights, gardens, and the Music Concourse make a small cultural center within the park.',
    },
    {
      id: 'conservatory',
      label: 'Conservatory of Flowers',
      category: 'Golden Gate Park · white glasshouse',
      kind: 'garden',
      x: 30,
      y: 29,
      entry: { x: 30, y: 30 },
      description:
        'A white glasshouse with a central dome, long glazed wings, and bright flower beds. The Panhandle begins a short ride to the east.',
    },
    {
      id: 'windmill',
      label: 'Park windmill',
      category: 'Golden Gate Park · western gardens',
      kind: 'windmill',
      x: 11,
      y: 29,
      entry: { x: 12, y: 31 },
      description:
        'A timber windmill and flower beds stand near the park’s western end. Beyond the Great Highway, Ocean Beach opens onto the Pacific.',
    },
    {
      id: 'ferry',
      label: 'Ferry Building',
      category: 'Embarcadero · waterfront',
      kind: 'ferry',
      x: 52,
      y: 17,
      entry: { x: 53, y: 23 },
      description:
        'The clock tower at the bay end of Market Street. Watch a streetcar roll past, then follow the waterfront north.',
    },
    {
      id: 'coit',
      label: 'Coit Tower',
      category: 'Telegraph Hill',
      kind: 'coit',
      x: 46,
      y: 12,
      entry: { x: 47, y: 15 },
      description:
        'A pale tower above the steep streets of Telegraph Hill. North Beach sits just down the slope.',
    },
    {
      id: 'pyramid',
      label: 'Transamerica Pyramid',
      category: 'Financial District · redwood plaza',
      kind: 'pyramid',
      x: 48,
      y: 19,
      entry: { x: 51, y: 22 },
      description:
        'A pale, tapering pyramid with a gridded façade and projecting side wings. A small redwood plaza softens the base of the Financial District landmark.',
    },
    {
      id: 'painted',
      label: 'Painted Ladies',
      category: 'Alamo Square',
      kind: 'painted',
      x: 34,
      y: 28,
      entry: { x: 35, y: 30 },
      description:
        'A row of colorful Victorian houses overlooking Alamo Square. A good place to pause before riding west to the park.',
    },
    {
      id: 'chinatown',
      label: 'Chinatown',
      category: 'Grant Avenue',
      kind: 'gate',
      x: 45,
      y: 22,
      entry: { x: 47, y: 23 },
      description:
        'Red pillars, green roof tiles, and Grant Avenue leading into Chinatown. Keep heading north for City Lights.',
    },
    {
      id: 'bicycle',
      label: 'Bicycle',
      category: 'Ride around the city · B',
      kind: 'bike',
      get entry() {
        return { x: Math.round(bike.x), y: Math.round(bike.y) };
      },
      description:
        'A red city bicycle. Ride it along Market Street and through the park. Press B to ride or park it; dismount automatically at shop doors.',
    },
    {
      id: 'golden',
      label: 'Golden Gate Bridge',
      category: 'Presidio · northern strait',
      kind: 'bridge',
      x: 18,
      y: 0,
      entry: { x: 20, y: 10 },
      description:
        'The orange towers span the Golden Gate between the Presidio and Marin. The Pacific opens to the west; the bay opens to the east.',
    },
    {
      id: 'beach',
      label: 'Ocean Beach',
      category: 'Pacific coast · western shore',
      kind: 'beach',
      x: 9,
      y: 42,
      entry: { x: 10, y: 42 },
      description:
        'The long Pacific shoreline beside the Great Highway. Golden Gate Park reaches the beach to the north, and the Sunset stretches inland.',
    },
    {
      id: 'baybridge',
      label: 'Bay Bridge',
      category: 'Rincon Point · eastern waterfront',
      kind: 'bridge',
      x: 55,
      y: 23,
      entry: { x: 54, y: 28 },
      description:
        'The bridge leaves the eastern waterfront for Yerba Buena Island and the East Bay.',
    },
    {
      id: 'peaks',
      label: 'Twin Peaks',
      category: 'Central hills · Portola Drive',
      kind: 'hill',
      x: 29,
      y: 43,
      entry: { x: 30, y: 43 },
      description:
        'The central ridgeline rises between the Sunset and the Castro. Follow the winding trail for a different view of the city.',
    },
    {
      id: 'sutro',
      label: 'Sutro Tower',
      category: 'Central ridge · Clarendon Heights',
      kind: 'tower',
      x: SUTRO_SITE.x,
      y: SUTRO_SITE.y,
      entry: { ...SUTRO_SITE.entry },
      mapPoint: { x: SUTRO_SITE.x, y: SUTRO_SITE.y },
      description:
        'The red-and-white broadcasting tower rises between Mount Sutro and Twin Peaks. Three splayed legs, triangular crossbeams and slender antenna masts make its unmistakable silhouette above the trees.',
    },
    {
      id: 'merced',
      label: 'Lake Merced',
      category: 'Southwestern San Francisco',
      kind: 'lake',
      x: 17,
      y: 57,
      entry: { x: 20, y: 57 },
      description:
        'A freshwater lake near the southwestern edge of the city, south of the Sunset and close to the Pacific.',
    },
    {
      id: 'nia',
      label: 'Bani · café regular',
      category: 'Mazarine Coffee',
      kind: 'guest',
      x: 44,
      y: 28,
      entry: { x: 45, y: 29 },
      hiddenFromDirectory: true,
      description:
        'A friendly woman with warm brown skin and dark curls, enjoying her coffee at a table inside Mazarine.',
    },
    {
      id: 'ducks',
      label: 'Mallards & ducklings',
      category: 'Golden Gate Park',
      kind: 'ducks',
      entry: { x: 26, y: 32 },
      hiddenFromDirectory: true,
      description:
        'Mallards and little ducklings paddle around the pond. They seem certain you brought something for them.',
    },
  ];
  sights.push(
    ...RESTAURANTS.map((r) => ({
      id: r.id,
      label: r.label,
      kind: 'restaurant',
      x: r.target[0],
      y: r.target[1],
      entry: { x: r.target[0], y: r.target[1] },
      category: r.category,
      description: r.description,
    })),
  );
  sights.push(
    {
      id: 'cityhall',
      label: 'City Hall',
      category: 'Civic Center · gilded dome',
      kind: 'civic',
      x: 38,
      y: 30,
      entry: { x: 39, y: 33 },
      description:
        'The granite wings and gilded dome of City Hall anchor Civic Center, just west of Market Street. Speak to the clerk outside about permits.',
    },
    {
      id: 'salesforce',
      label: 'Salesforce Tower',
      category: 'South of Market · skyline',
      kind: 'tower',
      x: 50,
      y: 25,
      entry: { x: 51, y: 28 },
      description:
        'Broad glass façades taper toward a flat rooftop and a softly illuminated crown over the dense towers south of Market. The Transamerica Pyramid stands farther north.',
    },
    {
      id: 'oracle',
      label: 'Oracle Park',
      category: 'South Beach · ballpark & cove',
      kind: 'stadium',
      x: 52,
      y: 34,
      entry: { x: 51, y: 36 },
      description:
        'A brick ballpark opens toward McCovey Cove, with green grass, tiered stands, and tall floodlights above the waterfront.',
    },
    {
      id: 'dolores',
      label: 'Dolores Park',
      category: 'Mission · hillside lawns',
      kind: 'park',
      x: 36,
      y: 44,
      entry: { x: 36, y: 46 },
      description:
        'Palm trees and sloping lawns sit between the Mission and the Castro, with the downtown skyline beyond.',
    },
  );
  const ferrySite = sights.find((s) => s.id === 'ferry'),
    salesforceSite = sights.find((s) => s.id === 'salesforce'),
    bridgeSite = sights.find((s) => s.id === 'baybridge');
  ferrySite.x = DOWNTOWN.ferry.center[0];
  ferrySite.y = DOWNTOWN.ferry.center[1];
  ferrySite.entry = {
    x: DOWNTOWN.ferry.entrance[0] - 0.35 * Math.SQRT1_2,
    y: DOWNTOWN.ferry.entrance[1] + 0.35 * Math.SQRT1_2,
  };
  ferrySite.mapPoint = { x: DOWNTOWN.ferry.center[0], y: DOWNTOWN.ferry.center[1] };
  salesforceSite.x = DOWNTOWN.salesforce.center[0];
  salesforceSite.y = DOWNTOWN.salesforce.center[1];
  salesforceSite.entry = { x: 50, y: 31.6 };
  salesforceSite.mapPoint = { x: 50, y: 30 };
  bridgeSite.entry = { x: DOWNTOWN.bridge.rampStart[0], y: DOWNTOWN.bridge.rampStart[1] };
  bridgeSite.mapPoint = { x: DOWNTOWN.bridge.abutment[0], y: DOWNTOWN.bridge.abutment[1] };
  for (const [id, x, y] of [
    ['panhandle', 35, 31.5],
    ['presidio', 25, 15],
    ['crissy', 29, 11.5],
    ['palace', 33, 13],
    ['deyoung', 27, 29.5],
    ['academy', 28, 32.5],
    ['conservatory', 31, 29.5],
    ['windmill', 11.5, 29.5],
    ['pyramid', 49, 20],
    ['coit', 47, 13],
    ['golden', 18.8, 5],
  ])
    sights.find((s) => s.id === id).mapPoint = { x, y };
  for (const [id, label] of [
    ['deyoung', 'de Young'],
    ['academy', 'Academy · living roof'],
    ['conservatory', 'Conservatory'],
  ])
    sights.find((s) => s.id === id).worldLabel = label;
  for (const s of sights) {
    if (s.x !== undefined) s.x = mapTile(s.x);
    if (s.y !== undefined) s.y = mapTile(s.y);
    if (s.kind !== 'bike') s.entry = { x: mapTile(s.entry.x), y: mapTile(s.entry.y) };
    if (s.mapPoint) s.mapPoint = { x: mapPosition(s.mapPoint.x), y: mapPosition(s.mapPoint.y) };
  }

  const npcRevealed = (npc) => !!(npc.alienId && playerLook.sunglasses);
  const npcLabel = (npc, combat = true) =>
    npcDisplayLabel(npc, {
      revealed: npcRevealed(npc),
      level: npc.alienId && !npcRevealed(npc) ? 1 : actorLevel(npc),
      combat,
    });
  const npcPrimary = (npc) =>
    npc.wilderness
      ? npc.combatKind === 'bear'
        ? 'pet'
        : 'attack'
      : npc.police
        ? 'examine'
        : npc.networkPlayer
          ? 'walk'
          : ['raptor', 'cow', 'kraken'].includes(npc.combatKind) || npcRevealed(npc)
            ? 'attack'
            : 'talk';

  let worldTiles = null;
  // BEGIN TILE BUILDER

  const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];

  // END TILE BUILDER
  // Mesh coordinates are east, elevation, south. Positions/normals/colors/UVs
  // remain in GPU buffers when the camera moves; only its matrix changes.
  // Inline SVG source assets are rasterized once into one mipmapped GPU atlas.
  // Materials repeat in world coordinates, so adjacent surface cells have no seams.
  let tahoeGPU = null,
    tahoeMesh = null;
  const signTextureControls = {};
  let characterGPU = null;
  let program,
    atlasTexture,
    materialTexture,
    materialState = null,
    alpineTextures,
    alpineState = null,
    sceneGPU,
    groundGPU,
    dynamicGPU,
    sceneMesh,
    groundMesh,
    seaBounds,
    shadowProgram,
    shadowFramebuffer,
    shadowTexture,
    shadowMatrix,
    shadowRoom,
    lampGlow,
    cityLife,
    noeValleyLife;
  const SHADOW_SIZE = 2048;
  const glazing = createGlazingBatch();
  let glassGPU = null,
    drawingGlass = false;
  let cityLightPlan = null;
  const streetLights = [],
    buildingModels = [],
    signs = new Map(),
    gpuStats = { triangles: 0, drawCalls: 0 };

  let heights = null,
    naturalHeights = null;

  const lakes = [];

  const terrainPads = [];

  const cityParcels = [],
    publicSpaces = [],
    parcelBins = new Map();
  const rectangle = (cx, cz, w, d, angle = 0) =>
    [
      [-w / 2, -d / 2],
      [w / 2, -d / 2],
      [w / 2, d / 2],
      [-w / 2, d / 2],
    ].map(([x, z]) => [
      cx + x * Math.cos(angle) - z * Math.sin(angle),
      cz + x * Math.sin(angle) + z * Math.cos(angle),
    ]);
  const polygonBounds = (p) => ({
    x: Math.min(...p.map((v) => v[0])),
    z: Math.min(...p.map((v) => v[1])),
    right: Math.max(...p.map((v) => v[0])),
    bottom: Math.max(...p.map((v) => v[1])),
  });
  const objectFootprint = (o) => o.footprint || rectangle(o.x + o.w / 2, o.y + o.d / 2, o.w, o.d);

  const restaurantDiners = [],
    restaurantSites = [];

  let cityNavigation = null,
    cityNavigationObjectCount = 0;

  const {
    makeBuilding,
    makeRestaurantPatio,
    addScenery,
    tree,
    bench,
    human,
    bicycle,
    makeLandmarks,
    enhanceLandmarks,
    addPanhandleDetails,
    detailedGround,
    mapTree,
    mapCanPlace,
    makeTownhomeRow,
    makeCurbShop,
    drawHillsideLifts,
    WATERFRONT_PIERS,
  } = createModels({
    N,
    MAP_SCALE,
    mapTile,
    mapPosition,
    layoutPosition,
    terrainHeight,
    naturalHeight,
    cutHousePlot,
    occupy,
    upload,
    objects,
    signs,
    buildingModels,
    sightById,
    canPlaceScenery,
    isWalkable,
    pavingInArea,
    insidePolygon,
    parcelFits,
    COAST,
    MARIN,
    POND,
    PANHANDLE,
    lakes,
    getSceneMesh: () => sceneMesh,
    rectangle,
  });

  // Eight-way A* with corner clearance, followed by line-of-sight string pulling.
  // Routing starts at the live position, so a new click never snaps back to a tile.

  let sentMultiplayerCustody = false;

  let clickAttempt = null,
    clickAnimation = null;

  const mapArtPoint = (x, y) => ({
    x: MAP_ART.x + (x * 10) / MAP_SCALE,
    y: MAP_ART.y + (y * 9.5) / MAP_SCALE,
  });
  const referenceMapArtPoint = (x, y) => mapArtPoint(mapPosition(x), mapPosition(y));

  let miniIcons = [],
    miniKeyboardPlace = null;
  const placeMarkerViews = [];

  let pickedCache = null,
    frameID = 0;

  let dynamicTargets = [],
    actorTags = [];

  let carArrival = null;

  let hoppingRocket = false;

  let lightingDecorativeRocket = false;

  if (headless) {
    build();
    return {
      searchSites,
      loreSites,
      compiled: bake ? snapshotStaticWorld() : null,
      growthService,
      countryside,
      tabletService,
      tabletWizard,
      tabletDestinations,
      marinLand,
      detention,
      wilderness,
      bankService,
      banker,
      secretWorld,
      caveMesh,
      oldMan,
      secretStairs,
      guildStatus,
      peptideSpawns,
      cityLife,
      lives: [cityLife, southernLife, noeValleyLife, squareLife, esotericCampus?.life].filter(
        Boolean,
      ),
      social,
      socialLife,
      tech,
      saltMail,
      sandSite,
      slowBus,
      expeditions,
      surf,
      waveSurf,
      pacificaSurfSite,
      noeValleyLife,
      instituteRooms,
      instituteRoomAt,
      forwardRoll,
      aiLabJob,
      health,
      deli,
      streetTraffic,
      airportAds,
      airportFieldAds,
      placeAt,
      groundSurfaceAt: (x, z) => (z >= N ? airportSurfaceTypeAt(x, z) : surfaceTypeAt(x, z)),
      economy,
      inebriation,
      rehabilitation,
      jailStaff,
      parrots,
      fishing,
      fishingSite,
      sunglasses,
      sunglassesSite,
      beachBillboard,
      quests,
      skateboard,
      skateTricks,
      motorcycle,
      monkeyKeeper,
      esotericCampus,
      squareLife,
      specialNPCLife,
      cityLightPlan,
      tiles: worldTiles,
      navigation: cityNavigation,
      objects,
      places,
      sights,
      parkSouthEdge,
      southernLife,
      southernNeighborhood,
      spawn: { x: player.x, y: player.y },
      merchants,
      bunny,
      skateDog,
      airship,
      tahoe,
      ferrari,
      strength,
      highwaySites,
      nightclub,
      restaurantDiners,
      regionalRoad,
      goldenGate,
      southernTerrain,
      terrainHeight,
      characterGround,
      pathTo,
      minimapTarget,
      lineClear: railgunLineClear,
      canTravel,
      clearAt,
      landClearAt,
      cityPathTo,
      navigationRegionAt,
      nearestNavigation,
      approaches: {
        bunny: bunnyApproach,
        sutro: sutroApproach,
        merchant: merchantApproach,
        combat: creatureApproach,
      },
    };
  }
  window.SFMapDiagnostics = Object.freeze({
    get streaming() {
      return worldStream?.stats || null;
    },
    get characters() {
      return characterGPU?.stats || { enabled: false };
    },
    get dynamicGeometry() {
      return dynamicGPU?.stats || null;
    },
    navigation: Object.freeze({
      audit: () => (cityNavigation ? auditNavigationGrid(cityNavigation) : null),
      position: (x, y) => cityNavigation?.describe(x, y),
      connected: (from, to) => cityNavigation?.connected(from, to) || false,
      route: (from, to) => (built ? pathTo(to.x, to.y, from) : null),
    }),
    validate: () =>
      worldTiles ? (worldStream ? worldTiles.validation : validateTileMap(worldTiles)) : null,
    testRules: runTileRuleTests,
    get report() {
      return worldTiles?.validation || null;
    },
    tile: (x, z) => {
      const m = worldTiles;
      if (!m || x < 0 || z < 0 || x >= m.size || z >= m.size) return null;
      const t = m.tiles[z * m.size + x];
      return {
        x,
        z,
        type: t.type,
        base: t.base,
        variant: t.variant,
        ports: t.ports,
        curbEdges: t.curbEdges,
        areas: { ...t.areas },
        waterLevel: t.waterLevel,
        waterBorders: t.waterBorders?.map((e) => e.map((s) => ({ ...s }))),
        edges: t.edges.map((e) => e.map((s) => ({ ...s }))),
      };
    },
  });
  $('sf-toggle').hidden = false;
  $('sf-toggle').addEventListener('click', () => {
    if (document.documentElement.dataset.sfEntry === 'explore') {
      window.location.href = new URL('./index.html', window.location.href).href;
      return;
    }
    setMode(!active).catch((error) => loading?.fail(error));
  });
  $('sf-drive-tahoe').addEventListener('click', () =>
    driveFerrari(TAHOE.base.x - 0.5, TAHOE.base.z - 0.5),
  );
  $('sf-drive-dealer').addEventListener('click', () => {
    const p = ferrari.sample(ferrari.dealer);
    driveFerrari(p.x - 0.5, p.z - 0.5);
  });
  $('sf-railgun-button').addEventListener('click', toggleRailgun);
  $('sf-order-doordash').addEventListener('click', orderDoorDash);
  $('sf-eat-sandwich').addEventListener('click', eatSandwich);
  $('sf-fuel-can-button').addEventListener('click', useFuelCan);
  $('sf-ferrari-button').addEventListener('click', useFerrari);
  $('sf-gym-button').addEventListener('click', useGym);
  $('sf-refuel-button').addEventListener('click', () => {
    const s = nearestFuel();
    if (s) useFuel(sightById(s.id));
  });
  $('sf-bike-button').addEventListener('click', useBike);
  $('sf-skateboard-button').addEventListener('click', useSkateboard);
  for (const button of world.querySelectorAll('[data-skate-trick]'))
    button.addEventListener('click', () => performSkateTrick(button.dataset.skateTrick));
  $('sf-motorcycle-button').addEventListener('click', () => useMotorcycle());
  $('sf-climb-button').addEventListener('click', descendSutro);
  $('sf-airship-button').addEventListener('click', useAirship);
  $('sf-rope-button').addEventListener('click', showRopeMenu);
  $('sf-ski-button').addEventListener('click', useTahoeActivity);
  $('sf-surf-button').addEventListener('click', useSurf);
  $('sf-pacifica-surf-button').addEventListener('click', usePacificaSurf);
  $('sf-wave-catch').addEventListener('click', catchPacificaWave);
  for (const button of world.querySelectorAll('[data-surf-trick]'))
    button.addEventListener('click', () => performSurfTrick(button.dataset.surfTrick));
  $('sf-map-button').addEventListener('click', (e) =>
    clicked(e.clientX, e.clientY, () => navigateFromMinimap(e)),
  );
  $('sf-map-button').addEventListener('keydown', selectMinimapIcon);
  $('sf-map-button').addEventListener('focus', () => {
    keys.clear();
    drawMini();
  });
  $('sf-map-button').addEventListener('blur', () => {
    miniKeyboardPlace = null;
    $('sf-map-button').setAttribute(
      'aria-label',
      'Minimap. Click to travel. Arrow keys select a content icon; Enter travels there.',
    );
    drawMini();
  });
  $('sf-map-button').addEventListener('pointerdown', () => keys.clear());
  $('sf-map-button').addEventListener('pointermove', (e) => {
    const pixel = minimapPointer(e),
      icon = pixel && nearestMinimapIcon(miniIcons, pixel.x, pixel.y);
    $('sf-map-button').title = icon
      ? placeIcon(icon.place.id).label + ' · ' + icon.place.label
      : 'Click to travel · Red flag marks your destination';
  });
  $('sf-close-reader').addEventListener('click', closeReader);
  $('sf-reader-shade').addEventListener('click', () => {
    if (bankMenu?.active) bankMenu.close();
    closeReader();
    closeHelp();
    closeCharacter();
    questMenu?.close();
  });
  for (const button of world.querySelectorAll('[data-say]'))
    button.addEventListener('click', () => sayPhrase(button.dataset.say));
  $('sf-roll-button').addEventListener('click', rollForward);
  $('sf-drink-coffee').addEventListener('click', drinkBankCoffee);
  $('sf-dance-button').addEventListener('click', dance);
  $('sf-sit-button').addEventListener('click', sit);
  $('sf-character-button').addEventListener('click', showCharacter);
  $('sf-close-character').addEventListener('click', closeCharacter);
  $('sf-character-done').addEventListener('click', closeCharacter);
  $('sf-light-decorative-rocket').addEventListener('click', lightDecorativeRocket);
  $('sf-rocket-hop').addEventListener('click', hopRocket);
  for (const field of world.querySelectorAll('[data-character]'))
    field.addEventListener('input', () => changeCharacter(field));
  $('sf-iphone-equipped').addEventListener('input', (e) => {
    const result = tech.equipPhone(e.target.checked);
    if (!result.ok) announce(result.message, 'iPhone');
    updatePhoneControl();
    drawCharacterPreview($('sf-character-preview'), {
      ...playerLook,
      rocketBurnUntil: multiplayer?.state.inventory?.decorativeRocket?.burningUntil || 0,
      phone: economy.state.iphoneEquipped,
    });
  });
  $('sf-help-button').addEventListener('click', showHelp);
  $('sf-close-help').addEventListener('click', closeHelp);
  $('sf-help-start').addEventListener('click', closeHelp);
  $('sf-zoom-slider').addEventListener('input', (e) => setZoom(Number(e.target.value) / 100));
  $('sf-zoom-slider').addEventListener('focus', () => keys.clear());
  $('sf-recenter').addEventListener('click', () => {
    setCamera(0, Math.PI / 5);
    setZoom(width < 600 ? 0.8 : 1);
    updateCamera();
  });
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      setZoom(zoom * Math.exp(-e.deltaY * 0.0015));
    },
    { passive: false },
  );
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    clearTimeout(pressTimer);
    longPressed = true;
    clicked(e.clientX, e.clientY, () => showMenu(e.clientX, e.clientY));
  });
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    closeMenu();
    canvas.focus({ preventScroll: true });
    const npc = hitCitizen(e.clientX, e.clientY);
    // Keep a walking actor selected between press and release, even when
    // another NPC crosses the cursor or the character changes pose.
    if (npc && Number.isFinite(npc.hold)) npc.hold = Math.max(npc.hold, 0.35);
    pointers.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      npc,
    });
    canvas.setPointerCapture(e.pointerId);
    longPressed = false;
    if (pointers.size === 1 && e.pointerType !== 'mouse')
      pressTimer = setTimeout(() => {
        longPressed = true;
        clicked(e.clientX, e.clientY, () => showMenu(e.clientX, e.clientY));
      }, 550);
    if (pointers.size === 2) {
      clearTimeout(pressTimer);
      gesture = true;
      const [a, b] = [...pointers.values()];
      pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    const pointer = pointers.get(e.pointerId);
    if (pointer) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      if (Math.hypot(pointer.x - pointer.startX, pointer.y - pointer.startY) > 9)
        clearTimeout(pressTimer);
    }
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()],
        dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance > 0) setZoom(zoom * Math.pow(dist / pinchDistance, 1.5));
      pinchDistance = dist;
      return;
    }
    if (e.pointerType === 'touch') return;
    const citizen = hitCitizen(e.clientX, e.clientY);
    hovered = citizen || hitSight(e.clientX, e.clientY) || hitPlace(e.clientX, e.clientY);
    const tip = $('sf-hover');
    tip.hidden = !hovered || !$('sf-context').hidden;
    if (hovered) {
      const tipText = citizen
        ? citizen.networkPlayer
          ? npcLabel(citizen)
          : { talk: 'Talk-To', attack: 'Attack', examine: 'Examine', pet: 'Pet' }[
              npcPrimary(citizen)
            ] +
            ' ' +
            npcLabel(citizen, npcPrimary(citizen) !== 'examine')
        : (hovered.kind === 'house-storage'
            ? 'Search'
            : hovered.source
              ? currentInterior === hovered && !hovered.activityBuilding
                ? 'Browse'
                : 'Enter'
              : hovered.id === 'sutro' && sutroClimb.state.active
                ? 'Climb down'
                : sightPrimaryVerb(hovered)) +
          ' ' +
          hovered.label;
      setActionText(
        tip,
        tipText,
        citizen
          ? [
              { label: npcLabel(citizen), kind: 'npc' },
              { label: npcLabel(citizen, false), kind: 'npc' },
            ]
          : [{ label: hovered.label, kind: actionTargetKind(hovered) }],
      );
      tip.style.left = Math.max(8, Math.min(width - 300, e.clientX + 17)) + 'px';
      tip.style.top = Math.min(height - 38, e.clientY + 22) + 'px';
    }
  });
  canvas.addEventListener('pointerup', (e) => {
    clearTimeout(pressTimer);
    const p = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (pointers.size === 0 && gesture) {
      gesture = false;
      return;
    }
    if (
      !p ||
      gesture ||
      longPressed ||
      e.button !== 0 ||
      Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > 12
    )
      return;
    clicked(e.clientX, e.clientY, () => {
      const tile = tileAt(e.clientX, e.clientY),
        selectedPlayer = p.npc?.networkPlayer ? p.npc : hitCitizen(e.clientX, e.clientY);
      if (selectedPlayer?.networkPlayer) return walkToActor(selectedPlayer);
      if (selectedPlayer?.police) return examine(selectedPlayer);
      if (secretWorld?.bomber.state.active) return walkTo(tile.x, tile.y);
      const selectedItem = hitSight(e.clientX, e.clientY);
      if (selectedItem?.kind === 'loot') return collectExpeditionLoot(selectedItem);
      if (chase?.state.jailed) {
        const npc = p.npc || hitCitizen(e.clientX, e.clientY);
        return npc?.rehabilitation ? talkRehabilitation(npc) : walkTo(tile.x, tile.y);
      }
      if (ferrari?.state.riding) {
        const npc = p.npc || hitCitizen(e.clientX, e.clientY);
        if (npc?.kind === 'fuel-attendant') return interactCitizen(npc, 'talk');
        return driveFerrari(tile.x, tile.y);
      }
      if (sutroClimb.state.active) {
        if (hitSight(e.clientX, e.clientY)?.id === 'sutro') return descendSutro();
        return climbUnavailable();
      }
      if (flying()) {
        const floor = basket.pick(
          mouseRay(e.clientX, e.clientY),
          airship.state.position,
          airship.state.heading,
        );
        if (floor) return walkInBasket(floor);
        return walkTo(tile.x, tile.y);
      }
      const npc = p.npc || hitCitizen(e.clientX, e.clientY);
      if (npc) return interactCitizen(npc, npcPrimary(npc));
      const roadTarget =
        goldenGate?.targetAt(tile.x + 0.5, tile.y + 0.5) ||
        regionalRoad?.targetAt(tile.x + 0.5, tile.y + 0.5);
      if (roadTarget) return walkTo(roadTarget.x, roadTarget.y);
      const place = hitPlace(e.clientX, e.clientY),
        sight = hitSight(e.clientX, e.clientY);
      if (sight?.enterableInstitute) {
        if (activeInstituteRoom()?.id === sight.id && clearAt(tile.x, tile.y))
          return walkTo(tile.x, tile.y);
        if (pick(e.clientX, e.clientY)?.researchRoom) return goToSight(sight);
        if (clearAt(tile.x, tile.y)) return walkTo(tile.x, tile.y);
      }
      if (
        (sight?.kind === 'times-square' ||
          sight?.kind === 'research-institute' ||
          sight?.kind === 'park' ||
          sight?.kind === 'neighborhood-garden') &&
        clearAt(tile.x, tile.y)
      )
        return walkTo(tile.x, tile.y);
      if (sight?.kind === 'nightlife' && inNightlife(player.x + 0.5, player.y + 0.5))
        return walkTo(tile.x, tile.y);
      if (sight?.id === 'sutro') return climbSutro();
      if (sight) goToSight(sight);
      else if (place && !(place === currentInterior && isWalkable(tile.x, tile.y)))
        goToPlace(place);
      else walkTo(tile.x, tile.y);
    });
  });
  canvas.addEventListener('pointercancel', (e) => {
    clearTimeout(pressTimer);
    pointers.delete(e.pointerId);
    if (!pointers.size) gesture = false;
  });
  canvas.addEventListener('pointerleave', () => {
    $('sf-hover').hidden = true;
    hovered = null;
  });
  document.addEventListener('pointerdown', (e) => {
    if (!$('sf-context').hidden && !$('sf-context').contains(e.target) && e.target !== canvas)
      closeMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (
      !active ||
      !built ||
      loading?.visible ||
      !serverConnected(multiplayer) ||
      tabletService?.state.active
    )
      return;
    if (e.key === 'Shift' && secretWorld?.bomber.state.phase === 'flying') {
      e.preventDefault();
      keys.add('shift');
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (debugConsole.handleKey(e)) return;
    if (capture.state.active || rehabilitation.state.active) return;
    const key = e.key.toLowerCase();
    if (chase?.state.jailed && ['b', 'f', 'e', 'a'].includes(key)) {
      e.preventDefault();
      return;
    }
    if (aiInterview.visible) {
      keys.clear();
      aiInterview.handleKey(e);
      return;
    }
    const modal = collectionMenu?.active
      ? $('sf-collection')
      : bankMenu?.active
        ? $('sf-bank')
        : questMenu?.active
          ? $('sf-quests')
          : !$('sf-character').hidden
            ? $('sf-character')
            : !$('sf-help').hidden
              ? $('sf-help')
              : null;
    if (key === 'escape') {
      e.preventDefault();
      if (collectionMenu?.active) {
        collectionMenu.close();
        return;
      }
      if (bankMenu?.active) {
        bankMenu.close();
        return;
      }
      if (questMenu?.active) {
        questMenu.close();
        return;
      }
      if (training) {
        stopTraining();
        return;
      }
      if (ferrari?.state.riding) {
        ferrari.state.target = null;
        ferrari.state.speed = 0;
        destination = null;
        return;
      }
      if (!$('sf-character').hidden) {
        closeCharacter();
        return;
      }
      if (dialogue.active) {
        dialogue.close();
        return;
      }
      if (!$('sf-context').hidden) {
        closeMenu();
        canvas.focus({ preventScroll: true });
      } else if (!$('sf-help').hidden) closeHelp();
      else if (!$('sf-reader').hidden) closeReader();
      else if (fishing.state.active) {
        fishing.cancel();
        announce('You reel in your line.', 'Fishing');
      } else if (sutroClimb.state.active) descendSutro();
      else if (airship.state.active) {
        airship.stop();
        destination = null;
        updateAirshipButton();
      } else {
        player.path = [];
        player.speed = 0;
        action = null;
        destination = null;
        drawMini();
      }
      return;
    }
    if (dialogue.active) {
      keys.clear();
      dialogue.handleKey(e);
      return;
    }
    if (rocket.state.active && ['a', 'b', 'f', 'e'].includes(key)) {
      e.preventDefault();
      return;
    }
    if (modal) {
      if (key === 'tab') {
        const focus = [...modal.querySelectorAll('button,a[href],canvas[tabindex],input,select')],
          first = focus[0],
          last = focus[focus.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
      return;
    }
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLSelectElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target.isContentEditable
    )
      return;
    if (!$('sf-context').hidden && (key === 'arrowdown' || key === 'arrowup')) {
      e.preventDefault();
      const opts = [...$('sf-context').querySelectorAll('button')],
        i = opts.indexOf(document.activeElement);
      opts[(i + (key === 'arrowdown' ? 1 : -1) + opts.length) % opts.length].focus();
      return;
    }
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      if (e.target instanceof Element && e.target.closest('#sf-reader')) return;
      e.preventDefault();
      keys.add(key);
      return;
    }
    if (secretWorld?.bomber.state.active) {
      if (key === 'r' && !e.repeat) {
        e.preventDefault();
        secretWorld.bomber.barrelRoll();
        return;
      }
      if (key === ' ' && !e.repeat) {
        e.preventDefault();
        secretAction(secretWorld.dropBomb());
        return;
      }
      if (['a', 'b', 'f', 'e', 'r', 'm', 'k', 'v', 'd', 'u', 'g'].includes(key)) {
        e.preventDefault();
        return;
      }
    }
    if (
      !e.repeat &&
      surf.state.riding &&
      surf.state.mode === 'surf' &&
      (key === ' ' || SURF_TRICKS.some((t) => t.key === key))
    ) {
      e.preventDefault();
      if (key === ' ') catchPacificaWave();
      else performSurfTrick(SURF_TRICKS.find((t) => t.key === key).id);
      return;
    }
    if (!e.repeat && skateboard.riding && SKATE_TRICKS.some((t) => t.key === key)) {
      e.preventDefault();
      performSkateTrick(SKATE_TRICKS.find((t) => t.key === key).id);
      return;
    }
    if (key === ' ' && canRocketHop()) {
      e.preventDefault();
      if (!e.repeat) hopRocket();
      return;
    }
    if (e.repeat) return;
    if (key === 'g') {
      e.preventDefault();
      toggleRailgun();
      return;
    }
    if (key === 'u') {
      e.preventDefault();
      usePacificaSurf();
      return;
    }
    if (key === 'q') {
      e.preventDefault();
      questMenu.open();
      return;
    }
    if (key === ' ' && tahoe.state.mode === 'ski') {
      e.preventDefault();
      tahoe.flip();
      return;
    }
    if (key === 'e' && nearTahoe(player.x + 0.5, player.y + 0.5)) {
      e.preventDefault();
      useTahoeActivity();
      return;
    }
    if (key === 'm') {
      e.preventDefault();
      useMotorcycle();
      return;
    }
    if (key === 'k') {
      e.preventDefault();
      useSkateboard();
      return;
    }
    if (key === 'r') {
      e.preventDefault();
      useFerrari();
      return;
    }
    if (key === 'x') {
      e.preventDefault();
      sit();
      return;
    }
    if (key === 'd') {
      e.preventDefault();
      dance();
      return;
    }
    if (key === 'v') {
      e.preventDefault();
      rollForward();
      return;
    }
    if (key === 'c') {
      e.preventDefault();
      showCharacter();
      return;
    }
    if (key === 's') {
      e.preventDefault();
      sayPhrase('yo');
      return;
    }
    if (key === 'a') {
      e.preventDefault();
      useAirship();
      return;
    }
    if (key === 'b') {
      e.preventDefault();
      useBike();
    }
    if (key === 'f') {
      e.preventDefault();
      useSurf();
    }
    if (key === 'e') {
      e.preventDefault();
      if (airship.state.active) {
        airshipUnavailable();
        return;
      }
      if (sutroClimb.state.active) {
        descendSutro();
        return;
      }
      const tower = sightById('sutro').object;
      if (
        tower &&
        Math.hypot(player.x + 0.5 - tower.x - tower.w / 2, player.y + 0.5 - tower.y - tower.d / 2) <
          4
      ) {
        climbSutro();
        return;
      }
      const p =
        currentInterior ||
        places.find((p) => Math.hypot(player.x - p.entry.x, player.y - p.entry.y) < 2.5);
      if (p) enter(p);
      else
        announce(
          'Walk closer to a storefront to enter. Click a content icon on the minimap to visit a storefront.',
        );
    }
    if (key === '+' || key === '=') {
      e.preventDefault();
      setZoom(zoom + 0.1);
    }
    if (key === '-') {
      e.preventDefault();
      setZoom(zoom - 0.1);
    }
    if (key === '?') showHelp();
  });
  document.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => {
    keys.clear();
    clearTimeout(pressTimer);
    pointers.clear();
    gesture = false;
  });
  document.addEventListener('visibilitychange', () => {
    multiplayer.checkpoint(true);
    keys.clear();
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else if (active) startLoop();
  });
  canvas.addEventListener('webglcontextlost', (e) => {
    characterGPU = null;
    multiplayer.checkpoint(true);
    e.preventDefault();
    keys.clear();
    cancelAnimationFrame(raf);
  });
  canvas.addEventListener('webglcontextrestored', () => {
    multiplayer.checkpoint(true);
    if (!built) return;
    gpuStats.triangles = 0;
    initGPU();
    if (caveMesh) {
      caveGPU = upload(caveMesh);
      caveGPU.walls = caveMesh.walls.map((w) => ({ ...w, gpu: upload(w.mesh) }));
    }
    worldStream?.restore();
    groundGPU = upload(groundMesh, { spatial: true });
    sceneGPU = upload(sceneMesh, { spatial: true });
    if (tahoeMesh) tahoeGPU = upload(tahoeMesh);
    for (const [id, site] of [
      ['sf-spaceport', SF_SPACEPORT],
      ['tahoe-spaceport', tahoe.spaceport],
    ]) {
      const npc = merchant(
        'crew',
        site.entry.x + 1.2,
        site.entry.y + 0.5,
        id === 'sf-spaceport'
          ? airportWalkingHeight(site.entry.x + 1.2, site.entry.y + 0.5)
          : tahoeHeight(site.entry.x + 1.2, site.entry.y + 0.5) + 0.04,
      );
      merchants.push({ ...npc, id: id + '-attendant', siteId: id, angle: Math.PI });
    }
    if (highwayMesh) highwayGPU = upload(highwayMesh);
    for (const o of buildingModels) o.gpu = upload(o.mesh);
    updateCamera();
    if (active) startLoop();
  });
  window.addEventListener('resize', resize);
  if (document.documentElement.dataset.sfEntry === 'explore')
    setMode(true).catch((error) => loading?.fail(error));
}

/** Build the actual authored world without DOM, canvas, WebGL, images or a server.
 * Geometry placement is shared; rasterization, upload and UI initialization are skipped. */
