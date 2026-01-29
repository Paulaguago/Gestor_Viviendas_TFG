#!/usr/bin/env python3
# ===============================
# ANÁLISIS SHAP - RANDOM FOREST ALQUILER AIRBNB
# ===============================
# Explicabilidad global y local para el modelo optimizado
# Compatible con modelos RF directos o Pipelines

import shap
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
import gc
import json

# ---------- CONFIG ----------
MODEL_PATH = '/content/model_rf_optimized.pkl'  # Ajusta la ruta
CSV_PATH = '/content/drive/MyDrive/AA_UNIVERSIDAD/TFG-ALEX_Y_PAULA/PRUEBAS/listings_combinado.csv'
RANDOM_STATE = 42
TEST_SIZE = 0.2
TOP_NEIGH_COUNT = 40

# Ajusta según RAM disponible
SHAP_SAMPLE_SIZE = 20   # Muestras para SHAP
BACKGROUND_SIZE = 20    # Background samples

print("=" * 60)
print("ANÁLISIS SHAP - RANDOM FOREST ALQUILER")
print("=" * 60)

# =======================================
# 1. CARGA Y PREPROCESADO DE DATOS
# =======================================
print("\n[1/6] Cargando datos...")
df = pd.read_csv(CSV_PATH, low_memory=False)

use_cols = [
    'origen','neighbourhood_cleansed','bathrooms','bedrooms','room_type',
    'accommodates','price','review_scores_rating','number_of_reviews',
    'availability_365','amenities','last_scraped'
]
df = df[[c for c in use_cols if c in df.columns]].copy()

# Limpiar price
df['price'] = (
    df['price']
    .astype(str)
    .str.replace(r'[\$,]', '', regex=True)
    .str.replace(r'[^\d\.]', '', regex=True)
)
df['price'] = pd.to_numeric(df['price'], errors='coerce')
df = df[df['price'].notna() & (df['price'] > 0)].copy()

# Limpiar bathrooms
def clean_bathrooms(x):
    try:
        if pd.isna(x): return np.nan
        s = str(x).strip()
        if s == '': return np.nan
        if s.isdigit() and len(s) >= 2:
            val = float(s) / 10.0
            if 0 < val < 50:
                return val
        return float(s)
    except:
        return np.nan

df['bathrooms'] = df['bathrooms'].apply(clean_bathrooms)

print(f"   Datos cargados: {df.shape}")

# =======================================
# 2. FEATURE ENGINEERING
# =======================================
print("\n[2/6] Generando features...")

# Amenities
def count_amenities(a):
    try:
        if pd.isna(a): return 0
        s = str(a)
        return max(0, s.count(',') + 1) if s.strip() not in ('', '[]') else 0
    except:
        return 0

df['amenities_count'] = df['amenities'].apply(count_amenities)
df['has_pool'] = df['amenities'].str.contains('pool', case=False, na=False).astype(int)
df['has_jacuzzi'] = df['amenities'].str.contains('jacuzzi|hot tub', case=False, na=False).astype(int)
df['has_aircon'] = df['amenities'].str.contains('air conditioning', case=False, na=False).astype(int)
df['has_wifi'] = df['amenities'].str.contains('wifi', case=False, na=False).astype(int)

# Variables temporales
if 'last_scraped' in df.columns:
    df['last_scraped'] = pd.to_datetime(df['last_scraped'], errors='coerce')
    df['month'] = df['last_scraped'].dt.month
    df['day_of_week'] = df['last_scraped'].dt.dayofweek
else:
    df['month'] = np.nan
    df['day_of_week'] = np.nan

# Limpiar nulos y outliers
df = df.dropna(subset=['neighbourhood_cleansed','bathrooms','bedrooms','accommodates','room_type','price'])
df = df[df['accommodates'] > 0]
low_q, high_q = df['price'].quantile([0.01, 0.99])
df = df[(df['price'] >= low_q) & (df['price'] <= high_q)].copy()

# Target
df['price_log'] = np.log1p(df['price'])

# Estadísticas de barrio
barrio_stats = df.groupby('neighbourhood_cleansed')['price'].agg(['mean','median','std']).reset_index()
barrio_stats.columns = ['neighbourhood_cleansed','barrio_mean_price','barrio_median_price','barrio_std_price']
df = df.merge(barrio_stats, on='neighbourhood_cleansed', how='left')

# Agrupar barrios
neigh_counts = df['neighbourhood_cleansed'].value_counts()
top_neigh = neigh_counts.nlargest(TOP_NEIGH_COUNT).index.tolist()
df['neigh_grouped'] = df['neighbourhood_cleansed'].where(df['neighbourhood_cleansed'].isin(top_neigh), other='Other')

