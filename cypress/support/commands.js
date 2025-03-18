import "cypress-mailosaur";
import "cypress-xpath";
import "chai";
import { faker } from "@faker-js/faker";
import BuildPage from "../page/Build";
import AdminPage from "../page/Admin";
import chaiColors from "chai-colors";
chai.use(chaiColors);
import HomePage from "../page/Home";
import "cypress-file-upload";

Cypress.Commands.add("waitForSpinner", (parentSelector, spinnerSelector, timeout = { timeout: 30000 }) => {
  cy.get('body').then(($body) => {
    if ($body.find(parentSelector).length > 0) {
      cy.get(parentSelector).then(($parent) => {
        if ($parent.find(spinnerSelector).length > 0) {
          cy.get(spinnerSelector, timeout).should("not.exist");
        }
      });
    }
  });
});

Cypress.Commands.add("getConfirmationCodeFromEmail", (email, serverId, testStart, maxAttempts = 20, delay = 15000) => {
  function getMessage(attempts) {
    if (attempts <= 0) throw new Error("Confirmation email not received in time");

    cy.log(`Attempting to retrieve email, attempts left: ${attempts}`);

    return cy.mailosaurGetMessage(serverId, { sentTo: email, receivedAfter: testStart })
      .then((message) => {
        if (!message) {
          cy.wait(delay);
          return getMessage(attempts - 1);
        }
        return message.html.codes[0].value.replace("-", "");
      });
  }
  return getMessage(maxAttempts);
});

Cypress.Commands.add("extractAndValidateNumber", (selector, expectedValue) => {
  cy.get(selector)
    .invoke("text")
    .then((text) => {
      const number = parseFloat(text.replace(/[^0-9.]/g, ""));
      expect(number).to.equal(expectedValue);
    });
});
