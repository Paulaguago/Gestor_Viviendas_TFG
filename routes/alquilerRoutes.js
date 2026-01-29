const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { 
  readJsonPrefer, 
  options, 
  amenitiesConjunto, 
  estadisticasBarrio, 
  findCityKeyBarrio, 
  findBarrioKeyBarrio, 
  computeFechaContext, 
  RENTAL_MODEL_PATHS, 
  projectRoot 
} = require('../utils/dataLoader');

// Formulario alquiler (selector de modelo camuflado)
router.get('/form/alquiler', (req, res) => {
  res.render('prediccion/prediccion_alquiler', { options, amenitiesConjunto });
});

// Resultado demo de alquiler (muestra flujo; en producción se usará /predict)
router.get('/alquiler/demo-resultado', (req, res) => {
  const sample = {
    price: 120,
    currency: '€',
    barrio: req.query.barrio || 'Centro',
    ciudad: req.query.origen || 'Madrid',
    modelo: req.query.modelo || 'Predicción detallada',
    factores: [
      { name: 'Ubicación', value: 0.42 },
      { name: 'Tamaño', value: 0.28 },
      { name: 'Servicios', value: 0.16 },
      { name: 'Temporada', value: 0.14 }
    ]
  };
  const cityKey = findCityKeyBarrio(estadisticasBarrio, sample.ciudad);
  const barrioKey = cityKey ? findBarrioKeyBarrio(estadisticasBarrio[cityKey], sample.barrio) : null;
  const barrioStats = (cityKey && barrioKey) ? { ...estadisticasBarrio[cityKey][barrioKey], barrioKey, cityKey } : null;
  res.render('prediccion/alquiler_predict_result_rf', { sample, barrioStats });
});

