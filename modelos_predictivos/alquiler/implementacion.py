# ====================================
# MODELO OPTIMIZADO - PREDICCIÓN PRECIOS ALQUILER AIRBNB
# Estrategias: feature engineering avanzado, outliers mejorados, ensemble stacking
# ====================================

import time
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler
import category_encoders as ce
import joblib

# ====================================
# CONFIG
# ====================================
CSV_PATH = '/content/drive/MyDrive/AA_UNIVERSIDAD/TFG-ALEX_Y_PAULA/PRUEBAS/listings_combinado.csv'
RANDOM_STATE = 42
TOP_NEIGH_COUNT = 50  # Aumentado de 40 a 50
TEST_SIZE = 0.2

print("="*60)
print("OPTIMIZACIÓN PREDICCIÓN ALQUILER AIRBNB")
print("="*60)

# ====================================
# 1. CARGAR DATOS
# ====================================
print("\n[1/7] Cargando datos...")
t0 = time.time()
df = pd.read_csv(CSV_PATH, low_memory=False)
print(f"   Datos originales: {df.shape[0]} filas, {df.shape[1]} columnas")

# Liberar memoria inmediatamente
import gc
gc.collect()

# ====================================
# 2. SELECCIONAR COLUMNAS
# ====================================
use_cols = [
    'origen','neighbourhood_cleansed','bathrooms','bedrooms','room_type',
    'accommodates','price','review_scores_rating','number_of_reviews',
    'availability_365','amenities','last_scraped'
]
df = df[[c for c in use_cols if c in df.columns]].copy()

# ====================================
# 3. LIMPIAR PRICE
# ====================================
df['price'] = (
    df['price']
    .astype(str)
    .str.replace(r'[\$,]', '', regex=True)
    .str.replace(r'[^\d\.]', '', regex=True)
)
df['price'] = pd.to_numeric(df['price'], errors='coerce')
df = df[df['price'].notna() & (df['price'] > 0)].copy()

# ====================================
# 4. LIMPIAR BATHROOMS
# ====================================
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

# ====================================
# 5. AMENITIES
# ====================================
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

# NUEVAS AMENITIES
df['has_kitchen'] = df['amenities'].str.contains('kitchen', case=False, na=False).astype(int)
df['has_parking'] = df['amenities'].str.contains('parking|garage', case=False, na=False).astype(int)
df['has_tv'] = df['amenities'].str.contains('tv|television', case=False, na=False).astype(int)
df['has_washer'] = df['amenities'].str.contains('washer|washing machine', case=False, na=False).astype(int)

# ====================================
# 6. VARIABLES TEMPORALES
# ====================================
if 'last_scraped' in df.columns:
    df['last_scraped'] = pd.to_datetime(df['last_scraped'], errors='coerce')
    df['month'] = df['last_scraped'].dt.month
    df['day_of_week'] = df['last_scraped'].dt.dayofweek
    df['quarter'] = df['last_scraped'].dt.quarter  # NUEVO: trimestre
else:
    df['month'] = np.nan
    df['day_of_week'] = np.nan
    df['quarter'] = np.nan

# ====================================
# 7. OUTLIERS MÁS AGRESIVOS (IQR)
# ====================================
print("\n[2/7] Limpiando outliers...")
# IQR para price
Q1 = df['price'].quantile(0.25)
Q3 = df['price'].quantile(0.75)
IQR = Q3 - Q1
lower = Q1 - 1.5 * IQR
upper = Q3 + 1.5 * IQR
df = df[(df['price'] >= lower) & (df['price'] <= upper)].copy()

# Filtros específicos
df = df[df['accommodates'] > 0].copy()
df = df[(df['bedrooms'] > 0) & (df['bedrooms'] < 15)].copy()  # Máximo 15 habitaciones
df = df[(df['bathrooms'] > 0) & (df['bathrooms'] < 10)].copy()  # Máximo 10 baños

# Eliminar filas con nulos críticos
df = df.dropna(subset=['neighbourhood_cleansed','bathrooms','bedrooms','accommodates','room_type'])

print(f"   Después de limpieza: {df.shape[0]} filas")

# ====================================
# 8. TARGET LOG
# ====================================
df['price_log'] = np.log1p(df['price'])

