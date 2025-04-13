import * as THREE from 'three';
import assetManager from './assetManager.js';
// import * as Constants from './constants.js'; // OLD PATH
import * as Constants from '../config/constants.js'; // NEW PATH
import difficultyManager from './difficultyManager.js';
// import { ObstacleAssets } from '../config/models.config.js'; // WRONG IMPORT
import { CarObstacleModels, StaticObstacleModels } from '../config/models.config.js'; // CORRECTED IMPORT
// import EventEmitter from './eventEmitter.js'; // Assuming emitter is passed in

// NEW: Import Factory and Base Class
import ObstacleFactory from '../game/obstacles/ObstacleFactory.js';
import BaseObstacle from '../game/obstacles/BaseObstacle.js';

/**
 * @class Obstacles (ObstacleManager)
 * Manages the lifecycle (spawning, updating, recycling) of obstacles.
 * Uses an ObstacleFactory for creating specific obstacle instances.
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
        /** @type {Array<BaseObstacle>} Pool of ACTIVE obstacle instances. */
        this.pool = [];
        /** @type {number} Time since the last obstacle spawn attempt. */
        this.timeSinceLastSpawn = 0;
        // Don't store assetManager directly, pass to factory
        // this.assetManager = assetManager;

        // NEW: Instantiate the factory
        /** @private @type {ObstacleFactory} */
        this.factory = new ObstacleFactory({ scene: this.scene, assetManager });

        // REMOVED: _initializePool() - Pool now holds active instances created on demand.
        console.log('ObstacleManager initialized.');
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
        const difficultyParams = difficultyManager.getCurrentParams();
        const currentSpawnInterval = Constants.OBSTACLE_SPAWN_INTERVAL * difficultyParams.spawnIntervalFactor;

        if (this.timeSinceLastSpawn < currentSpawnInterval) {
            return;
        }
        this.timeSinceLastSpawn = 0;

        // Calculate Spawn Z based on camera
        const spawnDistanceAhead = Constants.NUM_ROAD_SEGMENTS * Constants.ROAD_SEGMENT_LENGTH * 0.8; // e.g., 160 units ahead
        const baseSpawnPosZ = cameraPositionZ - spawnDistanceAhead;

        // --- Determine how many obstacles to attempt spawning (Simplified for now) --- 
        const maxObstaclesToAttempt = 2; // Try spawning up to 2 obstacles per cycle
        let attemptedSpawns = 0;

        while (attemptedSpawns < maxObstaclesToAttempt) {
            attemptedSpawns++;

            const spawnType = this._getWeightedRandomObstacleType();
            let spawnLaneIndex;

            switch (spawnType) {
                case Constants.OBSTACLE_TYPES.STATIC:
                    spawnLaneIndex = Math.random() < 0.5 ? 0 : 3; // Shoulders
                    break;
                case Constants.OBSTACLE_TYPES.SLOW_CAR:
                    spawnLaneIndex = 2; // Right lane
                    break;
                case Constants.OBSTACLE_TYPES.ONCOMING_CAR:
                    spawnLaneIndex = 1; // Left lane
                    break;
                default:
                     console.warn(`Unknown obstacle type selected: ${spawnType}`);
                     continue; // Skip this attempt
            }

            // TODO: Add validation checks here (e.g., ensure lane is clear, prevent impossible patterns)
            // For now, we just attempt to create and place.

            // --- ENHANCED VALIDATION --- 
            let canSpawn = true;
            const minZSpacing = Constants.CAR_LENGTH * 3; // Minimum Z distance between any two obstacles
            const activeObstacles = this.pool.filter(obs => obs.isActive); // Get currently active obstacles

            for (const activeObstacle of activeObstacles) {
                if (!activeObstacle.mesh) continue;
                const activeLaneIndex = this._getLaneIndexFromPosition(activeObstacle.mesh.position.x);
                const zDistance = Math.abs(activeObstacle.mesh.position.z - obstaclePosZ);

                // Check for overlap in the SAME lane
                if (activeLaneIndex === spawnLaneIndex && zDistance < minZSpacing) {
                    console.log(`Spawn prevented: Too close (Z: ${zDistance.toFixed(1)}) to active obstacle in same lane (${spawnLaneIndex}).`);
                    canSpawn = false;
                    break;
                }
                // Check for overlap in ADJACENT lanes (use original constant for this check)
                if (Math.abs(activeLaneIndex - spawnLaneIndex) === 1 && zDistance < Constants.MIN_ADJACENT_SPAWN_DISTANCE_Z) {
                     console.log(`Spawn prevented: Too close (Z: ${zDistance.toFixed(1)}) to active obstacle in adjacent lane (${activeLaneIndex} vs ${spawnLaneIndex}).`);
                     canSpawn = false;
                    break;
                }
            }

            if (!canSpawn) {
                continue; // Skip this attempt if validation failed
            }
            // --- END ENHANCED VALIDATION --- 

            const obstaclePosZ = baseSpawnPosZ + (Math.random() - 0.5) * Constants.ROAD_SEGMENT_LENGTH;
            const spawnX = Constants.lanePositions[spawnLaneIndex];
            const spawnY = 0; // Assuming ground level Y=0

            // --- Delegate Creation to Factory --- 
            const newObstacle = this.factory.createObstacle(spawnType);

            if (newObstacle) {
                // Add to scene (mesh is already created by factory)
                this.scene.add(newObstacle.mesh);
                // Spawn (activate and position) the obstacle
                newObstacle.spawn(spawnX, spawnY, obstaclePosZ);
                // Add the active obstacle instance to the pool
                this.pool.push(newObstacle);
                 console.log(`Spawned ${spawnType} in lane ${spawnLaneIndex} at Z=${obstaclePosZ.toFixed(2)}`);
            } else {
                console.warn(`Factory failed to create obstacle of type: ${spawnType}`);
                // Optionally retry or just skip this spawn attempt
            }
        } // end while
    } // end _spawnObstacle

    /**
     * Updates the positions of all active obstacles and checks for recycling.
     * @param {number} delta - Time delta since last frame.
     * @param {number} cameraPositionZ - Z position of the camera.
     * @param {number} currentScrollSpeed - The dynamic scroll speed based on player gear.
     * @param {Player} player - The player object to get current gear.
     * @private
     */
    _updatePositions(delta, cameraPositionZ, currentScrollSpeed, player) {
        const obstaclesToRelease = [];

        for (let i = this.pool.length - 1; i >= 0; i--) {
            const obstacle = this.pool[i];
            if (!obstacle.isActive) continue; // Should ideally not happen in active pool

            const playerGear = player?.currentGear || 1;
            obstacle.updatePosition(delta, currentScrollSpeed, playerGear);

            // Check if obstacle should be recycled
            if (obstacle.shouldRecycle(cameraPositionZ)) {
                obstaclesToRelease.push(obstacle);
                this.pool.splice(i, 1); // Remove from active pool
            }
        }

        // Release recycled obstacles back to the factory's pool
        obstaclesToRelease.forEach(obstacle => {
            this.scene.remove(obstacle.mesh); // Remove mesh from scene first
            this.factory.releaseObstacle(obstacle);
        });
    }

    /**
     * Resets all obstacles, releasing them back to the factory pool.
     */
    reset() {
        this.timeSinceLastSpawn = 0;
        // Release all obstacles currently in the active pool
        this.pool.forEach(obstacle => {
            this.scene.remove(obstacle.mesh); // Remove mesh from scene
            this.factory.releaseObstacle(obstacle); // Return to factory pool
        });
        this.pool = []; // Clear the active pool reference
        console.log('ObstacleManager reset. Active pool cleared and instances released.');
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

        const playerBox = player.getBoundingBox();
        if (!playerBox) return; // Player might not have a box yet

        this._spawnObstacle(delta, cameraPositionZ);
        this._updatePositions(delta, cameraPositionZ, currentScrollSpeed, player);

        // Perform collision check against active obstacles in the pool
        for (const obstacle of this.pool) {
            if (obstacle.isActive && playerBox.intersectsBox(obstacle.boundingBox)) {
                console.log('Collision Check: Detected type:', obstacle.type);
                this.emitter.emit('collision', { type: obstacle.type });
                break; // One collision is enough
            }
        }
    }
}