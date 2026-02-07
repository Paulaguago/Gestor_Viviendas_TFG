# Actualización del Sistema de Gestión de Viviendas

## 📋 Resumen de cambios

Se han implementado mejoras significativas en el formulario de creación de viviendas, incluyendo:

1. **Dirección desglosada**: Separación de la dirección en componentes individuales
2. **Mapa interactivo**: OpenStreetMap para selección visual de ubicación
3. **Información legal**: Campos para documentación legal y administrativa
4. **URLs de plataformas**: Enlaces a Airbnb y Booking.com
5. **Campos adicionales**: Tipo de vivienda, planta, año construcción, superficie parcela

---

## 🗂️ Archivos modificados

### 1. Modelo de datos
- **`models/Vivienda.js`**
  - ✅ Agregados campos: `calle`, `bloque_portal`, `piso`, `escalera`, `letra_numero`
  - ✅ Agregados campos: `pais`, `url_airbnb`, `url_booking`
  - ✅ Actualizados comentarios para todos los campos

### 2. Vista del formulario
- **`views/propiedades.ejs`**
  - ✅ Leaflet.js integrado para mapa interactivo
  - ✅ Sección de ubicación expandida con 9 campos separados
  - ✅ Sección de características ampliada (tipo vivienda, planta, año construcción, superficie parcela)
  - ✅ Nueva sección: Información Legal
  - ✅ Nueva sección: Plataformas de Alquiler
  - ✅ Auto-relleno de superficie parcela con valor de superficie
  - ✅ Mapa con click para establecer lat/long automáticamente

### 3. Backend
- **`routes/propiedades.js`**
  - ✅ Actualizada ruta POST para recibir todos los nuevos campos
  - ✅ Construcción automática de dirección completa desde componentes
  - ✅ Mapeo correcto de campos al modelo Sequelize

### 4. Base de datos
- **`documentacion/alter_viviendas_nuevos_campos.sql`**
  - ✅ Script SQL completo para migración
  - ✅ Agrega columnas nuevas con comentarios descriptivos
  - ✅ Crea índices para optimización de búsquedas
  - ✅ Compatible con MySQL/MariaDB

---

## 🚀 Cómo aplicar los cambios

### Paso 1: Actualizar la base de datos

Ejecuta el script SQL en tu base de datos MySQL:

```bash
mysql -u tu_usuario -p gestor_viviendas < documentacion/alter_viviendas_nuevos_campos.sql
```

O desde MySQL Workbench / phpMyAdmin:
1. Abre el archivo `documentacion/alter_viviendas_nuevos_campos.sql`
2. Ejecuta todo el script
3. Verifica que no haya errores

### Paso 2: Reiniciar el servidor

Si el servidor está corriendo, reinícialo:

```bash
# Detener con Ctrl+C
# Luego reiniciar
node app.js
```

### Paso 3: Verificar funcionamiento

1. Accede a la página de propiedades
2. Haz clic en "Añadir propiedad"
3. Verifica que aparezcan las nuevas secciones:
   - ✅ Dirección desglosada (calle, bloque, piso, escalera, letra)
   - ✅ Mapa interactivo de OpenStreetMap
   - ✅ Selector de tipo de vivienda
   - ✅ Campos de información legal
   - ✅ URLs de Airbnb y Booking
4. Haz clic en el mapa para establecer ubicación
5. Completa el formulario y guarda

---

## 📝 Nuevos campos disponibles

### Ubicación (desglosada)
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `calle` | VARCHAR(255) | Sí | Nombre de la calle |
| `bloque_portal` | VARCHAR(50) | No | Bloque o portal |
| `piso` | VARCHAR(50) | No | Número de piso |
| `escalera` | VARCHAR(50) | No | Escalera |
| `letra_numero` | VARCHAR(50) | No | Letra o número de puerta |
| `barrio` | VARCHAR(100) | No | Barrio |
| `ciudad` | VARCHAR(100) | Sí | Ciudad |
| `pais` | VARCHAR(100) | Sí | País (default: España) |
| `codigo_postal` | VARCHAR(20) | No | Código postal |
| `latitud` | DECIMAL(10,8) | No | Latitud (automática desde mapa) |
| `longitud` | DECIMAL(11,8) | No | Longitud (automática desde mapa) |

