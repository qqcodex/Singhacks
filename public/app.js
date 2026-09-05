const $ = (selector) => document.querySelector(selector);
const state = { clients: [], report: null };
const palette = ['#2d7666', '#d6a84f', '#8ca3a0', '#b9d4cb', '#a56a6a', '#9d8ac5'];
const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);
const percent = (value) => `${Number(value || 0).toFixed(1)}%`;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

async function requestAnalysis(clientId, question = 'What should the RM know before the meeting?') {
  const response = await fetch('/api/analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, question }) });
  if (!response.ok) throw new Error('Could not load client intelligence.');
  return response.json();
}

function renderRisks(risks, limit = 4) {
  const visibleRisks = risks.slice(0, limit);
  $('#risk-list').innerHTML = visibleRisks.map((risk) => `<article class="risk-card"><span class="risk-bar ${risk.severity.toLowerCase()}"></span><div><h4>${escapeHtml(risk.title)}</h4><p>${escapeHtml(risk.description)}</p>${risk.evidence?.[0] ? `<div class="evidence">${escapeHtml(risk.evidence[0].metric)} · ${escapeHtml(risk.evidence[0].value)}</div>` : ''}</div><span class="severity ${risk.severity.toLowerCase()}">${risk.severity}</span></article>`).join('');
  const button = $('#show-all-risks');
  button.hidden = risks.length <= 4;
  button.textContent = limit >= risks.length ? 'Show priority signals' : `View all ${risks.length} signals`;
}

function render(report) {
  state.report = report;
  const { client, summary, riskMetrics, risks, historicalEvents, evidence, recommendations } = report;
  $('#crumb-name').textContent = client.name;
  $('#risk-nav-count').textContent = risks.length;
  $('#risk-pill').textContent = `${summary.riskLevel.replace('_', ' ')} PRIORITY`;
  $('#headline').textContent = summary.headline;
  $('#client-objective').textContent = client.objectives;
  $('#metric-aum').textContent = money(riskMetrics.totalAumUsd);
  const change = summary.portfolioChangePct;
  $('#metric-change').textContent = `${change >= 0 ? '↑' : '↓'} ${Math.abs(change).toFixed(1)}% since Dec 2025`;
  $('#metric-change').className = change >= 0 ? 'positive' : 'negative';
  $('#metric-largest').textContent = percent(riskMetrics.largestPositionPct);
  $('#metric-liquid').textContent = percent(riskMetrics.liquidAssetPct);
  $('#metric-coverage').textContent = riskMetrics.liquidityCoverageRatio ? `${riskMetrics.liquidityCoverageRatio.toFixed(1)}× cash-needs cover` : 'No known cash needs';
  $('#metric-ltv').textContent = riskMetrics.ltv.length ? percent(Math.max(...riskMetrics.ltv)) : '—';
  renderRisks(risks);
  $('#recommendations').innerHTML = recommendations.map((item, index) => `<article class="recommendation"><span class="recommendation-number">0${index + 1}</span><div><h4>${escapeHtml(item.action)}</h4><p>${escapeHtml(item.reason)}</p></div></article>`).join('');
  const allocation = evidence.allocation.slice(0, 5);
  let cursor = 0;
  $('#donut').style.background = `conic-gradient(${allocation.map((item, i) => { const start = cursor; cursor += item.weightPct; return `${palette[i]} ${start}% ${cursor}%`; }).join(',')})`;
  $('#donut-total').textContent = money(riskMetrics.totalAumUsd);
  $('#allocation-list').innerHTML = allocation.map((item, i) => `<li><span><i style="background:${palette[i]}"></i>${escapeHtml(item.name)}</span><b>${percent(item.weightPct)}</b></li>`).join('');
  $('#event-list').innerHTML = historicalEvents.slice(0, 3).map((event) => `<article class="event"><small>${event.date} · ${event.severity.toUpperCase()}</small><p>${escapeHtml(event.event)}</p></article>`).join('');
  const note = evidence.notes.at(-1);
  $('#note-text').textContent = note?.note || 'No relationship-manager notes are available for this client.';
  $('#note-meta').textContent = note ? `${note.channel} · ${note.date}` : '';
}

function meetingBrief() {
  const { client, risks, recommendations, evidence } = state.report;
  $('#brief-title').textContent = `${client.name} — meeting brief`;
  $('#brief-content').innerHTML = `<p>Start with the client’s stated objective: <strong>${escapeHtml(client.objectives)}</strong></p><h3>Suggested agenda</h3><ul>${risks.slice(0, 3).map((risk) => `<li><strong>${escapeHtml(risk.title)}:</strong> ${escapeHtml(risk.description)}</li>`).join('')}<li><strong>Recommended next step:</strong> ${escapeHtml(recommendations[0]?.action || 'Confirm priorities and suitability.')}</li></ul><p class="eyebrow">EVIDENCE AVAILABLE: ${evidence.notes.length} RM NOTES · ${state.report.historicalEvents.length} MARKET EVENTS</p>`;
  $('#brief-dialog').showModal();
}

async function init() {
  try {
    const response = await fetch('/api/clients'); state.clients = await response.json();
    $('#client-select').innerHTML = state.clients.map((client) => `<option value="${client.id}">${escapeHtml(client.name)} · ${client.riskProfile}</option>`).join('');
    render(await requestAnalysis(state.clients[0].id));
  } catch (error) { $('#headline').textContent = error.message; }
}
$('#client-select').addEventListener('change', async (event) => { $('#headline').textContent = 'Refreshing client intelligence…'; render(await requestAnalysis(event.target.value)); });
$('#prepare-button').addEventListener('click', meetingBrief);
$('#ask-button').addEventListener('click', () => { $('#question-answer').hidden = true; $('#question-input').value = ''; $('#question-dialog').showModal(); $('#question-input').focus(); });
$('#question-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('#question-form button'); const question = $('#question-input').value.trim();
  button.disabled = true; button.textContent = 'Analysing…';
  try {
    const report = await requestAnalysis($('#client-select').value, question);
    const answer = report.answer;
    $('#question-answer').innerHTML = `<h3>Grounded answer</h3><p>${escapeHtml(answer.response)}</p><div class="answer-evidence">${answer.evidence.map((item) => `<div><strong>${escapeHtml(item.label)}</strong><br>${escapeHtml(item.detail)}</div>`).join('')}</div><p><small>${escapeHtml(answer.governance)}</small></p>`;
    $('#question-answer').hidden = false;
  } catch (error) { $('#question-answer').textContent = error.message; $('#question-answer').hidden = false; }
  finally { button.disabled = false; button.innerHTML = 'Analyse question <span>→</span>'; }
});
$('#show-all-risks').addEventListener('click', () => {
  const showingAll = $('#show-all-risks').textContent.startsWith('Show priority');
  renderRisks(state.report.risks, showingAll ? 4 : state.report.risks.length);
});
$('#view-evidence').addEventListener('click', () => document.querySelector('.rm-note').scrollIntoView({ behavior: 'smooth' }));
document.querySelectorAll('.dialog-close-button').forEach((button) => button.addEventListener('click', () => $('#brief-dialog').close()));
document.querySelectorAll('.dialog-close').forEach((button) => button.addEventListener('click', (event) => event.target.closest('dialog').close()));
init();
