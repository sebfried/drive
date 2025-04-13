/**
 * @fileoverview Main game orchestrator class.
 * @module core/Game
 */

import * as THREE from 'three';
import * as Constants from '../config/constants.js';
import { AllModelAssets, PlayerCarModels } from '../config/models.config.js';

// Core Managers (from ./index.js)
import {
    EventEmitter,
    GameState,
    States,
    SceneManager,
    InputManager,
    UIManager,
    TouchControls
} from './index.js';

// Game Modules (from barrel files)
import { AssetManager } from '../assets/index.js';
import { Player } from '../game/player/index.js';
import { ObstacleManager } from '../game/obstacles/index.js';
import { Road } from '../game/road/index.js';
import { DifficultyManager } from '../game/difficulty/index.js';

const HIGH_SCORE_STORAGE_KEY = 'endlessRacerHighScore';

export default class Game {
    constructor(containerElement = document.body) {
        this.containerElement = containerElement;

        // Core Components
        this.eventEmitter = new EventEmitter();
        this.gameState = new GameState(this.eventEmitter);
        this.sceneManager = new SceneManager(this.containerElement); // Pass container
        this.inputManager = new InputManager(); // Uses document.body by default
        this.uiManager = new UIManager(this.eventEmitter, this.gameState);
        this.touchControls = null;
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
        this.highScore = 0; // Add property to hold high score

        // Bind methods
        this._animate = this._animate.bind(this);
        this._handleCollision = this._handleCollision.bind(this);
        this._handleGameOverInput = this._handleGameOverInput.bind(this);
        this._handleInputAction = this._handleInputAction.bind(this);
        this._onEnterRunning = this._onEnterRunning.bind(this);
        this._onEnterGameOver = this._onEnterGameOver.bind(this);

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
        this.eventEmitter.on(`gameState:enter:${States.RUNNING}`, this._onEnterRunning);
        this.eventEmitter.on(`gameState:enter:${States.GAME_OVER}`, this._onEnterGameOver);
        document.addEventListener('keydown', this._handleGameOverInput, false);
        
        this.eventEmitter.on('swipeLeft', () => this._handleInputAction({ action: 'moveLeft' }));
        this.eventEmitter.on('swipeRight', () => this._handleInputAction({ action: 'moveRight' }));
        this.eventEmitter.on('brakeStart', () => this._handleInputAction({ action: 'brakeStart' }));
        this.eventEmitter.on('brakeEnd', () => this._handleInputAction({ action: 'brakeEnd' }));
        this.eventEmitter.on('swipeUp', () => this._handleInputAction({ action: 'gearUp' }));
        this.eventEmitter.on('swipeDown', () => this._handleInputAction({ action: 'gearDown' }));

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
        // --- Load High Score --- 
        this.highScore = parseInt(localStorage.getItem(HIGH_SCORE_STORAGE_KEY) || '0', 10);
        console.log('Loaded High Score:', this.highScore);
        // --- End Load High Score ---
        
        this.gameState.setState(States.LOADING);
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
            
            if (this.sceneManager.renderer?.domElement) {
                this.touchControls = new TouchControls(this.sceneManager.renderer.domElement, this.eventEmitter);
            } else {
                console.error('TouchControls could not be initialized: SceneManager renderer or domElement not found.');
            }

            console.log('Game modules initialized. Starting game loop.');
            this.gameState.setState(States.RUNNING); // UIManager hides loading

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
    }

    _triggerGameOver(obstacleType) {
        if (this.gameState.is(States.GAME_OVER)) return;
        console.log(`Game Over triggered by collision with: ${obstacleType || 'unknown'}`);
        
        // --- High Score Logic --- 
        const currentScore = Math.floor(this.score);
        let isNewHighScore = false;
        if (currentScore > this.highScore) {
            console.log(`New High Score! ${currentScore} > ${this.highScore}`);
            this.highScore = currentScore;
            localStorage.setItem(HIGH_SCORE_STORAGE_KEY, this.highScore.toString());
            isNewHighScore = true;
        }
        // --- End High Score Logic ---
        
        // --- Get Max Gear --- 
        const maxGear = this.player?.maxGearReached || 1;
        // --- End Get Max Gear ---
        
        this.gameState.setState(States.GAME_OVER); 
        // Pass all relevant info to UIManager
        this.uiManager.updateFinalScore(currentScore, this.highScore, maxGear, isNewHighScore);
    }

