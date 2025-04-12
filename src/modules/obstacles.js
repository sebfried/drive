import * as THREE from 'three';
import * as Constants from './constants.js';
import assetManager from './assetManager.js'; // Import asset manager
// import EventEmitter from './eventEmitter.js'; // Assuming emitter is passed in
import { ObstacleModels } from '../config/models.config.js'; // Import model configs

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
                    spawnLaneIndex = Math.random() < 0.5 ? 0 : 3; // Allow any lane for now
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

                        if (info.type === Constants.OBSTACLE_TYPES.SLOW_CAR) {
                            config = ObstacleModels.opponentCar_blue; // Use the correct blue car config
                            modelUrl = config.url;
                            fallbackColor = 0x0000ff; // Blue fallback for slow car
                        } else { // ONCOMING_CAR (still box for now)
                            config = null; // Keep as box for now
                        }

                        if (modelUrl && config) {
                            try {
                                const carScene = this.assetManager.getAsset(modelUrl);
                                if (carScene) {
                                    meshToUse = carScene.clone();
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

                        // Fallback to Box if model failed or not defined (e.g., oncoming)
                        if (!meshToUse) {
                            const geom = new THREE.BoxGeometry(Constants.CAR_WIDTH * 0.9, Constants.CAR_HEIGHT * 0.9, Constants.CAR_LENGTH * 0.9);
                            const mat = new THREE.MeshStandardMaterial({ color: fallbackColor });
                            meshToUse = new THREE.Mesh(geom, mat);
                        }

                    } else { // Static
                        // Create instance from default geometry/material
                        meshToUse = new THREE.Mesh(obstaclePlaceholder.defaultGeometry, obstaclePlaceholder.defaultMaterial);
                    }

                    // Position and add the chosen mesh to the scene
                    meshToUse.position.x = Constants.lanePositions[info.lane];
                    meshToUse.position.y = 0; // Place base at y=0
                    meshToUse.position.z = info.posZ;

                    this.scene.add(meshToUse);
                    obstaclePlaceholder.userData.currentMesh = meshToUse; // Store reference
                    obstaclePlaceholder.visible = true; // Mark placeholder as visible conceptually
                    obstaclePlaceholder.userData.isActive = true;
                    availableSlots--;
                } else {
                    // This case should ideally not happen if availableSlots check is correct
                    console.warn('Obstacle pool exhausted unexpectedly!');
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
        this.pool.forEach(obstaclePlaceholder => {
            if (!obstaclePlaceholder.userData.isActive || !obstaclePlaceholder.userData.currentMesh) return;

            const currentMesh = obstaclePlaceholder.userData.currentMesh;
            let actualSpeed = Constants.SCROLL_SPEED + obstaclePlaceholder.userData.speed;

            if (obstaclePlaceholder.userData.type === Constants.OBSTACLE_TYPES.ONCOMING_CAR) {
                actualSpeed = Constants.ONCOMING_CAR_FIXED_SPEED;
            }

            currentMesh.position.z += actualSpeed * 60 * delta;
            obstaclePlaceholder.userData.boundingBox.setFromObject(currentMesh);

            // Tighter threshold for recycling obstacles behind the camera
            const recycleThreshold = cameraPositionZ + Constants.ROAD_SEGMENT_LENGTH * 1.5;
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
     * @param {THREE.Box3} playerBox - The player's current bounding box for collision detection.
     */
    update(delta, cameraPositionZ, playerBox) {
        this._spawnObstacle(delta);
        this.updatePositions(delta, cameraPositionZ);

        // Perform collision check internally and emit event
        for (const obstaclePlaceholder of this.pool) {
            if (obstaclePlaceholder.userData.isActive && obstaclePlaceholder.userData.currentMesh && playerBox.intersectsBox(obstaclePlaceholder.userData.boundingBox)) {
                console.log('Internal Collision Check: Detected type:', obstaclePlaceholder.userData.type);
                this.emitter.emit('collision', obstaclePlaceholder.userData.type);
                // We can break here since one collision is enough to trigger game over
                break;
            }
        }
    }
} 