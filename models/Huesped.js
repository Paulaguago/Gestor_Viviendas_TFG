// Modelo de Huésped con Sequelize
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Huesped = sequelize.define('Huesped', {
    id_huesped: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    apellidos: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    dni: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    tipo_documento: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    fecha_expedicion_documento: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    email: {
        type: DataTypes.STRING(150),
        allowNull: true
    },
    telefono: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    nacionalidad: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    sexo: {
        type: DataTypes.CHAR(1),
        allowNull: true
    },
    fecha_nacimiento: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    direccion: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    localidad: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    pais: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    parentesco: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Parentesco del menor con el responsable de reserva'
    }
}, {
    tableName: 'huespedes',
    timestamps: false
});

module.exports = Huesped;
