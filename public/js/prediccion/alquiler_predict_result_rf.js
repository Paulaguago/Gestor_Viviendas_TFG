const FEATURE_LABELS = {
  bathrooms: 'Número de baños',
  bedrooms: 'Número de dormitorios',
  accommodates: 'Capacidad (huéspedes)',
  amenities_count: 'Número de servicios',
  has_pool: 'Piscina',
  has_jacuzzi: 'Jacuzzi',
  has_aircon: 'Aire acondicionado',
  has_wifi: 'Wi‑Fi',
  has_kitchen: 'Cocina',
  has_parking: 'Aparcamiento',
  has_tv: 'Televisión',
  has_washer: 'Lavadora',
  room_type_simple: 'Tipo de alojamiento',
  neigh_grouped: 'Barrio',
  capacity_category: 'Categoría de capacidad',
  bedroom_category: 'Categoría de dormitorios',
  review_scores_rating: 'Puntuación de reseñas',
  number_of_reviews: 'Número de reseñas',
  availability_365: 'Disponibilidad anual (días)',
  barrio_mean_price: 'Precio medio del barrio',
  barrio_median_price: 'Precio mediano del barrio',
  barrio_std_price: 'Variabilidad de precio en el barrio',
  barrio_count: 'Cantidad de anuncios en el barrio',
  barrio_avg_rating: 'Puntuación media del barrio',
  barrio_avg_reviews: 'Reseñas medias del barrio',
  barrio_popularity: 'Popularidad del barrio',
  bath_per_bed: 'Baños por dormitorio',
  review_score_weighted: 'Puntuación ponderada por reseñas',
  review_density: 'Densidad de reseñas',
  bedroom_efficiency: 'Eficiencia de dormitorios',
  is_high_season: 'Temporada alta',
  is_weekend: 'Fin de semana',
  is_summer: 'Verano',
  is_winter: 'Invierno',
  luxury_score: 'Servicios premium',
  basic_score: 'Servicios básicos',
  total_amenities_score: 'Puntuación total de servicios',
  price_vs_barrio_mean: 'Precio vs media del barrio',
  price_vs_barrio_median: 'Precio vs mediana del barrio',
  rating_vs_barrio_avg: 'Rating vs barrio',
  month: 'Mes de la estancia',
  day_of_week: 'Día de la semana',
  quarter: 'Trimestre'
};

const FEATURE_DESCRIPTIONS = {
  bathrooms: 'Número de baños que tiene la vivienda.',
  bedrooms: 'Cantidad de dormitorios disponibles.',
  accommodates: 'Número máximo de personas que pueden alojarse.',
  amenities_count: 'Cantidad total de servicios incluidos.',
  has_pool: 'Indica si la vivienda tiene piscina.',
  has_jacuzzi: 'Indica si la vivienda tiene jacuzzi.',
  has_aircon: 'Tiene aire acondicionado o no.',
  has_wifi: 'Tiene conexión Wi-Fi.',
  has_kitchen: 'Dispone de cocina para el huésped.',
  has_parking: 'Incluye plaza de aparcamiento.',
  has_tv: 'Tiene televisión.',
  has_washer: 'Incluye lavadora.',
  room_type_simple: 'Tipo de alojamiento (entero, habitación privada, etc.).',
  neigh_grouped: 'Barrio donde se encuentra el alojamiento.',
  capacity_category: 'Tamaño del alojamiento según su capacidad.',
  bedroom_category: 'Clasificación según el número de dormitorios. Es una agrupación del número de dormitorios en rangos, por ejemplo: muchos dormitorios, medios o muchos',
  review_scores_rating: 'Nota media que dejan los huéspedes.',
  number_of_reviews: 'Número total de opiniones recibidas.',
  availability_365: 'Días al año que está disponible para reservar.',
  barrio_mean_price: 'Precio medio por noche en el barrio.',
  barrio_median_price: 'Precio más habitual por noche en el barrio.',
  barrio_std_price: 'Cuánto varían los precios dentro del barrio.',
  barrio_count: 'Cantidad de alojamientos en el barrio.',
  barrio_avg_rating: 'Valoración media de los alojamientos del barrio.',
  barrio_avg_reviews: 'Número medio de reseñas en el barrio.',
  barrio_popularity: 'Nivel de demanda o popularidad del barrio.',
  bath_per_bed: 'Relación entre baños y dormitorios (comodidad).',
  review_score_weighted: 'Valoración ajustada según el número de reseñas.',
  review_density: 'Cantidad de reseñas en relación a la disponibilidad.',
  bedroom_efficiency: 'Qué tan bien se aprovechan los dormitorios.',
  is_high_season: 'Indica si es temporada alta.',
  is_weekend: 'Indica si la estancia incluye fin de semana.',
  is_summer: 'Indica si la fecha es en verano.',
  is_winter: 'Indica si la fecha es en invierno.',
  luxury_score: 'Nivel de servicios premium (piscina, jacuzzi, aire).',
  basic_score: 'Nivel de servicios básicos (wifi, cocina, TV, lavadora).',
  total_amenities_score: 'Valor total de los servicios ofrecidos.',
  price_vs_barrio_mean: 'Comparación del precio con la media del barrio.',
  price_vs_barrio_median: 'Comparación del precio con el precio habitual del barrio.',
  rating_vs_barrio_avg: 'Comparación de la valoración con la media del barrio.',
  month: 'Mes en el que se realiza la estancia.',
  day_of_week: 'Día de la semana de la estancia.',
  quarter: 'Trimestre del año.'
};

