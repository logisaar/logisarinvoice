import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5174,
    headers: {
      // unsafe-none is required for Google Sign-In iframe (gsi/button) to work.
      // same-origin-allow-popups blocks the cross-origin postMessage from accounts.google.com.
      "Cross-Origin-Opener-Policy": "unsafe-none",
      "Referrer-Policy": "no-referrer-when-downgrade",
    },
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger()
  ].filter(Boolean) as PluginOption[],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
