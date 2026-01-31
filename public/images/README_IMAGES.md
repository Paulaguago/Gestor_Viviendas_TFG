# Guía de Imágenes para Landing Page

## 📁 Estructura de Carpetas

### `/dashboard/`
Capturas de pantalla del dashboard real:
- `chart-ingresos.png` - Gráfico de ingresos mensuales con barras
- `prediction-ai.png` - Screenshot de la predicción de IA de precios

**Recomendaciones:**
- Resolución: 1920x1080px (Full HD)
- Formato: PNG con transparencia o JPG optimizado
- Peso máximo: 500KB (usar compresión)
- Hacer capturas con datos realistas y atractivos

### `/properties/`
Fotos de propiedades destacadas:
- `property-1.jpg` - Apartamento Centro (Madrid, Sol)
- `property-2.jpg` - Loft Moderno (Barcelona, Eixample)
- `property-3.jpg` - Villa Playa (Málaga, Marbella)

**Recomendaciones:**
- Resolución: 800x600px o superior (ratio 4:3 o 16:9)
- Formato: JPG optimizado
- Peso máximo: 300KB cada una
- Imágenes de alta calidad, bien iluminadas
- Evitar marcas de agua
- Fuentes sugeridas: Unsplash, Pexels (libres de derechos)

### `/testimonials/`
Fotos de perfil de usuarios:
- `ana-martinez.jpg` - Ana Martínez (Propietaria Madrid)
- `javier-rodriguez.jpg` - Javier Rodríguez (Gestor de Flotas)
- `laura-gomez.jpg` - Laura Gómez (Anfitriona Airbnb)

**Recomendaciones:**
- Resolución: 200x200px (cuadrada)
- Formato: JPG circular
- Peso máximo: 50KB cada una
- Fotos profesionales de rostros
- Fondo neutro o desenfocado
- Fuentes: Generated Photos, This Person Does Not Exist (IA)

## 🔧 Cómo Añadir las Imágenes

### 1. Hero Section (Mockup flotante)
Ya implementado con CSS decorativo. Opcional: captura del dashboard completo.

### 2. Bento Grid Dashboard
**Archivo:** `views/index.ejs` líneas ~107-118, ~149-158

```html
<!-- Descomenta estas líneas cuando tengas las imágenes: -->
<img src="/images/dashboard/chart-ingresos.png" alt="Gráfico de ingresos">
<img src="/images/dashboard/prediction-ai.png" alt="Predicción IA">
```

### 3. Propiedades Destacadas
**Archivo:** `views/index.ejs` líneas ~287, ~318, ~349

```html
<!-- Descomenta y reemplaza: -->
<img src="/images/properties/property-1.jpg" alt="Apartamento Madrid" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
```

### 4. Testimonios
**Archivo:** `views/index.ejs` líneas ~390, ~420, ~450

```html
<!-- Descomenta: -->
<img src="/images/testimonials/ana-martinez.jpg" alt="Ana Martínez" class="w-16 h-16 rounded-full object-cover border-4 border-yellow-400">
```

## 🗺️ Mapa de OpenStreetMap

**Estado:** ✅ Implementado y funcional

El mapa interactivo con Leaflet.js ya está integrado:
- Muestra 8 ciudades españolas con marcadores amarillos
- Estilo oscuro (dark mode) que combina con el diseño
- Tooltips con número de propiedades por ciudad
- 100% gratuito, sin API keys necesarias

**No requiere imágenes adicionales.**

## 📊 Checklist de Implementación

- [x] Crear estructura de carpetas
- [ ] Capturar dashboard → `/dashboard/chart-ingresos.png`
- [ ] Capturar predicción IA → `/dashboard/prediction-ai.png`
- [ ] Descargar 3 fotos de casas → `/properties/`
- [ ] Generar 3 avatares → `/testimonials/`
- [ ] Descomentar líneas en `index.ejs`
- [ ] Optimizar peso de imágenes (TinyPNG, ImageOptim)
- [ ] Probar responsive en móvil/tablet

## 🎨 Herramientas Recomendadas

### Capturas de Pantalla
- Windows: `Win + Shift + S` (Snipping Tool)
- Chrome DevTools: F12 → Device Toolbar (responsive)

### Optimización de Imágenes
- [TinyPNG](https://tinypng.com/) - Compresión sin pérdida
- [Squoosh](https://squoosh.app/) - Editor avanzado
- ImageMagick (CLI): `magick convert input.jpg -quality 85 output.jpg`

### Fotos Gratuitas
- [Unsplash](https://unsplash.com/s/photos/apartment) - Propiedades
- [Pexels](https://www.pexels.com/search/house/) - Casas
- [This Person Does Not Exist](https://thispersondoesnotexist.com/) - Avatares IA

### Avatares Generados por IA
- [Generated Photos](https://generated.photos/) - Rostros realistas
- [Pravatar](https://pravatar.cc/) - Avatares placeholder

## 🚀 Prioridad de Implementación

**Alta prioridad:**
1. ✅ Mapa OpenStreetMap (ya implementado)
2. 📸 Capturas del dashboard (`chart-ingresos.png`, `prediction-ai.png`)
3. 🏠 Fotos de propiedades (3 imágenes)

**Media prioridad:**
4. 👤 Avatares de testimonios (3 imágenes)

**Baja prioridad:**
5. Mockup 3D del hero (opcional, ya hay versión CSS)

---

**Última actualización:** 31/01/2026
