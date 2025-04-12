/**
 * @fileoverview Configuration for 3D models used in the game.
 */

export const PlayerCarModels = {
    orange: {
        id: 'orange',
        name: 'Orange Racer',
        url: '/models/playerCar_orange.glb',
        scale: 0.6, // ** ADJUST BASED ON ACTUAL MODEL SIZE **
        rotationY: 180, // Adjust if model isn't facing down +Z axis by default
        // Add other specific settings if needed (e.g., material properties)
    },
    // Add more car types here later:
    // blue: {
    //     id: 'blue',
    //     name: 'Blue Bullet',
    //     url: '/models/playerCar_blue.glb',
    //     scale: 0.35,
    //     rotationY: Math.PI / 2,
    // },
};

export const ObstacleModels = {
    // Define obstacle models here later in subtask 12.3
    // Example:
    // sedan_gray: {
    //     id: 'sedan_gray',
    //     url: '/models/obstacle_sedan_gray.glb',
    //     scale: 0.3,
    //     rotationY: 0,
    // },
};

// Optionally combine or add more categories
export const AllModelAssets = [
    // Player Cars
    ...Object.values(PlayerCarModels).map(config => ({ type: 'gltf', url: config.url })),
    // Obstacles (Uncomment when defined)
    // ...Object.values(ObstacleModels).map(config => ({ type: 'gltf', url: config.url })),
]; 