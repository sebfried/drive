import * as THREE from 'three';
import * as Constants from './constants.js';
import assetManager from './assetManager.js'; // Import asset manager
// import EventEmitter from './eventEmitter.js'; // Assuming emitter is passed in

/**
 * @class Obstacles
 * Manages the creation, pooling, movement, and collision of obstacles.
 */
export default class Obstacles {
    /**
     * Creates an Obstacles manager instance.
     * @param {THREE.Scene} scene - The scene to add obstacle meshes to.
     * @param {EventEmitter} eventEmitter - The central event emitter.
     */
    constructor(scene, eventEmitter) {
        /** @type {THREE.Scene} Reference to the main scene. */
        this.scene = scene;
        /** @type {EventEmitter} Reference to the event emitter. */
        this.emitter = eventEmitter;
        /** @type {THREE.Mesh[]} Pool of obstacle objects. */
        this.pool = [];
        /** @type {number} Time since the last obstacle spawn attempt. */
        this.timeSinceLastSpawn = 0;

        this._initializePool();
    }

    /**
     * Creates the initial pool of obstacle objects.
     * @private
     */
    _initializePool() {
        for (let i = 0; i < Constants.OBSTACLE_POOL_SIZE; i++) {
            this.pool.push(this._createSingleObstacle());
        }
    }

    /**
     * Creates a single obstacle mesh with default properties.
     * @private
     * @returns {THREE.Mesh}
     */
    _createSingleObstacle() {
        // Placeholder: Log intent to load model later based on type
        console.log('Obstacles: Intending to load model from cache using assetManager.getAsset(...)');
        // This logic will become more complex when loading different models per type
        // const modelUrl = determineModelUrlBasedOnSomeLogic();
        // const obstacleModel = assetManager.getAsset(modelUrl);
        // const obstacle = obstacleModel.clone();

        // Keep using BoxGeometry for now
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
        this.scene.add(obstacle);
        return obstacle;
    }

    /**
     * Selects a random obstacle type based on defined weights.
     * @private
     * @returns {string} Obstacle type (e.g., 'static', 'slow_car').
     */
    _getWeightedRandomObstacleType() {
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

    /**
     * Handles the spawning logic for obstacles.
     * @param {number} delta - Time delta since last frame.
     */
    _spawnObstacle(delta) {
        this.timeSinceLastSpawn += delta;
        if (this.timeSinceLastSpawn < Constants.OBSTACLE_SPAWN_INTERVAL) {
            return;
        }
        this.timeSinceLastSpawn = 0;

        const maxObstaclesThisWave = 2;
        const obstaclesToSpawnInfo = [];
        let potentialLaneOccupancy = [false, false, false, false];

        for (let i = 0; i < maxObstaclesThisWave; i++) {
            const spawnType = this._getWeightedRandomObstacleType();
            let spawnLaneIndex;
            let obstacleSpeed = 0;
            let obstaclePosZ = -Constants.NUM_ROAD_SEGMENTS * Constants.ROAD_SEGMENT_LENGTH + Constants.ROAD_SEGMENT_LENGTH;
            let geometryType = 'static';

            switch (spawnType) {
                case Constants.OBSTACLE_TYPES.STATIC:
                    spawnLaneIndex = Math.random() < 0.5 ? 0 : 3;
                    break;
                case Constants.OBSTACLE_TYPES.SLOW_CAR:
                    spawnLaneIndex = 2;
                    obstacleSpeed = Constants.SCROLL_SPEED * Constants.SLOW_CAR_SPEED_FACTOR;
                    geometryType = 'car';
                    break;
                case Constants.OBSTACLE_TYPES.ONCOMING_CAR:
                    spawnLaneIndex = 1;
                    obstacleSpeed = Constants.ONCOMING_CAR_FIXED_SPEED;
                    obstaclePosZ = -Constants.NUM_ROAD_SEGMENTS * Constants.ROAD_SEGMENT_LENGTH * 0.6;
                    geometryType = 'car';
                    break;
            }

            if (!potentialLaneOccupancy[spawnLaneIndex]) {
                obstaclesToSpawnInfo.push({ type: spawnType, lane: spawnLaneIndex, speed: obstacleSpeed, posZ: obstaclePosZ, geometry: geometryType });
                potentialLaneOccupancy[spawnLaneIndex] = true;
            }
        }

        let clearLaneExists = potentialLaneOccupancy.includes(false);
        if (!clearLaneExists && obstaclesToSpawnInfo.length > 0) {
            const removedInfo = obstaclesToSpawnInfo.pop();
            potentialLaneOccupancy[removedInfo.lane] = false;
            clearLaneExists = true;
        }

        if (clearLaneExists && obstaclesToSpawnInfo.length > 0) {
            let availableSlots = this.pool.filter(obs => !obs.userData.isActive).length;

            obstaclesToSpawnInfo.forEach(info => {
                if (availableSlots <= 0) {
                    // Optional: Log if we intended to spawn more but couldn't
                    // console.log('Obstacle spawn skipped, pool full.');
                    return; // No slots left, stop trying to spawn in this wave
                }

                const obstacle = this.pool.find(obs => !obs.userData.isActive);

                // This check should theoretically always pass now due to availableSlots check,
                // but keep for safety.
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
                    availableSlots--; // Decrement count of available slots
                }
                 // Removed console.warn - we now explicitly check availableSlots
                 // else {
                 //    console.warn('Obstacle pool exhausted during confirmed spawn!');
                 // }
            });
        }
    }

