Demo Project Overview

I’d like to present a few of my existing projects to showcase my work:

AI Agent for QA Automation (ai_project)
This project integrates Jira, OpenAI, and an automation suite to streamline the QA process. The goal was to automate the generation of QA test cases and upload them directly to Qase.io. The AI analyzes the existing UI automation suite, identifies selector selections, and automatically generates new automation code. As an additional feature, the project includes a ticket estimation tool for sprint planning and a discrepancy analyzer, both of which help support the product team in managing and improving the testing process.

Cypress Automation Project
Initially, I ran Cypress tests locally, executing them individually. To optimize performance and enhance test isolation, I later implemented Docker and split the tests into two containers, enabling faster execution. After each test run, I have scripts that merge the test results and publish them to Qase.io for analysis, helping to plan the next test coverage and execution. Additionally, I convert the results into a format compatible with TeamCity, which we use for our CI/CD pipeline. The Cypress suite includes tests (with most removed for demo purposes, but leaving one for demonstration), and follows the Page Object Model (POM) for better readability and easier test maintenance. The project also contains a commands.js file with reusable functions, making it easy to share code across the framework. I’ve also organized the test suite to run specific tests on TeamCity, aiding in the development of new tests.
As a bonus fun project for a QA team regression_prod and regression_rc scripts executes api tests by using newman. I integrated it from postman so we can run it in ci/cd (about 200 tests in 15 min run)


Thank you! 