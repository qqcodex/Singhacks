const fs = require('node:fs');
const path = require('node:path');

function parseCsv(text) {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(value); value = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(value);
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = []; value = '';
    } else value += char;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  const [headers, ...records] = rows;
  return records.map((record) => Object.fromEntries(headers.map((key, index) => [key, record[index] ?? ''])));
}

function loadData(dataDirectory) {
  const csv = (name) => parseCsv(fs.readFileSync(path.join(dataDirectory, name), 'utf8'));
  return {
    clients: csv('clients.csv'), portfolios: csv('portfolios.csv'), holdings: csv('holdings.csv'),
    instruments: csv('instruments.csv'), mandates: csv('mandates.csv'), commitments: csv('commitments.csv'),
    cashNeeds: csv('planned_cash_needs.csv'), creditFacilities: csv('credit_facilities.csv'),
    events: csv('event_log.csv'), notes: JSON.parse(fs.readFileSync(path.join(dataDirectory, 'rm_notes.json'), 'utf8')),
  };
}

module.exports = { loadData };
