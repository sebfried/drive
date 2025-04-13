/**
 * @fileoverview Handles touch input for mobile controls (swipe, tap-and-hold).
 * Dispatches custom events for game actions.
 * @module core/TouchControls
 */

import EventEmitter from './EventEmitter.js';

// Configuration constants for touch detection
const SWIPE_THRESHOLD_X = 50; // Minimum horizontal distance for a swipe
const SWIPE_MAX_VERTICAL_MOVE = 50; // Maximum vertical distance allowed during a horizontal swipe
const SWIPE_THRESHOLD_Y = 50; // Minimum vertical distance for a swipe
const SWIPE_MAX_HORIZONTAL_MOVE = 50; // Maximum horizontal distance allowed during a vertical swipe
const HOLD_THRESHOLD_TIME = 250; // Minimum duration in ms for a tap-and-hold

export default class TouchControls {
    /**
     * @param {HTMLElement} targetElement - The HTML element to listen for touch events on (e.g., canvas).
     * @param {EventEmitter} eventEmitter - The game's central event emitter.
     */
    constructor(targetElement, eventEmitter) {
        if (!targetElement || !eventEmitter) {
            throw new Error('TouchControls requires a targetElement and an eventEmitter.');
        }

        this.targetElement = targetElement;
        this.emitter = eventEmitter;

        /** @private {number | null} X coordinate where touch started */
        this.touchStartX = null;
        /** @private {number | null} Y coordinate where touch started */
        this.touchStartY = null;
        /** @private {number | null} Timestamp when touch started */
        this.touchStartTime = null;
        /** @private {boolean} Flag indicating if a touch is currently active */
        this.isTouching = false;
        /** @private {boolean} Flag indicating if a brake hold is currently active */
        this.isBraking = false;
        /** @private {number | null} Timer ID for hold detection */
        this.holdTimer = null;

        // Bind event handlers to this instance
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);

        // Add event listeners
        this.targetElement.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.targetElement.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        this.targetElement.addEventListener('touchend', this.handleTouchEnd);
        this.targetElement.addEventListener('touchcancel', this.handleTouchEnd); // Treat cancel like end

        // Prevent text selection on the target element via CSS
        this.targetElement.style.userSelect = 'none';
        this.targetElement.style.webkitUserSelect = 'none'; // For Safari
        this.targetElement.style.msUserSelect = 'none'; // For IE/Edge
        // Consider applying this style to the body or a game container as well if needed

        console.log('TouchControls initialized.');
    }

    /**
     * Handles the start of a touch event.
     * @param {TouchEvent} event
     */
    handleTouchStart(event) {
        // Prevent default browser actions like scrolling or zooming on the canvas
        event.preventDefault();

        if (event.touches.length === 1) { // Handle single touch
            const touch = event.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            this.touchStartTime = Date.now();
            this.isTouching = true;
            this.isBraking = false; // Reset braking state

            // Start timer for hold detection
            clearTimeout(this.holdTimer); // Clear any previous timer
            this.holdTimer = setTimeout(() => {
                if (this.isTouching) { // Check if still touching
                    console.log('TouchControls: Hold detected - Start Braking');
                    this.emitter.emit('brakeStart');
                    this.isBraking = true;
                }
            }, HOLD_THRESHOLD_TIME);
        }
    }

    /**
     * Handles the movement of a touch event.
     * @param {TouchEvent} event
     */
    handleTouchMove(event) {
        // Prevent default browser actions
        event.preventDefault();

        // We generally don't need to do anything during move for swipes,
        // calculation happens on touchend. But we might cancel the hold timer
        // if the finger moves significantly, preventing accidental braking during a swipe.
        if (this.isTouching && event.touches.length === 1) {
            const touch = event.touches[0];
            const deltaX = touch.clientX - this.touchStartX;
            const deltaY = touch.clientY - this.touchStartY;

            // Optional: Cancel hold if significant movement occurs early
            if (Math.abs(deltaX) > SWIPE_THRESHOLD_X / 2 || Math.abs(deltaY) > SWIPE_MAX_VERTICAL_MOVE) {
                 clearTimeout(this.holdTimer);
            }
        }
    }

    /**
     * Handles the end of a touch event.
     * @param {TouchEvent} event
     */
    handleTouchEnd(event) {
        // Don't prevent default here, allows potential link clicks etc. off-canvas if needed

        clearTimeout(this.holdTimer); // Always clear hold timer on touchend

        if (this.isTouching) {
            const wasBraking = this.isBraking; // Remember if braking was active

            // Always stop braking if it was active
            if (wasBraking) {
                console.log('TouchControls: Touch end - Stop Braking (now checking for swipe)');
                this.emitter.emit('brakeEnd');
                this.isBraking = false; // Reset brake flag immediately
            }

            // Now, *always* check for a swipe, even if braking occurred.
            // Ensure we have valid start data (touch might end unexpectedly)
            if (this.touchStartX !== null && this.touchStartTime !== null) {
                const touch = event.changedTouches[0];
                const deltaX = touch.clientX - this.touchStartX;
                const deltaY = touch.clientY - this.touchStartY;
                const deltaTime = Date.now() - this.touchStartTime;

                let swipeDetected = false;

                // Check for horizontal swipe first
                if (Math.abs(deltaX) > SWIPE_THRESHOLD_X && Math.abs(deltaY) < SWIPE_MAX_VERTICAL_MOVE) {
                    if (deltaX > 0) {
                        console.log('TouchControls: Swipe Right detected');
                        this.emitter.emit('swipeRight');
                    } else {
                        console.log('TouchControls: Swipe Left detected');
                        this.emitter.emit('swipeLeft');
                    }
                    swipeDetected = true;
                }

                // If no horizontal swipe, check for vertical swipe
                if (!swipeDetected && Math.abs(deltaY) > SWIPE_THRESHOLD_Y && Math.abs(deltaX) < SWIPE_MAX_HORIZONTAL_MOVE) {
                    if (deltaY > 0) {
                        console.log('TouchControls: Swipe Down detected');
                        this.emitter.emit('swipeDown');
                    } else {
                        console.log('TouchControls: Swipe Up detected');
                        this.emitter.emit('swipeUp');
                    }
                    swipeDetected = true; 
                }

                // Optional: Handle taps if no swipe or hold occurred
                // if (!swipeDetected && !wasBraking) { 
                //     console.log('TouchControls: Tap detected');
                // }
            }
        }

        // Reset touch state
        this.touchStartX = null;
        this.touchStartY = null;
        this.touchStartTime = null;
        this.isTouching = false;
        // isBraking was already reset if applicable
    }

    /**
     * Removes event listeners and cleans up.
     */
    dispose() {
        clearTimeout(this.holdTimer);
        this.targetElement.removeEventListener('touchstart', this.handleTouchStart);
        this.targetElement.removeEventListener('touchmove', this.handleTouchMove);
        this.targetElement.removeEventListener('touchend', this.handleTouchEnd);
        this.targetElement.removeEventListener('touchcancel', this.handleTouchEnd);

        // Optional: Remove CSS style if appropriate
        // this.targetElement.style.userSelect = '';
        // this.targetElement.style.webkitUserSelect = '';
        // this.targetElement.style.msUserSelect = '';

        console.log('TouchControls disposed.');
    }
} 