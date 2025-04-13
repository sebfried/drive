/**
 * @fileoverview Manages interactions with the HTML UI elements.
 * @module core/UIManager
 */

import { States } from './GameState.js';

export default class UIManager {
    constructor(eventEmitter, gameState) {
        if (!eventEmitter || !gameState) {
            console.error('UIManager requires EventEmitter and GameState instances.');
            return;
        }
        this.eventEmitter = eventEmitter;
        this.gameState = gameState;

        // Cache UI element references
        this.scoreElement = document.getElementById('score');
        this.gearElement = document.getElementById('gearDisplay');
        this.difficultyElement = document.getElementById('difficultyDisplay');
        this.gameOverOverlay = document.getElementById('gameOverOverlay');
        this.finalScoreElement = document.getElementById('finalScore');
        this.restartButton = document.getElementById('restartButton');
        this.loadingOverlay = document.getElementById('loadingOverlay');

        if (!this.scoreElement || !this.gearElement || !this.difficultyElement || !this.gameOverOverlay || !this.finalScoreElement || !this.restartButton || !this.loadingOverlay) {
            console.error('UIManager could not find all required UI elements in the DOM.');
            // Optionally throw an error or handle gracefully
        }

        // Bind methods
        this._handleGameStateChange = this._handleGameStateChange.bind(this);
        this._setupEventListeners();

        console.log('UIManager initialized.');
    }

    _setupEventListeners() {
        // Listen for game state changes to manage overlays
        this.eventEmitter.on('stateChange', this._handleGameStateChange);
        // Note: Restart button listener is still in main.js as it calls resetGame directly
    }

    _handleGameStateChange({ from, to }) {
        if (to === States.LOADING) {
            this.loadingOverlay.style.display = 'flex';
            this.gameOverOverlay.style.display = 'none';
        } else if (to === States.RUNNING) {
            this.loadingOverlay.style.display = 'none';
            this.gameOverOverlay.style.display = 'none';
            this.updateScore(0); // Reset score display on run
        } else if (to === States.GAME_OVER) {
            this.loadingOverlay.style.display = 'none';
            this.gameOverOverlay.style.display = 'flex';
        }
    }

    // --- Public Update Methods ---

    updateScore(score) {
        if (this.scoreElement) {
            this.scoreElement.innerText = `Score: ${Math.floor(score)}m`;
        }
    }

    updateGear(gear) {
        if (this.gearElement) {
            this.gearElement.innerText = `Gear: ${gear}`;
        }
    }

    updateDifficulty(level, name) {
        if (this.difficultyElement) {
            this.difficultyElement.innerText = `Level: ${level} (${name})`;
        }
    }

    updateFinalScore(score) {
        if (this.finalScoreElement) {
            this.finalScoreElement.innerText = `Final Score: ${Math.floor(score)}m`;
        }
    }

    showLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'flex';
            this.loadingOverlay.innerText = 'Loading...'; // Reset text
        }
    }

    showLoadingError() {
        if (this.loadingOverlay) {
            this.loadingOverlay.innerText = 'Error loading assets. Please refresh.';
        }
    }

    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = 'none';
        }
    }

    // Cleanup method
    dispose() {
        this.eventEmitter.off('stateChange', this._handleGameStateChange);
        // Remove other listeners if added here
        console.log('UIManager disposed.');
    }
} 