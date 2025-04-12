import * as THREE from 'three';
import * as Constants from './constants.js';

/**
 * @class Player
 * Manages the player's car, including its mesh, movement, and collision box.
 */
export default class Player {
    /**
     * Creates a player car instance.
     * @param {THREE.Scene} scene - The scene to add the car mesh to.
     */
    constructor(scene) {
        /** @type {THREE.Mesh} The visual representation of the player car. */
        this.mesh = null;
        /** @type {THREE.Box3} The bounding box for collision detection. */
        this.boundingBox = new THREE.Box3();
        /** @type {number} The current lane index (0-3). */
        this.currentLaneIndex = Constants.START_LANE_INDEX;
        /** @type {THREE.Scene} Reference to the main scene. */
        this.scene = scene;

        this._createMesh();
    }

    /**
     * Creates the player car mesh and adds it to the scene.
     * @private
     */
    _createMesh() {
        const carGeometry = new THREE.BoxGeometry(Constants.CAR_WIDTH, Constants.CAR_HEIGHT, Constants.CAR_LENGTH);
        const carMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red car
        this.mesh = new THREE.Mesh(carGeometry, carMaterial);

        // Position the car initially
        this.mesh.position.y = Constants.CAR_HEIGHT / 2;
        this.mesh.position.z = Constants.cameraYPosition - Constants.ROAD_SEGMENT_LENGTH * 1.5;
        this.mesh.position.x = Constants.lanePositions[this.currentLaneIndex];

        this.scene.add(this.mesh);
        this.boundingBox.setFromObject(this.mesh);
    }

    /**
     * Updates the player car's position based on the target lane.
     * @param {number} delta - Time delta since last frame.
     * @param {number} targetLaneIndex - The lane index the player is moving towards.
     */
    update(delta, targetLaneIndex) {
        this.currentLaneIndex = targetLaneIndex;
        const targetX = Constants.lanePositions[this.currentLaneIndex];
        // Use lerp for smooth lane changing
        this.mesh.position.x = THREE.MathUtils.lerp(this.mesh.position.x, targetX, delta * 10);
        // Update bounding box after moving
        this.boundingBox.setFromObject(this.mesh);
    }

     /**
     * Resets the player car to its starting position.
     */
    reset() {
        this.currentLaneIndex = Constants.START_LANE_INDEX;
        if (this.mesh) {
            this.mesh.position.x = Constants.lanePositions[this.currentLaneIndex];
            this.mesh.position.z = Constants.cameraYPosition - Constants.ROAD_SEGMENT_LENGTH * 1.5;
            this.boundingBox.setFromObject(this.mesh);
        }
    }

    /**
     * Gets the player car mesh.
     * @returns {THREE.Mesh}
     */
    getMesh() {
        return this.mesh;
    }

    /**
     * Gets the player car's bounding box.
     * @returns {THREE.Box3}
     */
    getBoundingBox() {
        return this.boundingBox;
    }
} 