const METRICAS_MODELO = {
  rapida: { nombre: 'RF Optimizado', mae: 5.62, rmse: 12.92, r2: 0.9904, train_mae: 4.58, train_rmse: 10.77, train_r2: 0.9938 },
  detallada: { nombre: 'GB Optimizado', mae: 3.20, rmse: 5.13, r2: 0.9980, train_mae: 2.97, train_rmse: 4.56, train_r2: 0.9984 }
};

function friendlyName(name) {
  if (!name) return '';
  if (FEATURE_LABELS[name]) return FEATURE_LABELS[name];
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

async function renderShapLocal() {
  try {
    const res = await fetch('/alquiler/shap-local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelPath: sample.modelPath,
        input: sample.input
      })
    });
    if (!res.ok) {
      const errorData = await res.json();
      console.error('SHAP local error:', errorData);
      throw new Error('SHAP local no disponible: ' + (errorData.error || 'Unknown'));
    }
    const data = await res.json();
    const features = data.features || [];
    const shap_values = data.shap_values || [];
    
    const pairs = features.map((f, i) => {
      const raw = shap_values[i] || 0;
      return {
        key: f,
        name: friendlyName(f),
        value: Math.abs(raw),
        signed: raw
      };
    });
    const sorted = pairs
      .sort((a, b) => b.value - a.value)
      .slice(0, 12); // mostrar más (10-12) factores
    const max = sorted[0]?.value || 1;
    
    const container = document.getElementById('factors');
    container.innerHTML = '';
    sorted.forEach(item => {
      const row = document.createElement('div');
      row.className = 'bar-row';
      const pct = (item.value / max * 100).toFixed(0);
      const direction = item.signed >= 0 ? '↑ Precio' : '↓ Precio';
      const color = item.signed >= 0 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #7c2d12, #431407)';
      const desc = FEATURE_DESCRIPTIONS[item.key] || 'Explica cómo esta característica influye en el precio.';

      const labelWrap = document.createElement('div');
      labelWrap.className = 'label-wrap';

      const labelEl = document.createElement('label');
      labelEl.textContent = item.name;

      const infoBtn = document.createElement('button');
      infoBtn.type = 'button';
      infoBtn.className = 'info-btn';
      infoBtn.setAttribute('aria-label', `Qué significa ${item.name}`);
      infoBtn.textContent = '?';

      infoBtn.addEventListener('click', () => {
        const backdrop = document.getElementById('info-modal-backdrop');
        const title = document.getElementById('modal-info-title');
        const desc_el = document.getElementById('modal-info-desc');
        title.textContent = item.name;
        desc_el.textContent = desc;
        backdrop.classList.add('active');
      });

      labelWrap.appendChild(labelEl);
      labelWrap.appendChild(infoBtn);

      const bar = document.createElement('div');
      bar.className = 'bar';
      const span = document.createElement('span');
      span.style.width = `${pct}%`;
      span.style.background = color;
      bar.appendChild(span);

      const mini = document.createElement('div');
      mini.className = 'mini';
      mini.innerHTML = `<strong>${pct}%</strong><br><span class="impact">${direction}</span>`;

      row.appendChild(labelWrap);
      row.appendChild(bar);
      row.appendChild(mini);
      container.appendChild(row);
    });

  } catch (e) {
    console.error('Error completo SHAP:', e);
    const container = document.getElementById('factors');
    container.innerHTML = '<p class="muted">No se pudo cargar la explicación SHAP local. Revisa la consola del navegador para más detalles.</p>';
  }
}

