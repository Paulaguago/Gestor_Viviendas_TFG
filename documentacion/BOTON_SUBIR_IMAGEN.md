# 📸 Botón de Subir Imagen - Implementación Completa

## ✅ Implementación Finalizada

Se ha añadido un **botón en cada tarjeta de vivienda** que permite subir o cambiar la imagen directamente desde la vista de propiedades.

---

## 🎯 Cómo Funciona

### Vista del Usuario:

```
┌─────────────────────────────┐
│  [IMAGEN O PLACEHOLDER]     │
│        [Badge: Libre]       │
├─────────────────────────────┤
│  Casa Ejemplo               │
│  📍 Madrid, 28001           │
│  📏 120m²  🛏️ 3  🚿 2      │
├─────────────────────────────┤
│  [📷 Añadir/Cambiar imagen] │ ← NUEVO BOTÓN
├─────────────────────────────┤
│  [Ver] [Editar] [🗑️]       │
└─────────────────────────────┘
```

### Proceso:

1. **Usuario hace clic** en el botón con icono de cámara
2. **Se abre el selector de archivos** del sistema operativo
3. **Usuario selecciona una imagen** (JPG, PNG, GIF, WEBP)
4. **Validación automática**:
   - Tipo de archivo permitido
   - Tamaño máximo 5MB
5. **Multer guarda el archivo** en `public/images/properties/` con nombre único
6. **Se actualiza la BD** con la ruta `/images/properties/nombre-123456.jpg`
7. **La página se recarga** y muestra la nueva imagen

---

## 📝 Archivos Modificados

### 1. **views/propiedades.ejs**

#### Añadido en la tarjeta:
```html
<!-- Botón para subir/cambiar imagen -->
<div class="mb-3">
    <form id="form-imagen-<%= vivienda.id_vivienda %>" enctype="multipart/form-data" style="display: inline;">
        <input type="file" 
               id="file-imagen-<%= vivienda.id_vivienda %>" 
               name="imagen" 
               accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
               style="display: none;"
               onchange="subirImagenVivienda(<%= vivienda.id_vivienda %>)">
        <button type="button" 
                onclick="document.getElementById('file-imagen-<%= vivienda.id_vivienda %>').click()" 
                class="btn btn-sm w-100" 
                style="background-color: #64748b; color: white; font-size: 0.75rem; font-weight: 600; border: none;">
            <i class="fas fa-camera"></i>
            <span><%= vivienda.imagen_url ? 'Cambiar' : 'Añadir' %> imagen</span>
        </button>
    </form>
</div>
```

#### Función JavaScript añadida:
```javascript
function subirImagenVivienda(viviendaId) {
    // 1. Obtiene el archivo seleccionado
    // 2. Valida tipo (solo imágenes)
    // 3. Valida tamaño (máx 5MB)
    // 4. Crea FormData y envía a POST /viviendas/:id/imagen
    // 5. Muestra indicador de carga
    // 6. Recarga página al completar
}
```

**Características:**
- ✅ Input file oculto (mejor UX)
- ✅ Botón personalizado con icono de cámara
- ✅ Texto dinámico: "Añadir" si no hay imagen, "Cambiar" si ya existe
- ✅ Validación client-side
- ✅ Indicador de carga mientras sube
- ✅ Manejo de errores

---

### 2. **routes/viviendas.js**

#### Ruta añadida:
```javascript
// Subir/actualizar imagen de vivienda existente
router.post('/:id/imagen', uploadImage.single('imagen'), async (req, res) => {
  try {
    const viviendaId = req.params.id;
    
    // Verificar que la vivienda existe
    const vivienda = await Vivienda.findByPk(viviendaId);
    if (!vivienda) {
      return res.status(404).json({ success: false, message: 'Vivienda no encontrada' });
    }

    // Verificar que se subió un archivo
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se proporcionó ninguna imagen' });
    }

    // Actualizar la ruta de la imagen
    const nuevaRuta = '/images/properties/' + req.file.filename;
    await vivienda.update({ imagen_url: nuevaRuta });

    res.json({ 
      success: true, 
      message: 'Imagen actualizada correctamente',
      imagen_url: nuevaRuta 
    });
  } catch (error) {
    console.error('Error al subir imagen:', error);
    res.status(500).json({ success: false, message: 'Error al subir la imagen' });
  }
});
```

