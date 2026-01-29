#!/usr/bin/env python3
"""
Script de predicción de precio de Airbnb
Versión final: carga eficiente del modelo y preprocesador
"""

import sys
import joblib
import numpy as np
import pandas as pd
import os
import warnings
import json

warnings.filterwarnings('ignore')

# Definir la raíz del proyecto (subiendo un nivel desde python_scripts)
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# Variables globales para cache (se cargan una sola vez)
_MODELO_CACHE = None
_PREPROCESSOR_CACHE = None
_TARGET_ENCODER_CACHE = None
_CACHE_LOADED = False

def _read_active_model_path(base_dir='model'):
    """Lee model/active_model.json para obtener la ruta activa del modelo.
    Devuelve ruta absoluta si es válida, o None si no está configurada o no existe.
    """
    try:
        base = os.path.join(PROJECT_ROOT, base_dir)
        cfg_path = os.path.join(base, 'active_model.json')
        if not os.path.exists(cfg_path):
            return None
        with open(cfg_path, 'r', encoding='utf-8') as f:
            cfg = json.load(f)
        raw_path = (cfg.get('path') or '').strip()
        if not raw_path:
            return None
        # Si es relativo, resolver respecto a la raíz del proyecto
        model_path = raw_path
        if not os.path.isabs(model_path):
            model_path = os.path.join(PROJECT_ROOT, model_path)
        if os.path.exists(model_path) and os.path.getsize(model_path) > 0:
            return model_path
        return None
    except Exception as e:
        print(f"[WARN] No se pudo leer active_model.json: {e}", file=sys.stderr)
        return None

def find_model_file(base_dir='model'):
    """Busca el archivo del modelo. Prioriza active_model.json y hace fallback a nombres legacy."""
    # 0) Permitir override vía variable de entorno (para seleccionar modelo desde la UI)
    try:
        env_override = os.environ.get('MODEL_OVERRIDE_PATH')
        if env_override:
            env_path = env_override
            if not os.path.isabs(env_path):
                env_path = os.path.join(PROJECT_ROOT, env_path)
            if os.path.exists(env_path) and os.path.getsize(env_path) > 0:
                print(f"[DEBUG] MODEL_OVERRIDE_PATH activo -> {env_path}", file=sys.stderr)
                return env_path
            else:
                print(f"[WARN] MODEL_OVERRIDE_PATH no encontrado o vacío: {env_path}", file=sys.stderr)
    except Exception as e:
        print(f"[WARN] Error leyendo MODEL_OVERRIDE_PATH: {e}", file=sys.stderr)

    # 1) Intentar config activa
    cfg_path = _read_active_model_path(base_dir)
    if cfg_path:
        print(f"[DEBUG] active_model.json -> {cfg_path}", file=sys.stderr)
        return cfg_path

    # 2) Fallback a búsqueda por nombres conocidos en model/
    model_dir = os.path.join(PROJECT_ROOT, base_dir)
    possible_names = [
        'model_randomforest.pkl',
        'modelo_random_forest.pkl',
        'model_random_forest.pkl',
        'modelo_rf.pkl',
        'model_rf.pkl',
    ]
    for name in possible_names:
        path = os.path.join(model_dir, name)
        if os.path.exists(path) and os.path.getsize(path) > 1000000:
            return path
    return None

def find_preprocessor_file(base_dir='model'):
    """Busca el archivo del preprocesador"""
    model_dir = os.path.join(PROJECT_ROOT, base_dir)
    path = os.path.join(model_dir, 'preprocessor.pkl')
    
    if os.path.exists(path):
        return path
    return None

def find_target_encoder_file():
    """Busca el archivo del target encoder para categóricas"""
    # Buscar en modelos_predictivos/alquiler
    paths = [
        os.path.join(PROJECT_ROOT, 'modelos_predictivos', 'alquiler', 'target_encoder_airbnb.pkl'),
        os.path.join(PROJECT_ROOT, 'model', 'target_encoder.pkl')
    ]
    for p in paths:
        if os.path.exists(p):
            return p
    return None

def load_model(model_path):
    """Carga el modelo desde archivo joblib"""
    global _MODELO_CACHE, _CACHE_LOADED
    
    if _CACHE_LOADED and _MODELO_CACHE is not None:
        print(f"[DEBUG] Usando modelo en cache", file=sys.stderr)
        return _MODELO_CACHE
    
    try:
        print(f"[DEBUG] Cargando modelo desde: {model_path}", file=sys.stderr)
        modelo = joblib.load(model_path)
        print(f"[DEBUG] Modelo cargado exitosamente", file=sys.stderr)
        
        _MODELO_CACHE = modelo
        
        if hasattr(modelo, 'n_features_in_'):
            print(f"[DEBUG] Modelo espera {modelo.n_features_in_} features", file=sys.stderr)
        
        return modelo
    except Exception as e:
        print(f"Error al cargar el modelo: {str(e)}", file=sys.stderr)
        sys.exit(1)

