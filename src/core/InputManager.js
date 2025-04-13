/**
 * @fileoverview Manages user input (keyboard, pointer, touch) and emits corresponding events.
 * @module core/InputManager
 */

import * as Constants from '../config/constants.js';
import { States } from './GameState.js';

export default class InputManager {
    constructor(eventEmitter, gameState) {
        if (!eventEmitter || !gameState) {
            console.error('InputManager requires EventEmitter and GameState instances.');
            return;
        }
        this.eventEmitter = eventEmitter;
        this.gameState = gameState;

        this.keyStates = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
            w: false,
            a: false,
            s: false,
            d: false,
        };

        this.touchStartY = 0;
        this.touchEndY = 0;

        // Bind methods to ensure correct 'this' context
        this._handleKeyDown = this._handleKeyDown.bind(this);
        this._handleKeyUp = this._handleKeyUp.bind(this);
        this._handlePointerDown = this._handlePointerDown.bind(this);
        this._handleTouchStart = this._handleTouchStart.bind(this);
        this._handleTouchEnd = this._handleTouchEnd.bind(this);

        this._setupEventListeners();
        console.log('InputManager initialized.');
    }

    _setupEventListeners() {
        document.addEventListener('keydown', this._handleKeyDown, false);
        document.addEventListener('keyup', this._handleKeyUp, false);
        document.addEventListener('pointerdown', this._handlePointerDown, false);
        document.addEventListener('touchstart', this._handleTouchStart, { passive: true });
        document.addEventListener('touchend', this._handleTouchEnd, false);
    }

    _handleKeyDown(event) {
        if (this.keyStates.hasOwnProperty(event.key)) {
            this.keyStates[event.key] = true;
            // Note: Game over input (Enter/Space) is still handled separately in main.js for now
        }
    }

    _handleKeyUp(event) {
        if (this.keyStates.hasOwnProperty(event.key)) {
            this.keyStates[event.key] = false;
        }
    }

    _handlePointerDown(event) {
        if (!this.gameState.is(States.RUNNING)) return;

        const clickX = event.clientX;
        const screenWidth = window.innerWidth;
        const side = clickX < screenWidth / 2 ? 'left' : 'right';

        this.eventEmitter.emit('input:pointerTap', { side });
    }

    _handleTouchStart(event) {
        if (!this.gameState.is(States.RUNNING)) return;
        this.touchStartY = event.touches[0].clientY;
    }

    _handleTouchEnd(event) {
        if (!this.gameState.is(States.RUNNING) || this.touchStartY === 0) return;

        this.touchEndY = event.changedTouches[0].clientY;
        const swipeDistanceY = this.touchStartY - this.touchEndY;
        const swipeThreshold = 50; // Minimum pixels for a swipe

        if (Math.abs(swipeDistanceY) > swipeThreshold) {
            const direction = swipeDistanceY > 0 ? 'up' : 'down';
            this.eventEmitter.emit('input:gearShift', { direction });
        }

        this.touchStartY = 0; // Reset touch start Y
    }

    // Public method to get the current key states
    getKeyStates() {
        return this.keyStates;
    }

    // Cleanup method
    dispose() {
        document.removeEventListener('keydown', this._handleKeyDown, false);
        document.removeEventListener('keyup', this._handleKeyUp, false);
        document.removeEventListener('pointerdown', this._handlePointerDown, false);
        document.removeEventListener('touchstart', this._handleTouchStart, false);
        document.removeEventListener('touchend', this._handleTouchEnd, false);
        console.log('InputManager disposed.');
    }
} 