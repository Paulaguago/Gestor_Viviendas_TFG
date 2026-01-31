function requireAuth(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error', 'Debes iniciar sesión para acceder a esta página');
    res.redirect('/auth/login');
}

function requireGuest(req, res, next) {
    if (!req.isAuthenticated()) {
        return next();
    }
    res.redirect('/dashboard');
}

function checkAuth(req, res, next) {
    res.locals.user = req.user || null;
    res.locals.isAuthenticated = req.isAuthenticated();
    next();
}

module.exports = {
    requireAuth,
    requireGuest,
    checkAuth
};