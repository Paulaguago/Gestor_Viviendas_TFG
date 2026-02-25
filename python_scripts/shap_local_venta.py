#!/usr/bin/env python3
"""
Script para calcular valores SHAP locales para una predicción de precio de VENTA.
Recibe datos via variable de entorno INPUT_JSON.
Devuelve JSON con features, shap_values, base_value y prediction.
"""

import sys
import os
import json
import joblib
import numpy as np
import pandas as pd
import shap
import traceback
import warnings

warnings.filterwarnings('ignore')

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# ── Estadísticas provinciales ──────────────────────────────────────────────────
PROVINCE_STATS = {
    "Madrid":        {"population_prov": 6750000, "number_of_companies_prov": 590000, "companies_prov_vs_national_%": 16.4, "population_prov_vs_national_%": 14.2, "renta_media_prov": 14680},
    "Barcelona":     {"population_prov": 5620000, "number_of_companies_prov": 520000, "companies_prov_vs_national_%": 14.5, "population_prov_vs_national_%": 11.8, "renta_media_prov": 15000},
    "Valencia":      {"population_prov": 2565000, "number_of_companies_prov": 195000, "companies_prov_vs_national_%": 5.4,  "population_prov_vs_national_%": 5.4,  "renta_media_prov": 11430},
    "Sevilla":       {"population_prov": 1960000, "number_of_companies_prov": 140000, "companies_prov_vs_national_%": 3.9,  "population_prov_vs_national_%": 4.1,  "renta_media_prov": 10030},
    "Málaga":        {"population_prov": 1700000, "number_of_companies_prov": 150000, "companies_prov_vs_national_%": 4.2,  "population_prov_vs_national_%": 3.6,  "renta_media_prov": 10250},
    "Malaga":        {"population_prov": 1700000, "number_of_companies_prov": 150000, "companies_prov_vs_national_%": 4.2,  "population_prov_vs_national_%": 3.6,  "renta_media_prov": 10250},
    "Bilbao":        {"population_prov": 1150000, "number_of_companies_prov": 100000, "companies_prov_vs_national_%": 2.8,  "population_prov_vs_national_%": 2.4,  "renta_media_prov": 16100},
    "Vizcaya":       {"population_prov": 1150000, "number_of_companies_prov": 100000, "companies_prov_vs_national_%": 2.8,  "population_prov_vs_national_%": 2.4,  "renta_media_prov": 16100},
    "Zaragoza":      {"population_prov":  980000, "number_of_companies_prov":  75000, "companies_prov_vs_national_%": 2.1,  "population_prov_vs_national_%": 2.1,  "renta_media_prov": 13200},
    "Alicante":      {"population_prov": 1880000, "number_of_companies_prov": 145000, "companies_prov_vs_national_%": 4.0,  "population_prov_vs_national_%": 3.9,  "renta_media_prov": 10500},
    "Murcia":        {"population_prov": 1520000, "number_of_companies_prov":  98000, "companies_prov_vs_national_%": 2.7,  "population_prov_vs_national_%": 3.2,  "renta_media_prov": 9800},
    "Palma":         {"population_prov":  920000, "number_of_companies_prov":  95000, "companies_prov_vs_national_%": 2.6,  "population_prov_vs_national_%": 1.9,  "renta_media_prov": 12500},
    "Mallorca":      {"population_prov":  920000, "number_of_companies_prov":  95000, "companies_prov_vs_national_%": 2.6,  "population_prov_vs_national_%": 1.9,  "renta_media_prov": 12500},
    "Las Palmas":    {"population_prov": 1130000, "number_of_companies_prov":  72000, "companies_prov_vs_national_%": 2.0,  "population_prov_vs_national_%": 2.4,  "renta_media_prov": 9600},
    "Tenerife":      {"population_prov": 1030000, "number_of_companies_prov":  68000, "companies_prov_vs_national_%": 1.9,  "population_prov_vs_national_%": 2.2,  "renta_media_prov": 9500},
    "A Coruña":      {"population_prov": 1120000, "number_of_companies_prov":  78000, "companies_prov_vs_national_%": 2.2,  "population_prov_vs_national_%": 2.4,  "renta_media_prov": 11800},
    "Granada":       {"population_prov":  920000, "number_of_companies_prov":  58000, "companies_prov_vs_national_%": 1.6,  "population_prov_vs_national_%": 1.9,  "renta_media_prov": 9200},
    "Valladolid":    {"population_prov":  520000, "number_of_companies_prov":  38000, "companies_prov_vs_national_%": 1.1,  "population_prov_vs_national_%": 1.1,  "renta_media_prov": 12100},
    "San Sebastián": {"population_prov":  730000, "number_of_companies_prov":  68000, "companies_prov_vs_national_%": 1.9,  "population_prov_vs_national_%": 1.5,  "renta_media_prov": 17200},
    "Donostia":      {"population_prov":  730000, "number_of_companies_prov":  68000, "companies_prov_vs_national_%": 1.9,  "population_prov_vs_national_%": 1.5,  "renta_media_prov": 17200},
    "Pamplona":      {"population_prov":  660000, "number_of_companies_prov":  48000, "companies_prov_vs_national_%": 1.3,  "population_prov_vs_national_%": 1.4,  "renta_media_prov": 15600},
    "Vitoria":       {"population_prov":  340000, "number_of_companies_prov":  28000, "companies_prov_vs_national_%": 0.8,  "population_prov_vs_national_%": 0.7,  "renta_media_prov": 16500},
    "Salamanca":     {"population_prov":  330000, "number_of_companies_prov":  25000, "companies_prov_vs_national_%": 0.7,  "population_prov_vs_national_%": 0.7,  "renta_media_prov": 11200},
    "Cádiz":         {"population_prov": 1240000, "number_of_companies_prov":  68000, "companies_prov_vs_national_%": 1.9,  "population_prov_vs_national_%": 2.6,  "renta_media_prov": 8800},
    "Córdoba":       {"population_prov":  780000, "number_of_companies_prov":  48000, "companies_prov_vs_national_%": 1.3,  "population_prov_vs_national_%": 1.6,  "renta_media_prov": 9100},
    "Santander":     {"population_prov":  580000, "number_of_companies_prov":  42000, "companies_prov_vs_national_%": 1.2,  "population_prov_vs_national_%": 1.2,  "renta_media_prov": 12400},
    "Oviedo":        {"population_prov": 1010000, "number_of_companies_prov":  68000, "companies_prov_vs_national_%": 1.9,  "population_prov_vs_national_%": 2.1,  "renta_media_prov": 12800},
    "Gijón":         {"population_prov": 1010000, "number_of_companies_prov":  68000, "companies_prov_vs_national_%": 1.9,  "population_prov_vs_national_%": 2.1,  "renta_media_prov": 12800},
    "Tarragona":     {"population_prov":  810000, "number_of_companies_prov":  58000, "companies_prov_vs_national_%": 1.6,  "population_prov_vs_national_%": 1.7,  "renta_media_prov": 12200},
    "Girona":        {"population_prov":  770000, "number_of_companies_prov":  62000, "companies_prov_vs_national_%": 1.7,  "population_prov_vs_national_%": 1.6,  "renta_media_prov": 13100},
    "Lleida":        {"population_prov":  440000, "number_of_companies_prov":  30000, "companies_prov_vs_national_%": 0.8,  "population_prov_vs_national_%": 0.9,  "renta_media_prov": 12000},
    "Toledo":        {"population_prov":  700000, "number_of_companies_prov":  42000, "companies_prov_vs_national_%": 1.2,  "population_prov_vs_national_%": 1.5,  "renta_media_prov": 10200},
    "Castellón":     {"population_prov":  580000, "number_of_companies_prov":  42000, "companies_prov_vs_national_%": 1.2,  "population_prov_vs_national_%": 1.2,  "renta_media_prov": 11100},
    "Pontevedra":    {"population_prov":  940000, "number_of_companies_prov":  62000, "companies_prov_vs_national_%": 1.7,  "population_prov_vs_national_%": 2.0,  "renta_media_prov": 11000},
    "Vigo":          {"population_prov":  940000, "number_of_companies_prov":  62000, "companies_prov_vs_national_%": 1.7,  "population_prov_vs_national_%": 2.0,  "renta_media_prov": 11000},
}

