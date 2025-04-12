import * as THREE from 'three';
import * as Constants from './modules/constants.js';
import Player from './modules/player.js';
import Obstacles from './modules/obstacles.js';
import Road from './modules/road.js';

console.log('Three.js Endless Racer starting...');

// --- Constants ---
// const ROAD_WIDTH = 5; ... (All constants until lanePositions removed)

// --- Game State ---
// let playerCar = null; // Managed by Player class
// let playerCarBox = new THREE.Box3(); // Managed by Player class
let currentLaneIndex = Constants.START_LANE_INDEX; // Still needed for input handling target
let targetLaneIndex = Constants.START_LANE_INDEX;
let score = 0;
let timeSinceLastSpawn = 0; // Managed by Obstacles class
let isGameOver = false;

// --- Game Objects ---
// const roadSegments = []; // Managed by Road class
// const obstacles = []; // Managed by Obstacles class
const scoreElement = document.getElementById('score');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const finalScoreElement = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue background

// Camera
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, Constants.cameraYPosition * 2);
camera.position.set(0, Constants.cameraYPosition, 5);
camera.lookAt(0, 0, 0);
scene.add(camera);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// --- Instantiate Core Modules ---
const player = new Player(scene);
const road = new Road(scene);
const obstaclesManager = new Obstacles(scene);

// --- Player Car Creation --- (Moved to Player class)
// function createPlayerCar() { ... }
// playerCar = createPlayerCar(); // Instantiated above

// --- Obstacle Creation and Management --- (Moved to Obstacles class)
// function createObstacle() { ... }
// function getWeightedRandomObstacleType() { ... }
// for (let i = 0; i < Constants.OBSTACLE_POOL_SIZE; i++) { ... }
// function spawnObstacle(delta) { ... }

// --- Collision Detection --- (Moved to Obstacles class method)
// function checkCollision(box1, box2) { ... }

// --- Road Creation --- (Moved to Road class)
// function createRoadSegment() { ... }
// for (let i = 0; i < Constants.NUM_ROAD_SEGMENTS; i++) { ... }

// --- Game Logic ---
function resetGame() {
    gameOverOverlay.style.display = 'none';
    isGameOver = false;
    score = 0;
    scoreElement.innerText = `Score: 0m`;

    // Reset player state
    targetLaneIndex = Constants.START_LANE_INDEX;
    // currentLaneIndex will be updated by player.update()
    player.reset();

    // Reset obstacle state
    obstaclesManager.reset();

    // Reset road state (optional, depends on implementation)
    road.reset();

    // timeSinceLastSpawn = 0; // Reset within obstaclesManager.reset()
    clock.start(); // Restart clock
    animate(); // Restart animation loop
}

function triggerGameOver() {
    isGameOver = true;
    finalScoreElement.innerText = `Final Score: ${Math.floor(score)}m`;
    gameOverOverlay.style.display = 'flex';
    clock.stop(); // Stop the clock
}

// --- Animation Loop ---
const clock = new THREE.Clock();

function animate() {
    if (isGameOver) return;
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Increment Score
    score += Constants.SCROLL_SPEED * 60 * delta * Constants.SCORE_MULTIPLIER;
    scoreElement.innerText = `Score: ${Math.floor(score)}m`;

    // Update Road
    road.update(delta, camera.position.z);

    // Update Player
    // currentLaneIndex is updated inside player.update based on targetLaneIndex
    player.update(delta, targetLaneIndex);
    currentLaneIndex = player.currentLaneIndex; // Update main scope variable if needed elsewhere

    // Update Obstacles
    obstaclesManager.update(delta, camera.position.z);

    // Check for Collision
    if (obstaclesManager.checkCollision(player.getBoundingBox())) {
        triggerGameOver();
        return; // Important: Stop this frame if game over
    }

    renderer.render(scene, camera);
}

// --- Event Listeners ---
window.addEventListener('resize', onWindowResize, false);
document.addEventListener('pointerdown', onPointerDown, false);
restartButton.addEventListener('click', resetGame);
document.addEventListener('keydown', onKeyDown, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Input handlers now just update the targetLaneIndex
function onPointerDown(event) {
    if (isGameOver) return;
    const clickX = event.clientX;
    const screenWidth = window.innerWidth;

    if (clickX < screenWidth / 2) {
        targetLaneIndex = Math.max(0, player.currentLaneIndex - 1); // Use player's current lane
    } else {
        targetLaneIndex = Math.min(Constants.lanePositions.length - 1, player.currentLaneIndex + 1);
    }
}

function onKeyDown(event) {
    if (isGameOver) return; // Ignore input if game is over

    switch (event.key) {
        case 'ArrowLeft':
            targetLaneIndex = Math.max(0, player.currentLaneIndex - 1); // Use player's current lane
            break;
        case 'ArrowRight':
            targetLaneIndex = Math.min(Constants.lanePositions.length - 1, player.currentLaneIndex + 1);
            break;
    }
}

// --- Start ---
animate(); 