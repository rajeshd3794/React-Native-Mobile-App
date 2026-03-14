const { spawn } = require('child_process');
const surge = spawn('npx', ['surge', 'dist', 'medicore-patients-app.surge.sh'], { shell: true, stdio: ['pipe', 'pipe', 'pipe'] });

surge.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
  if (output.includes('email:')) {
    surge.stdin.write('antigravity-test-deployer99@yopmail.com\n');
  }
});

surge.stderr.on('data', (data) => {
  const output = data.toString();
  process.stderr.write(output);
  if (output.includes('password:')) {
    surge.stdin.write('testdeploy1234\n');
  }
});

surge.on('close', (code) => {
  console.log(`surge process exited with code ${code}`);
});
