# ====================================
# EBM OPTIMIZADO - PREDICCIÓN PRECIOS CASAS
# Estrategias: feature engineering avanzado, outliers, explainability
# ====================================

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import matplotlib.pyplot as plt
from interpret.glassbox import ExplainableBoostingRegressor
import category_encoders as ce
from scipy import stats
import joblib
import os

# ====================================
# 1. CARGAR DATOS
# ====================================
from google.colab import drive
try:
    drive.mount('/content/drive')
except:
    drive.mount('/content/drive', force_remount=True)

file_path = '/content/drive/MyDrive/AA_UNIVERSIDAD/TFG-ALEX_Y_PAULA/PRUEBAS/VENTA_CASAS/spanish_houses.csv'
df = pd.read_csv(file_path)

print(f"Datos originales: {df.shape}")

# ====================================
# 2. CONVERTIR NUMÉRICAS
# ====================================
numeric_cols = ['price','m2_useful','m2_real','room_num','bath_num','floor',
                'ground_size','number_of_companies_prov','population_prov',
                'companies_prov_vs_national_%','population_prov_vs_national_%',
                'renta_media_prov','construct_date']

for col in numeric_cols:
    df[col] = df[col].astype(str).str.replace(',','').str.replace('€','')
    df[col] = pd.to_numeric(df[col], errors='coerce')

# ====================================
# 3. AMENITIES (0/1)
# ====================================
amenities = ['garage','terrace','garden','swimming_pool','lift','balcony']
for col in amenities:
    df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)

# ====================================
# 4. BOOLEANAS (0/1)
# ====================================
binary_cols = ['air_conditioner','built_in_wardrobe','chimney','reduced_mobility',
               'storage_room','unfurnished']

for col in binary_cols:
    if col in df.columns:
        df[col] = df[col].map({'yes':1, 'no':0}).fillna(0).astype(int)

# ====================================
# 5. OUTLIERS MÁS AGRESIVOS (IQR method + percentiles)
# ====================================
# Eliminar outliers extremos en price y m2
Q1 = df['price'].quantile(0.25)
Q3 = df['price'].quantile(0.75)
IQR = Q3 - Q1
lower_bound = Q1 - 1.5 * IQR
upper_bound = Q3 + 1.5 * IQR

df = df[(df['price'] >= lower_bound) & (df['price'] <= upper_bound)].copy()

# Eliminar m2 extremos
df = df[(df['m2_useful'] > 20) & (df['m2_useful'] < df['m2_useful'].quantile(0.99))].copy()
df = df[(df['m2_real'] > 20) & (df['m2_real'] < df['m2_real'].quantile(0.99))].copy()

print(f"Después de limpiar outliers: {df.shape}")

# ====================================
# 6. FEATURE ENGINEERING AVANZADO
# ====================================
# Precio por m2 (REMOVIDO - causa fuga de información)
# df['price_per_m2'] = df['price'] / (df['m2_useful'] + 0.01)

# Edad de la casa
df['age'] = 2025 - df['construct_date']
df['age'] = df['age'].fillna(df['age'].median())
df['age'] = df['age'].clip(0, 150)  # Limitar edades extremas

# Edad al cuadrado (relación no lineal)
df['age_squared'] = df['age'] ** 2

# Score de amenities
df['amenities_score'] = df[amenities].sum(axis=1)

# Amenities premium (piscina + jardín)
df['has_premium_outdoor'] = ((df['swimming_pool'] == 1) | (df['garden'] == 1)).astype(int)

# Ratio baños/habitaciones
df['bath_per_room'] = df['bath_num'] / (df['room_num'] + 0.01)

# Empresas per cápita
df['companies_per_capita'] = df['number_of_companies_prov'] / (df['population_prov'] + 1)

# Diferencia entre m2 útil y real
df['m2_diff'] = df['m2_real'] - df['m2_useful']
df['m2_ratio'] = df['m2_useful'] / (df['m2_real'] + 0.01)