### Características adicionales
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `tipo_vivienda` | VARCHAR(50) | Sí | Apartamento, Casa, Chalet, Estudio, Ático, etc. |
| `planta` | INT | No | Número de planta (0=bajo, -1=sótano) |
| `ano_construccion` | INT | No | Año de construcción |
| `superficie_parcela` | DECIMAL(10,2) | No | m² de parcela (auto = superficie) |

### Información legal
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `estado_legal` | VARCHAR(50) | No | Legal, Pendiente, En proceso, No aplica |
| `referencia_catastral` | VARCHAR(100) | No | Referencia catastral |
| `numero_registro_autonomico` | VARCHAR(100) | No | VUT, VFT, etc. |
| `fecha_registro` | DATE | No | Fecha de registro oficial |

### Plataformas de alquiler
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `url_airbnb` | TEXT | No | URL pública en Airbnb |
| `url_booking` | TEXT | No | URL pública en Booking.com |

---

## 🗺️ Mapa interactivo

### Características
- **Proveedor**: OpenStreetMap + Leaflet.js
- **Funcionalidad**: Click en el mapa establece lat/long automáticamente
- **Centro inicial**: Madrid (40.416775, -3.703790)
- **Zoom**: Nivel 13 (barrio)
- **Marcador**: Visual con icono de ubicación

### Uso
1. Abre el modal de nueva propiedad
2. El mapa se inicializa automáticamente en la sección de Ubicación
3. Haz zoom/pan para navegar
4. **Haz clic** en la ubicación exacta de la propiedad
5. Se coloca un marcador y se rellenan lat/long automáticamente
6. Las coordenadas se muestran debajo del mapa

---

## 🔍 Optimizaciones realizadas

### Índices creados
```sql
-- Búsqueda por ciudad
idx_viviendas_ciudad ON viviendas(ciudad)

-- Búsqueda por tipo
idx_viviendas_tipo ON viviendas(tipo_vivienda)

-- Búsquedas geográficas
idx_viviendas_coords ON viviendas(latitud, longitud)

-- Búsqueda por barrio
idx_viviendas_barrio ON viviendas(barrio)
```

### Auto-relleno inteligente
- **Superficie parcela**: Se auto-rellena con el valor de superficie vivienda
- **País**: Por defecto "España"
- **Dirección completa**: Se construye automáticamente desde componentes

---

## 📚 Dependencias agregadas

### Frontend
```html
<!-- Leaflet CSS -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

<!-- Leaflet JS -->
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
```

**Nota**: No requiere instalación npm, se carga desde CDN.

---

## 🐛 Solución de problemas

### El mapa no se muestra
- ✅ Verifica que el modal esté completamente abierto
- ✅ Revisa la consola del navegador para errores de Leaflet
- ✅ Comprueba conexión a internet (CDN de Leaflet)

### Los datos no se guardan
- ✅ Ejecuta el script SQL de migración
- ✅ Reinicia el servidor Node.js
- ✅ Verifica los logs de consola del servidor

### El mapa se ve cortado
- ✅ Espera 200ms después de abrir el modal
- ✅ El código incluye `map.invalidateSize()` automático

### Coordenadas no se establecen
- ✅ Haz clic directamente en el mapa (no arrastrar)
- ✅ Verifica que los inputs ocultos `latitudInput` y `longitudInput` existan

---

## ✅ Checklist de verificación

Después de aplicar los cambios, verifica:

- [ ] Script SQL ejecutado sin errores
- [ ] Servidor reiniciado correctamente
- [ ] Modal de nueva propiedad se abre
- [ ] Mapa de OpenStreetMap se visualiza
- [ ] Click en el mapa establece coordenadas
- [ ] Todos los campos nuevos son visibles
- [ ] Formulario se envía correctamente
- [ ] Datos se guardan en la base de datos
- [ ] Nueva propiedad aparece en el listado

---

## 📞 Contacto y soporte

Si encuentras algún problema durante la implementación:

1. Revisa los logs del servidor: `console.log` en terminal
2. Revisa la consola del navegador (F12)
3. Verifica que la base de datos tenga las columnas nuevas: `DESCRIBE viviendas;`
4. Asegúrate de que Sequelize sincroniza correctamente

---

**Última actualización**: 7 de febrero de 2026
**Versión**: 2.0.0