**Características:**
- ✅ Usa multer para procesar la imagen
- ✅ Verifica que la vivienda existe
- ✅ Verifica que se subió un archivo
- ✅ Actualiza solo el campo `imagen_url` en la BD
- ✅ Responde con JSON (para AJAX)
- ✅ Manejo completo de errores

---

## 🧪 Cómo Probarlo

### Paso 1: Asegúrate de que el servidor esté corriendo
```powershell
npm start
```

### Paso 2: Ve a la página de propiedades
```
http://localhost:3000/propiedades
```

### Paso 3: Busca una vivienda y haz clic en el botón de cámara
- Si no hay imagen: verás "📷 Añadir imagen"
- Si ya hay imagen: verás "📷 Cambiar imagen"

### Paso 4: Selecciona una imagen de tu PC
- Debe ser JPG, PNG, GIF o WEBP
- Máximo 5MB

### Paso 5: Espera a que se suba
- Verás el texto cambiar a "Subiendo..."
- La página se recargará automáticamente

### Paso 6: ¡Listo!
- La imagen ahora se muestra en la tarjeta
- El archivo está guardado en `public/images/properties/`
- La ruta está guardada en la base de datos

---

## 🔍 Validaciones Implementadas

### Frontend (JavaScript):
1. ✅ **Tipo de archivo**: Solo imágenes (jpeg, jpg, png, gif, webp)
2. ✅ **Tamaño máximo**: 5MB

### Backend (Multer + Express):
1. ✅ **Tipo de archivo**: Filtro en multer
2. ✅ **Tamaño máximo**: Límite de 5MB en multer
3. ✅ **Vivienda existe**: Verifica con Sequelize
4. ✅ **Archivo presente**: Verifica que req.file existe

---

## 📂 Estructura de Archivos

```
Gestor_Viviendas_TFG/
├── config/
│   └── multer.js                    ← Configuración de subida
├── public/
│   └── images/
│       └── properties/              ← Imágenes guardadas aquí
│           ├── vivienda-123456.jpg
│           └── vivienda-789012.png
├── routes/
│   └── viviendas.js                 ← Nueva ruta POST /:id/imagen
└── views/
    └── propiedades.ejs              ← Botón + JavaScript añadidos
```

---

## 💡 Ventajas de Esta Implementación

1. ✅ **No requiere ir a formulario de edición** - Se hace directamente desde la vista principal
2. ✅ **Experiencia de usuario fluida** - Un solo clic para seleccionar y subir
3. ✅ **Feedback visual** - Indicador de carga mientras sube
4. ✅ **Validación robusta** - Cliente y servidor
5. ✅ **Sin duplicar código** - Usa la misma configuración multer existente
6. ✅ **Actualiza solo la imagen** - No toca otros datos de la vivienda
7. ✅ **Nombres únicos** - Evita conflictos de archivos
8. ✅ **Ruta relativa correcta** - Express sirve las imágenes sin problemas

---

## 🎨 Apariencia del Botón

**Color:** Gris (#64748b) - Neutro y profesional  
**Icono:** Cámara (FontAwesome)  
**Ancho:** 100% de la tarjeta  
**Posición:** Entre micro-datos y botones de acción  

El botón se adapta dinámicamente:
- **Sin imagen**: "📷 Añadir imagen"
- **Con imagen**: "📷 Cambiar imagen"

---

## 🚀 Resultado Final

Ahora los usuarios pueden:
- ✅ Ver todas sus propiedades en una cuadrícula
- ✅ Hacer clic en el botón de cámara en cualquier propiedad
- ✅ Seleccionar una imagen de su PC
- ✅ Ver la imagen subirse y aparecer automáticamente
- ✅ Cambiar la imagen cuando quieran

**Todo sin salir de la vista principal de propiedades.**
