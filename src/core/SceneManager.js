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
        const viewHeight = Constants.ORTHO_CAMERA_VIEW_HEIGHT;
        const viewWidth = viewHeight * aspect;
        const orthoTop = viewHeight / 2;
        const orthoBottom = viewHeight / -2;
        const orthoLeft = viewWidth / -2;
        const orthoRight = viewWidth / 2;

        this.camera = new THREE.OrthographicCamera(
            orthoLeft,
            orthoRight,
            orthoTop,
            orthoBottom,
            0.1,             // near
            1000             // far (Increased significantly)
        );

        // Initial positioning (might be adjusted later based on player)
        const cameraCenterZ = Constants.INITIAL_PLAYER_Z - Constants.ORTHO_CAMERA_VIEW_HEIGHT * (0.75 - 0.5);
        this.camera.position.set(0, 50, cameraCenterZ); // High Y, centered X, Z calculated for framing
        this.camera.rotation.x = -Math.PI / 2; // Rotate to look down Y axis

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
        // Update orthographic camera frustum on resize
        const aspect = window.innerWidth / window.innerHeight;
        const viewHeight = Constants.ORTHO_CAMERA_VIEW_HEIGHT; // Base height
        const viewWidth = viewHeight * aspect; // Calculate width based on aspect

        // Recalculate boundaries
        this.camera.left = viewWidth / -2;
        this.camera.right = viewWidth / 2;
        this.camera.top = viewHeight / 2;
        this.camera.bottom = viewHeight / -2;

        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // Public method to update camera position (e.g., to follow player)
    updateCameraPosition(z) {
        this.camera.position.z = z;
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