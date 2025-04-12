import * as THREE from 'three';
import * as Constants from './constants.js';
import assetManager from './assetManager.js';
import { PlayerCarModels } from '../config/models.config.js'; // Import model config

/**
 * @class Player
 * Manages the player's car, including its mesh, movement, and collision box.
 */
export default class Player {
    /**
     * Creates a player car instance.
     * @param {THREE.Scene} scene - The scene to add the car mesh to.
     * @param {string} [carType='orange'] - The type of car model to use (key from PlayerCarModels).
     */
    constructor(scene, carType = 'orange') { // Added carType parameter
        /** @type {THREE.Mesh | null} The visual representation of the player car. */
        this.mesh = null;
        /** @type {THREE.Box3} The bounding box for collision detection. */
        this.boundingBox = new THREE.Box3();
        /** @type {number} The current lane index (0-3). */
        this.currentLaneIndex = Constants.START_LANE_INDEX;
        /** @type {THREE.Scene} Reference to the main scene. */
        this.scene = scene;
        /** @type {string} The type of car model being used. */
        this.carType = carType;
        /** @type {object | null} Configuration for the current car model. */
        this.modelConfig = PlayerCarModels[this.carType] || PlayerCarModels.orange; // Fallback to orange

        if (!PlayerCarModels[this.carType]) {
            console.warn(`Player: Car type '${this.carType}' not found in config. Falling back to orange.`);
        }

        this._createMesh();
    }

    /**
     * Creates the player car mesh based on the configured car type.
     * @private
     */
    _createMesh() {
        if (!this.modelConfig) {
            console.error('Player: No model configuration found. Cannot create mesh.');
            this._createFallbackMesh(); // Use fallback if config is missing
            return;
        }

        try {
            // Retrieve the preloaded model using config URL
            const originalModel = assetManager.getAsset(this.modelConfig.url);
            this.mesh = originalModel.clone();

            // Apply scale from config
            const scale = this.modelConfig.scale || 1.0;
            this.mesh.scale.set(scale, scale, scale);

            // Place in scene
            const initialPosition = new THREE.Vector3(
                Constants.lanePositions[this.currentLaneIndex],
                0, // Place model base at y=0 (road level)
                Constants.cameraYPosition - Constants.ROAD_SEGMENT_LENGTH * 1.5
            );
            this.mesh.position.copy(initialPosition);

            // Calculate rotation in radians from config (assuming config value is degrees)
            let rotationRadians = 0;
            if (this.modelConfig.rotationY !== undefined) {
                // Convert degrees from config to radians for Three.js
                rotationRadians = THREE.MathUtils.degToRad(this.modelConfig.rotationY);
            }

            // Apply final rotation AFTER setting position
            this.mesh.rotation.y = rotationRadians;

            this.scene.add(this.mesh);
            this.boundingBox.setFromObject(this.mesh);
            console.log(`Player model '${this.carType}' loaded and placed.`);

        } catch (error) {
            console.error(`Player: Failed to create mesh for '${this.carType}'. Using fallback.`, error);
            this._createFallbackMesh();
        }
    }

    /**
     * Creates a fallback BoxGeometry mesh if model loading fails.
     * @private
     */
    _createFallbackMesh() {
        const carGeometry = new THREE.BoxGeometry(Constants.CAR_WIDTH, Constants.CAR_HEIGHT, Constants.CAR_LENGTH);
        const carMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(carGeometry, carMaterial);
        // Position the fallback box
        this.mesh.position.y = 0; // Place fallback base at y=0 too
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