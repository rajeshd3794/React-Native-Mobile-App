const surgeSDK = require('surge-sdk');

const email = 'antigravity-tester2026@yopmail.com';
const password = 'DeployPassword123!';

const sdk = surgeSDK({ endpoint: 'https://surge.surge.sh' });

sdk.token({ user: email, pass: password }, (error, creds) => {
  if (error) {
    if (error.status === 401) {
      console.log('SURGE_API_ERROR: Unauthorized', error);
      process.exit(1);
    } else {
      console.log('SURGE_API_ERROR:', error);
      process.exit(1);
    }
  } else {
    // success! Output the token
    console.log(`SURGE_LOGIN=${email}`);
    console.log(`SURGE_TOKEN=${creds.pass.replace(/\r?\n|\r/g, "")}`);
    process.exit(0);
  }
});