# Densidad poblacional relativa
df['pop_density_relative'] = df['population_prov_vs_national_%'] * df['population_prov']

# Renta per cápita aproximada
df['renta_per_capita'] = df['renta_media_prov'] / (df['population_prov'] / 1000 + 1)

# Segmento de tamaño
df['size_segment'] = pd.cut(df['m2_useful'], bins=[0, 50, 80, 120, 200, 1000],
                             labels=['muy_pequeño','pequeño','medio','grande','muy_grande'])

# ====================================
# 7. IMPUTACIÓN INTELIGENTE
# ====================================
# Imputar m2_real con m2_useful si falta
df['m2_real'] = df['m2_real'].fillna(df['m2_useful'])

# Imputar ground_size con mediana por tipo de casa
df['ground_size'] = df.groupby('house_type')['ground_size'].transform(
    lambda x: x.fillna(x.median())
)

# Floor: llenar con 0 (planta baja)
df['floor'] = df['floor'].fillna(0)

# ====================================
# 8. VARIABLE OBJETIVO (LOG)
# ====================================
y = np.log(df['price'])

# ====================================
# 9. TARGET ENCODING + FRECUENCIA
# ====================================
multi_cat_cols = ['condition','energetic_certif','heating','house_type',
                  'kitchen','loc_city','loc_zone','loc_district','loc_neigh',
                  'orientation','size_segment']

# Target encoding
encoder = ce.TargetEncoder(cols=multi_cat_cols, smoothing=1.0)

# Añadir frecuencia de categorías (ayuda al modelo)
for col in ['loc_city', 'loc_zone', 'loc_district', 'house_type']:
    if col in df.columns:
        freq = df[col].value_counts(normalize=True).to_dict()
        df[f'{col}_freq'] = df[col].map(freq)

# ====================================
# 10. PREPARAR X
# ====================================
drop_cols = ['price','house_id','ad_description','ad_last_update',
             'loc_full','loc_street','obtention_date','construct_date']

X = df.drop(columns=[c for c in drop_cols if c in df.columns])

# Aplicar target encoding
X[multi_cat_cols] = encoder.fit_transform(X[multi_cat_cols], y)

# Rellenar NaNs restantes con -999
X = X.fillna(-999)

print(f"Features finales: {X.shape[1]}")
print(f"Features: {list(X.columns)}")

# ====================================
# 11. TRAIN/TEST SPLIT
# ====================================
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, shuffle=True
)

print(f"Train: {X_train.shape}, Test: {X_test.shape}")

# ====================================
# 12. EBM OPTIMIZADO CON EARLY STOPPING
# ====================================
print("\n[Entrenando modelo EBM...]")

model = ExplainableBoostingRegressor(
    max_bins=128,                    # Reducido de 256
    max_interaction_bins=16,         # Reducido de 32
    interactions=5,                  # Reducido de 10 (menos términos de interacción)
    outer_bags=4,                    # Reducido de 8
    inner_bags=0,                    
    learning_rate=0.05,              # Aumentado de 0.01 (converge más rápido)
    max_rounds=500,                  # Reducido de 10000 (GRAN CAMBIO)
    early_stopping_rounds=50,        # Reducido de 100
    early_stopping_tolerance=0.001,
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)

print("✓ Modelo EBM entrenado correctamente")

# ====================================
# 13. PREDICCIÓN Y MÉTRICAS
# ====================================
y_pred_log = model.predict(X_test)
y_pred = np.exp(y_pred_log)
y_true = np.exp(y_test)

mae = mean_absolute_error(y_true, y_pred)
rmse = np.sqrt(mean_squared_error(y_true, y_pred))
r2 = r2_score(y_true, y_pred)
mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100

print("\n" + "="*60)
print("MÉTRICAS - EBM OPTIMIZADO")
print("="*60)
print(f"MAE:  {mae:,.2f} €")
print(f"RMSE: {rmse:,.2f} €")
print(f"R²:   {r2:.4f}")
print(f"MAPE: {mape:.2f}%")
print("="*60)

