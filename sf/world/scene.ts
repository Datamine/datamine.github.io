import { requirePlacedBuilding } from '../building-placement.ts';
import { hasPhysicalBounds } from '../picking.ts';
import type {
  SceneObject,
  PickTarget,
  BeachBillboard,
  CityParcel,
  Lake,
  LightSource,
  ActorTag,
  ActorLabel,
  ActorTarget,
  MinimapIcon,
  PlaceMarkerView,
} from '../types/scene-state.ts';
import type {
  PositionedSite,
  FishingSite,
  Street,
  SignAtlas,
  LocalPlayer,
  Actor,
  WorldObject,
  Site,
  Place,
} from '../types/world.ts';
import { isFiniteNumber } from '../types/json.ts';

import { requiredValue } from '../types/assert.ts';

import type { HeightField } from '../southern-terrain.ts';

import type { TerrainPad, DestinationBuilding, BuildingModel } from '../types/buildings.ts';

import type { InstituteRoom } from '../types/interiors.ts';
import type { GeometryGPU, ShaderProgram, CameraState } from '../types/rendering.ts';
import type { WorldTileMap } from '../types/tiles.ts';

import type { createMultiplayerClient } from '../multiplayer-client.ts';
import type { createLoadingScreen } from '../loading-screen.ts';
import type { Point } from '../types/geometry.ts';
import type { Mesh } from '../geometry.ts';

import { gameElement } from '../types/ui.ts';
import { attachSceneBindings } from '../types/scene-bindings.ts';
// CONTENT-BINDINGS-MIGRATED
import { contentText } from '../content-runtime.ts';
import { createClientControllerFactory } from '../client/controllers.ts';
import { createNetwork } from './network.ts';
import { createRuntime } from './runtime.ts';
import { createRendering } from './rendering.ts';
import { createNavigation } from './navigation.ts';
import { createGeneration } from './generation.ts';
import { createMinimap } from './minimap.ts';
import { createHud } from './hud.ts';
import { createInteractions } from './interactions.ts';
import '../rendering/dynamic-buffer.ts';
import '../rendering/character-gpu.ts';
import '../rendering/character-frame.ts';
import '../rocket-hop.ts';
import '../dog-pony-layout.ts';
import '../dog-pony-show.ts';
import '../config/rendering.ts';
import '../redwood-lake-life.ts';
import '../southern-countryside-layout.ts';
import '../wizard-house.ts';
import { setActionText, actionTargetKind } from '../context-menu.ts';
import '../config/dialogue.ts';
import '../dialogue-config.ts';
import '../interaction-results.ts';
import '../animation-presentation.ts';
import '../neighborhood-interactions.ts';
import '../combat-navigation.ts';
import '../southern-countryside.ts';
import '../world-minimap.ts';
import '../world-tile-codec.ts';
import '../materials.ts';
import { auditNavigationGrid } from '../navigation.ts';
import '../world-stream.ts';
import '../cupertino-gardens.ts';
import {
  createServerConnectionGate,
  serverConnected,
  serverCommand,
} from '../server-connection.ts';
import { createGrowthTicker } from '../finance-ui.ts';
import '../southern-village.ts';
import '../duel-layout.ts';
import '../loading-screen.ts';
import '../teleport-tablets.ts';
import '../teleport-models.ts';
import '../marin-land.ts';
import '../countryside.ts';
import { createDebugConsole, debugMapPosition, createFrameMeter } from '../debug-console.ts';
import '../item-stats.ts';
import '../wilderness.ts';
import '../wilderness-sites.ts';
import '../ferrari-roads.ts';
import '../wilderness-models.ts';
import '../armory.ts';
import '../static-batches.ts';
import '../southern-craft.ts';
import { createGlazingBatch } from '../glazing.ts';
import '../social-layout.ts';
import '../social-buildings.ts';
import '../bottle-post.ts';
import { createSocialBusiness } from '../sales-conference.ts';
import '../ai-lab-interior.ts';
import '../tech-layout.ts';
import '../tech-buildings.ts';
import { createTechVentures } from '../tech-ventures.ts';
import '../haberdasher-layout.ts';
import { ownedHat } from '../hat-catalog.ts';
import '../haberdashery.ts';
import '../haberdasher-shop.ts';
import '../salt-flats.ts';
import { createSaltMail } from '../salt-mail.ts';
import '../street-light-layout.ts';
import '../map-colors.ts';

import '../minimap-navigation.ts';
import { placeIcon, nearestMinimapIcon } from '../wayfinding.ts';

import '../alpine-materials.ts';
import { unit } from '../geometry.ts';
import '../street-ground.ts';
import '../shadows.ts';
import { TILE_CONFIG, validateTileMap, runTileRuleTests } from '../tiles.ts';
import '../water-tiles.ts';
import { createSFCoast } from '../coastline.ts';
import '../western-coast-details.ts';
import { createModels } from '../models.ts';
import { SUTRO_SITE, createSutroClimb } from '../sutro.ts';
import '../lighting.ts';
import { DOWNTOWN } from '../downtown.ts';
import '../environment.ts';
import { AIRSHIP_ACCESS, SOUTHERN_ROADS, airportSurfaceTypeAt, createAirship } from '../airship.ts';
import { SF_SPACEPORT } from '../southern-district.ts';
import { SOUTHERN_BOUNDS } from '../southern-layout.ts';
import '../southern-terrain.ts';
import { createStrength } from '../strength.ts';
import '../jurassic-layout.ts';
import { createExpeditions } from '../jurassic.ts';
import '../jurassic-models.ts';
import { createForwardRoll } from '../forward-roll.ts';
import { createAILabJob } from '../ai-lab.ts';
import { createAIInterviewUI } from '../ai-interview-ui.ts';
import { createHitpoints } from '../combat.ts';
import '../deli.ts';
import '../street-traffic.ts';
import '../airport-billboards.ts';
import { gymExercise } from '../gym-exercises.ts';
import '../ferrari.ts';
import '../fuel.ts';
import '../adventure-sites.ts';
import '../fitness-layout.ts';

import '../woodland-park.ts';
import '../billboards.ts';
import '../research-art.ts';
import '../times-square.ts';
import '../research-layout.ts';
import '../institute-interiors.ts';
import '../research-campuses.ts';
import { createSunglasses } from '../sunglasses.ts';
import { createQuestLog } from '../quests.ts';
import '../equipment-options.ts';
import '../search-houses.ts';
import '../world-lore.ts';
import '../encounter-layout.ts';
import '../encounter-buildings.ts';
import '../progression.ts';
import { createCollectionMenu } from '../collection-menu.ts';
import { createQuestMenu } from '../quest-menu.ts';
import '../they-live.ts';
import '../alien-sites.ts';
import '../times-square-life.ts';
import '../square-construction.ts';

import { createSkateTricks, SKATE_TRICKS } from '../skateboard.ts';
import '../npc-roaming.ts';
import '../shipyard.ts';
import '../parrots.ts';
import { createInebriation } from '../inebriation.ts';
import { createRehabilitation, scrambleAppearance } from '../rehabilitation.ts';
import { createFishing } from '../fishing.ts';
import '../monkey-escape.ts';
import '../zoo-encounter.ts';
import '../motorcycle.ts';
import '../rail-works.ts';
import '../research-dialogue.ts';

import '../southern-neighborhood.ts';
import '../southern-expansion.ts';
import '../peninsula-details.ts';
import { createRocketTravel } from '../rocket.ts';
import '../regional-road.ts';
import { TAHOE, createTahoe, nearTahoe, tahoeHeight } from '../tahoe.ts';
import { createAirshipRope } from '../airship-rope.ts';
import { createAirshipBasket } from '../airship-basket.ts';
import '../airship-rental.ts';
import '../config/airship.ts';
import { createEconomy } from '../economy.ts';
import { createDialogue } from '../dialogue.ts';
import '../multiplayer-client.ts';
import '../multiplayer-world.ts';
import { createCombatFeedback, createCombatOverlay } from '../combat-feedback.ts';
import { actorLevel } from '../levels.ts';
import { GUILD_BUILDINGS } from '../guild.ts';
import '../map-instances.ts';
import '../secret-adventures.ts';
import '../banking.ts';
import '../bank-ui.ts';
import '../bank-models.ts';
import '../illuminati-models.ts';
import '../stealth-bomber.ts';
import '../multiplayer-actions.ts';
import '../multiplayer-protocol.ts';
import '../config/hairstyles.ts';
import { npcDisplayLabel } from '../npc-interactions.ts';
import '../south-bay-layout.ts';
import { sightPrimaryVerb } from '../descriptions.ts';
import '../building-interactions.ts';
import { merchant } from '../commerce-world.ts';
import { createWhales } from '../wildlife.ts';
import '../bunny.ts';
import '../skate-dog.ts';
import { PROMETHEUS } from '../prometheus.ts';
import { createBayShipping } from '../shipping.ts';
import { RESTAURANTS } from '../restaurants.ts';
import '../estate-life.ts';
import '../life.ts';
import '../companions.ts';
import '../traffic-signals.ts';
import '../slow-bus.ts';
import '../transit-models.ts';
import '../gpu-layout.ts';
import '../gpu-factory.ts';
import '../characters.ts';
import { normalizeCharacter, drawCharacterPreview } from '../character-config.ts';
import { inNightlife } from '../nightlife.ts';
import { createCaptureAnimation } from '../capture-animation.ts';
import '../zoo-animals.ts';

import { ZOO_PATHS } from '../zoo.ts';
import { WINDSURF_LAUNCH, createWindsurfing } from '../windsurfing.ts';
import { createSurfing, SURF_TRICKS } from '../surfing.ts';
import { createDetentionSite } from '../encounters.ts';
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
} from '../geography.ts';

/* Static WebGL world entry point. Terrain and models are actual 3D triangle
   meshes; the 2D canvases below are only maps and interface labels. No game assets
   or renderer code are copied from RuneScape or private-server clients. */
