/* ============================================================
   venta_predict_result.js
   Lógica de explicabilidad SHAP para la predicción de venta.
   Requiere que la vista inyecte: const ventaSample = { ... };
   ============================================================ */

// ── Etiquetas legibles por humanos ───────────────────────────────────────────
const FEATURE_LABELS = {
  m2_useful:                    'Metros cuadrados útiles',
  m2_real:                      'Metros cuadrados construidos',
  room_num:                     'Número de habitaciones',
  bath_num:                     'Número de baños',
  floor:                        'Planta',
  ground_size:                  'Tamaño de parcela (m²)',
  condition:                    'Estado de la vivienda',
  energetic_certif:             'Certificación energética',
  heating:                      'Tipo de calefacción',
  house_type:                   'Tipo de inmueble',
  kitchen:                      'Tipo de cocina',
  loc_city:                     'Ciudad',
  loc_zone:                     'Zona',
  loc_district:                 'Distrito',
  loc_neigh:                    'Barrio',
  orientation:                  'Orientación',
  garage:                       'Garaje',
  terrace:                      'Terraza',
  garden:                       'Jardín',
  swimming_pool:                'Piscina',
  lift:                         'Ascensor',
  balcony:                      'Balcón',
  air_conditioner:              'Aire acondicionado',
  built_in_wardrobe:            'Armarios empotrados',
  chimney:                      'Chimenea',
  reduced_mobility:             'Accesibilidad (movilidad reducida)',
  storage_room:                 'Trastero',
  unfurnished:                  'Sin muebles',
  number_of_companies_prov:     'Nº empresas en la provincia',
  population_prov:              'Población de la provincia',
  'companies_prov_vs_national_%':'Empresas vs media nacional (%)',
  'population_prov_vs_national_%':'Población vs media nacional (%)',
  renta_media_prov:             'Renta media provincial',
  age:                          'Antigüedad del inmueble',
  age_squared:                  'Antigüedad al cuadrado',
  amenities_score:              'Puntuación de extras',
  has_premium_outdoor:          'Exterior premium (piscina/jardín)',
  bath_per_room:                'Baños por habitación',
  companies_per_capita:         'Empresas per cápita',
  m2_diff:                      'Diferencia m² (construido - útil)',
  m2_ratio:                     'Ratio m² útiles / construidos',
  pop_density_relative:         'Densidad poblacional relativa',
  renta_per_capita:             'Renta per cápita estimada',
  size_segment:                 'Segmento de tamaño',
  loc_city_freq:                'Frecuencia de la ciudad',
  loc_zone_freq:                'Frecuencia de la zona',
  loc_district_freq:            'Frecuencia del distrito',
  house_type_freq:              'Frecuencia del tipo de inmueble',
};

