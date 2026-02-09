// Configuración de Sequelize para conectar a MySQL
const { Sequelize } = require('sequelize');

// Configuración de la conexión a la base de datos
const sequelize = new Sequelize({
    dialect: 'mysql',
    host: '127.0.0.1',
    port: 3306,
    database: 'tfg',
    username: 'root',
    password: 'root',
    
    // Opciones adicionales
    logging: console.log, // Muestra las consultas SQL en consola (útil para desarrollo)
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    define: {
        timestamps: true, // Añade createdAt y updatedAt automáticamente
        underscored: false, // Usa camelCase en lugar de snake_case
        freezeTableName: true // No pluraliza los nombres de las tablas
    }
});

// Función para probar la conexión
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('Conexión a MySQL establecida correctamente');
        return true;
    } catch (error) {
        console.error('Error al conectar con MySQL:', error.message);
        return false;
    }
};

// Función para sincronizar las tablas
const syncDatabase = async (force = false) => {
    try {
        // force: true borra y recrea las tablas (solo para desarrollo)
        // force: false solo crea las tablas si no existen
        await sequelize.sync({ force });
        
        console.log('\n🎉 ═══════════════════════════════════════════════════════════');
        console.log('✅ TABLAS CREADAS CORRECTAMENTE CON SEQUELIZE');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📋 Tablas disponibles en la base de datos:');
        console.log('   ✓ usuarios');
        console.log('   ✓ viviendas');
        console.log('   ✓ reservas');
        console.log('   ✓ huespedes');
        console.log('   ✓ reserva_huesped (tabla intermedia)');
        console.log('   ✓ categorias_financieras');
        console.log('   ✓ transacciones');
        console.log('   ✓ tareas');
        console.log('   ✓ incidencias');
        console.log('   ✓ documentos_vivienda');
        console.log('═══════════════════════════════════════════════════════════\n');
    } catch (error) {
        console.error('Error al sincronizar base de datos:', error.message);
    }
};

module.exports = {
    sequelize,
    testConnection,
    syncDatabase
};
