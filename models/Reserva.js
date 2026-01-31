// Modelo de Reserva con Sequelize
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Reserva = sequelize.define('Reserva', {
    id_reserva: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_vivienda: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    fecha_inicio: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    fecha_fin: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    num_huespedes: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    importe_total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    plataforma: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    id_reserva_externo: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    estado: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    checkin_realizado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    checkout_realizado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'reservas',
    timestamps: false
});

module.exports = Reserva;
