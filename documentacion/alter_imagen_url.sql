-- Script para modificar el campo imagen_url de TEXT a VARCHAR(255)
-- Ejecutar este script en tu base de datos MySQL

-- 1. Modificar el tipo de columna de TEXT a VARCHAR(255)
ALTER TABLE viviendas 
MODIFY COLUMN imagen_url VARCHAR(255) 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_general_ci 
DEFAULT NULL
COMMENT 'Ruta relativa de la imagen desde public/ (ej: /images/properties/nombre.jpg)';

-- 2. Verificar el cambio
DESCRIBE viviendas;

-- 3. Ver las viviendas con imagen
SELECT id_vivienda, nombre, imagen_url 
FROM viviendas 
WHERE imagen_url IS NOT NULL;

-- NOTA: VARCHAR(255) es suficiente para rutas de archivo
-- Ventajas sobre TEXT:
-- - Mejor rendimiento para búsquedas e indexación
-- - Menor uso de memoria
-- - Más apropiado para rutas que no exceden 255 caracteres
