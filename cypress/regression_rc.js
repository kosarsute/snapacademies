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
        return response.data.result.id;
    } catch (error) {
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
            return existingCase.id;
        }
        return null;
    } catch (error) {
        throw error;
    }
};

const createTestCase = async (title) => {
    const existingCaseId = await findTestCase(title);
    if (existingCaseId) {
        return existingCaseId;
    }

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
        return response.data.result.id;
    } catch (error) {
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
        return response.data;
    } catch (error) {
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
        return response.data;
    } catch (error) {
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
}).on('beforeItem', function (err, args) {
    if (err) { return console.error('Error before item:', err); }
    currentTestResult = {
        name: args.item.name,
        assertions: []
    };
}).on('assertion', function (err, args) {
    if (currentTestResult) {
        const status = err ? 'failed' : 'passed';
        currentTestResult.assertions.push({
            name: args.assertion,
            status: status,
            message: args.assertion
        });
    }
}).on('item', function (err, args) {
    if (err) { return console.error('Error on item:', err); }

    if (currentTestResult) {
        let qaseId = extractQaseId(args.item.event);

        const handleResult = async (testResult) => {
            if (!testResult) {
                return;
            }

            if (!qaseId) {
                try {
                    qaseId = await createTestCase(args.item.name);
                } catch (error) {
                    return;
                }
            }

            const combinedComment = testResult.assertions.map(assertion => `Assertion: ${assertion.message}, Status: ${assertion.status}`).join('\n');

            const result = {
                case_id: qaseId,
                status: testResult.assertions.every(assertion => assertion.status === 'passed') ? 'passed' : 'failed',
                comment: combinedComment,
                time_ms: args.response ? args.response.responseTime : 0,
                attachments: []
            };

            testResults.push(result);
        };

        pendingPromises.push(handleResult({ ...currentTestResult }));
        currentTestResult = null;
    }
}).on('done', async (err, summary) => {
    if (err) {
        console.error('Newman run error:', err);
        throw err;
    }

    await Promise.all(pendingPromises);

    if (testResults.length === 0) {
        return;
    }

    try {
        const runId = await createTestRun('Newman/Postman API Automated Test Run / Release 2439 - RC', 'Newman collection run');

        const res = await publishBulkResults(runId, testResults);

        await completeTestRun(runId);
    } catch (error) {
        if (error.response && error.response.data) {
            console.log('Error Response Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
});
