# ====================================
# SHAP ANALYSIS - LIGHTGBM VENTAS DE VIVIENDAS
# Explicabilidad global y local para el modelo optimizado
# ====================================

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import shap
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import category_encoders as ce

# ====================================
# CONFIGURACIÓN
# ====================================
RANDOM_STATE = 42
N_SHAP_SAMPLES = 1000  # Muestras para SHAP (ajustar según RAM)
N_BACKGROUND_SAMPLES = 100  # Muestras de background para TreeExplainer

print("="*60)
print("ANÁLISIS SHAP - LIGHTGBM VENTAS DE VIVIENDAS")
print("="*60)

# ====================================
# 1. CARGAR DATOS Y PREPROCESAR
# ====================================
print("\n[1/6] Cargando y preprocesando datos...")
file_path = '/content/drive/MyDrive/AA_UNIVERSIDAD/TFG-ALEX_Y_PAULA/PRUEBAS/VENTA_CASAS/spanish_houses.csv'
df = pd.read_csv(file_path)

# Convertir numéricas
numeric_cols = ['price','m2_useful','m2_real','room_num','bath_num','floor',
                'ground_size','number_of_companies_prov','population_prov',
                'companies_prov_vs_national_%','population_prov_vs_national_%',
                'renta_media_prov','construct_date']

for col in numeric_cols:
    df[col] = df[col].astype(str).str.replace(',','').str.replace('€','')
    df[col] = pd.to_numeric(df[col], errors='coerce')

# Amenities
amenities = ['garage','terrace','garden','swimming_pool','lift','balcony']
for col in amenities:
    df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)

# Booleanas
binary_cols = ['air_conditioner','built_in_wardrobe','chimney','reduced_mobility',
               'storage_room','unfurnished']
for col in binary_cols:
    df[col] = df[col].map({'yes':1, 'no':0}).fillna(0).astype(int)

# Outliers IQR
Q1 = df['price'].quantile(0.25)
Q3 = df['price'].quantile(0.75)
IQR = Q3 - Q1
df = df[(df['price'] >= Q1 - 1.5*IQR) & (df['price'] <= Q3 + 1.5*IQR)].copy()
df = df[(df['m2_useful'] > 20) & (df['m2_useful'] < df['m2_useful'].quantile(0.99))].copy()
df = df[(df['m2_real'] > 20) & (df['m2_real'] < df['m2_real'].quantile(0.99))].copy()

print(f"   Datos después de limpieza: {df.shape}")

# ====================================
# 2. FEATURE ENGINEERING
# ====================================
print("\n[2/6] Generando features...")

# IMPORTANTE: Eliminar features con fuga de información
# df['price_per_m2'] = df['price'] / (df['m2_useful'] + 0.01)  # FUGA - comentado
# df['price_segment'] = pd.qcut(...)  # FUGA - comentado

# Features sin fuga
df['age'] = 2025 - df['construct_date']
df['age'] = df['age'].fillna(df['age'].median()).clip(0, 150)
df['age_squared'] = df['age'] ** 2
df['amenities_score'] = df[amenities].sum(axis=1)
df['has_premium_outdoor'] = ((df['swimming_pool'] == 1) | (df['garden'] == 1)).astype(int)
df['bath_per_room'] = df['bath_num'] / (df['room_num'] + 0.01)
df['companies_per_capita'] = df['number_of_companies_prov'] / (df['population_prov'] + 1)
df['m2_diff'] = df['m2_real'] - df['m2_useful']
df['m2_ratio'] = df['m2_useful'] / (df['m2_real'] + 0.01)
df['pop_density_relative'] = df['population_prov_vs_national_%'] * df['population_prov']
df['renta_per_capita'] = df['renta_media_prov'] / (df['population_prov'] / 1000 + 1)
df['size_segment'] = pd.cut(df['m2_useful'], bins=[0, 50, 80, 120, 200, 1000],
                             labels=['muy_pequeño','pequeño','medio','grande','muy_grande'])

# Imputaciones
df['m2_real'] = df['m2_real'].fillna(df['m2_useful'])
df['ground_size'] = df.groupby('house_type')['ground_size'].transform(lambda x: x.fillna(x.median()))
df['floor'] = df['floor'].fillna(0)

# Objetivo log
y = np.log(df['price'])

# ====================================
# 3. TARGET ENCODING
# ====================================
print("\n[3/6] Aplicando Target Encoding...")

multi_cat_cols = ['condition','energetic_certif','heating','house_type',
                  'kitchen','loc_city','loc_zone','loc_district','loc_neigh',
                  'orientation','size_segment']  # price_segment eliminado

encoder = ce.TargetEncoder(cols=multi_cat_cols, smoothing=1.0)

