/**
 * @fileoverview Configuration for 3D models used in the game.
 */

export const PlayerCarModels = {
    orange: {
        id: 'orange',
        name: 'Orange Racer',
        url: '/models/car-orange.glb',
        scale: 0.6, // ** ADJUST BASED ON ACTUAL MODEL SIZE **
        rotationY: 180, // Adjust if model isn't facing down +Z axis by default
        license: 'http://creativecommons.org/licenses/by/4.0/',
        source: 'https://sketchfab.com/3d-models/low-poly-cartoon-style-car-01-69461da2e3a842c0868f5187c1282674',
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
    opponentCar_blue: {
        id: 'opponentCar_blue',
        name: 'Blue Opponent',
        url: '/models/car-blue.glb',
        scale: 0.6, // ** ADJUST BASED ON ACTUAL MODEL SIZE **
        rotationY: 180, // Adjust if model isn't facing down +Z axis by default
        license: 'http://creativecommons.org/licenses/by/4.0/',
        source: 'https://sketchfab.com/3d-models/low-poly-cartoon-style-car-03-8c7f36b0a60745f487b300fa74d05990',
    },
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
    ...Object.values(ObstacleModels).map(config => ({ type: 'gltf', url: config.url })),
]; 