# Features derivadas
df['bath_per_bed'] = df['bathrooms'] / (df['bedrooms'] + 1e-3)
df['review_score_weighted'] = df['review_scores_rating'] * np.log1p(df['number_of_reviews'])
df['is_high_season'] = df['month'].isin([5,6,7,8,12]).astype(int)
df['is_weekend'] = df['day_of_week'].isin([4,5,6]).astype(int)
df['review_density'] = df['number_of_reviews'] / (df['availability_365'] + 1)
df['bedroom_efficiency'] = df['accommodates'] / (df['bedrooms'] + 1)
df['room_type_simple'] = df['room_type'].replace({
    'Entire home/apt': 'entire',
    'Private room': 'private',
    'Shared room': 'shared',
    'Hotel room': 'hotel'
})

# Log transforms
for col in ['number_of_reviews', 'availability_365', 'amenities_count']:
    df[col] = np.log1p(df[col])

# Features finales
features = [
    'bathrooms','bedrooms','accommodates','amenities_count',
    'has_pool','has_jacuzzi','has_aircon','has_wifi',
    'room_type_simple','neigh_grouped',
    'review_scores_rating','number_of_reviews','availability_365',
    'barrio_mean_price','barrio_median_price','barrio_std_price',
    'bath_per_bed','review_score_weighted','is_high_season',
    'is_weekend','review_density','bedroom_efficiency'
]

X = df[features].copy()
y = df['price_log']

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE
)

print(f"   Datos preparados: {X_train.shape[0]} train, {X_test.shape[0]} test")

# Liberar memoria
del df, y_train, y_test
gc.collect()

# =======================================
# 3. CARGAR MODELO (Compatible Pipeline/Directo)
# =======================================
print("\n[3/6] Cargando modelo Random Forest...")
model = joblib.load(MODEL_PATH)

# Detectar si es Pipeline o modelo directo
if isinstance(model, Pipeline):
    print("   Modelo es un Pipeline, extrayendo componentes...")
    X_train_transformed = model.named_steps['pre'].transform(X_train)
    X_test_transformed = model.named_steps['pre'].transform(X_test)
    rf_model = model.named_steps['model']
    
    # Obtener nombres de features transformadas
    preprocessor = model.named_steps['pre']
    num_cols = X.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = [c for c in X.columns if c not in num_cols]
    num_feature_names = num_cols.copy()
    cat_feature_names = []
    if cat_cols:
        encoder = preprocessor.named_transformers_['cat'].named_steps['onehot']
        cat_feature_names = encoder.get_feature_names_out(cat_cols).tolist()
    feature_names = num_feature_names + cat_feature_names
    
else:
    print("   Modelo es RandomForest directo (sin Pipeline)")
    rf_model = model
    
    # Aplicar preprocesado manual: OneHot para categóricas
    num_cols = X_train.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = [c for c in X_train.columns if c not in num_cols]
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', 'passthrough', num_cols),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), cat_cols)
        ]
    )
    
    X_train_transformed = preprocessor.fit_transform(X_train)
    X_test_transformed = preprocessor.transform(X_test)
    
    # Nombres de features
    num_feature_names = num_cols.copy()
    cat_feature_names = preprocessor.named_transformers_['cat'].get_feature_names_out(cat_cols).tolist()
    feature_names = num_feature_names + cat_feature_names

print(f"   Modelo cargado: {rf_model.n_estimators} árboles")
print(f"   Features transformadas: {len(feature_names)}")

# =======================================
# 4. CREAR SHAP EXPLAINER
# =======================================
print("\n[4/6] Creando SHAP TreeExplainer...")

# Liberar memoria
del X_train_transformed, X_train, X_test
gc.collect()

print("   Creando explainer (esto puede tardar con muchos árboles)...")
explainer = shap.TreeExplainer(rf_model)
print("   Explainer creado.")

# =======================================
# 5. CALCULAR SHAP VALUES
# =======================================
print(f"\n[5/6] Calculando SHAP values para {SHAP_SAMPLE_SIZE} muestras del test set...")
X_test_sample = shap.sample(X_test_transformed, min(SHAP_SAMPLE_SIZE, len(X_test_transformed)), random_state=RANDOM_STATE)
shap_values = explainer.shap_values(X_test_sample)

print(f"   SHAP values calculados: shape {shap_values.shape}")

# =======================================
# 6. VISUALIZACIONES - GLOBAL
# =======================================
print("\n[6/6] Generando visualizaciones...")
print("\n--- EXPLICABILIDAD GLOBAL ---")

shap.initjs()

