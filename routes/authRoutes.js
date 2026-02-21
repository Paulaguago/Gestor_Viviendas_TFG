const express = require('express');
const passport = require('passport');
const { User } = require('../models');
const { requireGuest } = require('../utils/authMiddleware');
const router = express.Router();

// Render login page
router.get('/login', requireGuest, (req, res) => {
    res.render('auth/login', { 
        title: 'Iniciar Sesión',
        error: req.flash('error'),
        success: req.query.logout ? ['Sesión cerrada exitosamente'] : req.flash('success')
    });
});

// Handle login
router.post('/login', passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/auth/login',
    failureFlash: true
}));

// Render register page
router.get('/register', requireGuest, (req, res) => {
    res.render('auth/register', { 
        title: 'Registrarse',
        error: req.flash('error'),
        success: req.flash('success')
    });
});

// Handle registration
router.post('/register', requireGuest, async (req, res) => {
    try {
        const { username, email, password, confirmPassword, razon_social, dni_cif, telefono } = req.body;

        // Validation
        if (!username || !email || !password || !confirmPassword) {
            req.flash('error', 'Todos los campos son obligatorios');
            return res.redirect('/auth/register');
        }

        if (password !== confirmPassword) {
            req.flash('error', 'Las contraseñas no coinciden');
            return res.redirect('/auth/register');
        }

        if (password.length < 6) {
            req.flash('error', 'La contraseña debe tener al menos 6 caracteres');
            return res.redirect('/auth/register');
        }

        // Verificar si el email ya existe
        const existingEmail = await User.findOne({ where: { email } });
        if (existingEmail) {
            req.flash('error', 'El email ya está registrado');
            return res.redirect('/auth/register');
        }

        // Crear usuario en la base de datos
        const newUser = await User.create({
            nombre: username,
            apellidos: '',
            email: email,
            password_hash: password,
            razon_social: razon_social || null,
            dni_cif: dni_cif || null,
            telefono: telefono || null
        });

        // Iniciar sesión automáticamente después del registro
        req.login(newUser, (err) => {
            if (err) {
                console.error('Error al iniciar sesión automáticamente:', err);
                req.flash('success', 'Usuario registrado exitosamente. Ahora puedes iniciar sesión.');
                return res.redirect('/auth/login');
            }
            // Redirigir directamente al dashboard
            return res.redirect('/dashboard');
        });

    } catch (error) {
        console.error('Error en registro:', error);
        req.flash('error', 'Error al registrar usuario');
        res.redirect('/auth/register');
    }
});

// Handle logout - GET (desde navbar)
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.session.destroy((err) => {
            if (err) {
                console.error('Error al destruir sesión:', err);
            }
            res.clearCookie('connect.sid');
            // Headers para evitar que el navegador cachee páginas protegidas
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.redirect('/auth/login?logout=true');
        });
    });
});

// Handle logout - POST (por si se usa en algún formulario)
router.post('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.session.destroy((err) => {
            if (err) {
                console.error('Error al destruir sesión:', err);
            }
            res.clearCookie('connect.sid');
            res.redirect('/auth/login');
        });
    });
});

module.exports = router;
