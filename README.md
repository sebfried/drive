# Drive - Endless Racer

A simple endless driving game built with Three.js and Vite.

## Overview

This project was created as a weekend experiment, primarily to explore development workflows using [Task Master](https://github.com/eyaltoledano/claude-task-master) for managing tasks within an AI-assisted coding environment (Cursor).

The game itself is a basic endless runner where the player dodges oncoming and same-direction traffic.

## Tech Stack

*   **Engine:** [Three.js](https://threejs.org/)
*   **Build Tool:** [Vite](https://vitejs.dev/)
*   **Task Management:** [Task Master](https://github.com/eyaltoledano/claude-task-master)
*   **Language:** JavaScript

## Running the Project

1.  **Install dependencies:**
    ```bash
    pnpm install
    ```

2.  **Run development server:**
    ```bash
    pnpm run dev
    ```
    This will start the Vite development server.

3.  **Build for production:**
    ```bash
    pnpm run build
    ```
    This creates a production-ready build in the `docs/` directory (configured for GitHub Pages).

4.  **Preview production build:**
    ```bash
    pnpm run preview
    ```
    This serves the contents of the `docs/` directory locally.

## Notes

*   This is primarily an experimental project focused on the development process with AI tools.
*   Game features and polish may be limited.

## Assets

All 3D models used in this project are sourced from Sketchfab and licensed under the Creative Commons Attribution 4.0 International License (CC BY 4.0).

*   **Low Poly Cartoon Style Car 01 (Orange)**
    *   Source: [https://sketchfab.com/3d-models/low-poly-cartoon-style-car-01-69461da2e3a842c0868f5187c1282674](https://sketchfab.com/3d-models/low-poly-cartoon-style-car-01-69461da2e3a842c0868f5187c1282674)
    *   License: [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/)
    *   *Used for: Player Car, Opponent Car*
*   **Low Poly Cartoon Style Car 02 (Blue)**
    *   Source: [https://sketchfab.com/3d-models/low-poly-cartoon-style-car-03-8c7f36b0a60745f487b300fa74d05990](https://sketchfab.com/3d-models/low-poly-cartoon-style-car-03-8c7f36b0a60745f487b300fa74d05990)
    *   License: [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/)
    *   *Used for: Player Car, Opponent Car*
*   **Low Poly Tree**
    *   Source: [https://sketchfab.com/3d-models/low-poly-tree-0aa7d3bcb4f6485f855b5142f96158ca](https://sketchfab.com/3d-models/low-poly-tree-0aa7d3bcb4f6485f855b5142f96158ca)
    *   License: [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/)
    *   *Used for: Static Tree Obstacle*
*   **Lowpoly Tree**
    *   Source: [https://sketchfab.com/3d-models/lowpoly-tree-cd5a7dc13ea8469e81a7908090e96b8e](https://sketchfab.com/3d-models/lowpoly-tree-cd5a7dc13ea8469e81a7908090e96b8e)
    *   License: [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/)
    *   *Used for: Static Tree Obstacle*
