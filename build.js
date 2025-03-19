const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

console.log('Packaging the extension... though it hardly matters in this vast, uncaring universe.');

// Create dist directory if it doesn't exist
if (fs.existsSync('./dist')) {
  // Clean up dist directory recursively
  fs.rmSync('./dist', { recursive: true, force: true });
}
fs.mkdirSync('./dist');

// Read and update the manifest
const manifest = JSON.parse(fs.readFileSync('./manifest.json', 'utf8'));
manifest.is_production = true; // Make sure production mode is set
fs.writeFileSync('./dist/manifest.json', JSON.stringify(manifest, null, 2));
console.log('Updated manifest with production settings. Not that it will change the inevitable outcome.');

// Files to copy to dist
const filesToCopy = [
  'background.js',
  'popup.html',
  'popup.js'
];

// Copy each file
filesToCopy.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, `./dist/${file}`);
    console.log(`Copied ${file} to dist. Another pointless transfer of bits.`);
  } else {
    console.log(`Warning: ${file} doesn't exist. Just another disappointment.`);
  }
});

// Copy the icons directory
if (fs.existsSync('./icons')) {
  if (!fs.existsSync('./dist/icons')) {
    fs.mkdirSync('./dist/icons');
  }
  
  fs.readdirSync('./icons').forEach(file => {
    fs.copyFileSync(`./icons/${file}`, `./dist/icons/${file}`);
    console.log(`Copied icons/${file} to dist/icons. Pixels of sadness.`);
  });
} else {
  console.log('No icons directory found. How depressingly on-brand.');
}

// Create a zip archive
const output = fs.createWriteStream('./dist/autoji.zip');
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  const fileSize = (fs.statSync('./dist/autoji.zip').size / 1024).toFixed(2);
  console.log(`Packaging complete. ${fileSize} KB of code that will soon be forgotten.`);
  console.log('You can now upload it to the Chrome Web Store. Not that it matters.');
});

archive.on('error', (err) => {
  console.error('Failed to create archive. Even failure is meaningless.', err);
  process.exit(1);
});

archive.pipe(output);
archive.directory('./dist/', false);
archive.finalize(); 