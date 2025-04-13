/**
 * @fileoverview Manages game difficulty progression based on score/distance.
 * @module game/difficulty/DifficultyManager
 */
// import * as Constants from '../config/constants.js';
import * as Constants from '../../config/constants.js'; // Updated Path

// Define difficulty levels/tiers (example)
const DIFFICULTY_LEVELS = [
    { threshold: 0,    level: 1, name: 'Easy',      targetDensity: 1.5, slowCarSpeedFactor: Constants.SLOW_CAR_SPEED_FACTOR }, // Base density: 1.5 obstacles per 100m
    { threshold: 500,  level: 2, name: 'Medium',    targetDensity: 2.0, slowCarSpeedFactor: Constants.SLOW_CAR_SPEED_FACTOR * 1.1 }, // 500m
    { threshold: 1500, level: 3, name: 'Hard',      targetDensity: 2.5, slowCarSpeedFactor: Constants.SLOW_CAR_SPEED_FACTOR * 1.2 }, // 1500m
    { threshold: 3000, level: 4, name: 'Very Hard', targetDensity: 3.0, slowCarSpeedFactor: Constants.SLOW_CAR_SPEED_FACTOR * 1.3 }, // 3000m
    { threshold: 5000, level: 5, name: 'Insane',    targetDensity: 3.5, slowCarSpeedFactor: Constants.SLOW_CAR_SPEED_FACTOR * 1.4 }, // 5000m
    // Add more levels as needed
];

class DifficultyManager {
    constructor() {
        this.currentLevel = 1;
        this.currentScore = 0;
        this.currentDifficultyParams = this.getParamsForLevel(1);
        console.log('DifficultyManager initialized');
    }

    /**
     * Gets the difficulty parameters for a specific level.
     * @param {number} level - The difficulty level number.
     * @returns {object} The parameters for that level (or the last level if exceeded).
     */
    getParamsForLevel(level) {
        const targetLevel = Math.min(level, DIFFICULTY_LEVELS.length);
        // Find the config for the target level (adjusting for 0-based index)
        return DIFFICULTY_LEVELS[targetLevel - 1] || DIFFICULTY_LEVELS[DIFFICULTY_LEVELS.length - 1];
    }

    /**
     * Gets the difficulty parameters for a specific score.
     * @param {number} score - The current game score.
     * @returns {object} The parameters corresponding to the score threshold.
     */
    getParamsForScore(score) {
        let applicableLevelParams = DIFFICULTY_LEVELS[0]; // Default to first level
        for (let i = DIFFICULTY_LEVELS.length - 1; i >= 0; i--) {
            if (score >= DIFFICULTY_LEVELS[i].threshold) {
                applicableLevelParams = DIFFICULTY_LEVELS[i];
                break;
            }
        }
        return applicableLevelParams;
    }

    /**
     * Updates the internal score and potentially the difficulty level.
     * @param {number} score - The current game score.
     * @returns {boolean} True if the difficulty level changed, false otherwise.
     */
    updateScore(score) {
        this.currentScore = score;
        const newParams = this.getParamsForScore(score);
        if (newParams.level !== this.currentLevel) {
            console.log(`Difficulty Level Up! Reached level ${newParams.level} (${newParams.name}) at score ${Math.floor(score)}`);
            this.currentLevel = newParams.level;
            this.currentDifficultyParams = newParams;
            // TODO: Trigger feedback (event, sound, visual)
            return true;
        }
        return false;
    }

    /**
     * Gets the current difficulty parameters based on the last updated score.
     * @returns {object}
     */
    getCurrentParams() {
        return this.currentDifficultyParams;
    }

    /**
     * Gets the current difficulty level number.
     * @returns {number}
     */
    getCurrentLevel() {
        return this.currentLevel;
    }

    reset() {
        this.currentLevel = 1;
        this.currentScore = 0;
        this.currentDifficultyParams = this.getParamsForLevel(1);
        console.log('DifficultyManager reset');
    }
}

// Export a singleton instance
const difficultyManager = new DifficultyManager();
export default difficultyManager; 