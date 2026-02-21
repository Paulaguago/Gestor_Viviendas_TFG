const express = require('express');
const router = express.Router();
const { Vivienda, Reserva, Tarea, DocumentoVivienda, Transaccion } = require('../models');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const uploadImage = require('../config/multer'); // Configuración de multer para imágenes

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

// Listar todas las viviendas - GET /propiedades/
router.get('/', async (req, res) => {
  try {
    // Obtener todas las viviendas activas del usuario
    const viviendas = await Vivienda.findAll({
      where: { 
        id_usuario: req.user.id_usuario,
        activa: true 
      },
      order: [['id_vivienda', 'DESC']]
    });

    // Calcular estadísticas simples
    const totalPropiedades = viviendas.length;
    // Por ahora sin cálculo de ocupación hasta configurar las relaciones
    const viviendasOcupadas = 0;
    const viviendasLibres = totalPropiedades - viviendasOcupadas;

    res.render('propiedades/mostrarPropiedades', {
      title: 'Mis Propiedades',
      user: req.user,
      isAuthenticated: true,
      viviendas,
      stats: {
        total: totalPropiedades,
        ocupadas: viviendasOcupadas,
        libres: viviendasLibres
      },
      mensaje: req.query.mensaje,
      error: req.query.error
    });
  } catch (error) {
    console.error('Error al cargar propiedades:', error);
    res.render('propiedades/mostrarPropiedades', {
      title: 'Mis Propiedades',
      user: req.user,
      isAuthenticated: true,
      viviendas: [],
      stats: { total: 0, ocupadas: 0, libres: 0 }
    });
  }
});

// Mostrar formulario de nueva vivienda - GET /propiedades/nueva
router.get('/nueva', (req, res) => {
  res.render('propiedades/nueva', {
    title: 'Nueva Propiedad - Gestor de Viviendas',
    user: req.user,
    isAuthenticated: true
  });
});

// Crear nueva vivienda
router.post('/', uploadImage.single('imagen'), async (req, res) => {
  try {
    const userId = req.user ? req.user.id_usuario : 1;
    
    // Construir dirección completa a partir de componentes (para compatibilidad)
    const direccionCompleta = [
      req.body.calle,
      req.body.bloque_portal ? `Bloque ${req.body.bloque_portal}` : null,
      req.body.piso ? `Piso ${req.body.piso}` : null,
      req.body.escalera ? `Escalera ${req.body.escalera}` : null,
      req.body.letra_numero
    ].filter(Boolean).join(', ');
    
    // Preparar datos de la vivienda
    const viviendaData = {
      id_usuario: userId,
      // Información básica
      nombre: req.body.nombre,
      descripcion: req.body.descripcion,
      precio_noche: req.body.precio_noche,
      
      // Dirección desglosada
      calle: req.body.calle,
      bloque_portal: req.body.bloque_portal,
      piso: req.body.piso,
      escalera: req.body.escalera,
      letra_numero: req.body.letra_numero,
      barrio: req.body.barrio,
      ciudad: req.body.ciudad,
      pais: req.body.pais || 'España',
      codigo_postal: req.body.codigo_postal,
      direccion: direccionCompleta, // Campo legacy
      
      // Coordenadas
      latitud: req.body.latitud,
      longitud: req.body.longitud,
      
      // Características
      tipo_vivienda: req.body.tipo_vivienda,
      categoria: req.body.categoria,
      superficie: req.body.superficie,
      superficie_parcela: req.body.superficie_parcela || req.body.superficie, // Por defecto = superficie
      planta: req.body.planta,
      ano_construccion: req.body.ano_construccion,
      num_habitaciones: req.body.num_dormitorios,
      num_banos: req.body.num_banos,
      capacidad_maxima: req.body.max_huespedes,
      
      // Información legal
      estado_legal: req.body.estado_legal,
      referencia_catastral: req.body.referencia_catastral,
      numero_registro_autonomico: req.body.numero_registro_autonomico,
      fecha_registro: req.body.fecha_registro,
      
      // URLs de plataformas
      url_airbnb: req.body.url_airbnb,
      url_booking: req.body.url_booking,
      
      // Comodidades en formato JSON
      amenities: req.body['amenity[]'] ? JSON.stringify(req.body['amenity[]']) : null,
      
      // Comodidades (legacy - checkbox individuales para compatibilidad)
      wifi: req.body.wifi === 'true',
      aire_acondicionado: req.body.aire_acondicionado === 'true',
      calefaccion: req.body.calefaccion === 'true',
      cocina: req.body.cocina === 'true',
      parking: req.body.parking === 'true',
      piscina: req.body.piscina === 'true',
      
      activa: true
    };

    // Si se subió una imagen, agregar la ruta
    if (req.file) {
      viviendaData.imagen_url = '/images/properties/' + req.file.filename;
    }
    
    const vivienda = await Vivienda.create(viviendaData);
    
    res.redirect('/propiedades');
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al crear la vivienda', 
      error: error.message 
    });
  }
});

