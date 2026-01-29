#!/usr/bin/env python3
"""
Script para calcular SHAP local para una predicción específica de alquiler
"""

import sys
import joblib
import numpy as np
import pandas as pd
import os
import json
import shap
import traceback

def read_input_json():
    """Lee el JSON de entrada desde argv[2] o desde la variable de entorno INPUT_JSON."""
    if len(sys.argv) >= 3:
        try:
            return json.loads(sys.argv[2])
        except Exception:
            pass
    env_json = os.environ.get('INPUT_JSON')
    if env_json:
        return json.loads(env_json)
    raise ValueError('No se pudo leer JSON de entrada')


def main():
    try:
        if len(sys.argv) < 2:
            print(json.dumps({"error": "Falta ruta del modelo"}))
            sys.exit(1)

        model_path = sys.argv[1]
        input_data = read_input_json()

        # Cargar modelo
        modelo = joblib.load(model_path)

        # Cargar target encoder (buscando desde la raíz del proyecto)
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        encoder_path = os.path.join(project_root, 'modelos_predictivos', 'alquiler', 'target_encoder_airbnb.pkl')
        encoder = joblib.load(encoder_path) if os.path.exists(encoder_path) else None

        # Construir DataFrame con features
        features = {
            'bathrooms': input_data.get('bathrooms', 1),
            'bedrooms': input_data.get('bedrooms', 1),
            'accommodates': input_data.get('accommodates', 2),
            'amenities_count': input_data.get('amenities_count', 5),
            'has_pool': input_data.get('has_pool', 0),
            'has_jacuzzi': input_data.get('has_jacuzzi', 0),
            'has_aircon': input_data.get('has_aircon', 0),
            'has_wifi': input_data.get('has_wifi', 1),
            'has_kitchen': input_data.get('has_kitchen', 1),
            'has_parking': input_data.get('has_parking', 0),
            'has_tv': input_data.get('has_tv', 1),
            'has_washer': input_data.get('has_washer', 0),
            'room_type_simple': input_data.get('room_type', 'entire'),
            'neigh_grouped': input_data.get('neigh_grouped', 'Other'),
            'capacity_category': input_data.get('capacity_category', 'medium'),
            'bedroom_category': input_data.get('bedroom_category', '1bed'),
            'review_scores_rating': input_data.get('review_scores_rating', 4.8),
            'number_of_reviews': input_data.get('number_of_reviews', 50),
            'availability_365': input_data.get('availability_365', 200),
            'barrio_mean_price': input_data.get('barrio_mean_price', 100),
            'barrio_median_price': input_data.get('barrio_median_price', 95),
            'barrio_std_price': input_data.get('barrio_std_price', 30),
            'barrio_count': input_data.get('barrio_count', 100),
            'barrio_avg_rating': input_data.get('barrio_avg_rating', 4.8),
            'barrio_avg_reviews': input_data.get('barrio_avg_reviews', 50),
            'barrio_popularity': input_data.get('barrio_popularity', 0.5),
            'bath_per_bed': input_data.get('bath_per_bed', 1.0),
            'review_score_weighted': input_data.get('review_score_weighted', 200),
            'review_density': input_data.get('review_density', 0.25),
            'bedroom_efficiency': input_data.get('bedroom_efficiency', 2.0),
            'is_high_season': input_data.get('is_high_season', 0),
            'is_weekend': input_data.get('is_weekend', 0),
            'is_summer': input_data.get('is_summer', 0),
            'is_winter': input_data.get('is_winter', 0),
            'luxury_score': input_data.get('luxury_score', 0),
            'basic_score': input_data.get('basic_score', 2),
            'total_amenities_score': input_data.get('total_amenities_score', 2),
            'price_vs_barrio_mean': input_data.get('price_vs_barrio_mean', 1.0),
            'price_vs_barrio_median': input_data.get('price_vs_barrio_median', 1.0),
            'rating_vs_barrio_avg': input_data.get('rating_vs_barrio_avg', 1.0),
            'month': input_data.get('month', 6),
            'day_of_week': input_data.get('day_of_week', 0),
            'quarter': input_data.get('quarter', 2)
        }

        df = pd.DataFrame([features])
        df['room_type_simple'] = df['room_type_simple'].astype('object')
        df['neigh_grouped'] = df['neigh_grouped'].astype('object')
        df['capacity_category'] = df['capacity_category'].astype('object')
        df['bedroom_category'] = df['bedroom_category'].astype('object')

        # Aplicar target encoding
        if encoder is not None:
            df = encoder.transform(df)
        else:
            # Fallback
            room_map = {'entire': 5.2, 'private': 4.1, 'shared': 3.5, 'hotel': 4.8}
            capacity_map = {'small': 3.8, 'medium': 4.5, 'large': 5.0, 'xlarge': 5.5}
            bedroom_map = {'studio': 3.9, '1bed': 4.3, '2bed': 4.7, '3bed+': 5.1}
            df['room_type_simple'] = df['room_type_simple'].map(room_map).fillna(4.5)
            df['capacity_category'] = df['capacity_category'].map(capacity_map).fillna(4.5)
            df['bedroom_category'] = df['bedroom_category'].map(bedroom_map).fillna(4.5)
            df['neigh_grouped'] = features['barrio_mean_price'] / 100.0

        # Crear explainer SHAP
        explainer = shap.TreeExplainer(modelo)
        shap_values = explainer.shap_values(df)

        # Obtener nombres de features
        feature_names = list(df.columns)

        # Preparar resultado
        result = {
            "features": feature_names,
            "shap_values": shap_values[0].tolist() if len(shap_values.shape) > 1 else shap_values.tolist(),
            "base_value": float(explainer.expected_value),
            "prediction": float(modelo.predict(df)[0])
        }

        print(json.dumps(result))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({"error": str(e), "traceback": traceback.format_exc()}))
        sys.exit(1)

if __name__ == "__main__":
    main()
