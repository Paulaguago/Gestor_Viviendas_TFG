// Modelo de Categoría Financiera con Sequelize
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CategoriaFinanciera = sequelize.define('CategoriaFinanciera', {
    id_categoria: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_usuario: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    tipo: {
        type: DataTypes.ENUM('ingreso', 'gasto'),
        allowNull: false
    }
}, {
    tableName: 'categorias_financieras',
    timestamps: false
});

module.exports = CategoriaFinanciera;