export function createSFWorld({
  headless = false,
  retainInteriors = false,
  bake = false,
  multiplayer = null,
  loading = null,
}: {
  headless?: boolean;
  retainInteriors?: boolean;
  bake?: boolean;
  multiplayer?: ReturnType<typeof createMultiplayerClient> | null;
  loading?: ReturnType<typeof createLoadingScreen> | null;
} = {}) {
  // Live scene services run after their required subsystems are initialized.
  // Transition fields (targets, actions, interiors) retain their nullable types.
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
    set action(value: typeof action) {
      action = value;
    },
    get active() {
      return active;
    },
    set active(value: typeof active) {
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
    set actorTags(value: typeof actorTags) {
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
    set ahabNPC(value: typeof ahabNPC) {
      ahabNPC = value;
    },
    get aiInterview(): NonNullable<typeof aiInterview> {
      return aiInterview!;
    },
    get aiLabJob() {
      return aiLabJob;
    },
    get airportAds() {
      return airportAds;
    },
    set airportAds(value: typeof airportAds) {
      airportAds = value;
    },
    get airportFieldAds() {
      return airportFieldAds;
    },
    set airportFieldAds(value: typeof airportFieldAds) {
      airportFieldAds = value;
    },
    get airship() {
      return airship;
    },
    get alienCombat() {
      return alienCombat;
    },
    set alienCombat(value: typeof alienCombat) {
      alienCombat = value;
    },
    get alongStreet() {
      return alongStreet;
    },
    get alpineState(): NonNullable<typeof alpineState> {
      return alpineState!;
    },
    set alpineState(value: typeof alpineState) {
      alpineState = value;
    },
    get alpineTextures(): NonNullable<typeof alpineTextures> {
      return alpineTextures!;
    },
    set alpineTextures(value: typeof alpineTextures) {
      alpineTextures = value;
    },
    get announce() {
      return announce;
    },
    get approachingNPC() {
      return approachingNPC;
    },
    set approachingNPC(value: typeof approachingNPC) {
      approachingNPC = value;
    },
    get arrestPlayer() {
      return arrestPlayer;
    },
    get atlasTexture(): NonNullable<typeof atlasTexture> {
      return atlasTexture!;
    },
    set atlasTexture(value: typeof atlasTexture) {
      atlasTexture = value;
    },
    get bake() {
      return bake;
    },
    get banker(): NonNullable<typeof banker> {
      return banker!;
    },
    set banker(value: typeof banker) {
      banker = value;
    },
    get bankMenu() {
      return bankMenu;
    },
    set bankMenu(value: typeof bankMenu) {
      bankMenu = value;
    },
    get bankService(): NonNullable<typeof bankService> {
      return bankService!;
    },
    set bankService(value: typeof bankService) {
      bankService = value;
    },
    get basket() {
      return basket;
    },
    get basketArrival() {
      return basketArrival;
    },
    set basketArrival(value: typeof basketArrival) {
      basketArrival = value;
    },
    get bayShipping() {
      return bayShipping;
    },
    get beachBillboard(): BeachBillboard {
      return beachBillboard!;
    },
    set beachBillboard(value: typeof beachBillboard) {
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
    set built(value: typeof built) {
      built = value;
    },
    get bunny(): NonNullable<typeof bunny> {
      return bunny as NonNullable<typeof bunny>;
    },
    set bunny(value: typeof bunny) {
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
    get canvas(): NonNullable<typeof canvas> {
      return canvas!;
    },
    get capture() {
      return capture;
    },
    get carArrival() {
      return carArrival;
    },
    set carArrival(value: typeof carArrival) {
      carArrival = value;
    },
    get caveExitSite() {
      return caveExitSite;
    },
    get caveGPU(): NonNullable<typeof caveGPU> {
      return caveGPU!;
    },
    set caveGPU(value: typeof caveGPU) {
      caveGPU = value;
    },
    get caveMesh(): NonNullable<typeof caveMesh> {
      return caveMesh!;
    },
    set caveMesh(value: typeof caveMesh) {
      caveMesh = value;
    },
    get changeMapInstance() {
      return changeMapInstance;
    },
    get characterGPU(): NonNullable<typeof characterGPU> {
      return characterGPU!;
    },
    set characterGPU(value: typeof characterGPU) {
      characterGPU = value;
    },
    get characterGround() {
      return characterGround;
    },
    get chase(): NonNullable<typeof chase> {
      return chase!;
    },
    set chase(value: typeof chase) {
      chase = value;
    },
    get cityLife(): NonNullable<typeof cityLife> {
      return cityLife!;
    },
    set cityLife(value: typeof cityLife) {
      cityLife = value;
    },
    get cityLightPlan(): NonNullable<typeof cityLightPlan> {
      return cityLightPlan!;
    },
    set cityLightPlan(value: typeof cityLightPlan) {
      cityLightPlan = value;
    },
    get cityMap(): NonNullable<typeof cityMap> {
      return cityMap!;
    },
    get cityNavigation(): NonNullable<typeof cityNavigation> {
      return cityNavigation!;
    },
    set cityNavigation(value: typeof cityNavigation) {
      cityNavigation = value;
    },
    get cityNavigationObjectCount() {
      return cityNavigationObjectCount;
    },
    set cityNavigationObjectCount(value: typeof cityNavigationObjectCount) {
      cityNavigationObjectCount = value;
    },
    get cityParcels() {
      return cityParcels;
    },
    get clearAt() {
      return clearAt;
    },
    get clickAnimation() {
      return clickAnimation;
    },
    set clickAnimation(value: typeof clickAnimation) {
      clickAnimation = value;
    },
    get clickAttempt() {
      return clickAttempt;
    },
    set clickAttempt(value: typeof clickAttempt) {
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
    set collectionFound(value: typeof collectionFound) {
      collectionFound = value;
    },
    get collectionMenu(): NonNullable<typeof collectionMenu> {
      return collectionMenu!;
    },
    set collectionMenu(value: typeof collectionMenu) {
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
    get countryside(): NonNullable<typeof countryside> {
      return countryside!;
    },
    set countryside(value: typeof countryside) {
      countryside = value;
    },
    get creatureApproach() {
      return creatureApproach;
    },
    get currentInstitute() {
      return currentInstitute;
    },
    set currentInstitute(value: typeof currentInstitute) {
      currentInstitute = value;
    },
    get currentInterior() {
      return currentInterior;
    },
    set currentInterior(value: typeof currentInterior) {
      currentInterior = value;
    },
    get debugConsole() {
      return debugConsole;
    },
    get debugTeleport() {
      return debugTeleport;
    },
    get deli(): NonNullable<typeof deli> {
      return deli as NonNullable<typeof deli>;
    },
    set deli(value: typeof deli) {
      deli = value;
    },
    get destination() {
      return destination;
    },
    set destination(value: typeof destination) {
      destination = value;
    },
    get detailedGround() {
      return detailedGround;
    },
    get detention() {
      return detention;
    },
    get dialogue(): NonNullable<typeof dialogue> {
      return dialogue!;
    },
    get dpr() {
      return dpr;
    },
    set dpr(value: typeof dpr) {
      dpr = value;
    },
    get drawHillsideLifts() {
      return drawHillsideLifts;
    },
    get drawingGlass() {
      return drawingGlass;
    },
    set drawingGlass(value: typeof drawingGlass) {
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
    set ducksFedUntil(value: typeof ducksFedUntil) {
      ducksFedUntil = value;
    },
    get duelMenu() {
      return duelMenu;
    },
    set duelMenu(value: typeof duelMenu) {
      duelMenu = value;
    },
    get dynamicGPU(): NonNullable<typeof dynamicGPU> {
      return dynamicGPU!;
    },
    set dynamicGPU(value: typeof dynamicGPU) {
      dynamicGPU = value;
    },
    get dynamicTargets() {
      return dynamicTargets;
    },
    set dynamicTargets(value: typeof dynamicTargets) {
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
    get esotericCampus(): NonNullable<typeof esotericCampus> {
      return esotericCampus!;
    },
    set esotericCampus(value: typeof esotericCampus) {
      esotericCampus = value;
    },
    get expeditionEvent() {
      return expeditionEvent;
    },
    get expeditions(): NonNullable<typeof expeditions> {
      return expeditions!;
    },
    get ferrari(): NonNullable<typeof ferrari> {
      return ferrari!;
    },
    set ferrari(value: typeof ferrari) {
      ferrari = value;
    },
    get finalizeSceneryNavigation() {
      return finalizeSceneryNavigation;
    },
    get fishing() {
      return fishing;
    },
    get fishingSite(): FishingSite {
      return fishingSite as FishingSite;
    },
    set fishingSite(value: typeof fishingSite) {
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
    set frameID(value: typeof frameID) {
      frameID = value;
    },
    get frameMeter() {
      return frameMeter;
    },
    get gesture() {
      return gesture;
    },
    set gesture(value: typeof gesture) {
      gesture = value;
    },
    get gl(): NonNullable<typeof gl> {
      return gl!;
    },
    get glassGPU(): NonNullable<typeof glassGPU> {
      return glassGPU!;
    },
    set glassGPU(value: typeof glassGPU) {
      glassGPU = value;
    },
    get glazing() {
      return glazing;
    },
    get goldenGate(): NonNullable<typeof goldenGate> {
      return goldenGate!;
    },
    set goldenGate(value: typeof goldenGate) {
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
    get groundGPU(): NonNullable<typeof groundGPU> {
      return groundGPU!;
    },
    set groundGPU(value: typeof groundGPU) {
      groundGPU = value;
    },
    get groundMesh(): NonNullable<typeof groundMesh> {
      return groundMesh!;
    },
    set groundMesh(value: typeof groundMesh) {
      groundMesh = value;
    },
    get contentAirshipStatus() {
      return contentAirshipStatus;
    },
    set contentAirshipStatus(value: import('../types/finance.ts').AirshipRentalStatus | null) {
      contentAirshipStatus = value;
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
    set gymSelection(value: typeof gymSelection) {
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
    set height(value: typeof height) {
      height = value;
    },
    get heights(): NonNullable<typeof heights> {
      return heights!;
    },
    set heights(value: typeof heights) {
      heights = value;
    },
    get highwayGPU(): NonNullable<typeof highwayGPU> {
      return highwayGPU!;
    },
    set highwayGPU(value: typeof highwayGPU) {
      highwayGPU = value;
    },
    get highwayMesh(): NonNullable<typeof highwayMesh> {
      return highwayMesh!;
    },
    set highwayMesh(value: typeof highwayMesh) {
      highwayMesh = value;
    },
    get highwaySites() {
      return highwaySites;
    },
    set highwaySites(value: typeof highwaySites) {
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
    set hoppingRocket(value: typeof hoppingRocket) {
      hoppingRocket = value;
    },
    get hovered() {
      return hovered;
    },
    set hovered(value: typeof hovered) {
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
    set jailStaff(value: typeof jailStaff) {
      jailStaff = value;
    },
    get keeperNPC(): NonNullable<typeof keeperNPC> {
      return keeperNPC!;
    },
    set keeperNPC(value: typeof keeperNPC) {
      keeperNPC = value;
    },
    get keys() {
      return keys;
    },
    set keys(value: typeof keys) {
      keys = value;
    },
    get labelPool() {
      return labelPool;
    },
    get lakes() {
      return lakes;
    },
    get lampGlow(): NonNullable<typeof lampGlow> {
      return lampGlow!;
    },
    set lampGlow(value: typeof lampGlow) {
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
    set last(value: typeof last) {
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
    set lightingDecorativeRocket(value: typeof lightingDecorativeRocket) {
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
    get map(): NonNullable<typeof map> {
      return map!;
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
    get marinLand(): NonNullable<typeof marinLand> {
      return marinLand!;
    },
    set marinLand(value: typeof marinLand) {
      marinLand = value;
    },
    get market() {
      return market;
    },
    get materialState(): NonNullable<typeof materialState> {
      return materialState!;
    },
    set materialState(value: typeof materialState) {
      materialState = value;
    },
    get materialTexture(): NonNullable<typeof materialTexture> {
      return materialTexture!;
    },
    set materialTexture(value: typeof materialTexture) {
      materialTexture = value;
    },
    get mc(): NonNullable<typeof mc> {
      return mc!;
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
    set miniIcons(value: typeof miniIcons) {
      miniIcons = value;
    },
    get miniKeyboardPlace() {
      return miniKeyboardPlace;
    },
    set miniKeyboardPlace(value: typeof miniKeyboardPlace) {
      miniKeyboardPlace = value;
    },
    get miniLast() {
      return miniLast;
    },
    set miniLast(value: typeof miniLast) {
      miniLast = value;
    },
    get minimapRoadPaths() {
      return minimapRoadPaths;
    },
    set minimapRoadPaths(value: typeof minimapRoadPaths) {
      minimapRoadPaths = value;
    },
    get minimapTarget() {
      return minimapTarget;
    },
    get monkeyKeeper(): NonNullable<typeof monkeyKeeper> {
      return monkeyKeeper!;
    },
    set monkeyKeeper(value: typeof monkeyKeeper) {
      monkeyKeeper = value;
    },
    get motorcycle(): NonNullable<typeof motorcycle> {
      return motorcycle!;
    },
    set motorcycle(value: typeof motorcycle) {
      motorcycle = value;
    },
    get motorcycleApproach() {
      return motorcycleApproach;
    },
    get mouseRay() {
      return mouseRay;
    },
    get multiplayer(): NonNullable<typeof multiplayer> {
      return multiplayer!;
    },
    get multiplayerSettings(): NonNullable<typeof multiplayerSettings> {
      return multiplayerSettings!;
    },
    set multiplayerSettings(value: typeof multiplayerSettings) {
      multiplayerSettings = value;
    },
    get multiplayerWorld(): NonNullable<typeof multiplayerWorld> {
      return multiplayerWorld!;
    },
    set multiplayerWorld(value: typeof multiplayerWorld) {
      multiplayerWorld = value;
    },
    get N() {
      return N;
    },
    get naturalHeights(): NonNullable<typeof naturalHeights> {
      return naturalHeights!;
    },
    set naturalHeights(value: typeof naturalHeights) {
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
    get niaCitizen(): Actor {
      return niaCitizen as Actor;
    },
    get nightclub() {
      return nightclub;
    },
    set nightclub(value: typeof nightclub) {
      nightclub = value;
    },
    get noeValleyLife(): NonNullable<typeof noeValleyLife> {
      return noeValleyLife!;
    },
    set noeValleyLife(value: typeof noeValleyLife) {
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
    get oldMan(): NonNullable<typeof oldMan> {
      return oldMan!;
    },
    set oldMan(value: typeof oldMan) {
      oldMan = value;
    },
    get pacificaSurfSite(): Site {
      return pacificaSurfSite as Site;
    },
    set pacificaSurfSite(value: typeof pacificaSurfSite) {
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
    set parrots(value: typeof parrots) {
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
    set peptideSpawns(value: typeof peptideSpawns) {
      peptideSpawns = value;
    },
    get pequodSite() {
      return pequodSite;
    },
    set pequodSite(value: typeof pequodSite) {
      pequodSite = value;
    },
    get pickedCache() {
      return pickedCache;
    },
    set pickedCache(value: typeof pickedCache) {
      pickedCache = value;
    },
    get placeAt() {
      return placeAt;
    },
    get placeMarkerViews() {
      return placeMarkerViews;
    },
    get places() {
      return places as Place[];
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
    set playerLook(value: typeof playerLook) {
      playerLook = value;
    },
    get playerRocketHop() {
      return playerRocketHop;
    },
    get playerSpeechUntil() {
      return playerSpeechUntil;
    },
    set playerSpeechUntil(value: typeof playerSpeechUntil) {
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
    set pressTimer(value: typeof pressTimer) {
      pressTimer = value;
    },
    get program(): NonNullable<typeof program> {
      return program!;
    },
    set program(value: typeof program) {
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
    get questMenu(): NonNullable<typeof questMenu> {
      return questMenu!;
    },
    set questMenu(value: typeof questMenu) {
      questMenu = value;
    },
    get quests() {
      return quests;
    },
    get raf() {
      return raf;
    },
    set raf(value: typeof raf) {
      raf = value;
    },
    get railgunLineClear() {
      return railgunLineClear;
    },
    get readerPlace() {
      return readerPlace;
    },
    set readerPlace(value: typeof readerPlace) {
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
    get regionalRoad(): NonNullable<typeof regionalRoad> {
      return regionalRoad!;
    },
    set regionalRoad(value: typeof regionalRoad) {
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
    set ropeReturnHome(value: typeof ropeReturnHome) {
      ropeReturnHome = value;
    },
    get sailingCoast() {
      return sailingCoast;
    },
    get saltMail() {
      return saltMail;
    },
    get sandSite(): PositionedSite {
      return sandSite as PositionedSite;
    },
    set sandSite(value: typeof sandSite) {
      sandSite = value;
    },
    get savedDeli() {
      return savedDeli;
    },
    set savedDeli(value: typeof savedDeli) {
      savedDeli = value;
    },
    get savedFerrari() {
      return savedFerrari;
    },
    set savedFerrari(value: typeof savedFerrari) {
      savedFerrari = value;
    },
    get savedKeeper() {
      return savedKeeper;
    },
    set savedKeeper(value: typeof savedKeeper) {
      savedKeeper = value;
    },
    get savedMotorcycle() {
      return savedMotorcycle;
    },
    set savedMotorcycle(value: typeof savedMotorcycle) {
      savedMotorcycle = value;
    },
    get sceneGPU(): NonNullable<typeof sceneGPU> {
      return sceneGPU!;
    },
    set sceneGPU(value: typeof sceneGPU) {
      sceneGPU = value;
    },
    get sceneMesh(): NonNullable<typeof sceneMesh> {
      return sceneMesh!;
    },
    set sceneMesh(value: typeof sceneMesh) {
      sceneMesh = value;
    },
    get scrollBefore() {
      return scrollBefore;
    },
    set scrollBefore(value: typeof scrollBefore) {
      scrollBefore = value;
    },
    get seaBounds(): NonNullable<typeof seaBounds> {
      return seaBounds!;
    },
    set seaBounds(value: typeof seaBounds) {
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
    set secretStairs(value: typeof secretStairs) {
      secretStairs = value;
    },
    get secretWorld(): NonNullable<typeof secretWorld> {
      return secretWorld!;
    },
    set secretWorld(value: typeof secretWorld) {
      secretWorld = value;
    },
    get sentMultiplayerCustody() {
      return sentMultiplayerCustody;
    },
    set sentMultiplayerCustody(value: typeof sentMultiplayerCustody) {
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
    get shadowFramebuffer(): NonNullable<typeof shadowFramebuffer> {
      return shadowFramebuffer!;
    },
    set shadowFramebuffer(value: typeof shadowFramebuffer) {
      shadowFramebuffer = value;
    },
    get shadowMatrix(): NonNullable<typeof shadowMatrix> {
      return shadowMatrix!;
    },
    set shadowMatrix(value: typeof shadowMatrix) {
      shadowMatrix = value;
    },
    get shadowProgram(): NonNullable<typeof shadowProgram> {
      return shadowProgram!;
    },
    set shadowProgram(value: typeof shadowProgram) {
      shadowProgram = value;
    },
    get shadowRoom(): NonNullable<typeof shadowRoom> {
      return shadowRoom!;
    },
    set shadowRoom(value: typeof shadowRoom) {
      shadowRoom = value;
    },
    get shadowTexture(): NonNullable<typeof shadowTexture> {
      return shadowTexture!;
    },
    set shadowTexture(value: typeof shadowTexture) {
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
    get signs(): NonNullable<typeof signs> {
      return signs!;
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
    set skateDog(value: typeof skateDog) {
      skateDog = value;
    },
    get skateTricks() {
      return skateTricks;
    },
    get slowBus(): NonNullable<typeof slowBus> {
      return slowBus!;
    },
    set slowBus(value: typeof slowBus) {
      slowBus = value;
    },
    get social() {
      return social;
    },
    get socialLife(): NonNullable<typeof socialLife> {
      return socialLife!;
    },
    set socialLife(value: typeof socialLife) {
      socialLife = value;
    },
    get southernLife(): NonNullable<typeof southernLife> {
      return southernLife!;
    },
    set southernLife(value: typeof southernLife) {
      southernLife = value;
    },
    get southernNeighborhood(): NonNullable<typeof southernNeighborhood> {
      return southernNeighborhood!;
    },
    set southernNeighborhood(value: typeof southernNeighborhood) {
      southernNeighborhood = value;
    },
    get southernTerrain(): NonNullable<typeof southernTerrain> {
      return southernTerrain!;
    },
    set southernTerrain(value: typeof southernTerrain) {
      southernTerrain = value;
    },
    get specialNPCLife(): NonNullable<typeof specialNPCLife> {
      return specialNPCLife!;
    },
    set specialNPCLife(value: typeof specialNPCLife) {
      specialNPCLife = value;
    },
    get squareLife(): NonNullable<typeof squareLife> {
      return squareLife!;
    },
    set squareLife(value: typeof squareLife) {
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
    get streetTraffic(): NonNullable<typeof streetTraffic> {
      return streetTraffic!;
    },
    set streetTraffic(value: typeof streetTraffic) {
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
    get sunglassesSite(): PositionedSite {
      return sunglassesSite as PositionedSite;
    },
    set sunglassesSite(value: typeof sunglassesSite) {
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
    set sutroTravelPending(value: typeof sutroTravelPending) {
      sutroTravelPending = value;
    },
    get tabletDestinations() {
      return tabletDestinations;
    },
    set tabletDestinations(value: typeof tabletDestinations) {
      tabletDestinations = value;
    },
    get tabletService(): NonNullable<typeof tabletService> {
      return tabletService!;
    },
    set tabletService(value: typeof tabletService) {
      tabletService = value;
    },
    get tabletWizard(): NonNullable<typeof tabletWizard> {
      return tabletWizard!;
    },
    set tabletWizard(value: typeof tabletWizard) {
      tabletWizard = value;
    },
    get tahoe() {
      return tahoe;
    },
    get tahoeGPU(): NonNullable<typeof tahoeGPU> {
      return tahoeGPU!;
    },
    set tahoeGPU(value: typeof tahoeGPU) {
      tahoeGPU = value;
    },
    get tahoeMesh(): NonNullable<typeof tahoeMesh> {
      return tahoeMesh!;
    },
    set tahoeMesh(value: typeof tahoeMesh) {
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
    set training(value: typeof training) {
      training = value;
    },
    get trainingLast() {
      return trainingLast;
    },
    set trainingLast(value: typeof trainingLast) {
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
    set waveTime(value: typeof waveTime) {
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
    set whalesSeen(value: typeof whalesSeen) {
      whalesSeen = value;
    },
    get width() {
      return width;
    },
    set width(value: typeof width) {
      width = value;
    },
    get wildAttackIn() {
      return wildAttackIn;
    },
    set wildAttackIn(value: typeof wildAttackIn) {
      wildAttackIn = value;
    },
    get wilderness() {
      return wilderness;
    },
    set wilderness(value: typeof wilderness) {
      wilderness = value;
    },
    get wildLootSerial() {
      return wildLootSerial;
    },
    set wildLootSerial(value: typeof wildLootSerial) {
      wildLootSerial = value;
    },
    get wildTarget() {
      return wildTarget;
    },
    set wildTarget(value: typeof wildTarget) {
      wildTarget = value;
    },
    get world(): NonNullable<typeof world> {
      return world!;
    },
    get worldStream(): NonNullable<typeof worldStream> {
      return worldStream!;
    },
    set worldStream(value: typeof worldStream) {
      worldStream = value;
    },
    get worldTiles(): NonNullable<typeof worldTiles> {
      return worldTiles!;
    },
    set worldTiles(value: typeof worldTiles) {
      worldTiles = value;
    },
    get zoo(): NonNullable<typeof zoo> {
      return zoo!;
    },
    set zoo(value: typeof zoo) {
      zoo = value;
    },
    get zooBase() {
      return zooBase;
    },
    set zooBase(value: typeof zooBase) {
      zooBase = value;
    },
    get zoom() {
      return zoom;
    },
    set zoom(value: typeof zoom) {
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
  const $ = gameElement,
    world = (headless ? null : $('sf-world'))!,
    canvas = (headless ? null : $('sf-canvas'))!,
    map = (headless ? null : $('sf-minimap'))!;
  const gl = headless
    ? null
    : canvas.getContext('webgl', { alpha: false, antialias: true, powerPreference: 'low-power' });
  const mc = headless ? null : map.getContext('2d');
  if (!headless && (!gl || !mc)) return;
  // Share one geographic transform across coast, park shapes and landmarks.
  // The street drawing has its own authored reference size; widths stay fixed.
  const N = WORLD_SIZE,
    MAP_SCALE = N / REFERENCE_SIZE,
    LAYOUT_SCALE = N / STREET_LAYOUT_SIZE;
  const mapTile = (v: number) => Math.round(v * MAP_SCALE),
    mapPosition = (v: number) => v * MAP_SCALE;
  const layoutPosition = (v: number) => v * LAYOUT_SCALE;
  const mapPolygon = (points: readonly (readonly number[])[]) =>
    points.map((p) => p.map(mapPosition));
  const TERRAIN_RES = 4,
    TERRAIN_GRID = N * TERRAIN_RES,
    WALK_SPEED = 4.6,
    ACCELERATION = 24;
  const occupied = new Uint8Array(N * N),
    landMask = new Uint8Array(N * N),
    reserved = new Uint8Array(N * N),
    roadIndex = new Int16Array(N * N),
    roadDistance = new Float32Array(N * N);
  const objects: SceneObject[] = [],
    places: DestinationBuilding[] = [],
    instituteRooms: InstituteRoom[] = [],
    visited = new Set(),
    policeActors = new Map<number, Actor>();
  let multiplayerWorld: ReturnType<
      typeof import('../multiplayer-world.ts').createWorldMultiplayer
    > | null = null,
    multiplayerSettings: ReturnType<
      typeof import('../multiplayer-world.ts').setupMultiplayerSettings
    > | null = null,
    worldStream: Awaited<ReturnType<typeof import('../world-stream.ts').createWorldStream>> | null =
      null;
  let secretWorld: ReturnType<typeof clientController<'secret'>> | null = null,
    caveMesh: ReturnType<typeof import('../illuminati-models.ts').createIlluminatiCaveMesh> | null =
      null,
    caveGPU: GeometryGPU | null = null,
    oldMan: Actor | null = null,
    secretStairs: Site | null = null;
  let wilderness: ReturnType<typeof import('../wilderness.ts').createWilderness> | null = null,
    wildTarget: Actor | null = null,
    wildAttackIn = 0,
    wildLootSerial = 0;
  let bankService: ReturnType<typeof import('../bank-ui.ts').createBankService> | null = null,
    bankMenu: ReturnType<typeof import('../bank-ui.ts').createBankMenu> | null = null,
    banker: Actor | null = null,
    duelMenu: ReturnType<typeof import('../finance-ui.ts').createDuelMenu> | null = null;
  let tabletService: ReturnType<
      typeof import('../teleport-tablets.ts').createTeleportTablets
    > | null = null,
    tabletWizard: Actor | null = null,
    tabletDestinations: Record<string, { x: number; z: number; y?: number; label: string }> | null =
      null;
  const caveExitSite = {
    id: 'illuminati-exit',
    kind: 'cave-exit',
    label: contentText('world.scene.createSFWorld.label-1', {}),
    entry: { x: 13, y: 24 },
    description: contentText('world.scene.createSFWorld.description-2', {}),
  };
  const bomberSite = {
    id: 'personal-b2',
    kind: 'stealth-bomber',
    label: contentText('world.scene.createSFWorld.label-3', {}),
    entry: { x: 13, y: 16 },
    description: contentText('world.scene.createSFWorld.description-4', {}),
  };
  let peptideSpawns: { x: number; z: number }[] = [];

  const player: LocalPlayer = {
    sitting: false,
    sitBlend: 0,
    x: mapTile(45),
    y: mapTile(29),
    path: [] as Point[],
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
  let alienCombat: {
      npc: Actor;
      battle: ReturnType<typeof import('../combat.ts').createAlienBattle>;
    } | null = null,
    deli: ReturnType<typeof clientController<'deli'>> | null = null,
    streetTraffic: ReturnType<typeof import('../street-traffic.ts').createStreetTraffic> | null =
      null,
    airportAds: import('../airport-billboards.ts').AirportBillboard[] = [],
    airportFieldAds: import('../airport-billboards.ts').AirportFieldBillboard[] = [],
    esotericCampus: ReturnType<typeof import('../alien-sites.ts').createEsotericCampus> | null =
      null,
    squareLife: ReturnType<typeof import('../life.ts').createCityLife> | null = null,
    motorcycle: ReturnType<typeof clientController<'motorcycle'>> | null = null,
    monkeyKeeper: ReturnType<typeof clientController<'keeper'>> | null = null,
    keeperNPC: Actor | null = null,
    approachingNPC: Actor | null = null,
    specialNPCLife: import('../npc-roaming.ts').NPCRoaming<Actor> | null = null,
    socialLife: import('../npc-roaming.ts').NPCRoaming<Actor> | null = null;
  let savedMotorcycle: Partial<{ x: number; y: number; angle: number; rented: boolean }> = {},
    savedKeeper = {};
  if (!headless)
    try {
      savedMotorcycle = JSON.parse(localStorage.getItem('sf-motorcycle-v1') || '{}') || {};
      savedKeeper = JSON.parse(localStorage.getItem('sf-monkey-keeper-v1') || '{}') || {};
    } catch {}
  const capture = createCaptureAnimation(),
    basket = clientController('basket', createAirshipBasket());
  let basketArrival: (() => void) | null = null;
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
  let sunglassesSite: Site | null = null,
    beachBillboard: BeachBillboard | null = null;
  let savedCharacter: Record<string, unknown> = {};
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
  const combatFeedback = createCombatFeedback<
      Actor | import('../types/world.ts').RemoteActor | LocalPlayer
    >(),
    combatOverlay = headless ? null : createCombatOverlay($('sf-combat-overlay'));
  let ferrari: ReturnType<typeof clientController<'ferrari'>> | null = null,
    highwaySites: ReturnType<typeof import('../adventure-sites.ts').createHighwaySites> = [],
    training = false,
    trainingLast = 0,
    gymSelection = 'bench';
  if (!headless)
    try {
      gymSelection = gymExercise(localStorage.getItem('sf-gym-exercise-v1')).id;
    } catch {}
  const camera: CameraState = {
    yaw: 0,
    pitch: Math.PI / 5,
    cos: 1,
    sin: 0,
    version: 0,
    matrix: new Float32Array(16),
    eye: [0, 0, 0],
    target: [0, 0, 0],
    back: [0, 0, 0],
    right: [0, 0, 0],
    up: [0, 0, 0],
    tan: 0,
    terrainRise: 0,
  };
  let active = false,
    built = false,
    raf = 0,
    last = 0,
    width = 1,
    height = 1,
    dpr = 1,
    zoom = 1,
    hovered:
      | ((
          | import('../types/world.ts').InteractionSight
          | import('../types/world.ts').InteractiveActor
          | Place
        ) & { source?: string; activityBuilding?: boolean })
      | null
      | undefined = null,
    destination: Point | null = null,
    action: (() => void) | null = null,
    slowBus: ReturnType<typeof import('../slow-bus.ts').createSlowBus> | null = null;
  let keys = new Set(),
    scrollBefore = 0,
    currentInstitute: InstituteRoom | null = null,
    currentInterior: Place | null = null,
    readerPlace: Site | Place | null = null,
    ducksFedUntil = 0,
    miniLast = 0,
    playerSpeechUntil = 0;
  const reduced = headless || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pointers = new Map<
    number,
    {
      x: number;
      y: number;
      startX: number;
      startY: number;
      npc: import('../types/world.ts').InteractiveActor | null;
    }
  >();
  let pressTimer: ReturnType<typeof setTimeout> | 0 = 0,
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
  const growthService = {
    buy: (amount: number) => ({
      ok: true,
      pending: true,
      promise: serverCommand(multiplayer, 'growthBuy', { amount }),
    }),
    list: () => ({ ok: true, pending: true, promise: serverCommand(multiplayer, 'growthList') }),
    sell: () => ({ ok: true, pending: true, promise: serverCommand(multiplayer, 'growthSell') }),
  };
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
      onMessage: (text: string) => {
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
  let fishingSite: Site | null = null,
    sandSite: Site | null = null;
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
          context.dialogue.resolvePending(event.npc.id, event.message);
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
  let jailStaff: Actor[] = [],
    parrots: Actor[] = [];
  let savedQuests = {},
    questMenu: ReturnType<typeof createQuestMenu> | null = null,
    collectionMenu: ReturnType<typeof createCollectionMenu> | null = null,
    collectionFound: string[] = [];
  if (!headless)
    try {
      savedQuests = JSON.parse(localStorage.getItem('sf-quests-v1') || '{}') || {};
    } catch {}
  const quests = clientController(
    'quests',
    createQuestLog(savedQuests, (state: { monkey: string }) => {
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
  let pequodSite: Site | null = null,
    ahabNPC: Actor | null = null;
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
      food: (n: number | undefined) => deli?.storeSandwich(n),
      player: (): { x: number; z: number; base: number; isPlayer: boolean; eligible: boolean } => ({
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
      routeTo: (a: { x: number; z: number }, b: { x: number; z: number }) =>
        pathTo(b.x - 0.5, b.z - 0.5, { x: a.x - 0.5, y: a.z - 0.5 }, true)?.map((p) => ({
          x: p.x + 0.5,
          z: p.y + 0.5,
        })),
      canTravel: (a: { x: number; z: number }, b: { x: number; z: number }) =>
        canTravel(a.x - 0.5, a.z - 0.5, b.x - 0.5, b.z - 0.5, true),
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
        journal: requiredValue(
          world.querySelector<HTMLDivElement>('.sf-journal'),
          'Dialogue journal',
        ),
        log: $('sf-log'),
        trade: (kind: string) => serverCommand(multiplayer, 'inventory', { op: 'trade', kind }),
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
          context.dialogue.close();
          keys.clear();
          player.path = [];
          player.speed = 0;
          action = null;
          destination = null;
        },
        onClose: () => canvas.focus({ preventScroll: true }),
        onResult: (result) => {
          if (result.message) announce(result.message, 'AI Lab');
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
        context.dialogue.close();
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
        context.dialogue.close();
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
        onMessage: (text: string) => announce(text, 'Debug'),
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
          context.multiplayer.checkpoint(true);
          context.dialogue.cancel();
          context.aiInterview.close();
          questMenu?.close();
          requiredValue(debugConsole, 'Debug console').close();
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
    [14, 10] satisfies [number, number],
    [19, 8] satisfies [number, number],
    [29, 11] satisfies [number, number],
    [33, 17] satisfies [number, number],
    [30, 20] satisfies [number, number],
    [27, 22] satisfies [number, number],
    [17, 20] satisfies [number, number],
    [11, 16] satisfies [number, number],
  ].map((p) => p.map(mapPosition));
  const MARIN = mapPolygon(MARIN_OUTLINE);
  const sailingCoast = createSFCoast(MAP_SCALE, SOUTHERN_BOUNDS.south);
  const bridgeDirection = unit([
    DOWNTOWN.bridge.end[0] - DOWNTOWN.bridge.abutment[0],
    0,
    DOWNTOWN.bridge.end[1] - DOWNTOWN.bridge.abutment[1],
  ] satisfies [number, number, number]);
  const islandCenter = [
    mapPosition(DOWNTOWN.bridge.end[0]) + bridgeDirection[0] * 2,
    mapPosition(DOWNTOWN.bridge.end[1]) + bridgeDirection[2] * 2,
  ] satisfies [number, number];
  const islandOutline = (x: number, z: number, rx: number, rz: number) =>
    Array.from(
      { length: 32 },
      (_, i) =>
        [x + Math.cos((i * Math.PI) / 16) * rx, z + Math.sin((i * Math.PI) / 16) * rz] satisfies [
          number,
          number,
        ],
    );
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
  let pacificaSurfSite: Site | null = null,
    waveTime = 0;
  let chase: ReturnType<typeof import('../encounters.ts').createPoliceChase> | null = null,
    zoo: ReturnType<typeof import('../zoo-encounter.ts').createTigerEncounter> | null = null,
    zooBase = 0,
    bunny: ReturnType<typeof import('../bunny.ts').createPaintedBunny> | null = null,
    skateDog: ReturnType<typeof import('../skate-dog.ts').createSkateDog> | null = null;
  const sutroClimb = clientController('sutro', createSutroClimb()),
    airship = clientController(
      'airship',
      createAirship({ worldSize: N, groundHeight: (x: number, z: number) => terrainHeight(x, z) }),
    ),
    rope = clientController('rope', createAirshipRope()),
    bayShipping = createBayShipping(MAP_SCALE),
    whales = createWhales(),
    merchants: Actor[] = [],
    tahoe = clientController('tahoe', createTahoe());
  let sutroTravelPending = false;
  let ropeReturnHome = false,
    whalesSeen = false;
  const rocket = clientController(
    'rocket',
    createRocketTravel({ groundHeight: (x: number, z: number) => terrainHeight(x, z) }),
  );
  let southernLife: ReturnType<typeof import('../life.ts').createCityLife> | null = null,
    nightclub: Site | null = null,
    goldenGate: ReturnType<typeof import('../regional-road.ts').createGoldenGateCrossing> | null =
      null,
    marinLand: ReturnType<typeof import('../marin-land.ts').createMarinLand> | null = null,
    regionalRoad: ReturnType<typeof import('../regional-road.ts').createRegionalRoad> | null = null,
    countryside: ReturnType<typeof import('../countryside.ts').createCountryside> | null = null,
    highwayMesh: Mesh | null = null,
    highwayGPU: GeometryGPU | null = null,
    southernTerrain: ReturnType<
      typeof import('../southern-terrain.ts').createSouthernTerrain
    > | null = null,
    southernNeighborhood: ReturnType<
      typeof import('../southern-neighborhood.ts').populateSouthernNeighborhood
    > | null = null;
  const flying = () => airship.state.active && !rope.onGround;
  const searchSites: Site[] = [],
    loreSites: Site[] = [];
  const labelPool: ActorLabel[] = [],
    niaCitizen = {
      id: 'nia',
      label: contentText('world.scene.createSFWorld.label-6', {}),
      named: 'Bani',
    };
  const HILLS = SF_HILLS.map((h) => ({
    ...h,
    x: mapPosition(h.x),
    y: mapPosition(h.y),
    r: mapPosition(h.r),
  }));
  // Planned city blocks. Regular streets use the same half-tile center lines;
  // SoMa has a separate 45-degree grid meeting Market Street.
  const streets: Street[] = [];
  const street = (name: string, points: readonly (readonly number[])[], w = 0.5, kind = 'road') =>
    streets.push({ name, points: points.map((p) => [...p]), w, kind, planned: true });
  street(
    'Market Street',
    [[69.5, 29.5] satisfies [number, number], [46.5, 52.5] satisfies [number, number]],
    0.75,
    'market',
  );
  street(
    'Embarcadero',
    [
      [60.5, 14.5] satisfies [number, number],
      [64.5, 18.5] satisfies [number, number],
      [68.5, 23.5] satisfies [number, number],
      [71.5, 29.5] satisfies [number, number],
      [71.5, 35.5] satisfies [number, number],
      [73.5, 42.5] satisfies [number, number],
      [74.5, 48.5] satisfies [number, number],
    ],
    0.65,
  );
  const west = [12.5, 18.5, 23.5, 29.5, 34.5, 40.5] satisfies [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  for (let i = 0; i < west.length; i++) {
    street(
      (
        [
          'Great Highway',
          'Sunset Boulevard',
          '19th Avenue',
          '24th Avenue',
          '30th Avenue',
          'Stanyan Street',
        ] satisfies [string, string, string, string, string, string]
      )[i],
      [[west[i], 45.5] satisfies [number, number], [west[i], 80.5] satisfies [number, number]],
    );
    if (i)
      street('Richmond avenue', [
        [west[i], 28.5] satisfies [number, number],
        [west[i], 36.5] satisfies [number, number],
      ]);
  }
  for (const [name, z] of [
    ['Lincoln Way', 45.5] satisfies [string, number],
    ['Irving Street', 51.5] satisfies [string, number],
    ['Noriega Street', 56.5] satisfies [string, number],
    ['Taraval Street', 61.5] satisfies [string, number],
    ['Vicente Street', 66.5] satisfies [string, number],
    ['Sloat Boulevard', 71.5] satisfies [string, number],
    ['Ocean Avenue', 77.5] satisfies [string, number],
  ])
    street(name, [
      [12.5, z],
      [40.5, z],
    ]);
  for (const [name, z] of [
    ['Clement Street', 28.5] satisfies [string, number],
    ['Geary Boulevard', 32.5] satisfies [string, number],
    ['Fulton Street', 36.5] satisfies [string, number],
  ])
    street(name, [
      [12.5, z],
      [z === 28.5 || z === 36.5 ? 40.5 : Math.min(60.5, 99 - z), z],
    ]);
  for (const [name, x] of [
    ['Divisadero Street', 42.5] satisfies [string, number],
    ['Van Ness Avenue', 49.5] satisfies [string, number],
    ['Powell Street', 54.5] satisfies [string, number],
    ['Grant Avenue', 60.5] satisfies [string, number],
  ])
    street(name, [
      [x, x < 46 ? 22.5 : x === 54.5 ? 13.5 : 17.5],
      [x, Math.min(43.5, 99 - x)],
    ]);
  for (const [name, z] of [
    ['Lombard Street', 17.5] satisfies [string, number],
    ['Broadway', 22.5] satisfies [string, number],
    ['California Street', 27.5] satisfies [string, number],
  ])
    street(name, [
      [z < 23 ? 45.5 : 40.5, z],
      [Math.min(z >= 27 ? 60.5 : 68.5, 99 - z), z],
    ]);
  street('Marina Boulevard', [
    [32.5, 16.5] satisfies [number, number],
    [38.5, 17.5] satisfies [number, number],
    [45.5, 17.5] satisfies [number, number],
  ]);
  street('Fell Street', [
    [40.5, 39.5] satisfies [number, number],
    [49.5, 39.5] satisfies [number, number],
  ]);
  street('Oak Street', [
    [40.5, 42.5] satisfies [number, number],
    [55.5, 42.5] satisfies [number, number],
  ]);
  street('Haight Street', [
    [40.5, 48.5] satisfies [number, number],
    [49.5, 48.5] satisfies [number, number],
  ]);
  for (const [name, x] of [
    ['Divisadero south', 44.5] satisfies [string, number],
    ['Castro Street', 49.5] satisfies [string, number],
    ['Valencia Street', 54.5] satisfies [string, number],
    ['Mission Street', 59.5] satisfies [string, number],
    ['South Van Ness', 64.5] satisfies [string, number],
    ['Third Street', 70.5] satisfies [string, number],
  ])
    street(name, [
      [x, x < 50 ? 43.5 : x - 3],
      [x, x < 50 ? 64.5 : 77.5],
    ]);
  for (const [name, z] of [
    ['Sixteenth Street', 54.5] satisfies [string, number],
    ['Twentieth Street', 59.5] satisfies [string, number],
    ['Twenty-fourth Street', 64.5] satisfies [string, number],
    ['Cesar Chavez Street', 69.5] satisfies [string, number],
    ['Alemany Boulevard', 74.5] satisfies [string, number],
  ])
    street(name, [
      [44.5, z],
      [Math.min(74.5, z + 3), z],
    ]);
  for (const [name, sum] of [
    ['Mission Street north', 108] satisfies [string, number],
    ['Folsom Street', 117] satisfies [string, number],
    ['Harrison Street', 126] satisfies [string, number],
  ])
    street(name, [
      [(sum + 3) / 2, (sum - 3) / 2] satisfies [number, number],
      [74.5, sum - 74.5] satisfies [number, number],
    ]);
  for (const [name, diff] of [
    ['Second Street', 30] satisfies [string, number],
    ['Fourth Street', 21] satisfies [string, number],
    ['Sixth Street', 12] satisfies [string, number],
    ['Eighth Street', 3] satisfies [string, number],
  ])
    street(name, [
      [(99 + diff) / 2, (99 - diff) / 2] satisfies [number, number],
      [(126 + diff) / 2, (126 - diff) / 2] satisfies [number, number],
    ]);
  for (const r of streets) r.points = r.points.map((p) => p.map(layoutPosition));
  // End each northern avenue where its southbound continuation begins.
  for (const name of ['Great Highway', '24th Avenue', '30th Avenue', 'Stanyan Street'] satisfies [
    string,
    string,
    string,
    string,
  ])
    requiredValue(
      requiredValue(
        streets.find((r) => r.name === name),
        'Authored street ' + name,
      ).points.at(-1),
      'Street endpoint',
    )[1] = 89.5;
  requiredValue(
    streets.find((r) => r.name === '19th Avenue'),
    'Missing authored entity: 19th Avenue',
  ).points.at(-1)![1] = 91.5;
  streets[0].points = mapPolygon(DOWNTOWN.market);
  requiredValue(
    streets.find((r) => r.name === 'Embarcadero'),
    'Missing authored entity: Embarcadero',
  ).points[3] = DOWNTOWN.market[0].map(mapPosition);
  street('First Street', mapPolygon(DOWNTOWN.firstStreet), 0.5);
  for (const r of SOUTHERN_ROADS) {
    street(r.name, r.points, AIRSHIP_ACCESS.halfWidth);
    requiredValue(streets.at(-1), 'Southern street').regional = true;
  }
  for (const r of ZOO_PATHS) street(r.name, r.points, r.w, 'path');
  // These two streets hug the park's actual edges, on the same coordinates.
  requiredValue(
    streets.find((r) => r.name === 'Fell Street'),
    'Missing authored entity: Fell Street',
  ).points.forEach((p) => (p[1] = mapPosition(PANHANDLE.north) - 0.8));
  requiredValue(
    streets.find((r) => r.name === 'Oak Street'),
    'Missing authored entity: Oak Street',
  ).points.forEach((p) => (p[1] = mapPosition(PANHANDLE.south) + 0.8));
  street('Stanyan park edge', [
    [mapPosition(32) - 0.85, layoutPosition(36.5)] satisfies [number, number],
    [mapPosition(32) - 0.85, layoutPosition(45.5)] satisfies [number, number],
  ]);
  street(
    'Masonic Avenue',
    mapPolygon([[35.8, 30.95] satisfies [number, number], [35.8, 32.2] satisfies [number, number]]),
    0.38,
  );
  street(
    'Portola Drive',
    mapPolygon([
      [35, 39] satisfies [number, number],
      [32, 41] satisfies [number, number],
      [31, 46] satisfies [number, number],
      [34, 50] satisfies [number, number],
      [40, 55] satisfies [number, number],
    ]),
    0.5,
  );
  for (const [name, points] of [
    [
      'Presidio Boulevard',
      [
        [19, 9] satisfies [number, number],
        [20, 13] satisfies [number, number],
        [24, 16] satisfies [number, number],
        [27, 20] satisfies [number, number],
        [32, 22] satisfies [number, number],
      ],
    ],
    [
      'JFK Promenade',
      [
        [10, 30.5] satisfies [number, number],
        [15, 30.1] satisfies [number, number],
        [19, 30.5] satisfies [number, number],
        [24, 30.3] satisfies [number, number],
        [29, 31] satisfies [number, number],
        [32, 31.5] satisfies [number, number],
        [37.1, 31.5] satisfies [number, number],
      ],
    ],
    [
      'Main Post walk',
      [[22, 17.5] satisfies [number, number], [29, 17.5] satisfies [number, number]],
    ],
    [
      'Lovers Lane',
      [
        [25, 17.5] satisfies [number, number],
        [27, 19.5] satisfies [number, number],
        [29, 21] satisfies [number, number],
      ],
    ],
    [
      'Crissy Field promenade',
      [
        [25, 11.5] satisfies [number, number],
        [29, 12] satisfies [number, number],
        [32, 12] satisfies [number, number],
      ],
    ],
    [
      'Martin Luther King Jr Drive',
      [
        [10, 33] satisfies [number, number],
        [18, 33.2] satisfies [number, number],
        [25, 33.3] satisfies [number, number],
        [31, 33] satisfies [number, number],
      ],
    ],
    [
      'Twin Peaks trail',
      [
        [32, 41] satisfies [number, number],
        [30, 41.5] satisfies [number, number],
        [29, 43] satisfies [number, number],
        [28, 44.5] satisfies [number, number],
        [31, 46] satisfies [number, number],
      ],
    ],
  ] satisfies [string, number[][]][])
    street(name, mapPolygon(points), 0.24, 'path');
  const market = streets[0],
    POND = { x: 23.3, y: 32, rx: 1.9, ry: 0.8 },
    PALACE_LAGOON = { x: 34.6, y: 13.1, rx: 1.4, ry: 0.8 };
  for (const p of [POND, PALACE_LAGOON])
    for (const key of ['x', 'y', 'rx', 'ry'] as const) p[key] *= MAP_SCALE;
  // Keep the private cartography north of the city too, so following the
  // player into Marin does not turn the headlands into blank water.
  const MAP_ART = {
    x: 220,
    y: 640,
    width: 900,
    height: Math.ceil(640 + (SOUTHERN_BOUNDS.south * 9.5) / MAP_SCALE + 24),
  };
  let contentAirshipStatus: import('../types/finance.ts').AirshipRentalStatus | null = null;
  let minimapRoadPaths: import('../world-minimap.ts').CompiledMinimapRoads | null = null;
  const cityMap = headless ? null : document.createElement('canvas');
  if (cityMap) {
    cityMap.width = MAP_ART.width;
    cityMap.height = MAP_ART.height;
  }

  const inPanhandle = (x: number, y: number) => inBounds(x / MAP_SCALE, y / MAP_SCALE, PANHANDLE);
  const inPark = (x: number, y: number) =>
    inBounds(x / MAP_SCALE, y / MAP_SCALE, PARK_BOUNDS) || inPanhandle(x, y);
  const lincolnWay = requiredValue(
    streets.find((r) => r.name === 'Lincoln Way'),
    'Missing authored entity: Lincoln Way',
  );
  const parkSouthEdge = Object.freeze({
    west: mapPosition(PARK_BOUNDS.west),
    east: mapPosition(PARK_BOUNDS.east),
    north: mapPosition(PARK_BOUNDS.south),
    south:
      lincolnWay.points[0][1] -
      requiredValue(lincolnWay.w, 'Lincoln Way width') -
      TILE_CONFIG.curbWidth,
  });
  const pondValue = (x: number, y: number) =>
    ((x - POND.x) / POND.rx) ** 2 + ((y - POND.y) / POND.ry) ** 2;
  const mercedValue = (wx: number, wy: number) => {
    const x = wx / MAP_SCALE,
      y = wy / MAP_SCALE;
    return Math.min(
      ((x - 16) / 1.7) ** 2 + ((y - 56) / 2.7) ** 2,
      ((x - 18.5) / 1.7) ** 2 + ((y - 58.3) / 2.2) ** 2,
    );
  };
  const palaceWater = (x: number, y: number) =>
    ((x - PALACE_LAGOON.x) / PALACE_LAGOON.rx) ** 2 +
    ((y - PALACE_LAGOON.y) / PALACE_LAGOON.ry) ** 2;
  const greenArea = (wx: number, wy: number) => {
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
    walkable: (x: number, z: number) => landClearAt(x - 0.5, z - 0.5),
    canTravel: (ax: number, az: number, bx: number, bz: number) =>
      canTravel(ax - 0.5, az - 0.5, bx - 0.5, bz - 0.5, true),
  };

  const configs: DestinationBuilding[] = [
    {
      id: 'home',
      name: contentText('world.scene.createSFWorld.name-7', {}),
      label: contentText('world.scene.createSFWorld.label-8', {}),
      category: 'Bio & contact',
      source: 'Bio',
      x: 34,
      y: 16,
      w: 3,
      d: 3,
      h: 106,
      color: '#d3bc88',
      style: 'victorian',
      description: contentText('world.scene.createSFWorld.description-9', {}),
    },
    {
      id: 'links',
      name: contentText('world.scene.createSFWorld.name-10', {}),
      label: contentText('world.scene.createSFWorld.label-11', {}),
      category: 'Links · Market Street',
      source: 'Links',
      x: 44,
      y: 24,
      w: 3,
      d: 3,
      h: 73,
      color: '#c99a79',
      style: 'cafe',
      description: contentText('world.scene.createSFWorld.description-12', {}),
    },
    {
      id: 'writing',
      name: contentText('world.scene.createSFWorld.name-13', {}),
      label: contentText('world.scene.createSFWorld.label-14', {}),
      category: 'Writing',
      source: 'Writing',
      x: 44,
      y: 15,
      w: 3,
      d: 3,
      h: 88,
      color: '#d3c29e',
      style: 'library',
      description: contentText('world.scene.createSFWorld.description-15', {}),
    },
    {
      id: 'books',
      name: contentText('world.scene.createSFWorld.name-16', {}),
      label: contentText('world.scene.createSFWorld.label-17', {}),
      category: 'Bookshelf',
      source: 'Bookshelf',
      x: 40,
      y: 27,
      w: 3,
      d: 3,
      h: 88,
      color: '#cbc6b4',
      style: 'civic',
      description: contentText('world.scene.createSFWorld.description-18', {}),
    },
    {
      id: 'press',
      name: contentText('world.scene.createSFWorld.name-19', {}),
      label: contentText('world.scene.createSFWorld.label-20', {}),
      category: 'Press & podcasts',
      source: 'Press',
      x: 44,
      y: 34,
      w: 3,
      d: 2,
      h: 48,
      color: '#bb7e60',
      style: 'kiosk',
      description: contentText('world.scene.createSFWorld.description-21', {}),
    },
    {
      id: 'green',
      name: contentText('world.scene.createSFWorld.name-22', {}),
      label: contentText('world.scene.createSFWorld.label-23', {}),
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
      description: contentText('world.scene.createSFWorld.description-24', {}),
    },
    {
      id: 'limit',
      name: contentText('world.scene.createSFWorld.name-25', {}),
      label: contentText('world.scene.createSFWorld.label-26', {}),
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
      description: contentText('world.scene.createSFWorld.description-27', {}),
    },
    {
      id: 'rose',
      name: contentText('world.scene.createSFWorld.name-28', {}),
      label: contentText('world.scene.createSFWorld.label-29', {}),
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
      description: contentText('world.scene.createSFWorld.description-30', {}),
    },
    {
      id: 'venture',
      name: contentText('world.scene.createSFWorld.name-31', {}),
      label: contentText('world.scene.createSFWorld.label-32', {}),
      category: 'Venture',
      source: 'Venture',
      x: 48,
      y: 15,
      w: 3,
      d: 3,
      h: 115,
      color: '#b0a18c',
      style: 'bank',
      description: contentText('world.scene.createSFWorld.description-33', {}),
    },
    {
      id: 'ai-lab',
      name: contentText('world.scene.createSFWorld.name-34', {}),
      label: contentText('world.scene.createSFWorld.label-35', {}),
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
      description: contentText('world.scene.createSFWorld.description-36', {}),
    },
    {
      id: 'etc',
      name: contentText('world.scene.createSFWorld.name-37', {}),
      label: contentText('world.scene.createSFWorld.label-38', {}),
      category: 'Etc. · Haight-Ashbury',
      source: 'Etc.',
      x: 31,
      y: 36,
      w: 3,
      d: 3,
      h: 78,
      color: '#aca0b3',
      style: 'shop',
      description: contentText('world.scene.createSFWorld.description-39', {}),
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
  const sights: Site[] = [
    {
      id: 'park',
      label: contentText('world.scene.createSFWorld.label-40', {}),
      category: 'Park · ducks & cycling',
      kind: 'park',
      x: 30,
      y: 32,
      entry: { x: 30, y: 31 },
      description: contentText('world.scene.createSFWorld.description-41', {}),
    },
    {
      id: 'panhandle',
      label: contentText('world.scene.createSFWorld.label-42', {}),
      category: 'Fell & Oak · tree-lined cycle path',
      kind: 'park',
      x: 34,
      y: 30,
      entry: { x: 35, y: 31 },
      description: contentText('world.scene.createSFWorld.description-43', {}),
    },
    {
      id: 'presidio',
      label: contentText('world.scene.createSFWorld.label-44', {}),
      category: 'Parade ground · red-roof barracks',
      kind: 'park',
      x: 22,
      y: 13,
      entry: { x: 25, y: 17 },
      description: contentText('world.scene.createSFWorld.description-45', {}),
    },
    {
      id: 'crissy',
      label: contentText('world.scene.createSFWorld.label-46', {}),
      category: 'Presidio · bayfront meadow',
      kind: 'park',
      x: 28,
      y: 11,
      entry: { x: 29, y: 12 },
      description: contentText('world.scene.createSFWorld.description-47', {}),
    },
    {
      id: 'windsurf',
      label: contentText('world.scene.createSFWorld.label-48', {}),
      category: 'Crissy Field · board launch',
      kind: 'windsurf',
      x: WINDSURF_LAUNCH.shore[0],
      y: WINDSURF_LAUNCH.shore[1],
      entry: { x: 29, y: 12 },
      description: contentText('world.scene.createSFWorld.description-49', {}),
    },
    {
      id: 'palace',
      label: contentText('world.scene.createSFWorld.label-50', {}),
      category: 'Marina · rotunda & lagoon',
      kind: 'palace',
      x: 32,
      y: 12,
      entry: { x: 32, y: 15 },
      description: contentText('world.scene.createSFWorld.description-51', {}),
    },
    {
      id: 'deyoung',
      label: contentText('world.scene.createSFWorld.label-52', {}),
      category: 'Golden Gate Park · copper tower',
      kind: 'museum',
      x: 26,
      y: 29,
      entry: { x: 26, y: 31 },
      description: contentText('world.scene.createSFWorld.description-53', {}),
    },
    {
      id: 'academy',
      label: contentText('world.scene.createSFWorld.label-54', {}),
      category: 'Golden Gate Park · living roof',
      kind: 'museum',
      x: 27,
      y: 32,
      entry: { x: 28, y: 33 },
      description: contentText('world.scene.createSFWorld.description-55', {}),
    },
    {
      id: 'conservatory',
      label: contentText('world.scene.createSFWorld.label-56', {}),
      category: 'Golden Gate Park · white glasshouse',
      kind: 'garden',
      x: 30,
      y: 29,
      entry: { x: 30, y: 30 },
      description: contentText('world.scene.createSFWorld.description-57', {}),
    },
    {
      id: 'windmill',
      label: contentText('world.scene.createSFWorld.label-58', {}),
      category: 'Golden Gate Park · western gardens',
      kind: 'windmill',
      x: 11,
      y: 29,
      entry: { x: 12, y: 31 },
      description: contentText('world.scene.createSFWorld.description-59', {}),
    },
    {
      id: 'ferry',
      label: contentText('world.scene.createSFWorld.label-60', {}),
      category: 'Embarcadero · waterfront',
      kind: 'ferry',
      x: 52,
      y: 17,
      entry: { x: 53, y: 23 },
      description: contentText('world.scene.createSFWorld.description-61', {}),
    },
    {
      id: 'coit',
      label: contentText('world.scene.createSFWorld.label-62', {}),
      category: 'Telegraph Hill',
      kind: 'coit',
      x: 46,
      y: 12,
      entry: { x: 47, y: 15 },
      description: contentText('world.scene.createSFWorld.description-63', {}),
    },
    {
      id: 'pyramid',
      label: contentText('world.scene.createSFWorld.label-64', {}),
      category: 'Financial District · redwood plaza',
      kind: 'pyramid',
      x: 48,
      y: 19,
      entry: { x: 51, y: 22 },
      description: contentText('world.scene.createSFWorld.description-65', {}),
    },
    {
      id: 'painted',
      label: contentText('world.scene.createSFWorld.label-66', {}),
      category: 'Alamo Square',
      kind: 'painted',
      x: 34,
      y: 28,
      entry: { x: 35, y: 30 },
      description: contentText('world.scene.createSFWorld.description-67', {}),
    },
    {
      id: 'chinatown',
      label: contentText('world.scene.createSFWorld.label-68', {}),
      category: 'Grant Avenue',
      kind: 'gate',
      x: 45,
      y: 22,
      entry: { x: 47, y: 23 },
      description: contentText('world.scene.createSFWorld.description-69', {}),
    },
    {
      id: 'bicycle',
      label: contentText('world.scene.createSFWorld.label-70', {}),
      category: 'Ride around the city · B',
      kind: 'bike',
      get entry() {
        return { x: Math.round(bike.x), y: Math.round(bike.y) };
      },
      description: contentText('world.scene.createSFWorld.description-71', {}),
    },
    {
      id: 'golden',
      label: contentText('world.scene.createSFWorld.label-72', {}),
      category: 'Presidio · northern strait',
      kind: 'bridge',
      x: 18,
      y: 0,
      entry: { x: 20, y: 10 },
      description: contentText('world.scene.createSFWorld.description-73', {}),
    },
    {
      id: 'beach',
      label: contentText('world.scene.createSFWorld.label-74', {}),
      category: 'Pacific coast · western shore',
      kind: 'beach',
      x: 9,
      y: 42,
      entry: { x: 10, y: 42 },
      description: contentText('world.scene.createSFWorld.description-75', {}),
    },
    {
      id: 'baybridge',
      label: contentText('world.scene.createSFWorld.label-76', {}),
      category: 'Rincon Point · eastern waterfront',
      kind: 'bridge',
      x: 55,
      y: 23,
      entry: { x: 54, y: 28 },
      description: contentText('world.scene.createSFWorld.description-77', {}),
    },
    {
      id: 'peaks',
      label: contentText('world.scene.createSFWorld.label-78', {}),
      category: 'Central hills · Portola Drive',
      kind: 'hill',
      x: 29,
      y: 43,
      entry: { x: 30, y: 43 },
      description: contentText('world.scene.createSFWorld.description-79', {}),
    },
    {
      id: 'sutro',
      label: contentText('world.scene.createSFWorld.label-80', {}),
      category: 'Central ridge · Clarendon Heights',
      kind: 'tower',
      x: SUTRO_SITE.x,
      y: SUTRO_SITE.y,
      entry: { ...SUTRO_SITE.entry },
      mapPoint: { x: SUTRO_SITE.x, y: SUTRO_SITE.y },
      description: contentText('world.scene.createSFWorld.description-81', {}),
    },
    {
      id: 'merced',
      label: contentText('world.scene.createSFWorld.label-82', {}),
      category: 'Southwestern San Francisco',
      kind: 'lake',
      x: 17,
      y: 57,
      entry: { x: 20, y: 57 },
      description: contentText('world.scene.createSFWorld.description-83', {}),
    },
    {
      id: 'nia',
      label: contentText('world.scene.createSFWorld.label-84', {}),
      category: 'Mazarine Coffee',
      kind: 'guest',
      x: 44,
      y: 28,
      entry: { x: 45, y: 29 },
      hiddenFromDirectory: true,
      description: contentText('world.scene.createSFWorld.description-85', {}),
    },
    {
      id: 'ducks',
      label: contentText('world.scene.createSFWorld.label-86', {}),
      category: 'Golden Gate Park',
      kind: 'ducks',
      entry: { x: 26, y: 32 },
      hiddenFromDirectory: true,
      description: contentText('world.scene.createSFWorld.description-87', {}),
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
      label: contentText('world.scene.createSFWorld.label-90', {}),
      category: 'Civic Center · gilded dome',
      kind: 'civic',
      x: 38,
      y: 30,
      entry: { x: 39, y: 33 },
      description: contentText('world.scene.createSFWorld.description-91', {}),
    },
    {
      id: 'salesforce',
      label: contentText('world.scene.createSFWorld.label-92', {}),
      category: 'South of Market · skyline',
      kind: 'tower',
      x: 50,
      y: 25,
      entry: { x: 51, y: 28 },
      description: contentText('world.scene.createSFWorld.description-93', {}),
    },
    {
      id: 'oracle',
      label: contentText('world.scene.createSFWorld.label-94', {}),
      category: 'South Beach · ballpark & cove',
      kind: 'stadium',
      x: 52,
      y: 34,
      entry: { x: 51, y: 36 },
      description: contentText('world.scene.createSFWorld.description-95', {}),
    },
    {
      id: 'dolores',
      label: contentText('world.scene.createSFWorld.label-96', {}),
      category: 'Mission · hillside lawns',
      kind: 'park',
      x: 36,
      y: 44,
      entry: { x: 36, y: 46 },
      description: contentText('world.scene.createSFWorld.description-97', {}),
    },
  );
  const ferrySite = requiredValue(
      sights.find((s) => s.id === 'ferry'),
      'Missing authored entity: ferry',
    ),
    salesforceSite = requiredValue(
      sights.find((s) => s.id === 'salesforce'),
      'Missing authored entity: salesforce',
    ),
    bridgeSite = requiredValue(
      sights.find((s) => s.id === 'baybridge'),
      'Missing authored entity: baybridge',
    );
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
    ['panhandle', 35, 31.5] satisfies [string, number, number],
    ['presidio', 25, 15] satisfies [string, number, number],
    ['crissy', 29, 11.5] satisfies [string, number, number],
    ['palace', 33, 13] satisfies [string, number, number],
    ['deyoung', 27, 29.5] satisfies [string, number, number],
    ['academy', 28, 32.5] satisfies [string, number, number],
    ['conservatory', 31, 29.5] satisfies [string, number, number],
    ['windmill', 11.5, 29.5] satisfies [string, number, number],
    ['pyramid', 49, 20] satisfies [string, number, number],
    ['coit', 47, 13] satisfies [string, number, number],
    ['golden', 18.8, 5] satisfies [string, number, number],
  ])
    requiredValue(
      sights.find((s) => s.id === id),
      'Landmark ' + id,
    ).mapPoint = { x, y };
  for (const [id, label] of [
    ['deyoung', 'de Young'] satisfies [string, string],
    ['academy', 'Academy · living roof'] satisfies [string, string],
    ['conservatory', 'Conservatory'] satisfies [string, string],
  ])
    requiredValue(
      sights.find((s) => s.id === id),
      'Landmark ' + id,
    ).worldLabel = label;
  for (const s of sights) {
    if (s.x !== undefined) s.x = mapTile(s.x);
    if (s.y !== undefined) s.y = mapTile(s.y);
    if (s.kind !== 'bike') s.entry = { x: mapTile(s.entry.x), y: mapTile(s.entry.y) };
    if (s.mapPoint) s.mapPoint = { x: mapPosition(s.mapPoint.x), y: mapPosition(s.mapPoint.y) };
  }

  const npcRevealed = (npc: import('../types/world.ts').ActorMetadata) =>
    !!(npc.alienId && playerLook.sunglasses);
  const npcLabel = (npc: import('../types/world.ts').ActorMetadata, combat = true) =>
    npcDisplayLabel(npc, {
      revealed: npcRevealed(npc),
      level: npc.alienId && !npcRevealed(npc) ? 1 : actorLevel(npc),
      combat,
    });
  const npcPrimary = (npc: import('../types/world.ts').ActorMetadata) =>
    npc.wilderness
      ? npc.combatKind === 'bear'
        ? 'pet'
        : 'attack'
      : npc.police
        ? 'examine'
        : npc.networkPlayer
          ? 'walk'
          : (['raptor', 'cow', 'kraken'] satisfies [string, string, string]).includes(
                npc.combatKind || '',
              ) || npcRevealed(npc)
            ? 'attack'
            : 'talk';

  let worldTiles: WorldTileMap | null = null;
  // BEGIN TILE BUILDER

  const sub2 = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1]] satisfies [number, number];

  // END TILE BUILDER
  // Mesh coordinates are east, elevation, south. Positions/normals/colors/UVs
  // remain in GPU buffers when the camera moves; only its matrix changes.
  // Inline SVG source assets are rasterized once into one mipmapped GPU atlas.
  // Materials repeat in world coordinates, so adjacent surface cells have no seams.
  let tahoeGPU: GeometryGPU | null = null,
    tahoeMesh: Mesh | null = null;
  const signTextureControls: import('../materials.ts').BillboardController = {};
  let characterGPU: ReturnType<
    typeof import('../rendering/character-gpu.ts').createCharacterGPU
  > | null = null;
  let program: ShaderProgram,
    atlasTexture: ReturnType<typeof import('../materials.ts').createSignTexture>,
    materialTexture: WebGLTexture,
    materialState: ReturnType<typeof import('../materials.ts').createMaterialTexture> | null = null,
    alpineTextures: ReturnType<
      typeof import('../alpine-materials.ts').createAlpineTexture
    >['textures'],
    alpineState: ReturnType<typeof import('../alpine-materials.ts').createAlpineTexture> | null =
      null,
    sceneGPU: GeometryGPU,
    groundGPU: GeometryGPU,
    dynamicGPU: ReturnType<typeof import('../rendering/dynamic-buffer.ts').createDynamicGeometry>,
    sceneMesh: Mesh,
    groundMesh: Mesh,
    seaBounds: ReturnType<typeof import('../environment.ts').createSeaSurface>,
    shadowProgram: ShaderProgram,
    shadowFramebuffer: WebGLFramebuffer | null,
    shadowTexture: WebGLTexture | null,
    shadowMatrix: ReturnType<typeof import('../geometry.ts').matrixMultiply>,
    shadowRoom: string | undefined,
    lampGlow: ReturnType<typeof import('../lighting.ts').createLampGlow>,
    cityLife: ReturnType<typeof import('../life.ts').createCityLife> | null = null,
    noeValleyLife: ReturnType<typeof import('../life.ts').createCityLife> | null = null;
  const SHADOW_SIZE = 2048;
  const glazing = createGlazingBatch();
  let glassGPU: GeometryGPU | null = null,
    drawingGlass = false;
  let cityLightPlan: ReturnType<
    typeof import('../street-light-layout.ts').planBlockStreetLights
  > | null = null;
  const streetLights: LightSource[] = [],
    buildingModels: BuildingModel[] = [],
    signs: SignAtlas = new Map(),
    gpuStats = { triangles: 0, drawCalls: 0 };

  let heights: HeightField | null = null,
    naturalHeights: HeightField | null = null;

  const lakes: Lake[] = [];

  const terrainPads: TerrainPad[] = [];

  const cityParcels: CityParcel[] = [],
    publicSpaces: number[][][] = [],
    parcelBins = new Map<string, CityParcel[]>();
  const rectangle = (cx: number, cz: number, w: number, d: number, angle = 0) =>
    [
      [-w / 2, -d / 2] satisfies [number, number],
      [w / 2, -d / 2] satisfies [number, number],
      [w / 2, d / 2] satisfies [number, number],
      [-w / 2, d / 2] satisfies [number, number],
    ].map(
      ([x, z]) =>
        [
          cx + x * Math.cos(angle) - z * Math.sin(angle),
          cz + x * Math.sin(angle) + z * Math.cos(angle),
        ] satisfies [number, number],
    );
  const polygonBounds = (p: readonly (readonly number[])[]) => ({
    x: Math.min(...p.map((v) => v[0])),
    z: Math.min(...p.map((v) => v[1])),
    right: Math.max(...p.map((v) => v[0])),
    bottom: Math.max(...p.map((v) => v[1])),
  });
  const objectFootprint = (o: WorldObject) =>
    o.footprint || rectangle(o.x + o.w / 2, o.y + o.d / 2, o.w, o.d);

  const restaurantDiners: import('../restaurants.ts').Diner[] = [],
    restaurantSites: import('../restaurants.ts').RestaurantSite[] = [];

  let cityNavigation: ReturnType<typeof import('../navigation.ts').restoreTileNavigation> | null =
      null,
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

  let clickAttempt: { worked: boolean; walking: boolean } | null = null,
    clickAnimation: Animation | null = null;

  const mapArtPoint = (x: number, y: number) => ({
    x: MAP_ART.x + (x * 10) / MAP_SCALE,
    y: MAP_ART.y + (y * 9.5) / MAP_SCALE,
  });
  const referenceMapArtPoint = (x: number, y: number) =>
    mapArtPoint(mapPosition(x), mapPosition(y));

  let miniIcons: MinimapIcon[] = [],
    miniKeyboardPlace: Place | null = null;
  const placeMarkerViews: PlaceMarkerView[] = [];

  let pickedCache: { x: number; y: number; frame: number; result: PickTarget | null } | null = null,
    frameID = 0;

  let dynamicTargets: ActorTarget[] = [],
    actorTags: ActorTag[] = [];

  let carArrival: (() => void) | null = null;

  let hoppingRocket = false;

  let lightingDecorativeRocket = false;

  if (headless) {
    build();
    return attachSceneBindings(
      {
        searchSites: searchSites!,
        keeperNPC: keeperNPC!,
        zoo: zoo!,
        whales: whales!,
        caveExitSite: caveExitSite!,
        bomberSite: bomberSite!,
        loreSites: loreSites!,
        compiled: bake ? snapshotStaticWorld() : null,
        growthService: growthService!,
        countryside: countryside!,
        tabletService: tabletService!,
        tabletWizard: tabletWizard!,
        tabletDestinations: tabletDestinations!,
        marinLand: marinLand!,
        detention: detention!,
        wilderness: wilderness!,
        bankService: bankService!,
        banker: banker!,
        secretWorld: secretWorld!,
        caveMesh: caveMesh!,
        oldMan: oldMan!,
        secretStairs: secretStairs!,
        guildStatus: guildStatus!,
        peptideSpawns: peptideSpawns!,
        cityLife: cityLife!,
        lives: [
          context.cityLife,
          southernLife,
          context.noeValleyLife,
          squareLife,
          context.esotericCampus?.life,
        ].filter(Boolean),
        social: social!,
        socialLife: socialLife!,
        tech: tech!,
        saltMail: saltMail!,
        sandSite: context.sandSite,
        pequodSite: context.pequodSite,
        sutroClimb,
        rocket,
        slowBus: slowBus!,
        expeditions: expeditions!,
        surf: surf!,
        waveSurf: waveSurf!,
        pacificaSurfSite: pacificaSurfSite as Site | null,
        noeValleyLife: noeValleyLife!,
        instituteRooms: instituteRooms!,
        instituteRoomAt: instituteRoomAt!,
        forwardRoll: forwardRoll!,
        aiLabJob: aiLabJob!,
        health: health!,
        deli: deli!,
        streetTraffic: streetTraffic!,
        airportAds: airportAds!,
        airportFieldAds: airportFieldAds!,
        placeAt: placeAt!,
        groundSurfaceAt: (x: number, z: number) =>
          z >= N ? airportSurfaceTypeAt(x, z) : surfaceTypeAt(x, z),
        economy: economy!,
        inebriation: inebriation!,
        rehabilitation: rehabilitation!,
        jailStaff: jailStaff!,
        parrots: parrots!,
        fishing: fishing!,
        fishingSite: context.fishingSite,
        sunglasses: sunglasses!,
        sunglassesSite: context.sunglassesSite,
        beachBillboard: context.beachBillboard,
        quests: quests!,
        skateboard: skateboard!,
        skateTricks: skateTricks!,
        motorcycle: motorcycle!,
        monkeyKeeper: monkeyKeeper!,
        esotericCampus: esotericCampus!,
        squareLife: squareLife!,
        specialNPCLife: specialNPCLife!,
        cityLightPlan: cityLightPlan!,
        tiles: worldTiles!,
        navigation: cityNavigation!,
        objects: objects!,
        places: places!,
        sights: sights!,
        parkSouthEdge: parkSouthEdge!,
        southernLife: southernLife!,
        southernNeighborhood: southernNeighborhood!,
        spawn: { x: player.x, y: player.y },
        merchants: merchants!,
        bunny: bunny!,
        skateDog: skateDog!,
        airship: airship!,
        tahoe: tahoe!,
        ferrari: ferrari!,
        strength: strength!,
        highwaySites: highwaySites!,
        nightclub: nightclub!,
        restaurantDiners: restaurantDiners!,
        regionalRoad: regionalRoad!,
        goldenGate: goldenGate!,
        southernTerrain: southernTerrain!,
        terrainHeight: terrainHeight!,
        characterGround: characterGround!,
        pathTo: pathTo!,
        minimapTarget: minimapTarget!,
        lineClear: railgunLineClear,
        canTravel: canTravel!,
        clearAt: clearAt!,
        landClearAt: landClearAt!,
        cityPathTo: cityPathTo!,
        navigationRegionAt: navigationRegionAt!,
        nearestNavigation: nearestNavigation!,
        approaches: {
          bunny: bunnyApproach,
          sutro: sutroApproach,
          merchant: merchantApproach,
          combat: creatureApproach,
        },
      },
      context,
    );
  }
  const mapDiagnostics = Object.freeze({
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
      position: (x: number, y: number) => cityNavigation?.describe(x, y),
      connected: (from: Point, to: Point) => cityNavigation?.connected(from, to) || false,
      route: (from: Point | undefined, to: Point) => (built ? pathTo(to.x, to.y, from) : null),
    }),
    validate: () =>
      worldTiles ? (worldStream ? worldTiles.validation : validateTileMap(worldTiles)) : null,
    testRules: runTileRuleTests,
    get report() {
      return worldTiles?.validation || null;
    },
    tile: (x: number, z: number) => {
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
  Object.assign(window, { SFMapDiagnostics: mapDiagnostics });
  $('sf-toggle').hidden = false;
  $('sf-toggle').addEventListener('click', () => {
    if (document.documentElement.dataset.sfEntry === 'explore') {
      window.location.href = new URL('../', window.location.href).href;
      return;
    }
    setMode(!active).catch((error) => loading?.fail(error));
  });
  $('sf-drive-tahoe').addEventListener('click', () =>
    driveFerrari(TAHOE.base.x - 0.5, TAHOE.base.z - 0.5),
  );
  $('sf-drive-dealer').addEventListener('click', () => {
    const car = requiredValue(ferrari, 'Ferrari controls'),
      p = car.sample(car.dealer);
    driveFerrari(p.x - 0.5, p.z - 0.5);
  });
  $('sf-charge-railgun').addEventListener('click', () =>
    context.multiplayer.command('inventory', { op: 'chargeRailgun' }).then((result) => {
      if (result.message) announce(result.message, 'You');
    }),
  );
  $('sf-railgun-button').addEventListener('click', toggleRailgun);
  $('sf-order-doordash').addEventListener('click', orderDoorDash);
  $('sf-eat-sandwich').addEventListener('click', eatSandwich);
  $('sf-fuel-can-button').addEventListener('click', useFuelCan);
  $('sf-refuel-button').addEventListener('click', () => {
    const s = nearestFuel();
    if (s) useFuel(sightById(s.id));
  });
  $('sf-bike-button').addEventListener('click', useBike);
  $('sf-skateboard-button').addEventListener('click', useSkateboard);
  for (const button of world.querySelectorAll<HTMLButtonElement>('[data-skate-trick]'))
    button.addEventListener('click', () => performSkateTrick(button.dataset.skateTrick || ''));
  $('sf-motorcycle-button').addEventListener('click', () => useMotorcycle());
  $('sf-climb-button').addEventListener('click', descendSutro);
  $('sf-rope-button').addEventListener('click', showRopeMenu);
  $('sf-ski-button').addEventListener('click', useTahoeActivity);
  $('sf-wave-catch').addEventListener('click', catchPacificaWave);
  for (const button of world.querySelectorAll<HTMLButtonElement>('[data-surf-trick]'))
    button.addEventListener('click', () => performSurfTrick(button.dataset.surfTrick || ''));
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
  for (const button of world.querySelectorAll<HTMLButtonElement>('[data-say]'))
    button.addEventListener('click', () => sayPhrase(button.dataset.say || ''));
  $('sf-roll-button').addEventListener('click', rollForward);
  $('sf-drink-coffee').addEventListener('click', drinkBankCoffee);
  $('sf-dance-button').addEventListener('click', dance);
  $('sf-sit-button').addEventListener('click', sit);
  $('sf-character-button').addEventListener('click', showCharacter);
  $('sf-close-character').addEventListener('click', closeCharacter);
  $('sf-character-done').addEventListener('click', closeCharacter);
  $('sf-light-decorative-rocket').addEventListener('click', lightDecorativeRocket);
  $('sf-rocket-hop').addEventListener('click', hopRocket);
  for (const field of world.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
    '[data-character]',
  ))
    field.addEventListener('input', () => changeCharacter(field));
  $('sf-iphone-equipped').addEventListener('input', (e) => {
    const result = tech.equipPhone($('sf-iphone-equipped').checked);
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
  $('sf-zoom-slider').addEventListener('input', (e) =>
    setZoom(Number($('sf-zoom-slider').value) / 100),
  );
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
    if (npc && isFiniteNumber(npc.hold)) npc.hold = Math.max(npc.hold, 0.35);
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
          : {
              talk: 'Talk-To',
              attack: 'Attack',
              examine: 'Examine',
              pet: 'Pet',
              walk: 'Walk here',
            }[npcPrimary(citizen)] +
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
        return npc?.rehabilitation && !npc.networkPlayer
          ? talkRehabilitation(npc)
          : walkTo(tile.x, tile.y);
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
          requiredValue(airship.state.position, 'Airship deck position'),
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
    if (
      !$('sf-context').hidden &&
      !$('sf-context').contains(e.target as Node | null) &&
      e.target !== canvas
    )
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
    if (requiredValue(debugConsole, 'Debug console').handleKey(e)) return;
    if (capture.state.active || rehabilitation.state.active) return;
    const key = e.key.toLowerCase();
    if (
      chase?.state.jailed &&
      (['b', 'f', 'e', 'a'] satisfies [string, string, string, string]).includes(key)
    ) {
      e.preventDefault();
      return;
    }
    if (context.aiInterview.visible) {
      keys.clear();
      context.aiInterview.handleKey(e);
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
        context.questMenu.close();
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
      if (context.dialogue.active) {
        context.dialogue.close();
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
    if (context.dialogue.active) {
      keys.clear();
      context.dialogue.handleKey(e);
      return;
    }
    if (
      rocket.state.active &&
      (['a', 'b', 'f', 'e'] satisfies [string, string, string, string]).includes(key)
    ) {
      e.preventDefault();
      return;
    }
    if (modal) {
      if (key === 'tab') {
        const focus = [
            ...modal.querySelectorAll<
              HTMLElementTagNameMap['button' | 'a' | 'canvas' | 'input' | 'select']
            >('button,a[href],canvas[tabindex],input,select'),
          ],
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
      (e.target instanceof HTMLElement && e.target.isContentEditable)
    )
      return;
    if (!$('sf-context').hidden && (key === 'arrowdown' || key === 'arrowup')) {
      e.preventDefault();
      const opts = [...$('sf-context').querySelectorAll<HTMLElementTagNameMap['button']>('button')],
        i = opts.findIndex((option) => option === document.activeElement);
      opts[(i + (key === 'arrowdown' ? 1 : -1) + opts.length) % opts.length].focus();
      return;
    }
    if (
      (
        ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'] satisfies [
          string,
          string,
          string,
          string,
        ]
      ).includes(key)
    ) {
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
      if (
        (
          ['a', 'b', 'f', 'e', 'r', 'm', 'k', 'v', 'd', 'u', 'g'] satisfies [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        ).includes(key)
      ) {
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
      else
        performSurfTrick(
          requiredValue(
            SURF_TRICKS.find((t) => t.key === key),
            'Surf trick',
          ).id,
        );
      return;
    }
    if (!e.repeat && skateboard.riding && SKATE_TRICKS.some((t) => t.key === key)) {
      e.preventDefault();
      performSkateTrick(
        requiredValue(
          SKATE_TRICKS.find((t) => t.key === key),
          'Skate trick',
        ).id,
      );
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
      context.questMenu.open();
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
      const tower = requiredValue(sightById('sutro'), 'Missing authored entity: sutro').object;
      if (
        tower &&
        hasPhysicalBounds(tower) &&
        Math.hypot(player.x + 0.5 - tower.x - tower.w / 2, player.y + 0.5 - tower.y - tower.d / 2) <
          4
      ) {
        climbSutro();
        return;
      }
      const p =
        currentInterior ||
        places.find((p) => p.entry && Math.hypot(player.x - p.entry.x, player.y - p.entry.y) < 2.5);
      if (p) enter(requirePlacedBuilding(p));
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
    context.multiplayer.checkpoint(true);
    keys.clear();
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else if (active) startLoop();
  });
  canvas.addEventListener('webglcontextlost', (e) => {
    characterGPU = null;
    context.multiplayer.checkpoint(true);
    e.preventDefault();
    keys.clear();
    cancelAnimationFrame(raf);
  });
  canvas.addEventListener('webglcontextrestored', () => {
    context.multiplayer.checkpoint(true);
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
    ] as const) {
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

/** Derived from the real getters and setters, so scene services cannot drift apart. */
export type WorldContext = NonNullable<ReturnType<typeof createSFWorld>>['sceneBindings'];
