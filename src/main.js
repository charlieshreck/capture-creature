import * as THREE from 'three';
import { buildWorld } from './world.js';
import { buildPlayer } from './player.js';
import { setupControls } from './controls.js';

const canvas = document.getElementById('game');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 40, 120);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);

buildWorld(scene);
const player = buildPlayer(scene);
const controls = setupControls(canvas, camera, player);

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  controls.update(dt);
  player.update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