# 1. Summary Plot (beeswarm)
print("  Generando summary plot (beeswarm)...")
plt.figure(figsize=(10, 6))
shap.summary_plot(shap_values, X_test_sample, feature_names=feature_names, show=False, max_display=20)
plt.title("SHAP Summary Plot - Global Feature Importance", fontsize=12, pad=15)
plt.tight_layout()
plt.savefig('/content/shap_summary_beeswarm_rental.png', dpi=150, bbox_inches='tight')
plt.show()
plt.close()
print("    ✓ Guardado: /content/shap_summary_beeswarm_rental.png")

# 2. Bar Plot - Importancia promedio absoluta
print("  Generando bar plot (mean absolute SHAP)...")
plt.figure(figsize=(8, 6))
shap.summary_plot(shap_values, X_test_sample, feature_names=feature_names, plot_type="bar", show=False, max_display=15)
plt.title("SHAP Bar Plot - Mean Absolute Impact", fontsize=12, pad=15)
plt.tight_layout()
plt.savefig('/content/shap_bar_importance_rental.png', dpi=150, bbox_inches='tight')
plt.show()
plt.close()
print("    ✓ Guardado: /content/shap_bar_importance_rental.png")

plt.close('all')
gc.collect()

# =======================================
# 7. VISUALIZACIONES - LOCAL
# =======================================
print("\n--- EXPLICABILIDAD LOCAL ---")

instance_idx = 0
print(f"\n  Instancia {instance_idx}:")
print(f"    Generando waterfall plot...")

shap.plots.waterfall(
    shap.Explanation(
        values=shap_values[instance_idx],
        base_values=explainer.expected_value,
        data=X_test_sample[instance_idx],
        feature_names=feature_names
    ),
    max_display=15,
    show=False
)
plt.title(f"SHAP Waterfall - Instancia {instance_idx}", fontsize=10)
plt.tight_layout()
plt.savefig(f'/content/shap_waterfall_inst_{instance_idx}_rental.png', dpi=150, bbox_inches='tight')
plt.show()
plt.close()
print(f"    ✓ Guardado: /content/shap_waterfall_inst_{instance_idx}_rental.png")

plt.close('all')
gc.collect()

# =======================================
# 8. ANÁLISIS DE DEPENDENCIA
# =======================================
print("\n--- ANÁLISIS DE DEPENDENCIA (TOP FEATURE) ---")

mean_abs_shap = np.abs(shap_values).mean(axis=0)
top_feat_idx = np.argsort(mean_abs_shap)[-1]
feat_name = feature_names[top_feat_idx]

print(f"\n  Feature más importante: {feat_name}")
print(f"    Generando dependence plot...")

plt.figure(figsize=(8, 5))
shap.dependence_plot(
    top_feat_idx,
    shap_values,
    X_test_sample,
    feature_names=feature_names,
    show=False
)
plt.title(f"SHAP Dependence Plot - {feat_name}", fontsize=10)
plt.tight_layout()
plt.savefig(f'/content/shap_dependence_1_{feat_name.replace("/", "_")}_rental.png', dpi=150, bbox_inches='tight')
plt.show()
plt.close()
print(f"    ✓ Guardado: /content/shap_dependence_1_{feat_name}_rental.png")

plt.close('all')
gc.collect()

# =======================================
# 9. RESUMEN Y EXPORTAR
# =======================================
print("\n" + "=" * 60)
print("RESUMEN - TOP 10 FEATURES MÁS IMPORTANTES")
print("=" * 60)

mean_abs_shap_sorted = sorted(
    zip(feature_names, mean_abs_shap),
    key=lambda x: x[1],
    reverse=True
)

for i, (name, importance) in enumerate(mean_abs_shap_sorted[:10], 1):
    print(f"{i:2d}. {name:40s} | Importancia: {importance:.4f}")

# Guardar SHAP values a CSV
print("\n[EXTRA] Guardando SHAP values a CSV...")
shap_df = pd.DataFrame(shap_values, columns=feature_names)
shap_df.to_csv('/content/shap_values_rental.csv', index=False)
print("    ✓ Guardado: /content/shap_values_rental.csv")

# Exportar importancia global como JSON para la UI
shap_global = {
    'features': feature_names,
    'mean_abs_shap': mean_abs_shap.tolist()
}
with open('/content/shap_global_importance_rental.json', 'w') as f:
    json.dump(shap_global, f, indent=2)
print("    ✓ Guardado: /content/shap_global_importance_rental.json")

print("\n" + "=" * 60)
print("✓ ANÁLISIS SHAP COMPLETADO")
print("=" * 60)
print("\nArchivos generados:")
print("  📊 shap_summary_beeswarm_rental.png")
print("  📊 shap_bar_importance_rental.png")
print("  📊 shap_waterfall_inst_0_rental.png")
print("  📊 shap_dependence_1_*_rental.png")
print("  📄 shap_values_rental.csv")
print("  📄 shap_global_importance_rental.json (para UI)")
print("\nTodos los archivos están en /content/")
print("\n" + "=" * 60)
