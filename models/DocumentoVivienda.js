// Modelo de Documento de Vivienda con Sequelize
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DocumentoVivienda = sequelize.define('DocumentoVivienda', {
    id_documento: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_vivienda: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    tipo_documento: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    url_documento: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    fecha_subida: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'documentos_vivienda',
    timestamps: false
});

module.exports = DocumentoVivienda;
