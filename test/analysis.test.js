const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadData } = require('../src/data/csv');
const { analyze } = require('../src/agents/orchestrator');
const data = loadData(path.resolve(__dirname, '../singhacks-jb-wealth-intelligence/data'));
test('analysis returns a governed structured response for an existing client', () => {
  const response = analyze(data, 'CL-0001', 'What should I know?');
  assert.equal(response.client.id, 'CL-0001');
  assert.equal(response.governance.status, 'RM_REVIEW_REQUIRED');
  assert.ok(response.risks.length > 0);
  assert.ok(response.riskMetrics.totalAumUsd > 0);
});
test('unknown client returns null', () => assert.equal(analyze(data, 'CL-9999'), null));
