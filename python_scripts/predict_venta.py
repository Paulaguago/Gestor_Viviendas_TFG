#!/usr/bin/env python3
"""
Script de predicción de precio de venta de viviendas (España).
Usa el modelo LightGBM entrenado sin fuga de información.
Recibe datos via variable de entorno INPUT_JSON.
"""

import sys
import os
import json
import joblib
import numpy as np
import pandas as pd
import warnings

warnings.filterwarnings('ignore')

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


# ── Datos de provincias (aproximados INE) ──────────────────────────
PROVINCE_STATS = {
    "Madrid":     {"population_prov": 6750000, "number_of_companies_prov": 590000, "companies_prov_vs_national_%": 16.4, "population_prov_vs_national_%": 14.2, "renta_media_prov": 14680},
    "Barcelona":  {"population_prov": 5620000, "number_of_companies_prov": 520000, "companies_prov_vs_national_%": 14.5, "population_prov_vs_national_%": 11.8, "renta_media_prov": 15000},
    "Valencia":   {"population_prov": 2565000, "number_of_companies_prov": 195000, "companies_prov_vs_national_%": 5.4,  "population_prov_vs_national_%": 5.4,  "renta_media_prov": 11430},
    "Sevilla":    {"population_prov": 1960000, "number_of_companies_prov": 140000, "companies_prov_vs_national_%": 3.9,  "population_prov_vs_national_%": 4.1,  "renta_media_prov": 10030},
    "Málaga":     {"population_prov": 1700000, "number_of_companies_prov": 150000, "companies_prov_vs_national_%": 4.2,  "population_prov_vs_national_%": 3.6,  "renta_media_prov": 10250},
    "Malaga":     {"population_prov": 1700000, "number_of_companies_prov": 150000, "companies_prov_vs_national_%": 4.2,  "population_prov_vs_national_%": 3.6,  "renta_media_prov": 10250},
    "Bilbao":     {"population_prov": 1150000, "number_of_companies_prov": 100000, "companies_prov_vs_national_%": 2.8,  "population_prov_vs_national_%": 2.4,  "renta_media_prov": 16100},
    "Vizcaya":    {"population_prov": 1150000, "number_of_companies_prov": 100000, "companies_prov_vs_national_%": 2.8,  "population_prov_vs_national_%": 2.4,  "renta_media_prov": 16100},
    "Zaragoza":   {"population_prov": 980000,  "number_of_companies_prov": 75000,  "companies_prov_vs_national_%": 2.1,  "population_prov_vs_national_%": 2.1,  "renta_media_prov": 13200},
    "Alicante":   {"population_prov": 1880000, "number_of_companies_prov": 145000, "companies_prov_vs_national_%": 4.0,  "population_prov_vs_national_%": 3.9,  "renta_media_prov": 10500},
    "Murcia":     {"population_prov": 1520000, "number_of_companies_prov": 98000,  "companies_prov_vs_national_%": 2.7,  "population_prov_vs_national_%": 3.2,  "renta_media_prov": 9800},
    "Palma":      {"population_prov": 920000,  "number_of_companies_prov": 95000,  "companies_prov_vs_national_%": 2.6,  "population_prov_vs_national_%": 1.9,  "renta_media_prov": 12500},
    "Mallorca":   {"population_prov": 920000,  "number_of_companies_prov": 95000,  "companies_prov_vs_national_%": 2.6,  "population_prov_vs_national_%": 1.9,  "renta_media_prov": 12500},
    "Las Palmas": {"population_prov": 1130000, "number_of_companies_prov": 72000,  "companies_prov_vs_national_%": 2.0,  "population_prov_vs_national_%": 2.4,  "renta_media_prov": 9600},
    "Tenerife":   {"population_prov": 1030000, "number_of_companies_prov": 68000,  "companies_prov_vs_national_%": 1.9,  "population_prov_vs_national_%": 2.2,  "renta_media_prov": 9500},
    "A Coruña":   {"population_prov": 1120000, "number_of_companies_prov": 78000,  "companies_prov_vs_national_%": 2.2,  "population_prov_vs_national_%": 2.4,  "renta_media_prov": 11800},
    "Granada":    {"population_prov": 920000,  "number_of_companies_prov": 58000,  "companies_prov_vs_national_%": 1.6,  "population_prov_vs_national_%": 1.9,  "renta_media_prov": 9200},
    "Valladolid": {"population_prov": 520000,  "number_of_companies_prov": 38000,  "companies_prov_vs_national_%": 1.1,  "population_prov_vs_national_%": 1.1,  "renta_media_prov": 12100},
    "San Sebastián": {"population_prov": 730000, "number_of_companies_prov": 68000, "companies_prov_vs_national_%": 1.9, "population_prov_vs_national_%": 1.5, "renta_media_prov": 17200},
    "Donostia":   {"population_prov": 730000,  "number_of_companies_prov": 68000,  "companies_prov_vs_national_%": 1.9,  "population_prov_vs_national_%": 1.5,  "renta_media_prov": 17200},
    "Pamplona":   {"population_prov": 660000,  "number_of_companies_prov": 48000,  "companies_prov_vs_national_%": 1.3,  "population_prov_vs_national_%": 1.4,  "renta_media_prov": 15600},
    "Vitoria":    {"population_prov": 340000,  "number_of_companies_prov": 28000,  "companies_prov_vs_national_%": 0.8,  "population_prov_vs_national_%": 0.7,  "renta_media_prov": 16500},
    "Salamanca":  {"population_prov": 330000,  "number_of_companies_prov": 25000,  "companies_prov_vs_national_%": 0.7,  "population_prov_vs_national_%": 0.7,  "renta_media_prov": 11200},
    "Cádiz":      {"population_prov": 1240000, "number_of_companies_prov": 68000,  "companies_prov_vs_national_%": 1.9,  "population_prov_vs_national_%": 2.6,  "renta_media_prov": 8800},
    "Córdoba":    {"population_prov": 780000,  "number_of_companies_prov": 48000,  "companies_prov_vs_national_%": 1.3,  "population_prov_vs_national_%": 1.6,  "renta_media_prov": 9100},
    "Santander":  {"population_prov": 580000,  "number_of_companies_prov": 42000,  "companies_prov_vs_national_%": 1.2,  "population_prov_vs_national_%": 1.2,  "renta_media_prov": 12400},
    "Oviedo":     {"population_prov": 1010000, "number_of_companies_prov": 68000,  "companies_prov_vs_national_%": 1.9,  "population_prov_vs_national_%": 2.1,  "renta_media_prov": 12800},
    "Gijón":      {"population_prov": 1010000, "number_of_companies_prov": 68000,  "companies_prov_vs_national_%": 1.9,  "population_prov_vs_national_%": 2.1,  "renta_media_prov": 12800},
    "Tarragona":  {"population_prov": 810000,  "number_of_companies_prov": 58000,  "companies_prov_vs_national_%": 1.6,  "population_prov_vs_national_%": 1.7,  "renta_media_prov": 12200},
    "Girona":     {"population_prov": 770000,  "number_of_companies_prov": 62000,  "companies_prov_vs_national_%": 1.7,  "population_prov_vs_national_%": 1.6,  "renta_media_prov": 13100},
    "Lleida":     {"population_prov": 440000,  "number_of_companies_prov": 30000,  "companies_prov_vs_national_%": 0.8,  "population_prov_vs_national_%": 0.9,  "renta_media_prov": 12000},
    "Toledo":     {"population_prov": 700000,  "number_of_companies_prov": 42000,  "companies_prov_vs_national_%": 1.2,  "population_prov_vs_national_%": 1.5,  "renta_media_prov": 10200},
    "Castellón":  {"population_prov": 580000,  "number_of_companies_prov": 42000,  "companies_prov_vs_national_%": 1.2,  "population_prov_vs_national_%": 1.2,  "renta_media_prov": 11100},
    "Pontevedra": {"population_prov": 940000,  "number_of_companies_prov": 62000,  "companies_prov_vs_national_%": 1.7,  "population_prov_vs_national_%": 2.0,  "renta_media_prov": 11000},
    "Vigo":       {"population_prov": 940000,  "number_of_companies_prov": 62000,  "companies_prov_vs_national_%": 1.7,  "population_prov_vs_national_%": 2.0,  "renta_media_prov": 11000},
}

