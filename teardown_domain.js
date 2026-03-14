const { spawnSync } = require('child_process');
const fs = require('fs');

const domain = 'meditrack-portal.surge.sh';
const login = fs.readFileSync('login.txt', 'utf8').split('\n');
const email = login[0].trim();
const password = login[1].trim();

console.log(`🗑️ Tearing down ${domain}...`);

const surge = spawnSync('npx.cmd', ['surge', 'teardown', domain], {
  env: { ...process.env, SURGE_LOGIN: email, SURGE_TOKEN: password },
  stdio: 'inherit',
  shell: true
});

if (surge.status === 0) {
  console.log('✅ Teardown successful!');
} else {
  console.error('❌ Teardown failed');
}
