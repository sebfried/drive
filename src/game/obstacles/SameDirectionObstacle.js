/**
 * @fileoverview Represents obstacles moving in the same direction as the player.
 * @module game/obstacles/SameDirectionObstacle
 */

import BaseObstacle from './BaseObstacle.js';
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
     * Overrides base updatePosition to include specific speed logic.
     * NOTE: Speed calculation currently depends on difficultyManager and currentScrollSpeed,
     * which are available in the ObstacleManager's update loop.
     * For true encapsulation, this calculation should ideally move here, requiring
     * difficultyManager and currentScrollSpeed to be passed into this update method.
     * For now, we might keep the calculation in the manager or just use the base method.
     * Let's stick to the base method for now and refine in a later step if needed.
     */
    // updatePosition(delta, scrollSpeed, difficultyParams) {
    //     if (!this.isActive || !this.mesh) return;
    //     const relativeSpeedFactor = difficultyParams.slowCarSpeedFactor; // Adjust base factor?
    //     const relativeSpeed = scrollSpeed * relativeSpeedFactor;
    //     const actualSpeed = scrollSpeed + relativeSpeed;
    //     this.mesh.position.z += actualSpeed * 60 * delta;
    //     this.updateBoundingBox();
    // }
} 