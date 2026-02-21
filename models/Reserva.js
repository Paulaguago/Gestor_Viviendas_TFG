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
    },
    activa: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    pagado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    hora_llegada: {
        type: DataTypes.STRING(5),
        allowNull: true,
        defaultValue: '15:00'
    },
    hora_salida: {
        type: DataTypes.STRING(5),
        allowNull: true,
        defaultValue: '11:00'
    }
}, {
    tableName: 'reservas',
    timestamps: false
});

module.exports = Reserva;
