const express = require('express');
const router = express.Router();
const { Vivienda, Reserva, Tarea, DocumentoVivienda, Transaccion, Huesped } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
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
    
    console.log('Datos recibidos:', req.body);
    console.log('Archivo recibido:', req.file);
    
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
      nombre: req.body.nombre || null,
      
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
      latitud: req.body.latitud ? parseFloat(req.body.latitud) : null,
      longitud: req.body.longitud ? parseFloat(req.body.longitud) : null,
      
      // Características
      tipo_vivienda: req.body.tipo_vivienda || null,
      categoria: req.body.categoria || null,
      superficie: req.body.superficie ? parseFloat(req.body.superficie) : null,
      superficie_parcela: req.body.superficie_parcela ? parseFloat(req.body.superficie_parcela) : (req.body.superficie ? parseFloat(req.body.superficie) : null),
      planta: req.body.planta ? parseInt(req.body.planta) : null,
      ano_construccion: req.body.ano_construccion ? parseInt(req.body.ano_construccion) : null,
      num_habitaciones: req.body.num_habitaciones ? parseInt(req.body.num_habitaciones) : null,
      num_banos: req.body.num_banos ? parseInt(req.body.num_banos) : null,
      capacidad_maxima: req.body.capacidad_maxima ? parseInt(req.body.capacidad_maxima) : null,
      
      // Información legal
      estado_legal: req.body.estado_legal,
      referencia_catastral: req.body.referencia_catastral,
      numero_registro_autonomico: req.body.numero_registro_autonomico,
      fecha_registro: req.body.fecha_registro,
      
      // URLs de plataformas
      url_airbnb: req.body.url_airbnb || null,
      url_booking: req.body.url_booking || null,
      
      // Comodidades en formato JSON string
      amenities: (() => {
        const amenitiesData = req.body['amenities[]'] || req.body.amenities;
        if (!amenitiesData) return null;
        if (typeof amenitiesData === 'string') return amenitiesData;
        if (Array.isArray(amenitiesData)) return JSON.stringify(amenitiesData);
        if (typeof amenitiesData === 'object') return JSON.stringify(amenitiesData);
        return null;
      })(),
      
      activa: true
    };

    // Si se subió una imagen, agregar la ruta
    if (req.file) {
      viviendaData.imagen_url = '/images/properties/' + req.file.filename;
    }
    
    const vivienda = await Vivienda.create(viviendaData);
    
    console.log('Vivienda creada exitosamente:', vivienda.id_vivienda);
    res.json({ success: true, message: 'Vivienda creada exitosamente', id: vivienda.id_vivienda });
  } catch (error) {
    console.error('Error al crear la vivienda:', error);
    console.error('Stack:', error.stack);
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
          id_vivienda: req.params.id,
          activa: true,
          fecha_inicio: {
            [Op.between]: [hoy, treintaDias]
          }
        },
        order: [['fecha_inicio', 'ASC']],
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
          id_vivienda: req.params.id,
          fecha: {
            [Op.between]: [inicioMes, finMes]
          }
        }
      });

      balanceMensual = transaccionesMes.reduce((acc, t) => {
        return acc + (t.tipo === 'ingreso' ? parseFloat(t.importe) : -parseFloat(t.importe));
      }, 0);
    } catch (e) {
      console.log('No se pudo calcular balance mensual:', e.message);
    }

    // Calcular balance anual
    const inicioAnio = new Date(hoy.getFullYear(), 0, 1);
    
    try {
      const transaccionesAnio = await Transaccion.findAll({
        where: {
          id_vivienda: req.params.id,
          fecha: {
            [Op.gte]: inicioAnio
          }
        }
      });

      balanceAnual = transaccionesAnio.reduce((acc, t) => {
        return acc + (t.tipo === 'ingreso' ? parseFloat(t.importe) : -parseFloat(t.importe));
      }, 0);
    } catch (e) {
      console.log('No se pudo calcular balance anual:', e.message);
    }

    // Calcular porcentaje de ocupación del año actual (1 enero - 31 dic)
    try {
      const inicioAnioOcup = new Date(hoy.getFullYear(), 0, 1);
      const finAnioOcup    = new Date(hoy.getFullYear(), 11, 31);
      const diasAnio = hoy.getFullYear() % 4 === 0 ? 366 : 365;

      const reservasAnioOcup = await Reserva.findAll({
        where: {
          id_vivienda: req.params.id,
          activa: true,
          [Op.or]: [
            { fecha_inicio: { [Op.between]: [inicioAnioOcup, finAnioOcup] } },
            { fecha_fin:    { [Op.between]: [inicioAnioOcup, finAnioOcup] } },
            { fecha_inicio: { [Op.lte]: inicioAnioOcup }, fecha_fin: { [Op.gte]: finAnioOcup } }
          ]
        }
      });

      let diasOcupados = 0;
      reservasAnioOcup.forEach(reserva => {
        const ini = new Date(Math.max(new Date(reserva.fecha_inicio), inicioAnioOcup));
        const fin = new Date(Math.min(new Date(reserva.fecha_fin),    finAnioOcup));
        const diff = fin - ini;
        if (diff > 0) diasOcupados += Math.ceil(diff / (1000 * 60 * 60 * 24));
      });

      porcentajeOcupacion = Math.min((diasOcupados / diasAnio * 100), 100).toFixed(1);
    } catch (e) {
      console.log('No se pudo calcular ocupación:', e.message);
    }

    // Obtener reservas del mes actual para el calendario
    try {
      reservasMes = await Reserva.findAll({
        where: {
          id_vivienda: req.params.id,
          activa: true,
          [Op.or]: [
            { fecha_inicio: { [Op.between]: [inicioMes, finMes] } },
            { fecha_fin:   { [Op.between]: [inicioMes, finMes] } }
          ]
        }
      });
    } catch (e) {
      console.log('No se pudieron cargar reservas del mes:', e.message);
    }

    // Obtener TODAS las reservas de la vivienda para la tabla de gestión
    let todasReservas = [];
    try {
      todasReservas = await Reserva.findAll({
        where: { id_vivienda: req.params.id },
        order: [['fecha_inicio', 'DESC']],
        include: [{ model: Huesped, as: 'Huespedes', through: { attributes: [] } }]
      });
    } catch (e) {
      console.log('No se pudieron cargar todas las reservas:', e.message);
    }

    // Obtener TODAS las transacciones para el análisis financiero
    let ultimasTransacciones = [];
    try {
      ultimasTransacciones = await Transaccion.findAll({
        where: { id_vivienda: req.params.id },
        order: [['fecha', 'DESC']]
      });
    } catch (e) {
      console.log('No se pudieron cargar transacciones:', e.message);
    }

    res.render('propiedades/detalle2', {
      title: 'Detalle de Propiedad',
      user: req.user,
      isAuthenticated: true,
      vivienda,
      proximasReservas,
      todasReservas,
      balanceMensual,
      balanceAnual,
      porcentajeOcupacion,
      reservasMes,
      ultimasTransacciones
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
// Actualizar un campo individual de la vivienda - PATCH /propiedades/:id/campo
router.patch('/:id/campo', async (req, res) => {
  try {
    const vivienda = await Vivienda.findOne({
      where: { id_vivienda: req.params.id, id_usuario: req.user.id_usuario }
    });
    if (!vivienda) return res.status(404).json({ success: false, error: 'Vivienda no encontrada' });

    const allowed = [
      'nombre','calle','bloque_portal','piso','escalera','letra_numero',
      'barrio','ciudad','pais','codigo_postal','tipo_vivienda','categoria',
      'num_banos','num_habitaciones','capacidad_maxima','superficie','planta',
      'ano_construccion','superficie_parcela','estado_legal','referencia_catastral',
      'numero_registro_autonomico','fecha_registro','url_airbnb','url_booking',
      'url_ical_airbnb','url_ical_booking','latitud','longitud'
    ];
    const { field, value } = req.body;
    if (!allowed.includes(field)) return res.status(400).json({ success: false, error: 'Campo no permitido' });

    await vivienda.update({ [field]: value || null });
    res.json({ success: true });
  } catch (e) {
    console.error('Error al actualizar campo:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Actualizar vivienda completa - PUT /propiedades/:id
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

// Crear transacción (gasto o ingreso) - POST /propiedades/:id/transacciones
router.post('/:id/transacciones', async (req, res) => {
  try {
    const vivienda = await Vivienda.findOne({ where: { id_vivienda: req.params.id, id_usuario: req.user.id_usuario } });
    if (!vivienda) return res.status(404).json({ success: false, error: 'Vivienda no encontrada' });

    const { tipo, importe, descripcion, fecha } = req.body;
    if (!tipo || !importe || !fecha) return res.status(400).json({ success: false, error: 'Faltan campos obligatorios' });

    const t = await Transaccion.create({
      id_vivienda: req.params.id,
      tipo,
      importe: parseFloat(importe),
      descripcion: descripcion || null,
      fecha
    });
    return res.json({ success: true, transaccion: t });
  } catch (error) {
    console.error('Error al crear transacción:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Crear reserva + huésped principal - POST /propiedades/:id/reservas
router.post('/:id/reservas', async (req, res) => {
  try {
    const vivienda = await Vivienda.findOne({ where: { id_vivienda: req.params.id, id_usuario: req.user.id_usuario } });
    if (!vivienda) return res.status(404).json({ success: false, error: 'Vivienda no encontrada' });

    const {
      fecha_inicio, fecha_fin, num_huespedes, importe_total, plataforma,
      id_reserva_externo, estado, checkin_realizado, checkout_realizado, pagado,
      hora_llegada, hora_salida,
      // Datos del huésped principal
      nombre_huesped, apellidos_huesped, dni, tipo_documento,
      fecha_expedicion, fecha_nacimiento, sexo, nacionalidad, email, telefono
    } = req.body;

    if (!fecha_inicio || !fecha_fin) return res.status(400).json({ success: false, error: 'Fechas obligatorias' });
    if (new Date(fecha_inicio) >= new Date(fecha_fin)) return res.status(400).json({ success: false, error: 'La fecha de entrada debe ser anterior a la fecha de salida' });

    // Helper: convert HH:MM to minutes
    const toMin = (t) => { const [h,m] = (t||'00:00').split(':').map(Number); return h*60+m; };
    const horaEntradaNueva = hora_llegada || '15:00';
    const horaSalidaNueva  = hora_salida  || '11:00';

    // Comprobar solapamiento con reservas activas existentes (candidatos por fechas)
    const candidatos = await Reserva.findAll({
      where: {
        id_vivienda: req.params.id,
        activa: true,
        [Op.and]: [
          { fecha_inicio: { [Op.lt]: fecha_fin } },
          { fecha_fin:    { [Op.gt]: fecha_inicio } }
        ]
      }
    });
    const solapamiento = candidatos.find(c => {
      // Si solo se tocan en fecha (fin de c == inicio de nueva): compatible si hora_salida_c <= hora_entrada_nueva
      if (c.fecha_fin === fecha_inicio) {
        return toMin(c.hora_salida || '11:00') > toMin(horaEntradaNueva);
      }
      // Si solo se tocan en fecha (fin de nueva == inicio de c): compatible si hora_salida_nueva <= hora_entrada_c
      if (fecha_fin === c.fecha_inicio) {
        return toMin(horaSalidaNueva) > toMin(c.hora_llegada || '15:00');
      }
      // Solapamiento real de fechas
      return true;
    });
    if (solapamiento) {
      const fmt = d => d ? new Date(d).toLocaleDateString('es-ES') : d;
      return res.status(409).json({
        success: false,
        error: `La vivienda ya está reservada en esas fechas (reserva #${solapamiento.id_reserva}: ${fmt(solapamiento.fecha_inicio)} ${solapamiento.hora_llegada||''} → ${fmt(solapamiento.fecha_fin)} ${solapamiento.hora_salida||''})`
      });
    }

    const reserva = await Reserva.create({
      id_vivienda: req.params.id,
      fecha_inicio, fecha_fin,
      hora_llegada: horaEntradaNueva,
      hora_salida:  horaSalidaNueva,
      num_huespedes: parseInt(num_huespedes) || 1,
      importe_total: importe_total ? parseFloat(importe_total) : null,
      plataforma: plataforma || null,
      id_reserva_externo: id_reserva_externo || null,
      estado: estado || 'confirmada',
      checkin_realizado: !!checkin_realizado,
      checkout_realizado: !!checkout_realizado,
      activa: true,
      pagado: !!pagado
    });

    // Crear huésped principal si se enviaron datos
    let huesped = null;
    if (nombre_huesped) {
      huesped = await Huesped.create({
        nombre: nombre_huesped || null,
        apellidos: apellidos_huesped || null,
        dni: dni || null,
        tipo_documento: tipo_documento || null,
        fecha_expedicion_documento: fecha_expedicion || null,
        fecha_nacimiento: fecha_nacimiento || null,
        sexo: sexo || null,
        nacionalidad: nacionalidad || null,
        email: email || null,
        telefono: telefono || null
      });
      // Vincular huésped a la reserva (insert directo en tabla intermedia)
      await sequelize.query(
        'INSERT INTO reserva_huesped (id_reserva, id_huesped) VALUES (?, ?)',
        { replacements: [reserva.id_reserva, huesped.id_huesped] }
      );
    }

    // Si pagado=true, registrar como ingreso real en el mes de fecha_fin (salida)
    let transaccionAutoCreada = null;
    if (pagado && importe_total && parseFloat(importe_total) > 0) {
      try {
        const nombreCompleto = nombre_huesped
          ? nombre_huesped + (apellidos_huesped ? ' ' + apellidos_huesped : '')
          : null;
        transaccionAutoCreada = await Transaccion.create({
          id_vivienda: req.params.id,
          id_reserva: reserva.id_reserva,
          tipo: 'ingreso',
          importe: parseFloat(importe_total),
          fecha: fecha_fin, // mes de salida
          descripcion: `Ingreso por reserva${nombreCompleto ? ' — ' + nombreCompleto : ''}${plataforma ? ' (' + plataforma + ')' : ''}`
        });
      } catch (e) {
        console.error('No se pudo crear la transacción automática:', e.message);
      }
    }

    return res.json({ success: true, reserva, huesped, transaccionAutoCreada });
  } catch (error) {
    console.error('Error al crear reserva:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Eliminar transacción
router.delete('/:id/transacciones/:tid', async (req, res) => {
  try {
    const vivienda = await Vivienda.findOne({ where: { id_vivienda: req.params.id, id_usuario: req.user.id_usuario } });
    if (!vivienda) return res.status(404).json({ success: false, error: 'Vivienda no encontrada' });
    const transaccion = await Transaccion.findOne({ where: { id_transaccion: req.params.tid, id_vivienda: req.params.id } });
    if (!transaccion) return res.status(404).json({ success: false, error: 'Transacción no encontrada' });
    await transaccion.destroy();
    return res.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar transacción:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Eliminar reserva (soft delete: activa = false) + elimina transacción vinculada si estaba pagada
router.delete('/:id/reservas/:rid', async (req, res) => {
  try {
    const vivienda = await Vivienda.findOne({ where: { id_vivienda: req.params.id, id_usuario: req.user.id_usuario } });
    if (!vivienda) return res.status(404).json({ success: false, error: 'Vivienda no encontrada' });
    const reserva = await Reserva.findOne({ where: { id_reserva: req.params.rid, id_vivienda: req.params.id } });
    if (!reserva) return res.status(404).json({ success: false, error: 'Reserva no encontrada' });

    // Si estaba pagada, eliminar la transacción de ingreso vinculada
    let transaccionEliminada = false;
    if (reserva.pagado) {
      const deleted = await Transaccion.destroy({ where: { id_reserva: reserva.id_reserva, tipo: 'ingreso' } });
      transaccionEliminada = deleted > 0;
    }

    await reserva.update({ activa: false });
    return res.json({ success: true, eraPagada: !!reserva.pagado, transaccionEliminada });
  } catch (error) {
    console.error('Error al eliminar reserva:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Actualizar estado o campo pagado de una reserva - PATCH /propiedades/:id/reservas/:rid
router.patch('/:id/reservas/:rid', async (req, res) => {
  try {
    const vivienda = await Vivienda.findOne({ where: { id_vivienda: req.params.id, id_usuario: req.user.id_usuario } });
    if (!vivienda) return res.status(404).json({ success: false, error: 'Vivienda no encontrada' });
    const reserva = await Reserva.findOne({ where: { id_reserva: req.params.rid, id_vivienda: req.params.id } });
    if (!reserva) return res.status(404).json({ success: false, error: 'Reserva no encontrada' });

    const updates = {};

    // Campos editables generales (excepto importe_total y pagado que se gestionan aparte)
    const editables = ['fecha_inicio', 'fecha_fin', 'num_huespedes', 'plataforma',
                       'id_reserva_externo', 'checkin_realizado', 'checkout_realizado',
                       'hora_llegada', 'hora_salida'];
    editables.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f] || null; });

    // Helper: convert HH:MM to minutes
    const toMin = (t) => { const [h,m] = (t||'00:00').split(':').map(Number); return h*60+m; };

    // Comprobar solapamiento si se cambian fechas
    const nuevaFechaInicio = updates.fecha_inicio || reserva.fecha_inicio;
    const nuevaFechaFin    = updates.fecha_fin    || reserva.fecha_fin;
    const horaEntradaNueva = updates.hora_llegada  || reserva.hora_llegada || '15:00';
    const horaSalidaNueva  = updates.hora_salida   || reserva.hora_salida  || '11:00';
    if (updates.fecha_inicio || updates.fecha_fin) {
      if (new Date(nuevaFechaInicio) >= new Date(nuevaFechaFin)) {
        return res.status(400).json({ success: false, error: 'La fecha de entrada debe ser anterior a la fecha de salida' });
      }
      const candidatos = await Reserva.findAll({
        where: {
          id_vivienda: req.params.id,
          activa: true,
          id_reserva: { [Op.ne]: reserva.id_reserva },
          [Op.and]: [
            { fecha_inicio: { [Op.lt]: nuevaFechaFin } },
            { fecha_fin:    { [Op.gt]: nuevaFechaInicio } }
          ]
        }
      });
      const solapamiento = candidatos.find(c => {
        if (c.fecha_fin === nuevaFechaInicio) {
          return toMin(c.hora_salida || '11:00') > toMin(horaEntradaNueva);
        }
        if (nuevaFechaFin === c.fecha_inicio) {
          return toMin(horaSalidaNueva) > toMin(c.hora_llegada || '15:00');
        }
        return true;
      });
      if (solapamiento) {
        const fmt = d => d ? new Date(d).toLocaleDateString('es-ES') : d;
        return res.status(409).json({
          success: false,
          error: `Esas fechas solapan con la reserva #${solapamiento.id_reserva} (${fmt(solapamiento.fecha_inicio)} ${solapamiento.hora_llegada||''} → ${fmt(solapamiento.fecha_fin)} ${solapamiento.hora_salida||''})`
        });
      }
    }

    if (req.body.estado !== undefined) updates.estado = req.body.estado;

    let transaccionCreada = null;
    if (req.body.pagado !== undefined) {
      const nuevoPagado = !!req.body.pagado;
      updates.pagado = nuevoPagado;

      if (nuevoPagado && reserva.importe_total && parseFloat(reserva.importe_total) > 0) {
        // Verificar si ya existe transacción vinculada para no duplicar
        const transExistente = await Transaccion.findOne({
          where: { id_reserva: reserva.id_reserva, tipo: 'ingreso' }
        });
        if (!transExistente) {
          try {
            transaccionCreada = await Transaccion.create({
              id_vivienda: req.params.id,
              id_reserva: reserva.id_reserva,
              tipo: 'ingreso',
              importe: parseFloat(reserva.importe_total),
              fecha: reserva.fecha_fin, // mes de salida
              descripcion: `Ingreso por reserva #${reserva.id_reserva}${reserva.plataforma ? ' (' + reserva.plataforma + ')' : ''}`
            });
          } catch (e) {
            console.error('Error al crear transacción al marcar pagado:', e.message);
          }
        }
      } else if (!nuevoPagado) {
        // Al desmarcar pagado, eliminar la transacción automática vinculada
        try {
          await Transaccion.destroy({ where: { id_reserva: reserva.id_reserva, tipo: 'ingreso' } });
        } catch (e) {
          console.error('Error al eliminar transacción al desmarcar pagado:', e.message);
        }
      }
    }

    await reserva.update(updates);
    return res.json({ success: true, transaccionCreada });
  } catch (error) {
    console.error('Error al actualizar reserva:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /propiedades/:id/reservas — endpoint AJAX para recargar reservas
router.get('/:id/reservas', async (req, res) => {
  try {
    const vivienda = await Vivienda.findOne({ where: { id_vivienda: req.params.id, id_usuario: req.user.id_usuario } });
    if (!vivienda) return res.status(404).json({ success: false, error: 'Vivienda no encontrada' });
    const reservas = await Reserva.findAll({
      where: { id_vivienda: req.params.id },
      order: [['fecha_inicio', 'DESC']],
      include: [{ model: Huesped, as: 'Huespedes', through: { attributes: [] } }]
    });
    return res.json({ success: true, reservas });
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /propiedades/:id/transacciones — endpoint AJAX para recargar transacciones
router.get('/:id/transacciones', async (req, res) => {
  try {
    const vivienda = await Vivienda.findOne({ where: { id_vivienda: req.params.id, id_usuario: req.user.id_usuario } });
    if (!vivienda) return res.status(404).json({ success: false, error: 'Vivienda no encontrada' });
    const transacciones = await Transaccion.findAll({
      where: { id_vivienda: req.params.id },
      order: [['fecha', 'DESC']]
    });
    return res.json({ success: true, transacciones });
  } catch (error) {
    console.error('Error al obtener transacciones:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /:id/tareas — listar tareas de una vivienda
router.get('/:id/tareas', async (req, res) => {
  try {
    const vivienda = await Vivienda.findOne({ where: { id_vivienda: req.params.id, id_usuario: req.user.id_usuario } });
    if (!vivienda) return res.status(404).json({ success: false, error: 'Vivienda no encontrada' });
    const tareas = await Tarea.findAll({
      where: { id_vivienda: req.params.id },
      order: [['fecha_limite', 'ASC'], ['id_tarea', 'DESC']]
    });
    return res.json({ success: true, tareas });
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /:id/tareas — crear nueva tarea
router.post('/:id/tareas', async (req, res) => {
  try {
    const vivienda = await Vivienda.findOne({ where: { id_vivienda: req.params.id, id_usuario: req.user.id_usuario } });
    if (!vivienda) return res.status(404).json({ success: false, error: 'Vivienda no encontrada' });
    const { descripcion, fecha_limite, estado, vinculada_calendario } = req.body;
    if (!descripcion || !descripcion.trim()) {
      return res.status(400).json({ success: false, error: 'La descripción es obligatoria' });
    }
    const tarea = await Tarea.create({
      id_vivienda: req.params.id,
      descripcion: descripcion.trim(),
      fecha_limite: fecha_limite || null,
      estado: estado || 'Pendiente',
      vinculada_calendario: !!vinculada_calendario
    });
    return res.json({ success: true, tarea });
  } catch (error) {
    console.error('Error al crear tarea:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /:id/tareas/:tid — eliminar tarea
router.delete('/:id/tareas/:tid', async (req, res) => {
  try {
    const vivienda = await Vivienda.findOne({ where: { id_vivienda: req.params.id, id_usuario: req.user.id_usuario } });
    if (!vivienda) return res.status(404).json({ success: false, error: 'Vivienda no encontrada' });
    const tarea = await Tarea.findOne({ where: { id_tarea: req.params.tid, id_vivienda: req.params.id } });
    if (!tarea) return res.status(404).json({ success: false, error: 'Tarea no encontrada' });
    await tarea.destroy();
    return res.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    return res.status(500).json({ success: false, error: error.message });
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
