import * as THREE from 'three';
import * as Constants from './constants.js';

/**
 * @class Obstacles
 * Manages the creation, pooling, movement, and collision of obstacles.
 */
export default class Obstacles {
    /**
     * Creates an Obstacles manager instance.
     * @param {THREE.Scene} scene - The scene to add obstacle meshes to.
     */
    constructor(scene) {
        /** @type {THREE.Scene} Reference to the main scene. */
        this.scene = scene;
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

        if (clearLaneExists) {
            obstaclesToSpawnInfo.forEach(info => {
                const obstacle = this.pool.find(obs => !obs.userData.isActive);
                if (obstacle) {
                    obstacle.userData.type = info.type;
                    obstacle.userData.speed = info.speed;

                    if (info.geometry === 'car') {
                        obstacle.geometry.dispose();
                        obstacle.geometry = new THREE.BoxGeometry(Constants.CAR_WIDTH * 0.9, Constants.CAR_HEIGHT * 0.9, Constants.CAR_LENGTH * 0.9);
                        obstacle.material.color.setHex(info.type === Constants.OBSTACLE_TYPES.SLOW_CAR ? 0x0000ff : 0xffff00);
                    } else {
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

            const recycleThreshold = cameraPositionZ + Constants.ROAD_SEGMENT_LENGTH * 2;
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
     * Checks for collision between the player and any active obstacles.
     * @param {THREE.Box3} playerBox - The bounding box of the player.
     * @returns {boolean} True if a collision occurred, false otherwise.
     */
    checkCollision(playerBox) {
        for (const obstacle of this.pool) {
            if (obstacle.userData.isActive && playerBox.intersectsBox(obstacle.userData.boundingBox)) {
                console.log('Collision Detected with type:', obstacle.userData.type);
                return true;
            }
        }
        return false;
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
     * Main update loop for obstacles: handles spawning and position updates.
     * @param {number} delta - Time delta since last frame.
     * @param {number} cameraPositionZ - Z position of the camera.
     */
    update(delta, cameraPositionZ) {
        this._spawnObstacle(delta);
        this.updatePositions(delta, cameraPositionZ);
    }
} 