import * as THREE from 'three';
import assetManager from './assetManager.js';
// import * as Constants from './constants.js'; // OLD PATH
import * as Constants from '../config/constants.js'; // NEW PATH
import difficultyManager from './difficultyManager.js';
// import { ObstacleAssets } from '../config/models.config.js'; // WRONG IMPORT
import { CarObstacleModels, StaticObstacleModels } from '../config/models.config.js'; // CORRECTED IMPORT
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
        /** @type {Array<Object>} Pool of obstacle placeholder objects. */
        this.pool = [];
        /** @type {number} Time since the last obstacle spawn attempt. */
        this.timeSinceLastSpawn = 0;
        this.assetManager = assetManager; // Store asset manager instance

        this._initializePool();
    }

    /**
     * Creates the initial pool of obstacle objects (placeholders).
     * @private
     */
    _initializePool() {
        for (let i = 0; i < Constants.OBSTACLE_POOL_SIZE; i++) {
            this.pool.push(this._createSingleObstaclePlaceholder());
        }
    }

    /**
     * Creates a single obstacle placeholder object (not added to scene initially).
     * @private
     * @returns {Object} Placeholder object with default properties.
     */
    _createSingleObstaclePlaceholder() {
        // Placeholder object - geometry/material will be added dynamically
        const placeholder = {
            visible: false,
            userData: {
                isActive: false,
                boundingBox: new THREE.Box3(),
                type: Constants.OBSTACLE_TYPES.STATIC,
                speed: 0,
                currentMesh: null // Reference to the actual mesh/model in the scene
            },
            // Store default geometry/material for static/fallback cases
            defaultGeometry: new THREE.BoxGeometry(Constants.OBSTACLE_SIZE, Constants.OBSTACLE_SIZE * 1.5, Constants.OBSTACLE_SIZE),
            defaultMaterial: new THREE.MeshStandardMaterial({ color: 0x8B4513 }) // Default: Brown
        };
        return placeholder;
    }

    /**
     * Determines the lane index based on an X position.
     * Finds the lane center closest to the given X value.
     * @private
     * @param {number} x - The X position.
     * @returns {number} The index of the closest lane (0-3).
     */
    _getLaneIndexFromPosition(x) {
        let closestLaneIndex = -1;
        let minDistance = Infinity;

        Constants.lanePositions.forEach((laneX, index) => {
            const distance = Math.abs(x - laneX);
            if (distance < minDistance) {
                minDistance = distance;
                closestLaneIndex = index;
            }
        });
        return closestLaneIndex;
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
     * @param {number} cameraPositionZ - Z position of the camera.
     */
    _spawnObstacle(delta, cameraPositionZ) {
        this.timeSinceLastSpawn += delta;
        // Adjust spawn interval based on current difficulty
        const difficultyParams = difficultyManager.getCurrentParams();
        if (this.timeSinceLastSpawn < (Constants.OBSTACLE_SPAWN_INTERVAL * difficultyParams.spawnIntervalFactor)) {
            return;
        }
        this.timeSinceLastSpawn = 0;

        // Get currently active obstacles to check against
        const activeObstacles = this.pool.filter(obs => obs.userData.isActive && obs.userData.currentMesh);

        const maxObstaclesThisWave = 3;
        const obstaclesToSpawnInfo = [];
        let potentialLaneOccupancy = [false, false, false, false];

        // --- Calculate Spawn Z based on camera --- 
        const spawnDistanceAhead = Constants.NUM_ROAD_SEGMENTS * Constants.ROAD_SEGMENT_LENGTH * 0.8; // e.g., 160 units ahead
        const baseSpawnPosZ = cameraPositionZ - spawnDistanceAhead;

        for (let i = 0; i < maxObstaclesThisWave; i++) {
            const spawnType = this._getWeightedRandomObstacleType();
            let spawnLaneIndex;
            let obstacleSpeed = 0;
            // Use baseSpawnPosZ, add slight random offset?
            let obstaclePosZ = baseSpawnPosZ + (Math.random() - 0.5) * Constants.ROAD_SEGMENT_LENGTH; 
            let geometryType = 'static';

            switch (spawnType) {
                case Constants.OBSTACLE_TYPES.STATIC:
                    spawnLaneIndex = Math.random() < 0.5 ? 0 : 3;
                    break;
                case Constants.OBSTACLE_TYPES.SLOW_CAR:
                    spawnLaneIndex = 2; // Spawn only in the middle-right lane
                    obstacleSpeed = Constants.SCROLL_SPEED * Constants.SLOW_CAR_SPEED_FACTOR;
                    geometryType = 'car';
                    break;
                case Constants.OBSTACLE_TYPES.ONCOMING_CAR:
                    spawnLaneIndex = 1;
                    obstacleSpeed = Constants.ONCOMING_CAR_FIXED_SPEED;
                    obstaclePosZ = -Constants.NUM_ROAD_SEGMENTS * Constants.ROAD_SEGMENT_LENGTH * 0.6; // Original: -30
                    geometryType = 'car';
                    break;
            }

            // --- VALIDATION CHECKS --- 
            // 1. Check if lane is already targeted in THIS wave
            if (potentialLaneOccupancy[spawnLaneIndex]) {
                continue; // Try next iteration
            }

            // 2. Check if too close to an ACTIVE obstacle in an ADJACENT lane
            let isTooCloseToActive = false;
            for (const activeObstacle of activeObstacles) {
                const activeObstacleMesh = activeObstacle.userData.currentMesh;
                const activeLaneIndex = this._getLaneIndexFromPosition(activeObstacleMesh.position.x);
                if (Math.abs(activeLaneIndex - spawnLaneIndex) === 1) { // Adjacent lanes
                    if (Math.abs(activeObstacleMesh.position.z - obstaclePosZ) < Constants.MIN_ADJACENT_SPAWN_DISTANCE_Z) {
                        isTooCloseToActive = true;
                        break; // No need to check further active obstacles
                    }
                }
            }
            if (isTooCloseToActive) {
                continue; // Skip this potential spawn, try next iteration
            }

            // --- If checks pass, add to list and mark lane for this wave --- 
            obstaclesToSpawnInfo.push({ type: spawnType, lane: spawnLaneIndex, speed: obstacleSpeed, posZ: obstaclePosZ, geometry: geometryType });
            potentialLaneOccupancy[spawnLaneIndex] = true;
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
                    return; // No slots left
                }

                const obstaclePlaceholder = this.pool.find(obs => !obs.userData.isActive);

                if (obstaclePlaceholder) {
                    let meshToUse = null;
                    obstaclePlaceholder.userData.type = info.type;
                    obstaclePlaceholder.userData.speed = info.speed;

                    // Remove previously used mesh if any
                    if (obstaclePlaceholder.userData.currentMesh) {
                        this.scene.remove(obstaclePlaceholder.userData.currentMesh);
                        obstaclePlaceholder.userData.currentMesh = null;
                    }

                    if (info.geometry === 'car') {
                        let config = null;
                        let fallbackColor = 0xffff00; // Default Yellow for oncoming
                        let modelUrl = null;
                        let additionalRotation = 0; // Degrees

                        if (info.type === Constants.OBSTACLE_TYPES.SLOW_CAR) {
                            // Randomly select between available opponent car models
                            const opponentCarKeys = Object.keys(CarObstacleModels);
                            const randomOpponentIndex = Math.floor(Math.random() * opponentCarKeys.length);
                            const randomOpponentKey = opponentCarKeys[randomOpponentIndex];
                            config = CarObstacleModels[randomOpponentKey];
                            console.log(`Spawning slow car model: ${randomOpponentKey}`); // Log which model is chosen
                            modelUrl = config.url;
                            fallbackColor = 0x0000ff; // Blue fallback for slow car
                        } else if (info.type === Constants.OBSTACLE_TYPES.ONCOMING_CAR) {
                            // Randomly select between available opponent car models
                            const opponentCarKeys = Object.keys(CarObstacleModels);
                            const randomOpponentIndex = Math.floor(Math.random() * opponentCarKeys.length);
                            const randomOpponentKey = opponentCarKeys[randomOpponentIndex];
                            config = CarObstacleModels[randomOpponentKey];
                            console.log(`Spawning oncoming car model: ${randomOpponentKey}`); // Log which model is chosen
                            modelUrl = config.url;
                            fallbackColor = 0xffff00; // Yellow fallback for oncoming car
                            additionalRotation = 180; // Rotate oncoming cars 180 degrees
                        }

                        if (modelUrl && config) {
                            try {
                                const carScene = this.assetManager.getAsset(modelUrl);
                                if (carScene) {
                                    meshToUse = carScene.clone();
                                    meshToUse.scale.set(config.scale, config.scale, config.scale);
                                    const totalRotationY = config.rotationY + additionalRotation;
                                    meshToUse.rotation.y = THREE.MathUtils.degToRad(totalRotationY);
                                } else {
                                    console.warn(`Asset scene not found in cache: ${modelUrl}. Was it preloaded? Falling back to box.`);
                                    meshToUse = null; // Trigger fallback
                                }
                            } catch (error) {
                                console.error(`Error getting/cloning asset ${modelUrl}:`, error);
                                meshToUse = null; // Trigger fallback
                            }
                        }

                        // Fallback to Box if model failed or not defined (e.g., oncoming)
                        if (!meshToUse) {
                            const geom = new THREE.BoxGeometry(Constants.CAR_WIDTH * 0.9, Constants.CAR_HEIGHT * 0.9, Constants.CAR_LENGTH * 0.9);
                            const mat = new THREE.MeshStandardMaterial({ color: fallbackColor });
                            meshToUse = new THREE.Mesh(geom, mat);
                        }

                    } else { // Static
                        // Randomly select between available static models (trees, etc.)
                        const staticModelKeys = Object.keys(StaticObstacleModels);
                        
                        if (staticModelKeys.length > 0) {
                            const randomStaticIndex = Math.floor(Math.random() * staticModelKeys.length);
                            const randomStaticKey = staticModelKeys[randomStaticIndex];
                            const config = StaticObstacleModels[randomStaticKey];
                            const modelUrl = config.url;

                            try {
                                const staticScene = this.assetManager.getAsset(modelUrl);
                                if (staticScene) {
                                    meshToUse = staticScene.clone(); // Assign meshToUse here
                                    meshToUse.scale.set(config.scale, config.scale, config.scale);
                                    meshToUse.rotation.y = THREE.MathUtils.degToRad(config.rotationY);
                                } else {
                                    console.warn(`Asset scene not found in cache: ${modelUrl}. Was it preloaded? Falling back to box.`);
                                    meshToUse = null; // Trigger fallback
                                }
                            } catch (error) {
                                console.error(`Error getting/cloning asset ${modelUrl}:`, error);
                                meshToUse = null; // Trigger fallback
                            }
                        }
                    }

                    if (meshToUse) {
                        // Assign mesh and position FIRST
                        meshToUse.position.x = Constants.lanePositions[info.lane];
                        meshToUse.position.y = 0; // Place base at y=0
                        meshToUse.position.z = info.posZ;
                        obstaclePlaceholder.userData.currentMesh = meshToUse;
                        this.scene.add(meshToUse);

                        // Mark as active AFTER assigning mesh and adding to scene
                        obstaclePlaceholder.userData.isActive = true; 
                        obstaclePlaceholder.visible = true; // Conceptual visibility
                        availableSlots--; // Decrement available slots
                    } else {
                         console.warn('Failed to create or load mesh for obstacle type:', info.type);
                    }
                }
            });
        }
    }

    /**
     * Updates the positions of all active obstacles and checks for recycling.
     * @param {number} delta - Time delta since last frame.
     * @param {number} cameraPositionZ - Z position of the camera.
     * @param {number} currentScrollSpeed - The dynamic scroll speed based on player gear.
     * @param {Player} player - The player object to get current gear.
     * @private
     */
    _updatePositions(delta, cameraPositionZ, currentScrollSpeed, player) {
        this.pool.forEach(obstaclePlaceholder => {
            if (!obstaclePlaceholder.userData.isActive || !obstaclePlaceholder.userData.currentMesh) return;

            const currentMesh = obstaclePlaceholder.userData.currentMesh;
            let actualSpeed;

            const playerGear = player.currentGear || 1; // Get player gear (default to 1 if player undefined)
            // Calculate speed based on type and current game speed
            if (obstaclePlaceholder.userData.type === Constants.OBSTACLE_TYPES.ONCOMING_CAR) {
                // Oncoming speed is absolute, but scales slightly with player gear
                const baseSpeed = Constants.ONCOMING_CAR_FIXED_SPEED;
                const gearBonus = (playerGear - 1) * Constants.ONCOMING_CAR_SPEED_GEAR_SCALING;
                actualSpeed = baseSpeed + gearBonus;
            } else if (obstaclePlaceholder.userData.type === Constants.OBSTACLE_TYPES.SLOW_CAR) {
                // Slow car speed is relative to the current scroll speed
                const difficultyParams = difficultyManager.getCurrentParams();
                const relativeSpeedFactor = difficultyParams.slowCarSpeedFactor;
                const relativeSpeed = currentScrollSpeed * relativeSpeedFactor;
                actualSpeed = currentScrollSpeed + relativeSpeed;
            } else { // Static obstacles
                // Static obstacles move with the road
                actualSpeed = currentScrollSpeed;
            }

            // Move obstacle towards the player (positive Z increment)
            currentMesh.position.z += actualSpeed * 60 * delta;
            obstaclePlaceholder.userData.boundingBox.setFromObject(currentMesh);

            // Tighter threshold for recycling obstacles behind the camera
            const recycleThreshold = cameraPositionZ + Constants.ROAD_SEGMENT_LENGTH * 1.5;
            // Define despawn threshold further behind recycle point
            const despawnThreshold = cameraPositionZ - (Constants.NUM_ROAD_SEGMENTS * Constants.ROAD_SEGMENT_LENGTH);

            if (currentMesh.position.z > recycleThreshold || currentMesh.position.z < despawnThreshold) {
                // Recycle
                this.scene.remove(currentMesh);
                obstaclePlaceholder.userData.currentMesh = null;
                obstaclePlaceholder.visible = false;
                obstaclePlaceholder.userData.isActive = false;

                // Dispose geometry/material if it was a fallback box to free memory
                if (currentMesh.geometry && currentMesh.geometry !== obstaclePlaceholder.defaultGeometry) {
                    currentMesh.geometry.dispose();
                }
                if (currentMesh.material && currentMesh.material !== obstaclePlaceholder.defaultMaterial) {
                    currentMesh.material.dispose();
                }
            }
        });
    }

    /**
     * Resets all obstacles to inactive and removes their meshes from the scene.
     */
    reset() {
        this.timeSinceLastSpawn = 0;
        this.pool.forEach(obstaclePlaceholder => {
            if (obstaclePlaceholder.userData.currentMesh) {
                this.scene.remove(obstaclePlaceholder.userData.currentMesh);
                // Dispose geometry/material if it was a fallback box
                if (obstaclePlaceholder.userData.currentMesh.geometry && obstaclePlaceholder.userData.currentMesh.geometry !== obstaclePlaceholder.defaultGeometry) {
                    obstaclePlaceholder.userData.currentMesh.geometry.dispose();
                }
                if (obstaclePlaceholder.userData.currentMesh.material && obstaclePlaceholder.userData.currentMesh.material !== obstaclePlaceholder.defaultMaterial) {
                    obstaclePlaceholder.userData.currentMesh.material.dispose();
                }
                obstaclePlaceholder.userData.currentMesh = null;
            }
            obstaclePlaceholder.visible = false;
            obstaclePlaceholder.userData.isActive = false;
        });
    }

    /**
     * Main update loop for obstacles: handles spawning, position updates, and collision checks.
     * @param {number} delta - Time delta since last frame.
     * @param {number} cameraPositionZ - Z position of the camera.
     * @param {Player} player - The player object.
     * @param {number} currentScrollSpeed - The dynamic scroll speed based on player gear.
     */
    update(delta, cameraPositionZ, player, currentScrollSpeed) {
        if (!player) return; // Need player for checks

        const playerBox = player.getBoundingBox(); // Get bounding box from player
        if (!playerBox) return; // Player might not have a box yet

        // Pass cameraPositionZ to _spawnObstacle
        this._spawnObstacle(delta, cameraPositionZ);
        this._updatePositions(delta, cameraPositionZ, currentScrollSpeed, player);

        // Perform collision check internally and emit event
        for (const obstaclePlaceholder of this.pool) {
            if (obstaclePlaceholder.userData.isActive && obstaclePlaceholder.userData.currentMesh && playerBox.intersectsBox(obstaclePlaceholder.userData.boundingBox)) {
                console.log('Collision Check: Detected type:', obstaclePlaceholder.userData.type);
                this.emitter.emit('collision', { type: obstaclePlaceholder.userData.type }); // Pass type in event data
                // We can break here since one collision is enough to trigger game over
                break;
            }
        }
    }
}