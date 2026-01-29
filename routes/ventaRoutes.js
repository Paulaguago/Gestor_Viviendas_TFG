const express = require('express');
const router = express.Router();
const path = require('path');
const { 
  readJsonPrefer, 
  projectRoot 
} = require('../utils/dataLoader');

// Formulario venta (placeholder por ahora)
router.get('/form/venta', (req, res) => {
  res.render('prediccion/prediccion_venta');
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
