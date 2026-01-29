const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { 
  readJsonPrefer, 
  projectRoot 
} = require('../utils/dataLoader');

// ================= RUTAS UI DE NAVEGACIÓN =================
// Landing de selección de dominio (alquiler/venta)
router.get('/opciones-prediccion', (req, res) => {
  res.render('prediccion/opciones-prediccion');
});

// Ruta principal - GET / -> redirige a opciones de predicción
router.get('/', (req, res) => {
  return res.redirect('/opciones-prediccion');
});

// ================= EBM: endpoints para explicaciones =================
// GET /explain/global -> explicación global EBM
router.get('/explain/global', (req, res) => {
  const base = path.join(projectRoot, 'model');
  const data = readJsonPrefer([
    path.join(base, 'ebm', 'ebm_global_explanation.json'),
    path.join(base, 'ebm_global_explanation.json') // fallback legacy
  ]);
  if (!data) return res.status(404).json({ error: 'Global explanation not found' });
  return res.json(data);
});

// GET /explain/local -> explicación local EBM (por ahora una instancia precomputada)
router.get('/explain/local', (req, res) => {
  const base = path.join(projectRoot, 'model');
  const data = readJsonPrefer([
    path.join(base, 'ebm', 'ebm_local_explanation.json'),
    path.join(base, 'ebm_local_explanation.json')
  ]);
  if (!data) return res.status(404).json({ error: 'Local explanation not found' });
  return res.json(data);
});

// ================= EBM: explicación local en vivo para la instancia actual =================
// POST /explain/local-live
router.post('/explain/local-live', (req, res) => {
  try {
    const payload = req.body || {};
    const inp = payload.input || payload; // permitir enviar directamente el objeto

    // Normalizar flags Sí/No a 1/0 si vienen como texto
    const to01 = (v) => {
      if (typeof v === 'number') return v ? 1 : 0;
      if (typeof v === 'string') {
        const s = v.toLowerCase();
        return (s === 'si' || s === 'sí' || s === 'yes' || s === '1' || s === 'true') ? 1 : 0;
      }
      return v ? 1 : 0;
    };

    const origen = inp.origen || '';
    const barrio = inp.barrio || '';
    const bathrooms = inp.bathrooms || 0;
    const bedrooms = inp.bedrooms || 0;
    const accommodates = inp.accommodates || 1;
    const room_type = (inp.room_type || '').toString();
    const amenities_count = inp.amenities_count || 0;
    const has_pool = to01(inp.has_pool);
    const has_jacuzzi = to01(inp.has_jacuzzi);
    const has_aircon = to01(inp.has_aircon);
    const has_wifi = to01(inp.has_wifi);
    const review_scores_rating = inp.review_scores_rating || 4.85;
    const number_of_reviews = inp.number_of_reviews || 60;
    const availability_365 = inp.availability_365 || 200;
    const stay_date = inp.stay_date || '';
    const barrio_mean = inp.barrio_mean || inp.barrio_mean_price || 160;
    const barrio_median = inp.barrio_median || inp.barrio_median_price || 150;
    const barrio_std = inp.barrio_std || inp.barrio_std_price || 35;
    const amenities_text = (inp.amenities && Array.isArray(inp.amenities)) ? inp.amenities.join(', ') : (inp.amenities_text || '');

    const condaPath = 'C:\\Users\\Paula\\anaconda3\\Scripts\\conda.exe';
    const scriptPath = path.join(projectRoot, 'ebm_local_explain.py');
    const args = [
      origen,
      barrio,
      bathrooms,
      bedrooms,
      accommodates,
      room_type,
      amenities_count,
      has_pool,
      has_jacuzzi,
      has_aircon,
      has_wifi,
      review_scores_rating,
      number_of_reviews,
      availability_365,
      stay_date,
      barrio_mean,
      barrio_median,
      barrio_std,
      amenities_text
    ].map(String);

    let pythonCmd;
    let pythonArgs;
    if (fs.existsSync(condaPath)) {
      pythonCmd = condaPath;
      pythonArgs = ['run', '-n', 'base', 'python', scriptPath].concat(args);
    } else {
      pythonCmd = 'python';
      pythonArgs = [scriptPath].concat(args);
    }

    const py = spawn(pythonCmd, pythonArgs);
    let out = '';
    let err = '';
    py.stdout.on('data', d => out += d.toString());
    py.stderr.on('data', e => err += e.toString());
    py.on('close', code => {
      if (code === 0) {
        try {
          const obj = JSON.parse(out);
          // Convertir a EUR si procede
          const rate = process.env.USD_TO_EUR ? parseFloat(process.env.USD_TO_EUR) : 0.92;
          const ebmUsd = Number(obj.price || obj.prediction || 0);
          const ebmEur = Number((ebmUsd * rate).toFixed(2));
          return res.json({ ebm_usd: ebmUsd, ebm_eur: ebmEur, local: obj.local || obj });
        } catch (e) {
          return res.status(500).json({ error: 'JSON parse error', detail: e.message, raw: out, stderr: err });
        }
      }
      res.status(500).json({ error: 'EBM explain failed', stderr: err });
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal error', detail: e.message });
  }
});

// ================= Random Forest: endpoints auxiliares =================
// GET /rf/importance -> importancias globales del RF (si se han exportado)
router.get('/rf/importance', (req, res) => {
  const base = path.join(projectRoot, 'model');
  const data = readJsonPrefer([
    path.join(base, 'rf', 'feature_importance.json'),
    path.join(base, 'feature_importance_rf.json'),
    // Nueva prioridad: SHAP global de alquiler si existe en modelos_predictivos
    path.join(projectRoot, 'modelos_predictivos', 'alquiler', 'RF', 'shap_global_importance_rental.json')
  ]);
  if (!data) return res.status(404).json({ error: 'RF importance not found' });
  // Normalizar formato a { features, importances }
  try {
    if (Array.isArray(data)) return res.json(data);
    const features = data.features || data.feature_names || [];
    const importances = data.importances || data.mean_abs_shap || [];
    return res.json({ features, importances });
  } catch (e) {
    return res.json(data);
  }
});

// GET /rf/distribution -> distribuciones de predicciones (y_true vs y_pred) si se exportaron
router.get('/rf/distribution', (req, res) => {
  const base = path.join(projectRoot, 'model');
  const data = readJsonPrefer([
    path.join(base, 'rf', 'predictions_test.json'),
    path.join(base, 'predictions_test_rf.json')
  ]);
  if (!data) return res.status(404).json({ error: 'RF distribution not found' });
  return res.json(data);
});

module.exports = router;
