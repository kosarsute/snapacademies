const axios = require("axios");
const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");

async function getRunId() {
    try {
        if (fs.existsSync(RUN_ID_FILE)) {
            const runId = fs.readFileSync(RUN_ID_FILE, "utf-8").trim();
            console.log(`Using existing Qase run ID: ${runId}`);
            return runId;
        }

        const response = await axios.post(
            `https://api.qase.io/v1/run/${qaseProjectCode}`,
            {
                title: `Automated Test Run / Release ${process.env.RELEASE_NUMBER || "default"}`,
                cases: [],
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Token": qaseApiToken,
                },
            }
        );

        const runId = response.data.result.id;
        console.log(`Created Qase run with ID: ${runId}`);

        fs.writeFileSync(RUN_ID_FILE, String(runId), "utf-8");
        return runId;
    } catch (error) {
        console.error("Error creating Qase run:", error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

async function parseJUnitReport(filePath) {
    try {
        const xmlData = fs.readFileSync(filePath, "utf-8");
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(xmlData);

        return result.testsuites.testsuite[0].testcase.map((test) => ({
            name: test.$.name,
            qaseCaseId: extractQaseCaseId(test.$.name),
            status: test.failure ? "failed" : "passed",
            time: parseFloat(test.$.time) * 1000,
            comment: test.failure ? test.failure[0].$.message : "Test passed",
        }));
    } catch (error) {
        console.error("Error parsing JUnit report:", error.message);
        process.exit(1);
    }
}

function extractQaseCaseId(testName) {
    const match = testName.match(/VIEWIQ-(\d+)/);
    return match ? parseInt(match[1], 10) : null;
}

async function pushResultsToQase() {
    const runId = await getRunId();
    const testCases = await parseJUnitReport(JUNIT_REPORT_PATH);

    for (const testCase of testCases) {
        if (!testCase.qaseCaseId) {
            console.warn(`Skipping test without Qase ID: ${testCase.name}`);
            continue;
        }

        try {
            const response = await axios.post(
                `https://api.qase.io/v1/result/${qaseProjectCode}/${runId}`,
                {
                    case_id: testCase.qaseCaseId,
                    status: testCase.status,
                    comment: testCase.comment,
                    time: testCase.time,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Token: qaseApiToken,
                    },
                }
            );
            console.log(`Uploaded result for Qase case ID: ${testCase.qaseCaseId}, Status: ${testCase.status}`);
        } catch (error) {
            console.error(
                `Error uploading result for Qase case ID: ${testCase.qaseCaseId}`,
                error.response ? error.response.data : error.message
            );
        }
    }
}

pushResultsToQase();
