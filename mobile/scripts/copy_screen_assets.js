/**
 * Copy all screen.png files from stitch directories to assets/screens
 */
const fs = require('fs');
const path = require('path');

const STITCH_ROOT = path.join(__dirname, '..', 'stitch_abbakano_data_sub');
const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'screens');

if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

const dirs = fs.readdirSync(STITCH_ROOT).filter(d => {
  const full = path.join(STITCH_ROOT, d);
  return fs.statSync(full).isDirectory();
});

let copied = 0;
dirs.forEach(dir => {
  const srcPng = path.join(STITCH_ROOT, dir, 'screen.png');
  if (fs.existsSync(srcPng)) {
    const destName = dir.replace(/\./g, '_') + '.png';
    const dest = path.join(ASSETS_DIR, destName);
    fs.copyFileSync(srcPng, dest);
    copied++;
    console.log(`Copied: ${destName} (${(fs.statSync(dest).size / 1024).toFixed(0)} KB)`);
  }
});

console.log(`\nTotal: ${copied} screen assets copied to assets/screens/`);

// Generate JS export map
const assetMap = {};
dirs.forEach(dir => {
  const srcPng = path.join(STITCH_ROOT, dir, 'screen.png');
  if (fs.existsSync(srcPng)) {
    const destName = dir.replace(/\./g, '_') + '.png';
    // Convert to camelCase key
    const key = dir
      .replace(/abbakano_data_sub_/g, '')
      .replace(/_dark_mode/g, 'Dark')
      .replace(/^_/, '')
      .replace(/_([a-z])/g, (_, c) => c.toUpperCase())
      .replace(/\.png_(\d+)/g, 'Img$1');
    assetMap[key] = `./screens/${destName}`;
  }
});

const mapCode = `// Auto-generated screen asset map - DO NOT EDIT manually\nexport const SCREEN_ASSETS = {\n${
  Object.entries(assetMap).map(([k, v]) => `  ${k}: require('${v}'),`).join('\n')
}\n};\n`;

fs.writeFileSync(path.join(__dirname, '..', 'assets', 'screenAssets.ts'), mapCode);
console.log('\nGenerated assets/screenAssets.ts');
console.log(mapCode);
