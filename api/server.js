const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const fs = require('fs');

const LOG_FILE = 'site.log';
function logEvent(msg) {
    const line = `[${new Date().toISOString()}] ${msg}`;
    fs.appendFile(LOG_FILE, line + '\n', () => {});
}

// Neon Postgres pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'wixtech001@gmail.com',
        pass: 'azfzdzuvkvekfmbu'
    },
    tls: { rejectUnauthorized: false }
});

module.exports = async (req, res) => {
    const method = req.method;
    let body = req.body;
    if (method !== 'POST' || !body || !body.action) {
        res.status(400).json({ message: 'Invalid request' });
        return;
    }
    const action = body.action;

    try {
        if (action === 'login') {
            const { email, password } = body;
            const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            const user = result.rows[0];
            if (!user || !bcrypt.compareSync(password, user.password)) {
                logEvent(`Failed login attempt: ${email}`);
                transporter.sendMail({
                    from: 'wixtech001@gmail.com',
                    to: 'wixtech001@gmail.com',
                    subject: 'Failed Login Attempt',
                    text: `Failed login attempt for email: ${email} at ${new Date().toLocaleString()}`
                }, () => {});
                return res.status(401).json({ message: 'Invalid email or password.' });
            }
            logEvent(`User login: ${email}`);
            res.json({ message: 'Login successful!', username: user.username, email: user.email });
            return;
        }
        if (action === 'signup') {
            const { email, username, password, otp } = body;
            const otpResult = await pool.query('SELECT * FROM otps WHERE email = $1 AND otp = $2 AND expires > $3', [email, otp, Date.now()]);
            if (otpResult.rows.length === 0) return res.status(400).json({ message: 'Invalid or expired OTP.' });
            const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            if (userResult.rows.length > 0) return res.status(409).json({ message: 'Email already exists.' });
            const hash = bcrypt.hashSync(password, 10);
            await pool.query('INSERT INTO users (email, username, password) VALUES ($1, $2, $3)', [email, username, hash]);
            await pool.query('DELETE FROM otps WHERE email = $1', [email]);
            logEvent(`New user signup: ${email}`);
            res.json({ message: 'Sign up successful! You can now log in.' });
            return;
        }
        if (action === 'send-otp') {
            const { email } = body;
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expires = Date.now() + 10 * 60 * 1000;
            await pool.query('INSERT INTO otps (email, otp, expires) VALUES ($1, $2, $3)', [email, otp, expires]);
            transporter.sendMail({
                from: 'wixtech001@gmail.com',
                to: email,
                subject: 'Your OTP Code',
                text: `Your OTP code is: ${otp}`
            }, (err, info) => {
                if (err) return res.status(500).json({ message: 'Failed to send email.' });
                res.json({ message: 'OTP sent to your email.' });
            });
            return;
        }
        if (action === 'forgot-password') {
            const { email } = body;
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expires = Date.now() + 10 * 60 * 1000;
            await pool.query('INSERT INTO otps (email, otp, expires) VALUES ($1, $2, $3)', [email, otp, expires]);
            transporter.sendMail({
                from: 'wixtech001@gmail.com',
                to: email,
                subject: 'Password Reset OTP',
                text: `Your password reset OTP is: ${otp}`
            }, (err, info) => {
                if (err) return res.status(500).json({ message: 'Failed to send email.' });
                res.json({ message: 'Password reset OTP sent to your email.' });
            });
            return;
        }
        if (action === 'reset-password') {
            const { email, otp, newPassword } = body;
            const otpResult = await pool.query('SELECT * FROM otps WHERE email = $1 AND otp = $2 AND expires > $3', [email, otp, Date.now()]);
            if (otpResult.rows.length === 0) return res.status(400).json({ message: 'Invalid or expired OTP.' });
            const hash = bcrypt.hashSync(newPassword, 10);
            await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hash, email]);
            await pool.query('DELETE FROM otps WHERE email = $1', [email]);
            res.json({ message: 'Password reset successful! You can now log in.' });
            return;
        }
        if (action === 'checkout') {
            const { name, address, city, zip, card, expiry, cvv, email } = body;
            logEvent(`Order placed by ${name} (${email || 'no email'}) for address: ${address}, city: ${city}, zip: ${zip}`);
            transporter.sendMail({
                from: 'wixtech001@gmail.com',
                to: 'wixtech001@gmail.com',
                subject: 'New Order Placed',
                text: `Order placed by ${name} (${email || 'no email'})\nAddress: ${address}, ${city}, ${zip}\nCard: ${card}\nTime: ${new Date().toLocaleString()}`
            }, () => {});
            res.json({ message: 'Order placed! (Demo: no real payment processed)' });
            return;
        }
        // Default: Not found
        res.status(404).json({ message: 'Not found' });
    } catch (err) {
        logEvent(`Error: ${err.message}`);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
