const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

exports.register = (req, res) => {
    const { username, email, password } = req.body;

    // Hacher le mot de passe
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            return res.status(500).json({ error: err });
        }

        // Créer l'utilisateur avec le nom d'utilisateur, l'email et le mot de passe haché
        User.create(username, email, hash, (err, result) => {
            if (err) {
                return res.status(500).json({ error: err });
            }
            res.status(201).json({ message: 'User registered' });
        });
    });
};

exports.login = (req, res) => {
    const { email, password } = req.body;

    User.findByUsername(email, (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ message: 'Authentication failed' });

        const user = results[0];
        bcrypt.compare(password, user.password, (err, match) => {
            if (!match) return res.status(401).json({ message: 'Authentication failed' });

            const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
            res.json({ token });
            localStorage.setItem('TOKEN', token);
        });
    });
};
