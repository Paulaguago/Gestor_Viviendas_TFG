const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./userModel');

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        const user = User.findByEmail(email);
        
        if (!user) {
            return done(null, false, { message: 'Email no registrado' });
        }

        const isValidPassword = await user.validatePassword(password);
        
        if (!isValidPassword) {
            return done(null, false, { message: 'Contraseña incorrecta' });
        }

        return done(null, user);
    } catch (error) {
        return done(error);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    const user = User.findById(id);
    done(null, user);
});

module.exports = passport;