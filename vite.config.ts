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
            "react-wayfinder": resolve(__dirname, "src/index.ts"),
          },
        },
      }
    : {
        build: {
          lib: {
            entry: resolve(__dirname, "src/index.ts"),
            name: "ReactWayfinder",
            fileName: "react-wayfinder",
            formats: ["es", "cjs"],
          },
          minify: "terser",
          terserOptions: {
            compress: {
              drop_console: true,
              drop_debugger: true,
              passes: 3,
              pure_getters: true,
              toplevel: true,
              ecma: 2020,
            },
            format: {
              comments: false,
            },
            mangle: true,
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
