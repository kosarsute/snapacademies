const axios = require('axios');
const newman = require('newman');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

if (!fs.existsSync(collectionFilePath)) {
    console.error(`Collection file not found at path: ${collectionFilePath}`);
    process.exit(1);
}

if (!fs.existsSync(environmentFilePath)) {
    console.error(`Environment file not found at path: ${environmentFilePath}`);
    process.exit(1);
}

const extractQaseId = (events) => {
    if (!events) return null;
    for (const event of events) {
        if (event.listen === 'test' && event.script && event.script.exec) {
            for (const line of event.script.exec) {
                const match = line.match(/\/\/\s*qase:\s*(\d+)/);
                if (match) {
                    console.log(`Extracting Qase ID from script line "${line}":`, match[1]);
                    return parseInt(match[1], 10);
                }
            }
        }
    }
    return null;
};

const createTestRun = async (title, description) => {
    const url = `https://api.qase.io/v1/run/${PROJECT_CODE}`;
    const payload = {
        title,
        description,
        is_autotest: true,
    };

    const headers = {
        'Content-Type': 'application/json',
        'Token': QASE_API_TOKEN
    };

    try {
        const response = await axios.post(url, payload, { headers });
        console.log(`Created test run with ID: ${response.data.result.id}`);
        return response.data.result.id;
    } catch (error) {
        console.error('Error creating test run:', error.response ? error.response.data : error.message);
        throw error;
    }
};

const findTestCase = async (title) => {
    const url = `https://api.qase.io/v1/case/${PROJECT_CODE}?search=${encodeURIComponent(title)}`;

    const headers = {
        'Content-Type': 'application/json',
        'Token': QASE_API_TOKEN
    };

    try {
        const response = await axios.get(url, { headers });
        const existingCase = response.data.result.entities.find(tc => tc.title === title);
        if (existingCase) {
            console.log(`Found existing test case with ID: ${existingCase.id} for "${title}"`);
            return existingCase.id;
        }
        return null;
    } catch (error) {
        console.error('Error finding test case:', error.response ? error.response.data : error.message);
        throw error;
    }
};

const createTestCase = async (title) => {
    const existingCaseId = await findTestCase(title);
    if (existingCaseId) {
        return existingCaseId;
    }
    console.log(`Creating test case in suite ID: ${SUITE_ID} for title: ${title}`);

    const url = `https://api.qase.io/v1/case/${PROJECT_CODE}`;
    const payload = {
        title,
        suite_id: SUITE_ID
    };

    const headers = {
        'Content-Type': 'application/json',
        'Token': QASE_API_TOKEN
    };

    try {
        const response = await axios.post(url, payload, { headers });
        console.log(`Created new test case with ID: ${response.data.result.id} for "${title}" in suite ID: ${SUITE_ID}`);
        return response.data.result.id;
    } catch (error) {
        console.error('Error creating test case:', error.response ? error.response.data : error.message);
        throw error;
    }
};

const publishBulkResults = async (runId, results) => {
    const url = `https://api.qase.io/v1/result/${PROJECT_CODE}/${runId}/bulk`;
    const payload = {
        results
    };

    const headers = {
        'Content-Type': 'application/json',
        'Token': QASE_API_TOKEN
    };

    try {
        const response = await axios.post(url, payload, { headers });
        console.log('Published bulk results');
        return response.data;
    } catch (error) {
        console.error('Error publishing bulk results:', error.response ? error.response.data : error.message);
        throw error;
    }
};

const completeTestRun = async (runId) => {
    const url = `https://api.qase.io/v1/run/${PROJECT_CODE}/${runId}/complete`;
    const headers = {
        'Content-Type': 'application/json',
        'Token': QASE_API_TOKEN
    };

    try {
        const response = await axios.post(url, null, { headers });
        console.log('Completed test run');
        return response.data;
    } catch (error) {
        console.error('Error completing test run:', error.response ? error.response.data : error.message);
        throw error;
    }
};

let testResults = [];
let currentTestResult = null;
let pendingPromises = [];

newman.run({
    collection: collectionFilePath,
    environment: environmentFilePath,
    reporters: 'cli',
}).on('start', function (err, args) {
    if (err) { return console.error('Error on start:', err); }
    console.log('Running collection...');
}).on('beforeItem', function (err, args) {
    if (err) { return console.error('Error before item:', err); }
    console.log('Starting request:', args.item.name);
    currentTestResult = {
        name: args.item.name,
        assertions: []
    };
}).on('assertion', function (err, args) {
    console.log('Checking assertion:', args.assertion);
    if (currentTestResult) {
        const status = err ? 'failed' : 'passed';
        console.log(`Assertion: ${args.assertion}, Status: ${status}`);
        currentTestResult.assertions.push({
            name: args.assertion,
            status: status,
            message: args.assertion
        });
    }
}).on('item', function (err, args) {
    if (err) { return console.error('Error on item:', err); }
    console.log('Completed request:', args.item.name);

    if (currentTestResult) {
        console.log('Assertions collected:', currentTestResult.assertions);

        let qaseId = extractQaseId(args.item.event);

        const handleResult = async (testResult) => {
            if (!testResult) {
                console.log(`No test result available for "${args.item.name}"`);
                return;
            }

            if (!qaseId) {
                console.log(`No Qase ID found for "${args.item.name}". Creating new test case...`);
                try {
                    qaseId = await createTestCase(args.item.name);
                    console.log(`Created new test case with ID ${qaseId} for "${args.item.name}".`);
                } catch (error) {
                    console.error(`Failed to create test case for "${args.item.name}":`, error);
                    return;
                }
            } else {
                console.log(`Found existing test case with ID ${qaseId} for "${args.item.name}".`);
            }

            const combinedComment = testResult.assertions.map(assertion => `Assertion: ${assertion.message}, Status: ${assertion.status}`).join('\n');

            const result = {
                case_id: qaseId,
                status: testResult.assertions.every(assertion => assertion.status === 'passed') ? 'passed' : 'failed',
                comment: combinedComment,
                time_ms: args.response ? args.response.responseTime : 0,
                attachments: []
            };

            console.log('Collected result:', result);

            testResults.push(result);

            console.log('Current test results:', testResults);
        };

        pendingPromises.push(handleResult({ ...currentTestResult }));
        currentTestResult = null;
    }
}).on('done', async (err, summary) => {
    if (err) {
        console.error('Newman run error:', err);
        throw err;
    }

    console.log('Collection run complete!');
    console.log('Final test results:', JSON.stringify(testResults, null, 2));

    await Promise.all(pendingPromises);

    if (testResults.length === 0) {
        console.log('No valid test results to publish.');
        return;
    }

    try {
        console.log('Publishing results to Qase.io');

        const runId = await createTestRun(
            `API Automated Test Run ${process.env.CYPRESS_ENV_TYPE} / Release ${process.env.RELEASE_NUMBER || 'default'}`,
            'Newman collection run'
          );          
        console.log(chalk.green(`Run created with ID: ${runId}`));

        console.log('Test Results to be sent:', JSON.stringify(testResults, null, 2));

        const res = await publishBulkResults(runId, testResults);

        console.log('Bulk Result Response:', res);

        console.log(chalk.green('Results are sent'));

        await completeTestRun(runId);
        console.log(chalk.green('Run completed'));
    } catch (error) {
        console.error('Error while publishing results to Qase.io:', error.response ? error.response.data : error.message);
        if (error.response && error.response.data) {
            console.log('Error Response Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
});
