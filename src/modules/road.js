import * as THREE from 'three';
import * as Constants from './constants.js';

/**
 * @class Road
 * Manages the creation, pooling, and scrolling of road segments.
 */
export default class Road {
    /**
     * Creates a Road manager instance.
     * @param {THREE.Scene} scene - The scene to add road segment groups to.
     */
    constructor(scene) {
        /** @type {THREE.Scene} Reference to the main scene. */
        this.scene = scene;
        /** @type {THREE.Group[]} Pool of road segment groups. */
        this.segments = [];

        this._initializeSegments();
    }

    /**
     * Creates the initial pool of road segments.
     * @private
     */
    _initializeSegments() {
        for (let i = 0; i < Constants.NUM_ROAD_SEGMENTS; i++) {
            const segment = this._createSingleSegment();
            segment.position.z = -i * Constants.ROAD_SEGMENT_LENGTH + Constants.ROAD_SEGMENT_LENGTH / 2;
            this.scene.add(segment);
            this.segments.push(segment);
        }
    }

    /**
     * Creates a single road segment mesh group.
     * @private
     * @returns {THREE.Group}
     */
    _createSingleSegment() {
        const segmentGroup = new THREE.Group();

        // Road Surface
        const roadGeometry = new THREE.PlaneGeometry(Constants.ROAD_WIDTH, Constants.ROAD_SEGMENT_LENGTH);
        const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const roadSurface = new THREE.Mesh(roadGeometry, roadMaterial);
        roadSurface.rotation.x = -Math.PI / 2;
        segmentGroup.add(roadSurface);

        // Lane Lines
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
        const halfLength = Constants.ROAD_SEGMENT_LENGTH / 2;

        // Center dashed line
        const centerLinePoints = [];
        for (let z = -halfLength; z <= halfLength; z += 1) {
            if (Math.floor(z) % 2 === 0) {
                centerLinePoints.push(new THREE.Vector3(0, 0.01, z));
                centerLinePoints.push(new THREE.Vector3(0, 0.01, z + 0.5));
            }
        }
        const centerLineGeometry = new THREE.BufferGeometry().setFromPoints(centerLinePoints);
        const centerLine = new THREE.LineSegments(centerLineGeometry, lineMaterial);
        segmentGroup.add(centerLine);

        // Outer solid lines
        const leftLinePoints = [ new THREE.Vector3(-Constants.LANE_WIDTH, 0.01, -halfLength), new THREE.Vector3(-Constants.LANE_WIDTH, 0.01, halfLength) ];
        const rightLinePoints = [ new THREE.Vector3(Constants.LANE_WIDTH, 0.01, -halfLength), new THREE.Vector3(Constants.LANE_WIDTH, 0.01, halfLength) ];
        const leftLineGeometry = new THREE.BufferGeometry().setFromPoints(leftLinePoints);
        const rightLineGeometry = new THREE.BufferGeometry().setFromPoints(rightLinePoints);
        const leftLine = new THREE.Line(leftLineGeometry, lineMaterial);
        const rightLine = new THREE.Line(rightLineGeometry, lineMaterial);
        segmentGroup.add(leftLine);
        segmentGroup.add(rightLine);

        return segmentGroup;
    }

    /**
     * Updates the position of road segments for scrolling effect and recycles them.
     * @param {number} delta - Time delta since last frame.
     * @param {number} cameraPositionZ - Z position of the camera.
     */
    update(delta, cameraPositionZ) {
        this.segments.forEach(segment => {
            segment.position.z += Constants.SCROLL_SPEED * 60 * delta;
            const recycleThreshold = cameraPositionZ + Constants.ROAD_SEGMENT_LENGTH * 1.5;
            if (segment.position.z > recycleThreshold) {
                segment.position.z -= Constants.NUM_ROAD_SEGMENTS * Constants.ROAD_SEGMENT_LENGTH;
            }
        });
    }

    /**
     * Resets road segments to their initial positions (if needed, currently scrolling handles position).
     */
    reset() {
        // Currently, the continuous scrolling handles repositioning.
        // If a hard reset of positions were needed, it would go here.
        // For now, ensure segments are positioned correctly initially.
        // This might involve re-running logic similar to _initializeSegments
        // if segment positions could drift over time (unlikely with current logic).
         for (let i = 0; i < this.segments.length; i++) {
            const segment = this.segments[i];
            segment.position.z = -i * Constants.ROAD_SEGMENT_LENGTH + Constants.ROAD_SEGMENT_LENGTH / 2;
        }
    }
} 