/**
 * @fileoverview Manages the overall game state (loading, running, game over).
 */

// import EventEmitter from '../modules/eventEmitter.js'; // OLD PATH
import EventEmitter from './EventEmitter.js'; // NEW PATH (relative to core/)

/**
 * Enum for game states.
 * @readonly
 * @enum {string}
 */
export const States = {
    INITIALIZING: 'initializing',
    RUNNING: 'running',
    GAME_OVER: 'game_over',
    // PAUSED: 'paused', // Add if pause functionality is needed
};

/**
 * @class GameState
 * Manages the overall state of the game and emits events on state changes.
 */
export default class GameState {
    /**
     * Creates a GameState instance.
     * @param {EventEmitter} eventEmitter - The central event emitter.
     */
    constructor(eventEmitter) {
        /** @private @type {EventEmitter} */
        this.emitter = eventEmitter;
        /** @private @type {States} */
        this.currentState = States.INITIALIZING;
        /** @private @type {States|null} */
        this.previousState = null;

        console.log(`Initial game state: ${this.currentState}`);
    }

    /**
     * Sets the current game state and emits a stateChange event.
     * @param {States} newState - The state to transition to.
     * @param {any} [eventData] - Optional data to pass with the event.
     */
    setState(newState) {
        if (newState === this.currentState) {
            return; // No change
        }
        // Basic validation: Cannot pause from game over, etc. Add more rules if needed.
        if (this.currentState === States.GAME_OVER && newState !== States.INITIALIZING && newState !== States.RUNNING) {
             console.warn(`Cannot transition from GAME_OVER to ${newState}`);
             return;
        }

        this.previousState = this.currentState;
        this.currentState = newState;
        console.log(`Game state changed: ${this.previousState} -> ${this.currentState}`);
        this.emitter.emit('stateChange', { from: this.previousState, to: this.currentState });
    }

    /**
     * Gets the current game state.
     * @returns {States}
     */
    getState() {
        return this.currentState;
    }

    /**
     * Checks if the current state matches the given state.
     * @param {States} state - The state to check against.
     * @returns {boolean}
     */
    is(state) {
        return this.currentState === state;
    }
} 