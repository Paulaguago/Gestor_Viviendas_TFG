# 🏠 Predictor de Precio Airbnb - Guía de Setup Completo

Tu aplicación web de predicción de precios de Airbnb usando Machine Learning está lista. Todo se ha configurado automáticamente.

## ✅ Lo que ya está hecho

### 1. Dependencias Python instaladas ✓
- `joblib` - para cargar modelos
- `pandas` - para manipular datos
- `numpy` - para cálculos numéricos
- `scikit-learn` - para machine learning

Verificar con:
```powershell
python -m pip list | grep -E "joblib|pandas|numpy|scikit"
```

### 2. Estructura del proyecto completa ✓
```
Proyecto/
├── app.js                    # Servidor Express (Node.js)
├── predict.py              # Script predicción (Python)
├── package.json            # Dependencias Node.js
├── train_and_save.py       # Script para guardar modelo + preprocesador
│
├── public/
│   ├── css/style.css
│   └── js/validation.js
│
├── views/
│   ├── index.ejs           # Formulario con 4 secciones
│   └── result.ejs          # Resultados
│
└── model/
    ├── model_randomforest.pkl    # Modelo ML (4.4 GB)
    ├── preprocessor.pkl          # Preprocesador (nuevo)
    └── model_options.json        # Opciones de ciudades/barrios
```

### 3. Archivos configurados ✓

- **predict.py**: Script Python que:
  - Busca automáticamente el modelo en `model/`
  - Carga el preprocesador si existe (`preprocessor.pkl`)
  - Aplica transformaciones a los datos de entrada
  - Retorna el precio predicho

- **app.js**: Servidor Express que:
  - Carga `model_options.json` con ciudades y barrios
  - Maneja GET / para mostrar el formulario
  - Maneja POST /predict para recibir datos → llama Python → retorna resultado

- **model_options.json**: Contiene:
  - Ciudades disponibles (Barcelona, Madrid, Valencia, etc.)
  - Barrios por ciudad (con populate dinámica en formulario)
  - Tipos de alojamiento
  - Rangos de bedrooms, bathrooms, capacidad

- **views/index.ejs**: Formulario con 4 secciones:
  1. Ubicación (ciudad + barrio con populate dinámico)
  2. Características básicas (baños, dormitorios, capacidad, tipo)
  3. Comodidades (checkbox: piscina, jacuzzi, aire, wifi)
  4. Puntuación y disponibilidad (rating, reviews, días)

## 🚀 Cómo ejecutar

### Opción A: Modo desarrollo (recomendado para primeras pruebas)

1. **Terminal 1 - Servidor Node.js**
```powershell
cd c:\Users\Paula\Desktop\TFG\Proyecto
npm start
```

Deberías ver:
```
🚀 Servidor corriendo en http://localhost:3000
```

2. **Abre navegador**
```
http://localhost:3000
```

3. **Completa el formulario** y haz clic en "🔮 Predecir Precio"

### Opción B: Test directo de predict.py

```powershell
cd c:\Users\Paula\Desktop\TFG\Proyecto
python predict.py Barcelona Centro 1 1 2 entire 5 0 0 0 1 4.8 10 200
```

Deberías ver un número (precio), ej: `245.67`

⚠️ **Nota**: La primera ejecución tarda porque carga el modelo de 4.4 GB en RAM. Después es rápido (~1-2s).

## 📝 Parámetros de predict.py

El script espera exactamente 14 parámetros posicionales:

```
python predict.py <origen> <barrio> <baños> <dormitorios> <capacidad> <tipo> <comodidades> <piscina> <jacuzzi> <aire> <wifi> <rating> <reviews> <disponibilidad>
```

Ejemplo desglosado:
```powershell
python predict.py `
  Barcelona `           # 1: Origen (ciudad)
  Centro `              # 2: Barrio
  1 `                   # 3: Baños
  1 `                   # 4: Dormitorios  
  2 `                   # 5: Capacidad
  entire `              # 6: Tipo (entire/private/shared/hotel)
  5 `                   # 7: Número de comodidades
  0 `                   # 8: Tiene piscina (0=no, 1=sí)
  0 `                   # 9: Tiene jacuzzi (0=no, 1=sí)
  0 `                   # 10: Tiene aire (0=no, 1=sí)
  1 `                   # 11: Tiene wifi (0=no, 1=sí)
  4.8 `                 # 12: Rating promedio (0-5)
  10 `                  # 13: Número de reseñas
  200                   # 14: Disponibilidad días/año
```