    /**
     * Updates the positions of all active obstacles and checks for recycling.
     * @param {number} delta - Time delta since last frame.
     * @param {number} cameraPositionZ - The Z position of the camera for recycling calculations.
     */
    updatePositions(delta, cameraPositionZ) {
        this.pool.forEach(obstacle => {
            if (!obstacle.userData.isActive) return;

            let actualSpeed = Constants.SCROLL_SPEED + obstacle.userData.speed;
            if (obstacle.userData.type === Constants.OBSTACLE_TYPES.ONCOMING_CAR) {
                actualSpeed = Constants.ONCOMING_CAR_FIXED_SPEED;
            }

            obstacle.position.z += actualSpeed * 60 * delta;
            obstacle.userData.boundingBox.setFromObject(obstacle);

            // Tighter threshold for recycling obstacles behind the camera
            const recycleThreshold = cameraPositionZ + Constants.ROAD_SEGMENT_LENGTH * 1.5; // Reduced from 2
            const despawnThreshold = cameraPositionZ - (Constants.NUM_ROAD_SEGMENTS * Constants.ROAD_SEGMENT_LENGTH);

            if (obstacle.position.z > recycleThreshold || obstacle.position.z < despawnThreshold) {
                obstacle.visible = false;
                obstacle.userData.isActive = false;
                if (obstacle.userData.type !== Constants.OBSTACLE_TYPES.STATIC) {
                    obstacle.geometry.dispose();
                    obstacle.geometry = new THREE.BoxGeometry(Constants.OBSTACLE_SIZE, Constants.OBSTACLE_SIZE * 1.5, Constants.OBSTACLE_SIZE);
                }
            }
        });
    }

    /**
     * Resets all obstacles to inactive and their default state.
     */
    reset() {
        this.timeSinceLastSpawn = 0;
        this.pool.forEach(obstacle => {
            obstacle.visible = false;
            obstacle.userData.isActive = false;
            if (obstacle.userData.type !== Constants.OBSTACLE_TYPES.STATIC) {
                obstacle.geometry.dispose();
                obstacle.geometry = new THREE.BoxGeometry(Constants.OBSTACLE_SIZE, Constants.OBSTACLE_SIZE * 1.5, Constants.OBSTACLE_SIZE);
            }
            // Optionally reset position/speed if needed, though spawning handles this.
        });
    }

    /**
     * Main update loop for obstacles: handles spawning, position updates, and collision checks.
     * @param {number} delta - Time delta since last frame.
     * @param {number} cameraPositionZ - Z position of the camera.
     * @param {THREE.Box3} playerBox - The player's current bounding box for collision detection.
     */
    update(delta, cameraPositionZ, playerBox) {
        this._spawnObstacle(delta);
        this.updatePositions(delta, cameraPositionZ);

        // Perform collision check internally and emit event
        for (const obstacle of this.pool) {
            if (obstacle.userData.isActive && playerBox.intersectsBox(obstacle.userData.boundingBox)) {
                console.log('Internal Collision Check: Detected type:', obstacle.userData.type);
                this.emitter.emit('collision', obstacle.userData.type);
                // We can break here since one collision is enough to trigger game over
                break;
            }
        }
    }
} 