import { defineConfig } from 'vite';

export default defineConfig({
  // Base directory for GitHub Pages deployment (repository name)
  base: '/drive/',
  build: {
    // Output directory for the build
    outDir: 'docs',
  },
  server: {
    allowedHosts: [
      'm4.local', // Allow specific hostname
      // Add other hostnames if needed
    ],
  },
}); 