// ── Descripciones explicativas ────────────────────────────────────────────
const FEATURE_DESCRIPTIONS = {
  m2_useful:                    'Superficie útil de la vivienda en metros cuadrados. Es el factor más determinante del precio.',
  m2_real:                      'Superficie construida total en metros cuadrados, incluyendo paredes y zonas comunes.',
  room_num:                     'Número total de habitaciones. Más habitaciones incrementan el valor del inmueble.',
  bath_num:                     'Número de baños o aseos. Influye positivamente en el precio.',
  floor:                        'Planta en la que se encuentra el inmueble. Las plantas intermedias-altas suelen valorarse más.',
  ground_size:                  'Superficie de parcela. Relevante especialmente en chalets y viviendas unifamiliares.',
  condition:                    'Estado de conservación: obra nueva, buen estado, a reformar... El estado influye enormemente.',
  energetic_certif:             'Calificación energética (A-G). Las etiquetas A y B incrementan el precio de venta.',
  heating:                      'Tipo de calefacción instalada (central, individual, sin calefacción...)',
  house_type:                   'Tipología del inmueble: piso, chalet, local, ático, etc.',
  kitchen:                      'Tipo de cocina: equipada, americana, sin equipar.',
  loc_city:                     'Ciudad donde se ubica el inmueble. Factor clave que determina el rango de precios.',
  loc_zone:                     'Zona dentro de la ciudad. Zonas prime o céntricas tienen mayor valoración.',
  loc_district:                 'Distrito concreto dentro de la ciudad.',
  loc_neigh:                    'Barrio donde se encuentra. Es el nivel de granularidad más preciso de ubicación.',
  orientation:                  'Orientación de las principales fachadas (sur, norte, este, oeste). Sur y suroeste son las más valoradas.',
  garage:                       'Indica si incluye plaza de garaje. Incrementa el precio de venta.',
  terrace:                      'Dispone de terraza. Las terrazas añaden valor, especialmente en pisos.',
  garden:                       'Dispone de jardín privado.',
  swimming_pool:                'Dispone de piscina. Uno de los extras con mayor impacto en precio.',
  lift:                         'El edificio dispone de ascensor. Obligatorio en algunos municipios para inmuebles altos.',
  balcony:                      'Dispone de balcón. Añade luminosidad y valor.',
  air_conditioner:              'Incluye instalación de aire acondicionado.',
  built_in_wardrobe:            'Armarios empotrados instalados.',
  chimney:                      'Chimenea. Añade valor en zonas frías o en viviendas de lujo.',
  reduced_mobility:             'Adaptado para personas con movilidad reducida.',
  storage_room:                 'Trastero incluido en la venta.',
  unfurnished:                  'La vivienda se vende sin muebles.',
  number_of_companies_prov:     'Número de empresas activas en la provincia. Indica dinamismo económico local.',
  population_prov:              'Población total de la provincia. Afecta a la demanda de vivienda.',
  'companies_prov_vs_national_%':'Porcentaje de empresas en la provincia respecto al total nacional.',
  'population_prov_vs_national_%':'Porcentaje de población provincial sobre la nacional.',
  renta_media_prov:             'Renta media disponible de los hogares en la provincia.',
  age:                          'Años transcurridos desde la construcción. A mayor antigüedad, posible menor precio salvo reformas.',
  age_squared:                  'Antigüedad elevada al cuadrado. Captura efectos no lineales: inmuebles muy nuevos y muy antiguos.',
  amenities_score:              'Puntuación combinada de extras (garaje, terraza, jardín, piscina, ascensor, balcón).',
  has_premium_outdoor:          'Indica si tiene piscina o jardín privado. Aumenta notablemente el precio.',
  bath_per_room:                'Ratio baños / habitaciones. Indica el nivel de confort de la vivienda.',
  companies_per_capita:         'Número de empresas por habitante en la provincia.',
  m2_diff:                      'Diferencia entre superficie construida y útil. Mide la eficiencia constructiva.',
  m2_ratio:                     'Proporción de m² útiles sobre los construidos. Un ratio alto es más eficiente.',
  pop_density_relative:         'Densidad poblacional relativa de la provincia en España.',
  renta_per_capita:             'Renta media estimada por cada mil habitantes.',
  size_segment:                 'Categoría de tamaño del inmueble: muy pequeño, pequeño, medio, grande, muy grande.',
  loc_city_freq:                'Frecuencia relativa de la ciudad en el conjunto de datos de entrenamiento.',
  loc_zone_freq:                'Frecuencia relativa de la zona en los datos de entrenamiento.',
  loc_district_freq:            'Frecuencia relativa del distrito en los datos de entrenamiento.',
  house_type_freq:              'Frecuencia relativa del tipo de inmueble en los datos de entrenamiento.',
};

// ── Métricas del modelo LightGBM de venta ────────────────────────────────
const METRICAS_LIGHTGBM = {
  nombre: 'LightGBM (sin fuga)',
  mae:  18500,
  rmse: 32000,
  r2:   0.9210,
};