# ====================================
# 14. VALIDACIÓN CRUZADA
# ====================================
print("\n[Validación cruzada 3-fold...]")
cv_scores = cross_val_score(model, X_train, y_train, cv=3,
                             scoring='r2', n_jobs=-1)
print(f"R² CV promedio: {cv_scores.mean():.4f} (+/- {cv_scores.std()*2:.4f})")

# ====================================
# 15. GLOBAL EXPLANATION - FEATURE IMPORTANCE
# ====================================
print("\n[Generando explicaciones globales...]")

# Importancias desde explain_global (robusto a interacciones)
global_exp = model.explain_global()
exp_data = global_exp.data()
feature_names = exp_data['names']
feature_importances = np.abs(exp_data['scores'])

feature_imp = pd.DataFrame(
    {'feature': feature_names, 'importance': feature_importances}
).sort_values('importance', ascending=False)

print("\n=== TOP 20 FEATURES MÁS IMPORTANTES ===")
print(feature_imp.head(20).to_string(index=False))

# Guardar importancia a JSON
feature_imp_dict = feature_imp.head(50).to_dict('records')
os.makedirs('model', exist_ok=True)
with open('model/ebm_feature_importance.json', 'w') as f:
    import json
    json.dump(feature_imp_dict, f, indent=2)

# ====================================
# 16. VISUALIZACIONES
# ====================================

# Plot 1: Top 20 Features
plt.figure(figsize=(12, 8))
top_20 = feature_imp.head(20)
plt.barh(range(len(top_20)), top_20['importance'].values, color='steelblue')
plt.yticks(range(len(top_20)), top_20['feature'].values)
plt.xlabel('Importancia (valor absoluto de scores)')
plt.title('Top 20 Features - EBM Regressor')
plt.gca().invert_yaxis()
plt.tight_layout()
os.makedirs('public', exist_ok=True)
plt.savefig('public/ebm_feature_importance.png', dpi=150, bbox_inches='tight')
print("\n✓ Gráfico de importancia guardado: public/ebm_feature_importance.png")

# Plot 2: Análisis de residuos
residuals = y_true - y_pred
fig, axes = plt.subplots(2, 2, figsize=(14, 10))

# Residuos vs Predicción
axes[0, 0].scatter(y_pred, residuals, alpha=0.3, s=10, color='steelblue')
axes[0, 0].axhline(0, color='red', linestyle='--', linewidth=2)
axes[0, 0].set_xlabel('Predicción (€)')
axes[0, 0].set_ylabel('Residuo (€)')
axes[0, 0].set_title('Residuos vs Predicción')

# Histograma de residuos
axes[0, 1].hist(residuals, bins=50, edgecolor='black', color='steelblue', alpha=0.7)
axes[0, 1].set_xlabel('Residuo (€)')
axes[0, 1].set_ylabel('Frecuencia')
axes[0, 1].set_title('Distribución de Residuos')
axes[0, 1].axvline(0, color='red', linestyle='--', linewidth=2)

# Q-Q Plot
stats.probplot(residuals, dist="norm", plot=axes[1, 0])
axes[1, 0].set_title('Q-Q Plot')

# Predicción vs Real
axes[1, 1].scatter(y_true, y_pred, alpha=0.3, s=10, color='steelblue')
axes[1, 1].plot([y_true.min(), y_true.max()], [y_true.min(), y_true.max()], 'r--', lw=2)
axes[1, 1].set_xlabel('Precio Real (€)')
axes[1, 1].set_ylabel('Precio Predicho (€)')
axes[1, 1].set_title('Predicción vs Real')

plt.tight_layout()
plt.savefig('public/ebm_residuals_analysis.png', dpi=150, bbox_inches='tight')
print("✓ Gráfico de residuos guardado: public/ebm_residuals_analysis.png")