// Predicción real de alquiler (usa predict.py y selecciona modelo por modo)
router.post('/predict/alquiler', (req, res) => {
  const {
    origen,
    barrio,
    bathrooms,
    bedrooms,
    accommodates,
    room_type,
    review_scores_rating,
    number_of_reviews,
    availability_365,
    stay_date
  } = req.body;

  const mode = (req.body.modelo || 'rapida').toLowerCase();
  const modelPath = RENTAL_MODEL_PATHS[mode] || RENTAL_MODEL_PATHS.rapida;
  const modeloLabel = mode === 'detallada' ? 'Predicción detallada (explicable)' : 'Predicción rápida';

  const amenitiesSelected = Array.isArray(req.body.amenities) ? req.body.amenities : (req.body.amenities ? [req.body.amenities] : []);
  const amenities_count = amenitiesSelected.length;
  const amenities_text = amenitiesSelected.join(', ');
  const amenitiesLower = amenities_text.toLowerCase();
  const has_pool = amenitiesLower.includes('piscina') || amenitiesLower.includes('pool') ? 1 : 0;
  const has_jacuzzi = amenitiesLower.includes('jacuzzi') || amenitiesLower.includes('hot tub') || amenitiesLower.includes('hidromasaje') ? 1 : 0;
  const has_aircon = amenitiesLower.includes('aire acondicionado') || amenitiesLower.includes('air conditioning') || amenitiesLower.includes('a/c') ? 1 : 0;
  const has_wifi = amenitiesLower.includes('wifi') || amenitiesLower.includes('wi-fi') ? 1 : 0;
  const has_kitchen = amenitiesLower.includes('cocina') || amenitiesLower.includes('kitchen') ? 1 : 0;
  const has_parking = amenitiesLower.includes('parking') || amenitiesLower.includes('aparcamiento') || amenitiesLower.includes('garaje') ? 1 : 0;
  const has_tv = amenitiesLower.includes('tv') || amenitiesLower.includes('television') || amenitiesLower.includes('smart tv') ? 1 : 0;
  const has_washer = amenitiesLower.includes('lavadora') || amenitiesLower.includes('washer') || amenitiesLower.includes('washing machine') ? 1 : 0;

  if (!origen || !barrio || !bathrooms || !bedrooms || !accommodates || !room_type) {
    return res.render('prediccion/alquiler_predict_result_rf', {
      sample: null,
      error: 'Por favor, completa todos los campos esenciales del formulario.'
    });
  }

  const barrio_mean = req.body.barrio_mean_price || 160;
  const barrio_median = req.body.barrio_median_price || 150;
  const barrio_std = req.body.barrio_std_price || 35;
  const barrio_count = 100;
  const barrio_avg_rating = 4.8;
  const barrio_avg_reviews = 50;
  const fechaContext = computeFechaContext(origen, stay_date || '');

  // Calcular features derivadas para SHAP local
  const bath = parseFloat(bathrooms) || 1;
  const bed = parseFloat(bedrooms) || 1;
  const acc = parseFloat(accommodates) || 2;
  const rev_rating = parseFloat(review_scores_rating) || 4.85;
  const rev_count = parseFloat(number_of_reviews) || 60;
  const avail = parseFloat(availability_365) || 200;
  
  const bath_per_bed = bath / (bed + 0.01);
  const review_score_weighted = rev_rating * Math.log1p(rev_count);
  const review_density = rev_count / (avail + 1);
  const bedroom_efficiency = acc / (bed + 1);
  
  // Temporal features
  let is_high_season = 0, is_weekend = 0, is_summer = 0, is_winter = 0, month = 6, day_of_week = 0, quarter = 2;
  if (stay_date) {
    try {
      const dt = new Date(stay_date);
      month = dt.getMonth() + 1;
      day_of_week = dt.getDay();
      quarter = Math.floor((month - 1) / 3) + 1;
      is_high_season = [6,7,8,12].includes(month) ? 1 : 0;
      is_summer = [6,7,8].includes(month) ? 1 : 0;
      is_winter = [12,1,2].includes(month) ? 1 : 0;
      is_weekend = day_of_week >= 5 ? 1 : 0;
    } catch (e) {}
  }
  
  // Amenities scores
  const luxury_score = has_pool + has_jacuzzi + has_aircon;
  const basic_score = has_wifi + has_kitchen + has_tv + has_washer;
  const total_amenities_score = luxury_score * 2 + basic_score;
  
  // Ratios
  const rating_vs_barrio_avg = rev_rating / (barrio_avg_rating + 0.01);
  
  // Categories
  let capacity_category = 'medium';
  if (acc <= 2) capacity_category = 'small';
  else if (acc <= 4) capacity_category = 'medium';
  else if (acc <= 6) capacity_category = 'large';
  else capacity_category = 'xlarge';
  
  let bedroom_category = '1bed';
  if (bed <= 1) bedroom_category = bed == 0 ? 'studio' : '1bed';
  else if (bed == 2) bedroom_category = '2bed';
  else bedroom_category = '3bed+';
  
  const barrio_popularity = barrio_count / 1000.0;
  
  // neigh_grouped
  const barriosObj = options.barrios_por_ciudad || {};
  const barriosValidos = barriosObj[origen] || [];
  const neigh_grouped = barriosValidos.includes(barrio) ? barrio : 'Other';

  const condaPath = 'C:\\Users\\Paula\\anaconda3\\Scripts\\conda.exe';
  const scriptPath = path.join(projectRoot, 'python_scripts', 'predict.py');
  const argsBase = [
    origen,
    barrio,
    bathrooms,
    bedrooms,
    accommodates,
    room_type,
    amenities_count || 0,
    has_pool || 0,
    has_jacuzzi || 0,
    has_aircon || 0,
    has_wifi || 0,
    review_scores_rating || 4.85,
    number_of_reviews || 60,
    availability_365 || 200,
    stay_date || '',
    barrio_mean,
    barrio_median,
    barrio_std,
    amenities_text || ''
  ];

  const env = { ...process.env, MODEL_OVERRIDE_PATH: modelPath };
  let pythonCmd;
  let pythonArgs;
  if (fs.existsSync(condaPath)) {
    pythonCmd = condaPath;
    pythonArgs = ['run', '-n', 'base', 'python', scriptPath].concat(argsBase);
  } else {
    pythonCmd = 'python';
    pythonArgs = [scriptPath].concat(argsBase);
  }

  const python = spawn(pythonCmd, pythonArgs, { env });
  let result = '';
  let error = '';

  python.stdout.on('data', data => result += data.toString());
  python.stderr.on('data', err => error += err.toString());

  python.on('close', (code) => {
    if (code === 0 && result.trim()) {
      const predictionUsd = parseFloat(result.trim());
      const rate = process.env.USD_TO_EUR ? parseFloat(process.env.USD_TO_EUR) : 0.92;
      const predictionEur = Number((predictionUsd * rate).toFixed(2));
      const sample = {
        price: predictionEur,
        currency: '€',
        barrio,
        ciudad: origen,
        modelo: modeloLabel,
        modelPath,
        fechaContext,
        input: {
          bathrooms: bath,
          bedrooms: bed,
          accommodates: acc,
          amenities_count,
          has_pool,
          has_jacuzzi,
          has_aircon,
          has_wifi,
          has_kitchen,
          has_parking,
          has_tv,
          has_washer,
          room_type,
          neigh_grouped,
          capacity_category,
          bedroom_category,
          review_scores_rating: rev_rating,
          number_of_reviews: rev_count,
          availability_365: avail,
          barrio_mean_price: barrio_mean,
          barrio_median_price: barrio_median,
          barrio_std_price: barrio_std,
          barrio_count,
          barrio_avg_rating,
          barrio_avg_reviews,
          barrio_popularity,
          bath_per_bed,
          review_score_weighted,
          review_density,
          bedroom_efficiency,
          is_high_season,
          is_weekend,
          is_summer,
          is_winter,
          luxury_score,
          basic_score,
          total_amenities_score,
          price_vs_barrio_mean: 1.0,
          price_vs_barrio_median: 1.0,
          rating_vs_barrio_avg,
          month,
          day_of_week,
          quarter,
          stay_date: stay_date || ''
        }
      };
      const cityKey = findCityKeyBarrio(estadisticasBarrio, origen);
      const barrioKey = cityKey ? findBarrioKeyBarrio(estadisticasBarrio[cityKey], barrio) : null;
      const barrioStats = (cityKey && barrioKey) ? { ...estadisticasBarrio[cityKey][barrioKey], barrioKey, cityKey } : null;
      return res.render('prediccion/alquiler_predict_result_rf', { sample, barrioStats });
    }
    res.render('prediccion/alquiler_predict_result_rf', {
      sample: null,
      error: error || 'Error al realizar la predicción. Verifica que el modelo esté disponible.'
    });
  });
});

