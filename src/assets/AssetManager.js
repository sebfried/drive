import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// Optional: Import DRACOLoader if you use Draco compressed models
// import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

/**
 * @class AssetManager
 * Handles loading and caching of 3D assets (GLTF models, Textures).
 */
class AssetManager {
    constructor() {
        /** @private @type {Map<string, any>} */
        this.cache = new Map();
        /** @private @type {Map<string, Promise<any>>} */
        this.loadingPromises = new Map();

        /** @private */
        this.gltfLoader = new GLTFLoader();
        /** @private */
        this.textureLoader = new THREE.TextureLoader();

        // Optional: Setup DRACOLoader if needed
        // const dracoLoader = new DRACOLoader();
        // dracoLoader.setDecoderPath('/draco-decoder/'); // Path to Draco decoder files
        // this.gltfLoader.setDRACOLoader(dracoLoader);

        console.log('AssetManager initialized');
    }

    /**
     * Loads a GLTF model.
     * Uses cache and prevents redundant requests for the same URL.
     * @param {string} url - Path to the GLTF file (.glb or .gltf).
     * @returns {Promise<THREE.Group>} A promise that resolves with the loaded GLTF scene.
     */
    loadGLTF(url) {
        if (this.cache.has(url)) {
            // console.log(`AssetManager: Returning cached GLTF: ${url}`);
            return Promise.resolve(this.cache.get(url));
        }

        if (this.loadingPromises.has(url)) {
            // console.log(`AssetManager: Joining existing GLTF promise: ${url}`);
            return this.loadingPromises.get(url);
        }

        // console.log(`AssetManager: Loading GLTF: ${url}`);
        const promise = this.gltfLoader.loadAsync(url)
            .then(gltf => {
                console.log(`AssetManager: Loaded GLTF: ${url}`);
                const model = gltf.scene || gltf.scenes[0]; // Get the main scene/model
                if (!model) {
                    throw new Error(`GLTF loaded but no scene found: ${url}`);
                }
                // You might want to preprocess the model here (e.g., traverse, center)
                this.cache.set(url, model);
                this.loadingPromises.delete(url);
                return model;
            })
            .catch(error => {
                console.error(`AssetManager: Failed to load GLTF: ${url}`, error);
                this.loadingPromises.delete(url);
                throw error; // Re-throw error to propagate it
            });

        this.loadingPromises.set(url, promise);
        return promise;
    }

    /**
     * Loads a texture.
     * Uses cache and prevents redundant requests for the same URL.
     * @param {string} url - Path to the texture file.
     * @returns {Promise<THREE.Texture>} A promise that resolves with the loaded texture.
     */
    loadTexture(url) {
        if (this.cache.has(url)) {
            // console.log(`AssetManager: Returning cached Texture: ${url}`);
            return Promise.resolve(this.cache.get(url));
        }

        if (this.loadingPromises.has(url)) {
            // console.log(`AssetManager: Joining existing Texture promise: ${url}`);
            return this.loadingPromises.get(url);
        }

        // console.log(`AssetManager: Loading Texture: ${url}`);
        const promise = this.textureLoader.loadAsync(url)
            .then(texture => {
                console.log(`AssetManager: Loaded Texture: ${url}`);
                this.cache.set(url, texture);
                this.loadingPromises.delete(url);
                return texture;
            })
            .catch(error => {
                console.error(`AssetManager: Failed to load Texture: ${url}`, error);
                this.loadingPromises.delete(url);
                throw error;
            });

        this.loadingPromises.set(url, promise);
        return promise;
    }

    /**
     * Retrieves a preloaded asset directly from the cache.
     * Throws an error if the asset is not found (use loadGLTF/loadTexture for loading).
     * @param {string} url - The URL of the asset to retrieve.
     * @returns {any} The cached asset.
     */
    getAsset(url) {
        if (!this.cache.has(url)) {
            throw new Error(`AssetManager: Asset not found in cache: ${url}. Ensure it was preloaded.`);
        }
        return this.cache.get(url);
    }

    /**
     * Preloads a list of assets.
     * @param {Array<{type: 'gltf'|'texture', url: string}>} assetsToLoad - Array of asset descriptors.
     * @returns {Promise<void>} A promise that resolves when all assets are loaded.
     */
    async preload(assetsToLoad) {
        console.log(`AssetManager: Preloading ${assetsToLoad.length} assets...`);
        const promises = assetsToLoad.map(asset => {
            if (asset.type === 'gltf') {
                return this.loadGLTF(asset.url);
            } else if (asset.type === 'texture') {
                return this.loadTexture(asset.url);
            } else {
                console.warn(`AssetManager: Unknown asset type for preload: ${asset.type}`);
                return Promise.resolve(); // Ignore unknown types
            }
        });

        await Promise.all(promises);
        console.log('AssetManager: Preloading complete.');
    }
}

// Export a singleton instance
const assetManager = new AssetManager();
export default assetManager; 