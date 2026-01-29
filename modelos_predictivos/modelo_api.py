from flask import Flask, request, jsonify
import joblib
import numpy as np

app = Flask(__name__)
modelo = joblib.load('/ruta/a/modelo_rf_ligero.pkl')  # Ajusta la ruta si lo mueves

@app.route('/predecir', methods=['POST'])
def predecir():
    datos = request.get_json()
    entrada = np.array(datos['features']).reshape(1, -1)
    prediccion = modelo.predict(entrada)
    return jsonify({'prediccion': float(prediccion[0])})

if __name__ == '__main__':
    app.run(port=5000)
