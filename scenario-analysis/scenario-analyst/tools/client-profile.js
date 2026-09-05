import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { CONFIG } from '../config.js';

function loadCsv(filePath) {
  const fullPath = path.resolve(filePath);
  const content = fs.readFileSync(fullPath, 'utf-8');
  return parse(content, { columns: true, skip_empty_lines: true });
}

export async function loadClientProfile(clientId) {
  const clients = loadCsv(CONFIG.paths.clientsCsv);
  const client = clients.find(c => c.client_id === clientId);
  
  if (!client) {
    throw new Error(`Client ${clientId} not found in clients.csv`);
  }

  return {
    clientId: client.client_id,
    clientName: client.client_name,
    age: parseInt(client.age) || null,
    gender: client.gender,
    nationality: client.nationality,
    countryOfResidence: client.country_of_residence,
    taxDomicile: client.tax_domicile,
    bookingCentre: client.booking_centre,
    rmId: client.rm_id,
    rmName: client.rm_name,
    rmDesk: client.rm_desk,
    baseCurrency: client.base_currency,
    wealthBand: client.wealth_band,
    totalAumUsd: parseFloat(client.total_aum_usd) || 0,
    lifeStage: client.life_stage,
    sourceOfWealth: client.source_of_wealth,
    riskProfile: client.risk_profile,
    riskToleranceScore: parseInt(client.risk_tolerance_score) || 0,
    investmentHorizonYears: parseInt(client.investment_horizon_years) || 0,
    liquidityNeeds: client.liquidity_needs,
    objectives: client.objectives,
    clientSince: client.client_since,
    kycReviewDue: client.kyc_review_due,
    pepStatus: client.pep_status,
    reportingLanguage: client.reporting_language
  };
}