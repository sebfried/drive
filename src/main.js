import * as THREE from 'three';
import * as Constants from './modules/constants.js';
import Player from './modules/player.js';
import Obstacles from './modules/obstacles.js';
import Road from './modules/road.js';
import EventEmitter from './modules/eventEmitter.js';
import GameState, { States } from './modules/gameState.js';
import assetManager from './modules/assetManager.js'; // Import Asset Manager
import difficultyManager from './modules/difficultyManager.js'; // Import Difficulty Manager
import { AllModelAssets, PlayerCarModels } from './config/models.config.js'; // Import model list and PlayerCarModels

console.log('Three.js Endless Racer starting...');

// --- Central Event Emitter ---
const eventEmitter = new EventEmitter();

// --- Game State Manager ---
const gameState = new GameState(eventEmitter);

// --- Game State Variables ---
let targetLaneIndex = Constants.START_LANE_INDEX;
let score = 0;
let touchStartY = 0;
let touchEndY = 0;

// --- UI Elements ---
const scoreElement = document.getElementById('score');
const gearElement = document.getElementById('gearDisplay'); // Get gear display element
const difficultyElement = document.getElementById('difficultyDisplay'); // Get difficulty display element
const gameOverOverlay = document.getElementById('gameOverOverlay');
const finalScoreElement = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');
const loadingOverlay = document.getElementById('loadingOverlay'); // Add Loading Overlay

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);

// Camera
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, Constants.cameraYPosition * 2);

// Calculate initial player Z position (where the player mesh is placed)
// Note: Player Y position is 0, X depends on start lane
const initialPlayerZ = Constants.cameraYPosition - Constants.ROAD_SEGMENT_LENGTH * 1.5;

// Position camera relative to player start
camera.position.set(
    0, // Centered horizontally
    Constants.CAMERA_OFFSET_Y, // Height above player
    initialPlayerZ + Constants.CAMERA_OFFSET_Z // Z position behind player
);

// Make camera look slightly ahead of the player's start position
camera.lookAt(
    0, // Look centered horizontally
    0, // Look at road level
    initialPlayerZ - Constants.CAMERA_LOOKAT_OFFSET_Z // Look ahead of player
);

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

// --- Core Modules (Declare placeholder) ---
let player = null;
let road = null;
let obstaclesManager = null;

// --- Game Logic ---
function resetGame() {
    // Ensure modules are initialized before resetting
    if (!player || !road || !obstaclesManager || !gameState) {
        console.error('Cannot reset game before initialization is complete.');
        return;
    }
    console.log('Resetting game...');
    gameOverOverlay.style.display = 'none';
    score = 0;
    scoreElement.innerText = `Score: 0m`;

    targetLaneIndex = Constants.START_LANE_INDEX;
    player.reset();
    obstaclesManager.reset();
    road.reset();
    difficultyManager.reset(); // Reset difficulty

    gameState.setState(States.RUNNING);
    clock.start();
    animate(); // Restart the animation loop
}

function triggerGameOver(obstacleType) {
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
    if (!gameState.is(States.RUNNING)) {
        return;
    }
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Calculate scroll speed based on player gear
    const gearMultiplier = 1 + (player.currentGear - 1) * Constants.GEAR_SPEED_INCREMENT;

    // Apply lane change boost if active
    const laneChangeBoost = player.isChangingLanes ? Constants.LANE_CHANGE_SPEED_BOOST_FACTOR : 1.0;

    const currentScrollSpeed = Constants.SCROLL_SPEED * gearMultiplier * laneChangeBoost;

    // Update score based on base speed + bonus for gear
    const scoreIncrease = Constants.SCROLL_SPEED * (1 + (player.currentGear - 1) * Constants.GEAR_SPEED_INCREMENT * 0.5) * 60 * delta * Constants.SCORE_MULTIPLIER; // Less score bonus than speed bonus
    score += scoreIncrease;
    scoreElement.innerText = `Score: ${Math.floor(score)}m`;
    difficultyManager.updateScore(score); // Update difficulty based on score
    gearElement.innerText = `Gear: ${player.currentGear}`; // Update gear display

    // Update difficulty display
    const currentDifficultyParams = difficultyManager.getCurrentParams();
    difficultyElement.innerText = `Level: ${currentDifficultyParams.level} (${currentDifficultyParams.name})`;

    // Update modules with current dynamic speed
    road.update(delta, camera.position.z, currentScrollSpeed); // Pass current speed
    player.update(delta, targetLaneIndex);
    obstaclesManager.update(delta, camera.position.z, player, currentScrollSpeed); // Pass player object and current speed

    renderer.render(scene, camera);
}

