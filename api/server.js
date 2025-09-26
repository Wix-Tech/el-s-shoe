const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const fs = require('fs');

const LOG_FILE = 'site.log';
function logEvent(msg) {
    const line = `[${new Date().toISOString()}] ${msg}`;
    fs.appendFile(LOG_FILE, line + '\n', () => {});
}

const db = new sqlite3.Database('users.db');

// Email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'ohuche90@gmail.com',
        pass: 'lneomvlxtxrmcvsf'
    },
    tls: { rejectUnauthorized: false }
});

module.exports = async (req, res) => {
    // Parse path and method
    const url = req.url;
    const method = req.method;
    // Parse body if POST
    let body = {};
    if (method === 'POST') {
        try {
            body = req.body || JSON.parse(req.body);
        } catch (e) {}
    }

    // --- Endpoints ---
    if (url === '/login' && method === 'POST') {
        const { email, password } = body;
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
            if (!user || !bcrypt.compareSync(password, user.password)) {
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
            res.json({ message: 'Login successful!', username: user.username, email: user.email });
        });
        return;
    }
    if (url === '/signup' && method === 'POST') {
        const { email, username, password, otp } = body;
        db.get('SELECT * FROM otps WHERE email = ? AND otp = ? AND expires > ?', [email, otp, Date.now()], (err, row) => {
            if (!row) return res.status(400).json({ message: 'Invalid or expired OTP.' });
            db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
                if (user) return res.status(409).json({ message: 'Email already exists.' });
                const hash = bcrypt.hashSync(password, 10);
                db.run('INSERT INTO users (email, username, password) VALUES (?, ?, ?)', [email, username, hash], err => {
                    if (err) return res.status(500).json({ message: 'Database error.' });
                    db.run('DELETE FROM otps WHERE email = ?', [email]);
                    logEvent(`New user signup: ${email}`);
                    res.json({ message: 'Sign up successful! You can now log in.' });
                });
            });
        });
        return;
    }
    if (url === '/send-otp' && method === 'POST') {
        const { email } = body;
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = Date.now() + 10 * 60 * 1000;
        db.run('INSERT INTO otps (email, otp, expires) VALUES (?, ?, ?)', [email, otp, expires], err => {
            if (err) return res.status(500).json({ message: 'Database error.' });
            transporter.sendMail({
                from: 'ohuche90@gmail.com',
                to: email,
                subject: 'Your OTP Code',
                text: `Your OTP code is: ${otp}`
            }, (err, info) => {
                if (err) return res.status(500).json({ message: 'Failed to send email.' });
                res.json({ message: 'OTP sent to your email.' });
            });
        });
        return;
    }
    if (url === '/reset-password' && method === 'POST') {
        const { email, otp, newPassword } = body;
        db.get('SELECT * FROM otps WHERE email = ? AND otp = ? AND expires > ?', [email, otp, Date.now()], (err, row) => {
            if (!row) return res.status(400).json({ message: 'Invalid or expired OTP.' });
            const hash = bcrypt.hashSync(newPassword, 10);
            db.run('UPDATE users SET password = ? WHERE email = ?', [hash, email], err => {
                if (err) return res.status(500).json({ message: 'Database error.' });
                db.run('DELETE FROM otps WHERE email = ?', [email]);
                res.json({ message: 'Password reset successful! You can now log in.' });
            });
        });
        return;
    }
    if (url === '/checkout' && method === 'POST') {
        const { name, address, city, zip, card, expiry, cvv, email } = body;
        logEvent(`Order placed by ${name} (${email || 'no email'}) for address: ${address}, city: ${city}, zip: ${zip}`);
        transporter.sendMail({
            from: 'ohuche90@gmail.com',
            to: 'ohuche90@gmail.com',
            subject: 'New Order Placed',
            text: `Order placed by ${name} (${email || 'no email'})\nAddress: ${address}, ${city}, ${zip}\nCard: ${card}\nTime: ${new Date().toLocaleString()}`
        }, () => {});
        res.json({ message: 'Order placed! (Demo: no real payment processed)' });
        return;
    }
    // Default: Not found
    res.status(404).json({ message: 'Not found' });
};
