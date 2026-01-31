const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('./utils/passport');
const flash = require('connect-flash');

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

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Protected routes
app.use('/prediccion', requireAuth);
app.use('/alquiler', requireAuth, alquilerRoutes);
app.use('/venta', requireAuth, ventaRoutes);

// Dashboard route (protected)
app.get('/dashboard', requireAuth, (req, res) => {
    res.render('dashboard', { 
        title: 'Dashboard - Predicciones Inmobiliarias',
        user: req.user 
    });
});

// Error handling
app.use((req, res) => {
    res.status(404).render('error', { 
        title: '404 - Página no encontrada',
        message: 'La página que buscas no existe.'
    });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});