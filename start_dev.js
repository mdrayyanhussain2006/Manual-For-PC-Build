const { spawn } = require('child_process');
const path = require('path');

const cwd = 'E:\\5TH-SEM\\Technical Writing\\Activity Files\\Activity[1]-Manual';

const child = spawn('npm', ['run', 'dev'], {
  cwd,
  detached: true,
  stdio: 'ignore',
  shell: true,
  env: { ...process.env },
});

child.unref();
console.log('Dev server spawned, PID:', child.pid);