// --- Event Listeners ---
eventEmitter.on('collision', triggerGameOver);
eventEmitter.on('stateChange', ({ from, to }) => {
    console.log(`Handling state change from ${from} to ${to}`);
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
        case 'a': // Optional WASD/VIM keys
            targetLaneIndex = Math.max(0, currentLane - 1);
            break;
        case 'ArrowRight':
        case 'd': // Optional WASD/VIM keys
            targetLaneIndex = Math.min(Constants.lanePositions.length - 1, currentLane + 1);
            break;
        case 'ArrowUp':
        case 'w': // Optional WASD/VIM keys
            player?.shiftGearUp();
            break;
        case 'ArrowDown':
        case 's': // Optional WASD/VIM keys
            player?.shiftGearDown();
            break;
        // Could add pause keybind here, e.g.:
        // case 'Escape':
        //     gameState.setState(States.PAUSED); // Assuming PAUSED state exists
        //     break;
    }
}

// --- Touch Input Handling ---
function onTouchStart(event) {
    if (!gameState.is(States.RUNNING)) return;
    // Prevent default browser actions like scrolling
    // event.preventDefault(); // Be cautious with this, might interfere with other gestures
    touchStartY = event.touches[0].clientY;
}

function onTouchEnd(event) {
    if (!gameState.is(States.RUNNING) || touchStartY === 0) return;

    touchEndY = event.changedTouches[0].clientY;
    const swipeDistanceY = touchStartY - touchEndY; // Positive for swipe up, negative for swipe down
    const swipeThreshold = 50; // Minimum pixels for a swipe

    // Basic vertical swipe detection (ignores horizontal movement for simplicity)
    if (Math.abs(swipeDistanceY) > swipeThreshold) {
        if (swipeDistanceY > 0) { // Swipe Up
            player?.shiftGearUp();
        } else { // Swipe Down
            player?.shiftGearDown();
        }
    }

    // Reset touch start Y
    touchStartY = 0;
}

document.addEventListener('touchstart', onTouchStart, { passive: true }); // Use passive: true if preventDefault is not strictly needed
document.addEventListener('touchend', onTouchEnd, false);

// --- Initialization Function ---
async function initializeGame() {
    console.log('Initializing game and preloading assets...');
    loadingOverlay.style.display = 'flex'; // Show loading screen

    try {
        // Use the list from the config file
        const assetsToPreload = AllModelAssets; // Use the imported list

        console.log(`Preloading ${assetsToPreload.length} assets defined in config...`);

        // If no assets defined yet, resolve immediately
        if (assetsToPreload.length === 0) {
             console.log('No assets defined for preloading.');
        }
         await assetManager.preload(assetsToPreload);

        console.log('Asset preloading complete. Initializing modules...');

        // Now instantiate modules after assets are ready
        // Randomly select player car type
        const availableCarTypes = Object.keys(PlayerCarModels);
        const randomCarIndex = Math.floor(Math.random() * availableCarTypes.length);
        const randomCarType = availableCarTypes[randomCarIndex];
        console.log(`Selected player car: ${randomCarType}`);

        // Specify car type if needed, otherwise defaults to 'orange' in Player constructor
        player = new Player(scene, randomCarType);
        road = new Road(scene);
        obstaclesManager = new Obstacles(scene, eventEmitter);

        loadingOverlay.style.display = 'none'; // Hide loading screen
        console.log('Game initialization complete. Starting game loop.');
        gameState.setState(States.RUNNING);
        animate(); // Start the game loop

    } catch (error) {
        console.error('Initialization failed:', error);
        loadingOverlay.innerText = 'Error loading assets. Please refresh.';
        // Optionally display a more user-friendly error message
    }
}

// --- Start Game Initialization ---
initializeGame(); 