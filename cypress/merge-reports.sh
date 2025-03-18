#!/bin/bash
echo "Merging mochawesome JSON reports..."

REPORTS_DIR="cypress/reports/mochawesome"

if [ ! -d "${REPORTS_DIR}" ]; then
  echo "Reports directory ${REPORTS_DIR} does not exist."
  exit 1
fi

JSON_FILES=$(find "${REPORTS_DIR}" -type f -name "*.json" -size +0)

echo "Found JSON files:"
echo "${JSON_FILES}"

if [ -z "${JSON_FILES}" ]; then
  echo "No non-empty mochawesome JSON files to merge."
  exit 0
fi

MERGED_REPORT="${REPORTS_DIR}/mochawesome_merged.json"
MERGED_HTML="${REPORTS_DIR}/mochawesome_merged.html"

echo "Merging JSON reports..."
npx mochawesome-merge ${JSON_FILES} > "${MERGED_REPORT}"

if [ $? -eq 0 ]; then
  echo "Merged report saved to ${MERGED_REPORT}"
else
  echo "Failed to merge reports."
  exit 1
fi

echo "Generating HTML report from merged JSON..."
mkdir -p "$(dirname "${MERGED_HTML}")"
npx mochawesome-report-generator "${MERGED_REPORT}" -o "$(dirname "${MERGED_HTML}")"

if [ $? -eq 0 ]; then
  echo "Merged HTML report saved to ${MERGED_HTML}"
else
  echo "Failed to generate HTML report."
  exit 1
fi
