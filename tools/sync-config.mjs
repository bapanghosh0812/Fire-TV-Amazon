#!/usr/bin/env node
// Copies the deployed endpoints (outputs.json from `cdk deploy`) into the TV app config.
// Usage: node tools/sync-config.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputs = JSON.parse(readFileSync(resolve(root, 'outputs.json'), 'utf8')).Storyloom;
if (!outputs) throw new Error('outputs.json has no Storyloom stack — run the deploy first');

const appJsonPath = resolve(root, 'apps/tv/app.json');
const app = JSON.parse(readFileSync(appJsonPath, 'utf8'));
app.expo.extra = {
  ...app.expo.extra,
  apiBaseUrl: outputs.ApiUrl.replace(/\/$/, ''),
  realtimeUrl: outputs.RealtimeUrl,
  companionBaseUrl: outputs.CompanionUrl,
};
writeFileSync(appJsonPath, JSON.stringify(app, null, 2) + '\n');
console.log('TV app now points at', app.expo.extra);
