#!/usr/bin/env node
// Blocks commits that contain credentials. Runs from .githooks/pre-commit.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PATTERNS = [
  [/AKIA[0-9A-Z]{16}/, 'AWS access key id'],
  [/ASIA[0-9A-Z]{16}/, 'AWS temporary access key id'],
  [/aws_secret_access_key\s*[=:]\s*\S{20,}/i, 'AWS secret access key'],
  [/-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/, 'private key'],
  [/xox[baprs]-[0-9A-Za-z-]{10,}/, 'Slack token'],
  [/ghp_[0-9A-Za-z]{36}/, 'GitHub token'],
  [/sk-[A-Za-z0-9]{32,}/, 'API secret key'],
];

const files = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((f) => !/\.(png|jpe?g|gif|webp|mp3|ttf|otf|zip|apk|aab|ico)$/i.test(f));

const problems = [];
for (const f of files) {
  let text;
  try {
    text = readFileSync(f, 'utf8');
  } catch {
    continue;
  }
  if (/(^|\/)\.env(\.|$)/.test(f) && !f.endsWith('.env.example')) problems.push(`${f}: .env files must never be committed`);
  for (const [re, what] of PATTERNS) if (re.test(text)) problems.push(`${f}: looks like a ${what}`);
}

if (problems.length) {
  console.error('\n✖ Commit blocked — possible secrets found:\n  ' + problems.join('\n  '));
  console.error('\nRemove them (keys belong in ~/.aws or AWS Secrets Manager, never in the repo).\n');
  process.exit(1);
}
