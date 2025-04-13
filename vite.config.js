import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    allowedHosts: [
      'm4.local', // Allow specific hostname
      // Add other hostnames if needed
    ],
  },
}); 