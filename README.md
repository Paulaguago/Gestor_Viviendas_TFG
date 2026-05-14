# Gestor de Viviendas con Predicciones Inmobiliarias

Un sistema integral de gestión de propiedades con predicciones de precios basadas en machine learning. Aplicación desarrollada como Trabajo de Fin de Grado (TFG).

## Descripción del Proyecto

Este proyecto es una plataforma web completa que permite:
- **Gestionar propiedades inmobiliarias** (alquileres y ventas)
- **Predecir precios** utilizando modelos de Machine Learning (Random Forest, Gradient Boosting, LightGBM)
- **Autenticación y control de usuarios** con roles diferenciados
- **Gestión de reservas e incidencias** para propiedades de alquiler
- **Análisis financiero** de las propiedades
- **Subida y gestión de imágenes** de propiedades

## Estructura del Proyecto

```
Gestor_Viviendas_TFG/
├── app.js                          # Punto de entrada principal de la aplicación
├── package.json                    # Dependencias del proyecto
├── requirements.txt                # Dependencias de Python
│
├── config/                         # Configuración
│   ├── database.js                 # Configuración de conexión MySQL
│   └── multer.js                   # Configuración de carga de archivos
│
├── models/                         # Modelos de Sequelize
│   ├── User.js                     # Modelo de usuarios
│   ├── Vivienda.js                 # Modelo de propiedades
│   ├── Reserva.js                  # Modelo de reservas
│   ├── Incidencia.js               # Modelo de incidencias
│   ├── Transaccion.js              # Modelo de transacciones
│   ├── CategoriaFinanciera.js       # Modelo de categorías financieras
│   ├── DocumentoVivienda.js         # Modelo de documentos
│   ├── Huesped.js                  # Modelo de huéspedes
│   ├── Tarea.js                    # Modelo de tareas
│   └── index.js                    # Exportación de todos los modelos
│
├── routes/                         # Rutas de la aplicación
│   ├── authRoutes.js               # Autenticación y registro
│   ├── generalRoutes.js            # Rutas generales
│   ├── alquilerRoutes.js           # Gestión de alquileres
│   ├── ventaRoutes.js              # Gestión de ventas
│   └── finanzas.js                 # Análisis financiero
│
├── utils/                          # Funciones utilitarias
│   ├── authMiddleware.js           # Middleware de autenticación
│   ├── errorHandler.js             # Manejo de errores
│   ├── passport.js                 # Configuración de Passport.js
│   ├── pythonRunner.js             # Ejecutor de scripts Python
│   ├── userModel.js                # Modelo de usuario personalizado
│   └── dataLoader.js               # Cargador de datos
│
├── views/                          # Plantillas EJS
│   ├── index.ejs                   # Página de inicio
│   ├── dashboard.ejs               # Panel de control
│   ├── perfil.ejs                  # Perfil de usuario
│   ├── auth/                       # Vistas de autenticación
│   ├── finanzas/                   # Vistas de análisis financiero
│   ├── propiedades/                # Vistas de gestión de propiedades
│   ├── prediccion/                 # Vistas de predicciones
│   └── partials/                   # Componentes reutilizables
│
├── public/                         # Archivos estáticos
│   ├── css/                        # Estilos CSS
│   ├── js/                         # Scripts JavaScript
│   ├── images/                     # Imágenes de la interfaz
│   └── uploads/                    # Documentos subidos por usuarios
│
├── modelos_predictivos/            # Modelos de Machine Learning
│   ├── modelo_api.py               # API de modelos
│   ├── alquiler/                   # Modelos para predicción de alquileres
│   │   ├── implementacion.py       # Implementación de modelos
│   │   ├── GB/                     # Gradient Boosting
│   │   ├── RF/                     # Random Forest
│   │   └── data/                   # Datos de entrenamiento
│   └── venta/                      # Modelos para predicción de ventas
│       ├── EBM/                    # Explainable Boosting Machine
│       ├── LIGHTGBM/               # LightGBM
│       └── data/                   # Datos de entrenamiento
│
├── python_scripts/                 # Scripts Python utilitarios
│   ├── predict.py                  # Script de predicción general
│   ├── predict_venta.py            # Script de predicción de ventas
│   ├── shap_local_rental.py        # Análisis SHAP para alquileres
│   ├── shap_local_venta.py         # Análisis SHAP para ventas
│   └── ebm_local_explain.py        # Explicabilidad de EBM
│
├── documentacion/                  # Documentación del proyecto
│   ├── GUIA_IMAGENES_VIVIENDAS.md  # Guía de gestión de imágenes
│   ├── BOTON_SUBIR_IMAGEN.md       # Documentación de subida de imágenes
│   ├── ACTUALIZACION_VIVIENDAS_V2.md
│   └── *.sql                       # Scripts SQL de base de datos
│
└── scripts/                        # Scripts de utilidad
```

