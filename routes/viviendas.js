const express = require('express');
const router = express.Router();
const { Vivienda, Reserva, Tarea, DocumentoVivienda, Transaccion } = require('../models');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');

// Configuración de multer para subir documentos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/documentos/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Listar todas las viviendas
router.get('/', async (req, res) => {
  try {
    const viviendas = await Vivienda.findAll({
      where: { activo: true },
      order: [['createdAt', 'DESC']]
    });
    res.render('propiedades/index', { viviendas });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar las viviendas');
  }
});

// Mostrar formulario de nueva vivienda
router.get('/nueva', (req, res) => {
  res.render('propiedades/nueva');
});

// Crear nueva vivienda
router.post('/', async (req, res) => {
  try {
    const vivienda = await Vivienda.create({
      nombre: req.body.nombre,
      direccion: req.body.direccion,
      ciudad: req.body.ciudad,
      pais: req.body.pais,
      codigo_postal: req.body.codigo_postal,
      latitud: req.body.latitud,
      longitud: req.body.longitud,
      superficie: req.body.superficie,
      max_huespedes: req.body.max_huespedes,
      num_dormitorios: req.body.num_dormitorios,
      num_banos: req.body.num_banos,
      wifi: req.body.wifi === 'true',
      aire_acondicionado: req.body.aire_acondicionado === 'true',
      calefaccion: req.body.calefaccion === 'true',
      cocina: req.body.cocina === 'true',
      parking: req.body.parking === 'true',
      piscina: req.body.piscina === 'true',
      descripcion: req.body.descripcion,
      precio_noche: req.body.precio_noche,
      activo: true
    });
    
    res.redirect('/propiedades');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al crear la vivienda');
  }
});

// Ver detalle completo de vivienda
router.get('/:id', async (req, res) => {
  try {
    const vivienda = await Vivienda.findByPk(req.params.id, {
      include: [
        { model: DocumentoVivienda, as: 'documentos' },
        { model: Tarea, as: 'tareas', where: { completada: false }, required: false },
        { model: Reserva, as: 'reservas' }
      ]
    });

    if (!vivienda) {
      return res.status(404).send('Vivienda no encontrada');
    }

    // Obtener próximas reservas (próximos 30 días)
    const hoy = new Date();
    const treintaDias = new Date();
    treintaDias.setDate(treintaDias.getDate() + 30);

    const proximasReservas = await Reserva.findAll({
      where: {
        vivienda_id: req.params.id,
        fecha_entrada: {
          [Op.between]: [hoy, treintaDias]
        }
      },
      order: [['fecha_entrada', 'ASC']],
      limit: 5
    });

    // Calcular balance mensual
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

    const transaccionesMes = await Transaccion.findAll({
      where: {
        vivienda_id: req.params.id,
        fecha: {
          [Op.between]: [inicioMes, finMes]
        }
      }
    });

    const balanceMensual = transaccionesMes.reduce((acc, t) => {
      return acc + (t.tipo === 'ingreso' ? parseFloat(t.monto) : -parseFloat(t.monto));
    }, 0);

    // Calcular balance anual
    const inicioAnio = new Date(hoy.getFullYear(), 0, 1);
    const transaccionesAnio = await Transaccion.findAll({
      where: {
        vivienda_id: req.params.id,
        fecha: {
          [Op.gte]: inicioAnio
        }
      }
    });

    const balanceAnual = transaccionesAnio.reduce((acc, t) => {
      return acc + (t.tipo === 'ingreso' ? parseFloat(t.monto) : -parseFloat(t.monto));
    }, 0);

    // Calcular porcentaje de ocupación histórico
    const todasReservas = await Reserva.findAll({
      where: { vivienda_id: req.params.id }
    });

    let diasOcupados = 0;
    todasReservas.forEach(reserva => {
      const diff = new Date(reserva.fecha_salida) - new Date(reserva.fecha_entrada);
      diasOcupados += Math.ceil(diff / (1000 * 60 * 60 * 24));
    });

    const diasDesdeCreacion = Math.ceil((hoy - vivienda.createdAt) / (1000 * 60 * 60 * 24));
    const porcentajeOcupacion = diasDesdeCreacion > 0 ? (diasOcupados / diasDesdeCreacion * 100).toFixed(2) : 0;

    // Obtener reservas del mes actual para el calendario
    const reservasMes = await Reserva.findAll({
      where: {
        vivienda_id: req.params.id,
        [Op.or]: [
          {
            fecha_entrada: {
              [Op.between]: [inicioMes, finMes]
            }
          },
          {
            fecha_salida: {
              [Op.between]: [inicioMes, finMes]
            }
          }
        ]
      }
    });

    res.render('propiedades/detalle', {
      vivienda,
      proximasReservas,
      balanceMensual,
      balanceAnual,
      porcentajeOcupacion,
      reservasMes
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar el detalle de la vivienda');
  }
});

// Histórico de reservas
router.get('/:id/reservas/historico', async (req, res) => {
  try {
    const vivienda = await Vivienda.findByPk(req.params.id);
    const reservas = await Reserva.findAll({
      where: { vivienda_id: req.params.id },
      order: [['fecha_entrada', 'DESC']],
      include: [{ model: require('../models/Huesped'), as: 'huesped' }]
    });

    res.render('propiedades/historico-reservas', { vivienda, reservas });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar el histórico de reservas');
  }
});

// Mostrar formulario de edición
router.get('/:id/editar', async (req, res) => {
  try {
    const vivienda = await Vivienda.findByPk(req.params.id);
    if (!vivienda) {
      return res.status(404).send('Vivienda no encontrada');
    }
    res.render('propiedades/editar', { vivienda });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar el formulario de edición');
  }
});

// Actualizar vivienda
router.put('/:id', async (req, res) => {
  try {
    const vivienda = await Vivienda.findByPk(req.params.id);
    if (!vivienda) {
      return res.status(404).send('Vivienda no encontrada');
    }

    await vivienda.update({
      nombre: req.body.nombre,
      direccion: req.body.direccion,
      ciudad: req.body.ciudad,
      pais: req.body.pais,
      codigo_postal: req.body.codigo_postal,
      latitud: req.body.latitud,
      longitud: req.body.longitud,
      superficie: req.body.superficie,
      max_huespedes: req.body.max_huespedes,
      num_dormitorios: req.body.num_dormitorios,
      num_banos: req.body.num_banos,
      wifi: req.body.wifi === 'true',
      aire_acondicionado: req.body.aire_acondicionado === 'true',
      calefaccion: req.body.calefaccion === 'true',
      cocina: req.body.cocina === 'true',
      parking: req.body.parking === 'true',
      piscina: req.body.piscina === 'true',
      descripcion: req.body.descripcion,
      precio_noche: req.body.precio_noche
    });

    res.redirect(`/propiedades/${req.params.id}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al actualizar la vivienda');
  }
});

// Eliminar vivienda (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const vivienda = await Vivienda.findByPk(req.params.id);
    if (!vivienda) {
      return res.status(404).send('Vivienda no encontrada');
    }

    await vivienda.update({ activo: false });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error al eliminar la vivienda' });
  }
});

// Subir documento
router.post('/:id/documentos', upload.single('documento'), async (req, res) => {
  try {
    await DocumentoVivienda.create({
      vivienda_id: req.params.id,
      nombre: req.body.nombre,
      tipo: req.body.tipo,
      ruta_archivo: '/uploads/documentos/' + req.file.filename,
      fecha_expiracion: req.body.fecha_expiracion || null
    });

    res.redirect(`/propiedades/${req.params.id}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al subir el documento');
  }
});

module.exports = router;