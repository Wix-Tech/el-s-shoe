
const express = require('express');
const session = require('express-session');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');

const LOG_FILE = 'site.log';
function logEvent(msg) {
    const line = `[${new Date().toISOString()}] ${msg}`;
    fs.appendFile(LOG_FILE, line + '\n', () => {});
}

const app = express();
const db = new sqlite3.Database('users.db');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use(session({
    secret: 'supersecretadminkey',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 } // 1 hour
}));

// --- Admin auth middleware ---
function requireAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) return next();
    res.status(401).json({ message: 'Unauthorized' });
}

// --- Admin login endpoint ---
app.post('/admin/login', (req, res) => {
    const { password } = req.body;
    // For demo, use a hardcoded password. In production, use env vars and hashing.
    if (password === 'admin1234') {
        req.session.isAdmin = true;
        res.json({ message: 'Admin login successful' });
    } else {
        res.status(401).json({ message: 'Invalid admin password' });
    }
});

// --- Admin logout endpoint ---
app.post('/admin/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ message: 'Logged out' });
    });
});

// --- Admin endpoints ---
app.get('/admin/users', requireAdmin, (req, res) => {
    db.all('SELECT email, username FROM users', (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows);
    });
});
app.get('/admin/logs', requireAdmin, (req, res) => {
    fs.readFile(LOG_FILE, 'utf8', (err, data) => {
        if (err) return res.json([]);
        res.json(data.trim().split('\n').slice(-100)); // last 100 lines
    });
});


// Email transporter (configure with your email credentials)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
	user: 'wixtech001@gmail.com',
	pass: 'azfzdzuvkvekfmbu'
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Reset password endpoint (moved here after app and transporter are defined)
app.post('/reset-password', (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ message: 'All fields required.' });
    db.get('SELECT * FROM otps WHERE email = ? AND otp = ? AND expires > ?', [email, otp, Date.now()], (err, row) => {
        if (err) {
            console.error('DB error (select OTP - reset password):', err);
            return res.status(500).json({ message: 'Database error.' });
        }
        if (!row) return res.status(400).json({ message: 'Invalid or expired OTP.' });
        const hash = bcrypt.hashSync(newPassword, 10);
        db.run('UPDATE users SET password = ? WHERE email = ?', [hash, email], err => {
            if (err) {
                console.error('DB error (update password):', err);
                return res.status(500).json({ message: 'Database error.' });
            }
            db.run('DELETE FROM otps WHERE email = ?', [email]);
            res.json({ message: 'Password reset successful! You can now log in.' });
        });
    });
});

// Create users and otps tables if not exists
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    username TEXT,
    password TEXT
)`);
db.run(`CREATE TABLE IF NOT EXISTS otps (
    email TEXT,
    otp TEXT,
    expires INTEGER
)`);
// Send OTP endpoint
app.post('/send-otp', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required.' });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 min
    db.run('INSERT INTO otps (email, otp, expires) VALUES (?, ?, ?)', [email, otp, expires], err => {
        if (err) {
            console.error('DB error:', err); // Add this line
            return res.status(500).json({ message: 'Database error.' });
        }
        transporter.sendMail({
            from: 'ohuche90@gmail.com',
            to: email,
            subject: 'Your OTP Code',
            text: `Your OTP code is: ${otp}`
        }, (err, info) => {
            if (err) {
                console.error('Email send error:', err);
                return res.status(500).json({ message: 'Failed to send email.' });
            }
            res.json({ message: 'OTP sent to your email.' });
        });
    });
});

// Sign up endpoint with OTP verification
app.post('/signup', (req, res) => {
    const { email, username, password, otp } = req.body;
    if (!email || !username || !password || !otp) return res.status(400).json({ message: 'All fields required.' });
    db.get('SELECT * FROM otps WHERE email = ? AND otp = ? AND expires > ?', [email, otp, Date.now()], (err, row) => {
        if (!row) return res.status(400).json({ message: 'Invalid or expired OTP.' });
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
            if (user) return res.status(409).json({ message: 'Email already exists.' });
            const hash = bcrypt.hashSync(password, 10);
            db.run('INSERT INTO users (email, username, password) VALUES (?, ?, ?)', [email, username, hash], err => {
                if (err) {
                   console.error('DB error:', err);
                   return res.status(500).json({ message: 'Database error.' });
                }
                db.run('DELETE FROM otps WHERE email = ?', [email]);
                logEvent(`New user signup: ${email}`);
                res.json({ message: 'Sign up successful! You can now log in.' });
            });
        });
    });
});

// Login endpoint
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'All fields required.' });
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (!user) {
            logEvent(`Failed login attempt: ${email}`);
            // Email alert for failed login
            transporter.sendMail({
                from: 'ohuche90@gmail.com',
                to: 'ohuche90@gmail.com',
                subject: 'Failed Login Attempt',
                text: `Failed login attempt for email: ${email} at ${new Date().toLocaleString()}`
            }, () => {});
            return res.status(401).json({ message: 'Invalid email or password.' });
        }
        if (!bcrypt.compareSync(password, user.password)) {
            logEvent(`Failed login attempt: ${email}`);
            transporter.sendMail({
                from: 'ohuche90@gmail.com',
                to: 'ohuche90@gmail.com',
                subject: 'Failed Login Attempt',
                text: `Failed login attempt for email: ${email} at ${new Date().toLocaleString()}`
            }, () => {});
            return res.status(401).json({ message: 'Invalid email or password.' });
        }
        logEvent(`User login: ${email}`);
        res.json({ message: 'Login successful!' });
    });
// --- Checkout endpoint (demo, logs and email notification) ---
app.post('/checkout', (req, res) => {
    const { name, address, city, zip, card, expiry, cvv, email } = req.body;
    // You should validate and process payment here (for demo, just log)
    logEvent(`Order placed by ${name} (${email || 'no email'}) for address: ${address}, city: ${city}, zip: ${zip}`);
    // Email alert for new order
    transporter.sendMail({
        from: 'ohuche90@gmail.com',
        to: 'ohuche90@gmail.com',
        subject: 'New Order Placed',
        text: `Order placed by ${name} (${email || 'no email'})\nAddress: ${address}, ${city}, ${zip}\nCard: ${card}\nTime: ${new Date().toLocaleString()}`
    }, () => {});
    res.json({ message: 'Order placed! (Demo: no real payment processed)' });
});
});

// Forgot password endpoint
app.post('/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required.' });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 min
    db.run('INSERT INTO otps (email, otp, expires) VALUES (?, ?, ?)', [email, otp, expires], err => {
        if (err) {
            console.error('DB error:', err);
            return res.status(500).json({ message: 'Database error.' });
        }
        transporter.sendMail({
            from: 'ohuche90@gmail.com',
            to: email,
            subject: 'Password Reset OTP',
            text: `Your password reset OTP is: ${otp}`
        }, (err, info) => {
            if (err) {
                console.error('Email send error:', err);
                return res.status(500).json({ message: 'Failed to send email.' });
            }
            res.json({ message: 'Password reset OTP sent to your email.' });
        });
    });
});

// Add more endpoints for password reset confirmation as needed

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
