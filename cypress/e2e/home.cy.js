const HomePage = require("../page/Home");
require("cypress-file-upload");

describe("Home", () => {
  beforeEach(() => {
    cy.mailosaurDeleteAllMessages(Cypress.env("serverId"));
    cy.loginWithEmail()
  });
  it("VIEWIQ-14 - Channels/Videos/IAB Categories tabs work as expected", () => {
    cy.tabNavigation("Videos");
    HomePage.dataRow({ timeout: 100000 }).should("have.length", 10);
    cy.tabNavigation("IAB Categories");
    HomePage.dataRow({ timeout: 100000 }).should("have.length", 10);
    cy.tabNavigation("Channels");
    HomePage.dataRow({ timeout: 100000 }).should("have.length", 10);
  });
  it("VIEWIQ-36 - Links work", () => {
    if (Cypress.env('ENV_TYPE') === 'rc') {
      cy.log('Skipping this test on rc environment')
      return;
    }
    cy.waitUntilLoadingDisappeared({ timeout: 100000 });
    let firstChannel;
    HomePage.channelTittle()
      .first()
      .invoke("text")
      .then((text) => {
        firstChannel = text;
      });
    HomePage.channelTittle().each(($el, index, $list) => {
      const text = $el.text();
      if (text === firstChannel) {
        cy.wrap($el).eq(index).click();
      }
    });
    cy.waitUntilLoadingDisappeared({ timeout: 100000 });
    let channelName;
    HomePage.cardTittle()
      .invoke("text")
      .then((text) => {
        channelName = text;
        expect(channelName).to.equal(firstChannel);
      });
    HomePage.backToInsightsBtn().click();
    cy.tabNavigation("Videos");

    cy.waitUntilLoadingDisappeared({ timeout: 100000 });
    let firstVideo;
    HomePage.channelTittle()
      .first()
      .invoke("text")
      .then((text) => {
        firstVideo = text;
      });
    HomePage.channelTittle().each(($el, index, $list) => {
      const text = $el.text();
      if (text === firstVideo) {
        cy.wrap($el).eq(index).click();
      }
    });
    cy.waitUntilLoadingDisappeared({ timeout: 100000 });
    let videoName;
    HomePage.cardTittle()
      .invoke("text")
      .then((text) => {
        videoName = text;
        expect(videoName).to.equal(firstVideo);
      });
  });
  it.skip("VIEWIQ-42 - Display correct #s of Audit Running/In Queue", () => {
    HomePage.runningAudits().then(($runningAudits) => {
      const runningAudits = parseInt($runningAudits.text());
      if (runningAudits === 0) {
        HomePage.noAuditsMsg().should("have.text", "No AuditsRunning");
      } else {
        HomePage.auditItem().then(($auditItems) => {
          let auditsRunning = 0;
          let auditsInQueue = 0;
          $auditItems.each((index, auditItem) => {
            const progress = parseFloat(Cypress.$(auditItem).find('rect').first().attr('width'));
            if (progress > 0) {
              auditsRunning++;
            } else {
              auditsInQueue++;
            }
          });
          expect(auditsRunning).to.be.lte(runningAudits);
        });
      }
    });
  });
  it("VIEWIQ-41 - Display # of machines running", () => {
    const isProd = Cypress.env("ENV_TYPE") === "prod";
    const expectedMachines = isProd
      ? "3 Machines running"
      : "1 Machine running";
    HomePage.numberOfMachines().should("contain", expectedMachines);
  });

  it("VIEWIQ-44 - Max 5 Campaigns", () => {
    cy.wait(5000);
    HomePage.watchlistItem().should("have.length.at.most", 5);
    cy.contains("Go to Pacing Report").click();
    cy.waitUntilLoadingDisappeared({ timeout: 100000 });
    cy.get('.watchlist-container').invoke('text').then((text) => {
      const cleanedText = text.replace(/\s+/g, '');
      if (cleanedText !== 'Watchlist(0/5)') {
        cy.unclickBtns("button.watched");
        cy.wait(3000);
      }
    });
    cy.get(".item-title", { timeout: 50000 }).each(($el) => {
      cy.wrap($el).should("be.visible");
    });
    HomePage.watchBtn().eq(0).click();
    HomePage.watchBtn().eq(1).click();
    cy.wait(10000);
    let watched;
    HomePage.numberWatched()
      .invoke("text")
      .then((text) => {
        watched = text;
        cy.log(watched);
        expect(watched).to.equal("Watchlist (2/5) ");
      });
    HomePage.homeBtn().click();
    HomePage.watchlistItem().should("have.length.at.most", 2);
    cy.contains("Go to Pacing Report").click();
    cy.get(".item-title", { timeout: 50000 }).each(($el) => {
      cy.wrap($el).should("be.visible");
    });
    HomePage.watchBtn().eq(2).click();
    HomePage.watchBtn().eq(3).click();
    HomePage.watchBtn().eq(4).click();
    HomePage.disabledBtn().should("be.disabled", { timeout: 10000 });
    cy.unclickBtns("button.watched");
    cy.wait(3000);
    HomePage.numberWatched()
      .invoke("text")
      .then((text) => {
        watched = text;
        cy.log(watched);
        cy.wait(3000);
        expect(watched).to.equal("Watchlist (0/5) ");
      });
  });
  it("VIEWIQ-54 - If nothing added to Watchlist, display the first 5 with Notifications on the full Pacing Report feature", () => {
    cy.wait(5000);
    HomePage.watchlistItem().should("have.length.at.most", 5);
    cy.contains("Go to Pacing Report").click();
    cy.waitUntilLoadingDisappeared({ timeout: 15000 });
    let watched;
    HomePage.numberWatched()
      .invoke("text")
      .then((text) => {
        watched = text;
        cy.log(watched);
        expect(watched).to.equal("Watchlist (0/5) ");
      });
    HomePage.homeBtn().click();
    HomePage.watchlistItem().should("have.length.at.most", 5);
  })
    ;
  it("VIEWIQ-37 - Oauth Module: Google Ads and DV360 synced status", () => {
    HomePage.icons().click();
    cy.get("span.synced").should("have.length", 2);
  });
  it("VIEWIQ-752 - ServiceDesk Module: Collapsable and navigates to the service page", () => {
    HomePage.icons().click();
    cy.intercept("GET", "**/servicedesk/customer/user/login**").as(
      "loginPage"
    );
    HomePage.serviceDesk().invoke("removeAttr", "target").click();
    cy.wait("@loginPage");
    cy.wait(5000);
    cy.origin("", { args: {} }, () => {
      cy.get('[data-test-id="login-page.wrapper"]').should("be.visible");
    });
  });
});
