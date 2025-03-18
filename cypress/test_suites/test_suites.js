module.exports = {
  login: [
    'cypress/e2e/login.cy.js'
  ],
  home: [
    'cypress/e2e/home.cy.js'
  ],
  tools: [
    'cypress/e2e/Tools/audit-queue.cy.js',
    'cypress/e2e/Tools/custom-tagger.cy.js',
    'cypress/e2e/Tools/my-custom-data.cy.js',
    'cypress/e2e/Tools/pacing-report.cy.js'
  ],
  reporting: [
    'cypress/e2e/Reporting+/reporting+.cy.js'
  ],
  inspect: [
    'cypress/e2e/Inspect/Inspect.cy.js'
  ],
  insights: [
    'cypress/e2e/Insights/insights-channels.cy.js',
    'cypress/e2e/Insights/insights-videos.cy.js'
  ],
  build: [
    'cypress/e2e/Build/build-channels.cy.js',
    'cypress/e2e/Build/build-cosmo.cy.js',
    'cypress/e2e/Build/build-exclusion.cy.js',
    'cypress/e2e/Build/build-videos.cy.js'
  ],
  admin: [
    'cypress/e2e/Admin/blocklist-manager.cy.js',
    'cypress/e2e/Admin/inapp-notifications.cy.js',
    'cypress/e2e/Admin/keywords-editor.cy.js',
    'cypress/e2e/Admin/umbrella-topics.cy.js',
    'cypress/e2e/Admin/user-list.cy.js'
  ],
  userlist: [
    'cypress/e2e/Admin/user-list.cy.js'
  ],
  test: [
    'cypress/e2e/Admin/keywords-editor.cy.js'
  ]

};