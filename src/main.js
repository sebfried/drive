import * as THREE from 'three';

console.log('Three.js Endless Racer starting...');

// --- Constants ---
const ROAD_WIDTH = 5;
const LANE_WIDTH = ROAD_WIDTH / 4; // 2 main lanes + 2 shoulders
const ROAD_SEGMENT_LENGTH = 10;
const NUM_ROAD_SEGMENTS = 5; // Number of segments to pool for smooth scrolling
const SCROLL_SPEED = 0.05; // Adjust for desired speed

const CAR_WIDTH = LANE_WIDTH * 0.7;
const CAR_LENGTH = CAR_WIDTH * 1.8;
const CAR_HEIGHT = CAR_WIDTH * 0.6;
const START_LANE_INDEX = 2; // 0: Left shoulder, 1: Left lane, 2: Right lane, 3: Right shoulder

const OBSTACLE_SIZE = LANE_WIDTH * 0.6;
const OBSTACLE_SPAWN_INTERVAL = 1.5; // Seconds between spawns (adjust for difficulty)
const OBSTACLE_POOL_SIZE = 10;

const OBSTACLE_TYPES = {
    STATIC: 'static', // Rock/Tree on shoulder
    SLOW_CAR: 'slow_car', // Moving slower in right lane
    ONCOMING_CAR: 'oncoming_car' // Moving towards player in left lane
};
const SLOW_CAR_SPEED_FACTOR = -0.01; // Relative to scroll speed (negative = slower)
const ONCOMING_CAR_SPEED_FACTOR = -0.1; // Relative to scroll speed (larger negative = faster towards player)
const OBSTACLE_SPAWN_WEIGHTS = {
    [OBSTACLE_TYPES.STATIC]: 0.4,
    [OBSTACLE_TYPES.SLOW_CAR]: 0.3,
    [OBSTACLE_TYPES.ONCOMING_CAR]: 0.3
};

const SCORE_MULTIPLIER = 5; // Adjust how fast score increases relative to speed

// Calculate lane center X positions
const lanePositions = [
    -LANE_WIDTH * 1.5, // Left shoulder
    -LANE_WIDTH * 0.5, // Left lane
    LANE_WIDTH * 0.5,  // Right lane
    LANE_WIDTH * 1.5   // Right shoulder
];

// --- Game State ---
let playerCar = null;
let playerCarBox = new THREE.Box3(); // Bounding box for player car
let currentLaneIndex = START_LANE_INDEX;
let targetLaneIndex = START_LANE_INDEX;
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
const cameraYPosition = NUM_ROAD_SEGMENTS * ROAD_SEGMENT_LENGTH * 0.35;
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, cameraYPosition * 2);
camera.position.set(0, cameraYPosition, 5); // Move camera slightly forward to see car better
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
    const carGeometry = new THREE.BoxGeometry(CAR_WIDTH, CAR_HEIGHT, CAR_LENGTH);
    const carMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red car
    const car = new THREE.Mesh(carGeometry, carMaterial);

    // Position the car
    car.position.y = CAR_HEIGHT / 2; // Place it on the road surface
    car.position.z = cameraYPosition - ROAD_SEGMENT_LENGTH * 1.5; // Fixed position relative to camera view
    car.position.x = lanePositions[START_LANE_INDEX]; // Start in the right lane

    scene.add(car);
    // Initialize bounding box
    playerCarBox.setFromObject(car);
    return car;
}

playerCar = createPlayerCar();

// --- Obstacle Creation and Management ---
function createObstacle() {
    // Use a generic BoxGeometry initially, we'll adjust for cars during spawn
    const obstacleGeometry = new THREE.BoxGeometry(OBSTACLE_SIZE, OBSTACLE_SIZE * 1.5, OBSTACLE_SIZE);
    const obstacleMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Default: Brown
    const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);

    obstacle.visible = false;
    obstacle.userData = {
        isActive: false,
        boundingBox: new THREE.Box3(),
        type: OBSTACLE_TYPES.STATIC,
        speed: 0
    };
    scene.add(obstacle);
    return obstacle;
}

