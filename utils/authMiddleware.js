const requireAuth = (req, res, next) => {
    // Headers para evitar caché del navegador en páginas protegidas
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (!req.isAuthenticated()) {
        req.flash('error', 'Debes iniciar sesión para acceder');
        return res.redirect('/auth/login');
    }
    next();
};

const requireGuest = (req, res, next) => {
    if (req.isAuthenticated()) {
        return res.redirect('/dashboard');
    }
    next();
};

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