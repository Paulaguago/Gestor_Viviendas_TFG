# 🏠 Predictor de Precio Airbnb - TFG

Sistema web de predicción de precios de Airbnb usando Machine Learning con Random Forest, Gradient Boosting e Interpretable Boosting Regressor (EBM).

## 📋 Estructura del Proyecto

```
Proyecto/
├── app.js                      # Servidor Express (Node.js)
├── predict.py                  # Script Python para predicciones
├── package.json               # Dependencias Node.js
├── model_options.json         # Opciones del modelo (raíz)
│
├── public/                    # Archivos estáticos
│   ├── css/
│   │   └── style.css          # Estilos CSS personalizados
│   └── js/
│       └── validation.js      # Validación del formulario
│
├── views/                     # Plantillas EJS
│   ├── index.ejs             # Formulario de predicción
│   └── result.ejs            # Página de resultados
│
└── model/                     # Carpeta del modelo ML
    ├── model_options.json    # Opciones (ciudades, barrios, etc.)
    ├── model_randomforest.pkl  # Modelo Random Forest
    ├── model_histgradientboosting.pkl  # Modelo HGB
    └── model_explainableboosting.pkl   # Modelo EBM
```

## 🚀 Instalación

### 1. Requisitos Previos
- **Node.js** (v14 o superior)
- **Python** (v3.8 o superior, pero NO Python 3.13)
- **npm** (incluido con Node.js)

### 2. Instalar Dependencias Node.js

```bash
npm install
```

Esto instalará:
- `express` - Framework web
- `ejs` - Motor de plantillas
- `body-parser` - Parser de datos POST

### 3. Instalar Dependencias Python

```bash
pip install --only-binary :all: joblib pandas numpy scikit-learn
```

O si prefieres versiones específicas:

```bash
pip install joblib==1.3.2 pandas==2.0.3 numpy==1.24.3 scikit-learn==1.3.0
```

### 4. Copiar Modelo Entrenado

Coloca tu archivo del modelo (`.pkl`) en la carpeta `/model/` con el nombre:
- `model_randomforest.pkl`

## 📊 Características del Modelo

El modelo predice el precio de Airbnb considerando:

### 📍 Ubicación
- Ciudad/Región
- Barrio específico

### 🏘️ Características Básicas
- Número de dormitorios
- Número de baños
- Capacidad (número de personas)
- Tipo de alojamiento (entire/private/shared/hotel)

### ✨ Comodidades
- Número total de amenidades
- Presencia de: Piscina, Jacuzzi, Aire Acondicionado, WiFi

### ⭐ Reputación y Disponibilidad
- Puntuación promedio de reseñas
- Número de reseñas
- Días disponibles al año

### 🤖 Features Derivadas (calculadas automáticamente)
- Relación baños/dormitorios
- Reputación ponderada
- Densidad de reseñas
- Eficiencia de dormitorios
- Indicadores de temporada alta/fin de semana

## 🎯 Uso

### 1. Iniciar el Servidor

```bash
npm start
```

O en modo desarrollo con nodemon:

```bash
npm run dev
```

Deberías ver:
```
🚀 Servidor corriendo en http://localhost:3000
Presiona Ctrl+C para detener el servidor
```

### 2. Acceder a la Aplicación

Abre tu navegador y ve a:
```
http://localhost:3000
```

### 3. Realizar una Predicción

1. Selecciona una Ciudad/Región
2. Se cargarán automáticamente los barrios disponibles
3. Completa todas las características
4. Haz clic en "🔮 Predecir Precio"
5. Verás el precio estimado en euros

## 📁 Archivos Importantes

