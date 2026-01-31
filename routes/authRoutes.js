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
        success: req.flash('success')
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
        const { username, email, password, confirmPassword } = req.body;

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
            password_hash: password
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

// Handle logout
router.post('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash('success', 'Sesión cerrada exitosamente');
        res.redirect('/');
    });
});

module.exports = router;