def load_preprocessor(preprocessor_path):
    """Carga el preprocesador desde archivo joblib"""
    global _PREPROCESSOR_CACHE, _CACHE_LOADED
    
    if _CACHE_LOADED and _PREPROCESSOR_CACHE is not None:
        print(f"[DEBUG] Usando preprocesador en cache", file=sys.stderr)
        return _PREPROCESSOR_CACHE
    
    try:
        print(f"[DEBUG] Cargando preprocesador desde: {preprocessor_path}", file=sys.stderr)
        preprocessor = joblib.load(preprocessor_path)
        print(f"[DEBUG] Preprocesador cargado exitosamente", file=sys.stderr)
        
        _PREPROCESSOR_CACHE = preprocessor
        
        return preprocessor
    except Exception as e:
        print(f"Error al cargar el preprocesador: {str(e)}", file=sys.stderr)
        sys.exit(1)

def main():
    """Función principal de predicción"""
    global _CACHE_LOADED
    
    try:
        # Verificar número de argumentos (ahora aceptamos argumentos avanzados opcionales)
        # Esperamos 19 parámetros posicionales además del nombre del script
        if len(sys.argv) < 20:
            print(f"Error: Se esperaban 19 parámetros (incluyendo avanzados), se recibieron {len(sys.argv) - 1}", file=sys.stderr)
            sys.exit(1)
        
        # Parsear argumentos
        try:
            origen = sys.argv[1]
            barrio = sys.argv[2]
            bathrooms = float(sys.argv[3])
            bedrooms = float(sys.argv[4])
            accommodates = float(sys.argv[5])
            room_type = sys.argv[6].lower()
            
            # Parámetros opcionales (avanzados incluidos)
            amenities_count = None
            try:
                amenities_count = float(sys.argv[7]) if sys.argv[7] != '' else None
            except:
                amenities_count = None

            try:
                has_pool = int(sys.argv[8]) if sys.argv[8] != '' else 0
            except:
                has_pool = 0
            try:
                has_jacuzzi = int(sys.argv[9]) if sys.argv[9] != '' else 0
            except:
                has_jacuzzi = 0
            try:
                has_aircon = int(sys.argv[10]) if sys.argv[10] != '' else 0
            except:
                has_aircon = 0
            try:
                has_wifi = int(sys.argv[11]) if sys.argv[11] != '' else 0
            except:
                has_wifi = 0

            try:
                review_scores_rating = float(sys.argv[12]) if sys.argv[12] != '' else 4.8
            except:
                review_scores_rating = 4.8
            try:
                number_of_reviews = float(sys.argv[13]) if sys.argv[13] != '' else 10
            except:
                number_of_reviews = 10
            try:
                availability_365 = float(sys.argv[14]) if sys.argv[14] != '' else 200
            except:
                availability_365 = 200

            # Campos avanzados
            stay_date_raw = sys.argv[15] if len(sys.argv) > 15 else ''
            barrio_mean_price_arg = sys.argv[16] if len(sys.argv) > 16 else ''
            barrio_median_price_arg = sys.argv[17] if len(sys.argv) > 17 else ''
            barrio_std_price_arg = sys.argv[18] if len(sys.argv) > 18 else ''
            amenities_text = sys.argv[19] if len(sys.argv) > 19 else ''
        
        except ValueError as e:
            print(f"Error: No se pudieron parsear los argumentos - {str(e)}", file=sys.stderr)
            sys.exit(1)

        # Buscar archivos necesarios
        model_path = find_model_file()
        if not model_path:
            print("Error: No se encontró el archivo de modelo", file=sys.stderr)
            sys.exit(1)

        print(f"[DEBUG] Cargando modelo (pipeline completo)...", file=sys.stderr)
        # Cargar solo el pipeline completo que ya contiene el preprocesador
        modelo = load_model(model_path)
        
        # Intentar cargar target encoder para categóricas
        global _TARGET_ENCODER_CACHE
        encoder_path = find_target_encoder_file()
        if encoder_path and _TARGET_ENCODER_CACHE is None:
            try:
                print(f"[DEBUG] Cargando target encoder desde: {encoder_path}", file=sys.stderr)
                _TARGET_ENCODER_CACHE = joblib.load(encoder_path)
                print(f"[DEBUG] Target encoder cargado", file=sys.stderr)
            except Exception as e:
                print(f"[WARN] No se pudo cargar target encoder: {e}", file=sys.stderr)
                _TARGET_ENCODER_CACHE = None
        
        _CACHE_LOADED = True

        # Cargar opciones del modelo (incluye barrios por ciudad)
        options_path = os.path.join(os.path.dirname(__file__), 'model', 'model_options.json')
        barrios_por_ciudad = {}
        try:
            with open(options_path, 'r', encoding='utf-8') as f:
                options_data = json.load(f)
                barrios_por_ciudad = options_data.get('barrios_por_ciudad', {})
        except Exception as e:
            print(f"[WARN] No se pudo cargar model_options.json: {str(e)}", file=sys.stderr)
        
        # Codificación de room_type (valores simples usados en entrenamiento)
        room_type_map = {
            'entire': 0,
            'private': 1,
            'shared': 2,
            'hotel': 3
        }
        room_type_encoded = room_type_map.get(room_type, 0)

        print(f"[DEBUG] Preparando features (DataFrame con las columnas que espera el pipeline)", file=sys.stderr)

        # Calcular features derivadas básicas
        bath_per_bed = bathrooms / (bedrooms + 0.01)
        review_score_weighted = review_scores_rating * np.log1p(number_of_reviews)
        review_density = number_of_reviews / (availability_365 + 1) if availability_365 > 0 else 0
        bedroom_efficiency = accommodates / (bedrooms + 1) if bedrooms >= 0 else 0
        
        # Features temporales
        is_high_season = 0
        is_weekend = 0
        is_summer = 0
        is_winter = 0
        month = 6
        day_of_week = 0
        quarter = 2

        # Intentar cargar estadísticas por barrio (mean, median, std, count, avg_rating, avg_reviews) desde model/barrio_stats.json
        barrio_mean_price = 0
        barrio_median_price = 0
        barrio_std_price = 0
        barrio_count = 0
        barrio_avg_rating = 4.8
        barrio_avg_reviews = 50
        try:
            stats_path = os.path.join(os.path.dirname(__file__), 'model', 'barrio_stats.json')
            if os.path.exists(stats_path):
                with open(stats_path, 'r', encoding='utf-8') as f:
                    barrio_stats = json.load(f)
                # Buscar por nombre exacto o en minúsculas
                stats = barrio_stats.get(barrio) or barrio_stats.get(barrio.lower())
                if isinstance(stats, dict):
                    barrio_mean_price = stats.get('mean', 0)
                    barrio_median_price = stats.get('median', 0)
                    barrio_std_price = stats.get('std', 0)
                    barrio_count = stats.get('count', 0)
                    barrio_avg_rating = stats.get('avg_rating', 4.8)
                    barrio_avg_reviews = stats.get('avg_reviews', 50)
        except Exception:
            # Fallback: mantener valores por defecto si no hay datos disponibles
            pass

        # Si el usuario proporcionó valores avanzados, sobrescribir las estadísticas
        try:
            if barrio_mean_price_arg:
                barrio_mean_price = float(barrio_mean_price_arg)
        except:
            pass
        try:
            if barrio_median_price_arg:
                barrio_median_price = float(barrio_median_price_arg)
        except:
            pass
        try:
            if barrio_std_price_arg:
                barrio_std_price = float(barrio_std_price_arg)
        except:
            pass

        # Procesar stay_date para determinar temporada y fin de semana si fue provisto
        if stay_date_raw:
            try:
                from datetime import datetime
                dt = datetime.fromisoformat(stay_date_raw)
                month = dt.month
                day_of_week = dt.weekday()  # 0=Mon .. 6=Sun
                quarter = (month - 1) // 3 + 1
                # Temporadas
                is_high_season = 1 if month in [6, 7, 8, 12] else 0
                is_summer = 1 if month in [6, 7, 8] else 0
                is_winter = 1 if month in [12, 1, 2] else 0
                # Fin de semana: viernes(4), sábado(5), domingo(6)
                is_weekend = 1 if day_of_week >= 4 else 0
            except Exception:
                # Mantener valores por defecto si no se puede parsear
                pass

        # Detectar amenities adicionales (kitchen, parking, tv, washer)
        has_kitchen = 0
        has_parking = 0
        has_tv = 0
        has_washer = 0

        # Si se proporcionó amenities_text, inferir flags y count
        try:
            if amenities_text and isinstance(amenities_text, str) and amenities_text.strip() != '':
                text = amenities_text.lower()
                # Detección simple basada en palabras clave
                if 'pool' in text or 'piscina' in text:
                    has_pool = 1
                if 'jacuzzi' in text or 'hot tub' in text:
                    has_jacuzzi = 1
                if 'aircon' in text or 'air conditioning' in text or 'a/c' in text or 'aire' in text:
                    has_aircon = 1
                if 'wifi' in text or 'wi-fi' in text or 'wlan' in text:
                    has_wifi = 1
                if 'cocina' in text or 'kitchen' in text:
                    has_kitchen = 1
                if 'parking' in text or 'aparcamiento' in text or 'garaje' in text:
                    has_parking = 1
                if 'tv' in text or 'television' in text or 'smart tv' in text:
                    has_tv = 1
                if 'lavadora' in text or 'washer' in text or 'washing machine' in text:
                    has_washer = 1

                # Estimar amenities_count si no fue provisto
                if amenities_count is None:
                    # contar comas o espacios como separador
                    parts = [p.strip() for p in text.replace(';', ',').split(',') if p.strip()]
                    amenities_count = float(len(parts)) if parts else 0.0
        except Exception:
            pass

        # Si amenities_count sigue siendo None, asignar valor por defecto
        if amenities_count is None:
            amenities_count = 5.0

        # Calcular scores de amenities
        luxury_score = has_pool + has_jacuzzi + has_aircon
        basic_score = has_wifi + has_kitchen + has_tv + has_washer
        total_amenities_score = luxury_score * 2 + basic_score

        # Ratios con respecto al barrio
        price_vs_barrio_mean = 1.0  # placeholder, se ajustará después de predicción
        price_vs_barrio_median = 1.0
        rating_vs_barrio_avg = review_scores_rating / (barrio_avg_rating + 0.01)

        # Categorías
        if accommodates <= 2:
            capacity_category = 'small'
        elif accommodates <= 4:
            capacity_category = 'medium'
        elif accommodates <= 6:
            capacity_category = 'large'
        else:
            capacity_category = 'xlarge'

        if bedrooms <= 1:
            bedroom_category = 'studio' if bedrooms == 0 else '1bed'
        elif bedrooms == 2:
            bedroom_category = '2bed'
        else:
            bedroom_category = '3bed+'

        # Popularidad del barrio (normalizado)
        barrio_popularity = barrio_count / 1000.0 if barrio_count > 0 else 0.0

        # Construir un dict con las 43 columnas exactamente como en entrenamiento
        # Determinar si el barrio está entre los principales de su ciudad
        barrios_validos = barrios_por_ciudad.get(origen, [])
        neigh_grouped = barrio if barrio in barrios_validos else 'Other'
        print(f"[DEBUG] Barrio '{barrio}' en ciudad '{origen}' → clasificado como: {neigh_grouped}", file=sys.stderr)
        
        # Nota: usar 'room_type_encoded' (valor numérico) y 'neigh_grouped' validado
        features = {
            'bathrooms': bathrooms,
            'bedrooms': bedrooms,
            'accommodates': accommodates,
            'amenities_count': amenities_count,
            'has_pool': has_pool,
            'has_jacuzzi': has_jacuzzi,
            'has_aircon': has_aircon,
            'has_wifi': has_wifi,
            'has_kitchen': has_kitchen,
            'has_parking': has_parking,
            'has_tv': has_tv,
            'has_washer': has_washer,
            'room_type_simple': room_type,  # Usar string directamente para target encoding
            'neigh_grouped': neigh_grouped,
            'capacity_category': capacity_category,
            'bedroom_category': bedroom_category,
            'review_scores_rating': review_scores_rating,
            'number_of_reviews': number_of_reviews,
            'availability_365': availability_365,
            'barrio_mean_price': barrio_mean_price,
            'barrio_median_price': barrio_median_price,
            'barrio_std_price': barrio_std_price,
            'barrio_count': barrio_count,
            'barrio_avg_rating': barrio_avg_rating,
            'barrio_avg_reviews': barrio_avg_reviews,
            'barrio_popularity': barrio_popularity,
            'bath_per_bed': bath_per_bed,
            'review_score_weighted': review_score_weighted,
            'review_density': review_density,
            'bedroom_efficiency': bedroom_efficiency,
            'is_high_season': is_high_season,
            'is_weekend': is_weekend,
            'is_summer': is_summer,
            'is_winter': is_winter,
            'luxury_score': luxury_score,
            'basic_score': basic_score,
            'total_amenities_score': total_amenities_score,
            'price_vs_barrio_mean': price_vs_barrio_mean,
            'price_vs_barrio_median': price_vs_barrio_median,
            'rating_vs_barrio_avg': rating_vs_barrio_avg,
            'month': month,
            'day_of_week': day_of_week,
            'quarter': quarter
        }

        df_entrada = pd.DataFrame([features])
        # Asegurar tipos categóricos para target encoding
        df_entrada['room_type_simple'] = df_entrada['room_type_simple'].astype('object')
        df_entrada['neigh_grouped'] = df_entrada['neigh_grouped'].astype('object')
        df_entrada['capacity_category'] = df_entrada['capacity_category'].astype('object')
        df_entrada['bedroom_category'] = df_entrada['bedroom_category'].astype('object')
        print(f"[DEBUG] DataFrame creado: {df_entrada.shape}; columnas: {list(df_entrada.columns)}", file=sys.stderr)
        
        # Aplicar target encoding si está disponible
        if _TARGET_ENCODER_CACHE is not None:
            try:
                print(f"[DEBUG] Aplicando target encoding a categóricas", file=sys.stderr)
                cat_cols = ['room_type_simple', 'neigh_grouped', 'capacity_category', 'bedroom_category']
                df_entrada = _TARGET_ENCODER_CACHE.transform(df_entrada)
                print(f"[DEBUG] Target encoding aplicado", file=sys.stderr)
            except Exception as e:
                print(f"[WARN] Error aplicando target encoder: {e}. Usando mapeo por defecto.", file=sys.stderr)
                # Fallback: mapeo simple
                room_map = {'entire': 5.2, 'private': 4.1, 'shared': 3.5, 'hotel': 4.8}
                capacity_map = {'small': 3.8, 'medium': 4.5, 'large': 5.0, 'xlarge': 5.5}
                bedroom_map = {'studio': 3.9, '1bed': 4.3, '2bed': 4.7, '3bed+': 5.1}
                df_entrada['room_type_simple'] = df_entrada['room_type_simple'].map(room_map).fillna(4.5)
                df_entrada['capacity_category'] = df_entrada['capacity_category'].map(capacity_map).fillna(4.5)
                df_entrada['bedroom_category'] = df_entrada['bedroom_category'].map(bedroom_map).fillna(4.5)
                # neigh_grouped: usar media del barrio como proxy
                df_entrada['neigh_grouped'] = barrio_mean_price / 100.0  # Normalizar
        else:
            print(f"[WARN] Target encoder no disponible. Usando mapeo por defecto.", file=sys.stderr)
            # Fallback: mapeo simple basado en promedios de entrenamiento
            room_map = {'entire': 5.2, 'private': 4.1, 'shared': 3.5, 'hotel': 4.8}
            capacity_map = {'small': 3.8, 'medium': 4.5, 'large': 5.0, 'xlarge': 5.5}
            bedroom_map = {'studio': 3.9, '1bed': 4.3, '2bed': 4.7, '3bed+': 5.1}
            df_entrada['room_type_simple'] = df_entrada['room_type_simple'].map(room_map).fillna(4.5)
            df_entrada['capacity_category'] = df_entrada['capacity_category'].map(capacity_map).fillna(4.5)
            df_entrada['bedroom_category'] = df_entrada['bedroom_category'].map(bedroom_map).fillna(4.5)
            # neigh_grouped: usar media del barrio como proxy
            df_entrada['neigh_grouped'] = barrio_mean_price / 100.0 if barrio_mean_price > 0 else 1.5

        # Hacer predicción directamente con el pipeline (contiene preprocesador)
        try:
            print(f"[DEBUG] Haciendo predicción usando el pipeline...", file=sys.stderr)
            prediccion = modelo.predict(df_entrada)
            print(f"[DEBUG] Predicción completada. Output shape: {np.shape(prediccion)}", file=sys.stderr)
        except Exception as e:
            print(f"Error en predicción: {str(e)}", file=sys.stderr)
            # Si hay mismatch de columnas, mostrar info útil
            if hasattr(modelo, 'named_steps'):
                try:
                    print(f"[DEBUG] Pipeline steps: {list(modelo.named_steps.keys())}", file=sys.stderr)
                except Exception:
                    pass
            sys.exit(1)
        
        # Procesar resultado
        precio_pred = prediccion[0]
        
        # Aplicar transformaciones inversas si es necesario
        try:
            precio_final = np.expm1(precio_pred) if precio_pred > 0 else abs(precio_pred)
        except:
            precio_final = abs(precio_pred)
        
        # Validaciones de precio realista
        if precio_final < 5 or precio_final > 100000:
            # Si el precio no es realista, intentar interpretación directa
            precio_final = max(10, abs(precio_pred))
        
        # Imprimir solo el resultado numérico con 2 decimales
        print(f"{precio_final:.2f}")
        sys.exit(0)

    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