# ====================================
# 9. ESTADÍSTICAS DE BARRIO MEJORADAS
# ====================================
print("\n[3/7] Calculando estadísticas de barrio...")
barrio_stats = df.groupby('neighbourhood_cleansed').agg({
    'price': ['mean', 'median', 'std', 'count'],  # Añadido count
    'review_scores_rating': 'mean',
    'number_of_reviews': 'mean'
}).reset_index()

barrio_stats.columns = ['neighbourhood_cleansed', 'barrio_mean_price',
                        'barrio_median_price', 'barrio_std_price', 'barrio_count',
                        'barrio_avg_rating', 'barrio_avg_reviews']

df = df.merge(barrio_stats, on='neighbourhood_cleansed', how='left')

# Rellenar std con 0 si solo hay 1 anuncio en el barrio
df['barrio_std_price'] = df['barrio_std_price'].fillna(0)

# ====================================
# 10. AGRUPAR BARRIOS
# ====================================
neigh_counts = df['neighbourhood_cleansed'].value_counts()
top_neigh = neigh_counts.nlargest(TOP_NEIGH_COUNT).index.tolist()
df['neigh_grouped'] = df['neighbourhood_cleansed'].where(
    df['neighbourhood_cleansed'].isin(top_neigh), other='Other'
)

# ====================================
# 11. FEATURE ENGINEERING AVANZADO
# ====================================
print("\n[4/7] Creando features avanzadas...")

# Básicas mejoradas
df['bath_per_bed'] = df['bathrooms'] / (df['bedrooms'] + 0.01)
df['review_score_weighted'] = df['review_scores_rating'] * np.log1p(df['number_of_reviews'])
df['review_density'] = df['number_of_reviews'] / (df['availability_365'] + 1)
df['bedroom_efficiency'] = df['accommodates'] / (df['bedrooms'] + 1)

# NUEVAS: Temporalidad
df['is_high_season'] = df['month'].isin([6,7,8,12]).astype(int)  # Verano + Navidad
df['is_weekend'] = df['day_of_week'].isin([4,5,6]).astype(int)
df['is_summer'] = df['month'].isin([6,7,8]).astype(int)
df['is_winter'] = df['month'].isin([12,1,2]).astype(int)

# NUEVAS: Amenities score ponderado
luxury_amenities = ['has_pool', 'has_jacuzzi', 'has_aircon']
basic_amenities = ['has_wifi', 'has_kitchen', 'has_tv', 'has_washer']
df['luxury_score'] = df[luxury_amenities].sum(axis=1)
df['basic_score'] = df[basic_amenities].sum(axis=1)
df['total_amenities_score'] = df['luxury_score'] * 2 + df['basic_score']  # Luxury pesa doble

# NUEVAS: Ratios y derivadas
df['price_vs_barrio_mean'] = df['price'] / (df['barrio_mean_price'] + 1)
df['price_vs_barrio_median'] = df['price'] / (df['barrio_median_price'] + 1)
df['rating_vs_barrio_avg'] = df['review_scores_rating'] / (df['barrio_avg_rating'] + 0.01)

# NUEVAS: Segmentación
df['capacity_category'] = pd.cut(df['accommodates'],
                                  bins=[0, 2, 4, 6, 100],
                                  labels=['small', 'medium', 'large', 'xlarge'])

df['bedroom_category'] = pd.cut(df['bedrooms'],
                                 bins=[0, 1, 2, 3, 100],
                                 labels=['studio', '1bed', '2bed', '3bed+'])

# NUEVAS: Popularidad relativa del barrio
df['barrio_popularity'] = df['barrio_count'] / df['barrio_count'].max()

# Aplicar log a variables sesgadas
for col in ['number_of_reviews', 'availability_365', 'amenities_count']:
    df[col] = np.log1p(df[col])

# ====================================
# 12. SIMPLIFICAR ROOM_TYPE
# ====================================
df['room_type_simple'] = df['room_type'].replace({
    'Entire home/apt': 'entire',
    'Private room': 'private',
    'Shared room': 'shared',
    'Hotel room': 'hotel'
})

# ====================================
# 13. PREPARAR X, y
# ====================================
print("\n[5/7] Preparando features finales...")