# Frecuencias
for col in ['loc_city', 'loc_zone', 'loc_district', 'house_type']:
    if col in df.columns:
        freq = df[col].value_counts(normalize=True).to_dict()
        df[f'{col}_freq'] = df[col].map(freq)

# Preparar X
drop_cols = ['price','house_id','ad_description','ad_last_update',
             'loc_full','loc_street','obtention_date','construct_date']
X = df.drop(columns=[c for c in drop_cols if c in df.columns])
X[multi_cat_cols] = encoder.fit_transform(X[multi_cat_cols], y)
X = X.fillna(-999)

print(f"   Features finales (sin fuga): {X.shape[1]}")

# ====================================
# 4. TRAIN/TEST SPLIT Y CARGAR/ENTRENAR MODELO
# ====================================
print("\n[4/6] Dividiendo datos y cargando/entrenando modelo...")

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=RANDOM_STATE, shuffle=True
)

# Intentar cargar modelo entrenado
try:
    model = joblib.load('/content/model_lightgbm_optimized.pkl')
    print("   ⚠ Modelo cargado, pero fue entrenado con features con fuga (50 features).")
    print("   ℹ Reentrenando modelo SIN FUGA con las 48 features actuales...")
    raise FileNotFoundError  # Forzar reentrenamiento
except FileNotFoundError:
    print("   Entrenando modelo LightGBM SIN FUGA DE INFORMACIÓN...")
    from lightgbm import LGBMRegressor

    model = LGBMRegressor(
        objective='regression',
        metric='rmse',
        n_estimators=2000,
        learning_rate=0.03,
        num_leaves=50,
        max_depth=8,
        feature_fraction=0.8,
        bagging_fraction=0.7,
        bagging_freq=5,
        min_child_samples=20,
        reg_alpha=0.1,
        reg_lambda=0.1,
        random_state=RANDOM_STATE,
        verbose=-1
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        eval_metric='rmse'
    )

    # Guardar modelo sin fuga
    joblib.dump(model, '/content/model_lightgbm_no_leakage.pkl')
    print("   ✓ Modelo sin fuga guardado: model_lightgbm_no_leakage.pkl")
    joblib.dump(encoder, '/content/target_encoder_no_leakage.pkl')
    print("✓ Encoder guardado: target_encoder_no_leakage.pkl")

# Verificar métricas
y_pred_log = model.predict(X_test)
y_pred = np.exp(y_pred_log)
y_true = np.exp(y_test)
mae = mean_absolute_error(y_true, y_pred)
r2 = 1 - ((y_true - y_pred)**2).sum() / ((y_true - y_true.mean())**2).sum()
print(f"   MAE (sin fuga): {mae:,.2f} €")
print(f"   R² (sin fuga):  {r2:.4f}")

# ====================================
# 5. SHAP ANALYSIS
# ====================================
print("\n[5/6] Calculando SHAP values...")

# Tomar muestra para SHAP (evita RAM overflow)
if len(X_test) > N_SHAP_SAMPLES:
    X_shap = X_test.sample(n=N_SHAP_SAMPLES, random_state=RANDOM_STATE)
    y_shap = y_test.loc[X_shap.index]
    print(f"   Usando {N_SHAP_SAMPLES} muestras de {len(X_test)} disponibles")
else:
    X_shap = X_test
    y_shap = y_test
    print(f"   Usando todas las muestras: {len(X_shap)}")

# TreeExplainer (rápido y exacto para LightGBM)
explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_shap)

print(f"   SHAP values calculados: shape {shap_values.shape}")

# ====================================
# 6. VISUALIZACIONES
# ====================================
print("\n[6/6] Generando visualizaciones...")

# 6.1. SUMMARY PLOT (Beeswarm) - Importancia global
print("   Generando summary plot (beeswarm)...")
plt.figure(figsize=(10, 8))
shap.summary_plot(shap_values, X_shap, plot_type="dot", show=False, max_display=20)
plt.title("Importancia Global de Variables (SHAP) - LightGBM Ventas", fontsize=14, pad=20)
plt.tight_layout()
plt.savefig('/content/shap_summary_beeswarm_ventas.png', dpi=300, bbox_inches='tight')
plt.show()
print("   ✓ Guardado: shap_summary_beeswarm_ventas.png")

# 6.2. BAR PLOT - Importancia media absoluta
print("   Generando bar plot (importancia media)...")
plt.figure(figsize=(8, 6))
shap.summary_plot(shap_values, X_shap, plot_type="bar", show=False, max_display=15)
plt.title("Top 15 Variables por Importancia SHAP Media", fontsize=14, pad=20)
plt.tight_layout()
plt.savefig('/content/shap_bar_importance_ventas.png', dpi=300, bbox_inches='tight')
plt.show()
print("   ✓ Guardado: shap_bar_importance_ventas.png")