## Requisitos Previos

- **Node.js** (v14 o superior)
- **npm** (v6 o superior)
- **Python** (v3.8 o superior)
- **MySQL** (v5.7 o superior)
- **Git LFS** (para archivos grandes)

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/Gestor_Viviendas_TFG.git
cd Gestor_Viviendas_TFG
```

### 2. Instalar dependencias de Node.js

```bash
npm install
```

### 3. Instalar dependencias de Python

```bash
pip install -r requirements.txt
```

### 4. Configurar la base de datos

- Crea una base de datos MySQL
- Actualiza las credenciales en `config/database.js`:

```javascript
const sequelize = new Sequelize('nombre_bd', 'usuario', 'contraseña', {
    host: 'localhost',
    dialect: 'mysql',
    // ...
});
```

### 5. Sincronizar modelos con la base de datos

La aplicación sincronizará automáticamente los modelos Sequelize la primera vez que se ejecute.

## Ejecución del Proyecto

### Modo Desarrollo (con auto-reload)

```bash
npm run dev
```

### Modo Producción

```bash
npm start
```

La aplicación estará disponible en: **http://localhost:3000**

## Características Principales

### Autenticación
- Registro e inicio de sesión seguro
- Control de roles y permisos
- Gestión de sesiones

### Gestión de Propiedades
- Crear, editar y eliminar propiedades
- Clasificación de propiedades
- Subida de imágenes y documentos
- Gestión de comodidades

### Predicciones Inmobiliarias
- **Alquileres**: Predicción de precios usando Random Forest y Gradient Boosting
- **Ventas**: Predicción de precios usando EBM y LightGBM
- Explicabilidad de modelos con SHAP

### Análisis Financiero
- Gestión de transacciones
- Categorización de gastos
- Reportes financieros

### Gestión de Alquileres
- Registro de reservas
- Gestión de huéspedes
- Seguimiento de incidencias
- Gestión de tareas

## Modelos de Machine Learning

### Alquiler
- **Random Forest (RF)**: Modelo robusto para predicción
- **Gradient Boosting (GB)**: Modelo de alto rendimiento

### Venta
- **EBM (Explainable Boosting Machine)**: Modelo interpretable
- **LightGBM**: Modelo eficiente en memoria

## Variables de Entorno Importantes

Configura en `config/database.js`:
- `DB_HOST`: Host de la base de datos
- `DB_USER`: Usuario de la base de datos
- `DB_PASSWORD`: Contraseña de la base de datos
- `DB_NAME`: Nombre de la base de datos
- `PORT`: Puerto donde correr la aplicación (default: 3000)

## Documentación Adicional

Consulta la carpeta `documentacion/` para:
- Guías de gestión de imágenes
- Esquemas SQL
- Instrucciones específicas de cada feature

## Licencia

Este proyecto es un **Trabajo de Fin de Grado (TFG)**. Consulta el archivo [LICENSE](./LICENSE) para más detalles.

## Autores

- Paula Guadilla Gómez (pauguadi@ucm.es)
- Alejandro Rodríguez Delgado (alerod31@ucm.es)
Desarrollado como Trabajo de Fin de Grado.

## Contacto y Soporte

Para consultas sobre el proyecto, contacta con el autor.

---

**Nota**: Este proyecto fue desarrollado con fines académicos como parte de un Trabajo de Fin de Grado.