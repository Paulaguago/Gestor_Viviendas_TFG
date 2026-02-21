// Archivo central para importar todos los modelos y definir relaciones
const User = require('./User');
const Vivienda = require('./Vivienda');
const Reserva = require('./Reserva');
const Huesped = require('./Huesped');
const CategoriaFinanciera = require('./CategoriaFinanciera');
const Transaccion = require('./Transaccion');
const Tarea = require('./Tarea');
const Incidencia = require('./Incidencia');
const DocumentoVivienda = require('./DocumentoVivienda');

// Definir relaciones entre modelos

// Usuario - Viviendas (1:N)
User.hasMany(Vivienda, { foreignKey: 'id_usuario', onDelete: 'CASCADE' });
Vivienda.belongsTo(User, { foreignKey: 'id_usuario' });

// Usuario - Categorías Financieras (1:N)
User.hasMany(CategoriaFinanciera, { foreignKey: 'id_usuario', onDelete: 'CASCADE' });
CategoriaFinanciera.belongsTo(User, { foreignKey: 'id_usuario' });

// Vivienda - Reservas (1:N)
Vivienda.hasMany(Reserva, { foreignKey: 'id_vivienda', onDelete: 'CASCADE' });
Reserva.belongsTo(Vivienda, { foreignKey: 'id_vivienda' });

// Vivienda - Transacciones (1:N)
Vivienda.hasMany(Transaccion, { foreignKey: 'id_vivienda', onDelete: 'CASCADE' });
Transaccion.belongsTo(Vivienda, { foreignKey: 'id_vivienda' });

// Vivienda - Tareas (1:N)
Vivienda.hasMany(Tarea, { foreignKey: 'id_vivienda', onDelete: 'CASCADE' });
Tarea.belongsTo(Vivienda, { foreignKey: 'id_vivienda' });

// Vivienda - Incidencias (1:N)
Vivienda.hasMany(Incidencia, { foreignKey: 'id_vivienda', onDelete: 'CASCADE' });
Incidencia.belongsTo(Vivienda, { foreignKey: 'id_vivienda' });

// Vivienda - Documentos (1:N)
Vivienda.hasMany(DocumentoVivienda, { foreignKey: 'id_vivienda', onDelete: 'CASCADE' });
DocumentoVivienda.belongsTo(Vivienda, { foreignKey: 'id_vivienda' });

// Reserva - Transacciones (1:N) - Opcional
Reserva.hasMany(Transaccion, { foreignKey: 'id_reserva', onDelete: 'SET NULL' });
Transaccion.belongsTo(Reserva, { foreignKey: 'id_reserva' });

// Categoría - Transacciones (1:N)
CategoriaFinanciera.hasMany(Transaccion, { foreignKey: 'id_categoria', onDelete: 'SET NULL' });
Transaccion.belongsTo(CategoriaFinanciera, { foreignKey: 'id_categoria' });

// Reserva - Huéspedes (N:M) - A través de tabla intermedia
Reserva.belongsToMany(Huesped, { 
    through: 'reserva_huesped', 
    foreignKey: 'id_reserva',
    otherKey: 'id_huesped',
    as: 'Huespedes',
    onDelete: 'CASCADE'
});
Huesped.belongsToMany(Reserva, { 
    through: 'reserva_huesped', 
    foreignKey: 'id_huesped',
    otherKey: 'id_reserva',
    as: 'Reservas',
    onDelete: 'CASCADE'
});

module.exports = {
    User,
    Vivienda,
    Reserva,
    Huesped,
    CategoriaFinanciera,
    Transaccion,
    Tarea,
    Incidencia,
    DocumentoVivienda
};
