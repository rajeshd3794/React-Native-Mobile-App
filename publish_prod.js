const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure Surge handles SPA routing by providing 200.html
const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');
const fallbackPath = path.join(distPath, '200.html');

if (fs.existsSync(indexPath)) {
  fs.copyFileSync(indexPath, fallbackPath);
  console.log('✅ Created 200.html for SPA routing');
}

console.log('Publishing to: meditrack-portal.surge.sh');

const surge = spawn('npx', ['surge', 'dist', 'meditrack-portal.surge.sh'], { shell: true });

surge.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
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
    console.log('🚀 Successfully pushed to production!');
  } else {
    console.log('❌ Failed to push. Status code:', code);
  }
});
