import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api/search": {
          target: "https://google.serper.dev",
          changeOrigin: true,
          rewrite: () => "/search",
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.setHeader("X-API-KEY", env.SERPER_API_KEY ?? "");
            });
          },
        },
        "/api": {
          target: "http://thaillm.or.th",
          changeOrigin: true,
        },
      },
    },
  };
});
