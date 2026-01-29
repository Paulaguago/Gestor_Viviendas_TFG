// Helper functions to fetch EBM explanations from the server
// Usage example (later in views):
//   import('/js/ebm.js').then(m => m.renderGlobal('#id'))

export async function fetchEbmGlobal() {
  const res = await fetch('/explain/global');
  if (!res.ok) throw new Error('No se pudo cargar la explicación global EBM');
  return res.json();
}

export async function fetchEbmLocal() {
  const res = await fetch('/explain/local');
  if (!res.ok) throw new Error('No se pudo cargar la explicación local EBM');
  return res.json();
}

// Live local explanation for current instance
export async function fetchEbmLocalLive(input) {
  const res = await fetch('/explain/local-live', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input })
  });
  if (!res.ok) throw new Error('No se pudo generar la explicación local EBM');
  return res.json();
}

// Basic extractors (depend on interpret JSON structure)
export function topGlobalFeatures(globalJson, topN = 15) {
  try {
    const names = globalJson.feature_names || globalJson.names || [];
    const importances = globalJson.scores || globalJson.importances || [];
    const pairs = names.map((n, i) => ({ name: n, score: importances[i] ?? 0 }));
    return pairs
      .filter(p => Number.isFinite(p.score))
      .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
      .slice(0, topN);
  } catch (e) {
    console.warn('topGlobalFeatures parse error:', e);
    return [];
  }
}

// Minimal renderer with Plotly if available (no-op if not loaded)
export async function renderGlobal(containerSelector, topN = 15) {
  const el = document.querySelector(containerSelector);
  if (!el) return;
  const data = await fetchEbmGlobal();
  const top = topGlobalFeatures(data, topN);
  if (typeof Plotly === 'undefined') {
    el.innerHTML = '<div class="text-muted">Cargando Plotly…</div>';
    return;
  }
  const trace = {
    type: 'bar',
    x: top.map(t => t.score),
    y: top.map(t => t.name),
    orientation: 'h',
    marker: { color: '#8aa17a' }
  };
  const layout = {
    margin: { l: 150, r: 20, t: 10, b: 30 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)'
  };
  Plotly.newPlot(el, [trace], layout, { displayModeBar: false });
}

// Render local explanation bars (SHAP-like)
export function renderLocalBars(containerSelector, local, topN = 12) {
  const el = document.querySelector(containerSelector);
  if (!el) return;
  const names = local?.names || local?.feature_names || [];
  const scores = local?.scores || [];
  // some formats: {specific: [{names, scores}]} — try to recover
  let pairs = [];
  if (Array.isArray(names) && Array.isArray(scores) && names.length === scores.length) {
    pairs = names.map((n, i) => ({ name: n, score: scores[i] ?? 0 }));
  } else if (Array.isArray(local?.specific) && local.specific[0]?.names) {
    const n2 = local.specific[0].names;
    const s2 = local.specific[0].scores;
    pairs = n2.map((n, i) => ({ name: n, score: s2[i] ?? 0 }));
  }
  // remove bias/intercept if present
  pairs = pairs.filter(p => p.name && p.name.toLowerCase() !== 'bias' && p.name.toLowerCase() !== 'intercept');
  pairs = pairs.sort((a, b) => Math.abs(b.score) - Math.abs(a.score)).slice(0, topN);

  if (typeof Plotly === 'undefined') {
    el.innerHTML = '<div class="text-muted">Cargando Plotly…</div>';
    return;
  }
  const colors = pairs.map(p => (p.score >= 0 ? '#4c956c' : '#b63f33'));
  const trace = {
    type: 'bar',
    x: pairs.map(p => p.score),
    y: pairs.map(p => p.name),
    orientation: 'h',
    marker: { color: colors }
  };
  const layout = {
    margin: { l: 180, r: 20, t: 10, b: 30 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    xaxis: { zeroline: true, zerolinecolor: '#999' }
  };
  Plotly.newPlot(el, [trace], layout, { displayModeBar: false });
}

// Extract list of features from global JSON
export function listFeatures(globalJson) {
  return (globalJson.feature_names || globalJson.names || []).slice();
}

// Extract PDP data for a given feature name from global JSON
export function getPdp(globalJson, featureName) {
  const names = listFeatures(globalJson);
  const idx = names.findIndex(n => n === featureName);
  if (idx < 0) return null;
  const spec = Array.isArray(globalJson.specific) ? globalJson.specific[idx] : null;
  if (!spec) return null;

  // Attempt to recover x-axis and contributions
  let xs = [];
  let ys = [];
  // Common shapes in interpret:
  // - spec.values (categorical)
  // - spec.bin_edges (continuous) + spec.scores
  // - spec.names (could be bin centers or categories)
  if (Array.isArray(spec.values)) {
    xs = spec.values;
    ys = Array.isArray(spec.scores) ? spec.scores : [];
    return { type: 'categorical', x: xs, y: ys };
  }
  if (Array.isArray(spec.bin_edges) && Array.isArray(spec.scores)) {
    // Midpoints of edges to place scores
    const edges = spec.bin_edges;
    const mids = [];
    for (let i = 0; i < edges.length - 1 && i < spec.scores.length; i++) {
      const a = Number(edges[i]);
      const b = Number(edges[i + 1]);
      const m = (isFinite(a) && isFinite(b)) ? (a + b) / 2 : i;
      mids.push(m);
    }
    return { type: 'continuous', x: mids, y: spec.scores };
  }
  if (Array.isArray(spec.names) && Array.isArray(spec.scores)) {
    const numeric = spec.names.map(v => {
      const n = Number(v);
      return isFinite(n) ? n : null;
    });
    if (numeric.every(v => v !== null)) {
      return { type: 'continuous', x: numeric, y: spec.scores };
    }
    return { type: 'categorical', x: spec.names, y: spec.scores };
  }
  return null;
}

export function renderPdp(containerSelector, globalJson, featureName) {
  const el = document.querySelector(containerSelector);
  if (!el) return;
  const pdp = getPdp(globalJson, featureName);
  if (!pdp) {
    el.innerHTML = `<div class="text-muted">Sin datos PDP para "${featureName}".</div>`;
    return;
  }
  if (typeof Plotly === 'undefined') {
    el.innerHTML = '<div class="text-muted">Cargando Plotly…</div>';
    return;
  }
  if (pdp.type === 'categorical') {
    const trace = { type: 'bar', x: pdp.x, y: pdp.y, marker: { color: '#769c6e' } };
    const layout = { margin: { l: 40, r: 20, t: 10, b: 80 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)' };
    Plotly.newPlot(el, [trace], layout, { displayModeBar: false });
  } else {
    const trace = { type: 'scatter', x: pdp.x, y: pdp.y, mode: 'lines+markers', line: { color: '#769c6e' }, marker: { size: 6 } };
    const layout = { margin: { l: 60, r: 20, t: 10, b: 50 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', xaxis: { title: featureName }, yaxis: { title: 'Contribución' } };
    Plotly.newPlot(el, [trace], layout, { displayModeBar: false });
  }
}
