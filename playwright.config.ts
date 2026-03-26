import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "src",
  testMatch: "**/*.integration.ts",
  use: {
    baseURL: "http://localhost:5173",
    browserName: "chromium",
  },
  webServer: {
    command: "cd example && npx vite --port 5173",
    port: 5173,
    reuseExistingServer: true,
  },
});