// POST /alquiler/shap-local -> calcular SHAP local para una predicción específica
router.post('/alquiler/shap-local', (req, res) => {
  try {
    const modelPath = req.body.modelPath || RENTAL_MODEL_PATHS.rapida;
    const inputData = req.body.input || {};
    
    const condaPath = 'C:\\Users\\Paula\\anaconda3\\Scripts\\conda.exe';
    const pythonExe = 'C:\\Users\\Paula\\anaconda3\\python.exe';
    const scriptPath = path.join(projectRoot, 'python_scripts', 'shap_local_rental.py');
    
    const inputJson = JSON.stringify(inputData);
    const args = [modelPath]; // JSON via env para evitar problemas de parseo en CLI
    
    let pythonCmd;
    let pythonArgs;
    if (fs.existsSync(pythonExe)) {
      pythonCmd = pythonExe;
      pythonArgs = [scriptPath].concat(args);
    } else if (fs.existsSync(condaPath)) {
      pythonCmd = condaPath;
      pythonArgs = ['run', '-n', 'base', 'python', scriptPath].concat(args);
    } else {
      pythonCmd = 'python';
      pythonArgs = [scriptPath].concat(args);
    }
    
    const python = spawn(pythonCmd, pythonArgs, { env: { ...process.env, INPUT_JSON: inputJson } });
    let output = '';
    let error = '';
    
    python.stdout.on('data', data => output += data.toString());
    python.stderr.on('data', err => error += err.toString());
    
    python.on('close', (code) => {
      if (code === 0 && output.trim()) {
        try {
          const result = JSON.parse(output);
          return res.json(result);
        } catch (e) {
          console.error('[SHAP Local] Error parseando JSON:', e.message);
          console.error('[SHAP Local] Output recibido:', output);
          return res.status(500).json({ error: 'Error parseando resultado SHAP', detail: e.message, raw: output.substring(0, 500) });
        }
      }
      console.error('[SHAP Local] Python exit code:', code);
      console.error('[SHAP Local] stderr:', error);
      res.status(500).json({ error: 'Error calculando SHAP local', stderr: error.substring(0, 1000), code });
    });
  } catch (e) {
    res.status(500).json({ error: 'Error interno', detail: e.message });
  }
});

// GET /rental/shap-global -> importancia global SHAP para RF (alquiler)
router.get('/rental/shap-global', (req, res) => {
  const data = readJsonPrefer([
    path.join(projectRoot, 'modelos_predictivos', 'alquiler', 'RF', 'shap_global_importance_rental.json'),
    path.join(projectRoot, 'model', 'rental', 'shap_global_importance_rental.json')
  ]);
  if (!data) return res.status(404).json({ error: 'Rental SHAP global not found' });
  try {
    const features = data.features || data.feature_names || [];
    const importances = data.mean_abs_shap || data.importances || [];
    return res.json({ features, importances });
  } catch (e) {
    return res.json(data);
  }
});

// Alias en español
router.get('/alquiler/explicacion-global', (req, res) => {
  const data = readJsonPrefer([
    path.join(projectRoot, 'modelos_predictivos', 'alquiler', 'RF', 'shap_global_importance_rental.json'),
    path.join(projectRoot, 'model', 'rental', 'shap_global_importance_rental.json')
  ]);
  if (!data) return res.status(404).json({ error: 'No se encontró la explicación global de alquiler (SHAP)' });
  try {
    const features = data.features || data.feature_names || [];
    const importances = data.mean_abs_shap || data.importances || [];
    return res.json({ features, importances });
  } catch (e) {
    return res.json(data);
  }
});

