/**
 * @fileoverview Represents static obstacles like trees on the roadside.
 * @module game/obstacles/StaticObstacle
 */

import BaseObstacle from './BaseObstacle.js';

export default class StaticObstacle extends BaseObstacle {
    /**
     * @param {object} config
     * @param {THREE.Mesh | THREE.Group} config.mesh - The 3D mesh/group.
     */
    constructor({ mesh }) {
        // Pass type explicitely for clarity
        super({ type: 'static', mesh });
        // Static obstacles might have specific properties later
    }

    // Static obstacles use the default updatePosition from BaseObstacle
    // (moves with the scroll speed)
} 