# 6.3. DEPENDENCE PLOTS - Top 3 features
print("   Generando dependence plots para top 3 features...")
shap_importance = np.abs(shap_values).mean(axis=0)
top_features_idx = np.argsort(shap_importance)[-3:][::-1]
top_features = [X_shap.columns[i] for i in top_features_idx]

for i, feature in enumerate(top_features):
    plt.figure(figsize=(8, 5))
    shap.dependence_plot(feature, shap_values, X_shap, show=False)
    plt.title(f"Dependencia SHAP: {feature}", fontsize=12)
    plt.tight_layout()
    plt.savefig(f'/content/shap_dependence_{i+1}_{feature}.png', dpi=200, bbox_inches='tight')
    plt.show()
    print(f"   ✓ Guardado: shap_dependence_{i+1}_{feature}.png")

# 6.4. WATERFALL PLOT - Peor predicción (mayor error)
print("   Generando waterfall plot para peor caso...")
y_pred_shap = np.exp(model.predict(X_shap))
y_true_shap = np.exp(y_shap)
abs_errors = np.abs(y_true_shap - y_pred_shap)
worst_idx = abs_errors.idxmax()
worst_idx_position = X_shap.index.get_loc(worst_idx)

print(f"   Peor caso: índice {worst_idx}, error {abs_errors.loc[worst_idx]:,.2f} €")

plt.figure(figsize=(10, 6))
shap.plots.waterfall(
    shap.Explanation(
        values=shap_values[worst_idx_position],
        base_values=explainer.expected_value,
        data=X_shap.iloc[worst_idx_position],
        feature_names=X_shap.columns.tolist()
    ),
    max_display=15,
    show=False
)
plt.title(f"Explicación Local - Peor Predicción (error: {abs_errors.loc[worst_idx]:,.0f}€)",
          fontsize=12, pad=20)
plt.tight_layout()
plt.savefig('/content/shap_waterfall_worst_case_ventas.png', dpi=300, bbox_inches='tight')
plt.show()
print("   ✓ Guardado: shap_waterfall_worst_case_ventas.png")

# 6.5. FORCE PLOT (HTML interactivo) - Primera instancia
print("   Generando force plot interactivo (HTML)...")
try:
    shap.initjs()
    force_plot = shap.force_plot(
        explainer.expected_value,
        shap_values[0],
        X_shap.iloc[0],
        matplotlib=False
    )
    shap.save_html('/content/shap_force_plot_ventas.html', force_plot)
    print("   ✓ Guardado: shap_force_plot_ventas.html")
except Exception as e:
    print(f"   ⚠ No se pudo generar force_plot: {e}")

# 6.6. EXPORTAR DATOS SHAP A CSV (opcional)
print("   Exportando SHAP values a CSV...")
shap_df = pd.DataFrame(shap_values, columns=X_shap.columns, index=X_shap.index)
shap_df['true_price'] = y_true_shap.values if hasattr(y_true_shap, 'values') else y_true_shap
shap_df['pred_price'] = y_pred_shap if isinstance(y_pred_shap, np.ndarray) else y_pred_shap.values
shap_df['abs_error'] = abs_errors.values if hasattr(abs_errors, 'values') else abs_errors
shap_df.to_csv('/content/shap_values_ventas.csv', index=True)
print("   ✓ Guardado: shap_values_ventas.csv")

# ====================================
# 7. RESUMEN ESTADÍSTICO
# ====================================
print("\n" + "="*60)
print("RESUMEN SHAP ANALYSIS")
print("="*60)
print(f"Muestras analizadas:     {len(X_shap)}")
print(f"Features totales:        {X_shap.shape[1]}")
print(f"SHAP value medio (abs):  {np.abs(shap_values).mean():.4f}")
print(f"\nTop 5 features por importancia SHAP media (abs):")
top5_importance = pd.DataFrame({
    'feature': X_shap.columns,
    'mean_abs_shap': np.abs(shap_values).mean(axis=0)
}).sort_values('mean_abs_shap', ascending=False).head(5)
print(top5_importance.to_string(index=False))

print("\n" + "="*60)
print("ARCHIVOS GENERADOS")
print("="*60)
print("  📊 shap_summary_beeswarm_ventas.png")
print("  📊 shap_bar_importance_ventas.png")
print("  📊 shap_dependence_1_<feature>.png (x3)")
print("  📊 shap_waterfall_worst_case_ventas.png")
print("  🌐 shap_force_plot_ventas.html")
print("  📄 shap_values_ventas.csv")
print("="*60)
print("\n✓ Análisis SHAP completado exitosamente\n")
