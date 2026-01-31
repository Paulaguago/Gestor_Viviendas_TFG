// Modelo de Transacción con Sequelize
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Transaccion = sequelize.define('Transaccion', {
    id_transaccion: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_vivienda: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_reserva: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    id_categoria: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    tipo: {
        type: DataTypes.ENUM('ingreso', 'gasto'),
        allowNull: false
    },
    importe: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    fecha: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'transacciones',
    timestamps: false
});

module.exports = Transaccion;
