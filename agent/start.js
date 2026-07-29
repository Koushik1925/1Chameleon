const { spawn } = require('child_process');
const electronPath = require('electron');

// Force clear the environment variable that makes Electron run as Node.js
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const proc = spawn(electronPath, ['.'], {
    cwd: __dirname,
    stdio: 'inherit',
    env
});

proc.on('close', (code) => {
    console.log(`Electron process exited with code ${code}`);
    process.exit(code);
});
