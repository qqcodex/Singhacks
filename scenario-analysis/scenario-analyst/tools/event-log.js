import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { CONFIG } from '../config.js';

function loadCsv(filePath) {
  const fullPath = path.resolve(filePath);
  const content = fs.readFileSync(fullPath, 'utf-8');
  return parse(content, { columns: true, skip_empty_lines: true });
}

export async function loadEvents(lookbackDays = CONFIG.scenario.lookbackEventsDays) {
  const events = loadCsv(CONFIG.paths.eventLogCsv);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  return events
    .filter(e => e.event_date >= cutoffStr)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
    .map(e => ({
      eventDate: e.event_date,
      eventType: e.event_type,
      region: e.region,
      description: e.description,
      primaryTransmission: e.primary_transmission,
      severity: e.severity
    }));
}

export function formatEventsForPrompt(events) {
  if (!events.length) return 'No relevant historical events in lookback period.';
  
  return events.map(e => 
    `- ${e.eventDate} [${e.severity}] ${e.eventType} (${e.region}): ${e.description}\n  Transmission: ${e.primaryTransmission}`
  ).join('\n');
}