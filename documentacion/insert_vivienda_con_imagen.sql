-- Script SQL para crear una vivienda con imagen asociada al usuario 1

-- ============================================================================
-- OPCIÓN 1: USAR SCRIPT AUTOMATICO (RECOMENDADO)
-- ============================================================================
-- Ejecuta este script PowerShell que copia automáticamente la imagen:
--   .\documentacion\copiar_imagen_y_crear_sql.ps1
--
-- El script:
-- 1. Copia la imagen desde C:\Users\Paula\Downloads\foto.png
-- 2. La coloca en: public\images\properties\foto.png
-- 3. Genera el SQL necesario automáticamente
--
-- ============================================================================
-- OPCIÓN 2: MANUAL (copia tú mismo la imagen)
-- ============================================================================

-- 1. PRIMERO: Copiar manualmente la imagen
--    Desde: C:\Users\Paula\Downloads\foto.png
--    Hasta: c:\Users\Paula\Documents\GitHub\Gestor_Viviendas_TFG\public\images\properties\foto.png

-- 2. SEGUNDO: Ejecutar este SQL
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
    3, -- dormitorios
    2, -- baños
    120.50, -- superficie m²
    6, -- máximo huéspedes
    '/images/properties/foto.png', -- RUTA EN LA BD (siempre relativa desde public/)
    'libre', -- estado_actual
    1, -- activa (true)
    85.00, -- precio por noche
    'Casa acogedora con todas las comodidades',
    NOW(),
    NOW()
);

-- IMPORTANTE: 
-- ❗ La ruta en la base de datos NO puede ser C:\Users\Paula\Downloads\foto.png
-- ❗ Express solo sirve archivos desde la carpeta public/
-- ✅ La imagen DEBE estar en: public\images\properties\foto.png
-- ✅ La ruta en BD DEBE ser: '/images/properties/foto.png'
--
-- PASOS RÁPIDOS:
-- 1. Ejecuta: .\documentacion\copiar_imagen_y_crear_sql.ps1
-- 2. O copia manualmente la imagen desde Descargas a public\images\properties\
-- 3. Ejecuta el INSERT de arriba

-- Verificar que se insertó correctamente:
SELECT id_vivienda, nombre, direccion, ciudad, imagen_url, estado_actual
FROM viviendas 
WHERE id_usuario = 1 
ORDER BY createdAt DESC 
LIMIT 1;
