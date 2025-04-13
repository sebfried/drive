/**
 * @fileoverview Factory class for creating different types of obstacles.
 * @module game/obstacles/ObstacleFactory
 */

import * as THREE from 'three';
import * as Constants from '../../config/constants.js';
import { CarObstacleModels, StaticObstacleModels } from '../../config/models.config.js';
import { AssetManager } from '../../assets/index.js'; // Use barrel file

// Import obstacle subclasses (Updated Names)
// import StaticObstacle from './StaticObstacle.js';
// import SlowCarObstacle from './SlowCarObstacle.js';
// import SameDirectionObstacle from './SameDirectionObstacle.js'; // Renamed
// import OncomingCarObstacle from './OncomingCarObstacle.js';
// import OncomingObstacle from './OncomingObstacle.js'; // Renamed
// import BaseObstacle from './BaseObstacle.js'; // Keep for fallback type if needed
import { StaticObstacle, SameDirectionObstacle, OncomingObstacle, BaseObstacle } from './index.js'; // Use local barrel file

export default class ObstacleFactory {
    /**
     * @param {object} config
     * @param {THREE.Scene} config.scene - The scene (needed for adding fallbacks, maybe remove later).
     * @param {AssetManager} config.assetManager - The asset manager instance.
     */
    constructor({ scene, assetManager }) {
        if (!scene || !assetManager) {
            throw new Error('ObstacleFactory requires scene and assetManager instances.');
        }
        this.scene = scene; // Needed for fallback mesh potentially
        this.assetManager = assetManager;

        // --- NEW: Pools for inactive obstacles --- 
        /** @private @type {Map<string, Array<BaseObstacle>>} */
        this.inactivePools = new Map();
        this.inactivePools.set(Constants.OBSTACLE_TYPES.STATIC, []);
        this.inactivePools.set(Constants.OBSTACLE_TYPES.SLOW_CAR, []);
        this.inactivePools.set(Constants.OBSTACLE_TYPES.ONCOMING_CAR, []);
        // --- End New --- 

        this._preparePlaceholders();
        console.log('ObstacleFactory initialized.');
    }