### `app.js` - Servidor Express
- **GET /** - Muestra el formulario de predicción
- **POST /predict** - Recibe los datos y llama a Python para predecir

### `predict.py` - Script de Predicción
Recibe 14 argumentos:
1. Origen (ciudad)
2. Barrio
3. Baños
4. Dormitorios
5. Capacidad
6. Tipo de habitación
7. Número de comodidades
8. Tiene piscina (0/1)
9. Tiene jacuzzi (0/1)
10. Tiene aire acondicionado (0/1)
11. Tiene WiFi (0/1)
12. Puntuación de reseñas
13. Número de reseñas
14. Disponibilidad (días/año)

### `model/model_options.json`
Contiene:
- **ciudades**: Lista de ciudades disponibles
- **barrios_por_ciudad**: Barrios para cada ciudad
- **room_type**: Tipos de alojamiento
- **bedrooms**: Rango de dormitorios
- **bathrooms**: Rango de baños
- **accommodates**: Rango de capacidad

### `views/index.ejs`
- Formulario con validación Bootstrap
- Carga dinámica de barrios según ciudad
- Secciones organizadas por tipo de característica

### `views/result.ejs`
- Muestra el precio predicho
- Resumen de los datos ingresados
- Manejo de errores

## 🛠️ Desarrollo

### Estructura del Proyecto
```
app.js (Express Server)
    ↓
    ├→ GET / → render index.ejs
    └→ POST /predict → spawn predict.py
                         ↓
                    Python Process
                         ↓
                    Load model.pkl
                    Make prediction
                    Return price
    ↓
    render result.ejs
```

### Cómo Modificar el Modelo

Si reentrenaste el modelo con diferentes características:

1. **Actualiza `model_options.json`** con las nuevas opciones
2. **Actualiza `app.js`** para pasar los nuevos parámetros
3. **Actualiza `predict.py`** para procesar los nuevos parámetros en el mismo orden que el entrenamiento

## 🐛 Solución de Problemas

### Error: "El modelo no se encontró"
- Verifica que el archivo `model_randomforest.pkl` está en `/model/`
- Comprueba el nombre del archivo

### Error: "ModuleNotFoundError: No module named 'joblib'"
- Ejecuta: `pip install joblib pandas numpy scikit-learn`

### Error: "Cannot find module 'express'"
- Ejecuta: `npm install`

### El puerto 3000 está en uso
Cambia el puerto en `app.js`:
```javascript
const PORT = 3001;  // O el puerto que prefieras
```

## 📝 Notas Importantes

1. **Formato de Datos**: El script Python espera exactamente 14 argumentos en orden específico
2. **Modelo Entrenado**: Asegúrate de que el modelo fue entrenado con los mismos features
3. **Logaritmo de Precio**: Si entrenaste con `log1p(price)`, el script invierte la transformación con `expm1()`
4. **Características Categóricas**: Se codifican automáticamente en Python

## 📈 Modelos Disponibles

El proyecto soporta 3 modelos:
- **Random Forest** (`model_randomforest.pkl`)
- **Histogram Gradient Boosting** (`model_histgradientboosting.pkl`)
- **Explainable Boosting Regressor** (`model_explainableboosting.pkl`)

Puedes cambiar cuál usar editando `predict.py`.

## 🎨 Personalización

### Cambiar Colores
Edita `/public/css/style.css`

### Cambiar Ciudades/Barrios
Edita `/model/model_options.json`

### Cambiar Campos del Formulario
Edita `/views/index.ejs` y actualiza `/app.js` para pasar los nuevos parámetros

## 📚 Documentación Adicional

Ver el código fuente comentado en:
- `app.js` - Rutas y lógica del servidor
- `predict.py` - Lógica de predicción
- `views/index.ejs` - Formulario con JavaScript dinámico

## ✅ Checklist Final

- [ ] Python packages instalados (`joblib`, `pandas`, `numpy`, `scikit-learn`)
- [ ] Node.js packages instalados (`npm install`)
- [ ] Modelo `.pkl` copiado a `/model/`
- [ ] `model_options.json` con datos correctos
- [ ] `predict.py` con features en el orden correcto
- [ ] Servidor iniciado (`npm start`)
- [ ] Navegador abierto en `http://localhost:3000`

## 🤝 Soporte

Si encuentras problemas:
1. Verifica los logs en la terminal
2. Comprueba la consola del navegador (F12)
3. Revisa los mensajes de error en `/views/result.ejs`

---

**Hecho con ❤️ para tu TFG**
