import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://121.160.42.28:9093",
        changeOrigin: true,
      },
    },
  },
});