function getWeightedRandomObstacleType() {
    let sum = 0;
    const r = Math.random();
    for (const type in OBSTACLE_SPAWN_WEIGHTS) {
        sum += OBSTACLE_SPAWN_WEIGHTS[type];
        if (r <= sum) {
            return type;
        }
    }
    return OBSTACLE_TYPES.STATIC; // Fallback
}

// Initialize obstacle pool
for (let i = 0; i < OBSTACLE_POOL_SIZE; i++) {
    obstacles.push(createObstacle());
}

function spawnObstacle(delta) {
    timeSinceLastSpawn += delta;
    if (timeSinceLastSpawn < OBSTACLE_SPAWN_INTERVAL) {
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
        let obstaclePosZ = -NUM_ROAD_SEGMENTS * ROAD_SEGMENT_LENGTH + ROAD_SEGMENT_LENGTH;
        let geometryType = 'static'; // 'static' or 'car'

        switch (spawnType) {
            case OBSTACLE_TYPES.STATIC:
                spawnLaneIndex = Math.random() < 0.5 ? 0 : 3; // Shoulders only
                break;
            case OBSTACLE_TYPES.SLOW_CAR:
                spawnLaneIndex = 2; // Right lane
                obstacleSpeed = SCROLL_SPEED * SLOW_CAR_SPEED_FACTOR;
                geometryType = 'car';
                break;
            case OBSTACLE_TYPES.ONCOMING_CAR:
                spawnLaneIndex = 1; // Left lane
                obstacleSpeed = SCROLL_SPEED * ONCOMING_CAR_SPEED_FACTOR;
                obstaclePosZ = -NUM_ROAD_SEGMENTS * ROAD_SEGMENT_LENGTH * 0.6; // Spawn closer
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
                    obstacle.geometry = new THREE.BoxGeometry(CAR_WIDTH * 0.9, CAR_HEIGHT * 0.9, CAR_LENGTH * 0.9);
                    obstacle.material.color.setHex(info.type === OBSTACLE_TYPES.SLOW_CAR ? 0x0000ff : 0xffff00);
                } else { // Static
                    obstacle.geometry.dispose();
                    obstacle.geometry = new THREE.BoxGeometry(OBSTACLE_SIZE, OBSTACLE_SIZE * 1.5, OBSTACLE_SIZE);
                    obstacle.material.color.setHex(0x8B4513);
                }

                obstacle.position.x = lanePositions[info.lane];
                obstacle.position.y = (info.geometry === 'car' ? CAR_HEIGHT * 0.9 : OBSTACLE_SIZE * 1.5) / 2;
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
    const roadGeometry = new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_SEGMENT_LENGTH);
    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const roadSurface = new THREE.Mesh(roadGeometry, roadMaterial);
    roadSurface.rotation.x = -Math.PI / 2; // Rotate plane to be horizontal
    segmentGroup.add(roadSurface);

    // Lane Lines (white)
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });

    const halfLength = ROAD_SEGMENT_LENGTH / 2;

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
    const leftLinePoints = [ new THREE.Vector3(-LANE_WIDTH, 0.01, -halfLength), new THREE.Vector3(-LANE_WIDTH, 0.01, halfLength) ];
    const rightLinePoints = [ new THREE.Vector3(LANE_WIDTH, 0.01, -halfLength), new THREE.Vector3(LANE_WIDTH, 0.01, halfLength) ];
    const leftLineGeometry = new THREE.BufferGeometry().setFromPoints(leftLinePoints);
    const rightLineGeometry = new THREE.BufferGeometry().setFromPoints(rightLinePoints);
    const leftLine = new THREE.Line(leftLineGeometry, lineMaterial);
    const rightLine = new THREE.Line(rightLineGeometry, lineMaterial);
    segmentGroup.add(leftLine);
    segmentGroup.add(rightLine);

    return segmentGroup;
}