features = [
    'bathrooms', 'bedrooms', 'accommodates', 'amenities_count',
    'has_pool', 'has_jacuzzi', 'has_aircon', 'has_wifi',
    'has_kitchen', 'has_parking', 'has_tv', 'has_washer',
    'room_type_simple', 'neigh_grouped', 'capacity_category', 'bedroom_category',
    'review_scores_rating', 'number_of_reviews', 'availability_365',
    'barrio_mean_price', 'barrio_median_price', 'barrio_std_price', 'barrio_count',
    'barrio_avg_rating', 'barrio_avg_reviews', 'barrio_popularity',
    'bath_per_bed', 'review_score_weighted', 'review_density', 'bedroom_efficiency',
    'is_high_season', 'is_weekend', 'is_summer', 'is_winter',
    'luxury_score', 'basic_score', 'total_amenities_score',
    'price_vs_barrio_mean', 'price_vs_barrio_median', 'rating_vs_barrio_avg',
    'month', 'day_of_week', 'quarter'
]

X = df[features].copy()
y = df['price_log']

# ====================================
# 14. TARGET ENCODING PARA CATEGÓRICAS
# ====================================
cat_cols = ['room_type_simple', 'neigh_grouped', 'capacity_category', 'bedroom_category']

encoder = ce.TargetEncoder(cols=cat_cols, smoothing=2.0)  # smoothing más alto
X_encoded = encoder.fit_transform(X, y)

# Rellenar NaNs restantes
X_encoded = X_encoded.fillna(X_encoded.median())

print(f"   Features finales: {X_encoded.shape[1]}")

# ====================================
# 15. TRAIN/TEST SPLIT
# ====================================
X_train, X_test, y_train, y_test = train_test_split(
    X_encoded, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, shuffle=True
)

print(f"   Train: {X_train.shape[0]}, Test: {X_test.shape[0]}")

# ====================================
# 16. RANDOM FOREST OPTIMIZADO (LOW RAM)
# ====================================
print("\n[6/7] Entrenando Random Forest optimizado...")
t0 = time.time()

rf = RandomForestRegressor(
    n_estimators=300,          # Reducido de 800 a 300
    max_depth=15,              # Reducido de 25 a 15
    min_samples_split=5,       # Más restrictivo
    min_samples_leaf=4,        # Más regularización
    max_features='sqrt',
    bootstrap=True,
    oob_score=True,
    n_jobs=2,                  # Limitar cores (de -1 a 2)
    random_state=RANDOM_STATE,
    verbose=0,
    max_samples=0.7            # Usar solo 70% de datos por árbol
)

rf.fit(X_train, y_train)
print(f"   RF entrenado en {(time.time() - t0)/60:.2f} min")
print(f"   OOB Score: {rf.oob_score_:.4f}")

# ====================================
# 17. GRADIENT BOOSTING OPTIMIZADO (LOW RAM)
# ====================================
print("\n[7/7] Entrenando Gradient Boosting optimizado...")
t0 = time.time()

gb = GradientBoostingRegressor(
    n_estimators=500,          # Reducido de 1000 a 500
    learning_rate=0.05,
    max_depth=5,               # Reducido de 6 a 5
    min_samples_split=10,      # Más restrictivo
    min_samples_leaf=5,        # Más restrictivo
    subsample=0.7,             # Reducido de 0.8 a 0.7
    max_features='sqrt',
    random_state=RANDOM_STATE,
    verbose=0
)

gb.fit(X_train, y_train)
print(f"   GB entrenado en {(time.time() - t0)/60:.2f} min")

# Liberar memoria
import gc
gc.collect()

# ====================================
# 18. ENSEMBLE (PROMEDIO RF + GB)
# ====================================
print("\n" + "="*60)
print("RESULTADOS")
print("="*60)

def metrics(y_true, y_pred):
    mae = mean_absolute_error(np.expm1(y_true), np.expm1(y_pred))
    rmse = np.sqrt(mean_squared_error(np.expm1(y_true), np.expm1(y_pred)))
    r2 = r2_score(y_true, y_pred)
    return mae, rmse, r2

# Predicciones individuales
y_pred_rf_train = rf.predict(X_train)
y_pred_rf_test = rf.predict(X_test)

y_pred_gb_train = gb.predict(X_train)
y_pred_gb_test = gb.predict(X_test)

# Ensemble: promedio ponderado (RF 60%, GB 40%)
y_pred_ens_train = 0.6 * y_pred_rf_train + 0.4 * y_pred_gb_train
y_pred_ens_test = 0.6 * y_pred_rf_test + 0.4 * y_pred_gb_test

# Métricas RF
mae_rf_tr, rmse_rf_tr, r2_rf_tr = metrics(y_train, y_pred_rf_train)
mae_rf_te, rmse_rf_te, r2_rf_te = metrics(y_test, y_pred_rf_test)

