-- ============================================
-- Script de migración para tabla VIVIENDAS
-- Fecha: 2026-02-07
-- Descripción: Agregar nuevos campos para dirección desglosada,
--              información legal y URLs de plataformas
-- ============================================

USE gestor_viviendas;

-- Verificar que la tabla existe
SELECT 'Actualizando tabla viviendas...' AS status;

-- ============================================
-- 1. CAMPOS DE DIRECCIÓN DESGLOSADA
-- ============================================

-- Agregar campo calle
ALTER TABLE viviendas 
ADD COLUMN IF NOT EXISTS calle VARCHAR(255) NULL 
COMMENT 'Nombre de la calle';

-- Agregar campo bloque/portal
ALTER TABLE viviendas 
ADD COLUMN IF NOT EXISTS bloque_portal VARCHAR(50) NULL 
COMMENT 'Bloque o portal del edificio';

-- Agregar campo piso
ALTER TABLE viviendas 
ADD COLUMN IF NOT EXISTS piso VARCHAR(50) NULL 
COMMENT 'Número de piso';

-- Agregar campo escalera
ALTER TABLE viviendas 
ADD COLUMN IF NOT EXISTS escalera VARCHAR(50) NULL 
COMMENT 'Escalera del edificio';

-- Agregar campo letra/número
ALTER TABLE viviendas 
ADD COLUMN IF NOT EXISTS letra_numero VARCHAR(50) NULL 
COMMENT 'Letra o número de la puerta';

-- Agregar campo país (si no existe)
ALTER TABLE viviendas 
ADD COLUMN IF NOT EXISTS pais VARCHAR(100) NULL DEFAULT 'España'
COMMENT 'País de ubicación';

-- ============================================
-- 2. CAMPOS DE INFORMACIÓN LEGAL
-- ============================================

-- Verificar/actualizar campo estado_legal
ALTER TABLE viviendas 
MODIFY COLUMN estado_legal VARCHAR(50) NULL 
COMMENT 'Estado legal de la vivienda: Legal, Pendiente de legalización, En proceso, No aplica';

-- Verificar/actualizar campo referencia_catastral
ALTER TABLE viviendas 
MODIFY COLUMN referencia_catastral VARCHAR(100) NULL 
COMMENT 'Referencia catastral de la propiedad';

-- Verificar/actualizar campo numero_registro_autonomico
ALTER TABLE viviendas 
MODIFY COLUMN numero_registro_autonomico VARCHAR(100) NULL 
COMMENT 'Número de registro turístico autonómico (VUT, VFT, etc.)';

-- Verificar/actualizar campo fecha_registro
ALTER TABLE viviendas 
MODIFY COLUMN fecha_registro DATE NULL 
COMMENT 'Fecha de registro oficial';

-- ============================================
-- 3. CAMPOS DE PLATAFORMAS DE ALQUILER
-- ============================================

-- Agregar URL de Airbnb (pública)
ALTER TABLE viviendas 
ADD COLUMN IF NOT EXISTS url_airbnb TEXT NULL 
COMMENT 'URL pública de la propiedad en Airbnb';

-- Agregar URL de Booking.com (pública)
ALTER TABLE viviendas 
ADD COLUMN IF NOT EXISTS url_booking TEXT NULL 
COMMENT 'URL pública de la propiedad en Booking.com';

-- Verificar que existen los campos de iCal (ya deberían existir)
ALTER TABLE viviendas 
MODIFY COLUMN url_ical_airbnb TEXT NULL 
COMMENT 'URL del calendario iCal de Airbnb';

ALTER TABLE viviendas 
MODIFY COLUMN url_ical_booking TEXT NULL 
COMMENT 'URL del calendario iCal de Booking.com';

-- ============================================
-- 4. CAMPOS EXISTENTES - VERIFICACIÓN
-- ============================================

-- Verificar tipo_vivienda
ALTER TABLE viviendas 
MODIFY COLUMN tipo_vivienda VARCHAR(50) NULL 
COMMENT 'Tipo: Apartamento, Casa, Chalet, Estudio, Ático, Loft, Dúplex, Bungalow, Villa';

-- Verificar planta
ALTER TABLE viviendas 
MODIFY COLUMN planta INT NULL 
COMMENT 'Número de planta (0=bajo, -1=sótano, etc.)';

-- Verificar año de construcción
ALTER TABLE viviendas 
MODIFY COLUMN ano_construccion INT NULL 
COMMENT 'Año de construcción del edificio';

-- Verificar superficie_parcela
ALTER TABLE viviendas 
MODIFY COLUMN superficie_parcela DECIMAL(10,2) NULL 
COMMENT 'Superficie de la parcela en m² (si aplica)';

-- Verificar superficie
ALTER TABLE viviendas 
MODIFY COLUMN superficie DECIMAL(10,2) NULL 
COMMENT 'Superficie de la vivienda en m²';

-- Verificar barrio
ALTER TABLE viviendas 
MODIFY COLUMN barrio VARCHAR(100) NULL 
COMMENT 'Barrio o zona de la vivienda';

-- ============================================
-- 5. ÍNDICES PARA OPTIMIZACIÓN
-- ============================================

-- Crear índice para búsquedas por ciudad
CREATE INDEX IF NOT EXISTS idx_viviendas_ciudad ON viviendas(ciudad);

-- Crear índice para búsquedas por tipo
CREATE INDEX IF NOT EXISTS idx_viviendas_tipo ON viviendas(tipo_vivienda);

-- Crear índice para coordenadas (para búsquedas geográficas)
CREATE INDEX IF NOT EXISTS idx_viviendas_coords ON viviendas(latitud, longitud);

-- Crear índice para búsquedas por barrio
CREATE INDEX IF NOT EXISTS idx_viviendas_barrio ON viviendas(barrio);

-- ============================================
-- 6. VERIFICACIÓN FINAL
-- ============================================

SELECT 
    'Migración completada. Verificando estructura de la tabla...' AS status;

-- Mostrar estructura actualizada de la tabla
DESCRIBE viviendas;

-- Contar registros
SELECT 
    COUNT(*) as total_viviendas,
    COUNT(DISTINCT ciudad) as total_ciudades,
    COUNT(DISTINCT tipo_vivienda) as tipos_vivienda
FROM viviendas;

SELECT 'Migración completada exitosamente ✓' AS resultado;
