/**
 * @fileoverview Main game orchestrator class.
 * @module core/Game
 */

import * as THREE from 'three';
import * as Constants from '../config/constants.js';
import { AllModelAssets, PlayerCarModels } from '../config/models.config.js';

// Core Managers
import EventEmitter from './EventEmitter.js';
import GameState, { States } from './GameState.js';
import SceneManager from './SceneManager.js';
import InputManager from './InputManager.js';
import UIManager from './UIManager.js';

// Game Modules (Updated Paths & Names)
import AssetManager from '../assets/AssetManager.js';
import Player from '../game/player/Player.js';
import ObstacleManager from '../game/obstacles/ObstacleManager.js';
import Road from '../game/road/Road.js';
import DifficultyManager from '../game/difficulty/DifficultyManager.js';

export default class Game {
    constructor(containerElement = document.body) {
        this.containerElement = containerElement;

        // Core Components
        this.eventEmitter = new EventEmitter();
        this.gameState = new GameState(this.eventEmitter);
        this.sceneManager = new SceneManager(this.containerElement); // Pass container
        this.inputManager = new InputManager(); // Uses document.body by default
        this.uiManager = new UIManager(this.eventEmitter, this.gameState);
        this.assetManager = AssetManager; // CORRECT: Use the imported singleton instance directly
        this.difficultyManager = DifficultyManager; // CORRECT: Use imported singleton instance
        this.clock = new THREE.Clock();

        // Game Objects (initialized later)
        this.player = null;
        this.road = null;
        this.obstaclesManager = null;

        // Game State Variables
        this.targetLaneIndex = Constants.START_LANE_INDEX;
        this.score = 0;

        // Bind methods
        this._animate = this._animate.bind(this);
        this._handleCollision = this._handleCollision.bind(this);
        this._handleGameOverInput = this._handleGameOverInput.bind(this);
        this._handleInputAction = this._handleInputAction.bind(this);

        console.log('Game instance created.');
    }

    async start() {
        console.log('Starting game initialization...');
        this._setupEventListeners();
        await this._initializeGame();
    }

    _setupEventListeners() {
        this.eventEmitter.on('collision', this._handleCollision);
        this.inputManager.on('input:action', this._handleInputAction);
        document.addEventListener('keydown', this._handleGameOverInput, false);
        if (this.uiManager.restartButton) {
            this.uiManager.restartButton.onclick = () => {
                console.log("Restart button clicked! Calling this.resetGame(). 'this' context:", this);
                this.resetGame();
            };
        } else {
             console.error('Restart button not found by UIManager.');
        }
    }

    async _initializeGame() {
        this.gameState.setState(States.LOADING); // UIManager will show loading
        this.uiManager.showLoading();

        try {
            const assetsToPreload = AllModelAssets;
            console.log(`Preloading ${assetsToPreload.length} assets...`);
            if (assetsToPreload.length > 0) {
                await this.assetManager.preload(assetsToPreload);
            }
            console.log('Asset preloading complete. Initializing modules...');

            // Randomly select player car type
            const availableCarTypes = Object.keys(PlayerCarModels);
            const randomCarIndex = Math.floor(Math.random() * availableCarTypes.length);
            const randomCarType = availableCarTypes[randomCarIndex];
            console.log(`Selected player car: ${randomCarType}`);

            // Instantiate game objects, using correct paths/names
            this.player = new Player(this.sceneManager.scene, randomCarType);
            this.road = new Road(this.sceneManager.scene);
            this.obstaclesManager = new ObstacleManager(this.sceneManager.scene, this.eventEmitter, this.assetManager);

            console.log('Game modules initialized. Starting game loop.');
            this.gameState.setState(States.RUNNING); // UIManager hides loading
            this.clock.start();
            this._animate(); // Start the game loop

        } catch (error) {
            console.error('Initialization failed:', error);
            this.uiManager.showLoadingError();
        }
    }

    resetGame() {
        if (!this.player || !this.road || !this.obstaclesManager) {
            console.error('Cannot reset game, core modules not initialized.');
            return;
        }
        console.log('Resetting game...');
        this.score = 0;
        this.uiManager.updateScore(this.score);

        this.targetLaneIndex = Constants.START_LANE_INDEX;
        this.player.reset();
        this.obstaclesManager.reset();
        this.road.reset();
        this.difficultyManager.reset();

        this.gameState.setState(States.RUNNING);
        this.clock.start(); // Restart clock
        this._animate(); // Explicitly restart the animation loop
    }