# Plot 3: Distribución de errores por percentiles
percentiles = np.arange(0, 101, 10)
errors_by_percentile = []
predictions_by_percentile = []

for p in percentiles:
    mask = y_true <= y_true.quantile(p/100)
    if mask.sum() > 0:
        error = mean_absolute_error(y_true[mask], y_pred[mask])
        errors_by_percentile.append(error)
        predictions_by_percentile.append(y_true[mask].mean())

fig, ax = plt.subplots(figsize=(12, 6))
ax.bar(percentiles[:len(errors_by_percentile)], errors_by_percentile, color='steelblue', alpha=0.7)
ax.set_xlabel('Percentil de Precio Real')
ax.set_ylabel('MAE (€)')
ax.set_title('Error Absoluto Medio por Percentil de Precio')
ax.grid(axis='y', alpha=0.3)
plt.tight_layout()
plt.savefig('public/ebm_errors_by_percentile.png', dpi=150, bbox_inches='tight')
print("✓ Gráfico de errores por percentil guardado: public/ebm_errors_by_percentile.png")

# ====================================
# 17. ANÁLISIS DETALLADO DE ERRORES
# ====================================
error_analysis = pd.DataFrame({
    'Real': y_true,
    'Predicho': y_pred,
    'Error_Abs': np.abs(y_true - y_pred),
    'Error_Pct': np.abs((y_true - y_pred) / y_true * 100)
})

print("\n" + "="*60)
print("ANÁLISIS DE ERRORES")
print("="*60)
print(f"Error Absoluto Medio: {error_analysis['Error_Abs'].mean():,.2f} €")
print(f"Mediana Error: {error_analysis['Error_Abs'].median():,.2f} €")
print(f"P90 Error: {error_analysis['Error_Abs'].quantile(0.9):,.2f} €")
print(f"Error % Medio: {error_analysis['Error_Pct'].mean():.2f}%")
print(f"Mediana Error %: {error_analysis['Error_Pct'].median():.2f}%")

# Peores predicciones
print("\n=== PEORES 5 PREDICCIONES ===")
worst = error_analysis.nlargest(5, 'Error_Abs')[['Real', 'Predicho', 'Error_Abs', 'Error_Pct']]
print(worst.to_string(index=False))

# ====================================
# 18. GUARDAR MODELO
# ====================================
os.makedirs('model', exist_ok=True)
joblib.dump(model, 'model/ebm_regressor_optimized.pkl')
joblib.dump(encoder, 'model/ebm_target_encoder.pkl')
joblib.dump(feature_imp, 'model/ebm_feature_importance.pkl')

print("\n" + "="*60)
print("✓ MODELOS GUARDADOS")
print("="*60)
print("  - model/ebm_regressor_optimized.pkl")
print("  - model/ebm_target_encoder.pkl")
print("  - model/ebm_feature_importance.pkl")

# ====================================
# 19. RESUMEN FINAL
# ====================================
summary = {
    'modelo': 'EBM Regressor',
    'dataset_size_original': len(df),
    'dataset_size_final': len(X),
    'n_features': X.shape[1],
    'train_size': len(X_train),
    'test_size': len(X_test),
    'mae': float(mae),
    'rmse': float(rmse),
    'r2': float(r2),
    'mape': float(mape),
    'cv_r2_mean': float(cv_scores.mean()),
    'cv_r2_std': float(cv_scores.std()),
    'features': list(X.columns)
}

import json
with open('model/ebm_summary.json', 'w') as f:
    json.dump(summary, f, indent=2)

print("\n" + "="*60)
print("RESUMEN DEL MODELO EBM")
print("="*60)
print(f"Dataset: {len(X)} muestras, {X.shape[1]} features")
print(f"Train/Test: {len(X_train)}/{len(X_test)}")
print(f"R² Test: {r2:.4f}")
print(f"MAE: {mae:,.0f} €")
print(f"CV R²: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
print("="*60)
