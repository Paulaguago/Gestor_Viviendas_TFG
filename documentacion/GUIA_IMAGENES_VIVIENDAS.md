# 📸 Guía Completa: Sistema de Imágenes para Viviendas

## 📋 Resumen

**NO guardes imágenes directamente en la base de datos.** 
- ✅ **Guarda**: Solo la **ruta del archivo** (VARCHAR) en la BD
- ✅ **Almacena**: La imagen física en el servidor (carpeta `public/images/properties/`)

---

## 🗄️ 1. Modificación de Base de Datos

### Si el campo NO existe, añádelo:

```sql
ALTER TABLE viviendas 
ADD COLUMN imagen_url VARCHAR(255) 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_general_ci 
DEFAULT NULL
COMMENT 'Ruta relativa de la imagen desde public/';
```

### Si ya existe como TEXT, modifícalo a VARCHAR(255):

```sql
ALTER TABLE viviendas 
MODIFY COLUMN imagen_url VARCHAR(255) 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_general_ci 
DEFAULT NULL
COMMENT 'Ruta relativa de la imagen desde public/';
```

**Campo:**
- `imagen_url`: VARCHAR(255) - Guarda la ruta relativa desde `public/` (ej: `/images/properties/foto.png`)
- VARCHAR(255) es más eficiente que TEXT para rutas cortas

---

## 📦 2. Dependencias (Ya instaladas)

```json
"multer": "^2.0.2"
```

Multer maneja la subida de archivos en Node.js/Express.

---

## 🛠️ 3. Archivos Creados/Modificados

### ✅ Creados:

1. **`config/multer.js`**
   - Configuración de multer para imágenes
   - Almacenamiento en `public/images/properties/`
   - Validación de tipos de archivo (jpeg, jpg, png, gif, webp)
   - Límite de tamaño: 5MB
   - Nombres únicos automáticos

2. **`public/images/properties/`** (carpeta)
   - Directorio donde se guardan las imágenes

3. **`documentacion/insert_vivienda_con_imagen.sql`**
   - Script SQL para insertar vivienda de prueba con imagen

### ✅ Modificados:

1. **`routes/viviendas.js`**
   - Importa configuración de multer
   - Ruta POST actualizada con `uploadImage.single('imagen')`
   - Guarda la ruta en `imagen_url` si se sube archivo

2. **`views/propiedades.ejs`**
   - Muestra imagen si existe: `<img src="<%= vivienda.imagen_url %>">`
   - Muestra placeholder (icono) si no hay imagen
   - Lógica condicional: `<% if (vivienda.imagen_url) { %>`

3. **`views/propiedades/nueva.ejs`**
   - Formulario actualizado con `enctype="multipart/form-data"`
   - Campo de subida de archivo añadido
   - Validación de formatos en el input

---

## 🔧 4. Cómo Funciona

### Flujo de subida:

1. Usuario selecciona imagen en formulario (`/propiedades/nueva`)
2. Multer intercepta el archivo al hacer POST a `/propiedades`
3. Guarda imagen con nombre único en `public/images/properties/`
4. Se guarda la ruta `/images/properties/nombre-unico.jpg` en campo `imagen_url`
5. Al mostrar viviendas, EJS comprueba si existe `imagen_url`:
   - **Sí existe**: Muestra `<img src="...">`
   - **No existe**: Muestra icono placeholder azul

### Ventajas de este método:

✅ Base de datos pequeña y rápida
✅ Imágenes fáciles de respaldar/mover
✅ Mejor rendimiento
✅ Fácil gestión de archivos
✅ No se exceden límites de tamaño de BD

---

## 📝 5. Insertar Vivienda con Imagen vía SQL

### Pasos:

1. **Copiar imagen a la carpeta correcta:**
   ```
   Origen: C:\Users\Paula\Downloads\foto.png
   Destino: c:\Users\Paula\Documents\GitHub\Gestor_Viviendas_TFG\public\images\properties\foto.png
   ```

2. **Ejecutar SQL:**

```sql
INSERT INTO viviendas (
    id_usuario,
    nombre,
    direccion,
    ciudad,
    codigo_postal,
    pais,
    tipo_vivienda,
    num_dormitorios,
    num_banos,
    superficie,
    max_huespedes,
    imagen_url,
    estado_actual,
    activa,
    precio_noche,
    descripcion,
    createdAt,
    updatedAt
) VALUES (
    1, -- id_usuario
    'Casa Ejemplo con Foto',
    'Calle Principal 123',
    'Madrid',
    '28001',
    'España',
    'Casa',
    3,
    2,
    120.50,
    6,
    '/images/properties/foto.png', -- ⚠️ RUTA SIN 'public/'
    'libre',
    1,
    85.00,
    'Casa acogedora con todas las comodidades',
    NOW(),
    NOW()
);
```

