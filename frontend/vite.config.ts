import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/auth': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false
      },
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query', 'axios'],
          // recharts is intentionally NOT a manual chunk: as one, it pulled shared helpers
          // (clsx, ...) into vendor-charts, so the 375 kB chunk was preloaded on every page
          // including /login. Left alone, Rollup keeps it with the lazy chart components.
          'vendor-ui': ['@radix-ui/react-tooltip', '@radix-ui/react-slot', '@radix-ui/react-dialog', '@radix-ui/react-separator', '@radix-ui/react-toggle'],
        },
      },
    },
    // Increase chunk size warning limit (optional)
    chunkSizeWarningLimit: 500,
  },
}));