# Media nacional como fallback
NATIONAL_AVG = {
    "population_prov": 1000000,
    "number_of_companies_prov": 72000,
    "companies_prov_vs_national_%": 2.0,
    "population_prov_vs_national_%": 2.1,
    "renta_media_prov": 11800
}

# Frecuencias aproximadas para las features _freq (basadas en distribución típica)
DEFAULT_FREQ = {
    "loc_city_freq": 0.05,
    "loc_zone_freq": 0.01,
    "loc_district_freq": 0.005,
    "house_type_freq": 0.15
}


def get_province_stats(city):
    """Busca estadísticas provinciales por nombre de ciudad."""
    # Buscar exacto
    if city in PROVINCE_STATS:
        return PROVINCE_STATS[city]
    # Buscar case-insensitive
    for k, v in PROVINCE_STATS.items():
        if k.lower() == city.lower():
            return v
    # Buscar parcial
    city_low = city.lower()
    for k, v in PROVINCE_STATS.items():
        if city_low in k.lower() or k.lower() in city_low:
            return v
    return NATIONAL_AVG


def main():
    try:
        # Leer input JSON (via env o stdin)
        input_json = os.environ.get('INPUT_JSON')
        if not input_json:
            input_json = sys.stdin.read()
        if not input_json:
            print("Error: No se recibieron datos de entrada", file=sys.stderr)
            sys.exit(1)

        data = json.loads(input_json)

        # ── Seleccionar modelo según MODELO_TYPE ─────────────────────
        modelo_type = os.environ.get('MODELO_TYPE', 'lightgbm').lower()

        # Intentar EBM si se solicita, caer a LightGBM si no hay .pkl
        ebm_path = os.path.join(PROJECT_ROOT, 'modelos_predictivos', 'venta', 'EBM', 'ebm_regressor_optimized.pkl')
        use_ebm = modelo_type == 'ebm' and os.path.exists(ebm_path)

        if use_ebm:
            model_dir    = os.path.join(PROJECT_ROOT, 'modelos_predictivos', 'venta', 'EBM')
            model_path   = ebm_path
            encoder_path = os.path.join(model_dir, 'ebm_target_encoder.pkl')
            model_label  = 'EBM (Explainable Boosting Machine)'
        else:
            model_dir    = os.path.join(PROJECT_ROOT, 'modelos_predictivos', 'venta', 'LIGHTGBM')
            model_path   = os.path.join(model_dir, 'model_lightgbm_no_leakage.pkl')
            encoder_path = os.path.join(model_dir, 'target_encoder_no_leakage.pkl')
            model_label  = 'LightGBM'

        if not os.path.exists(model_path):
            print(f"Error: No se encontró el modelo en {model_path}", file=sys.stderr)
            sys.exit(1)

        print(f"[DEBUG] Cargando modelo ({model_label}) desde: {model_path}", file=sys.stderr)
        model = joblib.load(model_path)
        print(f"[DEBUG] Modelo cargado", file=sys.stderr)

        encoder = None
        if os.path.exists(encoder_path):
            print(f"[DEBUG] Cargando encoder desde: {encoder_path}", file=sys.stderr)
            encoder = joblib.load(encoder_path)
            print(f"[DEBUG] Encoder cargado", file=sys.stderr)

        # ── Parsear datos de entrada ─────────────────────────────────
        loc_city = data.get('loc_city', '')
        loc_zone = data.get('loc_zone', '')
        loc_district = data.get('loc_district', '')
        loc_neigh = data.get('loc_neigh', '')
        house_type = data.get('house_type', 'flat')
        m2_useful = float(data.get('m2_useful', 80))
        m2_real = float(data.get('m2_real', 0)) or m2_useful
        room_num = float(data.get('room_num', 3))
        bath_num = float(data.get('bath_num', 1))
        floor_val = float(data.get('floor', 0))
        ground_size = float(data.get('ground_size', 0))
        construct_date = float(data.get('construct_date', 2000))
        condition = data.get('condition', 'good')
        energetic_certif = data.get('energetic_certif', 'E')
        heating = data.get('heating', 'individual')
        kitchen = data.get('kitchen', 'equipped kitchen')
        orientation = data.get('orientation', 'south')

        # Amenities (0 o 1)
        garage = int(data.get('garage', 0))
        terrace = int(data.get('terrace', 0))
        garden = int(data.get('garden', 0))
        swimming_pool = int(data.get('swimming_pool', 0))
        lift = int(data.get('lift', 0))
        balcony = int(data.get('balcony', 0))

        # Binarias
        air_conditioner = int(data.get('air_conditioner', 0))
        built_in_wardrobe = int(data.get('built_in_wardrobe', 0))
        chimney = int(data.get('chimney', 0))
        reduced_mobility = int(data.get('reduced_mobility', 0))
        storage_room = int(data.get('storage_room', 0))
        unfurnished = int(data.get('unfurnished', 0))

        # ── Datos provinciales ───────────────────────────────────────
        prov = get_province_stats(loc_city)
        population_prov = prov['population_prov']
        number_of_companies_prov = prov['number_of_companies_prov']
        companies_prov_vs_national = prov['companies_prov_vs_national_%']
        population_prov_vs_national = prov['population_prov_vs_national_%']
        renta_media_prov = prov['renta_media_prov']

        # ── Feature engineering ──────────────────────────────────────
        amenities_list = [garage, terrace, garden, swimming_pool, lift, balcony]
        age = 2025 - construct_date
        age = max(0, min(age, 150))
        age_squared = age ** 2
        amenities_score = sum(amenities_list)
        has_premium_outdoor = int(swimming_pool == 1 or garden == 1)
        bath_per_room = bath_num / (room_num + 0.01)
        companies_per_capita = number_of_companies_prov / (population_prov + 1)
        m2_diff = m2_real - m2_useful
        m2_ratio = m2_useful / (m2_real + 0.01)
        pop_density_relative = population_prov_vs_national * population_prov
        renta_per_capita = renta_media_prov / (population_prov / 1000 + 1)

        # size_segment
        if m2_useful <= 50:
            size_segment = 'muy_pequeño'
        elif m2_useful <= 80:
            size_segment = 'pequeño'
        elif m2_useful <= 120:
            size_segment = 'medio'
        elif m2_useful <= 200:
            size_segment = 'grande'
        else:
            size_segment = 'muy_grande'

        # Frecuencias aproximadas
        loc_city_freq = DEFAULT_FREQ['loc_city_freq']
        loc_zone_freq = DEFAULT_FREQ['loc_zone_freq']
        loc_district_freq = DEFAULT_FREQ['loc_district_freq']
        house_type_freq = DEFAULT_FREQ['house_type_freq']

        # ── Construir DataFrame ──────────────────────────────────────
        features = {
            'm2_useful': m2_useful,
            'm2_real': m2_real,
            'room_num': room_num,
            'bath_num': bath_num,
            'floor': floor_val,
            'ground_size': ground_size,
            'condition': condition,
            'energetic_certif': energetic_certif,
            'heating': heating,
            'house_type': house_type,
            'kitchen': kitchen,
            'loc_city': loc_city,
            'loc_zone': loc_zone,
            'loc_district': loc_district,
            'loc_neigh': loc_neigh,
            'orientation': orientation,
            'garage': garage,
            'terrace': terrace,
            'garden': garden,
            'swimming_pool': swimming_pool,
            'lift': lift,
            'balcony': balcony,
            'air_conditioner': air_conditioner,
            'built_in_wardrobe': built_in_wardrobe,
            'chimney': chimney,
            'reduced_mobility': reduced_mobility,
            'storage_room': storage_room,
            'unfurnished': unfurnished,
            'number_of_companies_prov': number_of_companies_prov,
            'population_prov': population_prov,
            'companies_prov_vs_national_%': companies_prov_vs_national,
            'population_prov_vs_national_%': population_prov_vs_national,
            'renta_media_prov': renta_media_prov,
            'age': age,
            'age_squared': age_squared,
            'amenities_score': amenities_score,
            'has_premium_outdoor': has_premium_outdoor,
            'bath_per_room': bath_per_room,
            'companies_per_capita': companies_per_capita,
            'm2_diff': m2_diff,
            'm2_ratio': m2_ratio,
            'pop_density_relative': pop_density_relative,
            'renta_per_capita': renta_per_capita,
            'size_segment': size_segment,
            'loc_city_freq': loc_city_freq,
            'loc_zone_freq': loc_zone_freq,
            'loc_district_freq': loc_district_freq,
            'house_type_freq': house_type_freq,
        }

        df = pd.DataFrame([features])

        # Columnas categóricas que necesitan target encoding
        cat_cols = ['condition', 'energetic_certif', 'heating', 'house_type',
                    'kitchen', 'loc_city', 'loc_zone', 'loc_district', 'loc_neigh',
                    'orientation', 'size_segment']
        for col in cat_cols:
            df[col] = df[col].astype('object')

        # ── Target encoding ──────────────────────────────────────────
        if encoder is not None:
            try:
                print(f"[DEBUG] Aplicando target encoding", file=sys.stderr)
                df[cat_cols] = encoder.transform(df[cat_cols])
                print(f"[DEBUG] Target encoding aplicado correctamente", file=sys.stderr)
            except Exception as e:
                print(f"[WARN] Error en target encoding: {e}. Usando valores por defecto.", file=sys.stderr)
                for col in cat_cols:
                    df[col] = 0.0
        else:
            print(f"[WARN] Encoder no disponible. Rellenando categóricas con 0.", file=sys.stderr)
            for col in cat_cols:
                df[col] = 0.0

        # Rellenar NaN
        df = df.fillna(-999)

        print(f"[DEBUG] DataFrame shape: {df.shape}, columns: {list(df.columns)}", file=sys.stderr)

        # ── Predicción ───────────────────────────────────────────────
        try:
            pred_log = model.predict(df)[0]
            # El modelo fue entrenado sobre log(price), invertir
            price = np.exp(pred_log)

            if price < 1000 or price > 50000000:
                # Intentar interpretación directa
                price = max(1000, abs(pred_log))

            # Devolver resultado como JSON
            result = {
                "price": round(float(price), 2),
                "currency": "EUR",
                "model": model_label,
                "input_summary": {
                    "city": loc_city,
                    "zone": loc_zone,
                    "district": loc_district,
                    "house_type": house_type,
                    "m2": m2_useful,
                    "rooms": int(room_num),
                    "bathrooms": int(bath_num),
                    "year": int(construct_date),
                    "amenities_score": amenities_score,
                    "condition": condition
                }
            }
            print(json.dumps(result))
            sys.exit(0)

        except Exception as e:
            print(f"Error en predicción: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            sys.exit(1)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
