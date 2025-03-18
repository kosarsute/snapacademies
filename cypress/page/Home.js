class HomePage {
    homeBtn() {
        return cy.get('span.home').first()
    }

    channelTittle() {
        return cy.get('span.title')
    }
    cardTittle() {
        return cy.get('.title-container > .name')
    }
    backToInsightsBtn() {
        return cy.get('.global-header-btn')
    }
    dataRow(timeout) {
        return cy.get('.data-row', timeout)
    }
    runningAudits() {
        return cy.get('.number').first()
    }
    queuedAudits() {
        return cy.get('.number').eq(1)
    }
    noAuditsMsg() {
        return cy.get('.no-audits')
    }
    auditItem() {
        return cy.get('div.audit-item')
    }
    numberOfMachines() {
        return cy.get('.machines')
    }
    watchlistItem() {
        return cy.get('div.op-item')
    }
    numberWatched() {
        return cy.get('div.watchlist-container')
    }
    watchBtn() {
        return cy.get('button.not-watched')
    }
    watchedBtn() {
        return cy.get('button.watched')
    }
    disabledBtn() {
        return cy.get('button.not-watched')
    }
    bellIcon() {
        return cy.get('.alert-icon')
    }
    watchedFilter() {
        return cy.get('#checkboxes-filter-watch-true-pacing-report-filters')
    }
    applyBtn() {
        return cy.get('.apply-button')
    }
    insightsBtn() {
        return cy.get('[href="/insights"]')
    }
    icons() {
        return cy.get('div.icons')
    }
    serviceDesk() {
        return cy.contains('.email', 'Help Center')
    }
    helpCenter() {
        return cy.get('div.sc-fihHvN.iBsklD')
    }
    loadingBar() {
        return cy.get('.loading-bar.indeterminate')
    }
    navAdmin() {
        return cy.get('[data-testid="/admin"]')
    }
    navUmbrellaTopics() {
        return cy.get('[data-testid="/admin/umbrella_topics"]')
    }
    navTools() {
        return cy.get('[data-testid="/tools"]')
    }
    navCustomTagger() {
        return cy.get('[data-testid="/tools/custom_tagger"]')
    }
    welcomeUserHeader() {
        return cy.get('div.page-title')
    }
    exportManager() {
        return cy.get('[data-testid="/exports_manager"]')
    }
    navForecasting() {
       return cy.get('[data-testid="/forecasting"]')
    }
}

module.exports = new HomePage();