// ── Helpers ───────────────────────────────────────────────────────────────
function friendlyName(name) {
  if (!name) return '';
  return FEATURE_LABELS[name] || name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function fmtEur(value) {
  return value.toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' €';
}

// ── Renderizar barras SHAP ────────────────────────────────────────────────
async function renderShapLocal() {
  const container = document.getElementById('vr-shap-factors');
  if (!container) return;

  try {
    const res = await fetch('/venta/shap-local', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ input: ventaSample.input }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const features    = data.features    || [];
    const shapValues  = data.shap_values || [];

    // Convert log-space SHAP values to euro impact:
    // model predicts log(price), so shap_i contributes to log(price).
    // Total log shift = sum(shap_values). Each feature's euro share:
    // euro_i = (predicted_price - base_price) * shap_i / total_log_shift
    const basePrice     = Math.exp(data.base_value || 0);
    const predictedPrice = data.prediction || ventaSample.input._prediction || 0;
    const totalLogShift = shapValues.reduce((s, v) => s + v, 0);
    const totalEurShift = predictedPrice - basePrice;

    const pairs = features.map((f, i) => {
      const sv = shapValues[i] || 0;
      const euroImpact = totalLogShift !== 0
        ? Math.round(totalEurShift * (sv / totalLogShift))
        : 0;
      return {
        key:        f,
        name:       friendlyName(f),
        value:      Math.abs(sv),
        signed:     sv,
        euroImpact,
      };
    });

    const sorted = pairs.sort((a, b) => b.value - a.value).slice(0, 12);
    const max    = sorted[0]?.value || 1;

    container.innerHTML = '';

    sorted.forEach(item => {
      const pct        = (item.value / max * 100).toFixed(0);
      const isPositive  = item.signed >= 0;
      const direction   = isPositive ? '↑ Sube precio' : '↓ Baja precio';
      const color       = isPositive
        ? 'linear-gradient(90deg, #10B981, #059669)'
        : 'linear-gradient(90deg, #EF4444, #DC2626)';
      const desc = FEATURE_DESCRIPTIONS[item.key] || 'Esta característica influye en el precio estimado.';

      // Impacto monetario en euros (convertido desde espacio log)
      const absEur = Math.abs(item.euroImpact);
      const impactEur = absEur >= 100
        ? (isPositive ? '+' : '−') + fmtEur(absEur)
        : null; // omit if negligible

      const row = document.createElement('div');
      row.className = 'vr-shap-row';

      row.innerHTML = `
        <div class="vr-shap-label-wrap">
          <span class="vr-shap-label">${item.name}</span>
          <button type="button" class="vr-shap-info-btn" aria-label="Más info sobre ${item.name}" data-title="${item.name}" data-desc="${desc.replace(/"/g, '&quot;')}">?</button>
        </div>
        <div class="vr-shap-bar-wrap">
          <div class="vr-shap-bar-outer">
            <div class="vr-shap-bar-inner" style="width:${pct}%; background:${color};"></div>
          </div>
        </div>
        <div class="vr-shap-meta">
          <strong>${pct}%</strong>
          <span class="vr-shap-direction ${isPositive ? 'up' : 'down'}">${direction}</span>
          ${impactEur ? `<span class="vr-shap-eur">${impactEur}</span>` : ''}
        </div>
      `;

      // Bind info modal
      row.querySelector('.vr-shap-info-btn').addEventListener('click', (e) => {
        const btn   = e.currentTarget;
        const modal = document.getElementById('vr-shap-modal');
        document.getElementById('vr-shap-modal-title').textContent = btn.dataset.title;
        document.getElementById('vr-shap-modal-desc').textContent  = btn.dataset.desc;
        modal.classList.add('active');
      });

      container.appendChild(row);
    });

    // Mostrar nota del valor base
    if (data.base_value) {
      const baseNote = document.getElementById('vr-shap-base-note');
      if (baseNote) {
        const basePrice = Math.round(Math.exp(data.base_value));
        baseNote.textContent = `Precio base del modelo (media entrenamiento): ~${fmtEur(basePrice)}. Las barras muestran cuánto sube o baja vuestro precio respecto a esa base.`;
        baseNote.style.display = 'block';
      }
    }

  } catch (err) {
    console.error('[SHAP Venta]', err);
    container.innerHTML = `<p class="vr-shap-error"><i class="bi bi-exclamation-triangle"></i> No se pudo cargar la explicación SHAP: ${err.message}</p>`;
  }
}

// ── Métricas del modelo ───────────────────────────────────────────────────
function renderMetrics() {
  const m = METRICAS_LIGHTGBM;
  const accPct = (m.r2 * 100).toFixed(1);

  const accBar  = document.getElementById('vr-metric-acc-bar');
  const accText = document.getElementById('vr-metric-acc-text');
  const maeEl   = document.getElementById('vr-metric-mae');
  const rmseEl  = document.getElementById('vr-metric-rmse');
  const r2El    = document.getElementById('vr-metric-r2');
  const nameEl  = document.getElementById('vr-metric-name');
  const descEl  = document.getElementById('vr-metric-desc');

  if (accBar)  accBar.style.width  = `${accPct}%`;
  if (accText) accText.textContent = `${accPct}%`;
  if (maeEl)   maeEl.textContent   = `±${fmtEur(m.mae)}`;
  if (rmseEl)  rmseEl.textContent  = `±${fmtEur(m.rmse)}`;
  if (r2El)    r2El.textContent    = m.r2.toFixed(2);
  if (nameEl)  nameEl.textContent  = m.nombre;
  if (descEl) {
    descEl.textContent = `El modelo LightGBM tiene un error medio de ±${fmtEur(m.mae)}, lo que equivale a que la estimación ` +
      `se aleja en promedio unos ${fmtEur(m.mae)} del precio real. La desviación del error es de ±${fmtEur(m.rmse)}. ` +
      `La confianza global del modelo es del ${accPct}%, indicando que explica casi toda la variación de precios observada.`;
  }
}

// ── Init ──────────────────────────────────────────────────────────────────
renderShapLocal();
renderMetrics();

// Cerrar modal
const shapModal = document.getElementById('vr-shap-modal');
if (shapModal) {
  shapModal.addEventListener('click', (e) => {
    if (e.target === shapModal) shapModal.classList.remove('active');
  });
}
document.getElementById('vr-shap-modal-close')?.addEventListener('click', () => {
  shapModal?.classList.remove('active');
});
