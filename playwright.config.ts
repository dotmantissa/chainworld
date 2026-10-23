import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir:'tests/browser',timeout:90000,expect:{timeout:15000},use:{baseURL:'http://localhost:5175',headless:true},
  webServer:{command:'npm run dev',url:'http://localhost:5175',reuseExistingServer:true,timeout:60000},
})
