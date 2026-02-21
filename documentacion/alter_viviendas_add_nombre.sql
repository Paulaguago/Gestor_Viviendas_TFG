-- Script para agregar el campo 'nombre' a la tabla viviendas
-- Fecha: 2026-02-15
-- Descripción: Agregar campo nombre descriptivo para cada vivienda

USE gestor_viviendas;

-- Agregar campo nombre si no existe
ALTER TABLE viviendas 
ADD COLUMN IF NOT EXISTS nombre VARCHAR(255) NULL 
COMMENT 'Nombre descriptivo de la vivienda'
AFTER id_usuario;

-- Verificar que se agregó correctamente
DESCRIBE viviendas;

-- Mostrar las viviendas actuales
SELECT id_vivienda, nombre, direccion, ciudad 
FROM viviendas 
LIMIT 5;

-- OPCIONAL: Actualizar las viviendas existentes con un nombre basado en tipo + direccion
UPDATE viviendas 
SET nombre = CONCAT(
    COALESCE(tipo_vivienda, 'Vivienda'), 
    ' - ', 
    COALESCE(ciudad, 'Ciudad'),
    IF(calle IS NOT NULL, CONCAT(' - ', SUBSTRING(calle, 1, 30)), '')
)
WHERE nombre IS NULL OR nombre = '';

-- Verificar actualización
SELECT id_vivienda, nombre, direccion, ciudad 
FROM viviendas 
LIMIT 5;
