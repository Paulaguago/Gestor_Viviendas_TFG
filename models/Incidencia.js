// Modelo de Incidencia con Sequelize
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Incidencia = sequelize.define('Incidencia', {
    id_incidencia: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_vivienda: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    concepto: {
        type: DataTypes.STRING(150),
        allowNull: true
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    fecha_reporte: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    resuelta: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'incidencias',
    timestamps: false
});

module.exports = Incidencia;
