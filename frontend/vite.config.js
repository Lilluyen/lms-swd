import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
const apiProxy = process.env.VITE_API_PROXY || "http://localhost:8080";
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ["terminal.local"],
    proxy: {
      "/api": { target: apiProxy, changeOrigin: true },
      "/oauth2": { target: apiProxy, changeOrigin: true },
    },
  },
});
