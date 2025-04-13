/**
 * @fileoverview Represents obstacles moving towards the player.
 * @module game/obstacles/OncomingObstacle
 */

// import BaseObstacle from './BaseObstacle.js'; // Old path
import { BaseObstacle } from './index.js'; // Use barrel file
import * as Constants from '../../config/constants.js';

export default class OncomingObstacle extends BaseObstacle {
    /**
     * @param {object} config
     * @param {THREE.Mesh | THREE.Group} config.mesh - The 3D mesh/group.
     */
    constructor({ mesh }) {
        super({ type: Constants.OBSTACLE_TYPES.ONCOMING_CAR, mesh });
        // Oncoming cars might need specific properties, e.g., base speed
    }

    /**
     * Overrides base updatePosition for oncoming car movement.
     * Requires player gear to calculate speed scaling.
     * @param {number} delta - Time delta since last frame.
     * @param {number} scrollSpeed - Current speed of the environment scroll (player's effective speed).
     */
    updatePosition(delta, scrollSpeed) {
        if (!this.isActive || !this.mesh) return;

        // Oncoming speed is absolute, but scales slightly with player gear
        const baseSpeed = Constants.ONCOMING_CAR_FIXED_SPEED;

        // Effective closing speed is the obstacle's base speed plus the player's speed (scrollSpeed)
        const effectiveClosingSpeed = baseSpeed + scrollSpeed;

        // Move obstacle towards the player (positive Z increment)
        this.mesh.position.z += effectiveClosingSpeed * 60 * delta;
        this.updateBoundingBox();
    }
} 