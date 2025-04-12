/**
 * @fileoverview Game constants module
 */

// --- Road Constants ---
/** Width of the entire road including shoulders. */
export const ROAD_WIDTH = 5;
/** Width of a single lane (including shoulders). */
export const LANE_WIDTH = ROAD_WIDTH / 4; // 2 main lanes + 2 shoulders
/** Length of a single road segment mesh. */
export const ROAD_SEGMENT_LENGTH = 10;
/** Number of road segments to pool for recycling. */
export const NUM_ROAD_SEGMENTS = 5; // Number of segments to pool for smooth scrolling
/** Base scrolling speed of the road. */
export const SCROLL_SPEED = 0.05; // Adjust for desired speed

// --- Player Car Constants ---
/** Width of the player's car. */
export const CAR_WIDTH = LANE_WIDTH * 0.7;
/** Length of the player's car. */
export const CAR_LENGTH = CAR_WIDTH * 1.8;
/** Height of the player's car. */
export const CAR_HEIGHT = CAR_WIDTH * 0.6;
/** Initial lane index for the player car (0-3). */
export const START_LANE_INDEX = 2; // 0: Left shoulder, 1: Left lane, 2: Right lane, 3: Right shoulder

// --- Obstacle Constants ---
/** Base size for static obstacles. */
export const OBSTACLE_SIZE = LANE_WIDTH * 0.6;
/** Minimum time interval (seconds) between obstacle spawn attempts. */
export const OBSTACLE_SPAWN_INTERVAL = 2.0; // Increased from 1.5
/** Size of the obstacle object pool. */
export const OBSTACLE_POOL_SIZE = 15;

/** Enum for different obstacle types. */
export const OBSTACLE_TYPES = {
    STATIC: 'static', // Rock/Tree on shoulder
    SLOW_CAR: 'slow_car', // Moving slower in right lane
    ONCOMING_CAR: 'oncoming_car' // Moving towards player in left lane
};

/** Speed factor relative to SCROLL_SPEED for slow cars. */
// Relative speed is calculated in obstacles.js as: actualSpeed = SCROLL_SPEED + obstacle.userData.speed
// Where obstacle.userData.speed is calculated as: SCROLL_SPEED * SLOW_CAR_SPEED_FACTOR
// So, actualSpeed = SCROLL_SPEED + (SCROLL_SPEED * SLOW_CAR_SPEED_FACTOR)
// Example: 0.05 + (0.05 * -0.3) = 0.05 - 0.015 = 0.035
export const SLOW_CAR_SPEED_FACTOR = -0.3; // Relative to scroll speed (negative = slower)
/** Speed factor relative to SCROLL_SPEED for oncoming cars. */
export const ONCOMING_CAR_SPEED_FACTOR = -0.1; // Relative to scroll speed (larger negative = faster towards player)
/** Fixed speed for oncoming cars relative to world, not scroll. */
export const ONCOMING_CAR_FIXED_SPEED = -0.1; // Added based on analysis of main.js

/** Weights for randomly choosing which obstacle type to spawn. */
export const OBSTACLE_SPAWN_WEIGHTS = {
    [OBSTACLE_TYPES.STATIC]: 0.4,
    [OBSTACLE_TYPES.SLOW_CAR]: 0.3,
    [OBSTACLE_TYPES.ONCOMING_CAR]: 0.3
};

// --- Gameplay Constants ---
/** Multiplier applied to distance scrolled for scoring. */
export const SCORE_MULTIPLIER = 5; // Adjust how fast score increases relative to speed

/** Calculated X positions for the center of each lane. */
export const lanePositions = [
    -LANE_WIDTH * 1.5, // Left shoulder
    -LANE_WIDTH * 0.5, // Left lane
    LANE_WIDTH * 0.5,  // Right lane
    LANE_WIDTH * 1.5   // Right shoulder
];

// --- Camera Constants ---
// Calculate camera Y based on road segments view distance
/** Calculated Y position for the camera based on road segments. */
export const cameraYPosition = NUM_ROAD_SEGMENTS * ROAD_SEGMENT_LENGTH * 0.35; 