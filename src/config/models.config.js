/**
 * @fileoverview Configuration for 3D models used in the game.
 */

export const PlayerCarModels = {
    orange: {
        id: 'orange',
        name: 'Orange Racer',
        url: 'models/car-orange.glb',
        scale: 0.6, // ** ADJUST BASED ON ACTUAL MODEL SIZE **
        rotationY: 180, // Adjust if model isn't facing down +Z axis by default
        license: 'http://creativecommons.org/licenses/by/4.0/',
        source: 'https://sketchfab.com/3d-models/low-poly-cartoon-style-car-01-69461da2e3a842c0868f5187c1282674',
        // Add other specific settings if needed (e.g., material properties)
    },
    blue: {
        id: 'blue',
        name: 'Blue Bullet',
        url: 'models/car-blue.glb',
        scale: 0.6, // ** ADJUST BASED ON ACTUAL MODEL SIZE **
        rotationY: 180, // Adjust if model isn't facing down +Z axis by default
        license: 'http://creativecommons.org/licenses/by/4.0/',
        source: 'https://sketchfab.com/3d-models/low-poly-cartoon-style-car-03-8c7f36b0a60745f487b300fa74d05990',
    },
};

// Separate obstacles into categories
export const CarObstacleModels = {
    opponentCar_blue: {
        id: 'opponentCar_blue',
        name: 'Blue Opponent',
        url: 'models/car-blue.glb',
        scale: 0.6, // ** ADJUST BASED ON ACTUAL MODEL SIZE **
        rotationY: 180, // Adjust if model isn't facing down +Z axis by default
        license: 'http://creativecommons.org/licenses/by/4.0/',
        source: 'https://sketchfab.com/3d-models/low-poly-cartoon-style-car-03-8c7f36b0a60745f487b300fa74d05990',
    },
    opponentCar_orange: {
        id: 'opponentCar_orange',
        name: 'Orange Opponent',
        url: 'models/car-orange.glb',
        scale: 0.6, // ** ADJUST BASED ON ACTUAL MODEL SIZE **
        rotationY: 180, // Adjust if model isn't facing down +Z axis by default
        license: 'http://creativecommons.org/licenses/by/4.0/',
        source: 'https://sketchfab.com/3d-models/low-poly-cartoon-style-car-01-69461da2e3a842c0868f5187c1282674',
    },
};

export const StaticObstacleModels = {
    tree_one: {
        id: 'tree_one',
        name: 'Tree One',
        url: 'models/tree-one.glb',
        scale: 0.1, // ** ADJUST BASED ON ACTUAL MODEL SIZE **
        rotationY: 0, // Adjust if model isn't facing down +Z axis by default
        license: 'http://creativecommons.org/licenses/by/4.0/',
        source: 'https://sketchfab.com/3d-models/low-poly-tree-0aa7d3bcb4f6485f855b5142f96158ca',
    },
    tree_two: {
        id: 'tree_two',
        name: 'Tree Two',
        url: 'models/tree-two.glb',
        scale: 0.001, // ** ADJUST BASED ON ACTUAL MODEL SIZE **
        rotationY: 0, // Adjust if model isn't facing down +Z axis by default
        license: 'http://creativecommons.org/licenses/by/4.0/',
        source: 'https://sketchfab.com/3d-models/lowpoly-tree-cd5a7dc13ea8469e81a7908090e96b8e',
    },
};

// Combine all assets for preloading
export const AllModelAssets = [
    // Player Cars
    ...Object.values(PlayerCarModels).map(config => ({ type: 'gltf', url: config.url })),
    // Car Obstacles
    ...Object.values(CarObstacleModels).map(config => ({ type: 'gltf', url: config.url })),
    // Static Obstacles
    ...Object.values(StaticObstacleModels).map(config => ({ type: 'gltf', url: config.url })),
]; 