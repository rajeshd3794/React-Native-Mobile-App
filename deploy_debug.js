const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const domain = 'meditrack-debug-test.surge.sh';
const debugDir = path.join(__dirname, 'debug_dist');

if (!fs.existsSync(debugDir)) {
  fs.mkdirSync(debugDir);
}
fs.writeFileSync(path.join(debugDir, 'index.html'), '<h1>Debug Site</h1><p>Testing Surge Connectivity</p>');

const login = fs.readFileSync('login.txt', 'utf8').split('\n');
const email = login[0].trim();
const password = login[1].trim();

console.log(`🌐 Deploying debug site to ${domain}...`);

const surge = spawnSync('npx.cmd', ['surge', 'debug_dist', domain], {
  env: { ...process.env, SURGE_LOGIN: email, SURGE_TOKEN: password },
  stdio: 'inherit',
  shell: true
});

if (surge.status === 0) {
  console.log('✅ Debug site published!');
} else {
  console.error('❌ Debug deployment failed');
}