    _triggerGameOver(obstacleType) {
        if (this.gameState.is(States.GAME_OVER)) return;
        console.log(`Game Over triggered by collision with: ${obstacleType || 'unknown'}`);
        this.gameState.setState(States.GAME_OVER); // UIManager shows overlay
        this.uiManager.updateFinalScore(this.score);
        this.clock.stop();
    }

    _animate() {
        console.log("Game._animate executing...");
        if (!this.gameState.is(States.RUNNING)) {
            return; // Stop loop if not running
        }
        requestAnimationFrame(this._animate);

        const delta = this.clock.getDelta();

        // --- Calculate Speed & Score --- 
        const gearMultiplier = 1 + (this.player.currentGear - 1) * Constants.GEAR_SPEED_INCREMENT;
        const laneChangeBoost = this.player.isChangingLanes ? Constants.LANE_CHANGE_SPEED_BOOST_FACTOR : 1.0;
        const currentScrollSpeed = Constants.SCROLL_SPEED * gearMultiplier * laneChangeBoost;
        const scoreIncrease = Constants.SCROLL_SPEED * (1 + (this.player.currentGear - 1) * Constants.GEAR_SPEED_INCREMENT * 0.5) * 60 * delta * Constants.SCORE_MULTIPLIER;
        this.score += scoreIncrease;

        // --- Update UI --- 
        this.uiManager.updateScore(this.score);
        this.uiManager.updateGear(this.player.currentGear);
        this.difficultyManager.updateScore(this.score); // Update difficulty logic
        const currentDifficultyParams = this.difficultyManager.getCurrentParams();
        this.uiManager.updateDifficulty(currentDifficultyParams.level, currentDifficultyParams.name);

        // --- Update Game Objects --- 
        this.road.update(delta, this.sceneManager.camera.position.z, currentScrollSpeed);
        this.player.update(delta, this.targetLaneIndex);
        this.obstaclesManager.update(delta, this.sceneManager.camera.position.z, this.player, currentScrollSpeed);

        // --- Update Camera --- 
        if (this.player.mesh) {
            const targetPlayerScreenYRatio = 0.25;
            const cameraCenterZ = this.player.mesh.position.z - Constants.ORTHO_CAMERA_VIEW_HEIGHT * (0.75 - 0.5);
            this.sceneManager.updateCameraPosition(cameraCenterZ);
        }

        // --- Render --- 
        this.sceneManager.render();
    }

    // --- Event Handlers --- 
    _handleCollision(data) {
        this._triggerGameOver(data?.type);
    }

    _handleInputAction({ action }) {
        if (!this.gameState.is(States.RUNNING) || !this.player) return;

        switch (action) {
            case 'moveLeft':
                if (!this.player.isChangingLanes) {
                     this.targetLaneIndex = Math.max(0, this.player.currentLaneIndex - 1);
                }
                break;
            case 'moveRight':
                if (!this.player.isChangingLanes) {
                    this.targetLaneIndex = Math.min(Constants.lanePositions.length - 1, this.player.currentLaneIndex + 1);
                }
                break;
            case 'gearUp':
                this.player.shiftGearUp();
                break;
            case 'gearDown':
                this.player.shiftGearDown();
                break;
        }
    }

    _handleGameOverInput(event) {
        if (this.gameState.is(States.GAME_OVER)) {
            if (event.key === 'Enter' || event.key === ' ') { // Space bar
                this.resetGame();
            }
        }
    }

    // Cleanup
    dispose() {
        // Stop animation loop
        // remove event listeners
        this.eventEmitter.off('collision', this._handleCollision);
        this.inputManager.off('input:action', this._handleInputAction);
        document.removeEventListener('keydown', this._handleGameOverInput, false);
        if (this.uiManager.restartButton) {
            this.uiManager.restartButton.onclick = null;
        }

        // Dispose managers
        this.sceneManager.dispose();
        this.inputManager.dispose();
        this.uiManager.dispose();
        // Add dispose for other modules if needed

        console.log('Game instance disposed.');
    }
} 