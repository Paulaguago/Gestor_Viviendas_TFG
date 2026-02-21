// Modelo de Vivienda con Sequelize
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Vivienda = sequelize.define('Vivienda', {
    id_vivienda: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_usuario: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    nombre: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Nombre descriptivo de la vivienda'
    },
    // Dirección separada en componentes
    calle: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    bloque_portal: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    piso: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    escalera: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    letra_numero: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    barrio: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    ciudad: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    pais: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: 'España'
    },
    codigo_postal: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    // Campo legacy para compatibilidad
    direccion: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    tipo_vivienda: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Apartamento, Casa, Chalet, Estudio, Ático, etc.'
    },
    categoria: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Categoría legal: Vivienda de uso turístico, Casa rural, Apartamento turístico, Vivienda turística'
    },
    num_banos: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    num_habitaciones: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    capacidad_maxima: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    superficie: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Superficie en m²'
    },
    planta: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Número de planta (0=bajo, -1=sótano, etc.)'
    },
    ano_construccion: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    superficie_parcela: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Superficie de la parcela en m² (si aplica)'
    },
    amenities: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'JSON con las comodidades seleccionadas'
    },
    imagen_url: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Ruta relativa de la imagen desde public/ (ej: /images/properties/nombre.jpg)'
    },
    // Información legal y administrativa
    estado_legal: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Legal, Pendiente de legalización, En proceso, etc.'
    },
    referencia_catastral: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    numero_registro_autonomico: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Número de registro de turismo autonómico (VUT, VFT, etc.)'
    },
    fecha_registro: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    activa: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    // Coordenadas geográficas
    latitud: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true
    },
    longitud: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true
    },
    // URLs de plataformas de alquiler
    url_ical_airbnb: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'URL del calendario iCal de Airbnb'
    },
    url_ical_booking: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'URL del calendario iCal de Booking'
    },
    url_booking: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'URL pública de la propiedad en Booking.com'
    },
    url_airbnb: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'URL pública de la propiedad en Airbnb'
    }
}, {
    tableName: 'viviendas',
    timestamps: false
});

module.exports = Vivienda;
