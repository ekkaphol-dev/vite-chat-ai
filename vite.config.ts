import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/vite-chat-ai/",
  server: {
    proxy: {
      "/api": {
        target: "http://thaillm.or.th",
        changeOrigin: true,
      },
      "/search-api": {
        target: "https://api.duckduckgo.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/search-api/, ""),
      },
    },
  },
});