// Subir/actualizar imagen de vivienda existente
router.post('/:id/imagen', uploadImage.single('imagen'), async (req, res) => {
  try {
    const viviendaId = req.params.id;
    
    // Verificar que la vivienda existe
    const vivienda = await Vivienda.findByPk(viviendaId);
    if (!vivienda) {
      return res.status(404).json({ success: false, message: 'Vivienda no encontrada' });
    }

    // Verificar que se subió un archivo
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se proporcionó ninguna imagen' });
    }

    // Actualizar la ruta de la imagen
    const nuevaRuta = '/images/properties/' + req.file.filename;
    await vivienda.update({ imagen_url: nuevaRuta });

    res.json({ 
      success: true, 
      message: 'Imagen actualizada correctamente',
      imagen_url: nuevaRuta 
    });
  } catch (error) {
    console.error('Error al subir imagen:', error);
    res.status(500).json({ success: false, message: 'Error al subir la imagen' });
  }
});

// Ver detalle completo de vivienda
router.get('/:id', async (req, res) => {
  try {
    const vivienda = await Vivienda.findByPk(req.params.id);

    if (!vivienda) {
      return res.status(404).send('Vivienda no encontrada');
    }

    // Obtener próximas reservas (próximos 30 días) - solo si el modelo existe
    const hoy = new Date();
    const treintaDias = new Date();
    treintaDias.setDate(treintaDias.getDate() + 30);

    let proximasReservas = [];
    let balanceMensual = 0;
    let balanceAnual = 0;
    let porcentajeOcupacion = 0;
    let reservasMes = [];

    try {
      proximasReservas = await Reserva.findAll({
        where: {
          vivienda_id: req.params.id,
          fecha_entrada: {
            [Op.between]: [hoy, treintaDias]
          }
        },
        order: [['fecha_entrada', 'ASC']],
        limit: 5
      });
    } catch (e) {
      console.log('No se pudieron cargar las reservas:', e.message);
    }

    // Calcular balance mensual
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

    try {
      const transaccionesMes = await Transaccion.findAll({
        where: {
          vivienda_id: req.params.id,
          fecha: {
            [Op.between]: [inicioMes, finMes]
          }
        }
      });

      balanceMensual = transaccionesMes.reduce((acc, t) => {
        return acc + (t.tipo === 'ingreso' ? parseFloat(t.monto) : -parseFloat(t.monto));
      }, 0);
    } catch (e) {
      console.log('No se pudo calcular balance mensual:', e.message);
    }

    // Calcular balance anual
    const inicioAnio = new Date(hoy.getFullYear(), 0, 1);
    
    try {
      const transaccionesAnio = await Transaccion.findAll({
        where: {
          vivienda_id: req.params.id,
          fecha: {
            [Op.gte]: inicioAnio
          }
        }
      });

      balanceAnual = transaccionesAnio.reduce((acc, t) => {
        return acc + (t.tipo === 'ingreso' ? parseFloat(t.monto) : -parseFloat(t.monto));
      }, 0);
    } catch (e) {
      console.log('No se pudo calcular balance anual:', e.message);
    }

    // Calcular porcentaje de ocupación histórico
    try {
      const todasReservas = await Reserva.findAll({
        where: { vivienda_id: req.params.id }
      });

      let diasOcupados = 0;
      todasReservas.forEach(reserva => {
        const diff = new Date(reserva.fecha_salida) - new Date(reserva.fecha_entrada);
        diasOcupados += Math.ceil(diff / (1000 * 60 * 60 * 24));
      });

      const diasDesdeCreacion = Math.ceil((hoy - new Date()) / (1000 * 60 * 60 * 24)) || 365;
      porcentajeOcupacion = diasDesdeCreacion > 0 ? (diasOcupados / diasDesdeCreacion * 100).toFixed(2) : 0;
    } catch (e) {
      console.log('No se pudo calcular ocupación:', e.message);
    }

    // Obtener reservas del mes actual para el calendario
    try {
      reservasMes = await Reserva.findAll({
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
    } catch (e) {
      console.log('No se pudieron cargar reservas del mes:', e.message);
    }

    res.render('propiedades/detalle', {
      title: 'Detalle de Propiedad',
      user: req.user,
      isAuthenticated: true,
      vivienda,
      proximasReservas,
      balanceMensual,
      balanceAnual,
      porcentajeOcupacion,
      reservasMes
    });
  } catch (error) {
    console.error('Error al cargar el detalle de la vivienda:', error);
    res.status(500).send('Error al cargar el detalle de la vivienda: ' + error.message);
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

// Eliminar vivienda (soft delete - marca activa como false)
router.delete('/:id', async (req, res) => {
  try {
    const vivienda = await Vivienda.findByPk(req.params.id);
    if (!vivienda) {
      return res.status(404).json({ success: false, error: 'Vivienda no encontrada' });
    }

    // Verificar que la vivienda pertenece al usuario
    if (vivienda.id_usuario !== req.user.id_usuario) {
      return res.status(403).json({ success: false, error: 'No tienes permiso para eliminar esta vivienda' });
    }

    // Soft delete: marcar como inactiva
    await vivienda.update({ activa: false });
    
    // Redirigir con mensaje de éxito
    res.redirect('/propiedades?mensaje=eliminada');
  } catch (error) {
    console.error('Error al desactivar vivienda:', error);
    res.redirect('/propiedades?error=eliminacion');
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
