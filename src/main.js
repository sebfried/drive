import * as THREE from 'three';
import * as Constants from './modules/constants.js';

console.log('Three.js Endless Racer starting...');

// --- Constants ---
// const ROAD_WIDTH = 5; ... (All constants until lanePositions removed)

// --- Game State ---
let playerCar = null;
let playerCarBox = new THREE.Box3(); // Bounding box for player car
let currentLaneIndex = Constants.START_LANE_INDEX;
let targetLaneIndex = Constants.START_LANE_INDEX;
let score = 0;
let timeSinceLastSpawn = 0;
let isGameOver = false;

// --- Game Objects ---
const roadSegments = [];
const obstacles = [];
const scoreElement = document.getElementById('score');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const finalScoreElement = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue background

// Camera (Bird's-eye view)
const aspect = window.innerWidth / window.innerHeight;
//const cameraYPosition = NUM_ROAD_SEGMENTS * ROAD_SEGMENT_LENGTH * 0.35; // Use Constants.cameraYPosition directly
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, Constants.cameraYPosition * 2);
camera.position.set(0, Constants.cameraYPosition, 5); // Move camera slightly forward to see car better
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

// --- Player Car Creation ---
function createPlayerCar() {
    const carGeometry = new THREE.BoxGeometry(Constants.CAR_WIDTH, Constants.CAR_HEIGHT, Constants.CAR_LENGTH);
    const carMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red car
    const car = new THREE.Mesh(carGeometry, carMaterial);

    // Position the car
    car.position.y = Constants.CAR_HEIGHT / 2; // Place it on the road surface
    car.position.z = Constants.cameraYPosition - Constants.ROAD_SEGMENT_LENGTH * 1.5; // Fixed position relative to camera view
    car.position.x = Constants.lanePositions[Constants.START_LANE_INDEX]; // Start in the right lane

    scene.add(car);
    // Initialize bounding box
    playerCarBox.setFromObject(car);
    return car;
}

playerCar = createPlayerCar();

// --- Obstacle Creation and Management ---
function createObstacle() {
    // Use a generic BoxGeometry initially, we'll adjust for cars during spawn
    const obstacleGeometry = new THREE.BoxGeometry(Constants.OBSTACLE_SIZE, Constants.OBSTACLE_SIZE * 1.5, Constants.OBSTACLE_SIZE);
    const obstacleMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Default: Brown
    const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);

    obstacle.visible = false;
    obstacle.userData = {
        isActive: false,
        boundingBox: new THREE.Box3(),
        type: Constants.OBSTACLE_TYPES.STATIC,
        speed: 0
    };
    scene.add(obstacle);
    return obstacle;
}

function getWeightedRandomObstacleType() {
    let sum = 0;
    const r = Math.random();
    for (const type in Constants.OBSTACLE_SPAWN_WEIGHTS) {
        sum += Constants.OBSTACLE_SPAWN_WEIGHTS[type];
        if (r <= sum) {
            return type;
        }
    }
    return Constants.OBSTACLE_TYPES.STATIC; // Fallback
}

// Initialize obstacle pool
for (let i = 0; i < Constants.OBSTACLE_POOL_SIZE; i++) {
    obstacles.push(createObstacle());
}

