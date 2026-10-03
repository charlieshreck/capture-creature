// ============================================================================
//  Game — the engine. Owns the renderer, the world, the camera, input, and the
//  main loop, and wires together the Economy, Avatar, BuildSystem and HUD.
//  Rendering choices (PBR materials, real sky + sun, soft shadows, tone
//  mapping) are what give the "semi-realistic" look while geometry stays simple.
// ============================================================================
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';

import { Economy } from './Economy.js';
import { Avatar } from './Avatar.js';
import { BuildSystem } from './BuildSystem.js';
import { HUD } from './ui.js';
import { makeGroundTextures, makeSandTexture } from './textures.js';

// Zoom range for the overhead planning view (Tab toggles to it).
const OVERHEAD = { minDist: 16, maxDist: 80 };

// ---- harvesting (chopping trees / mining rocks with the wooden pickaxe) ----
const HARVEST_TIME = 4.5;                 // seconds of holding to break one
const REACH = { wood: 3.6, stone: 3.0 };  // how close you must stand ("one step")
const GROW_TIME = 20;                     // seconds for a planted sapling → tree
const PLANT_RANGE = 10;                   // how far from you a sapling/table can be placed
const TABLE_REACH = 4;                    // how close you must be to open a placed table
// Same number of trees/rocks as before, but spread over a BIGGER map (so there's
// room for lakes). They simply sit further apart.
const FOREST = { trees: 360, rocks: 100, maxR: 140, clearOrigin: 5, clearSpawn: 4 };
// Three lakes: water radius `r`, with a sand beach `beach` units wide around it.
const LAKES = [
  { x: 70, z: 60, r: 16 },
  { x: -80, z: 45, r: 18 },
  { x: 15, z: -90, r: 15 },
];
const BEACH = 6;        // how far the sand reaches past the water's edge
const WATER_Y = 0.06;   // water surface height (sand sits just below it)
const DIG_TIME = 1.6;   // digging sand/dirt is quicker than chopping a tree
const DIG_RANGE = 4;    // how close to the spot you must stand to dig it
// Collision radii (world units): you can't walk closer than avatar+thing.
const COLLIDE = { avatar: 0.4, tree: 0.6, rock: 0.85, table: 0.8, campfire: 0.9 };
// A crafting table is TABLE_WIDTH wide and about 1 unit tall. A wood wall is the
// SAME width (one table length) and about 3.5 tables tall.
const TABLE_WIDTH = 1.2;
const WALL_HEIGHT = 3.5;
// The wall is one table wide PLUS 2.3 more tables long → 3.3 tables long total.
const WALL_LENGTH = TABLE_WIDTH * 3.3;
const WALL_THICK = 0.35;
const ROT_STEPS = 9;                  // press Y to rotate placement by 1/9 turn each time
const PLACE_GHOST_OPACITY = 0.6;      // the see-through placement preview
const DIG_CELL = 1.6;                 // ground digging is tracked on a grid this big
const DIG_STEP = 0.8;                 // how far you sink per level dug
const STONE_DEPTH = 2;                // after digging down this far you hit stone
const IRON_DEPTH = 5;                 // deeper than this you need an iron pickaxe
const STONE_FAST = 0.7;               // a stone pickaxe is 0.7s quicker
const IRON_FAST = 1.2;                // an iron pickaxe is even quicker
const SEED_CHANCE = 0.6;             // chance digging grass gives a wheat seed
const CROP_GROW = 15;                 // seconds for planted wheat to grow

export class Game {
  constructor(container) {
    this.container = container;
    this.economy = new Economy();
    this.clock = new THREE.Clock();

    this._initRenderer();
    this._initScene();
    this._initCamera();
    this._initPostFX();
    this._initInput();

    this.avatar = new Avatar();
    this.avatar.group.position.set(0, 0, 10); // stand back from the campfire
    this.avatar.group.rotation.y = Math.PI; // face the origin
    this.scene.add(this.avatar.group);
    this.avatar.setVisible(this.camMode !== 'first'); // hidden in first person
    this.avatar.blocked = (x, z) => this._blocked(x, z); // solid trees/rocks/tables

    this.buildSystem = new BuildSystem(this.scene, this.economy, this.avatar);

    // Place the starting campfire automatically so the world isn't empty.
    this._placeStarter();

    this.hud = new HUD(this);

    window.addEventListener('resize', () => this._onResize());
  }

  // ---- setup -----------------------------------------------------------------
  _initRenderer() {
    const r = new THREE.WebGLRenderer({ antialias: true });
    this.renderer = r;
    // Adaptive resolution: render to a pixel BUDGET, then let the browser scale
    // the image up to fill the window. A big full-screen window has ~2× the
    // pixels of a half-screen one, so without this it does ~2× the GPU work and
    // drops frames. Holding the pixel count steady keeps it smooth at any size.
    r.setPixelRatio(this._resolutionRatio());
    r.setSize(window.innerWidth, window.innerHeight);
    // No shadows anywhere (the user asked for none) — also the cheapest option.
    r.shadowMap.enabled = false;
    // AgX is a more film-like, true-to-life tone mapping than ACES.
    r.toneMapping = THREE.AgXToneMapping;
    r.toneMappingExposure = 1.0;
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(r.domElement);
    this.renderer = r;
  }

  _initScene() {
    this.scene = new THREE.Scene();

    // --- realistic sky + sun (drives both the visible sky and the lighting) ---
    const elevation = 30, azimuth = 135;
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);
    const sun = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
    this.sun = sun;

    const sky = new Sky();
    sky.scale.setScalar(12000);
    this._configureSky(sky, sun);
    this.scene.add(sky);

    // Image-based lighting: render a small copy of THIS sky into an environment
    // map, so every surface is lit by — and reflects — the real sky colours.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    const envSky = new Sky();
    envSky.scale.setScalar(100);
    this._configureSky(envSky, sun);
    const envScene = new THREE.Scene();
    envScene.add(envSky);
    this.scene.environment = pmrem.fromScene(envScene, 0, 0.1, 1000).texture;
    pmrem.dispose();

