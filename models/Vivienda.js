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
    direccion: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    ciudad: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    codigo_postal: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    barrio: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    tipo_vivienda: {
        type: DataTypes.STRING(50),
        allowNull: true
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
        allowNull: true
    },
    planta: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    ano_construccion: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    superficie_parcela: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    amenities: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    imagen_url: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Ruta relativa de la imagen desde public/ (ej: /images/properties/nombre.jpg)'
    },
    estado_legal: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    referencia_catastral: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    numero_registro_autonomico: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    fecha_registro: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    activa: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    latitud: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true
    },
    longitud: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true
    },
    url_ical_airbnb: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    url_ical_booking: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'viviendas',
    timestamps: false
});

module.exports = Vivienda;
