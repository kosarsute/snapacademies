const fs = require("fs");
const path = require("path");
const junit = require("junit-report-builder");

const mochawesomeReportPath = path.join(
    __dirname,
    "cypress/reports/mochawesome/mochawesome_merged.json"
);

const junitOutputPath = path.join(
    __dirname,
    "cypress/reports/junit/merged-test-results.xml"
);

function extractQaseCaseId(title) {
    const match = title.match(/VIEWIQ-(\d+)/); 
    return match ? match[1] : null; 
}

function convertMochawesomeToJUnit() {
    if (!fs.existsSync(mochawesomeReportPath)) {
        console.error(`Mochawesome report not found at: ${mochawesomeReportPath}`);
        process.exit(1);
    }

    const reportData = JSON.parse(fs.readFileSync(mochawesomeReportPath, "utf-8"));

    const suite = junit.testSuite().name("Cypress Tests");

    reportData.results.forEach((result) => {
        result.suites.forEach((suiteData) => {
            suiteData.tests.forEach((testCase) => {
                const qaseCaseId = extractQaseCaseId(testCase.title);
                const testCaseBuilder = suite
                    .testCase()
                    .className(suiteData.title)
                    .name(
                        qaseCaseId
                            ? `${testCase.title} (Qase ID: ${qaseCaseId})`
                            : testCase.title
                    )
                    .time(testCase.duration / 1000);

                if (testCase.state === "failed") {
                    testCaseBuilder.failure(testCase.err.message || "Test failed");
                } else if (testCase.state === "skipped") {
                    testCaseBuilder.skipped();
                }
            });
        });
    });

    junit.writeTo(junitOutputPath);
    console.log(`JUnit XML report generated at: ${junitOutputPath}`);
}

convertMochawesomeToJUnit();