function spawnObstacle(delta) {
    timeSinceLastSpawn += delta;
    if (timeSinceLastSpawn < Constants.OBSTACLE_SPAWN_INTERVAL) {
        return;
    }
    timeSinceLastSpawn = 0;

    // --- Refined Spawning Logic (Task #10) ---
    const maxObstaclesThisWave = 2; // Spawn up to 2 obstacles at once
    const obstaclesToSpawnInfo = [];
    let potentialLaneOccupancy = [false, false, false, false]; // Track occupied lanes [0, 1, 2, 3]

    // 1. Determine potential obstacles and lanes
    for (let i = 0; i < maxObstaclesThisWave; i++) {
        const spawnType = getWeightedRandomObstacleType();
        let spawnLaneIndex;
        let obstacleSpeed = 0;
        let obstaclePosZ = -Constants.NUM_ROAD_SEGMENTS * Constants.ROAD_SEGMENT_LENGTH + Constants.ROAD_SEGMENT_LENGTH;
        let geometryType = 'static'; // 'static' or 'car'

        switch (spawnType) {
            case Constants.OBSTACLE_TYPES.STATIC:
                spawnLaneIndex = Math.random() < 0.5 ? 0 : 3; // Shoulders only
                break;
            case Constants.OBSTACLE_TYPES.SLOW_CAR:
                spawnLaneIndex = 2; // Right lane
                obstacleSpeed = Constants.SCROLL_SPEED * Constants.SLOW_CAR_SPEED_FACTOR;
                geometryType = 'car';
                break;
            case Constants.OBSTACLE_TYPES.ONCOMING_CAR:
                spawnLaneIndex = 1; // Left lane
                // Use the fixed speed constant now
                obstacleSpeed = Constants.ONCOMING_CAR_FIXED_SPEED; // Use fixed speed
                obstaclePosZ = -Constants.NUM_ROAD_SEGMENTS * Constants.ROAD_SEGMENT_LENGTH * 0.6; // Spawn closer
                geometryType = 'car';
                break;
        }

        // Avoid spawning two obstacles in the same lane in the same wave
        if (!potentialLaneOccupancy[spawnLaneIndex]) {
            obstaclesToSpawnInfo.push({ type: spawnType, lane: spawnLaneIndex, speed: obstacleSpeed, posZ: obstaclePosZ, geometry: geometryType });
            potentialLaneOccupancy[spawnLaneIndex] = true;
        }
    }

    // 2. Check if at least one lane is free
    let clearLaneExists = potentialLaneOccupancy.includes(false);

    // 3. If no clear lane, remove one potential obstacle (simplest guarantee)
    if (!clearLaneExists && obstaclesToSpawnInfo.length > 0) {
        const removedInfo = obstaclesToSpawnInfo.pop(); // Remove the last added potential obstacle
        potentialLaneOccupancy[removedInfo.lane] = false; // Mark its lane as free again
        clearLaneExists = true; // Now a path is guaranteed (unless we tried to spawn > 4 initially)
    }

    // 4. Spawn the confirmed obstacles
    if (clearLaneExists) {
        obstaclesToSpawnInfo.forEach(info => {
            const obstacle = obstacles.find(obs => !obs.userData.isActive);
            if (obstacle) {
                obstacle.userData.type = info.type;
                obstacle.userData.speed = info.speed;

                // Set Geometry and Color based on type
                if (info.geometry === 'car') {
                    obstacle.geometry.dispose(); // Dispose old geometry
                    obstacle.geometry = new THREE.BoxGeometry(Constants.CAR_WIDTH * 0.9, Constants.CAR_HEIGHT * 0.9, Constants.CAR_LENGTH * 0.9);
                    obstacle.material.color.setHex(info.type === Constants.OBSTACLE_TYPES.SLOW_CAR ? 0x0000ff : 0xffff00);
                } else { // Static
                    obstacle.geometry.dispose();
                    obstacle.geometry = new THREE.BoxGeometry(Constants.OBSTACLE_SIZE, Constants.OBSTACLE_SIZE * 1.5, Constants.OBSTACLE_SIZE);
                    obstacle.material.color.setHex(0x8B4513);
                }

                obstacle.position.x = Constants.lanePositions[info.lane];
                obstacle.position.y = (info.geometry === 'car' ? Constants.CAR_HEIGHT * 0.9 : Constants.OBSTACLE_SIZE * 1.5) / 2;
                obstacle.position.z = info.posZ;

                obstacle.visible = true;
                obstacle.userData.isActive = true;
            } else {
                 console.warn('Obstacle pool exhausted during confirmed spawn!');
            }
        });
    }
}

