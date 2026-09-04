const channels = {
  Gold: ['1970s inflation shock', 'Gold historically served as an inflation and geopolitical-risk hedge, but high prices can also concentrate a portfolio in one defensive trade.'],
  Energy: ['1973 oil crisis', 'Oil-supply disruptions raised energy costs, lifted inflation expectations and pressured energy-intensive sectors.'],
  'Interest rates': ['2022 global rate reset', 'Higher yields typically reduce the present value of long-duration bonds and growth assets.'],
  Technology: ['2022 technology selloff', 'Technology valuations can be sensitive to rates, earnings expectations and risk appetite.'],
};
function researchEvents(events, analytics) {
  const keywords = [...analytics.concentration.bySector.slice(0, 3).map((x) => x.name), ...analytics.concentration.byAssetClass.map((x) => x.name)].join(' ').toLowerCase();
  const relevant = events.filter((event) => event.primary_transmission.toLowerCase().split(',').some((term) => keywords.includes(term.trim()) || ['energy', 'gold', 'technology'].includes(term.trim())))
    .slice(-5).map((event) => {
      const key = Object.keys(channels).find((item) => event.primary_transmission.toLowerCase().includes(item.toLowerCase()));
      const precedent = key ? channels[key] : ['Comparable market dislocation', 'Historical impact depends on the size, duration and policy response.'];
      return { event: event.description, date: event.event_date, severity: event.severity, transmission: event.primary_transmission, historicalPrecedent: precedent[0], historicalContext: precedent[1], source: { title: 'SingHacks authoritative event log', publisher: 'SingHacks dataset', url: null } };
    });
  return relevant;
}
module.exports = { researchEvents };
