#!/usr/bin/env python3
"""
Explicación local en vivo para EBM.
Lee los mismos argumentos que predict.py, construye el DataFrame con las 22 features
(usando room_type_simple/neigh_grouped como strings) y devuelve JSON con:
{
  "price": <prediccion_en_unidades_del_dataset>,
  "local": <explicacion_local_data()>
}
"""
import sys
import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime

BASE_DIR = os.path.dirname(__file__)
MODEL_DIR = os.path.join(BASE_DIR, 'model')


def find_ebm_model():
    candidates = [
        os.path.join(MODEL_DIR, 'ebm', 'model_ebm.pkl'),
        os.path.join(MODEL_DIR, 'model_ebm.pkl')
    ]
    for p in candidates:
        if os.path.exists(p) and os.path.getsize(p) > 1000:
            return p
    return None


def load_options():
    p = os.path.join(MODEL_DIR, 'model_options.json')
    if os.path.exists(p):
        with open(p, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def simplify_room_type(s: str) -> str:
    s = (s or '').strip().lower()
    mapping = {
        'entire home/apt': 'entire', 'entire': 'entire',
        'private room': 'private', 'private': 'private',
        'shared room': 'shared', 'shared': 'shared',
        'hotel room': 'hotel', 'hotel': 'hotel'
    }
    return mapping.get(s, s or 'entire')


def main():
    if len(sys.argv) < 20:
        print(json.dumps({"error": "expected 19 args"}))
        sys.exit(1)

    # Parse args (strings)
    origen = sys.argv[1]
    barrio = sys.argv[2]
    bathrooms = float(sys.argv[3])
    bedrooms = float(sys.argv[4])
    accommodates = float(sys.argv[5])
    room_type_raw = sys.argv[6]
    amenities_count = float(sys.argv[7] or 0)
    has_pool = int(sys.argv[8] or 0)
    has_jacuzzi = int(sys.argv[9] or 0)
    has_aircon = int(sys.argv[10] or 0)
    has_wifi = int(sys.argv[11] or 0)
    review_scores_rating = float(sys.argv[12] or 4.85)
    number_of_reviews = float(sys.argv[13] or 60)
    availability_365 = float(sys.argv[14] or 200)
    stay_date_raw = sys.argv[15]
    barrio_mean = float(sys.argv[16] or 160)
    barrio_median = float(sys.argv[17] or 150)
    barrio_std = float(sys.argv[18] or 35)
    amenities_text = sys.argv[19] if len(sys.argv) > 19 else ''

    room_type_simple = simplify_room_type(room_type_raw)

    # Flags desde texto si procede
    if amenities_text:
        t = amenities_text.lower()
        if ('pool' in t) or ('piscina' in t):
            has_pool = 1
        if ('jacuzzi' in t) or ('hot tub' in t):
            has_jacuzzi = 1
        if ('air conditioning' in t) or ('a/c' in t) or ('aire' in t):
            has_aircon = 1
        if ('wifi' in t) or ('wi-fi' in t) or ('wlan' in t):
            has_wifi = 1
        if not amenities_count:
            parts = [p.strip() for p in t.replace(';', ',').split(',') if p.strip()]
            amenities_count = float(len(parts)) if parts else 0.0

    # Features derivadas
    bath_per_bed = bathrooms / (bedrooms + 1e-3)
    review_score_weighted = review_scores_rating * np.log1p(number_of_reviews)
    review_density = number_of_reviews / (availability_365 + 1) if availability_365 > 0 else 0
    bedroom_efficiency = accommodates / (bedrooms + 1) if bedrooms >= 0 else 0

    is_high_season = 0
    is_weekend = 0
    if stay_date_raw:
        try:
            dt = datetime.fromisoformat(stay_date_raw)
            if dt.month in [6, 7, 8, 9, 12]:
                is_high_season = 1
            if dt.weekday() >= 4:
                is_weekend = 1
        except Exception:
            pass

    # Validar barrio dentro de ciudad
    options = load_options()
    bpc = options.get('barrios_por_ciudad', {})
    barrios_validos = bpc.get(origen, [])
    neigh_grouped = barrio if barrio in barrios_validos else 'Other'

    # Construir DF con las 22 columnas del entrenamiento EBM (categorías como string)
    features = {
        'bathrooms': bathrooms,
        'bedrooms': bedrooms,
        'accommodates': accommodates,
        'amenities_count': amenities_count,
        'has_pool': has_pool,
        'has_jacuzzi': has_jacuzzi,
        'has_aircon': has_aircon,
        'has_wifi': has_wifi,
        'room_type_simple': room_type_simple,
        'neigh_grouped': neigh_grouped,
        'review_scores_rating': review_scores_rating,
        'number_of_reviews': number_of_reviews,
        'availability_365': availability_365,
        'barrio_mean_price': barrio_mean,
        'barrio_median_price': barrio_median,
        'barrio_std_price': barrio_std,
        'bath_per_bed': bath_per_bed,
        'review_score_weighted': review_score_weighted,
        'is_high_season': is_high_season,
        'is_weekend': is_weekend,
        'review_density': review_density,
        'bedroom_efficiency': bedroom_efficiency
    }

    X = pd.DataFrame([features])
    X['room_type_simple'] = X['room_type_simple'].astype('object')
    X['neigh_grouped'] = X['neigh_grouped'].astype('object')

    # Cargar EBM
    model_path = find_ebm_model()
    if not model_path:
        print(json.dumps({"error": "model_ebm.pkl not found"}))
        sys.exit(1)
    ebm = joblib.load(model_path)

    # Predicción (recuerda que se entrenó sobre logprecio)
    pred = ebm.predict(X)[0]
    try:
        price_final = np.expm1(pred) if pred > 0 else abs(pred)
    except Exception:
        price_final = float(abs(pred))

    # Explicación local
    try:
        local_exp = ebm.explain_local(X)
        local_json = local_exp.data()
    except Exception as e:
        local_json = {"error": f"local explanation failed: {e}"}

    print(json.dumps({"price": round(float(price_final), 2), "local": local_json}))


if __name__ == '__main__':
    main()
