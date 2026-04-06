const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('./utils/passport');
const flash = require('connect-flash');

// Importa base de datos
const { sequelize, testConnection, syncDatabase } = require('./config/database');
const models = require('./models');

// Importa rutas
const generalRoutes = require('./routes/generalRoutes');
const authRoutes = require('./routes/authRoutes');
const alquilerRoutes = require('./routes/alquilerRoutes');
const ventaRoutes = require('./routes/ventaRoutes');

const { checkAuth, requireAuth } = require('./utils/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/modelos_predictivos', express.static(path.join(__dirname, 'modelos_predictivos')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Agregar soporte para métodos HTTP PUT y DELETE
const methodOverride = require('method-override');
app.use(methodOverride('_method'));

app.use(session({
    secret: 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(checkAuth);

app.use('/', generalRoutes);
app.use('/auth', authRoutes);

// Rutas de propiedades (protegidas)
const propiedadesRouter = require('./routes/propiedades');
app.use('/propiedades', requireAuth, propiedadesRouter);
app.use('/viviendas', requireAuth, propiedadesRouter); // Alias para compatibilidad

// Rutas de finanzas (protegidas)
const finanzasRouter = require('./routes/finanzas');
app.use('/finanzas', requireAuth, finanzasRouter);

app.use('/prediccion', requireAuth);
app.use('/alquiler', requireAuth, alquilerRoutes);
app.use('/venta', requireAuth, ventaRoutes);

app.get('/dashboard', requireAuth, async (req, res) => {
    const { Op } = require('sequelize');

    const emptyStats = {
        totalViviendas: 0, totalReservas: 0, proximasReservas: 0,
        tareasPendientes: 0, ingresosMes: '0.00', gastosMes: '0.00',
        balanceMes: '0.00', incidenciasPendientes: 0, ocupacion: 0, cobrosPendientes: 0
    };
    const emptyRender = {
        title: 'Dashboard - Gestor Viviendas', user: req.user,
        stats: emptyStats, chartData: { labels: [], ingresos: [], gastos: [] },
        listaProximasReservas: [], calendarReservas: [], calendarIncidencias: [], tareasPendientesList: [], notificaciones: []
    };

    try {
        const userId = req.user.id_usuario;
        const hoy    = new Date();

        // ── 1. Viviendas del usuario ────────────────────────────────────────
        const viviendas = await models.Vivienda.findAll({
            where: { id_usuario: userId, activa: true }
        });
        const viviendasIds = viviendas.map(v => v.id_vivienda);

        if (viviendasIds.length === 0) {
            return res.render('dashboard', { ...emptyRender, stats: { ...emptyStats, totalViviendas: 0 } });
        }

        // ── 2. Rango mes actual ─────────────────────────────────────────────
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const finMes    = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
        const inicioMesStr = inicioMes.toISOString().slice(0, 10);
        const finMesStr    = finMes.toISOString().slice(0, 10);
        const hoyStr       = hoy.toISOString().slice(0, 10);

        // ── 3. Transacciones del mes ────────────────────────────────────────
        const transaccionesMes = await models.Transaccion.findAll({
            where: {
                id_vivienda: { [Op.in]: viviendasIds },
                fecha: { [Op.between]: [inicioMesStr, finMesStr] }
            }
        });
        let ingresosMes = 0, gastosMes = 0;
        transaccionesMes.forEach(t => {
            const imp = parseFloat(t.importe) || 0;
            if (t.tipo === 'ingreso') ingresosMes += imp;
            else gastosMes += imp;
        });
        const balanceMes = ingresosMes - gastosMes;

        // ── 4. Reservas del mes (para ocupación) ───────────────────────────
        const reservasMes = await models.Reserva.findAll({
            where: {
                id_vivienda: { [Op.in]: viviendasIds },
                activa: true,
                [Op.or]: [
                    { fecha_inicio: { [Op.between]: [inicioMesStr, finMesStr] } },
                    { fecha_fin:    { [Op.between]: [inicioMesStr, finMesStr] } },
                    { fecha_inicio: { [Op.lte]: inicioMesStr }, fecha_fin: { [Op.gte]: finMesStr } }
                ]
            }
        });
        const diasMes      = finMes.getDate();
        const diasPosibles = viviendasIds.length * diasMes;
        let diasOcupados   = 0;
        reservasMes.forEach(r => {
            const s  = new Date(r.fecha_inicio);
            const e  = new Date(r.fecha_fin);
            const s2 = s < inicioMes ? inicioMes : s;
            const e2 = e > finMes    ? finMes    : e;
            diasOcupados += Math.max(0, Math.ceil((e2 - s2) / 86400000));
        });
        const ocupacion = diasPosibles > 0 ? ((diasOcupados / diasPosibles) * 100).toFixed(1) : 0;

        // ── 5. Cobros pendientes ────────────────────────────────────────────
        const cobrosPendientes = await models.Reserva.count({
            where: { id_vivienda: { [Op.in]: viviendasIds }, pagado: false, activa: true }
        });

        // ── 6. Próximas reservas (contador) ────────────────────────────────
        const proximasReservas = await models.Reserva.count({
            where: {
                id_vivienda: { [Op.in]: viviendasIds },
                fecha_inicio: { [Op.gte]: hoyStr },
                activa: true
            }
        });

        // ── 7. Total reservas históricas ────────────────────────────────────
        const totalReservas = await models.Reserva.count({
            where: { id_vivienda: { [Op.in]: viviendasIds } }
        });

        // ── 8. Incidencias & tareas pendientes ─────────────────────────────
        const incidenciasPendientes = await models.Incidencia.count({
            where: { id_vivienda: { [Op.in]: viviendasIds }, resuelta: false }
        });
        const tareasPendientes = await models.Tarea.count({
            where: { id_vivienda: { [Op.in]: viviendasIds }, estado: 'Pendiente' }
        });

        // ── 9. Chart data: últimos 6 meses ─────────────────────────────────
        const chartData = { labels: [], ingresos: [], gastos: [] };
        for (let i = 5; i >= 0; i--) {
            const d  = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
            const s  = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
            const e  = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
            const tx = await models.Transaccion.findAll({
                where: { id_vivienda: { [Op.in]: viviendasIds }, fecha: { [Op.between]: [s, e] } }
            });
            let ing = 0, gas = 0;
            tx.forEach(t => {
                const imp = parseFloat(t.importe) || 0;
                if (t.tipo === 'ingreso') ing += imp; else gas += imp;
            });
            chartData.labels.push(d.toLocaleDateString('es-ES', { month: 'short' }));
            chartData.ingresos.push(ing);
            chartData.gastos.push(gas);
        }

        // ── 10. Lista próximas reservas (con nombre de vivienda) ───────────
        const listaProximasReservas = await models.Reserva.findAll({
            where: {
                id_vivienda: { [Op.in]: viviendasIds },
                fecha_inicio: { [Op.gte]: hoyStr },
                activa: true
            },
            include: [{ model: models.Vivienda, attributes: ['nombre', 'direccion'] }],
            order: [['fecha_inicio', 'ASC']],
            limit: 10
        });

        // ── 11. Calendario: reservas del mes actual ─────────────────────────
        const calendarReservas = await models.Reserva.findAll({
            where: {
                id_vivienda: { [Op.in]: viviendasIds },
                activa: true,
                [Op.or]: [
                    { fecha_inicio: { [Op.between]: [inicioMesStr, finMesStr] } },
                    { fecha_fin:    { [Op.between]: [inicioMesStr, finMesStr] } },
                    { fecha_inicio: { [Op.lte]: inicioMesStr }, fecha_fin: { [Op.gte]: finMesStr } }
                ]
            },
            include: [{ model: models.Vivienda, attributes: ['nombre', 'direccion'] }]
        });

        // ── 12. Calendario: incidencias abiertas ────────────────────────────
        const calendarIncidencias = await models.Incidencia.findAll({
            where: { id_vivienda: { [Op.in]: viviendasIds }, resuelta: false },
            include: [{ model: models.Vivienda, attributes: ['nombre', 'direccion'] }]
        });

        // ── 13. Tareas pendientes ────────────────────────────────────────
        const tareasPendientesList = await models.Tarea.findAll({
            where: {
                id_vivienda: { [Op.in]: viviendasIds },
                estado: { [Op.notIn]: ['Completada', 'completada'] }
            },
            include: [{ model: models.Vivienda, attributes: ['nombre', 'direccion'] }],
            order: [['fecha_limite', 'ASC']]
        });

        // ── 14. Actividad reciente: últimas transacciones ──────────────────
        const transaccionesRecientes = await models.Transaccion.findAll({
            where: { id_vivienda: { [Op.in]: viviendasIds } },
            include: [{ model: models.Vivienda, attributes: ['nombre', 'direccion'] }],
            order: [['fecha', 'DESC']],
            limit: 8
        });
        const notificaciones = transaccionesRecientes.map(t => {
            const esIngreso    = t.tipo === 'ingreso';
            const nombreViv    = t.Vivienda ? (t.Vivienda.nombre || t.Vivienda.direccion) : 'Propiedad';
            const fechaTx      = new Date(t.fecha);
            const diasPasados  = Math.floor((hoy - fechaTx) / 86400000);
            const tiempoTexto  = diasPasados === 0 ? 'Hoy' : diasPasados === 1 ? 'Ayer' : `Hace ${diasPasados} días`;
            const desc         = t.descripcion ? ' · ' + t.descripcion.substring(0, 45) + (t.descripcion.length > 45 ? '…' : '') : '';
            return {
                color:   esIngreso ? 'success' : 'danger',
                tipo:    t.tipo,
                mensaje: `${esIngreso ? 'Ingreso' : 'Gasto'} de ${Number(t.importe).toLocaleString('es-ES')}€${desc} (${nombreViv})`,
                importe: Number(t.importe),
                tiempo:  tiempoTexto
            };
        });

        res.render('dashboard', {
            title: 'Dashboard - Gestor Viviendas',
            user: req.user,
            stats: {
                totalViviendas:      viviendasIds.length,
                totalReservas,
                proximasReservas,
                tareasPendientes,
                ingresosMes:         ingresosMes.toFixed(2),
                gastosMes:           gastosMes.toFixed(2),
                balanceMes:          balanceMes.toFixed(2),
                incidenciasPendientes,
                ocupacion,
                cobrosPendientes
            },
            chartData,
            listaProximasReservas,
            calendarReservas: calendarReservas.map(r => ({
                inicio:   r.fecha_inicio,
                fin:      r.fecha_fin,
                estado:   r.estado,
                titular:  r.titular_pago,
                vivienda: r.Vivienda ? (r.Vivienda.nombre || r.Vivienda.direccion) : ''
            })),
            calendarIncidencias: calendarIncidencias.map(i => ({
                fecha:    i.fecha_reporte,
                concepto: i.concepto,
                vivienda: i.Vivienda ? (i.Vivienda.nombre || i.Vivienda.direccion) : ''
            })),
            tareasPendientesList: tareasPendientesList.map(t => ({
                descripcion:  t.descripcion,
                fecha_limite: t.fecha_limite,
                estado:       t.estado,
                vivienda:     t.Vivienda ? (t.Vivienda.nombre || t.Vivienda.direccion) : ''
            })),
            notificaciones
        });
    } catch (error) {
        console.error('Error al cargar dashboard:', error);
        res.render('dashboard', emptyRender);
    }
});

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
