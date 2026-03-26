import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  ...(command === "serve"
    ? {
        root: resolve(__dirname, "example"),
        resolve: {
          alias: {
            "react-wayfinder": resolve(__dirname, "src/index.tsx"),
          },
        },
      }
    : {
        build: {
          lib: {
            entry: resolve(__dirname, "src/index.tsx"),
            name: "ReactWayfinder",
            fileName: "react-wayfinder",
            formats: ["es", "cjs"],
          },
          rollupOptions: {
            external: ["react", "react-dom", "react/jsx-runtime"],
            output: {
              globals: {
                react: "React",
                "react-dom": "ReactDOM",
              },
            },
          },
        },
      }),
}));