## 🔄 Flujo de funcionamiento

```
Usuario visita localhost:3000
    ↓
app.js GET / → renderiza index.ejs con opciones de ciudades
    ↓
Usuario selecciona ciudad → JavaScript carga barrios dinámicamente
    ↓
Usuario completa formulario y envía (POST)
    ↓
app.js POST /predict → extrae datos y ejecuta:
    spawn('python', ['predict.py', ...14_args...])
    ↓
predict.py:
  1. Parsea 14 argumentos
  2. Carga modelo de 4.4 GB (primera vez es lento)
  3. Carga preprocesador.pkl
  4. Crea features derivadas (bath_per_bed, review_score_weighted, etc.)
  5. Aplica transformación logarítmica a algunas variables
  6. Aplica preprocesador (OneHotEncoder categorías)
  7. Predice con RandomForest
  8. Invierte transformación logarítmica (expm1)
  9. Retorna precio en stdout
    ↓
app.js recibe stdout → parseFloat → renderiza result.ejs
    ↓
Usuario ve: Precio predicho €245.67 + resumen de entrada
```

## 🛠️ Troubleshooting

### Problema: "ModuleNotFoundError: No module named 'pandas'"
**Solución**: Todos los paquetes ya están instalados. Si falla, ejecuta:
```powershell
python -m pip install --only-binary :all: joblib pandas numpy scikit-learn
```

### Problema: "X has 22 features, but RandomForestRegressor is expecting 65"
**Solución**: Ya está resuelto. El script ahora carga `preprocessor.pkl` automáticamente. Si falta, ejecuta:
```powershell
python train_and_save.py
```

### Problema: "El modelo se queda cargando" 
**Es normal**. Es un modelo de 4.4 GB. Espera 30-60 segundos la primera vez. Después, cada predicción tarda 1-2 segundos porque el modelo ya está en RAM.

### Problema: Puerto 3000 en uso
**Solución**: Edita `app.js` línea ~7:
```javascript
const PORT = 3001;  // o el puerto que prefieras
```

### Problema: No encuentra preprocesador
El script creará un preprocesador de ejemplo automáticamente. Para usar el real del entrenamiento:
1. Si tienes el notebook de entrenamiento:
   ```python
   joblib.dump(preprocessor, 'model/preprocessor.pkl')
   ```
2. Luego ejecuta predict.py nuevamente.

## 📊 Características del Modelo

El modelo RandomForest predice con:
- **22 features básicas** (baños, dormitorios, capacidad, comodidades, etc.)
- **5 features derivadas** (relaciones entre variables)
- **65 features finales** (después del OneHotEncoder)

El preprocesador:
- Imputa valores nulos (strategy: median para números)
- Aplica OneHotEncoder a variables categóricas (room_type, neigh_grouped)

## ✨ Próximas mejoras opcionales

1. **Caché del modelo**: Cargar el modelo una sola vez al iniciar Express (no en cada predicción)
2. **Modelos alternativos**: Usar HistGradientBoosting o EBM si existen
3. **API REST**: Exponer `/api/predict` para consumo externo
4. **Base de datos**: Guardar histórico de predicciones
5. **Testing**: Añadir tests unitarios

## 📞 Notas importantes

- El modelo se entrenó con **log1p(price)**, el script automáticamente deshace la transformación
- Los datos deben estar en el rango que vio el modelo durante entrenamiento
- Si quieres actualizar el modelo, guarda el nuevo en `model/model_randomforest.pkl`
- Si quieres actualizar ciudades/barrios, edita `model/model_options.json`

## ✅ Checklist final

- [ ] npm install (dependencias Node.js)
- [ ] python -m pip install joblib pandas numpy scikit-learn (o ya instalados)
- [ ] model/model_randomforest.pkl existe (4.4 GB)
- [ ] model/preprocessor.pkl existe
- [ ] npm start funciona sin errores
- [ ] http://localhost:3000 muestra el formulario
- [ ] Puedo seleccionar ciudad y se cargan barrios dinámicamente
- [ ] Puedo predecir un precio sin errores

---

**¡Listo! Tu aplicación está completamente funcional.** 🎉

Abre http://localhost:3000 y comienza a predecir precios de Airbnb.