// --- Collision Detection ---
function checkCollision(box1, box2) {
    return box1.intersectsBox(box2);
}

// --- Road Creation ---
function createRoadSegment() {
    const segmentGroup = new THREE.Group();

    // Road Surface (dark grey)
    const roadGeometry = new THREE.PlaneGeometry(Constants.ROAD_WIDTH, Constants.ROAD_SEGMENT_LENGTH);
    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const roadSurface = new THREE.Mesh(roadGeometry, roadMaterial);
    roadSurface.rotation.x = -Math.PI / 2; // Rotate plane to be horizontal
    segmentGroup.add(roadSurface);

    // Lane Lines (white)
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });

    const halfLength = Constants.ROAD_SEGMENT_LENGTH / 2;

    // Center dashed line
    const centerLinePoints = [];
    for (let z = -halfLength; z <= halfLength; z += 1) {
        if (Math.floor(z) % 2 === 0) {
             centerLinePoints.push(new THREE.Vector3(0, 0.01, z));
             centerLinePoints.push(new THREE.Vector3(0, 0.01, z + 0.5));
        }
    }
    const centerLineGeometry = new THREE.BufferGeometry().setFromPoints(centerLinePoints);
    const centerLine = new THREE.LineSegments(centerLineGeometry, lineMaterial);
    segmentGroup.add(centerLine);

    // Outer solid lines
    const leftLinePoints = [ new THREE.Vector3(-Constants.LANE_WIDTH, 0.01, -halfLength), new THREE.Vector3(-Constants.LANE_WIDTH, 0.01, halfLength) ];
    const rightLinePoints = [ new THREE.Vector3(Constants.LANE_WIDTH, 0.01, -halfLength), new THREE.Vector3(Constants.LANE_WIDTH, 0.01, halfLength) ];
    const leftLineGeometry = new THREE.BufferGeometry().setFromPoints(leftLinePoints);
    const rightLineGeometry = new THREE.BufferGeometry().setFromPoints(rightLinePoints);
    const leftLine = new THREE.Line(leftLineGeometry, lineMaterial);
    const rightLine = new THREE.Line(rightLineGeometry, lineMaterial);
    segmentGroup.add(leftLine);
    segmentGroup.add(rightLine);

    return segmentGroup;
}

// Initialize road segments
for (let i = 0; i < Constants.NUM_ROAD_SEGMENTS; i++) {
    const segment = createRoadSegment();
    segment.position.z = -i * Constants.ROAD_SEGMENT_LENGTH + Constants.ROAD_SEGMENT_LENGTH / 2;
    scene.add(segment);
    roadSegments.push(segment);
}

// --- Game Logic ---
function resetGame() {
    gameOverOverlay.style.display = 'none';
    isGameOver = false;
    score = 0;
    scoreElement.innerText = `Score: 0m`;

    // Reset car position
    currentLaneIndex = Constants.START_LANE_INDEX;
    targetLaneIndex = Constants.START_LANE_INDEX;
    if (playerCar) {
        playerCar.position.x = Constants.lanePositions[Constants.START_LANE_INDEX];
        playerCar.position.z = Constants.cameraYPosition - Constants.ROAD_SEGMENT_LENGTH * 1.5;
    }

    // Reset obstacles
    obstacles.forEach(obstacle => {
        obstacle.visible = false;
        obstacle.userData.isActive = false;
        // Reset geometry if needed
        if (obstacle.userData.type !== Constants.OBSTACLE_TYPES.STATIC) {
            obstacle.geometry.dispose();
            obstacle.geometry = new THREE.BoxGeometry(Constants.OBSTACLE_SIZE, Constants.OBSTACLE_SIZE * 1.5, Constants.OBSTACLE_SIZE);
        }
    });

    timeSinceLastSpawn = 0;
    clock.start();
    animate();
}