    _preparePlaceholders() {
        this.fallbackGeometry = new THREE.BoxGeometry(Constants.OBSTACLE_SIZE, Constants.OBSTACLE_SIZE * 1.5, Constants.OBSTACLE_SIZE);
        this.fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0xff00ff }); // Magenta fallback
        this.fallbackCarGeometry = new THREE.BoxGeometry(Constants.CAR_WIDTH * 0.9, Constants.CAR_HEIGHT * 0.9, Constants.CAR_LENGTH * 0.9);
        this.fallbackCarMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 }); // Yellow fallback for cars
    }

    /**
     * Gets or creates an obstacle instance of the specified type.
     * Attempts to reuse an instance from the inactive pool first.
     * @param {string} type - The type of obstacle (e.g., Constants.OBSTACLE_TYPES.STATIC).
     * @returns {BaseObstacle | null} An instance of the requested obstacle subclass, or null on failure.
     */
    createObstacle(type) {
        const pool = this.inactivePools.get(type);

        // 1. Try to reuse from pool
        if (pool && pool.length > 0) {
            const obstacleInstance = pool.pop(); // Get last inactive obstacle
            console.log(`Factory reusing ${type} obstacle from pool.`);
            // Mesh is already created, just need to ensure it's ready
            // Resetting state happens in obstacle.spawn() called by the manager
            return obstacleInstance;
        }

        // 2. If pool is empty, create a new one
        console.log(`Factory creating new ${type} obstacle.`);
        let mesh = null;
        let obstacleInstance = null;
        let config = null;
        let modelUrl = null;
        let additionalRotation = 0;
        let isCar = false;

        try {
            // 1. Select Model Config based on type
            if (type === Constants.OBSTACLE_TYPES.STATIC) {
                const keys = Object.keys(StaticObstacleModels);
                if (keys.length > 0) {
                    const randomKey = keys[Math.floor(Math.random() * keys.length)];
                    config = StaticObstacleModels[randomKey];
                    modelUrl = config.url;
                } else {
                    console.warn('ObstacleFactory: No static obstacle models defined in config.');
                }
                isCar = false;
            } else if (type === Constants.OBSTACLE_TYPES.SLOW_CAR || type === Constants.OBSTACLE_TYPES.ONCOMING_CAR) {
                const keys = Object.keys(CarObstacleModels);
                 if (keys.length > 0) {
                    const randomKey = keys[Math.floor(Math.random() * keys.length)];
                    config = CarObstacleModels[randomKey];
                    modelUrl = config.url;
                    if (type === Constants.OBSTACLE_TYPES.ONCOMING_CAR) {
                        additionalRotation = 180; // Rotate oncoming cars
                    }
                } else {
                     console.warn('ObstacleFactory: No car obstacle models defined in config.');
                }
                isCar = true;
            } else {
                console.error(`ObstacleFactory: Unknown obstacle type requested: ${type}`);
                return null;
            }

            // 2. Get Asset and Clone Mesh
            if (modelUrl && config) {
                const modelScene = this.assetManager.getAsset(modelUrl);
                if (modelScene) {
                    mesh = modelScene.clone();
                    mesh.scale.set(config.scale, config.scale, config.scale);
                    const totalRotationY = (config.rotationY || 0) + additionalRotation;
                    mesh.rotation.y = THREE.MathUtils.degToRad(totalRotationY);
                } else {
                     console.warn(`ObstacleFactory: Asset scene not found in cache: ${modelUrl}. Was it preloaded? Falling back.`);
                     // Fallback handled below
                }
            } else {
                 console.warn(`ObstacleFactory: Model URL or config missing for type ${type}. Falling back.`);
            }

            // 3. Handle Fallback Mesh Creation
            if (!mesh) {
                console.log(`ObstacleFactory: Using fallback mesh for type ${type}`);
                if (isCar) {
                     mesh = new THREE.Mesh(this.fallbackCarGeometry, this.fallbackCarMaterial);
                } else {
                     mesh = new THREE.Mesh(this.fallbackGeometry, this.fallbackMaterial);
                }
            }

            // 4. Instantiate Correct Subclass (Updated Names)
            switch (type) {
                case Constants.OBSTACLE_TYPES.STATIC:
                    obstacleInstance = new StaticObstacle({ mesh });
                    break;
                case Constants.OBSTACLE_TYPES.SLOW_CAR:
                    // Use renamed class
                    obstacleInstance = new SameDirectionObstacle({ mesh });
                    break;
                case Constants.OBSTACLE_TYPES.ONCOMING_CAR:
                     // Use renamed class
                    obstacleInstance = new OncomingObstacle({ mesh });
                    break;
                default:
                    // Should not happen if initial check passed, but good practice
                    console.error(`ObstacleFactory: Failed to determine subclass for type: ${type}`);
                    // Dispose potentially created fallback mesh if instance fails
                    mesh?.geometry?.dispose();
                    mesh?.material?.dispose();
                    return null;
            }

        } catch (error) {
            console.error(`ObstacleFactory: Error creating obstacle of type ${type}:`, error);
            // Dispose potentially created mesh if instance fails
            mesh?.geometry?.dispose();
            mesh?.material?.dispose();
            return null;
        }

        return obstacleInstance;
    }

    /**
     * Releases an obstacle back into the inactive pool for reuse.
     * @param {BaseObstacle} obstacle - The obstacle instance to release.
     */
    releaseObstacle(obstacle) {
        if (!obstacle || !obstacle.type) {
            console.warn('ObstacleFactory: Attempted to release invalid obstacle.', obstacle);
            return;
        }

        const pool = this.inactivePools.get(obstacle.type);
        if (pool) {
            obstacle.despawn(); // Mark as inactive, hide mesh
            pool.push(obstacle);
             console.log(`Factory released ${obstacle.type} obstacle to pool. Pool size: ${pool.length}`);
        } else {
            console.warn(`ObstacleFactory: No pool found for obstacle type: ${obstacle.type}. Disposing instead.`);
            // If somehow an unknown type was created, just dispose it fully
             if (obstacle.mesh) {
                this.scene?.remove(obstacle.mesh);
                // Consider geometry/material disposal as in BaseObstacle.dispose
            }
        }
    }

    // Dispose method for cleanup if needed
    dispose() {
        this.fallbackGeometry?.dispose();
        this.fallbackMaterial?.dispose();
        this.fallbackCarGeometry?.dispose();
        this.fallbackCarMaterial?.dispose();

        // Dispose obstacles remaining in inactive pools
        this.inactivePools.forEach((pool, type) => {
            console.log(`Disposing inactive pool for type: ${type}`);
            pool.forEach(obstacle => {
                 if (obstacle.mesh) {
                    // No need to remove from scene, they are already hidden/inactive
                    // But we should dispose geometry/material if they are unique
                    // TODO: Refine disposal logic based on mesh creation strategy
                 }
            });
        });
        this.inactivePools.clear();

        console.log('ObstacleFactory disposed.');
    }
} 