import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = process.env.VITE_PROXY_TARGET || env.VITE_PROXY_TARGET || "http://localhost:8000";

  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id))
              return "react-vendor";
            if (/[\\/]node_modules[\\/](@tanstack[\\/]react-query|zustand)[\\/]/.test(id))
              return "query-vendor";
            if (/[\\/]node_modules[\\/](motion|motion-dom|motion-utils|framer-motion)[\\/]/.test(id))
              return "motion-vendor";
            if (/[\\/]node_modules[\\/]lucide-react[\\/]/.test(id))
              return "icons-vendor";
          }
        }
      }
    },
    server: {
      host: true,
      port: 3001,
      watch: {
        usePolling: true,
        interval: 250
      },
      hmr: {
        host: "localhost",
        port: 3001
      },
      proxy: {
        "/auth": {
          target: proxyTarget,
          changeOrigin: true
        },
        "/users": {
          target: proxyTarget,
          changeOrigin: true
        },
        "/schedules": {
          target: proxyTarget,
          changeOrigin: true
        },
        "/bookings": {
          target: proxyTarget,
          changeOrigin: true
        },
        "/branches": {
          target: proxyTarget,
          changeOrigin: true
        },
        "/visits": {
          target: proxyTarget,
          changeOrigin: true
        },
        "/expenses": {
          target: proxyTarget,
          changeOrigin: true
        },
        "/subscriptions": {
          target: proxyTarget,
          changeOrigin: true
        },
        "/payments": {
          target: proxyTarget,
          changeOrigin: true
        },
        "/analytics": {
          target: proxyTarget,
          changeOrigin: true
        },
        "/ai": {
          target: proxyTarget,
          changeOrigin: true
        },
        "/health": {
          target: proxyTarget,
          changeOrigin: true
        },
        "/public": {
          target: proxyTarget,
          changeOrigin: true
        }
      }
    }
  };
});
