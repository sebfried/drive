/**
 * @fileoverview Base class for all obstacle types in the game.
 * Defines common properties and methods.
 * @module game/obstacles/BaseObstacle
 */

import * as THREE from 'three';
import * as Constants from '../../config/constants.js';

export default class BaseObstacle {
    /**
     * @param {object} config - Configuration for the obstacle.
     * @param {string} config.type - The type of obstacle (e.g., Constants.OBSTACLE_TYPES.STATIC).
     * @param {THREE.Mesh | THREE.Group} config.mesh - The 3D mesh/group for the obstacle.
     */
    constructor({ type, mesh }) {
        if (!mesh) {
            throw new Error('BaseObstacle requires a mesh object.');
        }
        /** @type {string} */
        this.type = type || Constants.OBSTACLE_TYPES.STATIC;
        /** @type {THREE.Mesh | THREE.Group} */
        this.mesh = mesh;
        /** @type {boolean} */
        this.isActive = false; // Obstacles start inactive until placed
        /** @type {THREE.Box3} */
        this.boundingBox = new THREE.Box3();

        // Initial calculation of bounding box
        this.updateBoundingBox();
    }

    /**
     * Updates the obstacle's bounding box based on its mesh.
     */
    updateBoundingBox() {
        if (this.mesh) {
            this.boundingBox.setFromObject(this.mesh);
        }
    }

    /**
     * Updates the obstacle's position and state.
     * This might be overridden by subclasses for specific movement logic.
     * @param {number} delta - Time delta since last frame.
     * @param {number} scrollSpeed - Current speed of the environment scroll.
     */
    updatePosition(delta, scrollSpeed) {
        if (!this.isActive || !this.mesh) return;

        // Default behavior: move with the scroll speed
        this.mesh.position.z += scrollSpeed * 60 * delta;
        this.updateBoundingBox();
    }

    /**
     * Activates the obstacle, setting its initial position.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    spawn(x, y, z) {
        if (!this.mesh) return;
        this.mesh.position.set(x, y, z);
        this.updateBoundingBox();
        this.mesh.visible = true;
        this.isActive = true;
    }

    /**
     * Deactivates the obstacle and hides its mesh.
     */
    despawn() {
        if (this.mesh) {
            this.mesh.visible = false;
        }
        this.isActive = false;
    }

    /**
     * Checks if the obstacle should be recycled based on camera position.
     * @param {number} cameraPositionZ
     * @returns {boolean}
     */
    shouldRecycle(cameraPositionZ) {
        if (!this.isActive || !this.mesh) return false;

        const recycleThreshold = cameraPositionZ + Constants.ROAD_SEGMENT_LENGTH * 1.5;
        const despawnThreshold = cameraPositionZ - (Constants.NUM_ROAD_SEGMENTS * Constants.ROAD_SEGMENT_LENGTH);

        return this.mesh.position.z > recycleThreshold || this.mesh.position.z < despawnThreshold;
    }

    /**
     * Performs cleanup, removing the mesh from the scene and disposing geometry/material if needed.
     * @param {THREE.Scene} scene
     */
    dispose(scene) {
        if (this.mesh) {
            scene?.remove(this.mesh);
            // TODO: Consider how to handle disposal of shared geometries/materials vs cloned ones.
            // If geometry/material are unique to this instance, dispose them.
            // Example (needs refinement based on how meshes are created/cloned):
            // if (this.mesh.geometry) this.mesh.geometry.dispose();
            // if (this.mesh.material) {
            //     if (Array.isArray(this.mesh.material)) {
            //         this.mesh.material.forEach(m => m.dispose());
            //     } else {
            //         this.mesh.material.dispose();
            //     }
            // }
        }
        this.isActive = false;
    }
} 