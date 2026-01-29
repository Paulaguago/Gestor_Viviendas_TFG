// Helper functions for Random Forest explanations

export async function fetchRfImportance() {
  const res = await fetch('/rf/importance');
  if (!res.ok) throw new Error('No se pudo cargar la importancia RF');
  return res.json();
}

export async function fetchRfDistribution() {
  const res = await fetch('/rf/distribution');
  if (!res.ok) throw new Error('No se pudo cargar la distribución RF');
  return res.json();
}

// Render horizontal bar for feature importances
export async function renderRfImportance(containerSelector, topN = 15) {
  const el = document.querySelector(containerSelector);
  if (!el) return;
  const data = await fetchRfImportance();
  // Expected shapes:
  // { features: ["barrio_mean_price", ...], importances: [0.18, ...] }
  // or an array of objects [{name, importance}]
  let pairs = [];
  if (Array.isArray(data)) {
    pairs = data.map(d => ({ name: d.name || d.feature || '', score: d.importance || d.score || 0 }));
  } else if (data && Array.isArray(data.features) && Array.isArray(data.importances)) {
    pairs = data.features.map((n, i) => ({ name: n, score: data.importances[i] ?? 0 }));
  }
  pairs = pairs
    .filter(p => Number.isFinite(p.score))
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
    .slice(0, topN);

  if (typeof Plotly === 'undefined') {
    el.innerHTML = '<div class="text-muted">Cargando Plotly…</div>';
    return;
  }

  const trace = {
    type: 'bar',
    x: pairs.map(p => p.score),
    y: pairs.map(p => p.name),
    orientation: 'h',
    marker: { color: '#4f6d7a' }
  };
  const layout = {
    margin: { l: 150, r: 20, t: 10, b: 30 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)'
  };
  Plotly.newPlot(el, [trace], layout, { displayModeBar: false });
}

// Render histogram for y_true vs y_pred (distributions)
export async function renderRfDistribution(containerSelector) {
  const el = document.querySelector(containerSelector);
  if (!el) return;
  const data = await fetchRfDistribution();
  const yTrue = data.y_true || [];
  const yPred = data.y_pred || [];
  if (typeof Plotly === 'undefined') {
    el.innerHTML = '<div class="text-muted">Cargando Plotly…</div>';
    return;
  }
  const traceTrue = { type: 'histogram', x: yTrue, opacity: 0.5, name: 'Reales', marker: { color: '#8aa17a' } };
  const tracePred = { type: 'histogram', x: yPred, opacity: 0.5, name: 'RF', marker: { color: '#4f6d7a' } };
  const layout = {
    barmode: 'overlay',
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)'
  };
  Plotly.newPlot(el, [traceTrue, tracePred], layout, { displayModeBar: false });
}