### ⚠️ IMPORTANTE:
- La ruta es **`/images/properties/foto.png`** (sin `public/`)
- Express sirve `public/` como carpeta raíz estática
- El navegador accede a: `http://localhost:3000/images/properties/foto.png`

---

## 🎨 6. Resultado Visual

### Con imagen:
```
┌─────────────────────────────┐
│  [IMAGEN DE LA CASA]        │ ← Foto real
│        [Badge: Libre]       │
├─────────────────────────────┤
│  Casa Ejemplo con Foto      │
│  📍 Madrid, 28001           │
│  📏 120m²  🛏️ 3  🚿 2      │
│  [Ver] [Editar] [🗑️]       │
└─────────────────────────────┘
```

### Sin imagen:
```
┌─────────────────────────────┐
│   [FONDO AZUL OSCURO]       │
│      🏠 (Icono blanco)      │ ← Placeholder
│        [Badge: Libre]       │
├─────────────────────────────┤
│  Casa Sin Foto              │
│  📍 Barcelona, 08001        │
│  📏 85m²  🛏️ 2  🚿 1       │
│  [Ver] [Editar] [🗑️]       │
└─────────────────────────────┘
```

---

## 🧪 7. Probar el Sistema

### Opción A: Subir vía formulario web

1. Inicia el servidor: `npm start`
2. Ve a: `http://localhost:3000/propiedades`
3. Clic en "Añadir propiedad"
4. Rellena el formulario
5. Selecciona una imagen en el campo "Imagen de la propiedad"
6. Enviar formulario
7. La imagen se guardará automáticamente

### Opción B: Insertar vía SQL

1. Copia tu imagen a: `public/images/properties/foto.png`
2. Ejecuta el script SQL proporcionado
3. Recarga la página de propiedades
4. Verás la vivienda con su imagen

---

## 🔍 8. Verificación

### Comprobar que funciona:

```sql
-- Ver viviendas con imagen
SELECT id_vivienda, nombre, imagen_url, estado_actual
FROM viviendas 
WHERE imagen_url IS NOT NULL;

-- Ver viviendas sin imagen
SELECT id_vivienda, nombre, imagen_url, estado_actual
FROM viviendas 
WHERE imagen_url IS NULL;
```

### Comprobar archivos en servidor:

```powershell
# Listar imágenes subidas
Get-ChildItem "c:\Users\Paula\Documents\GitHub\Gestor_Viviendas_TFG\public\images\properties\"
```

---

## 🚫 9. Lo que NO debes hacer

❌ **NO guardes imágenes como BLOB en MySQL**
   - Problema: BD crece demasiado, rendimiento bajo
   
❌ **NO uses rutas absolutas**
   - ❌ `C:\Users\Paula\...\foto.png`
   - ✅ `/images/properties/foto.png`

❌ **NO incluyas "public/" en la ruta de BD**
   - ❌ `/public/images/properties/foto.png`
   - ✅ `/images/properties/foto.png`

---

## 📊 10. Estructura de Archivos Final

```
Gestor_Viviendas_TFG/
├── config/
│   └── multer.js                    ← Configuración de subida
├── public/
│   └── images/
│       └── properties/              ← Imágenes guardadas aquí
│           ├── vivienda-123456.jpg
│           ├── vivienda-789012.png
│           └── foto.png
├── routes/
│   └── viviendas.js                 ← Rutas actualizadas
├── views/
│   ├── propiedades.ejs              ← Vista con lógica de imagen
│   └── propiedades/
│       └── nueva.ejs                ← Formulario con input file
└── documentacion/
    └── insert_vivienda_con_imagen.sql  ← Script SQL
```

---

## 🎯 Resumen Final

**Base de datos:** Solo guarda la ruta (VARCHAR 255)
**Servidor:** Guarda el archivo físico en `public/images/properties/`
**Vista:** Muestra imagen si existe, placeholder si no
**Formulario:** Permite subir imágenes (opcional)
**Límites:** 5MB máximo, formatos: JPG, PNG, GIF, WEBP

✅ Sistema completo y funcionando
✅ Sin necesidad de extensiones adicionales de MySQL
✅ Rendimiento óptimo
✅ Fácil de mantener
