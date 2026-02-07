-- ============================================
-- Script para agregar campo CATEGORIA a la tabla VIVIENDAS
-- Fecha: 2026-02-07
-- Descripción: Agregar categoría de alquiler turístico
-- ============================================

USE gestor_viviendas;

-- Agregar columna categoria después de tipo_vivienda
ALTER TABLE viviendas 
ADD COLUMN IF NOT EXISTS categoria VARCHAR(100) NULL 
COMMENT 'Categoría legal: Vivienda de uso turístico, Casa rural, Apartamento turístico, Vivienda turística'
AFTER tipo_vivienda;

-- Verificar la estructura actualizada
DESCRIBE viviendas;

-- Mostrar las viviendas existentes
SELECT 
    id_vivienda,
    CONCAT(calle, ', ', ciudad) AS direccion,
    tipo_vivienda,
    categoria,
    estado_legal
FROM viviendas
WHERE id_usuario = 1
LIMIT 5;

SELECT 'Campo "categoria" agregado exitosamente ✓' AS resultado;
