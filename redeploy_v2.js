const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, 'dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');
const NODE_MODULES_PATH = path.join(ASSETS_DIR, 'node_modules');
const VENDOR_PATH = path.join(ASSETS_DIR, 'vendor');

console.log('🚀 Starting Stable MediCore Deployment...');

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
          console.log(`  📄 Updating refs in ${file}...`);
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

// 5. Deploy to Surge
const domain = 'meditrack-v2.surge.sh';
console.log(`🌐 Deploying to ${domain}...`);

const login = fs.readFileSync('login.txt', 'utf8').split('\n');
const email = login[0].trim();
const password = login[1].trim();

const surge = spawnSync('npx.cmd', ['surge', 'dist', domain], {
  env: { ...process.env, SURGE_LOGIN: email, SURGE_TOKEN: password },
  stdio: 'inherit',
  shell: true
});

if (surge.status === 0) {
  console.log('✅ Successfully published stable MediCore implementation!');
} else {
  console.error('❌ Surge deployment failed');
  process.exit(1);
}
