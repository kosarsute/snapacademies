const axios = require('axios');

const runTitle = `UI Automated Test Run ${process.env.CYPRESS_ENV_TYPE || 'default'} / ${
  suiteName === 'full-regression' ? `Release ${process.env.RELEASE_NUMBER || 'default'}` : `Suite: ${suiteName}`
}`;

async function createQaseRun() {
  try {
    const response = await axios.post(
      `https://api.qase.io/v1/run/${qaseProjectCode}`,
      {
        title: runTitle,
        cases: [],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Token': qaseApiToken,
        },
      }
    );
    const runId = response.data.result.id;
    console.log(runId);
    return runId;
  } catch (error) {
    console.error('Error creating Qase run:', error.response ? error.response.data : error);
    process.exit(1);
  }
}

return createQaseRun();
