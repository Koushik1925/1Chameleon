const { spawn } = require('child_process');
const path = require('path');
const electronPath = require('electron');

// Force clear the environment variable that makes Electron run as Node.js
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const proc = spawn(electronPath, [path.join(__dirname, 'src', 'main.js')], {
    stdio: 'inherit',
    env: env
});

proc.on('close', (code) => {
    console.log(`Electron process exited with code ${code}`);
    process.exit(code);
});
