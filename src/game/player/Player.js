import * as THREE from 'three';
// import assetManager from './assetManager.js';
// import assetManager from '../../assets/AssetManager.js'; // Old Path
import { AssetManager } from '../../assets/index.js'; // Use barrel file
// import * as Constants from '../config/constants.js';
import * as Constants from '../../config/constants.js'; // Updated Path
// import { PlayerCarModels } from '../config/models.config.js';
import { PlayerCarModels } from '../../config/models.config.js'; // Updated Path

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
        /** @type {number} The current gear level (1 or higher). */
        this.currentGear = 1;
        /** @type {object | null} Configuration for the current car model. */
        this.modelConfig = PlayerCarModels[this.carType] || PlayerCarModels.orange; // Fallback to orange
        /** @type {number} Timestamp of the last gear shift. */
        this.lastShiftTime = 0;
        /** @type {boolean} Flag indicating if the player is currently changing lanes. */
        this.isChangingLanes = false;
        /** @private @type {boolean} Flag indicating if the player is actively braking. */
        this.isBraking = false;
        /** @private @type {number} Timer accumulating time spent braking for gear reduction. */
        this.brakeTimer = 0;

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
            const originalModel = AssetManager.getAsset(this.modelConfig.url);
            this.mesh = originalModel.clone();

            // Apply scale from config
            const scale = this.modelConfig.scale || 1.0;
            this.mesh.scale.set(scale, scale, scale);

            // Place in scene
            const initialPosition = new THREE.Vector3(
                Constants.lanePositions[this.currentLaneIndex],
                0, // Place model base at y=0 (road level)
                Constants.INITIAL_PLAYER_Z
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
        this.mesh.position.z = Constants.INITIAL_PLAYER_Z;
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
        // If target is different, we are starting or continuing a lane change
        const targetX = Constants.lanePositions[targetLaneIndex];
        const currentX = this.mesh.position.x;
        const proximityThreshold = 0.05; // How close to target to be considered "arrived"

        if (Math.abs(currentX - targetX) > proximityThreshold) {
            this.isChangingLanes = true;
        } else {
            // Snap to target if close enough and stop changing lanes
            this.mesh.position.x = targetX;
            this.isChangingLanes = false;
        }

        // Update currentLaneIndex based on the *target*, not current position during lerp
        this.currentLaneIndex = targetLaneIndex;
        
        // Use lerp for smooth lane changing
        // Only lerp if we haven't snapped
        if (this.isChangingLanes) {
             this.mesh.position.x = THREE.MathUtils.lerp(currentX, targetX, delta * 10);
        }

        // Update bounding box after moving
        this.boundingBox.setFromObject(this.mesh);

        // --- Handle Gradual Braking --- 
        if (this.isBraking && this.currentGear > 1) {
            this.brakeTimer += delta;
            if (this.brakeTimer >= Constants.BRAKE_GEAR_REDUCTION_INTERVAL) {
                this.currentGear--;
                this.brakeTimer = 0; // Reset timer for next gear reduction
                console.log("Braking... Gear reduced to:", this.currentGear);
                if (this.currentGear === 1) {
                    this.stopBraking(); // Automatically stop braking process when gear 1 is reached
                }
            }
        }
    }

    /**
     * Shifts the player's gear up by one.
     */
    shiftGearUp() {
        this.stopBraking(); // Cancel braking if accelerating
        const now = Date.now();
        if (now - this.lastShiftTime < Constants.GEAR_SHIFT_COOLDOWN) {
            return; // Cooldown active
        }
        this.currentGear++;
        console.log("Shifted Up to Gear:", this.currentGear);
        this.lastShiftTime = now;
        // TODO: Add feedback (sound/visual)
    }

    /**
     * Shifts the player's gear down by one, minimum gear 1.
     */
    shiftGearDown() {
        const now = Date.now();
        if (now - this.lastShiftTime < Constants.GEAR_SHIFT_COOLDOWN) {
            return; // Cooldown active
        }
        this.currentGear = Math.max(1, this.currentGear - 1);
        console.log("Shifted Down to Gear:", this.currentGear);
        this.lastShiftTime = now;
        // TODO: Add feedback (sound/visual)
    }

    /**
     * Starts the braking process.
     */
    startBraking() {
        if (this.currentGear > 1) { // No need to brake if already in gear 1
             this.isBraking = true;
             this.brakeTimer = 0;
             console.log("Braking Started...");
        }
    }

    /**
     * Stops the braking process.
     */
    stopBraking() {
        if (this.isBraking) {
            this.isBraking = false;
            this.brakeTimer = 0;
            console.log("Braking Stopped.");
        }
    }

    /**
     * Resets the player car to its starting position.
     */
    reset() {
        this.currentLaneIndex = Constants.START_LANE_INDEX;
        this.lastShiftTime = 0; // Reset cooldown timer
        this.isChangingLanes = false; // Reset flag
        if (this.mesh) {
            this.mesh.position.x = Constants.lanePositions[this.currentLaneIndex];
            this.mesh.position.z = Constants.INITIAL_PLAYER_Z;
            this.currentGear = 1; // Reset gear on game reset
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