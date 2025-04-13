/**
 * @fileoverview Manages user input from keyboard and potentially touch/mouse,
 * emitting standardized events.
 * @module core/InputManager
 */

import EventEmitter from './EventEmitter.js';

/**
 * Handles keyboard and other input events, emitting standardized game actions.
 * @extends {EventEmitter}
 */
export default class InputManager extends EventEmitter {
    /**
     * @param {HTMLElement} targetElement - The DOM element to attach listeners to (usually document.body).
     */
    constructor() {
        super(); // Initialize EventEmitter

        this.targetElement = document.body; // Default target
        this.keyStates = {
            ArrowLeft: false,
            ArrowRight: false,
            ArrowUp: false,
            ArrowDown: false,
            a: false,
            d: false,
            w: false,
            s: false,
        };

        // Touch state variables
        this.touchStartX = 0;
        this.touchStartY = 0;

        // Bind methods to ensure 'this' context is correct
        this._handleKeyDown = this._handleKeyDown.bind(this);
        this._handleKeyUp = this._handleKeyUp.bind(this);
        this._handleTouchStart = this._handleTouchStart.bind(this);
        this._handleTouchEnd = this._handleTouchEnd.bind(this);
        // TODO: Add touch/mouse event handlers

        this._attachListeners();
    }

    /**
     * Attaches the necessary event listeners to the target element.
     * @private
     */
    _attachListeners() {
        document.addEventListener('keydown', this._handleKeyDown, false);
        document.addEventListener('keyup', this._handleKeyUp, false);
        this.targetElement.addEventListener('touchstart', this._handleTouchStart, { passive: true });
        this.targetElement.addEventListener('touchend', this._handleTouchEnd, false);
        // TODO: Add touch/mouse listeners (e.g., pointerdown, pointermove)
    }

    /**
     * Removes event listeners.
     * @public
     */
    dispose() {
        document.removeEventListener('keydown', this._handleKeyDown, false);
        document.removeEventListener('keyup', this._handleKeyUp, false);
        this.targetElement.removeEventListener('touchstart', this._handleTouchStart);
        this.targetElement.removeEventListener('touchend', this._handleTouchEnd);
        // TODO: Remove touch/mouse listeners
        console.log('InputManager disposed.');
    }

    /**
     * Handles key down events.
     * @param {KeyboardEvent} event
     * @private
     */
    _handleKeyDown(event) {
        const key = event.key;
        if (key in this.keyStates) {
            // Prevent emitting repeated events for held keys if state is already true
            if (!this.keyStates[key]) { 
                this.keyStates[key] = true;
                this._emitActionForKey(key, 'down'); 
            }
        }
    }

    /**
     * Handles key up events.
     * @param {KeyboardEvent} event
     * @private
     */
    _handleKeyUp(event) {
        const key = event.key;
        if (key in this.keyStates) {
            this.keyStates[key] = false;
            this._emitActionForKey(key, 'up'); 
            // Maybe emit a generic 'keyUp' event as well?
            // this.emit('input:keyUp', { key }); 
        }
    }
    
    /**
     * Emits a specific game action event based on the key pressed/released.
     * @param {string} key - The key identifier (e.g., 'ArrowLeft', 'w').
     * @param {'down' | 'up'} state - Whether the key was pressed ('down') or released ('up').
     * @private
     */
    _emitActionForKey(key, state) {
        // For now, only emit actions on key DOWN
        if (state === 'down') {
            switch (key) {
                case 'ArrowLeft':
                case 'a':
                    this.emit('input:action', { action: 'moveLeft' });
                    break;
                case 'ArrowRight':
                case 'd':
                    this.emit('input:action', { action: 'moveRight' });
                    break;
                case 'ArrowUp':
                case 'w':
                    this.emit('input:action', { action: 'gearUp' });
                    break;
                case 'ArrowDown':
                case 's':
                    this.emit('input:action', { action: 'gearDown' });
                    break;
            }
        }
        // We might add separate events for key up later if needed
    }

    /**
     * Records the starting position of a touch.
     * @param {TouchEvent} event
     * @private
     */
    _handleTouchStart(event) {
        // Use the first touch point
        if (event.touches.length > 0) {
            this.touchStartX = event.touches[0].clientX;
            this.touchStartY = event.touches[0].clientY;
        }
    }

    /**
     * Calculates swipe direction on touch end and emits the corresponding action.
     * @param {TouchEvent} event
     * @private
     */
    _handleTouchEnd(event) {
        // Ensure we have a start position
        if (this.touchStartX === 0 && this.touchStartY === 0) {
            return;
        }

        // Use the first changed touch point
        if (event.changedTouches.length > 0) {
            const touchEndX = event.changedTouches[0].clientX;
            const touchEndY = event.changedTouches[0].clientY;

            const deltaX = touchEndX - this.touchStartX;
            const deltaY = touchEndY - this.touchStartY;

            const swipeThreshold = 25; // Minimum pixels for a valid swipe (reduced for responsiveness)

            // Check if it's more horizontal or vertical
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // Horizontal swipe
                if (deltaX > swipeThreshold) {
                    this.emit('input:action', { action: 'moveRight' });
                } else if (deltaX < -swipeThreshold) {
                    this.emit('input:action', { action: 'moveLeft' });
                }
            } else {
                // Vertical swipe
                if (deltaY > swipeThreshold) {
                    this.emit('input:action', { action: 'gearDown' });
                } else if (deltaY < -swipeThreshold) {
                    this.emit('input:action', { action: 'gearUp' });
                }
            }
        }

        // Reset start coordinates
        this.touchStartX = 0;
        this.touchStartY = 0;
    }

    /**
     * Returns the current state of tracked keys.
     * Useful for continuous actions based on held keys (though events are preferred).
     * @returns {object}
     * @public
     */
    getKeyStates() {
        return this.keyStates;
    }
} 