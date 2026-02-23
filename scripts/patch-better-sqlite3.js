/**
 * Patches better-sqlite3 binding.gyp to use C++20 instead of C++17.
 * Required for Electron 33+ where V8 headers require C++20.
 */
const fs = require('fs');
const path = require('path');

const bindingPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'better-sqlite3',
  'binding.gyp'
);

if (!fs.existsSync(bindingPath)) {
  console.warn('patch-better-sqlite3: binding.gyp not found, skipping');
  process.exit(0);
}

let content = fs.readFileSync(bindingPath, 'utf8');
const original = content;
content = content.replace(/\/std:c\+\+17/g, '/std:c++20');
content = content.replace(/-std=c\+\+17/g, '-std=c++20');

if (content === original) {
  console.log('patch-better-sqlite3: already patched or no C++17 found');
  process.exit(0);
}

fs.writeFileSync(bindingPath, content, 'utf8');
console.log('patch-better-sqlite3: patched binding.gyp (C++17 -> C++20)');
