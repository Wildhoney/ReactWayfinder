import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, "example"),
  base: "/ReactWayfinder/",
  resolve: {
    alias: {
      "react-wayfinder": resolve(__dirname, "src/index.tsx"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
