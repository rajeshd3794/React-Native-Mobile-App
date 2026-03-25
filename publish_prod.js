const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, 'dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');
const NODE_MODULES_PATH = path.join(ASSETS_DIR, 'node_modules');
const VENDOR_PATH = path.join(ASSETS_DIR, 'vendor');

console.log('🚀 Starting Final PRODUCTION Deployment to meditrack-portal.surge.sh...');

// 1. Build the app
console.log('📦 Running expo export...');
const exportResult = spawnSync('npx.cmd', ['expo', 'export', '-p', 'web'], { stdio: 'inherit', shell: true });
if (exportResult.status !== 0) {
  console.error('❌ Expo export failed');
  process.exit(1);
}

// 2. Fix WASM path (Move node_modules to vendor to avoid Surge/browser blocking)
if (fs.existsSync(NODE_MODULES_PATH)) {
  console.log('🛠️ Fixing WASM path: Renaming node_modules to vendor...');
  if (fs.existsSync(VENDOR_PATH)) {
    fs.rmSync(VENDOR_PATH, { recursive: true, force: true });
  }
  fs.renameSync(NODE_MODULES_PATH, VENDOR_PATH);

  // 3. Update all JS files to point to 'vendor' instead of 'node_modules'
  const jsDir = path.join(DIST_DIR, '_expo', 'static', 'js', 'web');
  if (fs.existsSync(jsDir)) {
    const files = fs.readdirSync(jsDir);
    files.forEach(file => {
      if (file.endsWith('.js')) {
        const filePath = path.join(jsDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('assets/node_modules')) {
          content = content.replace(/assets\/node_modules/g, 'assets/vendor');
          fs.writeFileSync(filePath, content);
        }
      }
    });
  }
}

// 4. Create 200.html for SPA routing
console.log('📄 Creating 200.html for SPA routing...');
fs.copyFileSync(path.join(DIST_DIR, 'index.html'), path.join(DIST_DIR, '200.html'));

// 4.5 Copy SEO Assets from public/ to dist/
const PUBLIC_DIR = path.join(__dirname, 'public');
if (fs.existsSync(PUBLIC_DIR)) {
  console.log('🔍 Copying SEO assets from public/ to dist/...');
  const seoFiles = fs.readdirSync(PUBLIC_DIR);
  seoFiles.forEach(file => {
    fs.copyFileSync(path.join(PUBLIC_DIR, file), path.join(DIST_DIR, file));
  });
}

// 5. Deploy to Surge
const domain = 'meditrack-portal.surge.sh';
console.log(`🌐 Publishing to ${domain}...`);

const loginFile = path.join(__dirname, 'login.txt');
let email = 'antigravity.tester2026@yopmail.com';
let password = 'testerpassword123';

if (fs.existsSync(loginFile)) {
  const loginData = fs.readFileSync(loginFile, 'utf8').split('\n');
  if (loginData.length >= 2) {
    email = loginData[0].trim();
    password = loginData[1].trim();
  }
}

const surge = spawn('npx.cmd', ['surge', 'dist', domain], { shell: true });

surge.stdout.on('data', (data) => {
  const out = data.toString();
  process.stdout.write(out);
  if (out.includes('email:')) surge.stdin.write(`${email}\n`);
  if (out.includes('password:')) surge.stdin.write(`${password}\n`);
});

surge.stderr.on('data', (data) => {
  const out = data.toString();
  process.stderr.write(out);
  if (out.includes('email:')) surge.stdin.write(`${email}\n`);
  if (out.includes('password:')) surge.stdin.write(`${password}\n`);
});

surge.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Successfully published to PRODUCTION!');
  } else {
    console.error('❌ PRODUCTION deployment failed');
  }
  process.exit(code);
});