    // atmospheric haze for depth
    this.scene.fog = new THREE.FogExp2(0xcdd9e6, 0.0016);

    // --- lights --- (sky fill + sun for gentle shading; no shadows cast)
    // Slightly lower fill so the baked ambient-occlusion on foliage reads.
    this.scene.add(new THREE.HemisphereLight(0xbfd9ff, 0x3a4a2a, 0.5));
    const sunLight = new THREE.DirectionalLight(0xfff3e2, 2.6);
    sunLight.position.copy(sun).multiplyScalar(120);
    this.scene.add(sunLight);
    this.scene.add(sunLight.target);

    // --- ground (colour + normal textures) ---
    const tex = makeGroundTextures(512);
    // Cap anisotropy at 4: the ground is the biggest surface and is viewed at
    // grazing angles, where max anisotropy (often 16) costs many texture taps
    // per pixel for almost no visible gain.
    const maxAniso = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    for (const t of Object.values(tex)) {
      t.anisotropy = maxAniso;
      t.repeat.set(70, 70);
    }
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      // Phong (not full PBR): no environment lookup and no roughness-map fetch,
      // a big per-pixel saving on the largest surface on screen.
      new THREE.MeshPhongMaterial({
        map: tex.map,
        normalMap: tex.normalMap,
        shininess: 4,
        specular: 0x111111,
        normalScale: new THREE.Vector2(1, 1),
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.ground = ground;

    // placement grid (only visible while building)
    this.grid = new THREE.GridHelper(200, 100, 0x335522, 0x335522);
    this.grid.material.transparent = true;
    this.grid.material.opacity = 0.25;
    this.grid.visible = false;
    this.scene.add(this.grid);

    this._addScenery();
  }

  // Shared sky settings, applied to both the visible sky and the env-map sky.
  _configureSky(sky, sun) {
    const u = sky.material.uniforms;
    u.turbidity.value = 6;
    u.rayleigh.value = 1.8;
    u.mieCoefficient.value = 0.004;
    u.mieDirectionalG.value = 0.8;
    u.sunPosition.value.copy(sun);
  }

  // Post-processing: ambient occlusion (real contact shadows), subtle bloom,
  // The game always uses the bright, clear look — straight to the screen with
  // no heavy bloom/ambient-occlusion "foggy" post-processing. (Keeping this as
  // a no-op so the rest of the loop, which checks this.composer, just works.)
  _initPostFX() {
    this.composer = null;
    this._postEnabled = false;
  }

  // A thick forest of harvestable trees and rocks. Each one is registered as a
  // "node" you can chop/mine with the pickaxe.
  _addScenery() {
    this._initFoliageAssets();

    this.nodes = [];        // harvestable things: { type, group, pos, range, meshes }
    this._hitMeshes = [];   // flat list of meshes the cursor ray can hit
    this._growing = [];     // planted saplings still growing into trees
    this._tables = [];      // placed crafting tables: { group, pos }
    this._tableMeshes = []; // their meshes (so a click can find the table)
    this._walls = [];       // placed wood walls: { group, pos }
    this._farms = [];       // placed farm bases: { pos, yaw, hx, hz }
    this._crops = [];       // planted wheat still growing
    this._digCells = new Map(); // how deep the ground has been dug, per cell

    this._addLakes();       // lakes + sand beaches (before the forest, so trees avoid them)

    let placed = 0, guard = 0;
    while (placed < FOREST.trees + FOREST.rocks && guard++ < 30000) {
      const x = (Math.random() * 2 - 1) * FOREST.maxR;
      const z = (Math.random() * 2 - 1) * FOREST.maxR;
      if (x * x + z * z < FOREST.clearOrigin ** 2) continue;        // keep campfire clear
      if (x * x + (z - 10) ** 2 < FOREST.clearSpawn ** 2) continue; // keep your spawn clear
      if (this._nearLake(x, z, BEACH)) continue;                    // keep lakes + beaches clear

      if (placed < FOREST.trees) {
        const g = this._makeTree(0.8 + Math.random() * 1.1);
        g.position.set(x, 0, z);
        this.scene.add(g);
        this._registerNode('wood', g, x, z, REACH.wood);
      } else {
        const g = this._makeRock();
        g.position.set(x, 0, z);
        this.scene.add(g);
        this._registerNode('stone', g, x, z, REACH.stone);
      }
      placed++;
    }
  }

  // Build the three lakes: a grainy sand beach, a damp shoreline ring, and a
  // reflective translucent water surface. The sand is flat and dug directly.
  _addLakes() {
    const sandMat = new THREE.MeshLambertMaterial({ map: makeSandTexture(128) });
    const wetMat = new THREE.MeshLambertMaterial({ color: 0xb8a675 }); // damp sand at the edge
    // Standard material reflects the sky environment, so it reads as real water.
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x2b6aa0, metalness: 0.15, roughness: 0.12,
      transparent: true, opacity: 0.82, depthWrite: false,
    });
    waterMat.envMapIntensity = 1.0;

