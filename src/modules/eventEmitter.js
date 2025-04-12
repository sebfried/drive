/**
 * @fileoverview Basic Event Emitter implementation.
 */

/**
 * Allows for subscribing to and emitting events.
 */
export default class EventEmitter {
    constructor() {
        /** @private @type {Object.<string, Function[]>} */
        this.events = {};
    }

    /**
     * Subscribe to an event.
     * @param {string} eventName - The name of the event to subscribe to.
     * @param {Function} listener - The callback function to execute when the event is emitted.
     * @returns {Function} An unsubscribe function.
     */
    on(eventName, listener) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(listener);
        // Return an unsubscribe function
        return () => {
            this.off(eventName, listener);
        };
    }

    /**
     * Unsubscribe from an event.
     * @param {string} eventName - The name of the event to unsubscribe from.
     * @param {Function} listener - The specific listener function to remove.
     */
    off(eventName, listener) {
        if (!this.events[eventName]) {
            return;
        }
        this.events[eventName] = this.events[eventName].filter(l => l !== listener);
    }

    /**
     * Emit an event, calling all subscribed listeners.
     * @param {string} eventName - The name of the event to emit.
     * @param {...*} args - Arguments to pass to the listeners.
     */
    emit(eventName, ...args) {
        if (!this.events[eventName]) {
            return;
        }
        // Use slice to avoid issues if a listener unsubscribes itself during iteration
        this.events[eventName].slice().forEach(listener => {
            listener(...args);
        });
    }
} 