import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true, // Allow exposing via network addresses
    allowedHosts: [
      'm4.local', // Allow specific hostname
      // Add other hostnames if needed
    ],
  },
}); 