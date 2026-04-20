import { defineConfig, devices, type PlaywrightTestConfig } from "@playwright/test";

const projects: PlaywrightTestConfig["projects"] = [
  {
    name: "chromium",
    use: {
      ...devices["Desktop Chrome"],
    },
  },
  {
    name: "firefox",
    use: {
      ...devices["Desktop Firefox"],
    },
  },
];

if (process.env.PW_INCLUDE_WEBKIT === "1") {
  projects.push({
    name: "webkit",
    use: {
      ...devices["Desktop Safari"],
    },
  });
}

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run preview",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
  },
  projects,
});
