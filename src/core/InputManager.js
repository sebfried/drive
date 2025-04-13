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

        // Bind methods to ensure 'this' context is correct
        this._handleKeyDown = this._handleKeyDown.bind(this);
        this._handleKeyUp = this._handleKeyUp.bind(this);
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
        // TODO: Add touch/mouse listeners (e.g., pointerdown, pointermove)
    }

    /**
     * Removes event listeners.
     * @public
     */
    dispose() {
        document.removeEventListener('keydown', this._handleKeyDown, false);
        document.removeEventListener('keyup', this._handleKeyUp, false);
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
     * Returns the current state of tracked keys.
     * Useful for continuous actions based on held keys (though events are preferred).
     * @returns {object}
     * @public
     */
    getKeyStates() {
        return this.keyStates;
    }
} 