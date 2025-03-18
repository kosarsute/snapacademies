#!/bin/bash
set -e

echo "Current user: $USER"

npm install axios --legacy-peer-deps

echo "Generating Qase Run..."
node get-qase-run.js > qase-run-id.txt

if [ -z "$1" ]; then
  echo "Running full regression (all containers)..."
  docker compose build --no-cache
  docker compose up || true
  echo "Merging reports..."
  bash merge-reports.sh
  node convert-mochawesome-to-junit.js
  node push-results-to-qase.js
else
  SUITE=$1
  echo "Running suite: $SUITE"

  TEST_SUITES_PATH="cypress/test_suites/test_suites.js"
  if [[ ! -f "$TEST_SUITES_PATH" ]]; then
    echo "Error: test_suites.js not found at $TEST_SUITES_PATH"
    exit 1
  fi

  SPEC_FILES=$(node -e "
    const suites = require('./$TEST_SUITES_PATH');
    if (!suites['$SUITE']) {
      console.error('Error: Suite \"$SUITE\" not found in test_suites.js');
      process.exit(1);
    }
    console.log(suites['$SUITE'].join(','));
  ")

  docker compose build --no-cache

  set +e
  docker compose run --rm \
    -e SPEC_FILES="$SPEC_FILES" \
    -e CYPRESS_CONTAINER_NAME="$SUITE" \
    test1 npx cypress run --spec "$SPEC_FILES"
  CYPRESS_EXIT_CODE=$?
  set -e

  echo "Generating reports for suite: $SUITE"
  bash merge-reports.sh
  node convert-mochawesome-to-junit.js
  node push-results-to-qase.js

  exit $CYPRESS_EXIT_CODE
fi