// Ruta de predicción - POST /predict (Legacy)
router.post('/predict', (req, res) => {
  const { 
    origen, 
    barrio, 
    bathrooms, 
    bedrooms, 
    accommodates, 
    room_type,
    review_scores_rating,
    number_of_reviews,
    availability_365
  } = req.body;

  // Amenities seleccionadas (array de strings). Calculamos el count aquí y pasamos el texto al script Python
  const amenitiesSelected = Array.isArray(req.body.amenities) ? req.body.amenities : (req.body.amenities ? [req.body.amenities] : []);
  const amenities_count = amenitiesSelected.length;
  const amenities_text = amenitiesSelected.join(', ');

  // Detectar amenities específicas basadas en las seleccionadas
  const amenitiesLower = amenities_text.toLowerCase();
  const has_pool = amenitiesLower.includes('piscina') || amenitiesLower.includes('pool') ? 1 : 0;
  const has_jacuzzi = amenitiesLower.includes('jacuzzi') || amenitiesLower.includes('hot tub') || amenitiesLower.includes('hidromasaje') ? 1 : 0;
  const has_aircon = amenitiesLower.includes('aire acondicionado') || amenitiesLower.includes('air conditioning') || amenitiesLower.includes('a/c') ? 1 : 0;
  const has_wifi = amenitiesLower.includes('wifi') || amenitiesLower.includes('wi-fi') ? 1 : 0;

  // Validar que todos los campos esenciales estén presentes
  if (!origen || !barrio || !bathrooms || !bedrooms || !accommodates || !room_type) {
    return res.render('prediccion/result', {
      success: false,
      error: 'Por favor, completa todos los campos esenciales del formulario.'
    });
  }

  // Asegurar que siempre haya valores para estadísticas de barrio (OBLIGATORIOS para el modelo)
  const barrio_mean = req.body.barrio_mean_price || 160;
  const barrio_median = req.body.barrio_median_price || 150;
  const barrio_std = req.body.barrio_std_price || 35;
  const stay_date = req.body.stay_date || '';

  // Contexto de fecha (festivo/puente/temporada/evento)
  const fechaContext = computeFechaContext(origen, stay_date);

  // Ejecutar el script Python: preferir conda (entorno que contiene sklearn 1.6.1) si existe, si no usar python del sistema
  const condaPath = 'C:\\Users\\Paula\\anaconda3\\Scripts\\conda.exe';
  const scriptPath = path.join(projectRoot, 'python_scripts', 'predict.py');
  const argsBase = [
    origen,
    barrio,
    bathrooms,
    bedrooms,
    accommodates,
    room_type,
    amenities_count || 0,
    has_pool || 0,
    has_jacuzzi || 0,
    has_aircon || 0,
    has_wifi || 0,
    review_scores_rating || 4.85,
    number_of_reviews || 60,
    availability_365 || 200,
    stay_date,
    barrio_mean,
    barrio_median,
    barrio_std,
    amenities_text || ''
  ];

  let pythonCmd;
  let pythonArgs;
  if (fs.existsSync(condaPath)) {
    // Usar: conda run -n base python predict.py <args...>
    pythonCmd = condaPath;
    pythonArgs = ['run', '-n', 'base', 'python', scriptPath].concat(argsBase);
  } else {
    pythonCmd = 'python';
    pythonArgs = [scriptPath].concat(argsBase);
  }

  // Spawn del proceso Python
  const python = spawn(pythonCmd, pythonArgs);

  let result = '';
  let error = '';

  python.stdout.on('data', data => result += data.toString());
  python.stderr.on('data', err => error += err.toString());

  python.on('close', (code) => {
    if (code === 0 && result.trim()) {
      const predictionUsd = parseFloat(result.trim());
      // Conversión USD -> EUR: usar variable de entorno USD_TO_EUR si está disponible, sino valor por defecto
      const rate = process.env.USD_TO_EUR ? parseFloat(process.env.USD_TO_EUR) : 0.92;
      const predictionEur = Number((predictionUsd * rate).toFixed(2));
      res.render('prediccion/result', {
        success: true,
        predictionUsd: Number(predictionUsd.toFixed(2)),
        prediction: predictionEur,
        fechaContext,
        input: { 
          origen, 
          barrio, 
          bathrooms, 
          bedrooms, 
          accommodates, 
          room_type,
          amenities_count: amenities_count,
          amenities: amenitiesSelected,
          has_pool: has_pool ? 'Sí' : 'No',
          has_jacuzzi: has_jacuzzi ? 'Sí' : 'No',
          has_aircon: has_aircon ? 'Sí' : 'No',
          has_wifi: has_wifi ? 'Sí' : 'No',
          review_scores_rating,
          number_of_reviews,
          availability_365,
          stay_date,
          barrio_mean,
          barrio_median,
          barrio_std
        }
      });
    } else {
      res.render('prediccion/result', {
        success: false,
        error: error || 'Error al realizar la predicción. Verifica que el modelo esté disponible.'
      });
    }
  });
});

module.exports = router;