// Initialize road segments
for (let i = 0; i < NUM_ROAD_SEGMENTS; i++) {
    const segment = createRoadSegment();
    segment.position.z = -i * ROAD_SEGMENT_LENGTH + ROAD_SEGMENT_LENGTH / 2;
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
    currentLaneIndex = START_LANE_INDEX;
    targetLaneIndex = START_LANE_INDEX;
    if (playerCar) {
        playerCar.position.x = lanePositions[START_LANE_INDEX];
        playerCar.position.z = cameraYPosition - ROAD_SEGMENT_LENGTH * 1.5;
    }

    // Reset obstacles
    obstacles.forEach(obstacle => {
        obstacle.visible = false;
        obstacle.userData.isActive = false;
        // Reset geometry if needed
        if (obstacle.userData.type !== OBSTACLE_TYPES.STATIC) {
            obstacle.geometry.dispose();
            obstacle.geometry = new THREE.BoxGeometry(OBSTACLE_SIZE, OBSTACLE_SIZE * 1.5, OBSTACLE_SIZE);
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
    score += SCROLL_SPEED * 60 * delta * SCORE_MULTIPLIER;
    scoreElement.innerText = `Score: ${Math.floor(score)}m`;

    // Scroll road segments
    roadSegments.forEach(segment => {
        segment.position.z += SCROLL_SPEED * 60 * delta;
        // Increase the threshold slightly so segments disappear further down
        const recycleThreshold = camera.position.z + ROAD_SEGMENT_LENGTH * 1.5; // Increased from 1.0 to 1.5
        if (segment.position.z > recycleThreshold) {
            segment.position.z -= NUM_ROAD_SEGMENTS * ROAD_SEGMENT_LENGTH;
        }
    });

    // Update player car position and bounding box
    if (playerCar) {
        currentLaneIndex = targetLaneIndex;
        const targetX = lanePositions[currentLaneIndex];
        playerCar.position.x = THREE.MathUtils.lerp(playerCar.position.x, targetX, delta * 10);
        playerCarBox.setFromObject(playerCar);
    }

    // Spawn and update obstacles
    spawnObstacle(delta);

    obstacles.forEach(obstacle => {
        if (!obstacle.userData.isActive) return;

        // Move obstacle: Apply base scroll speed, then add object-specific speed
        let actualSpeed = SCROLL_SPEED + obstacle.userData.speed;
        // Oncoming cars move towards the player (negative Z) independent of scroll speed
        if (obstacle.userData.type === OBSTACLE_TYPES.ONCOMING_CAR) {
             // Define a fixed world speed for oncoming cars
             actualSpeed = -0.1; // Adjust this speed as needed
        }

        obstacle.position.z += actualSpeed * 60 * delta;

        // Update obstacle bounding box
        obstacle.userData.boundingBox.setFromObject(obstacle);

        // Check for recycling
        const recycleThreshold = camera.position.z + ROAD_SEGMENT_LENGTH * 2;
        // Adjusted despawn threshold to catch fast oncoming cars sooner
        const despawnThreshold = camera.position.z - (NUM_ROAD_SEGMENTS * ROAD_SEGMENT_LENGTH);

        if (obstacle.position.z > recycleThreshold || obstacle.position.z < despawnThreshold) {
            obstacle.visible = false;
            obstacle.userData.isActive = false;
             // Reset geometry to default static type for pool re-use
             if (obstacle.userData.type !== OBSTACLE_TYPES.STATIC) {
                 obstacle.geometry.dispose();
                 obstacle.geometry = new THREE.BoxGeometry(OBSTACLE_SIZE, OBSTACLE_SIZE * 1.5, OBSTACLE_SIZE);
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
        targetLaneIndex = Math.min(lanePositions.length - 1, currentLaneIndex + 1);
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
            targetLaneIndex = Math.min(lanePositions.length - 1, currentLaneIndex + 1);
            break;
    }
}

// --- Start ---
animate(); 