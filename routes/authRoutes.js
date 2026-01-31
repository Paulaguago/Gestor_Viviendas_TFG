const express = require('express');
const passport = require('passport');
const User = require('../utils/userModel');
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

        if (User.findByEmail(email)) {
            req.flash('error', 'El email ya está registrado');
            return res.redirect('/auth/register');
        }

        if (User.findByUsername(username)) {
            req.flash('error', 'El nombre de usuario ya está en uso');
            return res.redirect('/auth/register');
        }

        // Create user
        await User.create(username, email, password);
        req.flash('success', 'Usuario registrado exitosamente. Ahora puedes iniciar sesión.');
        res.redirect('/auth/login');

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