    _animate() {
        console.log("Game._animate executing...");
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
        if (this.player?.mesh) { // Check if player and mesh exist
            // Calculate target camera position based on player and offsets
            const targetPosX = 0; // NEW: Lock camera X to center of road (X=0)
            const targetPosY = this.player.mesh.position.y + Constants.CAMERA_OFFSET_Y;
            const targetPosZ = this.player.mesh.position.z + Constants.CAMERA_OFFSET_Z;

            // Calculate target look-at point ahead of player
            const lookAtPosX = 0; // NEW: Look at center of road X (X=0)
            const lookAtPosY = this.player.mesh.position.y; // Look at player's height
            const lookAtPosZ = this.player.mesh.position.z - Constants.CAMERA_LOOKAT_OFFSET_Z;
            const lookAtPoint = new THREE.Vector3(lookAtPosX, lookAtPosY, lookAtPosZ);

            // Smoothly move camera towards target position (optional, but recommended)
            // this.sceneManager.camera.position.lerp(new THREE.Vector3(targetPosX, targetPosY, targetPosZ), delta * 5); // Adjust lerp factor (e.g., 5) for smoothness
            // OR: Set directly for testing
             this.sceneManager.camera.position.set(targetPosX, targetPosY, targetPosZ);
            
            // Always update lookAt
            this.sceneManager.camera.lookAt(lookAtPoint);
            
        } else {
            // Fallback or initial state handling if player/mesh doesn't exist yet
            // Maybe use the initial position calculation from SceneManager?
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
                // Allow queuing: Decrement targetLaneIndex directly
                this.targetLaneIndex = Math.max(0, this.targetLaneIndex - 1);
                break;
            case 'moveRight':
                // Allow queuing: Increment targetLaneIndex directly
                this.targetLaneIndex = Math.min(Constants.lanePositions.length - 1, this.targetLaneIndex + 1);
                break;
            case 'gearUp':
                this.player.shiftGearUp();
                break;
            case 'gearDown':
                this.player.shiftGearDown();
                break;
            case 'brakeStart':
                this.player.startBraking();
                break;
            case 'brakeEnd':
                this.player.stopBraking();
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

    _onEnterRunning() {
        console.log('Entering RUNNING state. Starting clock and animation.');
        this.clock.start();
        this._animate(); // Start the animation loop
    }

    _onEnterGameOver() {
        console.log('Entering GAME_OVER state. Stopping clock.');
        this.clock.stop();
    }

    // Cleanup
    dispose() {
        // Stop animation loop
        // remove event listeners
        this.eventEmitter.off('collision', this._handleCollision);
        this.inputManager.off('input:action', this._handleInputAction);
        this.eventEmitter.off(`gameState:enter:${States.RUNNING}`, this._onEnterRunning);
        this.eventEmitter.off(`gameState:enter:${States.GAME_OVER}`, this._onEnterGameOver);
        document.removeEventListener('keydown', this._handleGameOverInput, false);
        
        this.eventEmitter.off('swipeLeft');
        this.eventEmitter.off('swipeRight');
        this.eventEmitter.off('brakeStart');
        this.eventEmitter.off('brakeEnd');
        this.eventEmitter.off('swipeUp');
        this.eventEmitter.off('swipeDown');

        if (this.uiManager.restartButton) {
            this.uiManager.restartButton.onclick = null;
        }

        // Dispose managers
        this.sceneManager.dispose();
        this.inputManager.dispose();
        this.uiManager.dispose();
        this.touchControls?.dispose();
        // Add dispose for other modules if needed

        console.log('Game instance disposed.');
    }
} 