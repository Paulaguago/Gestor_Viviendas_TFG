const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('./utils/passport');
const flash = require('connect-flash');

// Import database
const { sequelize, testConnection, syncDatabase } = require('./config/database');
const models = require('./models');

// Import routes
const generalRoutes = require('./routes/generalRoutes');
const authRoutes = require('./routes/authRoutes');
const alquilerRoutes = require('./routes/alquilerRoutes');
const ventaRoutes = require('./routes/ventaRoutes');

// Import middleware
const { checkAuth, requireAuth } = require('./utils/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/modelos_predictivos', express.static(path.join(__dirname, 'modelos_predictivos')));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Agregar soporte para métodos HTTP PUT y DELETE
const methodOverride = require('method-override');
app.use(methodOverride('_method'));

// Session configuration
app.use(session({
    secret: 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Authentication middleware for all routes
app.use(checkAuth);

// Routes
app.use('/', generalRoutes);
app.use('/auth', authRoutes);

// Rutas de propiedades (protegidas)
const propiedadesRouter = require('./routes/propiedades');
app.use('/propiedades', requireAuth, propiedadesRouter);

// Protected routes
app.use('/prediccion', requireAuth);
app.use('/alquiler', requireAuth, alquilerRoutes);
app.use('/venta', requireAuth, ventaRoutes);

// Dashboard route (protected)
app.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id_usuario;
        
        // Obtener estadísticas del usuario
        const totalViviendas = await models.Vivienda.count({
            where: { id_usuario: userId, activa: true }
        });
        
        const totalReservas = await models.Reserva.count({
            include: [{
                model: models.Vivienda,
                where: { id_usuario: userId }
            }]
        });
        
        // Reservas próximas (próximos 7 días)
        const fechaHoy = new Date();
        const fecha7Dias = new Date();
        fecha7Dias.setDate(fechaHoy.getDate() + 7);
        
        const proximasReservas = await models.Reserva.count({
            where: {
                fecha_inicio: {
                    [require('sequelize').Op.between]: [fechaHoy, fecha7Dias]
                }
            },
            include: [{
                model: models.Vivienda,
                where: { id_usuario: userId }
            }]
        });
        
        // Tareas pendientes
        const tareasPendientes = await models.Tarea.count({
            where: { estado: 'Pendiente' },
            include: [{
                model: models.Vivienda,
                where: { id_usuario: userId }
            }]
        });
        
        // Ingresos del mes actual
        const inicioMes = new Date(fechaHoy.getFullYear(), fechaHoy.getMonth(), 1);
        const finMes = new Date(fechaHoy.getFullYear(), fechaHoy.getMonth() + 1, 0);
        
        const ingresosMes = await models.Transaccion.sum('importe', {
            where: {
                tipo: 'ingreso',
                fecha: {
                    [require('sequelize').Op.between]: [inicioMes, finMes]
                }
            },
            include: [{
                model: models.Vivienda,
                where: { id_usuario: userId }
            }]
        }) || 0;
        
        // Incidencias pendientes
        const incidenciasPendientes = await models.Incidencia.count({
            where: { resuelta: false },
            include: [{
                model: models.Vivienda,
                where: { id_usuario: userId }
            }]
        });
        
        // Calcular porcentaje de ocupación
        // Obtener días totales del mes
        const diasMes = finMes.getDate();
        const diasPosibles = totalViviendas * diasMes;
        
        // Obtener días ocupados (suma de días de todas las reservas del mes)
        const reservasMes = await models.Reserva.findAll({
            where: {
                [require('sequelize').Op.or]: [
                    {
                        fecha_inicio: {
                            [require('sequelize').Op.between]: [inicioMes, finMes]
                        }
                    },
                    {
                        fecha_fin: {
                            [require('sequelize').Op.between]: [inicioMes, finMes]
                        }
                    }
                ]
            },
            include: [{
                model: models.Vivienda,
                where: { id_usuario: userId }
            }]
        });
        
        let diasOcupados = 0;
        reservasMes.forEach(reserva => {
            const inicio = new Date(reserva.fecha_inicio);
            const fin = new Date(reserva.fecha_fin);
            const inicioCalculo = inicio < inicioMes ? inicioMes : inicio;
            const finCalculo = fin > finMes ? finMes : fin;
            const dias = Math.ceil((finCalculo - inicioCalculo) / (1000 * 60 * 60 * 24)) + 1;
            diasOcupados += dias;
        });
        
        const ocupacion = diasPosibles > 0 ? ((diasOcupados / diasPosibles) * 100).toFixed(1) : 0;
        
        // Obtener lista de próximas reservas con detalles
        const listaProximasReservas = await models.Reserva.findAll({
            where: {
                fecha_inicio: {
                    [require('sequelize').Op.between]: [fechaHoy, fecha7Dias]
                }
            },
            include: [{
                model: models.Vivienda,
                where: { id_usuario: userId }
            }],
            order: [['fecha_inicio', 'ASC']],
            limit: 5
        });
        
        // Generar notificaciones dinámicas
        const notificaciones = [];
        
        // Notificaciones de reservas recientes (últimas 24 horas)
        const fecha24h = new Date();
        fecha24h.setHours(fecha24h.getHours() - 24);
        
        const reservasRecientes = await models.Reserva.findAll({
            where: {
                createdAt: {
                    [require('sequelize').Op.gte]: fecha24h
                }
            },
            include: [{
                model: models.Vivienda,
                where: { id_usuario: userId }
            }],
            limit: 3
        });
        
        reservasRecientes.forEach(reserva => {
            const horasPasadas = Math.floor((fechaHoy - new Date(reserva.fecha_inicio)) / (1000 * 60 * 60));
            const tiempoTexto = horasPasadas < 1 ? 'Hace menos de 1 hora' : `Hace ${horasPasadas} ${horasPasadas === 1 ? 'hora' : 'horas'}`;
            notificaciones.push({
                icono: 'bi-check-circle',
                color: 'success',
                mensaje: `Nueva reserva confirmada en ${reserva.Vivienda.direccion}`,
                tiempo: tiempoTexto
            });
        });
        
        // Notificaciones de incidencias recientes
        const incidenciasRecientes = await models.Incidencia.findAll({
            where: {
                resuelta: false,
                fecha: {
                    [require('sequelize').Op.gte]: fecha24h
                }
            },
            include: [{
                model: models.Vivienda,
                where: { id_usuario: userId }
            }],
            order: [['fecha', 'DESC']],
            limit: 2
        });
        
        incidenciasRecientes.forEach(incidencia => {
            const horasPasadas = Math.floor((fechaHoy - new Date(incidencia.fecha)) / (1000 * 60 * 60));
            const tiempoTexto = horasPasadas < 1 ? 'Hace menos de 1 hora' : `Hace ${horasPasadas} ${horasPasadas === 1 ? 'hora' : 'horas'}`;
            notificaciones.push({
                icono: 'bi-exclamation-circle',
                color: 'warning',
                mensaje: `Nueva incidencia reportada: ${incidencia.descripcion.substring(0, 50)}${incidencia.descripcion.length > 50 ? '...' : ''}`,
                tiempo: tiempoTexto
            });
        });
        
        // Notificaciones de tareas próximas (en las próximas 24 horas)
        const fecha24hFuturo = new Date();
        fecha24hFuturo.setHours(fecha24hFuturo.getHours() + 24);
        
        const tareasCercanas = await models.Tarea.findAll({
            where: {
                completada: false,
                fecha_limite: {
                    [require('sequelize').Op.between]: [fechaHoy, fecha24hFuturo]
                }
            },
            include: [{
                model: models.Vivienda,
                where: { id_usuario: userId }
            }],
            order: [['fecha_limite', 'ASC']],
            limit: 2
        });
        
        tareasCercanas.forEach(tarea => {
            const horasRestantes = Math.ceil((new Date(tarea.fecha_limite) - fechaHoy) / (1000 * 60 * 60));
            const tiempoTexto = horasRestantes < 1 ? 'Vence pronto' : `Vence en ${horasRestantes} ${horasRestantes === 1 ? 'hora' : 'horas'}`;
            notificaciones.push({
                icono: 'bi-clock',
                color: 'info',
                mensaje: `Recordatorio: ${tarea.descripcion.substring(0, 50)}${tarea.descripcion.length > 50 ? '...' : ''}`,
                tiempo: tiempoTexto
            });
        });
        
        // Limitar a 5 notificaciones máximo
        const notificacionesLimitadas = notificaciones.slice(0, 5);
        
        res.render('dashboard', { 
            title: 'Dashboard - Gestor Viviendas',
            user: req.user,
            stats: {
                totalViviendas,
                totalReservas,
                proximasReservas,
                tareasPendientes,
                ingresosMes: ingresosMes.toFixed(2),
                incidenciasPendientes,
                ocupacion
            },
            listaProximasReservas,
            notificaciones: notificacionesLimitadas
        });
    } catch (error) {
        console.error('Error al cargar dashboard:', error);
        res.render('dashboard', { 
            title: 'Dashboard - Gestor Viviendas',
            user: req.user,
            stats: {
                totalViviendas: 0,
                totalReservas: 0,
                proximasReservas: 0,
                tareasPendientes: 0,
                ingresosMes: 0,
                incidenciasPendientes: 0,
                ocupacion: 0
            },
            listaProximasReservas: [],
            notificaciones: []
        });
    }
});

// Error handling
app.use((req, res) => {
    res.status(404).render('error', { 
        title: '404 - Página no encontrada',
        message: 'La página que buscas no existe.'
    });
});

// Iniciar servidor y conectar con la base de datos
const startServer = async () => {
    try {
        // Probar conexión a la base de datos
        const connected = await testConnection();
        
        if (connected) {
            // Sincronizar modelos (crear tablas si no existen)
            // IMPORTANTE: usar { force: false } para no borrar datos existentes
            await syncDatabase(false);
            
            // Iniciar servidor
            app.listen(PORT, () => {
                console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
            });
        } else {
            console.error('❌ No se pudo conectar a la base de datos. Verifica la configuración.');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
};

startServer();
