/**
 * @fileoverview Represents obstacles moving in the same direction as the player.
 * @module game/obstacles/SameDirectionObstacle
 */

// import BaseObstacle from './BaseObstacle.js'; // Old path
import { BaseObstacle } from './index.js'; // Use barrel file
import * as Constants from '../../config/constants.js';

export default class SameDirectionObstacle extends BaseObstacle {
    /**
     * @param {object} config
     * @param {THREE.Mesh | THREE.Group} config.mesh - The 3D mesh/group.
     */
    constructor({ mesh }) {
        super({ type: Constants.OBSTACLE_TYPES.SLOW_CAR, mesh });
        // May have specific properties like target speed factor
        this.speedFactor = Constants.SLOW_CAR_SPEED_FACTOR; // Store base factor
    }

    /**
     * Updates the obstacle's position based on the environment scroll speed
     * and its own relative speed factor.
     * @param {number} delta - Time delta since last frame.
     * @param {number} scrollSpeed - Current speed of the environment scroll.
     */
    updatePosition(delta, scrollSpeed) {
        if (!this.isActive || !this.mesh) return;

        // Calculate speed relative to the scroll speed
        const relativeSpeed = scrollSpeed * this.speedFactor;
        // Calculate the obstacle's actual speed in world space
        const actualSpeed = scrollSpeed + relativeSpeed;

        // Move the obstacle
        this.mesh.position.z += actualSpeed * 60 * delta;

        // Update the bounding box after moving
        this.updateBoundingBox();
    }
} 