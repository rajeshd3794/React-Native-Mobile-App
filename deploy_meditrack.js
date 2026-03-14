const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure Surge handles SPA routing by providing 200.html
const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');
const fallbackPath = path.join(distPath, '200.html');

if (fs.existsSync(indexPath)) {
  fs.copyFileSync(indexPath, fallbackPath);
  console.log('✅ Confirmed 200.html for SPA routing');
}

// WASM Relocation Fix: expo-sqlite looks for wa-sqlite.wasm in the root on web
const wasmSource = path.join(distPath, 'assets/node_modules/expo-sqlite/web/wa-sqlite/wa-sqlite.7ca566fbbc2ec2a172c5aefa63a20f4b.wasm');
const wasmDest = path.join(distPath, 'wa-sqlite.wasm');
const wasmWorkerPath = path.join(distPath, '_expo/static/js/web/wa-sqlite.wasm');

if (fs.existsSync(wasmSource)) {
  fs.copyFileSync(wasmSource, wasmDest);
  // Also copy to where the worker might be looking
  const workerDir = path.dirname(wasmWorkerPath);
  if (!fs.existsSync(workerDir)) fs.mkdirSync(workerDir, { recursive: true });
  fs.copyFileSync(wasmSource, wasmWorkerPath);
  console.log('✅ Relocated wa-sqlite.wasm for database support');
} else {
  console.log('⚠️ Warning: wa-sqlite.wasm not found at expected path');
}

const domain = 'meditrack-portal.surge.sh';
console.log(`Publishing to: ${domain}`);

const surge = spawn('npx', ['surge', 'dist', domain], { shell: true });

surge.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
  // Using the verified credentials from login.txt
  if (output.includes('email:')) surge.stdin.write('antigravity.tester2026@yopmail.com\n');
  if (output.includes('password:')) surge.stdin.write('testerpassword123\n');
});

surge.stderr.on('data', (data) => {
  const output = data.toString();
  process.stderr.write(output);
  if (output.includes('email:')) surge.stdin.write('antigravity.tester2026@yopmail.com\n');
  if (output.includes('password:')) surge.stdin.write('testerpassword123\n');
});

surge.on('close', (code) => {
  if (code === 0) {
    console.log(`🚀 Successfully published all implementions to ${domain}!`);
  } else {
    console.log(`❌ Deployment failed with exit code: ${code}. You may need to run 'surge dist ${domain}' manually if permissions are restricted.`);
  }
});
