const { spawn } = require('child_process');
const suites = require('../test_suites/test_suites');

const suite = process.env.SUITE || 'home';

if (!suites[suite]) {
  console.error(`Suite "${suite}" not found. Available suites are: ${Object.keys(suites).join(', ')}`);
  process.exit(1);
}

const specFiles = suites[suite].join(',');

const command = `npx cypress run --spec "${specFiles}"`;

console.log(`Running Cypress suite: "${suite}"`);
console.log(`Command: ${command}`);

const cypressProcess = spawn('npx', ['cypress', 'run', '--spec', specFiles], {
  stdio: 'inherit',
  shell: true,
});

cypressProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`Cypress process exited with code ${code}`);
    process.exit(1);
  } else {
    console.log('Cypress tests completed successfully');
    process.exit(0);
  }
});
