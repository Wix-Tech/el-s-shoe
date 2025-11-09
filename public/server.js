require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'site.log');
function logEvent(msg) {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    // Use synchronous append for serverless environments or simple logging
    // For high-load servers, consider a dedicated logging service
    fs.appendFileSync(LOG_FILE, line);
    console.log(line.trim());
}

const app = express();

// --- Database Pool ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// --- Middleware ---
const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:5500', 'http://127.0.0.1:5500'];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'a-very-strong-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 60 * 60 * 1000, // 1 hour
        secure: process.env.NODE_ENV === 'production', // use secure cookies in production
        httpOnly: true
    }
}));

// --- Email Transporter ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// --- Helper Functions ---
const sendOtp = async (email, subject, text) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 min

    // Clean up old OTPs for the same email before inserting a new one
    await pool.query('DELETE FROM otps WHERE email = $1', [email]);
    await pool.query('INSERT INTO otps (email, otp, expires) VALUES ($1, $2, $3)', [email, otp, expires]);

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: subject,
        text: `${text}: ${otp}`
    });
};

// --- Admin Auth Middleware ---
function requireAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    res.status(401).json({ message: 'Unauthorized: Admin access required.' });
}

// --- API Routes ---

// --- AUTH ROUTES ---
app.post('/signup', async (req, res) => {
    const { email, username, password, otp } = req.body;
    if (!email || !username || !password || !otp) return res.status(400).json({ message: 'All fields are required.' });

    try {
        const otpResult = await pool.query('SELECT * FROM otps WHERE email = $1 AND otp = $2 AND expires > $3', [email, otp, Date.now()]);
        if (otpResult.rows.length === 0) return res.status(400).json({ message: 'Invalid or expired OTP.' });

        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length > 0) return res.status(409).json({ message: 'Email already exists.' });

        const hash = bcrypt.hashSync(password, 10);
        await pool.query('INSERT INTO users (email, username, password) VALUES ($1, $2, $3)', [email, username, hash]);
        await pool.query('DELETE FROM otps WHERE email = $1', [email]);

        logEvent(`New user signup: ${email}`);
        res.status(201).json({ message: 'Sign up successful! You can now log in.' });
    } catch (err) {
        logEvent(`Signup Error: ${err.message}`);
        res.status(500).json({ message: 'Database error during signup.' });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user || !bcrypt.compareSync(password, user.password)) {
            logEvent(`Failed login attempt: ${email}`);
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        logEvent(`User login: ${email}`);
        // Here you would typically set up a session or return a JWT
        res.json({ message: 'Login successful!', username: user.username });
    } catch (err) {
        logEvent(`Login Error: ${err.message}`);
        res.status(500).json({ message: 'Database error during login.' });
    }
});

app.post('/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    try {
        await sendOtp(email, 'Your OTP Code', 'Your OTP code is');
        res.json({ message: 'OTP sent to your email.' });
    } catch (err) {
        logEvent(`Send OTP Error: ${err.message}`);
        res.status(500).json({ message: 'Failed to send OTP email.' });
    }
});

app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    try {
        // Check if user exists
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            // Still send a success-like message to prevent email enumeration
            return res.json({ message: 'If an account with this email exists, a password reset OTP has been sent.' });
        }
        await sendOtp(email, 'Password Reset OTP', 'Your password reset OTP is');
        res.json({ message: 'If an account with this email exists, a password reset OTP has been sent.' });
    } catch (err) {
        logEvent(`Forgot Password Error: ${err.message}`);
        res.status(500).json({ message: 'Failed to send password reset email.' });
    }
});

app.post('/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ message: 'All fields are required.' });

    try {
        const otpResult = await pool.query('SELECT * FROM otps WHERE email = $1 AND otp = $2 AND expires > $3', [email, otp, Date.now()]);
        if (otpResult.rows.length === 0) return res.status(400).json({ message: 'Invalid or expired OTP.' });

        const hash = bcrypt.hashSync(newPassword, 10);
        await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hash, email]);
        await pool.query('DELETE FROM otps WHERE email = $1', [email]);

        res.json({ message: 'Password reset successful! You can now log in.' });
    } catch (err) {
        logEvent(`Reset Password Error: ${err.message}`);
        res.status(500).json({ message: 'Database error during password reset.' });
    }
});

// --- CHECKOUT ROUTE ---
app.post('/checkout', (req, res) => {
    const { name, address, city, zip, card, expiry, cvv, email } = req.body;
    
    // Basic validation
    if (!name || !address || !card || !email) {
        return res.status(400).json({ message: 'Missing required checkout information.' });
    }

    logEvent(`Order placed by ${name} (${email}) for address: ${address}, ${city}, ${zip}`);
    
    transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER, // Send to admin
        subject: 'New Order Placed on Els Footwears',
        text: `A new order has been placed.\n\nCustomer: ${name} (${email})\nAddress: ${address}, ${city}, ${zip}\nCard Used (last 4): **** **** **** ${card.slice(-4)}\nTime: ${new Date().toLocaleString()}`
    }).catch(err => logEvent(`Failed to send order notification email: ${err.message}`));

    res.json({ message: 'Order placed successfully! (This is a demo and no payment was processed)' });
});


// --- ADMIN ROUTES ---
app.post('/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        res.json({ message: 'Admin login successful' });
    } else {
        res.status(401).json({ message: 'Invalid admin password' });
    }
});

app.post('/admin/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Could not log out.' });
        }
        res.clearCookie('connect.sid'); // The default session cookie name
        res.json({ message: 'Admin logged out successfully' });
    });
});

app.get('/admin/users', requireAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT email, username FROM users ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        logEvent(`Admin Users Fetch Error: ${err.message}`);
        res.status(500).json({ message: 'Failed to fetch users.' });
    }
});

app.get('/admin/logs', requireAdmin, (req, res) => {
    fs.readFile(LOG_FILE, 'utf8', (err, data) => {
        if (err) {
            logEvent(`Admin Logs Read Error: ${err.message}`);
            return res.status(500).json({ message: 'Could not read log file.' });
        }
        // Return last 100 lines, reversed so newest is first
        const lines = data.trim().split('\n').slice(-100).reverse();
        res.json(lines);
    });
});

// --- Database Initialization ---
const initializeDatabase = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                username TEXT,
                password TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS otps (
                id SERIAL PRIMARY KEY,
                email TEXT NOT NULL,
                otp TEXT NOT NULL,
                expires BIGINT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        logEvent("Database tables checked/created successfully.");
    } catch (err) {
        logEvent(`Database initialization error: ${err.message}`);
        process.exit(1); // Exit if DB can't be initialized
    }
};

// --- Server Start ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    await initializeDatabase();
    logEvent(`Server running on http://localhost:${PORT}`);
});