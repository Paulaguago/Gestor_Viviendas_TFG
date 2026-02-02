# Script PowerShell para copiar imagen desde Descargas y crear vivienda

# 1. Configurar rutas
$imagenOrigen = "C:\Users\Paula\Downloads\foto.png"  # Cambia 'foto.png' por el nombre de tu imagen
$proyectoDir = "c:\Users\Paula\Documents\GitHub\Gestor_Viviendas_TFG"
$destinoDir = "$proyectoDir\public\images\properties"
$nombreImagen = "foto.png"  # Nombre que tendrá en el proyecto
$imagenDestino = "$destinoDir\$nombreImagen"

# 2. Verificar que la imagen existe en Descargas
if (-not (Test-Path $imagenOrigen)) {
    Write-Host "ERROR: No se encuentra la imagen en: $imagenOrigen" -ForegroundColor Red
    Write-Host "Asegurate de que el archivo existe y el nombre es correcto." -ForegroundColor Yellow
    exit 1
}

Write-Host "Imagen encontrada: $imagenOrigen" -ForegroundColor Green

# 3. Crear directorio de destino si no existe
if (-not (Test-Path $destinoDir)) {
    Write-Host "Creando directorio: $destinoDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $destinoDir -Force | Out-Null
}

# 4. Copiar imagen
Write-Host "Copiando imagen..." -ForegroundColor Yellow
Copy-Item -Path $imagenOrigen -Destination $imagenDestino -Force

if (Test-Path $imagenDestino) {
    Write-Host "Imagen copiada exitosamente a: $imagenDestino" -ForegroundColor Green
} else {
    Write-Host "ERROR: No se pudo copiar la imagen" -ForegroundColor Red
    exit 1
}

# 5. Mostrar SQL para ejecutar
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "IMAGEN LISTA. Ahora ejecuta este SQL:" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$sqlQuery = @"
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
    1,
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
    '/images/properties/$nombreImagen',
    'libre',
    1,
    85.00,
    'Casa acogedora con todas las comodidades',
    NOW(),
    NOW()
);
"@

Write-Host $sqlQuery -ForegroundColor White

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Copia el SQL de arriba y ejecutalo en MySQL" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 6. Guardar SQL en un archivo
$sqlFile = "$proyectoDir\documentacion\insert_vivienda_ejecutar.sql"
$sqlQuery | Out-File -FilePath $sqlFile -Encoding UTF8
Write-Host "SQL guardado en: $sqlFile" -ForegroundColor Green

Write-Host "`nProceso completado!" -ForegroundColor Green
