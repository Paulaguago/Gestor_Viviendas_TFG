const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { 
  readJsonPrefer, 
  projectRoot 
} = require('../utils/dataLoader');
const { spawnPython } = require('../utils/pythonRunner');

// ================= Formulario venta =================
router.get('/', (req, res) => {
  const ventaDataDir = path.join(projectRoot, 'modelos_predictivos', 'venta', 'data');

  let locationHierarchy = {};
  let amenitiesVenta = [];

  try {
    locationHierarchy = JSON.parse(
      fs.readFileSync(path.join(ventaDataDir, 'location_hierarchy.json'), 'utf8')
    );
  } catch (e) { console.warn('location_hierarchy.json not found:', e.message); }

  try {
    amenitiesVenta = JSON.parse(
      fs.readFileSync(path.join(ventaDataDir, 'amenities_venta.json'), 'utf8')
    );
  } catch (e) { console.warn('amenities_venta.json not found:', e.message); }

  res.render('prediccion/prediccion_venta', {
    user: req.user,
    locationHierarchy,
    amenitiesVenta
  });
});

// ================= POST /predict  (montado en /venta → /venta/predict) =================
router.post('/predict', async (req, res) => {
  try {
    const b = req.body;

    const inputData = {
      loc_city:          b.loc_city        || '',
      loc_zone:          b.loc_zone        || '',
      loc_district:      b.loc_district    || '',
      loc_neigh:         b.loc_neigh       || '',
      house_type:        b.house_type      || 'flat',
      m2_useful:         parseFloat(b.m2_useful)  || 80,
      m2_real:           parseFloat(b.m2_real)     || parseFloat(b.m2_useful) || 80,
      room_num:          parseInt(b.room_num, 10)  || 2,
      bath_num:          parseInt(b.bath_num, 10)  || 1,
      floor:             parseInt(b.floor, 10)     || 1,
      ground_size:       parseFloat(b.ground_size) || 0,
      construct_date:    parseInt(b.construct_date, 10) || 2000,
      condition:         b.condition          || 'good',
      energetic_certif:  b.energetic_certif   || 'E',
      heating:           b.heating            || 'individual',
      kitchen:           b.kitchen            || 'equipped kitchen',
      orientation:       b.orientation        || 'south',
      garage:            b.garage      ? 1 : 0,
      terrace:           b.terrace     ? 1 : 0,
      garden:            b.garden      ? 1 : 0,
      swimming_pool:     b.swimming_pool ? 1 : 0,
      lift:              b.lift        ? 1 : 0,
      balcony:           b.balcony     ? 1 : 0,
      air_conditioner:   b.air_conditioner ? 1 : 0,
      built_in_wardrobe: b.built_in_wardrobe ? 1 : 0,
      chimney:           b.chimney     ? 1 : 0,
      storage_room:      b.storage_room ? 1 : 0,
      reduced_mobility:  b.reduced_mobility ? 1 : 0,
      unfurnished:       b.unfurnished ? 1 : 0
    };

    const scriptPath = path.join(projectRoot, 'python_scripts', 'predict_venta.py');
    const inputJson  = JSON.stringify(inputData);

    const result = await new Promise((resolve, reject) => {
      const proc = spawnPython(scriptPath, [], { INPUT_JSON: inputJson });
      let stdout = '', stderr = '';
      proc.stdout.on('data', d => { stdout += d.toString(); });
      proc.stderr.on('data', d => { stderr += d.toString(); });
      proc.on('close', code => {
        if (code !== 0) return reject(new Error(`Python exit ${code}: ${stderr}`));
        try { resolve(JSON.parse(stdout)); }
        catch (e) { reject(new Error(`JSON parse error: ${stdout}`)); }
      });
    });

    const locationParts = [inputData.loc_neigh, inputData.loc_district, inputData.loc_zone, inputData.loc_city].filter(Boolean);
    const locationStr = locationParts.join(', ');

    return res.render('prediccion/venta_predict_result', {
      sample: {
        price:   result.price,
        currency: result.currency || '€',
        modelo:  result.model || 'LightGBM',
        input:   inputData,
        input_summary: result.input_summary || {}
      },
      locationStr,
      error: null
    });

  } catch (err) {
    console.error('Error predicción venta:', err);
    return res.render('prediccion/venta_predict_result', {
      sample: null,
      locationStr: '',
      error: err.message || 'Error desconocido en la predicción.'
    });
  }
});

// ================= SHAP Local (Ventas) =================
// POST /venta/shap-local -> calcular SHAP local para una predicción específica
router.post('/shap-local', (req, res) => {
  try {
    const inputData = req.body.input || req.body || {};

    const scriptPath = path.join(projectRoot, 'python_scripts', 'shap_local_venta.py');
    const inputJson  = JSON.stringify(inputData);

    const python = spawnPython(scriptPath, [], { INPUT_JSON: inputJson });
    let output = '';
    let error  = '';

    python.stdout.on('data', d => { output += d.toString(); });
    python.stderr.on('data', d => { error  += d.toString(); });

    python.on('close', (code) => {
      if (code === 0 && output.trim()) {
        try {
          const result = JSON.parse(output);
          return res.json(result);
        } catch (e) {
          console.error('[SHAP Venta Local] Error parseando JSON:', e.message);
          return res.status(500).json({ error: 'Error parseando resultado SHAP', detail: e.message, raw: output.substring(0, 500) });
        }
      }
      console.error('[SHAP Venta Local] exit code:', code, 'stderr:', error);
      res.status(500).json({ error: 'Error calculando SHAP local de venta', stderr: error.substring(0, 1000), code });
    });
  } catch (e) {
    res.status(500).json({ error: 'Error interno', detail: e.message });
  }
});

// ================= SHAP Global (Ventas) =================
// GET /sales/shap-global -> importancia global SHAP para LightGBM (ventas)
router.get('/sales/shap-global', (req, res) => {
  const data = readJsonPrefer([
    path.join(projectRoot, 'modelos_predictivos', 'venta', 'LIGHTGBM', 'shap_global_importance_sales.json'),
    path.join(projectRoot, 'model', 'sales', 'shap_global_importance_sales.json')
  ]);
  if (!data) return res.status(404).json({ error: 'Sales SHAP global not found' });
  try {
    const features = data.features || data.feature_names || [];
    const importances = data.mean_abs_shap || data.importances || [];
    return res.json({ features, importances });
  } catch (e) {
    return res.json(data);
  }
});

// Alias en español
router.get('/ventas/explicacion-global', (req, res) => {
  const data = readJsonPrefer([
    path.join(projectRoot, 'modelos_predictivos', 'venta', 'LIGHTGBM', 'shap_global_importance_sales.json'),
    path.join(projectRoot, 'model', 'sales', 'shap_global_importance_sales.json')
  ]);
  if (!data) return res.status(404).json({ error: 'No se encontró la explicación global de ventas (SHAP)' });
  try {
    const features = data.features || data.feature_names || [];
    const importances = data.mean_abs_shap || data.importances || [];
    return res.json({ features, importances });
  } catch (e) {
    return res.json(data);
  }
});

module.exports = router;
