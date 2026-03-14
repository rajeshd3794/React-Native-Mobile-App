const https = require('https');

const email = 'antigravity-medicore-tester2026@yopmail.com';
const password = 'DeployPassword2026!';

const req = https.request({
  hostname: 'api.surge.sh',
  path: '/token',
  method: 'POST',
  headers: {
    'Authorization': 'Basic ' + Buffer.from(email + ':' + password).toString('base64')
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Token/Response:', data);
  });
});

req.on('error', (e) => {
  console.error(e);
});

req.end();