function renderMetrics() {
  const isDetallada = (sample.modelo || '').toLowerCase().includes('detallada');
  const key = isDetallada ? 'detallada' : 'rapida';
  const m = METRICAS_MODELO[key];
  if (!m) return;
  const accPct = Math.round(m.r2 * 1000) / 10; // una decimal
  const accBar = document.getElementById('metric-acc-bar');
  const accTextEl = document.getElementById('metric-acc-text');
  const maeEl = document.getElementById('metric-mae');
  const rmseEl = document.getElementById('metric-rmse');
  const r2El = document.getElementById('metric-r2');
  const longDescEl = document.getElementById('metric-long-desc');
  const nameEl = document.getElementById('metric-model-name');
  if (accBar) accBar.style.width = `${accPct}%`;
  if (accTextEl) accTextEl.textContent = accPct.toFixed(1) + '%';
  if (maeEl) maeEl.textContent = `±${m.mae.toFixed(2)} €`;
  if (rmseEl) rmseEl.textContent = `±${m.rmse.toFixed(2)} €`;
  if (r2El) r2El.textContent = m.r2.toFixed(2);
  if (nameEl) nameEl.textContent = m.nombre;
  if (longDescEl) {
    const conf = Math.round(m.r2 * 100);
    longDescEl.textContent = `El modelo de precios tiene un error medio de ${m.mae.toFixed(2)} €, lo que significa que, de media, la diferencia entre el precio real y el precio calculado es pequeña. La desviación del error es de ${m.rmse.toFixed(2)} €, indicando que normalmente las predicciones no se alejan demasiado del valor real y son bastante consistentes. Además, la confianza global del modelo es del ${conf}%, lo que quiere decir que el modelo es capaz de explicar casi por completo las variaciones del precio, ofreciendo resultados muy fiables.`;
  }
}

function renderBarrioStats() {
  const statsEl = document.getElementById('barrio-stats');
  const noteEl = document.getElementById('barrio-stats-note');
  if (!statsEl) return;
  if (!barrioStatsData) {
    statsEl.innerHTML = '<div class="muted">No se encontraron estadísticas para este barrio.</div>';
    if (noteEl) noteEl.textContent = '';
    return;
  }
  const fmt = (val, suffix = '€') => (typeof val === 'number' ? `${val.toFixed(2)} ${suffix}` : '—');
  const rangeText = (typeof barrioStatsData.min_price === 'number' && typeof barrioStatsData.max_price === 'number') 
    ? `${barrioStatsData.min_price.toFixed(2)} € - ${barrioStatsData.max_price.toFixed(2)} €` 
    : '—';
  statsEl.innerHTML = `
     <div class="stat-card"><div class="stat-label"><i class="bi bi-currency-dollar"></i> Precio medio</div><div class="stat-value">${fmt(barrioStatsData.mean_price)}</div></div>
     <div class="stat-card"><div class="stat-label"><i class="bi bi-graph-up-arrow"></i> Rango de precios</div><div class="stat-value">${rangeText}</div></div>
     <div class="stat-card"><div class="stat-label"><i class="bi bi-buildings"></i> Anuncios activos</div><div class="stat-value">${typeof barrioStatsData.count === 'number' ? barrioStatsData.count : '—'}</div></div>
  `;
  if (noteEl) noteEl.textContent = `Datos históricos del barrio ${barrioStatsData.barrioKey || sample.barrio} en ${barrioStatsData.cityKey || sample.ciudad}.`;
}

async function renderMap() {
  const cityCoords = {
    'Madrid': [40.4168, -3.7038],
    'Barcelona': [41.3851, 2.1734],
    'Valencia': [39.4699, -0.3763],
    'Málaga': [36.7213, -4.4214],
    'Sevilla': [37.3891, -5.9845],
    'Bilbao': [43.2630, -2.9350],
    'Palma': [39.5696, 2.6502]
  };

  let coords = cityCoords[sample.ciudad] || [40.4168, -3.7038];
  let zoom = 12;

  // Intentar geocodificar el barrio + ciudad para centrar mejor
  if (sample.barrio && sample.ciudad) {
    try {
      const q = encodeURIComponent(`${sample.barrio}, ${sample.ciudad}`);
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}`);
      const data = await resp.json();
      if (Array.isArray(data) && data[0]?.lat && data[0]?.lon) {
        coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        zoom = 14;
      }
    } catch (err) {
      console.warn('Geocoding fallback to city:', err);
    }
  }

  const map = L.map('map', { zoomControl: true }).setView(coords, zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  L.marker(coords).addTo(map).bindPopup(`${sample.barrio} · ${sample.ciudad}`).openPopup();
}

renderShapLocal();
renderMap();
renderMetrics();
renderBarrioStats();

// Cerrar modal al clickear el backdrop
const modalBackdrop = document.getElementById('info-modal-backdrop');
if (modalBackdrop) {
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target.id === 'info-modal-backdrop') {
      e.target.classList.remove('active');
    }
  });
}