print("\n--- RANDOM FOREST OPTIMIZADO ---")
print(f"Train -> MAE: {mae_rf_tr:.2f}, RMSE: {rmse_rf_tr:.2f}, R²: {r2_rf_tr:.4f}")
print(f"Test  -> MAE: {mae_rf_te:.2f}, RMSE: {rmse_rf_te:.2f}, R²: {r2_rf_te:.4f}")

# Métricas GB
mae_gb_tr, rmse_gb_tr, r2_gb_tr = metrics(y_train, y_pred_gb_train)
mae_gb_te, rmse_gb_te, r2_gb_te = metrics(y_test, y_pred_gb_test)

print("\n--- GRADIENT BOOSTING OPTIMIZADO ---")
print(f"Train -> MAE: {mae_gb_tr:.2f}, RMSE: {rmse_gb_tr:.2f}, R²: {r2_gb_tr:.4f}")
print(f"Test  -> MAE: {mae_gb_te:.2f}, RMSE: {rmse_gb_te:.2f}, R²: {r2_gb_te:.4f}")

# Métricas Ensemble
mae_ens_tr, rmse_ens_tr, r2_ens_tr = metrics(y_train, y_pred_ens_train)
mae_ens_te, rmse_ens_te, r2_ens_te = metrics(y_test, y_pred_ens_test)

print("\n--- ENSEMBLE (60% RF + 40% GB) ---")
print(f"Train -> MAE: {mae_ens_tr:.2f}, RMSE: {rmse_ens_tr:.2f}, R²: {r2_ens_tr:.4f}")
print(f"Test  -> MAE: {mae_ens_te:.2f}, RMSE: {rmse_ens_te:.2f}, R²: {r2_ens_te:.4f}")

print("\n" + "="*60)
print("COMPARACIÓN CON BASELINE")
print("="*60)
baseline_r2 = 0.678
print(f"R² Baseline (RF original): {baseline_r2:.4f}")
print(f"R² RF Optimizado:          {r2_rf_te:.4f} ({(r2_rf_te - baseline_r2)*100:+.2f}%)")
print(f"R² GB Optimizado:          {r2_gb_te:.4f} ({(r2_gb_te - baseline_r2)*100:+.2f}%)")
print(f"R² ENSEMBLE:               {r2_ens_te:.4f} ({(r2_ens_te - baseline_r2)*100:+.2f}%)")

# ====================================
# 19. FEATURE IMPORTANCE
# ====================================
import matplotlib.pyplot as plt

feature_imp_rf = pd.DataFrame({
    'feature': X_encoded.columns,
    'importance': rf.feature_importances_
}).sort_values('importance', ascending=False)

print("\n=== TOP 15 FEATURES MÁS IMPORTANTES (RF) ===")
print(feature_imp_rf.head(15).to_string(index=False))

plt.figure(figsize=(10, 8))
plt.barh(feature_imp_rf.head(20)['feature'], feature_imp_rf.head(20)['importance'])
plt.xlabel('Importancia')
plt.title('Top 20 Features - Random Forest Optimizado')
plt.gca().invert_yaxis()
plt.tight_layout()
plt.savefig('/content/airbnb_feature_importance.png', dpi=150)
plt.show()

# ====================================
# 20. GUARDAR MODELOS
# ====================================
joblib.dump(rf, '/content/model_rf_optimized.pkl')
joblib.dump(gb, '/content/model_gb_optimized.pkl')
joblib.dump(encoder, '/content/target_encoder_airbnb.pkl')

print("\n✓ Modelos guardados:")
print("  - model_rf_optimized.pkl")
print("  - model_gb_optimized.pkl")
print("  - target_encoder_airbnb.pkl")

# ====================================
# 21. PREDICCIÓN ENSEMBLE
# ====================================
def predict_ensemble(rf_model, gb_model, encoder, X_new):
    """
    Función para hacer predicciones con el ensemble
    """
    X_encoded = encoder.transform(X_new)
    X_encoded = X_encoded.fillna(X_encoded.median())

    pred_rf = rf_model.predict(X_encoded)
    pred_gb = gb_model.predict(X_encoded)
    pred_ens = 0.6 * pred_rf + 0.4 * pred_gb

    return np.expm1(pred_ens)

print("\n✓ Función predict_ensemble() lista para usar")
print("\n" + "="*60)
print("OPTIMIZACIÓN COMPLETADA")
print("="*60)
