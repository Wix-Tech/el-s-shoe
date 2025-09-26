// Simple Express server with SQLite for user authentication
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');

const app = express();
const db = new sqlite3.Database('users.db');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Create users table if not exists
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
)`);

// Sign up endpoint
app.post('/signup', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'All fields required.' });
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (row) return res.status(409).json({ message: 'Username already exists.' });
        const hash = bcrypt.hashSync(password, 10);
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash], err => {
            if (err) return res.status(500).json({ message: 'Database error.' });
            res.json({ message: 'Sign up successful! You can now log in.' });
        });
    });
});

// Login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'All fields required.' });
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (!user) return res.status(401).json({ message: 'Invalid username or password.' });
        if (!bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ message: 'Invalid username or password.' });
        }
        res.json({ message: 'Login successful!' });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