function triggerGameOver() {
    isGameOver = true;
    finalScoreElement.innerText = `Final Score: ${Math.floor(score)}m`;
    gameOverOverlay.style.display = 'flex';
    clock.stop();
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

    // Scroll road segments
    roadSegments.forEach(segment => {
        segment.position.z += Constants.SCROLL_SPEED * 60 * delta;
        // Increase the threshold slightly so segments disappear further down
        const recycleThreshold = camera.position.z + Constants.ROAD_SEGMENT_LENGTH * 1.5; // Increased from 1.0 to 1.5
        if (segment.position.z > recycleThreshold) {
            segment.position.z -= Constants.NUM_ROAD_SEGMENTS * Constants.ROAD_SEGMENT_LENGTH;
        }
    });

    // Update player car position and bounding box
    if (playerCar) {
        currentLaneIndex = targetLaneIndex;
        const targetX = Constants.lanePositions[currentLaneIndex];
        playerCar.position.x = THREE.MathUtils.lerp(playerCar.position.x, targetX, delta * 10);
        playerCarBox.setFromObject(playerCar);
    }

    // Spawn and update obstacles
    spawnObstacle(delta);

    obstacles.forEach(obstacle => {
        if (!obstacle.userData.isActive) return;

        // Move obstacle: Apply base scroll speed, then add object-specific speed
        let actualSpeed = Constants.SCROLL_SPEED + obstacle.userData.speed;
        // Oncoming cars move towards the player (negative Z) independent of scroll speed
        if (obstacle.userData.type === Constants.OBSTACLE_TYPES.ONCOMING_CAR) {
             // Use the fixed speed constant now
             actualSpeed = Constants.ONCOMING_CAR_FIXED_SPEED; // Adjust this speed as needed
        }

        obstacle.position.z += actualSpeed * 60 * delta;

        // Update obstacle bounding box
        obstacle.userData.boundingBox.setFromObject(obstacle);

        // Check for recycling
        const recycleThreshold = camera.position.z + Constants.ROAD_SEGMENT_LENGTH * 2;
        // Adjusted despawn threshold to catch fast oncoming cars sooner
        const despawnThreshold = camera.position.z - (Constants.NUM_ROAD_SEGMENTS * Constants.ROAD_SEGMENT_LENGTH);

        if (obstacle.position.z > recycleThreshold || obstacle.position.z < despawnThreshold) {
            obstacle.visible = false;
            obstacle.userData.isActive = false;
             // Reset geometry to default static type for pool re-use
             if (obstacle.userData.type !== Constants.OBSTACLE_TYPES.STATIC) {
                 obstacle.geometry.dispose();
                 obstacle.geometry = new THREE.BoxGeometry(Constants.OBSTACLE_SIZE, Constants.OBSTACLE_SIZE * 1.5, Constants.OBSTACLE_SIZE);
             }
        }

        // Check for Collision
        if (playerCar && checkCollision(playerCarBox, obstacle.userData.boundingBox)) {
            console.log('Collision Detected with type:', obstacle.userData.type);
            triggerGameOver();
            return;
        }
    });

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

function onPointerDown(event) {
    const clickX = event.clientX;
    const screenWidth = window.innerWidth;

    if (clickX < screenWidth / 2) {
        // Clicked/Tapped Left
        targetLaneIndex = Math.max(0, currentLaneIndex - 1);
    } else {
        // Clicked/Tapped Right
        targetLaneIndex = Math.min(Constants.lanePositions.length - 1, currentLaneIndex + 1);
    }
}

// Handle keyboard input for lane switching
function onKeyDown(event) {
    if (isGameOver) return; // Ignore input if game is over

    switch (event.key) {
        case 'ArrowLeft':
            targetLaneIndex = Math.max(0, currentLaneIndex - 1);
            break;
        case 'ArrowRight':
            targetLaneIndex = Math.min(Constants.lanePositions.length - 1, currentLaneIndex + 1);
            break;
    }
}

// --- Start ---
animate(); 