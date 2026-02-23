const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { 
  readJsonPrefer, 
  projectRoot 
} = require('../utils/dataLoader');
const { spawnPython } = require('../utils/pythonRunner');
const { requireAuth } = require('../utils/authMiddleware');
const { Vivienda, Reserva, User } = require('../models');

// ================= PROXY GEOCODING (evita CORS con Nominatim) =================
router.get('/api/geocode', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.json([]);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'GestorViviendas/1.0' }
    });
    const data = await resp.json();
    return res.json(data);
  } catch (e) {
    console.error('Geocode proxy error:', e.message);
    return res.json([]);
  }
});

// ================= PERFIL DE USUARIO =================

router.get('/perfil', requireAuth, (req, res) => {
    res.render('perfil', {
        user: req.user,
        isAuthenticated: true,
        success: req.flash('success'),
        error: req.flash('error')
    });
});

router.post('/perfil', requireAuth, async (req, res) => {
    try {
        const { nombre, apellidos, telefono, razon_social } = req.body;
        await req.user.update({ nombre, apellidos, telefono, razon_social });
        req.flash('success', 'Perfil actualizado correctamente');
    } catch (err) {
        console.error('Error actualizando perfil:', err);
        req.flash('error', 'Error al actualizar el perfil');
    }
    res.redirect('/perfil');
});

router.post('/perfil/cambiar-password', requireAuth, async (req, res) => {
    try {
        const { password_actual, password_nuevo, password_confirmar } = req.body;

        if (req.user.google_id && !req.user.password_hash) {
            req.flash('error', 'Tu cuenta usa inicio de sesión con Google; no tiene contraseña local');
            return res.redirect('/perfil');
        }

        const valid = await req.user.comparePassword(password_actual);
        if (!valid) {
            req.flash('error', 'La contraseña actual es incorrecta');
            return res.redirect('/perfil');
        }

        if (password_nuevo !== password_confirmar) {
            req.flash('error', 'Las contraseñas nuevas no coinciden');
            return res.redirect('/perfil');
        }

        if (password_nuevo.length < 6) {
            req.flash('error', 'La nueva contraseña debe tener al menos 6 caracteres');
            return res.redirect('/perfil');
        }

        await req.user.update({ password_hash: password_nuevo });
        req.flash('success', 'Contraseña actualizada correctamente');
    } catch (err) {
        console.error('Error cambiando contraseña:', err);
        req.flash('error', 'Error al cambiar la contraseña');
    }
    res.redirect('/perfil');
});

// ================= RUTAS UI DE NAVEGACIÓN =================
// Landing de selección de dominio (alquiler/venta)
router.get('/opciones-prediccion', requireAuth, (req, res) => {
  res.render('prediccion/opciones-prediccion', {
    title: 'Opciones de Predicción',
    user: req.user
  });
});

// Redirecciones de retrocompatibilidad
router.get('/form/alquiler', requireAuth, (req, res) => res.redirect('/alquiler'));
router.get('/form/venta', requireAuth, (req, res) => res.redirect('/venta'));

// Ruta principal - GET / -> siempre muestra la página principal index.ejs
router.get('/', (req, res) => {
  res.render('index', {
    title: 'Gestor Viviendas - Inicio'
  });
});

// ================= EBM: endpoints para explicaciones =================
// GET /explain/global -> explicación global EBM
router.get('/explain/global', requireAuth, (req, res) => {
  const base = path.join(projectRoot, 'model');
  const data = readJsonPrefer([
    path.join(base, 'ebm', 'ebm_global_explanation.json'),
    path.join(base, 'ebm_global_explanation.json') // fallback legacy
  ]);
  if (!data) return res.status(404).json({ error: 'Global explanation not found' });
  return res.json(data);
});

// GET /explain/local -> explicación local EBM (por ahora una instancia precomputada)
router.get('/explain/local', requireAuth, (req, res) => {
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
router.post('/explain/local-live', requireAuth, (req, res) => {
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

    const scriptPath = path.join(projectRoot, 'python_scripts', 'ebm_local_explain.py');
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

    const py = spawnPython(scriptPath, args);
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
router.get('/rf/importance', requireAuth, (req, res) => {
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
router.get('/rf/distribution', requireAuth, (req, res) => {
  const base = path.join(projectRoot, 'model');
  const data = readJsonPrefer([
    path.join(base, 'rf', 'predictions_test.json'),
    path.join(base, 'predictions_test_rf.json')
  ]);
  if (!data) return res.status(404).json({ error: 'RF distribution not found' });
  return res.json(data);
});

// ================= API GEOCODING =================
// GET /api/geocoding -> proxy para Nominatim (evitar CORS)
router.get('/api/geocoding', requireAuth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const https = require('https');
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`;
    
    // Usar https nativo de Node.js
    const request = https.get(url, {
      headers: {
        'User-Agent': 'GestorViviendas/1.0 (gestor@viviendas.com)', // Nominatim requiere User-Agent
      }
    }, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          res.json(jsonData);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          res.status(500).json({ error: 'Error parsing geocoding response' });
        }
      });
    });

    request.on('error', (error) => {
      console.error('Geocoding request error:', error);
      res.status(500).json({ error: 'Error al buscar la ubicación' });
    });

    request.setTimeout(5000, () => {
      request.destroy();
      res.status(504).json({ error: 'Timeout al buscar la ubicación' });
    });

  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({ error: 'Error al buscar la ubicación' });
  }
});

module.exports = router;