NATIONAL_AVG = {
    "population_prov": 1000000,
    "number_of_companies_prov": 72000,
    "companies_prov_vs_national_%": 2.0,
    "population_prov_vs_national_%": 2.1,
    "renta_media_prov": 11800
}

DEFAULT_FREQ = {
    "loc_city_freq": 0.05,
    "loc_zone_freq": 0.01,
    "loc_district_freq": 0.005,
    "house_type_freq": 0.15
}


def get_province_stats(city):
    if city in PROVINCE_STATS:
        return PROVINCE_STATS[city]
    for k, v in PROVINCE_STATS.items():
        if k.lower() == city.lower():
            return v
    city_low = city.lower()
    for k, v in PROVINCE_STATS.items():
        if city_low in k.lower() or k.lower() in city_low:
            return v
    return NATIONAL_AVG


def build_features(data):
    loc_city      = data.get('loc_city', '')
    loc_zone      = data.get('loc_zone', '')
    loc_district  = data.get('loc_district', '')
    loc_neigh     = data.get('loc_neigh', '')
    house_type    = data.get('house_type', 'flat')
    m2_useful     = float(data.get('m2_useful', 80))
    m2_real       = float(data.get('m2_real', 0)) or m2_useful
    room_num      = float(data.get('room_num', 3))
    bath_num      = float(data.get('bath_num', 1))
    floor_val     = float(data.get('floor', 0))
    ground_size   = float(data.get('ground_size', 0))
    construct_date = float(data.get('construct_date', 2000))
    condition          = data.get('condition', 'good')
    energetic_certif   = data.get('energetic_certif', 'E')
    heating            = data.get('heating', 'individual')
    kitchen            = data.get('kitchen', 'equipped kitchen')
    orientation        = data.get('orientation', 'south')

    garage             = int(data.get('garage', 0))
    terrace            = int(data.get('terrace', 0))
    garden             = int(data.get('garden', 0))
    swimming_pool      = int(data.get('swimming_pool', 0))
    lift               = int(data.get('lift', 0))
    balcony            = int(data.get('balcony', 0))
    air_conditioner    = int(data.get('air_conditioner', 0))
    built_in_wardrobe  = int(data.get('built_in_wardrobe', 0))
    chimney            = int(data.get('chimney', 0))
    reduced_mobility   = int(data.get('reduced_mobility', 0))
    storage_room       = int(data.get('storage_room', 0))
    unfurnished        = int(data.get('unfurnished', 0))

    prov = get_province_stats(loc_city)
    population_prov              = prov['population_prov']
    number_of_companies_prov     = prov['number_of_companies_prov']
    companies_prov_vs_national   = prov['companies_prov_vs_national_%']
    population_prov_vs_national  = prov['population_prov_vs_national_%']
    renta_media_prov             = prov['renta_media_prov']

    age           = max(0, min(2025 - construct_date, 150))
    age_squared   = age ** 2
    amenities_score = sum([garage, terrace, garden, swimming_pool, lift, balcony])
    has_premium_outdoor = int(swimming_pool == 1 or garden == 1)
    bath_per_room  = bath_num / (room_num + 0.01)
    companies_per_capita = number_of_companies_prov / (population_prov + 1)
    m2_diff        = m2_real - m2_useful
    m2_ratio       = m2_useful / (m2_real + 0.01)
    pop_density_relative = population_prov_vs_national * population_prov
    renta_per_capita = renta_media_prov / (population_prov / 1000 + 1)

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

    return {
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
        'loc_city_freq': DEFAULT_FREQ['loc_city_freq'],
        'loc_zone_freq': DEFAULT_FREQ['loc_zone_freq'],
        'loc_district_freq': DEFAULT_FREQ['loc_district_freq'],
        'house_type_freq': DEFAULT_FREQ['house_type_freq'],
    }


