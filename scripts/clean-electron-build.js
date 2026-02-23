/**
 * Removes out/ and dist-electron/ to ensure a clean Electron build.
 * Stale Next.js build IDs can cause ENOENT errors during packaging.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dirs = ['out', 'dist-electron', '.next'];

for (const dir of dirs) {
  const fullPath = path.join(root, dir);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true });
    console.log('clean-electron-build: removed', dir);
  }
}
