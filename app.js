const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;

// Importar routers
const generalRoutes = require('./routes/generalRoutes');
const alquilerRoutes = require('./routes/alquilerRoutes');
const ventaRoutes = require('./routes/ventaRoutes');

// Configurar vistas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Usar routers
app.use('/', generalRoutes);
app.use('/', alquilerRoutes);
app.use('/', ventaRoutes);

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  // Si ocurre un error, intentamos renderizar la vista de resultado (ahora en prediccion/result)
  // o enviamos un JSON si es una petición API.
  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    res.status(500).json({ error: 'Error interno del servidor', detail: err.message });
  } else {
    res.status(500).render('prediccion/result', {
      success: false,
      error: 'Error interno del servidor: ' + err.message
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log('Presiona Ctrl+C para detener el servidor');
});