def main():
    try:
        input_json = os.environ.get('INPUT_JSON')
        if not input_json:
            input_json = sys.stdin.read()
        if not input_json:
            print(json.dumps({"error": "No se recibieron datos de entrada"}))
            sys.exit(1)

        data = json.loads(input_json)

        model_dir    = os.path.join(PROJECT_ROOT, 'modelos_predictivos', 'venta', 'LIGHTGBM')
        model_path   = os.path.join(model_dir, 'model_lightgbm_no_leakage.pkl')
        encoder_path = os.path.join(model_dir, 'target_encoder_no_leakage.pkl')

        if not os.path.exists(model_path):
            print(json.dumps({"error": f"Modelo no encontrado: {model_path}"}))
            sys.exit(1)

        model = joblib.load(model_path)
        encoder = joblib.load(encoder_path) if os.path.exists(encoder_path) else None

        features = build_features(data)
        df = pd.DataFrame([features])

        cat_cols = ['condition', 'energetic_certif', 'heating', 'house_type',
                    'kitchen', 'loc_city', 'loc_zone', 'loc_district', 'loc_neigh',
                    'orientation', 'size_segment']
        for col in cat_cols:
            df[col] = df[col].astype('object')

        if encoder is not None:
            try:
                df[cat_cols] = encoder.transform(df[cat_cols])
            except Exception as e:
                print(f"[WARN] Fallo en target encoding: {e}", file=sys.stderr)
                for col in cat_cols:
                    df[col] = 0.0
        else:
            for col in cat_cols:
                df[col] = 0.0

        df = df.fillna(-999)

        # SHAP explanation
        explainer   = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(df)

        feature_names = list(df.columns)

        if isinstance(shap_values, list):
            sv = np.array(shap_values[0]).flatten().tolist()
        elif len(np.array(shap_values).shape) > 1:
            sv = np.array(shap_values)[0].tolist()
        else:
            sv = list(shap_values)

        ev = explainer.expected_value
        if hasattr(ev, '__len__'):
            ev = float(ev[0]) if len(ev) > 0 else 0.0
        else:
            ev = float(ev)

        pred_log = float(model.predict(df)[0])
        price    = float(np.exp(pred_log))

        result = {
            "features":    feature_names,
            "shap_values": sv,
            "base_value":  ev,
            "prediction":  price
        }

        print(json.dumps(result))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({"error": str(e), "traceback": traceback.format_exc()}))
        sys.exit(1)


if __name__ == "__main__":
    main()
