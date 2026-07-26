const sharp = require('sharp');
const path = require('path');

sharp(path.join(__dirname, '..', 'client', 'src', 'assets', 'setting.jpeg'))
    .resize(256, 256)
    .png()
    .toFile(path.join(__dirname, 'build', 'icon.png'), (err, info) => {
        if (err) { console.error(err); process.exit(1); }
        console.log('Icon created:', info);
    });
