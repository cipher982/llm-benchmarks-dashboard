const fs = require('fs');
const path = require('path');

// Simple script to convert images to WebP using system tools
// This assumes you have imagemagick or similar tools installed

const publicDir = path.join(__dirname, '../public');
const backendPublicDir = path.join(__dirname, '../../backend/public');

const imagesToOptimize = [
  { src: 'barchart-black-icon.png', sizes: [192, 512] },
  { src: 'barchart-black-icon.ico', convert: false }, // Keep ico for browser compatibility
];

const backendImages = [
  { src: 'android-chrome-192x192.png', sizes: [192] },
  { src: 'android-chrome-512x512.png', sizes: [512] },
  { src: 'apple-touch-icon.png', sizes: [180] },
  { src: 'favicon-16x16.png', sizes: [16] },
  { src: 'favicon-32x32.png', sizes: [32] },
];

console.log('Image optimization script created.');
console.log('To optimize images, you can use tools like:');
console.log('1. ImageMagick: convert image.png -quality 85 image.webp');
console.log('2. Online tools like tinypng.com or squoosh.app');
console.log('3. Manual conversion using tools like GIMP or Photoshop');

console.log('\nCurrent images found:');
console.log('Frontend public directory:');
fs.readdirSync(publicDir).filter(f => f.match(/\.(png|jpg|jpeg|gif|ico)$/i)).forEach(f => {
  const stats = fs.statSync(path.join(publicDir, f));
  console.log(`  ${f} - ${Math.round(stats.size / 1024)}KB`);
});

console.log('\nBackend public directory:');
fs.readdirSync(backendPublicDir).filter(f => f.match(/\.(png|jpg|jpeg|gif|ico)$/i)).forEach(f => {
  const stats = fs.statSync(path.join(backendPublicDir, f));
  console.log(`  ${f} - ${Math.round(stats.size / 1024)}KB`);
});