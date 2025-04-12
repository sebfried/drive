import * as THREE from 'three';
import * as Constants from './modules/constants.js';
import Player from './modules/player.js';
import Obstacles from './modules/obstacles.js';
import Road from './modules/road.js';
import EventEmitter from './modules/eventEmitter.js';
import GameState, { States } from './modules/gameState.js';

console.log('Three.js Endless Racer starting...');

// --- Central Event Emitter ---
const eventEmitter = new EventEmitter();

// --- Game State Manager ---
const gameState = new GameState(eventEmitter);

// --- Game State (Variables that might still be needed globally) ---
let targetLaneIndex = Constants.START_LANE_INDEX; // Target lane for player input
let score = 0;
// let isGameOver = false; // Replaced by gameState

// --- UI Elements ---
const scoreElement = document.getElementById('score');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const finalScoreElement = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue background

// Camera
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, Constants.cameraYPosition * 2);
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
// Pass scene and eventEmitter to modules that need them
const player = new Player(scene); // Player doesn't need emitter currently
const road = new Road(scene);     // Road doesn't need emitter currently
const obstaclesManager = new Obstacles(scene, eventEmitter);

// --- Old Logic (Removed or Commented Out) ---
// Player Car Creation, Obstacle Management, Road Creation functions removed
// Collision check function removed

// --- Game Logic ---
function resetGame() {
    console.log('Resetting game...');
    gameOverOverlay.style.display = 'none';
    // isGameOver = false; // Use gameState
    score = 0;
    scoreElement.innerText = `Score: 0m`;

    targetLaneIndex = Constants.START_LANE_INDEX;
    player.reset();
    obstaclesManager.reset();
    road.reset();

    gameState.setState(States.RUNNING);
    clock.start();
    // Make sure animation loop isn't already running if reset is called mid-game
    // (requestAnimationFrame handles this implicitly)
    // if (!clock.running) animate(); // Or similar logic if needed
}

function triggerGameOver(obstacleType) {
    // Prevent multiple triggers
    if (gameState.is(States.GAME_OVER)) return;

    console.log(`Game Over triggered by collision with: ${obstacleType || 'unknown'}`);
    gameState.setState(States.GAME_OVER);
    finalScoreElement.innerText = `Final Score: ${Math.floor(score)}m`;
    gameOverOverlay.style.display = 'flex';
    clock.stop();
}

// --- Animation Loop ---
const clock = new THREE.Clock();

function animate() {
    // Stop loop if not running
    if (!gameState.is(States.RUNNING)) {
        // Optional: could handle PAUSED state here if added
        return;
    }

    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Increment Score
    score += Constants.SCROLL_SPEED * 60 * delta * Constants.SCORE_MULTIPLIER;
    scoreElement.innerText = `Score: ${Math.floor(score)}m`;

    // Update Road
    road.update(delta, camera.position.z);

    // Update Player
    player.update(delta, targetLaneIndex);

    // Update Obstacles (pass player bounding box for internal collision check)
    obstaclesManager.update(delta, camera.position.z, player.getBoundingBox());

    // Collision check is now handled internally by obstaclesManager.update which emits an event

    renderer.render(scene, camera);
}

// --- Event Listeners ---

// Listen for collision events from Obstacles module
eventEmitter.on('collision', (obstacleType) => {
    triggerGameOver(obstacleType);
});

// Optional: Listen for state changes to manage UI or other logic
eventEmitter.on('stateChange', ({ from, to }) => {
    console.log(`Handling state change from ${from} to ${to}`);
    // Could add pause screen logic here, etc.
});

window.addEventListener('resize', onWindowResize, false);
document.addEventListener('pointerdown', onPointerDown, false);
restartButton.addEventListener('click', resetGame);
document.addEventListener('keydown', onKeyDown, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerDown(event) {
    // Only allow input if running
    if (!gameState.is(States.RUNNING)) return;

    const clickX = event.clientX;
    const screenWidth = window.innerWidth;
    const currentLane = player.currentLaneIndex; // Get current lane from player

    if (clickX < screenWidth / 2) {
        targetLaneIndex = Math.max(0, currentLane - 1);
    } else {
        targetLaneIndex = Math.min(Constants.lanePositions.length - 1, currentLane + 1);
    }
}

function onKeyDown(event) {
    // Only allow input if running
    if (!gameState.is(States.RUNNING)) return;

    const currentLane = player.currentLaneIndex; // Get current lane from player
    switch (event.key) {
        case 'ArrowLeft':
            targetLaneIndex = Math.max(0, currentLane - 1);
            break;
        case 'ArrowRight':
            targetLaneIndex = Math.min(Constants.lanePositions.length - 1, currentLane + 1);
            break;
        // Could add pause keybind here, e.g.:
        // case 'Escape':
        //     gameState.setState(States.PAUSED); // Assuming PAUSED state exists
        //     break;
    }
}

// --- Start ---
// Initial setup complete, set state to RUNNING and start loop
gameState.setState(States.RUNNING);
animate(); 