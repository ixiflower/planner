import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(async ({ mode }) => {
  // Load environment variables based on the mode (development, production, etc.)
  const env = loadEnv(mode, process.cwd(), '');

  // Make environment variables available to the config
  process.env.VITE_BACKEND_URL = env.VITE_BACKEND_URL;

  // @ts-ignore
  const backendConfig = await import("./backend.config.cjs");
  const backendUrl = backendConfig.getBackendUrl();

  // Derive dev server port from FRONTEND_URL when available to avoid mismatches
  const derivePortFromUrl = (url?: string) => {
    try {
      if (!url) return undefined;
      // Ensure it has a protocol for URL parsing
      const normalized = /^(https?:)?\/\//.test(url) ? url : `http://${url}`;
      const u = new URL(normalized);
      const p = Number(u.port);
      return Number.isFinite(p) && p > 0 ? p : undefined;
    } catch {
      return undefined;
    }
  };

  const envFrontendUrl = env.FRONTEND_URL || process.env.FRONTEND_URL;
  const derivedPort = derivePortFromUrl(envFrontendUrl);
  const serverPort = derivedPort ?? 82; // default to 82 to match project .env

  return {
    plugins: [
      react(),
      tailwindcss(),
      // Dev-only: ensure TS/TSX served with JS MIME to avoid strict MIME blocking in some setups
      {
        name: 'rovodev-fix-mime-tsx',
        apply: 'serve',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            try {
              const url = req.url || '';
              if (/\.(ts|tsx)(\?.*)?$/.test(url)) {
                // Only set if not already set
                if (!res.getHeader('Content-Type')) {
                  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
                }
              }
            } catch {}
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: true,
      port: serverPort,
      strictPort: true,
      hmr: {
        clientPort: serverPort,
      },
      proxy: {
        "/api/structure": {
          target: backendUrl,
          changeOrigin: true,
        },
        "/api/auth": {
          target: backendUrl,
          changeOrigin: true,
        },
        "/api": {
          target: backendUrl,
          changeOrigin: true,
        },
        "/download": {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/download/, "/tickets/api/download"),
        },
        "/media": {
          target: backendUrl,
          changeOrigin: true,
        },
      },
      cors: true,
      fs: {
        strict: false
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "react-router-dom"],
          },
        },
      },
    },
  };
});
