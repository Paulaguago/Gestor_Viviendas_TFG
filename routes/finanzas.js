const express = require('express');
const router = express.Router();
const { requireAuth } = require('../utils/authMiddleware');
const { Vivienda, Reserva, Transaccion, CategoriaFinanciera } = require('../models');
const { Op } = require('sequelize');

router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id_usuario;
        const year = parseInt(req.query.año) || new Date().getFullYear();
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        // Propiedades activas del usuario
        const viviendas = await Vivienda.findAll({
            where: { id_usuario: userId, activa: true }
        });
        const viviendasIds = viviendas.map(v => v.id_vivienda);

        const emptyPayload = {
            user: req.user,
            isAuthenticated: true,
            year,
            kpis: { ingresos: 0, gastos: 0, beneficio: 0, pendientes: 0, totalReservas: 0, ocupacionMedia: 0 },
            monthlyData: [],
            rankingData: [],
            donutData: [],
            alerts: [],
            yearsAvailable: [],
            totalViviendas: 0
        };

        if (viviendasIds.length === 0) {
            return res.render('finanzas/index', emptyPayload);
        }

        // Transacciones del año
        const transacciones = await Transaccion.findAll({
            where: {
                id_vivienda: { [Op.in]: viviendasIds },
                fecha: { [Op.between]: [startDate, endDate] }
            },
            include: [{
                model: CategoriaFinanciera,
                attributes: ['nombre', 'tipo'],
                required: false
            }]
        });

        // Reservas del año
        const reservas = await Reserva.findAll({
            where: {
                id_vivienda: { [Op.in]: viviendasIds },
                fecha_inicio: { [Op.between]: [startDate, endDate] },
                activa: true
            }
        });

        // KPIs
        let ingresosTotales = 0;
        let gastosTotales = 0;
        transacciones.forEach(t => {
            const imp = parseFloat(t.importe) || 0;
            if (t.tipo === 'ingreso') ingresosTotales += imp;
            else gastosTotales += imp;
        });

        const pendientes = reservas
            .filter(r => r.pagado === false)
            .reduce((s, r) => s + (parseFloat(r.importe_total) || 0), 0);

        const totalReservas = reservas.length;

        const diasYear = 365;
        let totalOcupPct = 0;
        viviendasIds.forEach(vid => {
            const rv = reservas.filter(r => r.id_vivienda === vid);
            let dias = 0;
            rv.forEach(r => {
                const d1 = new Date(r.fecha_inicio);
                const d2 = new Date(r.fecha_fin);
                dias += Math.max(0, Math.round((d2 - d1) / 86400000));
            });
            totalOcupPct += Math.min(100, (dias / diasYear) * 100);
        });
        const ocupacionMedia = Math.round(totalOcupPct / viviendasIds.length);

        // Datos mensuales
        const mesesAbr = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const monthlyData = mesesAbr.map((mes, i) => {
            const m = i + 1;
            const tMonth = transacciones.filter(t => new Date(t.fecha).getMonth() + 1 === m);
            const rMonth = reservas.filter(r => new Date(r.fecha_inicio).getMonth() + 1 === m);
            let ing = 0, gas = 0;
            tMonth.forEach(t => {
                const imp = parseFloat(t.importe) || 0;
                if (t.tipo === 'ingreso') ing += imp;
                else gas += imp;
            });
            return { mes, ingresos: ing, gastos: gas, balance: ing - gas, reservas: rMonth.length };
        });

        // Ranking por propiedad
        const rankingData = viviendasIds.map(vid => {
            const viv = viviendas.find(v => v.id_vivienda === vid);
            const tViv = transacciones.filter(t => t.id_vivienda === vid);
            const rViv = reservas.filter(r => r.id_vivienda === vid);
            let ing = 0, gas = 0;
            tViv.forEach(t => {
                const imp = parseFloat(t.importe) || 0;
                if (t.tipo === 'ingreso') ing += imp;
                else gas += imp;
            });
            let diasOcup = 0;
            rViv.forEach(r => {
                const d1 = new Date(r.fecha_inicio);
                const d2 = new Date(r.fecha_fin);
                diasOcup += Math.max(0, Math.round((d2 - d1) / 86400000));
            });
            const ocupacion = Math.min(100, Math.round((diasOcup / diasYear) * 100));
            const rentabilidad = ing > 0 ? Math.round(((ing - gas) / ing) * 100) : 0;
            return {
                id: vid,
                nombre: viv ? (viv.nombre || viv.direccion || `Vivienda ${vid}`) : `Vivienda ${vid}`,
                tipo: viv ? (viv.tipo_vivienda || 'Propiedad') : 'Propiedad',
                ciudad: viv ? (viv.ciudad || '') : '',
                ingresos: ing,
                gastos: gas,
                beneficio: ing - gas,
                ocupacion,
                reservas: rViv.length,
                rentabilidad
            };
        }).sort((a, b) => b.ingresos - a.ingresos);

        // Donut: gastos por categoría
        // Palabras clave para inferir categoría cuando no hay id_categoria
        const KEYWORD_CATEGORIES = [
            { keys: ['luz', 'electric', 'electricidad', 'endesa', 'iberdrola', 'suministro eléc'], label: 'Electricidad' },
            { keys: ['agua', 'suministro agua', 'canal', 'aguas'], label: 'Agua' },
            { keys: ['gas ', 'calefacc', 'naturgy', 'repsol gas', 'butano'], label: 'Gas/Calefacción' },
            { keys: ['limpieza', 'limpiar', 'limpiador', 'servicio limpieza'], label: 'Limpieza' },
            { keys: ['mantenimiento', 'reparaci', 'arreglo', 'fontanero', 'electricista', 'pintura', 'obra'], label: 'Mantenimiento' },
            { keys: ['seguro', 'allianz', 'mapfre', 'mutua', 'axa '], label: 'Seguros' },
            { keys: ['comunidad', 'gastos comunidad', 'administrador'], label: 'Comunidad' },
            { keys: ['ibi', 'impuesto', 'catastro', 'municipal', 'ayuntamiento'], label: 'Impuestos' },
            { keys: ['hipoteca', 'préstamo', 'prestamo', 'cuota', 'financiaci'], label: 'Hipoteca/Préstamo' },
            { keys: ['internet', 'wifi', 'fibra', 'movistar', 'vodafone', 'orange', 'telecomunic'], label: 'Internet/Telecom' },
            { keys: ['basura', 'residuo', 'recogida'], label: 'Basura/Residuos' },
            { keys: ['plataforma', 'airbnb', 'booking', 'comisión', 'comision', 'fee'], label: 'Comisiones Plataforma' },
        ];

        function inferCategory(t) {
            if (t.CategoriaFinanciera) return t.CategoriaFinanciera.nombre;
            const desc = (t.descripcion || '').toLowerCase();
            if (desc) {
                for (const { keys, label } of KEYWORD_CATEGORIES) {
                    if (keys.some(k => desc.includes(k))) return label;
                }
                // Usar la descripción como etiqueta (hasta 30 chars) si no coincide ninguna clave
                const trimmed = t.descripcion.trim();
                return trimmed.length > 30 ? trimmed.substring(0, 28) + '…' : trimmed;
            }
            return 'Sin categoría';
        }

        const catMap = {};
        transacciones.filter(t => t.tipo === 'gasto').forEach(t => {
            const cat = inferCategory(t);
            catMap[cat] = (catMap[cat] || 0) + (parseFloat(t.importe) || 0);
        });
        const donutData = Object.entries(catMap)
            .map(([nombre, importe]) => ({ nombre, importe: Math.round(importe * 100) / 100 }))
            .sort((a, b) => b.importe - a.importe);

        // Alertas automáticas
        const alerts = [];
        const pendientesCount = reservas.filter(r => r.pagado === false).length;
        if (pendientesCount > 0) {
            alerts.push({ tipo: 'warning', texto: `${pendientesCount} reserva(s) pendiente(s) de cobro — ${pendientes.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €` });
        }
        if (gastosTotales > ingresosTotales && ingresosTotales > 0) {
            alerts.push({ tipo: 'danger', texto: `Los gastos superan los ingresos en ${(gastosTotales - ingresosTotales).toLocaleString('es-ES', { minimumFractionDigits: 2 })} € este año` });
        }
        const currentMonthIdx = new Date().getFullYear() === year ? new Date().getMonth() : 11;
        if (currentMonthIdx >= 1) {
            const curIng = monthlyData[currentMonthIdx].ingresos;
            const prevIng = monthlyData[currentMonthIdx - 1].ingresos;
            if (prevIng > 0 && curIng > prevIng * 1.15) {
                alerts.push({ tipo: 'success', texto: `Ingresos de ${mesesAbr[currentMonthIdx]} un ${Math.round((curIng / prevIng - 1) * 100)}% superiores al mes anterior` });
            }
        }
        const propNeg = rankingData.find(r => r.rentabilidad < 0 && r.ingresos > 0);
        if (propNeg) {
            alerts.push({ tipo: 'info', texto: `"${propNeg.nombre}" presenta rentabilidad negativa (${propNeg.rentabilidad}%) en ${year}` });
        }
        if (ocupacionMedia < 20 && totalReservas > 0) {
            alerts.push({ tipo: 'info', texto: `Ocupación media baja (${ocupacionMedia}%). Considera revisar tu estrategia de precios` });
        }

        // Años disponibles (selector)
        const curYear = new Date().getFullYear();
        const yearsAvailable = [];
        for (let y = curYear; y >= curYear - 4; y--) yearsAvailable.push(y);

        return res.render('finanzas/index', {
            user: req.user,
            isAuthenticated: true,
            year,
            kpis: {
                ingresos: ingresosTotales,
                gastos: gastosTotales,
                beneficio: ingresosTotales - gastosTotales,
                pendientes,
                totalReservas,
                ocupacionMedia
            },
            monthlyData,
            rankingData,
            donutData,
            alerts,
            yearsAvailable,
            totalViviendas: viviendasIds.length
        });
    } catch (err) {
        console.error('Error finanzas:', err);
        res.status(500).render('error', { message: 'Error al cargar el panel de finanzas', error: err });
    }
});

module.exports = router;
