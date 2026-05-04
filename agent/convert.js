const sharp = require('sharp');

sharp('..\\client\\src\\assets\\setting.jpeg')
    .resize(256, 256)
    .png()
    .toFile('build\\icon.png', (err, info) => {
        if (err) { console.error(err); process.exit(1); }
        console.log('Icon created:', info);
    });
