#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, 'server.ts');
const tsNode = spawn('npx', ['ts-node', serverPath], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true,
});

tsNode.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

tsNode.on('close', (code) => {
  process.exit(code);
});