    for (const lake of LAKES) {
      const beach = new THREE.Mesh(new THREE.CircleGeometry(lake.r + BEACH, 56), sandMat);
      beach.rotation.x = -Math.PI / 2; beach.position.set(lake.x, 0.03, lake.z);
      this.scene.add(beach);

      const wet = new THREE.Mesh(new THREE.RingGeometry(lake.r - 0.6, lake.r + 1.4, 56), wetMat);
      wet.rotation.x = -Math.PI / 2; wet.position.set(lake.x, 0.04, lake.z);
      this.scene.add(wet);

      const water = new THREE.Mesh(new THREE.CircleGeometry(lake.r, 56), waterMat);
      water.rotation.x = -Math.PI / 2; water.position.set(lake.x, WATER_Y, lake.z);
      this.scene.add(water);
    }
  }

  // Is (x,z) inside any lake's water+beach (plus an optional margin)?
  _nearLake(x, z, margin = 0) {
    for (const l of LAKES) {
      const rr = l.r + margin;
      if ((x - l.x) ** 2 + (z - l.z) ** 2 < rr * rr) return true;
    }
    return false;
  }

  // The floor height under (x,z): lower the more that cell has been dug down.
  _floorAt(x, z) {
    const key = `${Math.round(x / DIG_CELL)},${Math.round(z / DIG_CELL)}`;
    const cell = this._digCells.get(key);
    return cell ? -cell.depth * DIG_STEP : 0;
  }

  // Is the avatar standing in open water (for swimming)?
  _inWater(x, z) {
    for (const l of LAKES) {
      if ((x - l.x) ** 2 + (z - l.z) ** 2 < l.r ** 2) return true;
    }
    return false;
  }

  // Materials made once and shared. Trees are UNLIT (MeshBasic) so they show an
  // even green with no light-and-dark shading anywhere — no shadows at all.
  // Rocks keep their lit, faceted look (the stone the user liked).
  _initFoliageAssets() {
    const greens = [0x3f7a3a, 0x4c8a3e, 0x356b32, 0x46863c];
    this._mat = {
      trunk: new THREE.MeshBasicMaterial({ color: 0x6b4a2b }),
      leaves: greens.map((c) => new THREE.MeshBasicMaterial({ color: c })),
      rock: new THREE.MeshLambertMaterial({ color: 0x8f897e, flatShading: true }),
      wood: new THREE.MeshBasicMaterial({ color: 0x8a5a2b }), // unlit, even wood — no shaded side
      dirtPatch: new THREE.MeshLambertMaterial({ color: 0x6e4a28 }), // a dug-out dirt hole
      stonePatch: new THREE.MeshLambertMaterial({ color: 0x8f897e }), // flat stone under the dirt
      farm: new THREE.MeshLambertMaterial({ color: 0x6e4a28 }),       // tilled farm soil
      wheat: new THREE.MeshLambertMaterial({ color: 0xcdb24a }),      // ripe wheat
    };
  }

  // One simple tree for ALL trees: a trunk + a couple of overlapping ROUND
  // blobs for a full, rounded canopy. Used for the forest and for grown saplings.
  _makeTree(scale = 1) {
    const t = new THREE.Group();
    const th = 1.8 + Math.random() * 1.4;
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.42, th, 8), this._mat.trunk);
    tr.position.y = th / 2;
    t.add(tr);
    const mat = this._mat.leaves[(Math.random() * this._mat.leaves.length) | 0];
    const base = th + 0.2;
    for (let b = 0; b < 2; b++) {
      const rad = (b === 0 ? 1.6 : 1.15) + Math.random() * 0.5;
      const lv = new THREE.Mesh(new THREE.IcosahedronGeometry(rad, 2), mat);
      lv.position.set((Math.random() - 0.5) * 0.7, base + b * 0.8 + rad * 0.3, (Math.random() - 0.5) * 0.7);
      t.add(lv);
    }
    t.rotation.y = Math.random() * Math.PI;
    t.scale.setScalar(scale);
    return t;
  }

  _makeRock() {
    const g = new THREE.Group();
    const n = 1 + ((Math.random() * 2) | 0); // 1 or 2 boulders (no shadows)
    for (let k = 0; k < n; k++) {
      const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + Math.random() * 0.9), this._mat.rock);
      rk.position.set((Math.random() - 0.5) * 1.5, 0.3 + Math.random() * 0.3, (Math.random() - 0.5) * 1.5);
      rk.rotation.set(Math.random(), Math.random(), Math.random());
      g.add(rk);
    }
    return g;
  }

  // Remember a group as a harvestable node, and tag every mesh so a cursor ray
  // that hits any part of it knows which node it belongs to.
  _registerNode(type, group, x, z, range) {
    const node = { type, group, pos: new THREE.Vector3(x, 0, z), range, meshes: [] };
    group.traverse((o) => {
      if (o.isMesh) { o.userData.node = node; node.meshes.push(o); }
    });
    this.nodes.push(node);
    this._hitMeshes.push(...node.meshes);
  }

  _initCamera() {
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 20000);
    this.camMode = 'first'; // first-person ("your own eyes") by default

    // mouse-look offsets used in first person (drag to glance around)
    this.lookYaw = 0;
    this.lookPitch = -0.04;

    // orbit params used only by the overhead planning view
    this.cam = { yaw: Math.PI, pitch: 1.1, dist: 42 };

    this._eye = new THREE.Vector3();
    this._lookTarget = new THREE.Vector3();

    // The camera eases toward where it *should* be instead of snapping there.
    // These hold the current (smoothed) eye position and look point, and
    // _camInit tells us to snap on the very first frame / after a mode switch.
    this._camPos = new THREE.Vector3();
    this._camLook = new THREE.Vector3();
    this._camInit = false;
  }

  _initInput() {
    this.keys = new Set();
    this.mouseNDC = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this._dragging = false;
    this._dragMoved = false;
    this._lmbDown = false;   // is the left mouse button held? (for chopping)
    this._mineNode = null;   // the tree/rock we're currently breaking
    this._mineTime = 0;      // how long we've held on it
    this._placeGhost = null; // see-through preview of the object being placed
    this._placeGhostId = null;
    this._placeYaw = 0;      // which of the 9 rotation steps the preview is at
    this._attachTarget = null; // where a wall would snap end-to-end onto another
    this._groundVec = new THREE.Vector3(); // reused for cursor→ground (no per-frame garbage)
    this._aim = null;        // current target {node?, type, time}, refreshed a few times/sec
    this._curNode = null;    // node we're actively mining (reset timer when it changes)
    this._curType = null;    // resource we're actively digging
    this._curKey = null;     // which ground cell we're digging
    this._blockedKey = null; // cell we've warned needs a stone pickaxe
    this._castAcc = 0;       // throttle timer for the harvest raycast

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') { this.buildSystem.clearSelection(); this._syncGrid(); }
      if (e.code === 'KeyY') this._placeYaw = (this._placeYaw + 1) % ROT_STEPS; // rotate preview
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    const dom = this.renderer.domElement;
    dom.addEventListener('contextmenu', (e) => e.preventDefault());

    dom.addEventListener('pointermove', (e) => {
      this.mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
      if (this._dragging) {
        this._dragMoved = true;
        if (this.camMode === 'first') {
          // glance around without turning the body
          this.lookYaw -= e.movementX * 0.004;
          this.lookPitch = THREE.MathUtils.clamp(this.lookPitch - e.movementY * 0.004, -0.9, 0.9);
        } else {
          this.cam.yaw -= e.movementX * 0.005;
          this.cam.pitch = THREE.MathUtils.clamp(this.cam.pitch + e.movementY * 0.005, 0.35, 1.45);
        }
      } else if (this.buildSystem.hasSelection) {
        const p = this._groundPoint();
        if (p) this.buildSystem.updateGhost(p);
      }
    });

    dom.addEventListener('pointerdown', (e) => {
      if (e.button === 2) { this._dragging = true; this._dragMoved = false; return; }
      if (e.button === 0) { this._lmbDown = true; this._onLeftClick(); }
    });

    window.addEventListener('pointerup', (e) => {
      if (e.button === 0) this._lmbDown = false;
      if (e.button === 2) {
        // a right-click without dragging cancels the current build selection
        if (!this._dragMoved && this.buildSystem.hasSelection) {
          this.buildSystem.clearSelection();
          this._syncGrid();
        }
        this._dragging = false;
      }
    });
    // if the window loses focus mid-chop, stop holding so we don't get stuck
    window.addEventListener('blur', () => { this._lmbDown = false; });

    dom.addEventListener('wheel', (e) => {
      if (this.camMode !== 'overhead') return; // zoom only matters in the planning view
      this.cam.dist = THREE.MathUtils.clamp(this.cam.dist + e.deltaY * 0.02, OVERHEAD.minDist, OVERHEAD.maxDist);
    }, { passive: true });
  }

  // ---- helpers ---------------------------------------------------------------
  _placeStarter() {
    // build the starting campfire instantly at the origin (free, no walking)
    this.buildSystem.placeInstant('campfire', 0, 0);
  }

  selectBuilding(id) {
    this.buildSystem.select(id);
    this._syncGrid();
  }

  _syncGrid() {
    this.grid.visible = this.buildSystem.hasSelection;
  }

  // Ray from the cursor to the ground plane.
  _groundPoint() {
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const hits = this.raycaster.intersectObject(this.ground);
    return hits.length ? hits[0].point : null;
  }

  // Same idea, but solved against the flat y=0 plane with NO allocation — safe
  // to call every frame (used for the placement preview). Writes into `out`.
  _groundAtCursor(out) {
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const r = this.raycaster.ray;
    if (Math.abs(r.direction.y) < 1e-6) return null;
    const t = -r.origin.y / r.direction.y;
    if (t < 0) return null;
    return out.set(r.origin.x + r.direction.x * t, 0, r.origin.z + r.direction.z * t);
  }

  // A left click: open a crafting table you clicked on, OR place the item you're
  // holding (a table / a sapling). Chopping is HOLDING the button (_updateHarvest).
  _onLeftClick() {
    if (!this.hud) return;
    const a = this.avatar.group.position;

    // 1) clicked a crafting table you've placed? open it (if you're close).
    if (this._tableMeshes.length) {
      this.raycaster.setFromCamera(this.mouseNDC, this.camera);
      const hits = this.raycaster.intersectObjects(this._tableMeshes, false);
      if (hits.length) {
        const table = hits[0].object.userData.table;
        if ((a.x - table.pos.x) ** 2 + (a.z - table.pos.z) ** 2 <= TABLE_REACH ** 2) {
          this.hud.openCrafting();
        } else {
          this.hud.toast('🛠️ Too far', 'Walk up to the table to craft', '');
        }
        return;
      }
    }

    const held = this.hud.heldItemId();

    // 2) holding a crafting table → place it on the ground in front of you.
    if (held === 'crafting_table') {
      const p = this._groundPoint();
      if (!p) return;
      const d2 = (a.x - p.x) ** 2 + (a.z - p.z) ** 2;
      if (d2 > PLANT_RANGE ** 2) {
        this.hud.toast('🛠️ Too far', 'Walk closer to place the table', '');
        return;
      }
      if (d2 < 1.6 ** 2) { // don't drop it on your own feet (you'd get stuck)
        this.hud.toast('🛠️ Too close', 'Aim a bit further away', '');
        return;
      }
      if (this.hud.removeItem('crafting_table', 1)) this._placeTable(p.x, p.z, this._placeYawRad());
      return;
    }

    // 3) holding a wood wall → stand it up on the ground in front of you.
    if (held === 'wall') {
      const p = this._groundPoint();
      if (!p) return;
      const d2 = (a.x - p.x) ** 2 + (a.z - p.z) ** 2;
      if (d2 > PLANT_RANGE ** 2) {
        this.hud.toast('🧱 Too far', 'Walk closer to place the wall', '');
        return;
      }
      // must clear the wall's whole half-length so you don't end up inside it
      const minClear = WALL_LENGTH / 2 + COLLIDE.avatar + 0.3;
      if (d2 < minClear ** 2) {
        this.hud.toast('🧱 Too close', 'Aim further away to place the wall', '');
        return;
      }
      if (this.hud.removeItem('wall', 1)) this._placeWall(p.x, p.z, this._placeYawRad());
      return;
    }

    // 4) holding a farm base → lay it flat on the ground.
    if (held === 'farm_base') {
      const p = this._groundPoint();
      if (!p) return;
      const d2 = (a.x - p.x) ** 2 + (a.z - p.z) ** 2;
      if (d2 > PLANT_RANGE ** 2) { this.hud.toast('🟫 Too far', 'Walk closer to place the farm', ''); return; }
      if (this.hud.removeItem('farm_base', 1)) this._placeFarm(p.x, p.z, this._placeYawRad());
      return;
    }

    // 5) holding wheat seeds → plant ONLY on a farm base.
    if (held === 'wheat_seed') {
      const p = this._groundPoint();
      if (!p) return;
      if ((a.x - p.x) ** 2 + (a.z - p.z) ** 2 > PLANT_RANGE ** 2) {
        this.hud.toast('🌱 Too far', 'Walk closer', ''); return;
      }
      if (!this._onFarm(p.x, p.z)) { this.hud.toast('🌱 Need a farm', 'Plant seeds on a farm base', ''); return; }
      if (this.hud.removeItem('wheat_seed', 1)) this._plantWheat(p.x, p.z);
      return;
    }

    // 6) holding a sapling → plant it.
    if (held === 'sapling') {
      const p = this._groundPoint();
      if (!p) return;
      if ((a.x - p.x) ** 2 + (a.z - p.z) ** 2 > PLANT_RANGE ** 2) {
        this.hud.toast('🌱 Too far', 'Walk closer to plant a sapling', '');
        return;
      }
      if (this.hud.removeItem('sapling', 1)) this._plantSapling(p.x, p.z);
    }
  }

  // ---- farm base & wheat -----------------------------------------------------
  _makeFarm() {
    const g = new THREE.Group();
    const tile = new THREE.Mesh(new THREE.BoxGeometry(WALL_LENGTH, 0.2, WALL_HEIGHT), this._mat.farm);
    tile.position.y = 0.1;
    g.add(tile);
    return g;
  }

  _placeFarm(x, z, yaw) {
    const g = this._makeFarm();
    g.position.set(x, 0, z); g.rotation.y = yaw;
    this.scene.add(g);
    this._farms.push({ pos: new THREE.Vector3(x, 0, z), yaw, hx: WALL_LENGTH / 2, hz: WALL_HEIGHT / 2 });
    this.hud.toast('🟫 Placed', 'Plant wheat seeds on it', 'built');
  }

  _onFarm(x, z) {
    for (const f of this._farms) {
      const dx = x - f.pos.x, dz = z - f.pos.z;
      const c = Math.cos(f.yaw), s = Math.sin(f.yaw);
      const lx = dx * c + dz * s, lz = -dx * s + dz * c;
      if (Math.abs(lx) < f.hx && Math.abs(lz) < f.hz) return true;
    }
    return false;
  }

  _makeWheat() {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.9, 0.07), this._mat.wheat);
      b.position.set((Math.random() - 0.5) * 0.5, 0.45, (Math.random() - 0.5) * 0.5);
      b.rotation.z = (Math.random() - 0.5) * 0.3;
      g.add(b);
    }
    return g;
  }

  _plantWheat(x, z) {
    const g = this._makeWheat();
    g.position.set(x, 0, z); g.scale.setScalar(0.25);
    this.scene.add(g);
    this._crops.push({ group: g, t: 0 });
    this.hud.toast('🌱 Planted', 'Wheat is growing', 'unlock');
  }

  _updateCrops(dt) {
    for (let i = this._crops.length - 1; i >= 0; i--) {
      const c = this._crops[i];
      c.t += dt;
      const f = Math.min(1, c.t / CROP_GROW);
      c.group.scale.setScalar(0.25 + 0.75 * f);
      if (f >= 1) {
        // grown — now it's harvestable for wheat
        this._registerNode('wheat', c.group, c.group.position.x, c.group.position.z, REACH.wood);
        this._crops.splice(i, 1);
      }
    }
  }

  // A wood-coloured wall: ~3.5 tables tall and 3.3 tables long.
  _makeWall() {
    const g = new THREE.Group();
    const slab = new THREE.Mesh(new THREE.BoxGeometry(WALL_LENGTH, WALL_HEIGHT, WALL_THICK), this._mat.wood);
    slab.position.y = WALL_HEIGHT / 2;
    g.add(slab);
    return g;
  }

  _placeWall(x, z, yaw) {
    const g = this._makeWall();
    g.position.set(x, 0, z);
    g.rotation.y = yaw;
    this.scene.add(g);
    // store the rotation + half-size so collision blocks the WHOLE length
    this._walls.push({ pos: new THREE.Vector3(x, 0, z), yaw, hx: WALL_LENGTH / 2, hz: WALL_THICK / 2 });
    this.hud.toast('🧱 Placed', 'A wood wall', 'built');
  }

  // The current placement rotation, in radians (one of 9 equal steps).
  _placeYawRad() { return this._placeYaw * (Math.PI * 2 / ROT_STEPS); }

  // A see-through copy of an object, for the placement preview.
  _makeGhost(id) {
    const g = id === 'wall' ? this._makeWall()
      : id === 'crafting_table' ? this._makeWorktable()
      : id === 'farm_base' ? this._makeFarm() : null;
    if (!g) return null;
    g.traverse((o) => {
      if (o.isMesh) {
        o.material = o.material.clone();
        o.material.transparent = true;
        o.material.opacity = PLACE_GHOST_OPACITY;
        // keep depth write so the ghost's own parts don't pop through each other;
        // polygon offset stops it z-fighting whatever it sits on.
        o.material.polygonOffset = true;
        o.material.polygonOffsetFactor = -1;
      }
    });
    return g;
  }

  // Show a translucent preview of the held object on the ground under the
  // cursor, rotated by the Y-key steps, so you can aim it before clicking.
  _updatePlacementGhost() {
    const held = this.hud && !this.hud.open ? this.hud.heldItemId() : null;
    if (held !== 'wall' && held !== 'crafting_table' && held !== 'farm_base') {
      if (this._placeGhost) this._placeGhost.visible = false;
      this._attachTarget = null;
      this.hud?.setAttach(false);
      return; // keep the cached ghost so toggling a slot doesn't rebuild it
    }
    if (this._placeGhostId !== held) {
      if (this._placeGhost) { this.scene.remove(this._placeGhost); this._disposeGhost(this._placeGhost); }
      this._placeGhost = this._makeGhost(held);
      this.scene.add(this._placeGhost);
      this._placeGhostId = held;
    }
    const p = this._groundAtCursor(this._groundVec);
    if (!p) { this._placeGhost.visible = false; this._attachTarget = null; this.hud.setAttach(false); return; }
    this._placeGhost.visible = true;
    this._placeGhost.position.set(p.x, 0.02, p.z); // lifted slightly so it doesn't z-fight the ground
    this._placeGhost.rotation.y = this._placeYawRad();

    // when holding a wall near another wall's end, offer the Attach button
    if (held === 'wall') {
      this._attachTarget = this._findAttach(p);
      this.hud.setAttach(!!this._attachTarget);
    } else {
      this._attachTarget = null;
      this.hud.setAttach(false);
    }
  }

  // Find where a new wall would snap end-to-end onto the nearest placed wall:
  // same angle, butted right against whichever end is closest to the cursor.
  _findAttach(p) {
    const L = WALL_LENGTH, hx = L / 2;
    let best = null, bestD = (L * 0.9) ** 2;
    for (const wl of this._walls) {
      const dx = Math.cos(wl.yaw), dz = -Math.sin(wl.yaw); // wall's length direction
      for (const s of [-1, 1]) {
        const ex = wl.pos.x + s * hx * dx, ez = wl.pos.z + s * hx * dz; // an end
        const d = (p.x - ex) ** 2 + (p.z - ez) ** 2;
        if (d < bestD) {
          bestD = d;
          best = { x: wl.pos.x + s * L * dx, z: wl.pos.z + s * L * dz, yaw: wl.yaw };
        }
      }
    }
    return best;
  }

  // Called by the Attach button — drop a wall snapped onto the nearest wall.
  _attachWall() {
    if (!this._attachTarget) return;
    if (this.hud.removeItem('wall', 1)) {
      this._placeWall(this._attachTarget.x, this._attachTarget.z, this._attachTarget.yaw);
    }
  }

  // Free a ghost's geometry + cloned materials so they don't pile up in memory.
  _disposeGhost(g) {
    g.traverse((o) => { if (o.isMesh) { o.geometry?.dispose(); o.material?.dispose(); } });
  }

  // A simple wooden worktable: a top with a 3×3 pattern, on four legs.
  _makeWorktable() {
    const g = new THREE.Group();
    const wood = this._mat.trunk;
    const dark = new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.9 });

    const top = new THREE.Mesh(new THREE.BoxGeometry(TABLE_WIDTH, 0.18, TABLE_WIDTH), wood);
    top.position.y = 0.92;
    g.add(top);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const sq = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.3), dark);
        sq.position.set((c - 1) * 0.37, 1.03, (r - 1) * 0.37);
        g.add(sq);
      }
    }
    for (const [dx, dz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.84, 0.16), wood);
      leg.position.set(dx, 0.42, dz);
      g.add(leg);
    }
    return g;
  }

  _placeTable(x, z, yaw) {
    const g = this._makeWorktable();
    g.position.set(x, 0, z);
    g.rotation.y = yaw;
    this.scene.add(g);
    const table = { group: g, pos: new THREE.Vector3(x, 0, z) };
    g.traverse((o) => { if (o.isMesh) { o.userData.table = table; this._tableMeshes.push(o); } });
    this._tables.push(table);
    this.hud.toast('🛠️ Placed', 'Click the table to start crafting', 'built');
  }

  // ---- harvesting & digging --------------------------------------------------
  // Hold the pickaxe + left mouse: chop/mine a tree/rock you're aiming at, OR
  // dig the ground itself (sand on a beach, dirt elsewhere). Fill the timer,
  // then collect.
  _updateHarvest(dt) {
    const held = this.hud ? this.hud.heldItemId() : null;
    const holdingPick = held === 'wooden_pickaxe' || held === 'stone_pickaxe' || held === 'iron_pickaxe';
    if (this._lmbDown && holdingPick) {
      // The raycast is the costly bit and the timer is seconds long, so re-aim
      // ~12×/sec instead of every frame.
      this._castAcc += dt;
      if (this._castAcc >= 0.08) {
        this._castAcc = 0;
        this._aim = this._findDigTarget(held);
      }
    } else {
      this._aim = null;
      this._castAcc = 0.08; // re-aim immediately next time the button goes down
    }

    const t = this._aim;
    if (t && t.blocked) {
      // it's too hard for your current pickaxe (a new era is needed)
      if (this._blockedKey !== t.key) {
        this._blockedKey = t.key;
        this.hud.toast('⛏️ Too hard', `You need ${t.need === 'iron' ? 'an iron' : 'a stone'} pickaxe`, '');
      }
      this._curNode = this._curType = this._curKey = null; this._mineTime = 0;
      this.hud.setMineProgress(null);
      return;
    }
    this._blockedKey = null;

    if (t) {
      if (t.node !== this._curNode || t.type !== this._curType || t.key !== this._curKey) {
        this._curNode = t.node; this._curType = t.type; this._curKey = t.key; this._mineTime = 0;
      }
      this._mineTime += dt;
      if (this._mineTime >= t.time) {
        if (t.node) this._harvest(t.node); else this._dig(t);
        this._aim = null; this._curNode = this._curType = this._curKey = null;
        this._mineTime = 0; this._castAcc = 0.08;
        this.hud.setMineProgress(null);
      } else {
        this.hud.setMineProgress(this._mineTime / t.time, t.type);
      }
    } else if (this._curNode || this._curType || this._mineTime > 0) {
      this._curNode = this._curType = this._curKey = null; this._mineTime = 0;
      this.hud.setMineProgress(null);
    }
  }

  // What the cursor is on: a tree/rock node within reach, else a ground cell to
  // dig. Ground starts as grass→dirt; after digging down it becomes stone, and
  // stone needs a stone pickaxe. A stone pickaxe is also faster.
  _findDigTarget(held) {
    const fast = held === 'iron_pickaxe' ? IRON_FAST : held === 'stone_pickaxe' ? STONE_FAST : 0;
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    if (this._hitMeshes.length) {
      const hits = this.raycaster.intersectObjects(this._hitMeshes, false);
      if (hits.length) {
        const n = hits[0].object.userData.node;
        if (n && this._inReach(n)) return { node: n, type: n.type, key: 'node', time: Math.max(0.5, HARVEST_TIME - fast) };
      }
    }
    // dig against the floor you're standing on, so you keep aiming at the
    // ground as you sink deeper into the hole.
    const r = this.raycaster.ray;
    if (Math.abs(r.direction.y) < 1e-6) return null;
    const planeY = this.avatar.group.position.y;
    const tt = (planeY - r.origin.y) / r.direction.y;
    if (tt < 0) return null;
    const px = r.origin.x + r.direction.x * tt, pz = r.origin.z + r.direction.z * tt;
    const a = this.avatar.group.position;
    if ((a.x - px) ** 2 + (a.z - pz) ** 2 > DIG_RANGE ** 2) return null;

    if (this._nearLake(px, pz, BEACH)) {
      return { node: null, type: 'sand', key: 'sand', time: Math.max(0.3, DIG_TIME - fast) };
    }
    const cx = Math.round(px / DIG_CELL), cz = Math.round(pz / DIG_CELL);
    const key = `${cx},${cz}`;
    const depth = this._digCells.has(key) ? this._digCells.get(key).depth : 0;
    if (depth >= IRON_DEPTH) {
      if (held !== 'iron_pickaxe') return { blocked: true, key, need: 'iron' };
      return { node: null, type: 'stone', key, cx, cz, time: Math.max(0.4, HARVEST_TIME - fast) };
    }
    if (depth >= STONE_DEPTH) {
      if (held !== 'stone_pickaxe' && held !== 'iron_pickaxe') return { blocked: true, key, need: 'stone' };
      return { node: null, type: 'stone', key, cx, cz, time: Math.max(0.5, HARVEST_TIME - fast) };
    }
    return { node: null, type: 'dirt', key, cx, cz, time: Math.max(0.3, DIG_TIME - fast) };
  }

  // Dig a ground cell — sand is simple; land deepens (grass → dirt → stone) and
  // the cell keeps its dug look. The deeper you mine stone, the better the ore.
  _dig(t) {
    if (t.type === 'sand') {
      const amt = 1 + ((Math.random() * 2) | 0);
      this.hud.addItem('sand', amt);
      this.hud.toast('🏖️ Dug', `+${amt} ${this.hud.itemTag('sand')}`, 'built');
      return;
    }
    const cell = this._digCells.get(t.key) || { depth: 0, mesh: null, walls: null };
    cell.depth += 1;
    this._digCells.set(t.key, cell);
    this._updatePit(cell, t.cx, t.cz);

    if (cell.depth <= STONE_DEPTH) {
      this.hud.addItem('dirt', 1);
      let body = `+1 ${this.hud.itemTag('dirt')}`;
      if (cell.depth === 1 && Math.random() < SEED_CHANCE) {
        this.hud.addItem('wheat_seed', 1);
        body += ` · +1 ${this.hud.itemTag('wheat_seed')}`;
      }
      this.hud.toast('🟫 Dug', body, 'built');
    } else {
      this.hud.addItem('stone', 1);
      let body = `+1 ${this.hud.itemTag('stone')}`;
      const ore = this._rollOre(cell.depth);
      if (ore) { this.hud.addItem(ore, 1); body += ` · +1 ${this.hud.itemTag(ore)}`; }
      this.hud.toast('⛏️ Mined', body, 'built');
    }
  }

  // Show/refresh the pit for a dug cell: a sunken floor (dirt, turning to stone
  // once deep) plus four dirt side walls — so you've really dug DOWN into it.
  _updatePit(cell, cx, cz) {
    const x = cx * DIG_CELL, z = cz * DIG_CELL;
    const floorY = -cell.depth * DIG_STEP;
    const floorMat = cell.depth >= STONE_DEPTH ? this._mat.stonePatch : this._mat.dirtPatch;

    if (!cell.mesh) {
      cell.mesh = new THREE.Mesh(new THREE.PlaneGeometry(DIG_CELL, DIG_CELL), floorMat);
      cell.mesh.rotation.x = -Math.PI / 2;
      this.scene.add(cell.mesh);
    } else cell.mesh.material = floorMat;
    cell.mesh.position.set(x, floorY + 0.02, z);

    // rebuild the four walls of the hole
    if (cell.walls) {
      this.scene.remove(cell.walls);
      cell.walls.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    }
    const h = cell.depth * DIG_STEP, half = DIG_CELL / 2;
    const g = new THREE.Group();
    for (const [ox, oz, w, d] of [[0, -half, DIG_CELL, 0.06], [0, half, DIG_CELL, 0.06], [-half, 0, 0.06, DIG_CELL], [half, 0, 0.06, DIG_CELL]]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this._mat.dirtPatch);
      wall.position.set(ox, -h / 2, oz);
      g.add(wall);
    }
    g.position.set(x, 0, z);
    this.scene.add(g);
    cell.walls = g;
  }

  // Rarer ores the deeper you mine: iron (common) → emerald → diamond (rarest).
  _rollOre(depth) {
    const d = depth - STONE_DEPTH; // 1 on the first stone dig, grows with depth
    const diamond = Math.min(0.10, d * 0.015);
    const emerald = Math.min(0.22, d * 0.03);
    const iron = Math.min(0.55, d * 0.10);
    const r = Math.random();
    if (r < diamond) return 'diamond';
    if (r < diamond + emerald) return 'emerald';
    if (r < diamond + emerald + iron) return 'iron';
    return null;
  }

  _inReach(node) {
    const a = this.avatar.group.position;
    return (a.x - node.pos.x) ** 2 + (a.z - node.pos.z) ** 2 <= node.range ** 2;
  }

  // True if the avatar's body (a small circle) would overlap a solid thing at
  // (x, z). Loops the live lists directly so it never allocates each frame.
  _blocked(x, z) {
    const ar = COLLIDE.avatar;
    // the starting campfire at the origin
    let r = ar + COLLIDE.campfire;
    if (x * x + z * z < r * r) return true;
    for (const n of this.nodes) {
      r = ar + (n.type === 'stone' ? COLLIDE.rock : COLLIDE.tree);
      if ((x - n.pos.x) ** 2 + (z - n.pos.z) ** 2 < r * r) return true;
    }
    r = ar + COLLIDE.table;
    for (const t of this._tables) {
      if ((x - t.pos.x) ** 2 + (z - t.pos.z) ** 2 < r * r) return true;
    }
    // walls are long rectangles, not circles: rotate the point into the wall's
    // own frame and test against its half-size (so the whole length is solid).
    for (const wl of this._walls) {
      const dx = x - wl.pos.x, dz = z - wl.pos.z;
      const c = Math.cos(wl.yaw), s = Math.sin(wl.yaw);
      const lx = dx * c + dz * s;
      const lz = -dx * s + dz * c;
      // widen the thin axis a little so a fast diagonal step can't tunnel through
      if (Math.abs(lx) < wl.hx + ar && Math.abs(lz) < Math.max(wl.hz, 0.45) + ar) return true;
    }
    return false;
  }

  // Break a node: remove it, then drop 3–5 blocks (+2 saplings from a tree).
  _harvest(node) {
    this.scene.remove(node.group);
    this.nodes = this.nodes.filter((n) => n !== node);
    this._hitMeshes = this._hitMeshes.filter((m) => m.userData.node !== node);

    const amount = 3 + ((Math.random() * 3) | 0); // 3, 4 or 5
    if (node.type === 'wood') {
      this.hud.addItem('wood', amount);
      this.hud.addItem('sapling', 2);
      this.hud.toast('🌲 Chopped', `+${amount} ${this.hud.itemTag('wood')} · +2 ${this.hud.itemTag('sapling')}`, 'built');
    } else if (node.type === 'sand') {
      this.hud.addItem('sand', amount);
      this.hud.toast('🏖️ Dug', `+${amount} ${this.hud.itemTag('sand')}`, 'built');
    } else if (node.type === 'wheat') {
      const w = 1 + ((Math.random() * 2) | 0);
      this.hud.addItem('wheat', w);
      this.hud.addItem('wheat_seed', 1);
      this.hud.toast('🌾 Harvested', `+${w} ${this.hud.itemTag('wheat')} · +1 ${this.hud.itemTag('wheat_seed')}`, 'built');
    } else {
      this.hud.addItem('stone', amount);
      this.hud.toast('⛏️ Mined', `+${amount} ${this.hud.itemTag('stone')}`, 'built');
    }
  }

  // Plant a sapling that starts tiny and grows into a harvestable tree.
  _plantSapling(x, z) {
    const target = 0.8 + Math.random() * 1.1;
    const g = this._makeTree(target);
    g.position.set(x, 0, z);
    g.scale.setScalar(target * 0.12); // start tiny
    this.scene.add(g);
    this._growing.push({ group: g, t: 0, target });
    this.hud.toast('🌱 Planted', 'It will grow into a tree', 'unlock');
  }

  _updateGrowth(dt) {
    for (let i = this._growing.length - 1; i >= 0; i--) {
      const s = this._growing[i];
      s.t += dt;
      const f = Math.min(1, s.t / GROW_TIME);
      s.group.scale.setScalar(s.target * (0.12 + 0.88 * f));
      if (f >= 1) {
        // fully grown — it becomes a tree you can chop
        this._registerNode('wood', s.group, s.group.position.x, s.group.position.z, REACH.wood);
        this._growing.splice(i, 1);
      }
    }
  }

  // Arrows / WASD: up-down walk forward & back, left-right TURN (rotate the view).
  _updateMovement(dt) {
    let forward = 0, turn = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) forward += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) forward -= 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) turn += 1; // turn left
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) turn -= 1; // turn right
    if (forward !== 0 || turn !== 0) this.avatar.setControl(forward, turn);
  }

  // Smoothly-followed camera. Each frame we work out where the camera *wants*
  // to be (the "target" eye + look point), then ease the real camera toward it.
  // The easing is frame-rate independent, so a brief frame-rate dip no longer
  // shows up as a visible jump — that's what kills the "glitchy" feeling.
  _updateCamera(dt) {
    const eye = this._eye;
    this.avatar.headPosition(eye);

    // Where we WANT to look: straight from the body's yaw + the mouse glance.
    const targetYaw = this.avatar.yaw + this.lookYaw;
    const targetPitch = this.lookPitch;

    // First frame: start exactly on target (no glide-in).
    if (!this._camInit) {
      this._renderYaw = targetYaw;
      this._renderPitch = targetPitch;
      this._camInit = true;
    }

    // Smooth ONE angle pair — not two separate world points. The old code eased
    // an eye point and a look point only ~1 unit apart at different rates, so
    // the *direction between them* wobbled every frame (the "swim"). Easing a
    // single yaw/pitch can't do that. Frame-rate independent (1 - e^(-λ·dt)).
    const k = 1 - Math.exp(-20 * dt);
    let dy = targetYaw - this._renderYaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy)); // shortest way round the circle
    this._renderYaw += dy * k;
    this._renderPitch += (targetPitch - this._renderPitch) * k;

    // Camera sits EXACTLY at the eye (true first person — no positional lag),
    // and looks at a FAR point so tiny position numbers can't jitter the angle.
    const cy = Math.cos(this._renderPitch);
    this.camera.position.copy(eye);
    this.camera.lookAt(
      eye.x + Math.sin(this._renderYaw) * cy * 100,
      eye.y + Math.sin(this._renderPitch) * 100,
      eye.z + Math.cos(this._renderYaw) * cy * 100,
    );
  }

  // Render crisp at native resolution (no upscaling = no blur), capped at 2× so
  // a Retina screen doesn't pay a 4× cost. This is affordable now that the
  // forest, ground and shadows use much cheaper per-pixel shaders.
  _resolutionRatio() {
    return Math.min(window.devicePixelRatio, 2);
  }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(this._resolutionRatio());
    this.renderer.setSize(w, h);
    if (this.composer) this.composer.setSize(w, h);
  }

  // ---- main loop -------------------------------------------------------------
  start() {
    this.renderer.setAnimationLoop(() => this._frame());
  }

  _frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this._updateMovement(dt);
    const p = this.avatar.group.position;
    this.avatar.setSwimming(this._inWater(p.x, p.z));
    this.avatar.setFloor(this._floorAt(p.x, p.z));
    this.avatar.update(dt);
    this._updateHarvest(dt);
    this._updateGrowth(dt);
    this._updateCrops(dt);
    this._updatePlacementGhost();
    this.buildSystem.update(dt);
    this.economy.update(dt);
    this._updateCamera(dt);
    if (this.composer && this._postEnabled) {
      this.composer.render(dt);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
