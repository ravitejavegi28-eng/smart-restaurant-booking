'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('Missing .env.local. Copy .env.example and add your private settings first.');
  process.exit(1);
}

const localEnv = {};
for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) continue;
  const separator = line.indexOf('=');
  if (separator < 1) continue;
  const key = line.slice(0, separator).trim();
  let value = line.slice(separator + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  localEnv[key] = value;
}

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STAFF_PASSWORD', 'SESSION_SECRET'];
const missing = required.filter((key) => !localEnv[key]);
if (missing.length) {
  console.error(`Missing required settings in .env.local: ${missing.join(', ')}`);
  process.exit(1);
}

const vercelArgs = ['--yes', 'vercel@latest', 'dev', '--local', '--listen', process.env.PORT || '3000', '--yes'];
const command = process.platform === 'win32' ? process.execPath : 'npx';
const commandArgs = process.platform === 'win32'
  ? [path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js'), ...vercelArgs]
  : vercelArgs;
const child = spawn(command, commandArgs, {
  cwd: process.cwd(),
  env: { ...process.env, ...localEnv },
  stdio: 'inherit'
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
