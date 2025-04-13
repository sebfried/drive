/**
 * @fileoverview Main entry point for the Three.js Endless Racer game.
 * Initializes and starts the core Game orchestrator.
 */

import Game from './core/Game.js';

console.log('Three.js Endless Racer initializing...');

// Instantiate the main Game class
const game = new Game(document.body); // Pass the container element

// Start the game (initialization and game loop)
game.start().catch(error => {
    console.error("Failed to start the game:", error);
    // Optionally display an error to the user in the DOM
    document.body.innerHTML = '<div style="color: red; padding: 20px;">Failed to start game. Please check console.</div>';
});

// Optional: Add cleanup on window unload
// window.addEventListener('beforeunload', () => {
//     game.dispose();
// }); 