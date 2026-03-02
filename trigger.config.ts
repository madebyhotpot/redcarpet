import { defineConfig } from '@trigger.dev/sdk/v3';

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID || 'redcarpet',
  runtime: 'node',
  dirs: ['./trigger'],
  maxDuration: 900,
});
