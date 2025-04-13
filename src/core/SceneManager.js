/**
 * @fileoverview Manages the Three.js scene, camera, renderer, lighting, and resize events.
 * @module core/SceneManager
 */
import * as THREE from 'three';
import * as Constants from '../config/constants.js';

export default class SceneManager {
    constructor(containerElement) {
        if (!containerElement) {
            console.error('SceneManager requires a container element (e.g., document.body).');
            return;
        }
        this.containerElement = containerElement;

        this.scene = null;
        this.camera = null;
        this.renderer = null;

        this._setupScene();
        this._setupCamera();
        this._setupRenderer();
        this._setupLighting();
        this._setupEventListeners();

        console.log('SceneManager initialized.');
    }

    _setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xF5DEB3); // Desert beige / Wheat
    }

    _setupCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        
        // --- Use Perspective Camera --- 
        const fov = 60; // Initial field of view (degrees)
        const near = 0.1;
        const far = 1000;
        this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

        // --- Set Initial Position & LookAt based on Player Start --- 
        const initialPlayerX = Constants.lanePositions[Constants.START_LANE_INDEX];
        const initialPlayerY = 0; // Assuming player starts at Y=0
        const initialPlayerZ = Constants.INITIAL_PLAYER_Z;

        // Position camera behind and above player start
        this.camera.position.set(
            initialPlayerX,
            initialPlayerY + Constants.CAMERA_OFFSET_Y, 
            initialPlayerZ + Constants.CAMERA_OFFSET_Z
        );

        // Look at a point slightly ahead of player start
        this.camera.lookAt(
            initialPlayerX, 
            initialPlayerY, // Look at player's height
            initialPlayerZ - Constants.CAMERA_LOOKAT_OFFSET_Z
        );

        // REMOVED: Initial rotation this.camera.rotation.x = -Math.PI / 2;
        this.scene.add(this.camera);
    }

    _setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.containerElement.appendChild(this.renderer.domElement);
    }

    _setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(5, 10, 7.5);
        this.scene.add(directionalLight);
    }

    _setupEventListeners() {
        // Use bind(this) to ensure 'this' context is correct inside handleResize
        window.addEventListener('resize', this.handleResize.bind(this), false);
    }

    handleResize() {
        // --- Update Perspective Camera --- 
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // Public method to render the scene
    render() {
        console.log("SceneManager.render executing...");
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    // Cleanup method (optional but good practice)
    dispose() {
        window.removeEventListener('resize', this.handleResize.bind(this), false);
        if (this.renderer) {
            this.containerElement.removeChild(this.renderer.domElement);
            this.renderer.dispose();
        }
        // Add disposal for scene objects if necessary
        console.log('SceneManager disposed.');
    }
} 